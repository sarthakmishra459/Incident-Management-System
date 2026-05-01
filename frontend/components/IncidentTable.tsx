"use client";

import Link from "next/link";
import { Activity, ChevronLeft, ChevronRight, Filter, RefreshCw } from "lucide-react";
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
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6">
      {/* Header Card */}
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/50 p-5 shadow-sm shadow-slate-100/50 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-ink to-ink/80 text-white shadow-lg shadow-ink/20">
              <Activity size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-ink">Incident Command</h1>
              <p className="text-sm font-medium text-ink/50">
                {refreshing ? (
                  <span className="flex items-center gap-1.5">
                    <RefreshCw size={14} className="animate-spin" />
                    Refreshing live feed...
                  </span>
                ) : (
                  "Live feed — prioritized by operational risk"
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="group relative">
              <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center transition-colors group-focus-within:text-blue-600">
                <Filter size={16} className="text-ink/40" />
              </div>
              <select
                className="h-10 w-44 appearance-none rounded-xl border border-slate-200 bg-white pl-10 pr-8 text-sm font-medium text-ink outline-none transition-all hover:border-slate-300 hover:shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 group-focus-within:border-blue-500"
                value={severity}
                onChange={(e) => { setSeverity(e.target.value as "" | Severity); setPage(1); }}
              >
                <option value="">All severities</option>
                <option value="P0">P0 — Critical</option>
                <option value="P1">P1 — High</option>
                <option value="P2">P2 — Medium</option>
              </select>
            </div>

            <input
              className="h-10 w-40 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-ink placeholder:font-normal placeholder:text-ink/30 outline-none transition-all hover:border-slate-300 hover:shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              placeholder="Filter by component"
              value={component}
              onChange={(e) => { setComponent(e.target.value); setPage(1); }}
            />

            <label className="flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-ink/70 transition-all hover:border-slate-300 hover:bg-slate-50 has-[:checked]:border-blue-200 has-[:checked]:bg-blue-50 has-[:checked]:text-blue-700">
              <input
                type="checkbox"
                checked={includeClosed}
                onChange={(e) => { setIncludeClosed(e.target.checked); setPage(1); }}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              Include Closed
            </label>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-100/50">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                <th className="px-5 py-4 text-left">
                  <span className="text-xs font-semibold uppercase tracking-wider text-ink/40">Severity</span>
                </th>
                <th className="px-5 py-4 text-left">
                  <span className="text-xs font-semibold uppercase tracking-wider text-ink/40">Component</span>
                </th>
                <th className="px-5 py-4 text-left">
                  <span className="text-xs font-semibold uppercase tracking-wider text-ink/40">Status</span>
                </th>
                <th className="px-5 py-4 text-left">
                  <span className="text-xs font-semibold uppercase tracking-wider text-ink/40">Signals</span>
                </th>
                <th className="px-5 py-4 text-left">
                  <span className="text-xs font-semibold uppercase tracking-wider text-ink/40">First Signal</span>
                </th>
                <th className="px-5 py-4 text-left">
                  <span className="text-xs font-semibold uppercase tracking-wider text-ink/40">Last Update</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="p-8 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
                      <span className="text-sm font-medium text-ink/40">Loading incidents...</span>
                    </div>
                  </td>
                </tr>
              )}
              {error && (
                <tr>
                  <td colSpan={6} className="p-8 text-center">
                    <span className="text-sm font-medium text-red-600">{error}</span>
                  </td>
                </tr>
              )}
              {!loading && !error && incidents.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-50">
                        <Activity size={28} className="text-ink/20" />
                      </div>
                      <span className="text-sm font-medium text-ink/40">No incidents match the current filters</span>
                    </div>
                  </td>
                </tr>
              )}
              {incidents.map((incident) => (
                <tr
                  key={incident.id}
                  className="group relative border-b border-slate-100 transition-colors hover:bg-slate-50/50"
                >
                  <td className="p-5">
                    <SeverityBadge severity={incident.severity} />
                  </td>
                  <td className="p-5">
                    <Link
                      href={`/incidents/${incident.id}`}
                      className="font-medium text-ink hover:text-blue-600 hover:underline underline-offset-4"
                    >
                      {incident.component_id}
                    </Link>
                  </td>
                  <td className="p-5">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      incident.status === 'OPEN'
                        ? 'bg-red-50 text-red-700'
                        : incident.status === 'RESOLVED'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}>
                      {incident.status}
                    </span>
                  </td>
                  <td className="p-5">
                    <span className="font-semibold text-ink">{incident.signal_count.toLocaleString()}</span>
                  </td>
                  <td className="p-5">
                    <span className="text-ink/60">{fmt(incident.first_signal_time)}</span>
                  </td>
                  <td className="p-5">
                    <span className="text-ink/60">{fmt(incident.updated_at)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-sm shadow-slate-100/50">
        <span className="text-sm font-medium text-ink/50">
          Page <span className="text-ink">{page}</span>
        </span>
        <div className="flex items-center gap-2">
          <button
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-ink/60 transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-ink disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-ink/40"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            aria-label="Previous page"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-ink/60 transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-ink"
            onClick={() => setPage((p) => p + 1)}
            aria-label="Next page"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}
