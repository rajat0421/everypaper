import { Router, type Router as ExpressRouter } from "express";
import { getTiles, getTile } from "./canvas.controller.js";

export const canvasRouter: ExpressRouter = Router();

canvasRouter.get("/canvas/tiles", getTiles);
canvasRouter.get("/canvas/tiles/:x/:y", getTile);
