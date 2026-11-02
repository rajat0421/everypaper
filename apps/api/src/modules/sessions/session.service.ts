import { SessionModel, type SessionDoc } from "./session.model.js";
import { generateSessionToken, hashSessionToken } from "../../utils/session-token.js";

export interface SessionWithToken {
  doc: SessionDoc;
  token: string;
}

export async function createSession(): Promise<SessionWithToken> {
  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const doc = await SessionModel.create({ tokenHash });
  return { doc, token };
}

export async function findSessionByToken(token: string): Promise<SessionDoc | null> {
  const tokenHash = hashSessionToken(token);
  const doc = await SessionModel.findOne({ tokenHash }).exec();
  if (!doc) return null;
  doc.lastSeenAt = new Date();
  await doc.save();
  return doc;
}

export async function findSessionById(id: string): Promise<SessionDoc | null> {
  return SessionModel.findById(id).exec();
}
