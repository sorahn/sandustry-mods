/**
 * Stable bottom-to-top order for save-explorer rendering.
 *
 * The list is intentionally broader than the currently implemented raster
 * layers. Keeping reserved layers here gives the canvas renderer and future
 * DOM/WebGL overlays one source of truth.
 */
export const SAVE_EXPLORER_LAYER_ORDER = [
  "background",
  "wall",
  "matrix",
  "structures",
  "lights",
  "authorization",
  "fog",
  "grid",
  "hoverHighlight",
] as const;

export type SaveExplorerRenderLayer = (typeof SAVE_EXPLORER_LAYER_ORDER)[number];

export function saveExplorerLayerIndex(layer: SaveExplorerRenderLayer) {
  return SAVE_EXPLORER_LAYER_ORDER.indexOf(layer);
}
