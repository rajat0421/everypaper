import { io, type Socket } from "socket.io-client";
import { SOCKET_EVENTS } from "@everypaper/shared";
import { API_URL } from "../lib/env";

export type SocketStatus = "connecting" | "connected" | "disconnected";

export interface StrokeStartPayload {
  clientStrokeId: string;
  color: string;
  brushSize: number;
  isEraser: boolean;
  startPoint: { x: number; y: number; t?: number; p?: number };
}

export interface StrokePointsPayload {
  clientStrokeId: string;
  seq: number;
  points: { x: number; y: number; t?: number; p?: number }[];
}

export interface StrokeEndPayload {
  clientStrokeId: string;
}

export interface StrokeDeletePayload {
  strokeId: string;
}

export interface TextCreatePayload {
  clientTextId: string;
  x: number;
  y: number;
  content: string;
  color: string;
  fontSize: number;
}

export interface TextDeletePayload {
  textId: string;
}

/**
 * Thin, typed wrapper around socket.io-client. Keeps all wire-event names in
 * one place (matching @everypaper/shared's SOCKET_EVENTS) so the rest of the
 * app never deals with raw event strings.
 */
export class SocketService {
  private socket: Socket | null = null;
  private statusListeners = new Set<(status: SocketStatus) => void>();

  connect(): Socket {
    if (this.socket) return this.socket;
    const socket = io(API_URL, {
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000
    });
    socket.on("connect", () => this.emitStatus("connected"));
    socket.on("disconnect", () => this.emitStatus("disconnected"));
    socket.on("connect_error", () => this.emitStatus("disconnected"));
    socket.io.on("reconnect_attempt", () => this.emitStatus("connecting"));
    this.socket = socket;
    this.emitStatus("connecting");
    return socket;
  }

  disconnect(): void {
    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.socket = null;
  }

  get raw(): Socket | null {
    return this.socket;
  }

  onStatusChange(listener: (status: SocketStatus) => void): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  private emitStatus(status: SocketStatus): void {
    for (const listener of this.statusListeners) listener(status);
  }

  subscribeTiles(tileIds: string[]): void {
    if (tileIds.length === 0) return;
    this.socket?.emit(SOCKET_EVENTS.CANVAS_SUBSCRIBE, { tileIds });
  }

  unsubscribeTiles(tileIds: string[]): void {
    if (tileIds.length === 0) return;
    this.socket?.emit(SOCKET_EVENTS.CANVAS_UNSUBSCRIBE, { tileIds });
  }

  strokeStart(payload: StrokeStartPayload): void {
    this.socket?.emit(SOCKET_EVENTS.STROKE_START, payload);
  }

  strokePoints(payload: StrokePointsPayload): void {
    this.socket?.emit(SOCKET_EVENTS.STROKE_POINTS, payload);
  }

  strokeEnd(payload: StrokeEndPayload): void {
    this.socket?.emit(SOCKET_EVENTS.STROKE_END, payload);
  }

  strokeDelete(payload: StrokeDeletePayload): void {
    this.socket?.emit(SOCKET_EVENTS.STROKE_DELETE, payload);
  }

  textCreate(payload: TextCreatePayload): void {
    this.socket?.emit(SOCKET_EVENTS.TEXT_CREATE, payload);
  }

  textDelete(payload: TextDeletePayload): void {
    this.socket?.emit(SOCKET_EVENTS.TEXT_DELETE, payload);
  }

  on<T = unknown>(event: string, handler: (payload: T) => void): void {
    this.socket?.on(event, handler as (...args: unknown[]) => void);
  }

  off<T = unknown>(event: string, handler: (payload: T) => void): void {
    this.socket?.off(event, handler as (...args: unknown[]) => void);
  }
}

export const socketService = new SocketService();
