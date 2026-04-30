export type Severity = "P0" | "P1" | "P2";
export type IncidentState = "OPEN" | "INVESTIGATING" | "RESOLVED" | "CLOSED";

export type SignalPayload = {
  component_id: string;
  timestamp: string;
  severity: Severity;
  message: string;
  metadata: Record<string, unknown>;
};

export type Incident = {
  id: string;
  component_id: string;
  severity: Severity;
  status: IncidentState;
  first_signal_time: string;
  last_signal_time: string;
  signal_count: number;
  mttr_ms: number | null;
  created_at: string;
  updated_at: string;
};

export type RcaPayload = {
  start_time: string;
  end_time: string;
  root_cause_category: string;
  fix_applied: string;
  prevention_steps: string;
};
