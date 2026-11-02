import { create } from "zustand";

interface TextEditorState {
  open: boolean;
  screenX: number;
  screenY: number;
  worldX: number;
  worldY: number;
  openAt: (screenX: number, screenY: number, worldX: number, worldY: number) => void;
  close: () => void;
}

/** Holds the floating text-entry overlay's position/visibility; the engine itself never renders text input. */
export const useTextEditorStore = create<TextEditorState>((set) => ({
  open: false,
  screenX: 0,
  screenY: 0,
  worldX: 0,
  worldY: 0,
  openAt: (screenX, screenY, worldX, worldY) => set({ open: true, screenX, screenY, worldX, worldY }),
  close: () => set({ open: false })
}));
