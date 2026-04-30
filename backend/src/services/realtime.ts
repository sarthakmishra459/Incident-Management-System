import { FastifyInstance } from "fastify";
import websocket from "@fastify/websocket";

const CHANNEL = "ims:incident-events";
const sockets = new Set<{ send: (data: string) => void; readyState: number }>();

export async function registerRealtime(app: FastifyInstance) {
  const { redisSubscriber } = await import("../db/redis.js");
  await app.register(websocket);

  app.get("/ws", { websocket: true }, (connection) => {
    sockets.add(connection.socket);
    connection.socket.on("close", () => sockets.delete(connection.socket));
  });

  await redisSubscriber.subscribe(CHANNEL);
  redisSubscriber.on("message", (_channel: string, message: string) => {
    for (const socket of sockets) {
      if (socket.readyState === 1) socket.send(message);
    }
  });
}

export async function publishIncidentChanged(incident: unknown) {
  const { redis } = await import("../db/redis.js");
  await redis.publish(CHANNEL, JSON.stringify({ type: "incident.changed", incident }));
}

export async function publishIncidentChangedThrottled(incident: { id: string }, windowSeconds = 1) {
  const { redis } = await import("../db/redis.js");
  const key = `realtime:incident:${incident.id}`;
  const shouldPublish = await redis.set(key, "1", "EX", windowSeconds, "NX");
  if (shouldPublish) {
    await redis.publish(CHANNEL, JSON.stringify({ type: "incident.changed", incident }));
  }
}
