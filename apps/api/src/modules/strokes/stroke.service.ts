import type { StrokeDto, Point, Bounds } from "@everypaper/shared";
import { boundsFromPoints, tilesForBounds } from "@everypaper/shared";
import { StrokeModel, type StrokeDoc } from "./stroke.model.js";
import { HttpError } from "../../utils/http-error.js";

export interface CreateStrokeInput {
  sessionId: string;
  points: Point[];
  color: string;
  brushSize: number;
  isEraser: boolean;
  clientStrokeId?: string;
}

export function toStrokeDto(doc: StrokeDoc): StrokeDto {
  return {
    id: doc.id as string,
    sessionId: doc.sessionId.toString(),
    points: doc.points as Point[],
    color: doc.color,
    brushSize: doc.brushSize,
    isEraser: doc.isEraser,
    bounds: doc.bounds as Bounds,
    tileIds: doc.tileIds,
    createdAt: (doc.createdAt as Date).toISOString(),
    version: doc.version,
    clientStrokeId: doc.clientStrokeId ?? undefined
  };
}

export async function createStroke(input: CreateStrokeInput): Promise<StrokeDoc> {
  const bounds = boundsFromPoints(input.points);
  const tileIds = tilesForBounds(bounds);

  if (input.clientStrokeId) {
    const existing = await StrokeModel.findOne({ clientStrokeId: input.clientStrokeId }).exec();
    if (existing) {
      return existing;
    }
  }

  const doc = await StrokeModel.create({
    sessionId: input.sessionId,
    points: input.points,
    color: input.color,
    brushSize: input.brushSize,
    isEraser: input.isEraser,
    bounds,
    tileIds,
    clientStrokeId: input.clientStrokeId,
    version: 1
  });
  return doc;
}

export async function getActiveStrokesForTile(tileId: string): Promise<StrokeDoc[]> {
  return StrokeModel.find({ tileIds: tileId, deletedAt: null }).exec();
}

export async function getStrokeById(id: string): Promise<StrokeDoc | null> {
  return StrokeModel.findById(id).exec();
}

export async function softDeleteStroke(id: string, sessionId: string): Promise<StrokeDoc> {
  const doc = await StrokeModel.findById(id).exec();
  if (!doc || doc.deletedAt) {
    throw HttpError.notFound("Stroke not found");
  }
  if (doc.sessionId.toString() !== sessionId) {
    throw HttpError.forbidden("You do not own this stroke");
  }
  doc.deletedAt = new Date();
  await doc.save();
  return doc;
}

/** Moderator-initiated removal, regardless of ownership. */
export async function moderatorRemoveStroke(id: string): Promise<StrokeDoc> {
  const doc = await StrokeModel.findById(id).exec();
  if (!doc) {
    throw HttpError.notFound("Stroke not found");
  }
  doc.deletedAt = new Date();
  await doc.save();
  return doc;
}

/** Restore a soft-deleted stroke, only if the requesting session owns it (redo support). */
export async function restoreOwnStroke(id: string, sessionId: string): Promise<StrokeDoc> {
  const doc = await StrokeModel.findById(id).exec();
  if (!doc) {
    throw HttpError.notFound("Stroke not found");
  }
  if (doc.sessionId.toString() !== sessionId) {
    throw HttpError.forbidden("You do not own this stroke");
  }
  doc.deletedAt = null;
  await doc.save();
  return doc;
}
