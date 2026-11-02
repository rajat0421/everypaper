import type { Request, Response } from "express";
import { createStrokeSchema } from "./stroke.schemas.js";
import { createStroke, getStrokeById, softDeleteStroke, toStrokeDto } from "./stroke.service.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { HttpError } from "../../utils/http-error.js";

export const postStroke = asyncHandler(async (req: Request, res: Response) => {
  const body = createStrokeSchema.parse(req.body);
  const sessionId = req.session!.id;
  const doc = await createStroke({ ...body, sessionId });
  res.status(201).json(toStrokeDto(doc));
});

export const deleteStroke = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw HttpError.badRequest("Missing stroke id");
  const sessionId = req.session!.id;
  const doc = await softDeleteStroke(id, sessionId);
  res.status(200).json(toStrokeDto(doc));
});

export const getStroke = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw HttpError.badRequest("Missing stroke id");
  const doc = await getStrokeById(id);
  if (!doc || doc.deletedAt) throw HttpError.notFound("Stroke not found");
  res.status(200).json(toStrokeDto(doc));
});
