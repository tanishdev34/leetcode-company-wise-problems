"use client";

import { PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  deserializeWhiteboard,
  emptyWhiteboard,
  serializeWhiteboard,
  summarizeWhiteboard,
  type WhiteboardDocument,
  type WhiteboardPoint,
  type WhiteboardStroke,
} from "@/lib/whiteboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eraser, PenLine, RotateCcw, Save } from "lucide-react";

const STORAGE_KEY = "lc-tracker:whiteboard";
const COLORS = ["#38bdf8", "#34d399", "#f59e0b", "#f43f5e", "#a78bfa"];

function pathFromPoints(points: WhiteboardPoint[]) {
  if (points.length === 0) return "";
  const [first, ...rest] = points;
  return `M ${first.x} ${first.y} ${rest.map((point) => `L ${point.x} ${point.y}`).join(" ")}`;
}

export function WhiteboardView() {
  const [board, setBoard] = useState<WhiteboardDocument>(() => emptyWhiteboard());
  const [color, setColor] = useState(COLORS[0]);
  const [width, setWidth] = useState(4);
  const [title, setTitle] = useState("Interview scratchpad");
  const [saved, setSaved] = useState(false);
  const drawingRef = useRef<string | null>(null);

  useEffect(() => {
    setBoard(deserializeWhiteboard(window.localStorage.getItem(STORAGE_KEY)));
    setTitle(window.localStorage.getItem(`${STORAGE_KEY}:title`) ?? "Interview scratchpad");
  }, []);

  const summary = useMemo(() => summarizeWhiteboard(board), [board]);

  function save(nextBoard = board) {
    window.localStorage.setItem(STORAGE_KEY, serializeWhiteboard(nextBoard));
    window.localStorage.setItem(`${STORAGE_KEY}:title`, title);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1400);
  }

  function pointFromEvent(event: PointerEvent<SVGSVGElement>): WhiteboardPoint {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.round(event.clientX - rect.left),
      y: Math.round(event.clientY - rect.top),
    };
  }

  function startDrawing(event: PointerEvent<SVGSVGElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    const id = crypto.randomUUID();
    drawingRef.current = id;
    const stroke: WhiteboardStroke = {
      id,
      color,
      width,
      points: [pointFromEvent(event)],
    };
    setBoard((current) => ({ strokes: [...current.strokes, stroke] }));
  }

  function continueDrawing(event: PointerEvent<SVGSVGElement>) {
    const id = drawingRef.current;
    if (!id) return;
    const point = pointFromEvent(event);
    setBoard((current) => ({
      strokes: current.strokes.map((stroke) =>
        stroke.id === id ? { ...stroke, points: [...stroke.points, point] } : stroke,
      ),
    }));
  }

  function stopDrawing() {
    drawingRef.current = null;
  }

  function undo() {
    setBoard((current) => ({ strokes: current.strokes.slice(0, -1) }));
  }

  function clear() {
    const next = emptyWhiteboard();
    setBoard(next);
    save(next);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Whiteboard</h1>
          <p className="text-sm text-muted-foreground">
            Sketch recursion trees, pointer movement, graph traversals, and system-design shapes.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={undo} disabled={board.strokes.length === 0}>
            <RotateCcw className="mr-1.5 h-4 w-4" />
            Undo
          </Button>
          <Button variant="outline" size="sm" onClick={clear}>
            <Eraser className="mr-1.5 h-4 w-4" />
            Clear
          </Button>
          <Button size="sm" onClick={() => save()}>
            <Save className="mr-1.5 h-4 w-4" />
            {saved ? "Saved" : "Save"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-3">
            <PenLine className="h-5 w-5 text-primary" />
            <Input value={title} onChange={(event) => setTitle(event.target.value)} className="max-w-sm" />
          </CardTitle>
          <CardDescription>
            {summary.strokeCount} strokes, {summary.pointCount} points, {summary.colorCount} colors
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-2">
              {COLORS.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  aria-label={`Use ${swatch}`}
                  onClick={() => setColor(swatch)}
                  className="h-8 w-8 border"
                  style={{
                    backgroundColor: swatch,
                    outline: color === swatch ? "2px solid var(--foreground)" : "none",
                  }}
                />
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm">
              Width
              <input
                type="range"
                min={2}
                max={12}
                value={width}
                onChange={(event) => setWidth(Number(event.target.value))}
              />
              <span className="w-6 text-muted-foreground">{width}</span>
            </label>
          </div>

          <svg
            role="img"
            aria-label="Whiteboard drawing surface"
            className="h-[620px] w-full touch-none border bg-background"
            onPointerDown={startDrawing}
            onPointerMove={continueDrawing}
            onPointerUp={stopDrawing}
            onPointerCancel={stopDrawing}
          >
            <defs>
              <pattern id="whiteboard-grid" width="32" height="32" patternUnits="userSpaceOnUse">
                <path d="M 32 0 L 0 0 0 32" fill="none" stroke="currentColor" strokeOpacity="0.08" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#whiteboard-grid)" />
            {board.strokes.map((stroke) => (
              <path
                key={stroke.id}
                d={pathFromPoints(stroke.points)}
                fill="none"
                stroke={stroke.color}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={stroke.width}
              />
            ))}
          </svg>
        </CardContent>
      </Card>
    </div>
  );
}
