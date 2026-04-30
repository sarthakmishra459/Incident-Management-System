import { pool } from "./postgres.js";
import { mongoDb } from "./mongo.js";

const sql = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  component_id TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('P0','P1','P2')),
  status TEXT NOT NULL CHECK (status IN ('OPEN','INVESTIGATING','RESOLVED','CLOSED')),
  first_signal_time TIMESTAMPTZ NOT NULL,
  last_signal_time TIMESTAMPTZ NOT NULL,
  signal_count INTEGER NOT NULL DEFAULT 0,
  mttr_ms BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS incidents_status_idx ON incidents(status);
CREATE INDEX IF NOT EXISTS incidents_component_idx ON incidents(component_id);
CREATE INDEX IF NOT EXISTS incidents_severity_idx ON incidents(severity);

CREATE TABLE IF NOT EXISTS rca_records (
  incident_id UUID PRIMARY KEY REFERENCES incidents(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  root_cause_category TEXT NOT NULL,
  fix_applied TEXT NOT NULL,
  prevention_steps TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
`;

export async function migrate() {
  await pool.query(sql);
  const db = await mongoDb();
  await db.collection("signals").createIndex({ component_id: 1, timestamp: -1 });
  await db.collection("signals").createIndex({ incident_id: 1, timestamp: -1 });
  await db.collection("metrics").createIndex({ bucket: -1 });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  migrate()
    .then(() => {
      console.log("migrations complete");
      process.exit(0);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
