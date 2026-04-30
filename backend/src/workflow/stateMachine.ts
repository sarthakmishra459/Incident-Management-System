import { pool, withTransaction } from "../db/postgres.js";
import { RcaPayload, IncidentState } from "../types.js";
import { validateRca } from "./rca.js";
import { publishIncidentChanged } from "../services/realtime.js";

const transitions: Record<IncidentState, IncidentState[]> = {
  OPEN: ["INVESTIGATING", "RESOLVED", "CLOSED"],
  INVESTIGATING: ["RESOLVED", "OPEN", "CLOSED"],
  RESOLVED: ["CLOSED", "INVESTIGATING"],
  CLOSED: []
};

export const closedMttrSql =
  "(SELECT EXTRACT(EPOCH FROM (rca_records.end_time - incidents.first_signal_time)) * 1000 FROM rca_records WHERE rca_records.incident_id=incidents.id)";

export async function transitionIncident(id: string, nextState: IncidentState, rca?: RcaPayload) {
  return withTransaction(async (client) => {
    const current = await client.query("SELECT * FROM incidents WHERE id=$1 FOR UPDATE", [id]);
    if (current.rowCount === 0) throw new Error("incident not found");
    const incident = current.rows[0];
    if (!transitions[incident.status as IncidentState].includes(nextState)) {
      throw new Error(`invalid transition ${incident.status} -> ${nextState}`);
    }

    if (nextState === "CLOSED") {
      if (rca) {
        const validRca = validateRca(rca);
        if (new Date(validRca.end_time).getTime() < new Date(incident.first_signal_time).getTime()) {
          throw new Error("RCA end_time cannot be before the first signal time");
        }
        await client.query(
          `INSERT INTO rca_records(incident_id,start_time,end_time,root_cause_category,fix_applied,prevention_steps)
           VALUES($1,$2,$3,$4,$5,$6)
           ON CONFLICT (incident_id) DO UPDATE SET
           start_time=EXCLUDED.start_time,end_time=EXCLUDED.end_time,root_cause_category=EXCLUDED.root_cause_category,
           fix_applied=EXCLUDED.fix_applied,prevention_steps=EXCLUDED.prevention_steps,updated_at=now()`,
          [id, validRca.start_time, validRca.end_time, validRca.root_cause_category, validRca.fix_applied, validRca.prevention_steps]
        );
      }
      const rcaCheck = await client.query("SELECT incident_id, end_time FROM rca_records WHERE incident_id=$1", [id]);
      if (rcaCheck.rowCount === 0) throw new Error("RCA is required before closure");
      if (new Date(rcaCheck.rows[0].end_time).getTime() < new Date(incident.first_signal_time).getTime()) {
        throw new Error("RCA end_time cannot be before the first signal time");
      }
    }

    const mttrExpr = nextState === "CLOSED" ? closedMttrSql : "mttr_ms";
    const updated = await client.query(
      `UPDATE incidents SET status=$2, mttr_ms=${mttrExpr}, updated_at=now() WHERE id=$1 RETURNING *`,
      [id, nextState]
    );
    await publishIncidentChanged(updated.rows[0]);
    return updated.rows[0];
  });
}

export async function upsertRca(id: string, rca: RcaPayload) {
  const validRca = validateRca(rca);
  const incident = await pool.query("SELECT first_signal_time FROM incidents WHERE id=$1", [id]);
  if (incident.rowCount === 0) throw new Error("incident not found");
  if (new Date(validRca.end_time).getTime() < new Date(incident.rows[0].first_signal_time).getTime()) {
    throw new Error("RCA end_time cannot be before the first signal time");
  }
  await pool.query(
    `INSERT INTO rca_records(incident_id,start_time,end_time,root_cause_category,fix_applied,prevention_steps)
     VALUES($1,$2,$3,$4,$5,$6)
     ON CONFLICT (incident_id) DO UPDATE SET
     start_time=EXCLUDED.start_time,end_time=EXCLUDED.end_time,root_cause_category=EXCLUDED.root_cause_category,
     fix_applied=EXCLUDED.fix_applied,prevention_steps=EXCLUDED.prevention_steps,updated_at=now()`,
    [id, validRca.start_time, validRca.end_time, validRca.root_cause_category, validRca.fix_applied, validRca.prevention_steps]
  );
}
