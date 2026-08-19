import { useEffect, useRef, useState, type PointerEvent } from "react";
import { BLOCK_COORDINATE_SIZE } from "../utils/blueprint-map";

export function useBlueprintMapViewport({
  cell,
  minX,
  minY,
  padding,
}: {
  cell: number;
  minX: number;
  minY: number;
  padding: number;
}) {
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const viewportRef = useRef<HTMLDivElement>(null);
  const hoverMarkerRef = useRef<SVGRectElement>(null);
  const hoverBlockRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const updateSize = () => {
      setViewportSize({ width: viewport.clientWidth, height: viewport.clientHeight });
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  const updateHoverBlock = (event: PointerEvent<SVGSVGElement>) => {
    const svg = event.currentTarget;
    const transform = svg.getScreenCTM();
    if (!transform) return;
    const pointer = svg.createSVGPoint();
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    const local = pointer.matrixTransform(transform.inverse());
    const blueprintX = local.x / cell + minX - padding - 0.5;
    const blueprintY = local.y / cell + minY - padding - 0.5;
    const nextBlock = {
      x: Math.floor(blueprintX / BLOCK_COORDINATE_SIZE) * BLOCK_COORDINATE_SIZE,
      y: Math.floor(blueprintY / BLOCK_COORDINATE_SIZE) * BLOCK_COORDINATE_SIZE,
    };
    const previousBlock = hoverBlockRef.current;
    if (previousBlock?.x === nextBlock.x && previousBlock?.y === nextBlock.y) return;
    hoverBlockRef.current = nextBlock;
    const marker = hoverMarkerRef.current;
    if (!marker) return;
    marker.setAttribute("x", String((nextBlock.x - minX + padding) * cell));
    marker.setAttribute("y", String((nextBlock.y - minY + padding) * cell));
    marker.setAttribute("visibility", "visible");
  };

  const clearHoverBlock = () => {
    hoverBlockRef.current = null;
    hoverMarkerRef.current?.setAttribute("visibility", "hidden");
  };

  return { viewportRef, viewportSize, hoverMarkerRef, updateHoverBlock, clearHoverBlock };
}
