import { catalogEntry, catalogRender, catalogRenderSize } from "../utils/catalog";
import { memo } from "react";
import {
  renderAnchorEdge,
  renderAnchorOffsetCells,
  renderPixelScale,
  renderScaleFactor,
  renderScaleMode,
  structureLabel,
  tileColor,
  wrapLabel,
} from "@sandustry/blueprint-core";
import { type BlueprintMapModel } from "../utils/blueprint-map";

type PreparedBlueprint = BlueprintMapModel["preparedBlueprint"];
type RenderStructure = BlueprintMapModel["renderStructures"][number];
type BlueprintMapStructureProps = {
  item: RenderStructure;
  preparedBlueprint: PreparedBlueprint;
  minX: number;
  minY: number;
  padding: number;
  cell: number;
  height: number;
  spritesVisible: boolean;
  showCustomShapes: boolean;
  showNames: boolean;
  suppressClickRef: { current: boolean };
  onSelect: (index: number) => void;
};

export const BlueprintMapStructure = memo(function BlueprintMapStructure({
  item,
  preparedBlueprint,
  minX,
  minY,
  padding,
  cell,
  height,
  spritesVisible,
  showCustomShapes,
  showNames,
  suppressClickRef,
  onSelect,
}: BlueprintMapStructureProps) {
  const { structure, index } = item;
  const entry = catalogEntry(structure.type);
  const prepared = preparedBlueprint.preparedStructures[index];
  const footprint = prepared.footprint;
  const preparedShape = prepared.shape;
  const shape =
    preparedShape ??
    Array.from({ length: footprint.height }, () =>
      Array.from({ length: footprint.width }, () => 1),
    );
  const isCustomShape =
    prepared.customShape !== undefined || (preparedShape !== undefined && !entry?.renderAsset);
  const topY = prepared.topY;
  const left = (structure.x - minX + padding) * cell;
  const top = (topY - minY + padding) * cell;
  const tileWidth = footprint.width * cell;
  const tileHeight = footprint.height * cell;
  const assetEntry = isCustomShape && !entry?.renderAsset ? catalogEntry(11) : entry;
  const labelX = left + tileWidth / 2;
  const label = String(
    entry?.name ??
      (typeof structure.type === "number" ? structure.type : structure.type.slice(0, 8)),
  );
  const labelFontSize = Math.max(8, cell * 0.9);
  const labelLineHeight = labelFontSize * 1.15;
  const labelLines = wrapLabel(label, Math.max(3, Math.floor(tileWidth / (labelFontSize * 0.6))));
  const labelY = top + tileHeight / 2 - ((labelLines.length - 1) * labelLineHeight) / 2 + 12;

  return (
    <g
      key={`${index}-${structure.x}-${structure.y}`}
      role="button"
      tabIndex={0}
      aria-label={`Select ${structureLabel(structure.type)} at ${structure.x}, ${structure.y}`}
      onClick={() => {
        if (suppressClickRef.current) {
          suppressClickRef.current = false;
          return;
        }
        onSelect(index);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onSelect(index);
      }}
      className="blueprint-map__structure cursor-pointer"
      data-render-image={entry ? catalogRender(entry)?.imageName : undefined}
    >
      <rect
        x={left}
        y={top}
        width={tileWidth}
        height={tileHeight}
        rx="5"
        fill={
          !spritesVisible || isCustomShape || entry?.renderAsset
            ? "transparent"
            : tileColor(structure.type)
        }
        stroke={!spritesVisible || isCustomShape || entry?.renderAsset ? "none" : "#8491a3"}
        strokeWidth="1.5"
      />
      {isCustomShape && showCustomShapes
        ? shape.map((row, rowIndex) =>
            row.map((value, columnIndex) =>
              value === 0 ? null : (
                <rect
                  key={`custom-cell-${rowIndex}-${columnIndex}`}
                  x={left + columnIndex * cell}
                  y={top + rowIndex * cell}
                  width={cell}
                  height={cell}
                  rx="2"
                  fill="#a47a45"
                  stroke="none"
                  strokeWidth="1"
                  pointerEvents="none"
                />
              ),
            ),
          )
        : null}
      {spritesVisible && assetEntry?.renderAsset ? (
        <BlueprintMapSprite
          entry={assetEntry}
          prepared={prepared}
          index={index}
          entryHasRenderAsset={Boolean(entry?.renderAsset)}
          isCustomShape={isCustomShape}
          shape={shape}
          left={left}
          top={top}
          tileWidth={tileWidth}
          tileHeight={tileHeight}
          cell={cell}
          height={height}
        />
      ) : null}
      {showNames ? (
        <text
          x={labelX}
          y={labelY}
          textAnchor="middle"
          fill="#f8fafc"
          fontSize={labelFontSize}
          fontWeight="700"
          fontFamily="ui-monospace, monospace"
        >
          {labelLines.map((line, lineIndex) => (
            <tspan key={`${line}-${lineIndex}`} x={labelX} y={labelY + lineIndex * labelLineHeight}>
              {line}
            </tspan>
          ))}
        </text>
      ) : null}
    </g>
  );
}, areBlueprintMapStructurePropsEqual);

function areBlueprintMapStructurePropsEqual(
  previous: BlueprintMapStructureProps,
  next: BlueprintMapStructureProps,
) {
  return (
    previous.item.index === next.item.index &&
    previous.preparedBlueprint === next.preparedBlueprint &&
    previous.minX === next.minX &&
    previous.minY === next.minY &&
    previous.padding === next.padding &&
    previous.cell === next.cell &&
    previous.height === next.height &&
    previous.spritesVisible === next.spritesVisible &&
    previous.showCustomShapes === next.showCustomShapes &&
    previous.showNames === next.showNames &&
    previous.suppressClickRef === next.suppressClickRef &&
    previous.onSelect === next.onSelect
  );
}

function BlueprintMapSprite({
  entry,
  prepared,
  index,
  entryHasRenderAsset,
  isCustomShape,
  shape,
  left,
  top,
  tileWidth,
  tileHeight,
  cell,
  height,
}: {
  entry: NonNullable<ReturnType<typeof catalogEntry>>;
  prepared: PreparedBlueprint["preparedStructures"][number];
  index: number;
  entryHasRenderAsset: boolean;
  isCustomShape: boolean;
  shape: number[][];
  left: number;
  top: number;
  tileWidth: number;
  tileHeight: number;
  cell: number;
  height: number;
}) {
  const renderAsset = entry.renderAsset!;
  const frame = renderAsset.frame;
  const source = renderAsset.sourceSize;
  const sourceCrop = renderAsset.sourceCrop;
  const sourceWidth = source?.width ?? frame?.width ?? 1;
  const sourceHeight = source?.height ?? frame?.height ?? 1;
  const runtimeRender = catalogRender(entry);
  const runtimeSize = runtimeRender ? catalogRenderSize(runtimeRender) : undefined;
  const frameWidth = frame?.width ?? runtimeSize?.width ?? sourceWidth;
  const frameHeight = frame?.height ?? runtimeSize?.height ?? sourceHeight;
  const frameIndex = prepared.sprite?.frameIndex ?? renderAsset.frameIndex ?? 0;
  const spriteRotation = prepared.sprite?.rotation ?? renderAsset.rotation;
  const customLightColor = renderAsset.lightColor ?? prepared.lightColor;
  const useNativeAssetSize =
    runtimeSize !== undefined || (frame !== undefined && renderAsset.scale !== "cell");
  const needsFrameClip = renderAsset.clip ?? sourceWidth > frameWidth;
  const pixelScale = renderPixelScale(cell);
  const visualWidth = useNativeAssetSize
    ? frameWidth * pixelScale
    : renderScaleMode(renderAsset.scale) === "cell"
      ? cell * renderScaleFactor(renderAsset.scale)
      : tileWidth;
  const visualHeight = useNativeAssetSize
    ? frameHeight * pixelScale
    : frame
      ? visualWidth * ((sourceCrop?.height ?? sourceHeight) / frameWidth)
      : tileHeight;
  const sourceScale = visualWidth / frameWidth;
  const imageHeight = visualWidth * (sourceHeight / frameWidth);
  const renderOffset = runtimeRender?.offset;
  const offset =
    renderOffset && typeof renderOffset === "object"
      ? (renderOffset as { x?: unknown; y?: unknown })
      : undefined;
  const offsetX = (typeof offset?.x === "number" ? offset.x : 0) + (renderAsset.offset?.x ?? 0);
  const offsetY = (typeof offset?.y === "number" ? offset.y : 0) + (renderAsset.offset?.y ?? 0);
  const imageX = left + offsetX * pixelScale;
  const sourceImageX = imageX - frameIndex * visualWidth;
  const imageY =
    renderAnchorEdge(renderAsset.anchor) === "bottom"
      ? top +
        tileHeight -
        visualHeight +
        renderAnchorOffsetCells(renderAsset.anchor) * cell +
        offsetY * pixelScale
      : top + offsetY * pixelScale;
  const sourceImageY = imageY - (sourceCrop?.y ?? 0) * sourceScale;

  return (
    <>
      {isCustomShape ? (
        <defs>
          <mask
            id={`custom-shape-mask-${index}`}
            maskUnits="userSpaceOnUse"
            x={left}
            y={top}
            width={tileWidth}
            height={tileHeight}
          >
            <rect x={left} y={top} width={tileWidth} height={tileHeight} fill="black" />
            {shape.map((row, rowIndex) =>
              row.map((value, columnIndex) =>
                value === 0 ? null : (
                  <rect
                    key={`custom-mask-cell-${rowIndex}-${columnIndex}`}
                    x={left + columnIndex * cell}
                    y={top + rowIndex * cell}
                    width={cell}
                    height={cell}
                    fill="white"
                  />
                ),
              ),
            )}
          </mask>
        </defs>
      ) : null}
      <clipPath id={`asset-clip-${index}`}>
        <rect
          x={imageX}
          y={sourceCrop ? imageY : 0}
          width={visualWidth}
          height={sourceCrop ? visualHeight : height}
        />
      </clipPath>
      <image
        href={`${import.meta.env.BASE_URL}${renderAsset.path}`}
        x={sourceImageX}
        y={sourceImageY}
        width={visualWidth * (sourceWidth / frameWidth)}
        height={imageHeight}
        preserveAspectRatio="none"
        clipPath={needsFrameClip ? `url(#asset-clip-${index})` : undefined}
        mask={
          isCustomShape && !entryHasRenderAsset ? `url(#custom-shape-mask-${index})` : undefined
        }
        transform={
          spriteRotation
            ? `rotate(${spriteRotation} ${left + tileWidth / 2} ${top + tileHeight / 2})`
            : undefined
        }
        style={{ imageRendering: "pixelated", pointerEvents: "none" }}
      />
      {customLightColor
        ? [4, 7, 10].map((bar) => (
            <rect
              key={`light-color-${index}-${bar}`}
              x={imageX + visualWidth * (bar / 16)}
              y={imageY + visualHeight * 0.25}
              width={visualWidth * (2 / 16)}
              height={visualHeight * 0.5}
              fill={customLightColor}
              pointerEvents="none"
              transform={
                spriteRotation
                  ? `rotate(${spriteRotation} ${left + tileWidth / 2} ${top + tileHeight / 2})`
                  : undefined
              }
            />
          ))
        : null}
    </>
  );
}
