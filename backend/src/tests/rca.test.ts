import { describe, expect, it } from "vitest";
import { validateRca } from "../workflow/rca.js";

describe("RCA validation", () => {
  it("accepts complete RCA records", () => {
    expect(validateRca({
      start_time: "2026-04-30T10:00:00.000Z",
      end_time: "2026-04-30T10:30:00.000Z",
      root_cause_category: "database",
      fix_applied: "failed primary was replaced",
      prevention_steps: "add synthetic failover checks"
    }).root_cause_category).toBe("database");
  });

  it("rejects incomplete closure RCA", () => {
    expect(() => validateRca({
      start_time: "2026-04-30T10:00:00.000Z",
      end_time: "2026-04-30T09:30:00.000Z",
      root_cause_category: "",
      fix_applied: "",
      prevention_steps: ""
    })).toThrow();
  });
});
