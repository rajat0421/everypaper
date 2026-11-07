import { z } from "zod";
import { LIMITS } from "./constants.js";

export const pointSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  t: z.number().finite().optional(),
  p: z.number().min(0).max(1).optional()
});
export type Point = z.infer<typeof pointSchema>;

export const boundsSchema = z.object({
  minX: z.number().finite(),
  minY: z.number().finite(),
  maxX: z.number().finite(),
  maxY: z.number().finite()
});
export type Bounds = z.infer<typeof boundsSchema>;

export const hexColorSchema = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Invalid hex color");

export const tileIdSchema = z.string().regex(/^-?\d+:-?\d+$/, "Invalid tile id");

export const clientIdSchema = z.string().uuid();

export const strokeStartSchema = z.object({
  clientStrokeId: clientIdSchema,
  color: hexColorSchema,
  brushSize: z.number().min(LIMITS.MIN_BRUSH_SIZE).max(LIMITS.MAX_BRUSH_SIZE),
  isEraser: z.boolean().optional().default(false),
  startPoint: pointSchema
});
export type StrokeStartInput = z.infer<typeof strokeStartSchema>;

export const strokePointsSchema = z.object({
  clientStrokeId: clientIdSchema,
  seq: z.number().int().nonnegative(),
  points: z.array(pointSchema).min(1).max(LIMITS.MAX_POINT_BATCH)
});
export type StrokePointsInput = z.infer<typeof strokePointsSchema>;

export const strokeEndSchema = z.object({
  clientStrokeId: clientIdSchema
});
export type StrokeEndInput = z.infer<typeof strokeEndSchema>;

export const strokeDeleteSchema = z.object({
  strokeId: z.string()
});
export type StrokeDeleteInput = z.infer<typeof strokeDeleteSchema>;

export const textCreateSchema = z.object({
  clientTextId: clientIdSchema,
  x: z.number().finite(),
  y: z.number().finite(),
  content: z.string().min(1).max(LIMITS.MAX_TEXT_LENGTH),
  color: hexColorSchema,
  fontSize: z.number().min(LIMITS.MIN_FONT_SIZE).max(LIMITS.MAX_FONT_SIZE)
});
export type TextCreateInput = z.infer<typeof textCreateSchema>;

export const textDeleteSchema = z.object({
  textId: z.string()
});
export type TextDeleteInput = z.infer<typeof textDeleteSchema>;

export const canvasSubscribeSchema = z.object({
  tileIds: z.array(tileIdSchema).min(1).max(LIMITS.MAX_TILES_PER_SUBSCRIBE)
});
export type CanvasSubscribeInput = z.infer<typeof canvasSubscribeSchema>;

export const reportCreateSchema = z.object({
  targetType: z.enum(["stroke", "text"]),
  targetId: z.string(),
  reason: z.string().min(1).max(500)
});
export type ReportCreateInput = z.infer<typeof reportCreateSchema>;

// REST DTOs (wire format, dates as ISO strings)
export const strokeDtoSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  points: z.array(pointSchema),
  color: hexColorSchema,
  brushSize: z.number(),
  isEraser: z.boolean(),
  bounds: boundsSchema,
  tileIds: z.array(tileIdSchema),
  createdAt: z.string(),
  version: z.number(),
  // Echoes the client-generated id the stroke was drawn under, so the
  // originating client can reconcile its local (clientStrokeId-keyed) state
  // once the server assigns this stroke its own `id`.
  clientStrokeId: z.string().optional()
});
export type StrokeDto = z.infer<typeof strokeDtoSchema>;

export const textDtoSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  x: z.number(),
  y: z.number(),
  content: z.string(),
  color: hexColorSchema,
  fontSize: z.number(),
  createdAt: z.string()
});
export type TextDto = z.infer<typeof textDtoSchema>;

export const sessionDtoSchema = z.object({
  sessionId: z.string(),
  createdAt: z.string()
});
export type SessionDto = z.infer<typeof sessionDtoSchema>;

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    requestId: z.string().optional()
  })
});
export type ApiError = z.infer<typeof apiErrorSchema>;
