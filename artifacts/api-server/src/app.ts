import express, { type Express } from "express";
import path from "node:path";
import { existsSync } from "node:fs";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import router from "./routes/index.js";
import { logger } from "./lib/logger";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

app.use("/api", router);

// Cloud Run serves the API and the Vite build from one origin. Keep this after
// the API router so an unknown /api route remains an API 404 rather than being
// rewritten to the React application.
if (process.env.NODE_ENV === "production") {
  const staticDir = process.env.RVP_STATIC_DIR ?? path.resolve(process.cwd(), "public");

  if (!existsSync(staticDir)) {
    throw new Error(`RVP_STATIC_DIR does not exist: "${staticDir}"`);
  }

  app.use(
    express.static(staticDir, {
      index: false,
      dotfiles: "deny",
      maxAge: "1h",
    }),
  );
  app.get(/^(?!\/api(?:\/|$)).*/, (_req, res) => {
    res.sendFile(path.join(staticDir, "index.html"));
  });
}

export default app;
