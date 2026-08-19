import {
  createBlueprintRenderModel,
  renderAnchorEdge,
  renderAnchorOffsetCells,
  renderPixelScale,
  renderScaleFactor,
  renderScaleMode,
  structureLabel,
  tileColor,
  wrapLabel,
  type BlueprintRenderModel,
  type BlueprintRenderOptions,
} from "./render-model";
import { foundationOutlinePath } from "./prepare";

export type BlueprintSvgRenderOptions = BlueprintRenderOptions & {
  assetBaseUrl?: string;
  assetUrl?: (path: string) => string;
  includeBackground?: boolean;
  showGrid?: boolean;
  showCustomShapes?: boolean;
  showNames?: boolean;
  showFoundationOutlines?: boolean;
  showSignalLinks?: boolean;
};

export type BlueprintSvgRenderResult = {
  svg: string;
  model: BlueprintRenderModel;
};

function escapeXml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character]!,
  );
}

function number(value: number) {
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
}

function point(model: BlueprintRenderModel, x: number, y: number) {
  return {
    x: (x - model.minX + model.padding + 0.5) * model.cell,
    y: (y - model.minY + model.padding + 0.5) * model.cell,
  };
}

function renderGrid(model: BlueprintRenderModel) {
  const { cell, width, height } = model;
  return `<defs>
  <pattern id="blueprint-block-grid" x="${number((model.padding - model.minX) * cell)}" y="${number((model.padding - model.minY) * cell)}" width="${number(cell)}" height="${number(cell)}" patternUnits="userSpaceOnUse"><path d="M ${number(cell)} 0 L 0 0 0 ${number(cell)} M ${number(cell)} 0 L ${number(cell)} ${number(cell)} M 0 ${number(cell)} L ${number(cell)} ${number(cell)}" fill="none" stroke="#718096" stroke-width="1"/></pattern>
  <pattern id="blueprint-cell-grid" x="${number((model.padding - model.minX) * cell)}" y="${number((model.padding - model.minY) * cell)}" width="${number(cell * 4)}" height="${number(cell * 4)}" patternUnits="userSpaceOnUse"><path d="M ${number(cell * 4)} 0 L 0 0 0 ${number(cell * 4)} M ${number(cell * 4)} 0 L ${number(cell * 4)} ${number(cell * 4)} M 0 ${number(cell * 4)} L ${number(cell * 4)} ${number(cell * 4)}" fill="none" stroke="#17202c" stroke-width="1.25"/></pattern>
  </defs>${`<rect width="${number(width)}" height="${number(height)}" fill="#33a8ff"/>`}`;
}

function renderSignalLinks(model: BlueprintRenderModel) {
  return model.preparedBlueprint.preparedSignalLinks
    .map((link) => {
      const wire = link.path;
      const from = point(model, wire.from.x, wire.from.y);
      const to = point(model, wire.to.x, wire.to.y);
      const d =
        wire.kind === "line"
          ? `M ${number(from.x)} ${number(from.y)} L ${number(to.x)} ${number(to.y)}`
          : (() => {
              const control1 = point(model, wire.control1.x, wire.control1.y);
              const control2 = point(model, wire.control2.x, wire.control2.y);
              return `M ${number(from.x)} ${number(from.y)} C ${number(control1.x)} ${number(control1.y)} ${number(control2.x)} ${number(control2.y)} ${number(to.x)} ${number(to.y)}`;
            })();
      return `<path d="${d}" stroke="${link.on ? "#00ff99" : "#ff3333"}" fill="none" stroke-linecap="round" stroke-width="3" opacity=".7"/>`;
    })
    .join("");
}

function renderShapeRects(
  shape: number[][],
  left: number,
  top: number,
  cell: number,
  fill: string,
) {
  return shape
    .flatMap((row, rowIndex) =>
      row.map((value, columnIndex) =>
        value === 0
          ? ""
          : `<rect x="${number(left + columnIndex * cell)}" y="${number(top + rowIndex * cell)}" width="${number(cell)}" height="${number(cell)}" fill="${fill}"/>`,
      ),
    )
    .join("");
}

function renderStructure(
  model: BlueprintRenderModel,
  index: number,
  options: BlueprintSvgRenderOptions,
) {
  const prepared = model.preparedBlueprint.preparedStructures[index];
  const entry = options.catalog?.get(prepared.structure.type);
  const shape =
    prepared.shape ??
    Array.from({ length: prepared.footprint.height }, () =>
      Array.from({ length: prepared.footprint.width }, () => 1),
    );
  const isCustomShape =
    prepared.customShape !== undefined || (prepared.shape !== undefined && !prepared.sprite);
  const left = (prepared.structure.x - model.minX + model.padding) * model.cell;
  const top = (prepared.topY - model.minY + model.padding) * model.cell;
  const tileWidth = prepared.footprint.width * model.cell;
  const tileHeight = prepared.footprint.height * model.cell;
  const label = entry?.name ?? structureLabel(prepared.structure.type);
  const labelFontSize = Math.max(8, model.cell * 0.9);
  const lines = wrapLabel(label, Math.max(3, Math.floor(tileWidth / (labelFontSize * 0.6))));
  const labelY = top + tileHeight / 2 - ((lines.length - 1) * labelFontSize * 1.15) / 2 + 12;
  let output = `<g data-structure-index="${index}">`;
  const customAsset = isCustomShape ? options.catalog?.get(11)?.renderAsset : undefined;
  const asset = prepared.sprite?.asset ?? customAsset;
  const usesFallbackAsset = asset !== undefined && prepared.sprite?.asset === undefined;
  if (!asset?.path) {
    output += `<rect x="${number(left)}" y="${number(top)}" width="${number(tileWidth)}" height="${number(tileHeight)}" rx="5" fill="${isCustomShape ? "transparent" : tileColor(prepared.structure.type)}" stroke="${isCustomShape ? "none" : "#8491a3"}" stroke-width="1.5"/>`;
  }
  if (isCustomShape && options.showCustomShapes) {
    output += renderShapeRects(shape, left, top, model.cell, "#a47a45");
  }
  if (asset?.path) {
    const sourceWidth = asset.sourceSize?.width ?? asset.frame?.width ?? 1;
    const sourceHeight = asset.sourceSize?.height ?? asset.frame?.height ?? 1;
    const frameWidth = asset.frame?.width ?? asset.renderSize?.width ?? sourceWidth;
    const frameHeight = asset.frame?.height ?? asset.renderSize?.height ?? sourceHeight;
    const frameIndex = prepared.sprite?.frameIndex ?? asset.frameIndex ?? 0;
    const visualWidth =
      asset.renderSize || (asset.frame && asset.scale !== "cell")
        ? frameWidth * renderPixelScale(model.cell)
        : renderScaleMode(asset.scale) === "cell"
          ? model.cell * renderScaleFactor(asset.scale)
          : tileWidth;
    const visualHeight =
      asset.renderSize || (asset.frame && asset.scale !== "cell")
        ? frameHeight * renderPixelScale(model.cell)
        : asset.frame
          ? visualWidth * ((asset.sourceCrop?.height ?? sourceHeight) / frameWidth)
          : tileHeight;
    const sourceScale = visualWidth / frameWidth;
    const imageHeight = visualWidth * (sourceHeight / frameWidth);
    const offsetX = (asset.renderOffset?.x ?? 0) + (asset.offset?.x ?? 0);
    const offsetY = (asset.renderOffset?.y ?? 0) + (asset.offset?.y ?? 0);
    const imageX = left + offsetX * renderPixelScale(model.cell);
    const imageY =
      renderAnchorEdge(asset.anchor) === "bottom"
        ? top +
          tileHeight -
          visualHeight +
          renderAnchorOffsetCells(asset.anchor) * model.cell +
          offsetY * renderPixelScale(model.cell)
        : top + offsetY * renderPixelScale(model.cell);
    const href = options.assetUrl
      ? options.assetUrl(asset.path)
      : `${options.assetBaseUrl ?? ""}${asset.path}`;
    const transform = prepared.sprite?.rotation
      ? ` transform="rotate(${number(prepared.sprite.rotation)} ${number(left + tileWidth / 2)} ${number(top + tileHeight / 2)})"`
      : "";
    if (usesFallbackAsset && isCustomShape) {
      output += `<defs><mask id="custom-shape-mask-${index}" maskUnits="userSpaceOnUse" x="${number(left)}" y="${number(top)}" width="${number(tileWidth)}" height="${number(tileHeight)}"><rect x="${number(left)}" y="${number(top)}" width="${number(tileWidth)}" height="${number(tileHeight)}" fill="black"/>${renderShapeRects(shape, left, top, model.cell, "white")}</mask></defs>`;
    }
    output += `<image href="${escapeXml(href)}" x="${number(imageX - frameIndex * visualWidth)}" y="${number(imageY - (asset.sourceCrop?.y ?? 0) * sourceScale)}" width="${number(visualWidth * (sourceWidth / frameWidth))}" height="${number(imageHeight)}" preserveAspectRatio="none"${(asset.clip ?? sourceWidth > frameWidth) ? ` clip-path="url(#asset-clip-${index})"` : ""}${usesFallbackAsset && isCustomShape ? ` mask="url(#custom-shape-mask-${index})"` : ""}${transform} style="image-rendering:pixelated"/>`;
    if (asset.clip ?? sourceWidth > frameWidth) {
      output = `<clipPath id="asset-clip-${index}"><rect x="${number(imageX)}" y="${number(asset.sourceCrop ? imageY : 0)}" width="${number(visualWidth)}" height="${number(asset.sourceCrop ? visualHeight : model.height)}"/></clipPath>${output}`;
    }
    if (prepared.lightColor) {
      output += [4, 7, 10]
        .map(
          (bar) =>
            `<rect x="${number(imageX + visualWidth * (bar / 16))}" y="${number(imageY + visualHeight * 0.25)}" width="${number(visualWidth * (2 / 16))}" height="${number(visualHeight * 0.5)}" fill="${escapeXml(prepared.lightColor!)}"${transform}/>`,
        )
        .join("");
    }
  }
  if (options.showNames) {
    output += lines
      .map(
        (line, lineIndex) =>
          `<text x="${number(left + tileWidth / 2)}" y="${number(labelY + lineIndex * labelFontSize * 1.15)}" text-anchor="middle" fill="#f8fafc" font-size="${number(labelFontSize)}" font-weight="700" font-family="ui-monospace,monospace">${escapeXml(line)}</text>`,
      )
      .join("");
  }
  return `${output}</g>`;
}

export function renderBlueprintToSvg(
  blueprint: import("./index").Blueprint,
  options: BlueprintSvgRenderOptions = {},
): BlueprintSvgRenderResult {
  const model = createBlueprintRenderModel(blueprint, options);
  const includeBackground = options.includeBackground ?? true;
  const showGrid = options.showGrid ?? true;
  const showFoundationOutlines = options.showFoundationOutlines ?? true;
  const showSignalLinks = options.showSignalLinks ?? true;
  const structureMarkup = model.renderStructures
    .map(({ index }) => renderStructure(model, index, options))
    .join("");
  const foundationPath = showFoundationOutlines
    ? foundationOutlinePath(
        model.preparedBlueprint.preparedStructures,
        model.minX,
        model.minY,
        model.padding,
        model.cell,
      )
    : "";
  const background = includeBackground
    ? `${renderGrid(model)}${showGrid ? `<g opacity=".25"><rect width="${number(model.width)}" height="${number(model.height)}" fill="url(#blueprint-block-grid)"/><rect width="${number(model.width)}" height="${number(model.height)}" fill="url(#blueprint-cell-grid)"/></g>` : ""}`
    : showGrid
      ? `<defs>${
          renderGrid(model)
            .match(/<defs>[\s\S]*<\/defs>/)?.[0]
            .slice(6, -7) ?? ""
        }</defs><g opacity=".25"><rect width="${number(model.width)}" height="${number(model.height)}" fill="url(#blueprint-block-grid)"/><rect width="${number(model.width)}" height="${number(model.height)}" fill="url(#blueprint-cell-grid)"/></g>`
      : "";
  const outline = foundationPath
    ? `<path d="${escapeXml(foundationPath)}" fill="none" stroke="#000000" stroke-width="${number(renderPixelScale(model.cell))}"/>`
    : "";
  const signals = showSignalLinks ? renderSignalLinks(model) : "";
  return {
    model,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${number(model.width)} ${number(model.height)}" width="${number(model.width)}" height="${number(model.height)}"><title>${escapeXml(blueprint.name || "Sandustry blueprint")}</title><desc>Rendered Sandustry blueprint map</desc><style>image{image-rendering:pixelated}</style>${background}${outline}<g>${structureMarkup}</g>${signals}</svg>`,
  };
}
