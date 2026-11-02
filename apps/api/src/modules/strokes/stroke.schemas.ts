import { z } from "zod";
import { pointSchema, hexColorSchema, clientIdSchema, LIMITS } from "@everypaper/shared";

export const createStrokeSchema = z.object({
  clientStrokeId: clientIdSchema.optional(),
  color: hexColorSchema,
  brushSize: z.number().min(LIMITS.MIN_BRUSH_SIZE).max(LIMITS.MAX_BRUSH_SIZE),
  isEraser: z.boolean().optional().default(false),
  points: z.array(pointSchema).min(1).max(LIMITS.MAX_STROKE_POINTS)
});
export type CreateStrokeBody = z.infer<typeof createStrokeSchema>;
