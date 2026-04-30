import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ path: process.env.DOTENV_CONFIG_PATH ?? ".env" });

const schema = z.object({
  NODE_ENV: z.string().default("development"),
  POSTGRES_URL: z.string().default("postgres://ims:ims@localhost:5432/ims"),
  MONGO_URL: z.string().default("mongodb://localhost:27017/ims"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  API_PORT: z.coerce.number().default(4000),
  RATE_LIMIT_PER_SECOND: z.coerce.number().default(15000),
  DEBOUNCE_THRESHOLD: z.coerce.number().default(100),
  DEBOUNCE_WINDOW_SECONDS: z.coerce.number().default(10)
});

export const env = schema.parse(process.env);
