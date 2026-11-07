import { useEffect } from "react";
import type { CanvasEngine } from "@everypaper/canvas-core";
import { useToolStore } from "../stores/toolStore";

/**
 * Pushes the toolbar's color/brushSize/fontSize into the engine's
 * DrawingController whenever they change. Without this, the toolbar only
 * updates its own display state — strokes keep drawing with the
 * DrawingController's hardcoded default style (black, 4px) forever.
 */
export function useSyncDrawingStyle(engine: CanvasEngine | null): void {
  useEffect(() => {
    if (!engine) return;

    const sync = () => {
      const { color, brushSize, fontSize } = useToolStore.getState();
      engine.drawing.setStyle({ color, brushSize, fontSize });
    };

    sync();
    return useToolStore.subscribe(sync);
  }, [engine]);
}
