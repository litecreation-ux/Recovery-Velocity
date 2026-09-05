import { Readable } from 'stream';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { db, publicUploadGrantsTable } from '@workspace/db';
import { and, eq, isNull, lt } from 'drizzle-orm';
import {
  RequestUploadUrlBody,
  RequestUploadUrlResponse,
} from '@workspace/api-zod';
import { raw, Router, type IRouter, type Request, type Response } from 'express';

import {
  ObjectNotFoundError,
  ObjectStorageService,
} from '../lib/objectStorage';

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const UPLOAD_WINDOW_MS = 15 * 60 * 1000;
const MAX_UPLOAD_URLS_PER_WINDOW = 5;
const uploadWindows = new Map<string, { count: number; resetAt: number }>();
const configuredUploadSecret = process.env.SESSION_SECRET;
if (!configuredUploadSecret) throw new Error('SESSION_SECRET is required for signed upload grants');
const uploadSecret: string = configuredUploadSecret;

type UploadGrant = {
  objectPath: string;
  contentType: string;
  size: number;
  expiresAt: number;
};

function signUploadGrant(grant: UploadGrant) {
  const payload = Buffer.from(JSON.stringify(grant)).toString('base64url');
  const signature = createHmac('sha256', uploadSecret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function verifyUploadGrant(token: string): UploadGrant | null {
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = createHmac('sha256', uploadSecret).update(payload).digest();
  const received = Buffer.from(signature, 'base64url');
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;
  try {
    const grant = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as UploadGrant;
    if (grant.expiresAt < Date.now() || grant.size < 1 || grant.size > MAX_PHOTO_BYTES || !ALLOWED_IMAGE_TYPES.has(grant.contentType)) return null;
    return grant;
  } catch {
    return null;
  }
}

function matchesImageSignature(contentType: string, bytes: Buffer) {
  if (contentType === 'image/jpeg') return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (contentType === 'image/png') return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (contentType === 'image/webp') return bytes.length >= 12 && bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
  return false;
}

async function cleanupExpiredUploads() {
  const expired = await db.select().from(publicUploadGrantsTable).where(and(
    lt(publicUploadGrantsTable.expiresAt, new Date()),
    isNull(publicUploadGrantsTable.consumedAt),
  ));
  for (const grant of expired) {
    try {
      const file = await objectStorageService.getObjectEntityFile(grant.objectPath);
      await file.delete();
    } catch {
      // Missing files are safe to remove from the grant ledger.
    }
  }
  if (expired.length) {
    await db.delete(publicUploadGrantsTable).where(and(
      lt(publicUploadGrantsTable.expiresAt, new Date()),
      isNull(publicUploadGrantsTable.consumedAt),
    ));
  }
}

function allowUploadRequest(req: Request): boolean {
  const now = Date.now();
  const key = req.ip || req.socket.remoteAddress || 'unknown';
  const current = uploadWindows.get(key);
  if (!current || current.resetAt <= now) {
    uploadWindows.set(key, { count: 1, resetAt: now + UPLOAD_WINDOW_MS });
    return true;
  }
  if (current.count >= MAX_UPLOAD_URLS_PER_WINDOW) return false;
  current.count += 1;
  return true;
}

/**
 * POST /storage/uploads/request-url
 *
 * Request a presigned URL for file upload.
 * The client sends JSON metadata (name, size, contentType) — NOT the file.
 * Then uploads the file directly to the returned presigned URL.
 * This MVP accepts anonymous public reports, so issuance is narrowly limited to
 * supported image metadata and rate-limited per client address.
 */
router.post(
  '/storage/uploads/request-url',
  async (req: Request, res: Response) => {
    if (!allowUploadRequest(req)) {
      res.status(429).json({ error: 'Too many upload requests. Try again later.' });
      return;
    }

    const parsed = RequestUploadUrlBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Missing or invalid required fields' });
      return;
    }

    try {
      await cleanupExpiredUploads();
      const { name, size, contentType } = parsed.data;
      if (
        name.length > 120 ||
        size > MAX_PHOTO_BYTES ||
        !ALLOWED_IMAGE_TYPES.has(contentType)
      ) {
        res.status(400).json({
          error: 'Photos must be JPEG, PNG, or WebP and no larger than 5 MB.',
        });
        return;
      }

      const objectPath = `/objects/uploads/${randomUUID()}`;
      const token = signUploadGrant({
        objectPath,
        contentType,
        size,
        expiresAt: Date.now() + UPLOAD_WINDOW_MS,
      });
      const uploadURL = `/api/storage/uploads/${token}`;

      res.setHeader('Cache-Control', 'no-store');
      res.json(
        RequestUploadUrlResponse.parse({
          uploadURL,
          objectPath,
          metadata: { name, size, contentType },
        }),
      );
    } catch (error) {
      req.log.error({ err: error }, 'Error generating upload URL');
      res.status(500).json({ error: 'Failed to generate upload URL' });
    }
  },
);

router.put(
  '/storage/uploads/:token',
  raw({ type: () => true, limit: MAX_PHOTO_BYTES }),
  async (req: Request, res: Response) => {
    const token = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
    const grant = verifyUploadGrant(token);
    if (!grant) {
      res.status(403).json({ error: 'Upload grant is invalid or expired' });
      return;
    }
    if (
      req.header('content-type')?.split(';')[0] !== grant.contentType ||
      !Buffer.isBuffer(req.body) ||
      req.body.length !== grant.size
    ) {
      res.status(400).json({ error: 'Upload content does not match the signed grant' });
      return;
    }
    if (!matchesImageSignature(grant.contentType, req.body)) {
      res.status(400).json({ error: 'Upload bytes are not a supported image' });
      return;
    }
    await objectStorageService.saveObjectEntity(grant.objectPath, req.body, grant.contentType);
    try {
      await db.insert(publicUploadGrantsTable).values({
        objectPath: grant.objectPath,
        contentType: grant.contentType,
        sizeBytes: grant.size,
        expiresAt: new Date(grant.expiresAt),
      });
    } catch (error) {
      const file = await objectStorageService.getObjectEntityFile(grant.objectPath);
      await file.delete().catch(() => undefined);
      throw error;
    }
    res.status(204).end();
  },
);

/**
 * GET /storage/public-objects/*
 *
 * Serve public assets from PUBLIC_OBJECT_SEARCH_PATHS.
 * These are unconditionally public — no authentication or ACL checks.
 * IMPORTANT: Always provide this endpoint when object storage is set up.
 */
router.get(
  '/storage/public-objects/*filePath',
  async (req: Request, res: Response) => {
    try {
      const raw = req.params.filePath;
      const filePath = Array.isArray(raw) ? raw.join('/') : raw;
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        res.status(404).json({ error: 'File not found' });
        return;
      }

      const response = await objectStorageService.downloadObject(file);

      res.status(response.status);
      response.headers.forEach((value, key) => res.setHeader(key, value));

      if (response.body) {
        const nodeStream = Readable.fromWeb(
          response.body as ReadableStream<Uint8Array>,
        );
        nodeStream.pipe(res);
      } else {
        res.end();
      }
    } catch (error) {
      req.log.error({ err: error }, 'Error serving public object');
      res.status(500).json({ error: 'Failed to serve public object' });
    }
  },
);

/**
 * GET /storage/objects/*
 *
 * Serve object entities from PRIVATE_OBJECT_DIR.
 * These are served from a separate path from /public-objects and can optionally
 * be protected with authentication or ACL checks based on the use case.
 */
router.get('/storage/objects/*path', (_req: Request, res: Response) => {
  res.status(403).json({ error: 'Private objects must be accessed through an authorized report or review endpoint.' });
});

export default router;
