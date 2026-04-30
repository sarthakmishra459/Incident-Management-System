import { describe, expect, it, vi } from "vitest";

vi.mock("../services/signalQueue.js", () => ({
  enqueueSignal: vi.fn(async () => undefined)
}));
vi.mock("../services/realtime.js", () => ({
  registerRealtime: vi.fn(async () => undefined)
}));
vi.mock("../db/migrate.js", () => ({ migrate: vi.fn(async () => undefined) }));

describe("signals API", () => {
  it("accepts valid signal payloads", async () => {
    const { buildServer } = await import("../server.js");
    const app = await buildServer();
    const res = await app.inject({
      method: "POST",
      url: "/signals",
      payload: {
        component_id: "payments-api",
        timestamp: "2026-04-30T10:00:00.000Z",
        severity: "P1",
        message: "latency spike",
        metadata: { p95: 1200 }
      }
    });
    expect(res.statusCode).toBe(202);
    await app.close();
  });
});
