import pino from "pino";
import { env, isProduction } from "../config/env.js";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isProduction ? "info" : "debug"),
  transport: isProduction
    ? undefined
    : {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" }
      },
  redact: ["req.headers.cookie", "req.headers.authorization"],
  base: { nodeEnv: env.NODE_ENV }
});
