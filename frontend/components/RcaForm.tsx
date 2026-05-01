"use client";

import { CheckCircle, Clock, FileText, Layers, Save, Shield, Zap } from "lucide-react";
import { FormEvent, useState } from "react";
import { IncidentState, saveRca, transitionIncident } from "../lib/api";

const categories = [
  { value: "database", label: "Database", icon: "" },
  { value: "cache", label: "Cache", icon: "" },
  { value: "deployment", label: "Deployment", icon: "" },
  { value: "dependency", label: "Dependency", icon: "" },
  { value: "capacity", label: "Capacity", icon: "" },
  { value: "unknown", label: "Unknown", icon: "" },
];

export function RcaForm({ incidentId, defaults }: { incidentId: string; defaults?: Record<string, string> | null }) {
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
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
    setIsSuccess(false);
    try {
      if (close) {
        await transitionIncident(incidentId, "CLOSED" as IncidentState, payload());
        setMessage("RCA saved and incident closed.");
      } else {
        await saveRca(incidentId, payload());
        setMessage("RCA saved successfully.");
      }
      setIsSuccess(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Request failed");
      setIsSuccess(false);
    } finally {
      setPending(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-ink placeholder:text-ink/30 outline-none transition-all hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

  return (
    <form
      className="mx-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-100/50"
      onSubmit={(e) => submit(e, false)}
    >
      {/* Header */}
      <div className="border-b border-slate-100 bg-gradient-to-b from-white to-slate-50/50 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-600/20">
            <FileText size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-ink">Root Cause Analysis</h2>
            <p className="text-sm font-medium text-ink/40">Document the incident timeline and resolution</p>
          </div>
        </div>
      </div>

      {/* Form Body */}
      <div className="grid gap-5 px-6 py-6">
        {/* Timeline Section */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink/40">
              <Clock size={14} />
              Start Time
            </label>
            <input
              required
              type="datetime-local"
              className={inputClass}
              value={form.start_time}
              onChange={(e) => setForm({ ...form, start_time: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink/40">
              <Clock size={14} />
              End Time
            </label>
            <input
              required
              type="datetime-local"
              className={inputClass}
              value={form.end_time}
              onChange={(e) => setForm({ ...form, end_time: e.target.value })}
            />
          </div>
        </div>

        {/* Category Section */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink/40">
            <Layers size={14} />
            Root Cause Category
          </label>
          <div className="group relative">
            <select
              className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-ink outline-none transition-all hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              value={form.root_cause_category}
              onChange={(e) => setForm({ ...form, root_cause_category: e.target.value })}
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Fix Applied */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink/40">
            <Zap size={14} />
            Fix Applied
          </label>
          <textarea
            required
            className={`${inputClass} min-h-28 resize-y p-4 leading-relaxed`}
            placeholder="Describe the fix that was applied to resolve this incident..."
            value={form.fix_applied}
            onChange={(e) => setForm({ ...form, fix_applied: e.target.value })}
          />
        </div>

        {/* Prevention Steps */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink/40">
            <Shield size={14} />
            Prevention Steps
          </label>
          <textarea
            required
            className={`${inputClass} min-h-28 resize-y p-4 leading-relaxed`}
            placeholder="Describe steps taken to prevent recurrence of this incident..."
            value={form.prevention_steps}
            onChange={(e) => setForm({ ...form, prevention_steps: e.target.value })}
          />
        </div>

        {/* Message */}
        {message && (
          <div
            className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium ${
              isSuccess
                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                : "bg-red-50 text-red-600 ring-1 ring-red-200"
            }`}
          >
            {isSuccess ? <CheckCircle size={16} /> : null}
            {message}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4">
        <button
          disabled={pending}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-all hover:from-blue-700 hover:to-blue-800 hover:shadow-xl hover:shadow-blue-600/30 disabled:opacity-50 disabled:hover:shadow-lg"
          type="submit"
        >
          <Save size={16} />
          {pending ? "Saving..." : "Save Draft"}
        </button>
        <button
          disabled={pending}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 px-5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition-all hover:from-emerald-700 hover:to-emerald-800 hover:shadow-xl hover:shadow-emerald-600/30 disabled:opacity-50 disabled:hover:shadow-lg"
          type="button"
          onClick={(e) => submit(e as never, true)}
        >
          <CheckCircle size={16} />
          {pending ? "Closing..." : "Save & Close Incident"}
        </button>
      </div>
    </form>
  );
}
