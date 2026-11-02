import { createContext, useContext } from "react";
import type { CanvasEngine } from "@everypaper/canvas-core";

export interface EngineContextValue {
  engine: CanvasEngine | null;
  sessionId: string;
}

export const EngineContext = createContext<EngineContextValue | null>(null);

export function useEngineContext(): EngineContextValue {
  const ctx = useContext(EngineContext);
  if (!ctx) {
    throw new Error("useEngineContext must be used within an EngineContext provider");
  }
  return ctx;
}
