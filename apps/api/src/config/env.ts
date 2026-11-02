import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1).default("mongodb://127.0.0.1:27017/everypaper"),
  CORS_ORIGINS: z.string().default("http://localhost:5173"),
  MODERATOR_API_KEY: z.string().min(1).default("change-me-in-development"),
  COOKIE_DOMAIN: z.string().optional().default("")
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment configuration");
  }
  return parsed.data;
}

export const env = loadEnv();

export const isProduction = env.NODE_ENV === "production";

export const corsOrigins = env.CORS_ORIGINS.split(",")
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

export const SESSION_COOKIE_NAME = isProduction ? "__Host-ep_session" : "ep_session";

// 10 years, in milliseconds
export const SESSION_COOKIE_MAX_AGE_MS = 10 * 365 * 24 * 60 * 60 * 1000;
