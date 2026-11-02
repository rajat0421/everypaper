import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

const sessionSchema = new Schema(
  {
    tokenHash: { type: String, required: true, unique: true, index: true },
    createdAt: { type: Date, required: true, default: () => new Date() },
    lastSeenAt: { type: Date, required: true, default: () => new Date() }
  },
  { collection: "sessions" }
);

export type SessionDoc = HydratedDocument<InferSchemaType<typeof sessionSchema>>;

export const SessionModel = model("Session", sessionSchema);
