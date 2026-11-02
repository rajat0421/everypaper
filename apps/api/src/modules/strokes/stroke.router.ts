import { Router, type Router as ExpressRouter } from "express";
import rateLimit from "express-rate-limit";
import { postStroke, deleteStroke, getStroke } from "./stroke.controller.js";
import { requireSessionMiddleware } from "../../middleware/require-session.js";
import { LIMITS } from "@everypaper/shared";

export const strokeRouter: ExpressRouter = Router();

const createLimiter = rateLimit({
  windowMs: 60_000,
  limit: LIMITS.STROKE_RATE_PER_MINUTE,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.session?.id ?? req.ip ?? "anonymous"
});

strokeRouter.post("/strokes", requireSessionMiddleware, createLimiter, postStroke);
strokeRouter.get("/strokes/:id", getStroke);
strokeRouter.delete("/strokes/:id", requireSessionMiddleware, deleteStroke);
