import "server-only";
import { Queue } from "bullmq";

type QueueGlobal = {
  inboundQueue?: Queue;
  broadcastQueue?: Queue;
};

function connectionOptions() {
  const url = new URL(process.env.REDIS_URL ?? "redis://localhost:6379");
  // BullMQ requires maxRetriesPerRequest: null on its own connection.
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    maxRetriesPerRequest: null as null,
  };
}

/** Created on first use so builds do not connect to Redis. */
export function getInboundQueue(): Queue {
  const store = globalThis as QueueGlobal;
  store.inboundQueue ??= new Queue("whatsapp-inbound", { connection: connectionOptions() });
  return store.inboundQueue;
}

export function getBroadcastQueue(): Queue {
  const store = globalThis as QueueGlobal;
  store.broadcastQueue ??= new Queue("broadcasts", { connection: connectionOptions() });
  return store.broadcastQueue;
}
