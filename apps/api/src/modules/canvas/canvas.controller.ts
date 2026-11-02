import type { Request, Response } from "express";
import { z } from "zod";
import { tileIdSchema, tileIdOf, LIMITS } from "@everypaper/shared";
import { getTileSnapshot, getTileSnapshots } from "./canvas.service.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { HttpError } from "../../utils/http-error.js";

const tilesQuerySchema = z.object({
  ids: z.string().min(1)
});

export const getTiles = asyncHandler(async (req: Request, res: Response) => {
  const { ids } = tilesQuerySchema.parse(req.query);
  const rawIds = ids.split(",").map((s) => s.trim()).filter(Boolean);
  if (rawIds.length === 0) {
    throw HttpError.badRequest("No tile ids provided");
  }
  if (rawIds.length > LIMITS.MAX_TILES_PER_SUBSCRIBE) {
    throw HttpError.badRequest(`Too many tiles requested (max ${LIMITS.MAX_TILES_PER_SUBSCRIBE})`);
  }
  const tileIds = rawIds.map((id) => tileIdSchema.parse(id));
  const tiles = await getTileSnapshots(tileIds);
  res.status(200).json({ tiles });
});

const tileParamsSchema = z.object({
  x: z.coerce.number().int(),
  y: z.coerce.number().int()
});

export const getTile = asyncHandler(async (req: Request, res: Response) => {
  const { x, y } = tileParamsSchema.parse(req.params);
  const tileId = tileIdOf({ tx: x, ty: y });
  const tile = await getTileSnapshot(tileId);
  res.status(200).json(tile);
});
