import { Router, type Router as ExpressRouter } from "express";
import { isMongoReady } from "../../infrastructure/mongo.js";

export const healthRouter: ExpressRouter = Router();

healthRouter.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

healthRouter.get("/health/ready", (_req, res) => {
  if (isMongoReady()) {
    res.status(200).json({ status: "ready", mongo: "connected" });
  } else {
    res.status(503).json({ status: "not-ready", mongo: "disconnected" });
  }
});
