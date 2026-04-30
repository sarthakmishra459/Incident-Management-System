import { redis } from "../db/redis.js";
import { SignalPayload } from "../types.js";

export const SIGNAL_STREAM = "ims:signals";
export const SIGNAL_GROUP = "signal-workers";

export async function enqueueSignal(payload: SignalPayload) {
  await redis.xadd(SIGNAL_STREAM, "MAXLEN", "~", "1000000", "*", "payload", JSON.stringify(payload));
  await redis.incr("metrics:ingested");
}

export async function ensureSignalGroup() {
  try {
    await redis.xgroup("CREATE", SIGNAL_STREAM, SIGNAL_GROUP, "$", "MKSTREAM");
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("BUSYGROUP")) {
      throw error;
    }
  }
}
