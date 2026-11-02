export type ShortcutAction =
  | "tool:pencil"
  | "tool:eraser"
  | "tool:text"
  | "undo"
  | "redo"
  | "zoom:in"
  | "zoom:out"
  | "zoom:reset"
  | "pan:start"
  | "pan:end";

export interface KeyEventLike {
  key: string;
  type: "keydown" | "keyup";
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  repeat?: boolean;
}

/** Pure mapping from a keyboard event shape to a shortcut action, framework-independent so it's easy to unit test. */
export function mapKeyToAction(e: KeyEventLike): ShortcutAction | null {
  const mod = e.ctrlKey || e.metaKey;

  if (e.type === "keyup") {
    if (e.key === " ") return "pan:end";
    return null;
  }

  // keydown
  if (e.key === " " && !e.repeat) return "pan:start";

  if (mod && (e.key === "z" || e.key === "Z")) {
    return e.shiftKey ? "redo" : "undo";
  }
  if (mod && (e.key === "y" || e.key === "Y")) return "redo";

  if (!mod) {
    switch (e.key.toLowerCase()) {
      case "p":
        return "tool:pencil";
      case "e":
        return "tool:eraser";
      case "t":
        return "tool:text";
      case "+":
      case "=":
        return "zoom:in";
      case "-":
      case "_":
        return "zoom:out";
      case "0":
        return "zoom:reset";
      default:
        return null;
    }
  }

  return null;
}
