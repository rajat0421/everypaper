import type { StrokeDto, TextDto } from "@everypaper/shared";
import type { Stroke, TextItem } from "@everypaper/canvas-core";

/** Converts a wire StrokeDto (ISO date string) into the canvas-core Stroke shape (numeric timestamp). */
export function strokeDtoToStroke(dto: StrokeDto): Stroke {
  return {
    id: dto.id,
    sessionId: dto.sessionId,
    points: dto.points,
    color: dto.color,
    brushSize: dto.brushSize,
    isEraser: dto.isEraser,
    bounds: dto.bounds,
    tileIds: dto.tileIds,
    createdAt: Date.parse(dto.createdAt) || Date.now()
  };
}

export function textDtoToTextItem(dto: TextDto): TextItem {
  return {
    id: dto.id,
    sessionId: dto.sessionId,
    x: dto.x,
    y: dto.y,
    content: dto.content,
    color: dto.color,
    fontSize: dto.fontSize,
    createdAt: Date.parse(dto.createdAt) || Date.now()
  };
}
