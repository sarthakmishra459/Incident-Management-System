import { FastifyInstance } from "fastify";
import { z } from "zod";
import { enqueueSignal } from "../services/signalQueue.js";

const signalSchema = z.object({
  component_id: z.string().min(1).max(200),
  timestamp: z.string().datetime(),
  severity: z.enum(["P0", "P1", "P2"]),
  message: z.string().min(1).max(2000),
  metadata: z.record(z.unknown()).default({})
});

export async function signalRoutes(app: FastifyInstance) {
  app.post("/signals", async (request, reply) => {
    const payload = signalSchema.parse(request.body);
    await enqueueSignal(payload);
    reply.code(202).send({ accepted: true });
  });
}
