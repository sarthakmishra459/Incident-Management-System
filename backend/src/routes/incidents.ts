import { FastifyInstance } from "fastify";
import { z } from "zod";
import { pool } from "../db/postgres.js";
import { mongoDb } from "../db/mongo.js";
import { transitionIncident, upsertRca } from "../workflow/stateMachine.js";

const listQuery = z.object({
  severity: z.enum(["P0", "P1", "P2"]).optional(),
  component_id: z.string().optional(),
  include_closed: z.coerce.boolean().default(false),
  page: z.coerce.number().int().positive().default(1),
  page_size: z.coerce.number().int().positive().max(100).default(25)
});

export async function incidentRoutes(app: FastifyInstance) {
  app.get("/incidents", async (request) => {
    const query = listQuery.parse(request.query);
    const where: string[] = [];
    const values: unknown[] = [];
    if (!query.include_closed) {
      where.push("status != 'CLOSED'");
    }
    if (query.severity) {
      values.push(query.severity);
      where.push(`severity=$${values.length}`);
    }
    if (query.component_id) {
      values.push(query.component_id);
      where.push(`component_id=$${values.length}`);
    }
    values.push(query.page_size, (query.page - 1) * query.page_size);
    const sqlWhere = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const result = await pool.query(
      `SELECT * FROM incidents ${sqlWhere}
       ORDER BY CASE severity WHEN 'P0' THEN 1 WHEN 'P1' THEN 2 ELSE 3 END, updated_at DESC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values
    );
    return { incidents: result.rows, page: query.page, page_size: query.page_size };
  });

  app.get("/incidents/:id", async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const { redis } = await import("../db/redis.js");
    const cached = await redis.get(`incident:${id}`);
    const incident = cached ? JSON.parse(cached) : (await pool.query("SELECT * FROM incidents WHERE id=$1", [id])).rows[0];
    if (!incident) return reply.code(404).send({ error: "incident not found" });
    const rca = (await pool.query("SELECT * FROM rca_records WHERE incident_id=$1", [id])).rows[0] ?? null;
    const db = await mongoDb();
    const signals = await db.collection("signals").find({ incident_id: id }).sort({ timestamp: -1 }).limit(100).toArray();
    return { incident, rca, signals };
  });

  app.post("/incidents/:id/rca", async (request) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    await upsertRca(id, request.body as never);
    return { saved: true };
  });

  app.post("/incidents/:id/transition", async (request) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = z.object({ status: z.enum(["OPEN", "INVESTIGATING", "RESOLVED", "CLOSED"]), rca: z.unknown().optional() }).parse(request.body);
    const incident = await transitionIncident(id, body.status, body.rca as never);
    return { incident };
  });
}
