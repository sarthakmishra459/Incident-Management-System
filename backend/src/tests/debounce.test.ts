import { describe, expect, it } from "vitest";
import { shouldCreateIncident } from "../services/debouncePolicy.js";

describe("debouncing", () => {
  it("creates exactly at the threshold", () => {
    expect(shouldCreateIncident(99, 100)).toBe(false);
    expect(shouldCreateIncident(100, 100)).toBe(true);
    expect(shouldCreateIncident(101, 100)).toBe(false);
  });
});
