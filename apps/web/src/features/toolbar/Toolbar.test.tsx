import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { EngineContext } from "../../app/EngineContext";
import { useToolStore } from "../../stores/toolStore";
import { Toolbar } from "./Toolbar";

function renderToolbar() {
  return render(
    <EngineContext.Provider value={{ engine: null, sessionId: "test-session" }}>
      <Toolbar />
    </EngineContext.Provider>
  );
}

describe("Toolbar", () => {
  beforeEach(() => {
    useToolStore.setState({ tool: "pencil", color: "#1a1a1a", brushSize: 4, fontSize: 24 });
  });

  it("switches the active tool in the store when a tool button is clicked", async () => {
    const user = userEvent.setup();
    renderToolbar();

    expect(screen.getByRole("button", { name: "Pencil" })).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: "Eraser" }));

    expect(useToolStore.getState().tool).toBe("eraser");
    expect(screen.getByRole("button", { name: "Eraser" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Pencil" })).toHaveAttribute("aria-pressed", "false");
  });

  it("updates the color store when a preset swatch is clicked", async () => {
    const user = userEvent.setup();
    renderToolbar();

    await user.click(screen.getByRole("button", { name: "Color #2563eb" }));

    expect(useToolStore.getState().color).toBe("#2563eb");
  });

  it("updates the brush size store when the slider changes", () => {
    renderToolbar();
    const slider = screen.getByRole("slider", { name: "Brush size" });

    fireEvent.change(slider, { target: { value: "20" } });

    expect(useToolStore.getState().brushSize).toBe(20);
  });
});
