import { useEffect } from "react";
import type { CanvasEngine } from "@everypaper/canvas-core";
import { mapKeyToAction } from "../lib/keyboardShortcuts";
import { useToolStore } from "../stores/toolStore";

const ZOOM_STEP = 1.2;

/** Wires global keyboard shortcuts to the engine + tool store. Ignores keystrokes while an input/textarea has focus. */
export function useKeyboardShortcuts(engine: CanvasEngine | null): void {
  useEffect(() => {
    if (!engine) return;

    const isTypingTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false;
      return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      const action = mapKeyToAction({
        key: event.key,
        type: "keydown",
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey,
        repeat: event.repeat
      });
      if (!action) return;

      switch (action) {
        case "tool:pencil":
          useToolStore.getState().setTool("pencil");
          engine.setTool("pencil");
          break;
        case "tool:eraser":
          useToolStore.getState().setTool("eraser");
          engine.setTool("eraser");
          break;
        case "tool:text":
          useToolStore.getState().setTool("text");
          engine.setTool("text");
          break;
        case "undo":
          event.preventDefault();
          engine.drawing.undo();
          break;
        case "redo":
          event.preventDefault();
          engine.drawing.redo();
          break;
        case "zoom:in": {
          const camera = engine.viewport.getCamera();
          const screen = engine.viewport.getCoordinateSystem().getScreen();
          engine.viewport.zoomAtScreenPoint(screen.width / 2, screen.height / 2, ZOOM_STEP);
          void camera;
          break;
        }
        case "zoom:out": {
          const screen = engine.viewport.getCoordinateSystem().getScreen();
          engine.viewport.zoomAtScreenPoint(screen.width / 2, screen.height / 2, 1 / ZOOM_STEP);
          break;
        }
        case "zoom:reset":
          engine.resetView();
          break;
        case "pan:start":
          event.preventDefault();
          useToolStore.getState().beginTempPan();
          engine.setTool("pan");
          break;
        case "pan:end":
          useToolStore.getState().endTempPan();
          engine.setTool(useToolStore.getState().tool);
          break;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      const action = mapKeyToAction({
        key: event.key,
        type: "keyup",
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey
      });
      if (action === "pan:end") {
        useToolStore.getState().endTempPan();
        engine.setTool(useToolStore.getState().tool);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [engine]);
}
