import { expect, test } from "bun:test";
import {
  createSaveExplorerViewport,
  screenToWorld,
  worldToScreen,
  zoomSaveExplorerViewport,
} from "../src/index";

test("keeps viewport transforms stable while fitting, panning, and zooming", () => {
  const viewport = createSaveExplorerViewport(960, 960, 480, 320);
  expect(viewport.zoom).toBe(1 / 3);
  const mapPoint = { x: 400, y: 300 };
  const screenPoint = worldToScreen(viewport, mapPoint);
  expect(screenToWorld(viewport, screenPoint).x).toBeCloseTo(mapPoint.x);
  expect(screenToWorld(viewport, screenPoint).y).toBeCloseTo(mapPoint.y);

  const zoomed = zoomSaveExplorerViewport(viewport, 2, { x: 240, y: 160 });
  expect(worldToScreen(zoomed, screenToWorld(viewport, { x: 240, y: 160 }))).toEqual({
    x: 240,
    y: 160,
  });
  expect(zoomed.panX).toBeGreaterThan(0);
  expect(zoomed.panY).toBeGreaterThan(0);
});
