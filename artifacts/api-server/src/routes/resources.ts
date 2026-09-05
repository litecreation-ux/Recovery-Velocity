import { Router } from 'express';
import { PARISHES } from '../lib/parishes-data.js';
import { getDeclarations } from '../lib/resource-store.js';

const router = Router();

const INFRASTRUCTURE_CATEGORIES = [
  { value: 'hotel', label: 'Hotels & hospitality', query: 'hotels' },
  { value: 'bank', label: 'Banks & financial services', query: 'banks' },
  { value: 'church_faith', label: 'Churches & faith facilities', query: 'churches places of worship' },
  { value: 'fuel', label: 'Fuel & energy', query: 'fuel stations' },
  { value: 'medical', label: 'Medical & pharmacies', query: 'hospitals pharmacies clinics' },
  { value: 'food', label: 'Food & retail', query: 'food distribution supermarkets' },
  { value: 'shelter', label: 'Shelter & accommodation', query: 'shelters community centers' },
  { value: 'logistics', label: 'Logistics & transport', query: 'warehouses logistics transport' },
  { value: 'other', label: 'Other essential services', query: 'essential services' },
] as const;

type InfrastructureCategory = typeof INFRASTRUCTURE_CATEGORIES[number]['value'];
type GooglePlace = {
  placeId: string;
  name: string;
  category: InfrastructureCategory;
  address: string;
  mapUrl: string;
  rating?: number;
  ratingCount?: number;
  phoneNumber?: string;
  websiteUrl?: string;
  types?: string[];
  openNow?: boolean;
};

function buildGoogleMapsUrl(query: string, parishName: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${query} in ${parishName}, Jamaica`)}`;
}

const GOOGLE_PLACES_ENDPOINT = 'https://places.googleapis.com/v1/places:searchText';
const GOOGLE_PLACES_CACHE_TTL_MS = 15 * 60_000;
const GOOGLE_PLACES_STALE_TTL_MS = 60 * 60_000;
const GOOGLE_PLACES_RATE_WINDOW_MS = 60_000;
const GOOGLE_PLACES_RATE_LIMIT = 30;
const GOOGLE_PLACES_GLOBAL_RATE_LIMIT = 60;
const GOOGLE_PLACES_TIMEOUT_MS = 8_000;
const GOOGLE_PLACES_MAX_PAGES = 3;
const GOOGLE_PLACES_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.googleMapsUri',
  'places.rating',
  'places.userRatingCount',
  'places.nationalPhoneNumber',
  'places.websiteUri',
  'places.types',
  'places.currentOpeningHours.openNow',
  'nextPageToken',
].join(',');

type GooglePlacesCacheEntry = {
  places: GooglePlace[];
  fetchedAt: string;
  expiresAt: number;
};

const googlePlacesCache = new Map<string, GooglePlacesCacheEntry>();
const googlePlacesRateWindows = new Map<string, { startedAt: number; count: number }>();
const googlePlacesInFlight = new Map<string, Promise<GooglePlacesDirectoryResult>>();
let googlePlacesGlobalRateWindow = { startedAt: 0, count: 0 };

type GooglePlacesDirectoryResult = {
  status: 'available' | 'unavailable' | 'stale';
  sourceName: string;
  message: string;
  places: GooglePlace[];
  fetchedAt?: string;
  expiresAt?: string;
};

function getCategory(category: unknown): typeof INFRASTRUCTURE_CATEGORIES[number] | undefined {
  if (typeof category !== 'string') return undefined;
  return INFRASTRUCTURE_CATEGORIES.find((item) => item.value === category);
}

function getClientAddress(req: { ip?: string; socket?: { remoteAddress?: string } }) {
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function isGooglePlacesRateLimited(clientKey: string) {
  const now = Date.now();
  let clientWindow = googlePlacesRateWindows.get(clientKey);
  if (!clientWindow || now - clientWindow.startedAt >= GOOGLE_PLACES_RATE_WINDOW_MS) {
    clientWindow = { startedAt: now, count: 0 };
    googlePlacesRateWindows.set(clientKey, clientWindow);
  }

  if (now - googlePlacesGlobalRateWindow.startedAt >= GOOGLE_PLACES_RATE_WINDOW_MS) {
    googlePlacesGlobalRateWindow = { startedAt: now, count: 0 };
  }

  if (
    clientWindow.count >= GOOGLE_PLACES_RATE_LIMIT
    || googlePlacesGlobalRateWindow.count >= GOOGLE_PLACES_GLOBAL_RATE_LIMIT
  ) {
    return true;
  }

  clientWindow.count += 1;
  googlePlacesGlobalRateWindow.count += 1;
  return false;
}

function makeUnavailableDirectory(message: string, status: 'unavailable' | 'stale' = 'unavailable', places: GooglePlace[] = [], fetchedAt?: string): GooglePlacesDirectoryResult {
  return {
    status,
    sourceName: 'Google Maps Platform',
    message,
    places,
    ...(fetchedAt ? { fetchedAt } : {}),
  };
}

async function searchGooglePlaces(
  parishName: string,
  category: typeof INFRASTRUCTURE_CATEGORIES[number],
  clientKey: string,
) {
  const cacheKey = `${parishName}:${category.value}`;
  const now = Date.now();
  let cached = googlePlacesCache.get(cacheKey);

  if (cached && cached.expiresAt > now) {
    return {
      status: 'available' as const,
      sourceName: 'Google Maps Platform',
      message: 'Public Google place listings for this parish and category.',
      places: cached.places,
      fetchedAt: cached.fetchedAt,
      expiresAt: new Date(cached.expiresAt).toISOString(),
    };
  }

  if (cached && now - cached.expiresAt > GOOGLE_PLACES_STALE_TTL_MS) {
    googlePlacesCache.delete(cacheKey);
    cached = undefined;
  }

  const apiKey = process.env.GOOGLE_MAPS_PLATFORM_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    if (cached) {
      return makeUnavailableDirectory(
        'The server-side Google Maps Platform key is unavailable. Showing bounded-age cached public listings from the last successful fetch.',
        'stale',
        cached.places,
        cached.fetchedAt,
      );
    }
    return makeUnavailableDirectory(
      'Live Google place details are unavailable because the server-side Google Maps Platform key is not configured. Directory search links remain available.',
    );
  }

  const inFlight = googlePlacesInFlight.get(cacheKey);
  if (inFlight) return inFlight;

  if (isGooglePlacesRateLimited(clientKey)) {
    if (cached) {
      return makeUnavailableDirectory(
        'Google Places requests are temporarily rate-limited. Showing cached public listings; try again shortly for a refresh.',
        'stale',
        cached.places,
        cached.fetchedAt,
      );
    }
    return makeUnavailableDirectory(
      'Google Places requests are temporarily rate-limited. Try again shortly. No operational availability is inferred.',
    );
  }

  const request = (async (): Promise<GooglePlacesDirectoryResult> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GOOGLE_PLACES_TIMEOUT_MS);

    try {
      type PlacesPayload = {
        places?: Array<{
          id?: unknown;
          displayName?: { text?: unknown };
          formattedAddress?: unknown;
          googleMapsUri?: unknown;
          rating?: unknown;
          userRatingCount?: unknown;
          nationalPhoneNumber?: unknown;
          websiteUri?: unknown;
          types?: unknown;
          currentOpeningHours?: { openNow?: unknown };
        }>;
        nextPageToken?: unknown;
      };
      const allPlaces: NonNullable<PlacesPayload['places']> = [];
      let pageToken: string | undefined;

      for (let page = 0; page < GOOGLE_PLACES_MAX_PAGES; page += 1) {
        const response = await fetch(GOOGLE_PLACES_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': GOOGLE_PLACES_FIELD_MASK,
          },
          body: JSON.stringify({
            textQuery: `${category.query} in ${parishName}, Jamaica`,
            pageSize: 20,
            languageCode: 'en',
            regionCode: 'JM',
            ...(pageToken ? { pageToken } : {}),
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Google Places returned ${response.status}`);
        }

        const payload = await response.json() as PlacesPayload;
        allPlaces.push(...(payload.places ?? []));
        pageToken = typeof payload.nextPageToken === 'string' ? payload.nextPageToken : undefined;
        if (!pageToken) break;
      }

      const places = allPlaces
        .filter((place) => typeof place.id === 'string' && typeof place.displayName?.text === 'string')
        .map((place): GooglePlace => ({
          placeId: place.id as string,
          name: place.displayName?.text as string,
          category: category.value,
          address: typeof place.formattedAddress === 'string' ? place.formattedAddress : 'Address not provided by Google',
          mapUrl: typeof place.googleMapsUri === 'string'
            ? place.googleMapsUri
            : buildGoogleMapsUrl(`${category.query} ${place.displayName?.text}`, parishName),
          ...(typeof place.rating === 'number' ? { rating: place.rating } : {}),
          ...(typeof place.userRatingCount === 'number' ? { ratingCount: place.userRatingCount } : {}),
          ...(typeof place.nationalPhoneNumber === 'string' ? { phoneNumber: place.nationalPhoneNumber } : {}),
          ...(typeof place.websiteUri === 'string' ? { websiteUrl: place.websiteUri } : {}),
          ...(Array.isArray(place.types) ? { types: place.types.filter((type): type is string => typeof type === 'string').slice(0, 5) } : {}),
          ...(typeof place.currentOpeningHours?.openNow === 'boolean' ? { openNow: place.currentOpeningHours.openNow } : {}),
        }))
        .filter((place, index, list) => list.findIndex((candidate) => candidate.placeId === place.placeId) === index);

      const fetchedAt = new Date().toISOString();
      const expiresAt = Date.now() + GOOGLE_PLACES_CACHE_TTL_MS;
      googlePlacesCache.set(cacheKey, { places, fetchedAt, expiresAt });
      return {
        status: 'available',
        sourceName: 'Google Maps Platform',
        message: places.length > 0
          ? 'Public Google place listings for this parish and category.'
          : 'Google returned no public place listings for this parish and category. This does not establish that no facility exists.',
        places,
        fetchedAt,
        expiresAt: new Date(expiresAt).toISOString(),
      };
    } catch (error) {
      if (cached) {
        return makeUnavailableDirectory(
          'Google Places is temporarily unavailable. Showing cached public listings from the last successful fetch; verify current conditions through official channels.',
          'stale',
          cached.places,
          cached.fetchedAt,
        );
      }
      console.warn('Google Places lookup unavailable', error instanceof Error ? error.message : error);
      return makeUnavailableDirectory(
        'Live Google place details are temporarily unavailable. Directory search links remain available and no operational availability is inferred.',
      );
    } finally {
      clearTimeout(timeout);
    }
  })();

  googlePlacesInFlight.set(cacheKey, request);
  try {
    return await request;
  } finally {
    googlePlacesInFlight.delete(cacheKey);
  }
}

// Static resource levels per parish (would come from DB in production)
const PARISH_RESOURCES: Record<string, { fuelPercent: number; waterPercent: number; medicalPercent: number }> = {
  'kingston':      { fuelPercent: 68, waterPercent: 72, medicalPercent: 81 },
  'st-andrew':     { fuelPercent: 74, waterPercent: 68, medicalPercent: 76 },
  'st-thomas':     { fuelPercent: 31, waterPercent: 44, medicalPercent: 52 },
  'portland':      { fuelPercent: 29, waterPercent: 55, medicalPercent: 47 },
  'st-mary':       { fuelPercent: 62, waterPercent: 70, medicalPercent: 78 },
  'st-ann':        { fuelPercent: 79, waterPercent: 83, medicalPercent: 85 },
  'trelawny':      { fuelPercent: 71, waterPercent: 75, medicalPercent: 80 },
  'st-james':      { fuelPercent: 84, waterPercent: 88, medicalPercent: 90 },
  'hanover':       { fuelPercent: 44, waterPercent: 67, medicalPercent: 44 },
  'westmoreland':  { fuelPercent: 18, waterPercent: 52, medicalPercent: 61 },
  'st-elizabeth':  { fuelPercent: 58, waterPercent: 63, medicalPercent: 71 },
  'manchester':    { fuelPercent: 66, waterPercent: 74, medicalPercent: 79 },
  'clarendon':     { fuelPercent: 55, waterPercent: 60, medicalPercent: 68 },
  'st-catherine':  { fuelPercent: 72, waterPercent: 76, medicalPercent: 82 },
};

function getPartnerOffers(parishId: string) {
  return getDeclarations()
    .filter((declaration) => declaration.parishId === parishId)
    .map((declaration) => ({
      id: declaration.id,
      organizationName: declaration.organizationName,
      organizationType: declaration.organizationType,
      parishId: declaration.parishId,
      facilityCategory: declaration.facilityCategory,
      location: declaration.location,
      ...(declaration.contactNotes ? { contactNotes: declaration.contactNotes } : {}),
      resources: declaration.resources,
      source: 'private_sector_submission' as const,
      verificationStatus: declaration.provenance === 'demo_seed' ? 'demo_seed' as const : 'unverified_submission' as const,
      lastUpdated: declaration.timestamp,
    }));
}

function getSearchLinks(parishName: string) {
  return INFRASTRUCTURE_CATEGORIES.map((item) => ({
    category: item.value as InfrastructureCategory,
    label: item.label,
    url: buildGoogleMapsUrl(item.query, parishName),
  }));
}

router.get('/parishes/:parishId/infrastructure', (req, res): void => {
  const { parishId } = req.params;
  const parish = PARISHES.find((item) => item.id === parishId);
  if (!parish) {
    res.status(404).json({ error: 'Parish not found' });
    return;
  }

  const searchLinks = getSearchLinks(parish.name);
  res.json({
    parishId,
    parishName: parish.name,
    categories: searchLinks,
    googleDirectory: {
      status: 'idle' as const,
      sourceName: 'Google Maps Platform',
      message: 'Choose an infrastructure category to load public Google place listings for this parish.',
      places: [],
      searchLinks,
    },
    partnerOffers: getPartnerOffers(parishId),
    lastUpdated: new Date().toISOString(),
  });
});

router.get('/parishes/:parishId/infrastructure/:category', async (req, res): Promise<void> => {
  const { parishId, category: requestedCategory } = req.params;
  const parish = PARISHES.find((item) => item.id === parishId);
  if (!parish) {
    res.status(404).json({ error: 'Parish not found' });
    return;
  }

  const category = getCategory(requestedCategory);
  if (!category) {
    res.status(400).json({ error: 'Unknown infrastructure category' });
    return;
  }

  const searchLinks = getSearchLinks(parish.name);
  const googleDirectory = await searchGooglePlaces(parish.name, category, getClientAddress(req));

  res.json({
    parishId,
    parishName: parish.name,
    categories: searchLinks,
    googleDirectory: {
      ...googleDirectory,
      searchLinks: searchLinks.filter((link) => link.category === category.value),
    },
    partnerOffers: getPartnerOffers(parishId),
    lastUpdated: new Date().toISOString(),
  });
});

router.get('/parishes/:parishId/resources', (req, res): void => {
  const { parishId } = req.params;
  const parish = PARISHES.find(p => p.id === parishId);
  if (!parish) {
    res.status(404).json({ error: 'Parish not found' });
    return;
  }

  const resources = PARISH_RESOURCES[parishId] ?? { fuelPercent: 60, waterPercent: 65, medicalPercent: 70 };

  res.json({
    parishId,
    ...resources,
    lastUpdated: new Date().toISOString(),
  });
});

export default router;
