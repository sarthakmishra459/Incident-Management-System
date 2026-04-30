import { z } from "zod";

export const rcaSchema = z.object({
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  root_cause_category: z.string().min(2),
  fix_applied: z.string().min(3),
  prevention_steps: z.string().min(3)
}).refine((rca) => new Date(rca.end_time).getTime() >= new Date(rca.start_time).getTime(), {
  message: "end_time must be after start_time",
  path: ["end_time"]
});

export function validateRca(payload: unknown) {
  return rcaSchema.parse(payload);
}
