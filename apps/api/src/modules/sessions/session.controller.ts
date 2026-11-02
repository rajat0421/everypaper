import type { Request, Response } from "express";
import type { SessionDto } from "@everypaper/shared";
import { createSession } from "./session.service.js";
import { setSessionCookie } from "./session-cookie.js";
import { asyncHandler } from "../../utils/async-handler.js";

function toDto(id: string, createdAt: Date): SessionDto {
  return { sessionId: id, createdAt: createdAt.toISOString() };
}

export const postSession = asyncHandler(async (req: Request, res: Response) => {
  if (req.session) {
    res.status(200).json(toDto(req.session.id, req.session.createdAt));
    return;
  }
  const { doc, token } = await createSession();
  setSessionCookie(res, token);
  res.status(201).json(toDto(doc.id as string, doc.createdAt));
});

export const getMySession = asyncHandler(async (req: Request, res: Response) => {
  if (req.session) {
    res.status(200).json(toDto(req.session.id, req.session.createdAt));
    return;
  }
  const { doc, token } = await createSession();
  setSessionCookie(res, token);
  res.status(201).json(toDto(doc.id as string, doc.createdAt));
});
