import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

const pointSchema = new Schema(
  {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    t: { type: Number, required: false },
    p: { type: Number, required: false }
  },
  { _id: false }
);

const boundsSchema = new Schema(
  {
    minX: { type: Number, required: true },
    minY: { type: Number, required: true },
    maxX: { type: Number, required: true },
    maxY: { type: Number, required: true }
  },
  { _id: false }
);

const strokeSchema = new Schema(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: "Session", required: true, index: true },
    points: { type: [pointSchema], required: true },
    color: { type: String, required: true },
    brushSize: { type: Number, required: true },
    isEraser: { type: Boolean, required: true, default: false },
    bounds: { type: boundsSchema, required: true },
    tileIds: { type: [String], required: true, index: true },
    createdAt: { type: Date, required: true, default: () => new Date(), index: true },
    deletedAt: { type: Date, required: false, default: null, index: true },
    version: { type: Number, required: true, default: 1 },
    clientStrokeId: { type: String, required: false, unique: true, sparse: true, index: true }
  },
  { collection: "strokes" }
);

export type StrokeDoc = HydratedDocument<InferSchemaType<typeof strokeSchema>>;

export const StrokeModel = model("Stroke", strokeSchema);
