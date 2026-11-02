import { create } from "zustand";
import type { Tool } from "@everypaper/canvas-core";
import { LIMITS } from "@everypaper/shared";

export const PRESET_COLORS = [
  "#1a1a1a",
  "#e11d48",
  "#2563eb",
  "#16a34a",
  "#f59e0b",
  "#7c3aed"
] as const;

interface ToolState {
  tool: Tool;
  previousTool: Tool;
  color: string;
  brushSize: number;
  fontSize: number;
  setTool: (tool: Tool) => void;
  setColor: (color: string) => void;
  setBrushSize: (size: number) => void;
  setFontSize: (size: number) => void;
  beginTempPan: () => void;
  endTempPan: () => void;
}

export const useToolStore = create<ToolState>((set, get) => ({
  tool: "pencil",
  previousTool: "pencil",
  color: PRESET_COLORS[0],
  brushSize: 4,
  fontSize: 24,

  setTool: (tool) => set({ tool, previousTool: tool === "pan" ? get().previousTool : tool }),
  setColor: (color) => set({ color }),
  setBrushSize: (size) =>
    set({ brushSize: Math.min(LIMITS.MAX_BRUSH_SIZE, Math.max(LIMITS.MIN_BRUSH_SIZE, size)) }),
  setFontSize: (size) =>
    set({ fontSize: Math.min(LIMITS.MAX_FONT_SIZE, Math.max(LIMITS.MIN_FONT_SIZE, size)) }),

  beginTempPan: () =>
    set((state) => (state.tool === "pan" ? state : { previousTool: state.tool, tool: "pan" })),
  endTempPan: () => set((state) => ({ tool: state.previousTool }))
}));
