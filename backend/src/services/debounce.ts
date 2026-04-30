import { PoolClient } from "pg";
import { env } from "../config/env.js";
import { redis } from "../db/redis.js";
import { mongoDb } from "../db/mongo.js";
import { withTransaction } from "../db/postgres.js";
import { Severity, SignalPayload } from "../types.js";
import { alertIncident } from "./alerts.js";
import { publishIncidentChanged, publishIncidentChangedThrottled } from "./realtime.js";
import { retry } from "./retry.js";
import { shouldCreateIncident } from "./debouncePolicy.js";

const severityRank = { P0: 3, P1: 2, P2: 1 };

async function createIncident(client: PoolClient, signal: SignalPayload, count: number) {
  const result = await client.query(
    `INSERT INTO incidents(component_id,severity,status,first_signal_time,last_signal_time,signal_count)
     VALUES($1,$2,'OPEN',$3,$3,$4) RETURNING *`,
    [signal.component_id, signal.severity, signal.timestamp, count]
  );
  return result.rows[0];
}

export async function processSignal(signal: SignalPayload) {
  const db = await mongoDb();
  const bucket = Math.floor(new Date(signal.timestamp).getTime() / (env.DEBOUNCE_WINDOW_SECONDS * 1000));
  const debounceKey = `debounce:${signal.component_id}:${bucket}`;
  const count = await redis.incr(debounceKey);
  if (count === 1) await redis.expire(debounceKey, env.DEBOUNCE_WINDOW_SECONDS + 5);

  await retry(() => db.collection("signals").insertOne({ ...signal, timestamp: new Date(signal.timestamp), incident_id: null }));
  await db.collection("metrics").updateOne(
    { bucket: new Date(Math.floor(Date.now() / 1000) * 1000) },
    { $inc: { signals: 1, [`severity.${signal.severity}`]: 1 } },
    { upsert: true }
  );

  const activeIncidentId = await redis.get(`active:${signal.component_id}`);
  if (activeIncidentId) {
    const updated = await withTransaction(async (client) => {
      const existing = await client.query("SELECT * FROM incidents WHERE id=$1 FOR UPDATE", [activeIncidentId]);
      if (existing.rowCount === 0 || existing.rows[0].status === "CLOSED") return null;
      const currentSeverity = existing.rows[0].severity as Severity;
      const nextSeverity = severityRank[signal.severity] > severityRank[currentSeverity] ? signal.severity : currentSeverity;
      const result = await client.query(
        `UPDATE incidents SET last_signal_time=$2, signal_count=signal_count+1, severity=$3, updated_at=now() WHERE id=$1 RETURNING *`,
        [activeIncidentId, signal.timestamp, nextSeverity]
      );
      return result.rows[0];
    });
    await db.collection("signals").updateOne({ component_id: signal.component_id, timestamp: new Date(signal.timestamp), message: signal.message }, { $set: { incident_id: activeIncidentId } });
    if (updated) {
      await redis.set(`incident:${updated.id}`, JSON.stringify(updated), "EX", 300);
      await publishIncidentChangedThrottled(updated);
    }
    return updated;
  }

  if (!shouldCreateIncident(count)) return null;

  const lockKey = `lock:incident:${signal.component_id}:${bucket}`;
  const locked = await redis.set(lockKey, "1", "EX", 15, "NX");
  if (!locked) return null;

  const incident = await retry(() => withTransaction((client) => createIncident(client, signal, count)));
  await redis.set(`active:${signal.component_id}`, incident.id, "EX", 3600);
  await redis.set(`incident:${incident.id}`, JSON.stringify(incident), "EX", 300);
  await db.collection("signals").updateMany(
    { component_id: signal.component_id, timestamp: { $gte: new Date(bucket * env.DEBOUNCE_WINDOW_SECONDS * 1000) }, incident_id: null },
    { $set: { incident_id: incident.id } }
  );
  await alertIncident(incident);
  await publishIncidentChanged(incident);
  return incident;
}
