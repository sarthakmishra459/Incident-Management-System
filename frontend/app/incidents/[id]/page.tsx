import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { fetchIncident } from "../../../lib/api";
import { SeverityBadge } from "../../../components/SeverityBadge";
import { RcaForm } from "../../../components/RcaForm";

function fmt(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "medium" }).format(new Date(value));
}

export default async function IncidentPage({ params }: { params: { id: string } }) {
  const detail = await fetchIncident(params.id);
  const { incident, signals, rca } = detail;

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-6">
      <Link href="/" className="inline-flex w-fit items-center gap-2 text-sm font-medium text-accent"><ArrowLeft size={16} /> Back</Link>
      <section className="grid gap-4 border-b border-line pb-5 md:grid-cols-[1fr_auto]">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <SeverityBadge severity={incident.severity} />
            <span className="rounded bg-white px-2 py-1 text-xs font-semibold">{incident.status}</span>
          </div>
          <h1 className="text-2xl font-semibold">{incident.component_id}</h1>
          <p className="text-sm text-ink/70">{incident.id}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm md:min-w-80">
          <div className="rounded border border-line bg-white p-3"><span className="block text-ink/60">Signals</span><strong>{incident.signal_count.toLocaleString()}</strong></div>
          <div className="rounded border border-line bg-white p-3"><span className="block text-ink/60">MTTR</span><strong>{incident.mttr_ms ? `${Math.round(incident.mttr_ms / 1000)}s` : "Open"}</strong></div>
          <div className="rounded border border-line bg-white p-3"><span className="block text-ink/60">First</span><strong>{fmt(incident.first_signal_time)}</strong></div>
          <div className="rounded border border-line bg-white p-3"><span className="block text-ink/60">Last</span><strong>{fmt(incident.last_signal_time)}</strong></div>
        </div>
      </section>

      <RcaForm incidentId={incident.id} defaults={rca as never} />

      <section className="rounded border border-line bg-white">
        <div className="border-b border-line p-4">
          <h2 className="text-lg font-semibold">Linked Signals</h2>
        </div>
        <div className="divide-y divide-line">
          {signals.length === 0 && <p className="p-4 text-sm text-ink/60">No linked signals found.</p>}
          {signals.map((signal) => (
            <article key={signal._id} className="grid gap-2 p-4 md:grid-cols-[120px_1fr_220px]">
              <SeverityBadge severity={signal.severity} />
              <div>
                <p className="font-medium">{signal.message}</p>
                <pre className="mt-2 overflow-auto rounded bg-panel p-2 text-xs">{JSON.stringify(signal.metadata, null, 2)}</pre>
              </div>
              <time className="text-sm text-ink/60">{fmt(signal.timestamp)}</time>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
