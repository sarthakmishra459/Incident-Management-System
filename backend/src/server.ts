import Fastify from "fastify";
import rateLimit from "@fastify/rate-limit";
import cors from "@fastify/cors";
import { env } from "./config/env.js";
import { migrate } from "./db/migrate.js";
import { signalRoutes } from "./routes/signals.js";
import { incidentRoutes } from "./routes/incidents.js";
import { registerRealtime } from "./services/realtime.js";

export async function buildServer() {
  const app = Fastify({ logger: true, bodyLimit: 1024 * 1024 });
  await app.register(cors, {
    origin: [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/],
    methods: ["GET", "POST", "OPTIONS"]
  });
  await app.register(rateLimit, { max: env.RATE_LIMIT_PER_SECOND, timeWindow: "1 second" });
  await registerRealtime(app);

  app.get("/health", async () => ({ ok: true, service: "ims-backend" }));
  await signalRoutes(app);
  await incidentRoutes(app);

  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);
    const status = error.statusCode ?? 400;
    reply.code(status).send({ error: error.message });
  });
  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await migrate();
  const app = await buildServer();
  const { redis } = await import("./db/redis.js");
  setInterval(async () => {
    const count = Number((await redis.getset("metrics:ingested", "0")) ?? 0);
    app.log.info({ signals_per_sec: count / 5 }, "ingestion throughput");
  }, 5000);
  await app.listen({ host: "0.0.0.0", port: env.API_PORT });
}
