import { describe, expect, it } from "vitest";
import { closedMttrSql } from "../workflow/stateMachine.js";

describe("MTTR calculation", () => {
  it("uses RCA end_time and incident first_signal_time", () => {
    expect(closedMttrSql).toContain("rca_records.end_time - incidents.first_signal_time");
  });
});
