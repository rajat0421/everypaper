import type { CoordinateSystem } from "./coordinateSystem.js";
import type { Stroke, TextItem } from "./types.js";

export class StrokeRenderer {
  draw(ctx: CanvasRenderingContext2D, coords: CoordinateSystem, stroke: Stroke): void {
    if (stroke.points.length === 0) return;
    const { zoom } = coords.getCamera();
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (stroke.isEraser) {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = stroke.color;
    }
    ctx.lineWidth = Math.max(0.5, stroke.brushSize * zoom);

    const firstPoint = stroke.points[0]!;
    if (stroke.points.length === 1) {
      const p = coords.worldToScreen(firstPoint.x, firstPoint.y);
      ctx.beginPath();
      ctx.arc(p.x, p.y, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fillStyle = ctx.strokeStyle as string;
      ctx.fill();
      ctx.restore();
      return;
    }

    ctx.beginPath();
    const first = coords.worldToScreen(firstPoint.x, firstPoint.y);
    ctx.moveTo(first.x, first.y);
    for (let i = 1; i < stroke.points.length; i++) {
      const point = stroke.points[i]!;
      const p = coords.worldToScreen(point.x, point.y);
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.restore();
  }
}

export class TextRenderer {
  draw(ctx: CanvasRenderingContext2D, coords: CoordinateSystem, text: TextItem): void {
    const { zoom } = coords.getCamera();
    const screenPos = coords.worldToScreen(text.x, text.y);
    const fontPx = Math.max(1, text.fontSize * zoom);
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.font = `${fontPx}px "Inter", system-ui, sans-serif`;
    ctx.fillStyle = text.color;
    ctx.textBaseline = "top";
    // content is rendered via canvas fillText only — never innerHTML — so no script injection is possible
    ctx.fillText(text.content, screenPos.x, screenPos.y);
    ctx.restore();
  }
}

export interface RenderableTileSource {
  (tileId: string): { strokes: Stroke[]; texts: TextItem[] } | undefined;
}

export class Renderer {
  private strokeRenderer = new StrokeRenderer();
  private textRenderer = new TextRenderer();

  render(
    ctx: CanvasRenderingContext2D,
    coords: CoordinateSystem,
    tileIds: string[],
    getTile: RenderableTileSource,
    extraStrokes: Stroke[] = [],
    extraTexts: TextItem[] = [],
    // Must match the page's actual background color behind the canvas: the
    // eraser tool uses destination-out, which punches fully transparent holes
    // through this fill, revealing whatever is behind the canvas element. If
    // this doesn't match that background exactly, erased areas visibly differ
    // in color from the rest of the "blank" canvas.
    backgroundColor = "#ffffff"
  ): void {
    // Clear in the *current* (device-pixel-ratio-scaled) transform, which the
    // engine sets up once on resize() to map logical/CSS pixel coordinates to
    // the canvas's real device-pixel backing store. Resetting to the identity
    // transform here and filling `screen.width x screen.height` (logical CSS
    // pixels) only clears a fraction of the actual backing store on any
    // devicePixelRatio > 1 display, leaving stale pixels from previous frames
    // visible outside that region — most noticeable as "ghosting" while
    // zooming/panning, since every frame redraws rapidly.
    const screen = coords.getScreen();
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, screen.width, screen.height);

    const drawnStrokeIds = new Set<string>();
    for (const tileId of tileIds) {
      const tile = getTile(tileId);
      if (!tile) continue;
      for (const stroke of tile.strokes) {
        if (drawnStrokeIds.has(stroke.id)) continue;
        drawnStrokeIds.add(stroke.id);
        this.strokeRenderer.draw(ctx, coords, stroke);
      }
      for (const text of tile.texts) {
        this.textRenderer.draw(ctx, coords, text);
      }
    }
    for (const stroke of extraStrokes) {
      if (drawnStrokeIds.has(stroke.id)) continue;
      this.strokeRenderer.draw(ctx, coords, stroke);
    }
    for (const text of extraTexts) {
      this.textRenderer.draw(ctx, coords, text);
    }
  }
}
