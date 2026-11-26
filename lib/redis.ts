import "server-only";
import Redis from "ioredis";

const globalForRedis = globalThis as unknown as { redis?: Redis };

/** Created on first use so builds do not connect to runtime infrastructure. */
export function getRedis(): Redis {
  if (globalForRedis.redis) return globalForRedis.redis;

  const client = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: 2,
    enableOfflineQueue: false,
  });
  // Callers handle failures; this prevents an unhandled 'error' event from
  // terminating the server when Redis is briefly unavailable.
  client.on("error", () => undefined);

  globalForRedis.redis = client;
  return client;
}
