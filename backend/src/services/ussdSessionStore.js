import { USSD_SESSION_PREFIX, USSD_SESSION_TTL_SEC } from "../config/ussd.js";

let redisClient = null;
let redisInitAttempted = false;

/** In-process fallback when REDIS_URL is unset (local dev). Still enforces TTL. */
const memoryStore = new Map();

function memoryKey(sessionId) {
  return `${USSD_SESSION_PREFIX}${sessionId}`;
}

function pruneExpiredMemory() {
  const now = Date.now();
  for (const [key, entry] of memoryStore) {
    if (entry.expiresAt <= now) memoryStore.delete(key);
  }
}

async function getRedisClient() {
  if (redisInitAttempted) return redisClient;
  redisInitAttempted = true;

  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    console.log("[ussd-session] REDIS_URL not set — using in-memory store with TTL");
    return null;
  }

  try {
    const { default: Redis } = await import("ioredis");
    redisClient = new Redis(url, {
      maxRetriesPerRequest: 2,
      lazyConnect: true,
      connectTimeout: 5000,
    });
    await redisClient.connect();
    await redisClient.ping();
    console.log("[ussd-session] Redis connected");
    return redisClient;
  } catch (err) {
    console.warn("[ussd-session] Redis unavailable — falling back to memory:", err.message);
    redisClient = null;
    return null;
  }
}

export function isRedisSessionStoreEnabled() {
  return Boolean(process.env.REDIS_URL?.trim()) && Boolean(redisClient);
}

/**
 * @returns {Promise<object|null>}
 */
export async function getUssdSession(sessionId) {
  if (!sessionId) return null;
  const key = `${USSD_SESSION_PREFIX}${sessionId}`;
  const redis = await getRedisClient();

  if (redis) {
    try {
      const raw = await redis.get(key);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      console.warn("[ussd-session] Redis get failed:", err.message);
    }
  }

  pruneExpiredMemory();
  const entry = memoryStore.get(key);
  if (!entry || entry.expiresAt <= Date.now()) {
    memoryStore.delete(key);
    return null;
  }
  return entry.value;
}

export async function saveUssdSession(sessionId, session) {
  if (!sessionId) return;
  const key = `${USSD_SESSION_PREFIX}${sessionId}`;
  const payload = JSON.stringify({ ...session, updatedAt: new Date().toISOString() });
  const redis = await getRedisClient();

  if (redis) {
    try {
      await redis.set(key, payload, "EX", USSD_SESSION_TTL_SEC);
      return;
    } catch (err) {
      console.warn("[ussd-session] Redis set failed:", err.message);
    }
  }

  memoryStore.set(key, {
    value: JSON.parse(payload),
    expiresAt: Date.now() + USSD_SESSION_TTL_SEC * 1000,
  });
}

export async function clearUssdSession(sessionId) {
  if (!sessionId) return;
  const key = `${USSD_SESSION_PREFIX}${sessionId}`;
  const redis = await getRedisClient();

  if (redis) {
    try {
      await redis.del(key);
    } catch {
      /* ignore */
    }
  }
  memoryStore.delete(key);
}
