import type { StrokeDto, TextDto } from "@everypaper/shared";
import { getActiveStrokesForTile, toStrokeDto } from "../strokes/stroke.service.js";
import { getActiveTextsForTile, toTextDto } from "../texts/text.service.js";

export interface TileSnapshot {
  tileId: string;
  strokes: StrokeDto[];
  texts: TextDto[];
}

export async function getTileSnapshot(tileId: string): Promise<TileSnapshot> {
  const [strokes, texts] = await Promise.all([
    getActiveStrokesForTile(tileId),
    getActiveTextsForTile(tileId)
  ]);
  return {
    tileId,
    strokes: strokes.map(toStrokeDto),
    texts: texts.map(toTextDto)
  };
}

export async function getTileSnapshots(tileIds: string[]): Promise<TileSnapshot[]> {
  return Promise.all(tileIds.map((id) => getTileSnapshot(id)));
}
