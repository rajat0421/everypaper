import { Router, type Router as ExpressRouter } from "express";
import rateLimit from "express-rate-limit";
import { postText, deleteText, getText } from "./text.controller.js";
import { requireSessionMiddleware } from "../../middleware/require-session.js";
import { LIMITS } from "@everypaper/shared";

export const textRouter: ExpressRouter = Router();

const createLimiter = rateLimit({
  windowMs: 60_000,
  limit: LIMITS.TEXT_RATE_PER_MINUTE,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.session?.id ?? req.ip ?? "anonymous"
});

textRouter.post("/texts", requireSessionMiddleware, createLimiter, postText);
textRouter.get("/texts/:id", getText);
textRouter.delete("/texts/:id", requireSessionMiddleware, deleteText);
