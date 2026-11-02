import { Router, type Router as ExpressRouter } from "express";
import { postSession, getMySession } from "./session.controller.js";

export const sessionRouter: ExpressRouter = Router();

sessionRouter.post("/sessions", postSession);
sessionRouter.get("/sessions/me", getMySession);
