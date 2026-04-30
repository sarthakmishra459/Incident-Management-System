import { setTimeout as sleep } from "node:timers/promises";

const apiUrl = process.env.API_URL ?? "http://localhost:4000";
const mode = process.argv[2] ?? "burst";
const total = Number(process.env.TOTAL ?? "10000");
const concurrency = Number(process.env.CONCURRENCY ?? "200");

const scenarios = {
  burst: { component: "checkout-api", severity: "P1", message: "latency spike over SLO" },
  rdbms: { component: "postgres-primary", severity: "P0", message: "connection pool exhausted" },
  cache: { component: "redis-cache", severity: "P1", message: "cache timeout and fallback pressure" }
} as const;

async function postSignal(i: number) {
  const scenario = scenarios[mode as keyof typeof scenarios] ?? scenarios.burst;
  const body = {
    component_id: scenario.component,
    timestamp: new Date().toISOString(),
    severity: scenario.severity,
    message: scenario.message,
    metadata: {
      sequence: i,
      mode,
      host: `node-${i % 64}`,
      latency_ms: mode === "burst" ? 1200 + (i % 500) : 80 + (i % 40)
    }
  };
  const res = await fetch(`${apiUrl}/signals`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`signal rejected: ${res.status}`);
}

async function main() {
  let sent = 0;
  const start = Date.now();
  while (sent < total) {
    const batch = Array.from({ length: Math.min(concurrency, total - sent) }, (_, idx) => postSignal(sent + idx));
    await Promise.all(batch);
    sent += batch.length;
    const elapsed = Math.max(1, (Date.now() - start) / 1000);
    process.stdout.write(`\rsent=${sent}/${total} rate=${Math.round(sent / elapsed)}/sec`);
    if (mode !== "burst") await sleep(20);
  }
  console.log("\ncomplete");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
