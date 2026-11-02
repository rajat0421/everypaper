import type { Socket as BaseSocket } from "socket.io";

export interface SocketSession {
  id: string;
  createdAt: Date;
}

export interface SocketData {
  session: SocketSession;
}

export type AppSocket = BaseSocket<
  Record<string, (...args: unknown[]) => void>,
  Record<string, (...args: unknown[]) => void>,
  Record<string, never>,
  SocketData
>;
