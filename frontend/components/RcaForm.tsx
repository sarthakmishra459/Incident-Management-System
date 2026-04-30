"use client";

import { CheckCircle, Save } from "lucide-react";
import { FormEvent, useState } from "react";
import { IncidentState, saveRca, transitionIncident } from "../lib/api";

const categories = ["database", "cache", "deployment", "dependency", "capacity", "unknown"];

export function RcaForm({ incidentId, defaults }: { incidentId: string; defaults?: Record<string, string> | null }) {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState({
    start_time: defaults?.start_time?.slice(0, 16) ?? "",
    end_time: defaults?.end_time?.slice(0, 16) ?? "",
    root_cause_category: defaults?.root_cause_category ?? "database",
    fix_applied: defaults?.fix_applied ?? "",
    prevention_steps: defaults?.prevention_steps ?? ""
  });

  function payload() {
    return {
      ...form,
      start_time: new Date(form.start_time).toISOString(),
      end_time: new Date(form.end_time).toISOString()
    };
  }

  async function submit(event: FormEvent, close: boolean) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    try {
      if (close) {
        await transitionIncident(incidentId, "CLOSED" as IncidentState, payload());
        setMessage("RCA saved and incident closed.");
      } else {
        await saveRca(incidentId, payload());
        setMessage("RCA saved.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Request failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="grid gap-3 rounded border border-line bg-white p-4" onSubmit={(e) => submit(e, false)}>
      <h2 className="text-lg font-semibold">RCA</h2>
      <div className="grid gap-3 md:grid-cols-2">
        <input required type="datetime-local" className="h-10 rounded border border-line px-3" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
        <input required type="datetime-local" className="h-10 rounded border border-line px-3" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
      </div>
      <select className="h-10 rounded border border-line px-3" value={form.root_cause_category} onChange={(e) => setForm({ ...form, root_cause_category: e.target.value })}>
        {categories.map((category) => <option key={category} value={category}>{category}</option>)}
      </select>
      <textarea required className="min-h-24 rounded border border-line p-3" placeholder="Fix applied" value={form.fix_applied} onChange={(e) => setForm({ ...form, fix_applied: e.target.value })} />
      <textarea required className="min-h-24 rounded border border-line p-3" placeholder="Prevention steps" value={form.prevention_steps} onChange={(e) => setForm({ ...form, prevention_steps: e.target.value })} />
      <div className="flex flex-wrap items-center gap-2">
        <button disabled={pending} className="inline-flex h-10 items-center gap-2 rounded bg-accent px-4 text-sm font-semibold text-white" type="submit">
          <Save size={16} /> Save
        </button>
        <button disabled={pending} className="inline-flex h-10 items-center gap-2 rounded bg-ink px-4 text-sm font-semibold text-white" type="button" onClick={(e) => submit(e as never, true)}>
          <CheckCircle size={16} /> Close incident
        </button>
        {message && <span className="text-sm text-ink/70">{message}</span>}
      </div>
    </form>
  );
}
