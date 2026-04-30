import { env } from "../config/env.js";
import { migrate } from "../db/migrate.js";
import { redis } from "../db/redis.js";
import { ensureSignalGroup, SIGNAL_GROUP, SIGNAL_STREAM } from "../services/signalQueue.js";
import { processSignal } from "../services/debounce.js";
import { SignalPayload } from "../types.js";

const consumer = `worker-${process.pid}`;

async function run() {
  await migrate();
  await ensureSignalGroup();
  console.log(`signal worker ${consumer} started`);

  while (true) {
    const response = await redis.xreadgroup(
      "GROUP", SIGNAL_GROUP, consumer,
      "COUNT", 100,
      "BLOCK", 5000,
      "STREAMS", SIGNAL_STREAM, ">"
    );
    if (!response) continue;
    for (const [, messages] of response as Array<[string, Array<[string, string[]]>]>) {
      await Promise.all(messages.map(async ([id, fields]: [string, string[]]) => {
        const payloadIndex = fields.indexOf("payload");
        const payload = JSON.parse(fields[payloadIndex + 1]) as SignalPayload;
        try {
          await processSignal(payload);
          await redis.xack(SIGNAL_STREAM, SIGNAL_GROUP, id);
        } catch (error) {
          console.error("signal processing failed", { id, error });
        }
      }));
    }
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
