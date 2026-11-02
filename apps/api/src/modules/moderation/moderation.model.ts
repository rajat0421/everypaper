import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

const reportSchema = new Schema(
  {
    targetType: { type: String, enum: ["stroke", "text"], required: true },
    targetId: { type: String, required: true, index: true },
    reason: { type: String, required: true },
    reporterSessionId: { type: Schema.Types.ObjectId, ref: "Session", required: true },
    createdAt: { type: Date, required: true, default: () => new Date(), index: true },
    status: { type: String, enum: ["open", "reviewed", "dismissed"], required: true, default: "open" }
  },
  { collection: "moderationreports" }
);

export type ModerationReportDoc = HydratedDocument<InferSchemaType<typeof reportSchema>>;
export const ModerationReportModel = model("ModerationReport", reportSchema);

const actionSchema = new Schema(
  {
    targetType: { type: String, enum: ["stroke", "text"], required: true },
    targetId: { type: String, required: true, index: true },
    action: { type: String, enum: ["remove", "restore"], required: true },
    moderatorId: { type: String, required: true },
    reason: { type: String, required: false },
    createdAt: { type: Date, required: true, default: () => new Date(), index: true }
  },
  { collection: "moderationactions" }
);

export type ModerationActionDoc = HydratedDocument<InferSchemaType<typeof actionSchema>>;
export const ModerationActionModel = model("ModerationAction", actionSchema);
