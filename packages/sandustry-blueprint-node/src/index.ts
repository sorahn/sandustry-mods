import { readFile } from "node:fs/promises";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";
import {
  renderBlueprintStringToPng,
  type BlueprintPngPlatform,
  type RenderBlueprintStringToPngOptions,
} from "@sandustry/blueprint-core";

type NodeImage = Resvg;
type NodeCanvas = { png?: Uint8Array };

export type NodeAssetResolverOptions = {
  assetRoot: string;
};

export type NodeBlueprintPngOptions = Omit<
  RenderBlueprintStringToPngOptions<NodeImage, NodeCanvas>,
  "platform" | "resolveImage"
> & {
  assetRoot?: string;
  resolveImage?: (source: string) => Promise<string | undefined>;
};

function mimeTypeFor(source: string) {
  return source.toLowerCase().endsWith(".svg") ? "image/svg+xml" : "image/png";
}

export function createNodeAssetResolver({ assetRoot }: NodeAssetResolverOptions) {
  return async (source: string) => {
    if (!source || source.startsWith("data:")) return undefined;
    if (/^[a-z][a-z\d+.-]*:/i.test(source)) {
      throw new Error(`Node asset resolver only supports local assets: ${source}`);
    }
    const relative = source.replace(/^\/+/, "");
    const assetPath = path.resolve(assetRoot, relative);
    const rootPath = path.resolve(assetRoot);
    if (assetPath !== rootPath && !assetPath.startsWith(`${rootPath}${path.sep}`)) {
      throw new Error(`Asset path escapes the configured asset root: ${source}`);
    }
    const bytes = await readFile(assetPath);
    return `data:${mimeTypeFor(assetPath)};base64,${bytes.toString("base64")}`;
  };
}

export async function renderBlueprintStringToNodePng(
  input: string,
  options: NodeBlueprintPngOptions,
) {
  const resolveImage =
    options.resolveImage ??
    (options.assetRoot ? createNodeAssetResolver({ assetRoot: options.assetRoot }) : undefined);
  const platform = {
    loadSvg: async (svg: string) => new Resvg(svg, { fitTo: { mode: "original" } }),
    createCanvas: () => ({}),
    drawImage: (canvas: NodeCanvas, image: NodeImage) => {
      canvas.png = image.render().asPng();
    },
    encodePng: async (canvas: NodeCanvas) => {
      if (!canvas.png) throw new Error("Node renderer did not produce a PNG");
      return new Uint8Array(canvas.png);
    },
  } satisfies BlueprintPngPlatform<NodeImage, NodeCanvas>;

  return renderBlueprintStringToPng(input, {
    ...options,
    resolveImage,
    platform,
  });
}
