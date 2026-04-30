import { env } from "../config/env.js";

export function shouldCreateIncident(count: number, threshold = env.DEBOUNCE_THRESHOLD) {
  return count === threshold;
}
