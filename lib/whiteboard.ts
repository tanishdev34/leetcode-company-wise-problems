export interface WhiteboardPoint {
  x: number;
  y: number;
}

export interface WhiteboardStroke {
  id: string;
  color: string;
  width: number;
  points: WhiteboardPoint[];
}

export interface WhiteboardDocument {
  strokes: WhiteboardStroke[];
}

export function emptyWhiteboard(): WhiteboardDocument {
  return { strokes: [] };
}

export function serializeWhiteboard(board: WhiteboardDocument): string {
  return JSON.stringify({
    strokes: board.strokes.filter((stroke) => stroke.points.length > 0),
  });
}

export function deserializeWhiteboard(value: string | null | undefined): WhiteboardDocument {
  if (!value) return emptyWhiteboard();
  try {
    const parsed = JSON.parse(value) as Partial<WhiteboardDocument>;
    if (!Array.isArray(parsed.strokes)) return emptyWhiteboard();
    return {
      strokes: parsed.strokes
        .filter((stroke) => stroke && Array.isArray(stroke.points))
        .map((stroke) => ({
          id: String(stroke.id),
          color: typeof stroke.color === "string" ? stroke.color : "#38bdf8",
          width: typeof stroke.width === "number" ? stroke.width : 3,
          points: stroke.points
            .filter((point) => typeof point?.x === "number" && typeof point?.y === "number")
            .map((point) => ({ x: point.x, y: point.y })),
        })),
    };
  } catch {
    return emptyWhiteboard();
  }
}

export function summarizeWhiteboard(board: WhiteboardDocument) {
  const colors = new Set(board.strokes.map((stroke) => stroke.color));
  return {
    strokeCount: board.strokes.length,
    pointCount: board.strokes.reduce((sum, stroke) => sum + stroke.points.length, 0),
    colorCount: colors.size,
  };
}
