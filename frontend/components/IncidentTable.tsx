"use client";

import Link from "next/link";
import { Activity, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchIncidents, Incident, Severity } from "../lib/api";
import { SeverityBadge } from "./SeverityBadge";

const WS = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:4000/ws";

function fmt(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "short", timeStyle: "medium" }).format(new Date(value));
}

export function IncidentTable() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [severity, setSeverity] = useState<"" | Severity>("");
  const [component, setComponent] = useState("");
  const [includeClosed, setIncludeClosed] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);

  const params = useMemo(() => {
    const next = new URLSearchParams({ page: String(page), page_size: "25" });
    if (severity) next.set("severity", severity);
    if (component) next.set("component_id", component);
    if (includeClosed) next.set("include_closed", "true");
    return next;
  }, [severity, component, page, includeClosed]);

  const load = useCallback(async (showLoading = false) => {
    if (inFlight.current) return;
    inFlight.current = true;
    if (showLoading || incidents.length === 0) setLoading(true);
    else setRefreshing(true);
    setError("");
    try {
      const data = await fetchIncidents(params);
      setIncidents(data.incidents);
    } catch (err) {
      setError(err instanceof Error ? err.message : "failed to load");
    } finally {
      inFlight.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, [params, incidents.length]);

  useEffect(() => {
    load(true);
  }, [load]);

  useEffect(() => {
    const socket = new WebSocket(WS);
    socket.onmessage = () => {
      if (refreshTimer.current) return;
      refreshTimer.current = setTimeout(() => {
        refreshTimer.current = null;
        load(false);
      }, 1000);
    };
    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      socket.close();
    };
  }, [load]);

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6">
      <div className="flex flex-col gap-3 border-b border-line pb-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded bg-ink text-white">
            <Activity size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">Incident Command</h1>
            <p className="text-sm text-ink/70">{refreshing ? "Refreshing live feed..." : "Live feed sorted by operational risk"}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex h-10 items-center gap-2 rounded border border-line bg-white px-3">
            <Filter size={16} />
            <select className="bg-transparent outline-none" value={severity} onChange={(e) => { setSeverity(e.target.value as "" | Severity); setPage(1); }}>
              <option value="">All severities</option>
              <option value="P0">P0</option>
              <option value="P1">P1</option>
              <option value="P2">P2</option>
            </select>
          </div>
          <input
            className="h-10 rounded border border-line bg-white px-3 outline-none"
            placeholder="component_id"
            value={component}
            onChange={(e) => { setComponent(e.target.value); setPage(1); }}
          />
          <label className="flex h-10 items-center gap-2 rounded border border-line bg-white px-3 text-sm text-ink">
            <input
              type="checkbox"
              checked={includeClosed}
              onChange={(e) => { setIncludeClosed(e.target.checked); setPage(1); }}
              className="h-4 w-4"
            />
            Include Closed
          </label>
        </div>
      </div>

      <div className="overflow-hidden rounded border border-line bg-white">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead className="bg-panel text-left text-xs uppercase text-ink/60">
            <tr>
              <th className="p-3">Severity</th>
              <th className="p-3">Component</th>
              <th className="p-3">Status</th>
              <th className="p-3">Signals</th>
              <th className="p-3">First Signal</th>
              <th className="p-3">Updated</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td className="p-4 text-ink/60" colSpan={6}>Loading incidents...</td></tr>}
            {error && <tr><td className="p-4 text-danger" colSpan={6}>{error}</td></tr>}
            {!loading && !error && incidents.length === 0 && <tr><td className="p-4 text-ink/60" colSpan={6}>No incidents match the current filters.</td></tr>}
            {incidents.map((incident) => (
              <tr key={incident.id} className="border-t border-line hover:bg-panel/70">
                <td className="p-3"><SeverityBadge severity={incident.severity} /></td>
                <td className="p-3 font-medium"><Link href={`/incidents/${incident.id}`}>{incident.component_id}</Link></td>
                <td className="p-3">{incident.status}</td>
                <td className="p-3">{incident.signal_count.toLocaleString()}</td>
                <td className="p-3">{fmt(incident.first_signal_time)}</td>
                <td className="p-3">{fmt(incident.updated_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button className="flex h-9 w-9 items-center justify-center rounded border border-line bg-white disabled:opacity-40" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} aria-label="Previous page">
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm text-ink/70">Page {page}</span>
        <button className="flex h-9 w-9 items-center justify-center rounded border border-line bg-white" onClick={() => setPage((p) => p + 1)} aria-label="Next page">
          <ChevronRight size={18} />
        </button>
      </div>
    </section>
  );
}
