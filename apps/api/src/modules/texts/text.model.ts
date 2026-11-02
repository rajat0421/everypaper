import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

const textSchema = new Schema(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: "Session", required: true, index: true },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    content: { type: String, required: true },
    color: { type: String, required: true },
    fontSize: { type: Number, required: true },
    tileId: { type: String, required: true, index: true },
    createdAt: { type: Date, required: true, default: () => new Date(), index: true },
    deletedAt: { type: Date, required: false, default: null, index: true },
    clientTextId: { type: String, required: false, unique: true, sparse: true, index: true }
  },
  { collection: "texts" }
);

export type TextDoc = HydratedDocument<InferSchemaType<typeof textSchema>>;

export const TextModel = model("Text", textSchema);
