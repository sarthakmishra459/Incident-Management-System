export type Severity = "P0" | "P1" | "P2";
export type IncidentState = "OPEN" | "INVESTIGATING" | "RESOLVED" | "CLOSED";

export type Incident = {
  id: string;
  component_id: string;
  severity: Severity;
  status: IncidentState;
  first_signal_time: string;
  last_signal_time: string;
  signal_count: number;
  mttr_ms: number | null;
  updated_at: string;
};

export type IncidentDetail = {
  incident: Incident;
  rca: null | {
    start_time: string;
    end_time: string;
    root_cause_category: string;
    fix_applied: string;
    prevention_steps: string;
  };
  signals: Array<{
    _id: string;
    component_id: string;
    timestamp: string;
    severity: Severity;
    message: string;
    metadata: Record<string, unknown>;
  }>;
};

function apiBaseUrl() {
  if (typeof window === "undefined") {
    return process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  }
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
}

export async function fetchIncidents(params: URLSearchParams) {
  const res = await fetch(`${apiBaseUrl()}/incidents?${params.toString()}`, { cache: "no-store" });
  if (!res.ok) throw new Error("failed to fetch incidents");
  return res.json() as Promise<{ incidents: Incident[]; page: number; page_size: number }>;
}

export async function fetchIncident(id: string) {
  const res = await fetch(`${apiBaseUrl()}/incidents/${id}`, { cache: "no-store" });
  if (!res.ok) throw new Error("failed to fetch incident");
  return res.json() as Promise<IncidentDetail>;
}

export async function saveRca(id: string, body: unknown) {
  const res = await fetch(`${apiBaseUrl()}/incidents/${id}/rca`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error((await res.json()).error ?? "failed to save RCA");
}

export async function transitionIncident(id: string, status: IncidentState, rca?: unknown) {
  const res = await fetch(`${apiBaseUrl()}/incidents/${id}/transition`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, rca })
  });
  if (!res.ok) throw new Error((await res.json()).error ?? "failed to transition incident");
}
