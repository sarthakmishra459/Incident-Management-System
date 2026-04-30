import { describe, expect, it, vi } from "vitest";

vi.mock("../db/redis.js", () => ({
  redisSubscriber: {
    subscribe: vi.fn(async () => undefined),
    on: vi.fn()
  },
  redis: {
    publish: vi.fn(async () => 0)
  }
}));

describe("server startup", () => {
  it("registers production plugins successfully", async () => {
    const { buildServer } = await import("../server.js");
    const app = await buildServer();
    await app.ready();
    expect(app.hasRoute({ method: "GET", url: "/health" })).toBe(true);
    await app.close();
  });
});
