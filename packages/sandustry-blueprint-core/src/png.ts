export type BlueprintPngPlatform<Image, Canvas> = {
  loadSvg: (svg: string) => Promise<Image>;
  createCanvas: (width: number, height: number) => Canvas;
  drawImage: (canvas: Canvas, image: Image, width: number, height: number) => void;
  encodePng: (canvas: Canvas) => Promise<Uint8Array>;
};

export type PrepareSvgForPngOptions = {
  width: number;
  height: number;
  scale: number;
  title?: string;
  description?: string;
  includeBackground?: boolean;
  resolveImage?: (source: string) => Promise<string | undefined>;
};

export type RenderSvgToPngOptions<Image, Canvas> = PrepareSvgForPngOptions & {
  platform: BlueprintPngPlatform<Image, Canvas>;
};

function escapeXml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character]!,
  );
}

function replaceRootAttribute(svg: string, name: string, value: string) {
  const attribute = `${name}="${escapeXml(value)}"`;
  const pattern = new RegExp(`\\s${name}=(?:"[^"]*"|'[^']*')`, "i");
  return pattern.test(svg)
    ? svg.replace(pattern, ` ${attribute}`)
    : svg.replace(/^<svg\b/i, `<svg ${attribute}`);
}

export async function prepareSvgForPng(svg: string, options: PrepareSvgForPngOptions) {
  let prepared = svg.trim();
  if (!prepared) throw new Error("Cannot render an empty SVG");
  prepared = replaceRootAttribute(prepared, "xmlns", "http://www.w3.org/2000/svg");
  prepared = replaceRootAttribute(prepared, "xmlns:xlink", "http://www.w3.org/1999/xlink");
  prepared = replaceRootAttribute(prepared, "xmlns:dc", "http://purl.org/dc/elements/1.1/");
  prepared = replaceRootAttribute(prepared, "viewBox", `0 0 ${options.width} ${options.height}`);
  prepared = replaceRootAttribute(prepared, "width", String(options.width * options.scale));
  prepared = replaceRootAttribute(prepared, "height", String(options.height * options.scale));
  prepared = prepared.replace(/\s(?:class|style)=(?:"[^"]*"|'[^']*')/gi, "");
  if (!options.includeBackground) {
    prepared = prepared.replace(
      /<rect\b(?=[^>]*\bfill=["']#33a8ff["'])[^>]*\/?>\s*(?:<\/rect>)?/gi,
      "",
    );
  }

  const title = escapeXml(options.title || "Sandustry blueprint");
  const description = escapeXml(options.description || "Rendered Sandustry blueprint map");
  prepared = prepared.replace(
    /(<svg\b[^>]*>)/i,
    `$1<title>${title}</title><desc>${description}</desc>`,
  );

  if (options.resolveImage) {
    const imagePattern = /(<image\b[^>]*?)(\s(?:href|xlink:href)=(['"])(.*?)\3)([^>]*>)/gi;
    const images = [...prepared.matchAll(imagePattern)];
    for (const match of images) {
      const source = match[4];
      if (!source || source.startsWith("data:")) continue;
      const resolved = await options.resolveImage(source);
      if (!resolved) continue;
      prepared = prepared.replace(match[0], `${match[1]} href="${escapeXml(resolved)}"${match[5]}`);
    }
  }
  return prepared;
}

export async function renderSvgToPng<Image, Canvas>(
  svg: string,
  options: RenderSvgToPngOptions<Image, Canvas>,
) {
  const width = Math.max(1, Math.round(options.width * options.scale));
  const height = Math.max(1, Math.round(options.height * options.scale));
  const prepared = await prepareSvgForPng(svg, options);
  const image = await options.platform.loadSvg(prepared);
  const canvas = options.platform.createCanvas(width, height);
  options.platform.drawImage(canvas, image, width, height);
  return options.platform.encodePng(canvas);
}
