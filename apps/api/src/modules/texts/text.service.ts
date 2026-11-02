import type { TextDto } from "@everypaper/shared";
import { worldToTile, tileIdOf } from "@everypaper/shared";
import { TextModel, type TextDoc } from "./text.model.js";
import { HttpError } from "../../utils/http-error.js";

export interface CreateTextInput {
  sessionId: string;
  x: number;
  y: number;
  content: string;
  color: string;
  fontSize: number;
  clientTextId?: string;
}

// Strip control characters (except none needed, we reject newlines/tabs too since
// canvas text is single-line) as defense in depth; the frontend never renders as HTML.
export function sanitizeTextContent(content: string): string {
  // eslint-disable-next-line no-control-regex
  return content.replace(/[\u0000-\u001F\u007F]/g, "").trim();
}

export function toTextDto(doc: TextDoc): TextDto {
  return {
    id: doc.id as string,
    sessionId: doc.sessionId.toString(),
    x: doc.x,
    y: doc.y,
    content: doc.content,
    color: doc.color,
    fontSize: doc.fontSize,
    createdAt: (doc.createdAt as Date).toISOString()
  };
}

export async function createText(input: CreateTextInput): Promise<TextDoc> {
  if (input.clientTextId) {
    const existing = await TextModel.findOne({ clientTextId: input.clientTextId }).exec();
    if (existing) {
      return existing;
    }
  }

  const sanitized = sanitizeTextContent(input.content);
  if (sanitized.length === 0) {
    throw HttpError.badRequest("Text content is empty after sanitization");
  }

  const tileId = tileIdOf(worldToTile(input.x, input.y));

  const doc = await TextModel.create({
    sessionId: input.sessionId,
    x: input.x,
    y: input.y,
    content: sanitized,
    color: input.color,
    fontSize: input.fontSize,
    tileId,
    clientTextId: input.clientTextId
  });
  return doc;
}

export async function getActiveTextsForTile(tileId: string): Promise<TextDoc[]> {
  return TextModel.find({ tileId, deletedAt: null }).exec();
}

export async function getTextById(id: string): Promise<TextDoc | null> {
  return TextModel.findById(id).exec();
}

export async function softDeleteText(id: string, sessionId: string): Promise<TextDoc> {
  const doc = await TextModel.findById(id).exec();
  if (!doc || doc.deletedAt) {
    throw HttpError.notFound("Text not found");
  }
  if (doc.sessionId.toString() !== sessionId) {
    throw HttpError.forbidden("You do not own this text");
  }
  doc.deletedAt = new Date();
  await doc.save();
  return doc;
}

export async function moderatorRemoveText(id: string): Promise<TextDoc> {
  const doc = await TextModel.findById(id).exec();
  if (!doc) {
    throw HttpError.notFound("Text not found");
  }
  doc.deletedAt = new Date();
  await doc.save();
  return doc;
}
