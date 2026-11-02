import type { Request, Response } from "express";
import { z } from "zod";
import { reportCreateSchema } from "@everypaper/shared";
import { createReport, moderatorRemove } from "./moderation.service.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { HttpError } from "../../utils/http-error.js";
import { hashSessionToken } from "../../utils/session-token.js";

function moderatorIdFromKey(req: Request): string {
  const key = req.header("x-moderator-key") ?? "unknown";
  // Never persist the raw moderator key; store a stable hash instead.
  return hashSessionToken(key).slice(0, 16);
}

export const postReport = asyncHandler(async (req: Request, res: Response) => {
  const body = reportCreateSchema.parse(req.body);
  const sessionId = req.session!.id;
  const doc = await createReport({ ...body, reporterSessionId: sessionId });
  res.status(201).json({ id: doc.id, status: doc.status, createdAt: doc.createdAt });
});

const removeBodySchema = z.object({
  reason: z.string().max(500).optional()
});

export const removeStroke = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw HttpError.badRequest("Missing stroke id");
  const { reason } = removeBodySchema.parse(req.body ?? {});
  const moderatorId = moderatorIdFromKey(req);
  const action = await moderatorRemove("stroke", id, moderatorId, reason);
  res.status(200).json({ id: action.id, action: action.action, createdAt: action.createdAt });
});

export const removeText = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw HttpError.badRequest("Missing text id");
  const { reason } = removeBodySchema.parse(req.body ?? {});
  const moderatorId = moderatorIdFromKey(req);
  const action = await moderatorRemove("text", id, moderatorId, reason);
  res.status(200).json({ id: action.id, action: action.action, createdAt: action.createdAt });
});
