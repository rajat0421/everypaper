import mongoose from "mongoose";
import { env } from "../config/env.js";
import { logger } from "./logger.js";

let connecting: Promise<typeof mongoose> | null = null;

export async function connectMongo(uri: string = env.MONGODB_URI): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }
  if (!connecting) {
    connecting = mongoose.connect(uri).then((m) => {
      logger.info({ msg: "mongo connected" });
      return m;
    });
  }
  return connecting;
}

export async function disconnectMongo(): Promise<void> {
  connecting = null;
  await mongoose.disconnect();
}

export function isMongoReady(): boolean {
  return mongoose.connection.readyState === 1;
}
