import { describe, expect, it } from "vitest";
import { deserializeWhiteboard, summarizeWhiteboard, serializeWhiteboard } from "@/lib/whiteboard";

describe("whiteboard helpers", () => {
  it("serializes, deserializes, and summarizes strokes", () => {
    const serialized = serializeWhiteboard({
      strokes: [
        {
          id: "s1",
          color: "#38bdf8",
          width: 4,
          points: [
            { x: 0, y: 0 },
            { x: 10, y: 10 },
          ],
        },
      ],
    });

    const board = deserializeWhiteboard(serialized);
    expect(board.strokes).toHaveLength(1);
    expect(summarizeWhiteboard(board)).toEqual({
      strokeCount: 1,
      pointCount: 2,
      colorCount: 1,
    });
  });

  it("returns an empty board for invalid JSON", () => {
    expect(deserializeWhiteboard("{nope").strokes).toEqual([]);
  });
});
