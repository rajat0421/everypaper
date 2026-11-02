import { useCallback } from "react";
import type { Tool } from "@everypaper/canvas-core";
import { LIMITS } from "@everypaper/shared";
import { useEngineContext } from "../../app/EngineContext";
import { PRESET_COLORS, useToolStore } from "../../stores/toolStore";
import { useToastStore } from "../../stores/toastStore";
import { buildShareUrl } from "../../lib/shareLink";

interface ToolButtonProps {
  label: string;
  shortcut: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function ToolButton({ label, shortcut, active, onClick, children }: ToolButtonProps) {
  return (
    <button
      type="button"
      title={`${label} (${shortcut})`}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-base transition-colors ${
        active ? "bg-accent text-white" : "text-ink/80 hover:bg-black/5"
      }`}
    >
      {children}
    </button>
  );
}

export function Toolbar() {
  const { engine } = useEngineContext();
  const tool = useToolStore((s) => s.tool);
  const color = useToolStore((s) => s.color);
  const brushSize = useToolStore((s) => s.brushSize);
  const setTool = useToolStore((s) => s.setTool);
  const setColor = useToolStore((s) => s.setColor);
  const setBrushSize = useToolStore((s) => s.setBrushSize);
  const showToast = useToastStore((s) => s.show);

  const selectTool = useCallback(
    (next: Tool) => {
      setTool(next);
      engine?.setTool(next);
    },
    [engine, setTool]
  );

  const handleUndo = useCallback(() => engine?.drawing.undo(), [engine]);
  const handleRedo = useCallback(() => engine?.drawing.redo(), [engine]);

  const handleZoom = useCallback(
    (factor: number) => {
      if (!engine) return;
      const screen = engine.viewport.getCoordinateSystem().getScreen();
      engine.viewport.zoomAtScreenPoint(screen.width / 2, screen.height / 2, factor);
    },
    [engine]
  );

  const handleResetView = useCallback(() => engine?.resetView(), [engine]);

  const handleShare = useCallback(async () => {
    if (!engine) return;
    const camera = engine.viewport.getCamera();
    const url = buildShareUrl(window.location.href, camera);
    try {
      await navigator.clipboard.writeText(url);
      showToast("Link copied to clipboard");
    } catch {
      showToast(url);
    }
  }, [engine, showToast]);

  return (
    <div
      className="pointer-events-auto flex max-w-[94vw] items-center gap-1 overflow-x-auto rounded-2xl border border-line bg-white/90 px-2 py-2 shadow-sm backdrop-blur no-scrollbar"
      role="toolbar"
      aria-label="Drawing tools"
    >
      <ToolButton label="Pencil" shortcut="P" active={tool === "pencil"} onClick={() => selectTool("pencil")}>
        ✏️
      </ToolButton>
      <ToolButton label="Eraser" shortcut="E" active={tool === "eraser"} onClick={() => selectTool("eraser")}>
        🧽
      </ToolButton>
      <ToolButton label="Text" shortcut="T" active={tool === "text"} onClick={() => selectTool("text")}>
        T
      </ToolButton>

      <div className="mx-1 h-7 w-px shrink-0 bg-line" />

      <div className="flex shrink-0 items-center gap-1 px-1">
        {PRESET_COLORS.map((preset) => (
          <button
            key={preset}
            type="button"
            aria-label={`Color ${preset}`}
            aria-pressed={color === preset}
            onClick={() => setColor(preset)}
            className={`h-6 w-6 shrink-0 rounded-full border-2 ${
              color === preset ? "border-accent" : "border-transparent"
            }`}
            style={{ backgroundColor: preset }}
          />
        ))}
        <input
          type="color"
          aria-label="Custom color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="h-7 w-7 shrink-0 cursor-pointer rounded border border-line bg-transparent p-0"
        />
      </div>

      <div className="mx-1 h-7 w-px shrink-0 bg-line" />

      <input
        type="range"
        aria-label="Brush size"
        min={LIMITS.MIN_BRUSH_SIZE}
        max={LIMITS.MAX_BRUSH_SIZE}
        value={brushSize}
        onChange={(e) => setBrushSize(Number(e.target.value))}
        className="w-20 shrink-0 accent-accent"
      />

      <div className="mx-1 h-7 w-px shrink-0 bg-line" />

      <ToolButton label="Undo" shortcut="Ctrl+Z" active={false} onClick={handleUndo}>
        ↶
      </ToolButton>
      <ToolButton label="Redo" shortcut="Ctrl+Shift+Z" active={false} onClick={handleRedo}>
        ↷
      </ToolButton>

      <div className="mx-1 h-7 w-px shrink-0 bg-line" />

      <ToolButton label="Zoom out" shortcut="-" active={false} onClick={() => handleZoom(1 / 1.2)}>
        −
      </ToolButton>
      <ToolButton label="Zoom in" shortcut="+" active={false} onClick={() => handleZoom(1.2)}>
        +
      </ToolButton>
      <ToolButton label="Reset view" shortcut="0" active={false} onClick={handleResetView}>
        ⌂
      </ToolButton>

      <div className="mx-1 h-7 w-px shrink-0 bg-line" />

      <ToolButton label="Share" shortcut="" active={false} onClick={() => void handleShare()}>
        🔗
      </ToolButton>
    </div>
  );
}
