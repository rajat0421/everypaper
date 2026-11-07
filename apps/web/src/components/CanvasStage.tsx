import { useRef } from "react";
import { EngineContext } from "../app/EngineContext";
import { useCanvasEngine } from "../hooks/useCanvasEngine";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { useSyncDrawingStyle } from "../hooks/useSyncDrawingStyle";
import { Toolbar } from "../features/toolbar/Toolbar";
import { TextInputOverlay } from "../features/text/TextInputOverlay";
import { StatusPill } from "./StatusPill";
import { Toast } from "./Toast";
import { ConnectionBanner } from "./ConnectionBanner";

interface CanvasStageProps {
  sessionId: string;
}

/**
 * Owns the canvas element and the CanvasEngine lifecycle. React never attaches
 * its own pointer handlers to the canvas - the engine does that internally.
 */
export function CanvasStage({ sessionId }: CanvasStageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engine = useCanvasEngine(canvasRef, sessionId);
  useKeyboardShortcuts(engine);
  useSyncDrawingStyle(engine);

  return (
    <EngineContext.Provider value={{ engine, sessionId }}>
      <div className="relative h-full w-full overflow-hidden bg-paper">
        <canvas ref={canvasRef} data-testid="everypaper-canvas" className="absolute inset-0 h-full w-full" />

        <TextInputOverlay />

        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-3 sm:bottom-auto sm:top-5 sm:px-4">
          <Toolbar />
        </div>

        <div className="pointer-events-none absolute right-3 top-4 sm:bottom-5 sm:right-5 sm:top-auto">
          <StatusPill />
        </div>

        <ConnectionBanner />
        <Toast />
      </div>
    </EngineContext.Provider>
  );
}
