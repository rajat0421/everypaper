import "express";

export interface RequestSession {
  id: string;
  createdAt: Date;
}

declare global {
  namespace Express {
    interface Request {
      session?: RequestSession;
      requestId?: string;
    }
  }
}
