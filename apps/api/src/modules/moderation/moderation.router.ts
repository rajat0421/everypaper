import { Router, type Router as ExpressRouter } from "express";
import rateLimit from "express-rate-limit";
import { postReport, removeStroke, removeText } from "./moderation.controller.js";
import { requireSessionMiddleware } from "../../middleware/require-session.js";
import { requireModeratorKey } from "../../middleware/moderator-auth.js";
import { LIMITS } from "@everypaper/shared";

export const moderationRouter: ExpressRouter = Router();

const reportLimiter = rateLimit({
  windowMs: 60_000,
  limit: LIMITS.REPORT_RATE_PER_MINUTE,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.session?.id ?? req.ip ?? "anonymous"
});

moderationRouter.post("/reports", requireSessionMiddleware, reportLimiter, postReport);

// Internal moderator-only endpoints, gated by MODERATOR_API_KEY header.
moderationRouter.post("/moderation/strokes/:id/remove", requireModeratorKey, removeStroke);
moderationRouter.post("/moderation/texts/:id/remove", requireModeratorKey, removeText);
