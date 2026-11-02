import { describe, expect, it } from "vitest";
import { mapKeyToAction } from "./keyboardShortcuts";

function keydown(key: string, opts: Partial<{ ctrlKey: boolean; metaKey: boolean; shiftKey: boolean; repeat: boolean }> = {}) {
  return mapKeyToAction({ key, type: "keydown", ctrlKey: false, metaKey: false, shiftKey: false, ...opts });
}

describe("mapKeyToAction", () => {
  it("maps tool shortcuts", () => {
    expect(keydown("p")).toBe("tool:pencil");
    expect(keydown("e")).toBe("tool:eraser");
    expect(keydown("t")).toBe("tool:text");
  });

  it("maps undo/redo with ctrl and cmd", () => {
    expect(keydown("z", { ctrlKey: true })).toBe("undo");
    expect(keydown("z", { metaKey: true })).toBe("undo");
    expect(keydown("z", { metaKey: true, shiftKey: true })).toBe("redo");
    expect(keydown("y", { ctrlKey: true })).toBe("redo");
  });

  it("maps zoom shortcuts", () => {
    expect(keydown("+")).toBe("zoom:in");
    expect(keydown("=")).toBe("zoom:in");
    expect(keydown("-")).toBe("zoom:out");
    expect(keydown("0")).toBe("zoom:reset");
  });

  it("maps space to a temporary pan start/end", () => {
    expect(keydown(" ")).toBe("pan:start");
    expect(mapKeyToAction({ key: " ", type: "keyup", ctrlKey: false, metaKey: false, shiftKey: false })).toBe(
      "pan:end"
    );
  });

  it("ignores repeated space keydowns (no retrigger while held)", () => {
    expect(keydown(" ", { repeat: true })).toBeNull();
  });

  it("does not treat a modified letter key as a tool shortcut", () => {
    expect(keydown("p", { ctrlKey: true })).toBeNull();
  });

  it("returns null for unmapped keys", () => {
    expect(keydown("q")).toBeNull();
  });
});
