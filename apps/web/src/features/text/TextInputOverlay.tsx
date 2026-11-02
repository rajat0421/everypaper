import { useEffect, useRef, useState } from "react";
import { LIMITS, tileIdOf, worldToTile } from "@everypaper/shared";
import { useEngineContext } from "../../app/EngineContext";
import { useTextEditorStore } from "../../stores/textEditorStore";
import { PRESET_COLORS, useToolStore } from "../../stores/toolStore";
import { socketService } from "../../services/socket";
import { offlineDb } from "../../lib/offlineDb";

function genId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Floating HTML input that appears where the user tapped with the text tool.
 * Commits on blur/Enter (emits text:create + optimistic render), cancels on Escape.
 */
export function TextInputOverlay() {
  const { engine, sessionId } = useEngineContext();
  const open = useTextEditorStore((s) => s.open);
  const screenX = useTextEditorStore((s) => s.screenX);
  const screenY = useTextEditorStore((s) => s.screenY);
  const worldX = useTextEditorStore((s) => s.worldX);
  const worldY = useTextEditorStore((s) => s.worldY);
  const close = useTextEditorStore((s) => s.close);

  const color = useToolStore((s) => s.color);
  const fontSize = useToolStore((s) => s.fontSize);
  const setColor = useToolStore((s) => s.setColor);
  const setFontSize = useToolStore((s) => s.setFontSize);

  const [content, setContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const committedRef = useRef(false);

  useEffect(() => {
    if (open) {
      setContent("");
      committedRef.current = false;
      const id = window.setTimeout(() => textareaRef.current?.focus(), 0);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [open]);

  if (!open) return null;

  const commit = () => {
    if (committedRef.current) return;
    committedRef.current = true;
    const trimmed = content.trim();
    if (trimmed.length === 0 || !engine) {
      close();
      return;
    }
    const clientTextId = genId();
    const text = trimmed.slice(0, LIMITS.MAX_TEXT_LENGTH);

    engine.applyRemoteText(
      {
        id: clientTextId,
        sessionId,
        x: worldX,
        y: worldY,
        content: text,
        color,
        fontSize,
        createdAt: Date.now(),
        pending: true
      },
      tileIdOf(worldToTile(worldX, worldY))
    );

    const payload = { clientTextId, x: worldX, y: worldY, content: text, color, fontSize };
    socketService.textCreate(payload);
    void offlineDb.addPendingOp({
      id: clientTextId,
      kind: "textCreate",
      payload,
      createdAt: Date.now()
    });

    close();
  };

  const cancel = () => {
    committedRef.current = true;
    close();
  };

  return (
    <div
      className="absolute z-30 flex min-w-[180px] max-w-[260px] -translate-x-1 -translate-y-1 flex-col gap-2 rounded-xl border border-line bg-white p-2 shadow-md"
      style={{ left: screenX, top: screenY }}
    >
      <textarea
        ref={textareaRef}
        value={content}
        maxLength={LIMITS.MAX_TEXT_LENGTH}
        onChange={(e) => setContent(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            commit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            cancel();
          }
        }}
        rows={2}
        placeholder="Type something…"
        className="w-full resize-none rounded-md border border-line p-1.5 text-sm outline-none focus:border-accent"
        style={{ color, fontSize: Math.min(fontSize, 20) }}
      />
      <div className="flex items-center gap-1.5">
        {PRESET_COLORS.map((preset) => (
          <button
            key={preset}
            type="button"
            aria-label={`Color ${preset}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setColor(preset)}
            className={`h-5 w-5 shrink-0 rounded-full border-2 ${
              color === preset ? "border-accent" : "border-transparent"
            }`}
            style={{ backgroundColor: preset }}
          />
        ))}
        <input
          type="range"
          aria-label="Font size"
          min={LIMITS.MIN_FONT_SIZE}
          max={LIMITS.MAX_FONT_SIZE}
          value={fontSize}
          onMouseDown={(e) => e.preventDefault()}
          onChange={(e) => setFontSize(Number(e.target.value))}
          className="ml-1 w-16 accent-accent"
        />
      </div>
    </div>
  );
}
