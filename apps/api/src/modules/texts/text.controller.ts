import type { Request, Response } from "express";
import { createTextSchema } from "./text.schemas.js";
import { createText, getTextById, softDeleteText, toTextDto } from "./text.service.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { HttpError } from "../../utils/http-error.js";

export const postText = asyncHandler(async (req: Request, res: Response) => {
  const body = createTextSchema.parse(req.body);
  const sessionId = req.session!.id;
  const doc = await createText({ ...body, sessionId });
  res.status(201).json(toTextDto(doc));
});

export const deleteText = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw HttpError.badRequest("Missing text id");
  const sessionId = req.session!.id;
  const doc = await softDeleteText(id, sessionId);
  res.status(200).json(toTextDto(doc));
});

export const getText = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw HttpError.badRequest("Missing text id");
  const doc = await getTextById(id);
  if (!doc || doc.deletedAt) throw HttpError.notFound("Text not found");
  res.status(200).json(toTextDto(doc));
});
