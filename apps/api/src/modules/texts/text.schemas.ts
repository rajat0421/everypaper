import { z } from "zod";
import { hexColorSchema, clientIdSchema, LIMITS } from "@everypaper/shared";

export const createTextSchema = z.object({
  clientTextId: clientIdSchema.optional(),
  x: z.number().finite(),
  y: z.number().finite(),
  content: z.string().min(1).max(LIMITS.MAX_TEXT_LENGTH),
  color: hexColorSchema,
  fontSize: z.number().min(LIMITS.MIN_FONT_SIZE).max(LIMITS.MAX_FONT_SIZE)
});
export type CreateTextBody = z.infer<typeof createTextSchema>;
