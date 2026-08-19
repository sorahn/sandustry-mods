import { useEffect, useState } from "react";
import cx from "clsx";
import { renderBlueprintStringToPng } from "@sandustry/blueprint-core";
import { decodeBlueprint, encodeBlueprint } from "../utils/blueprint";
import { blueprintCatalog } from "../utils/catalog";
import { catalogVisualFixture } from "../visual-fixtures/catalog";

export function BlueprintVisualFixturePage() {
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const visualCapture = params?.get("visualCapture") === "1";
  let blueprint = catalogVisualFixture;
  const visualBlueprint = params?.get("visualBlueprint");
  if (visualBlueprint) {
    try {
      blueprint = decodeBlueprint(visualBlueprint);
    } catch (error) {
      return (
        <pre className="blueprint-visual-test-error">
          {error instanceof Error ? error.message : "Unable to decode visual blueprint."}
        </pre>
      );
    }
  }

  return (
    <CorePngFixture
      blueprintString={visualBlueprint}
      blueprint={blueprint}
      capture={visualCapture}
    />
  );
}

function CorePngFixture({
  blueprintString,
  blueprint,
  capture,
}: {
  blueprintString: string | null | undefined;
  blueprint: ReturnType<typeof decodeBlueprint>;
  capture: boolean;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const encoded = blueprintString ?? encodeBlueprint(blueprint);
    let cancelled = false;
    const worker = capture
      ? null
      : new Worker(new URL("../blueprint-worker.ts", import.meta.url), { type: "module" });
    if (worker) {
      worker.onmessage = (event: MessageEvent<{ type: string; png?: ArrayBuffer }>) => {
        if (cancelled || event.data.type !== "result" || !event.data.png) return;
        const buffer = new ArrayBuffer(event.data.png.byteLength);
        new Uint8Array(buffer).set(new Uint8Array(event.data.png));
        setImageUrl((previous) => {
          if (previous) URL.revokeObjectURL(previous);
          return URL.createObjectURL(new Blob([buffer], { type: "image/png" }));
        });
      };
      worker.postMessage({
        type: "render",
        blueprint: encoded,
        assetBaseUrl: new URL(import.meta.env.BASE_URL, window.location.origin).href,
      });
    }
    void renderBlueprintStringToPng(encoded, {
      catalog: blueprintCatalog(),
      assetBaseUrl: new URL(import.meta.env.BASE_URL, window.location.origin).href,
      scale: 1,
      includeBackground: true,
      showGrid: true,
      showFoundationOutlines: true,
      showSignalLinks: true,
      resolveImage: async (source) => {
        const response = await fetch(source);
        if (!response.ok) return undefined;
        const blob = await response.blob();
        return String(
          await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
          }),
        );
      },
      platform: {
        loadSvg: async (svg) => {
          const image = new Image();
          const url = URL.createObjectURL(
            new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${svg}`], {
              type: "image/svg+xml;charset=utf-8",
            }),
          );
          await new Promise<void>((resolve, reject) => {
            image.onload = () => resolve();
            image.onerror = () => reject(new Error("Unable to render blueprint SVG"));
            image.src = url;
          });
          URL.revokeObjectURL(url);
          return image;
        },
        createCanvas: (width, height) => {
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          return canvas;
        },
        drawImage: (canvas, image, width, height) => {
          const context = canvas.getContext("2d");
          if (!context) throw new Error("Unable to create PNG canvas context");
          context.drawImage(image, 0, 0, width, height);
        },
        encodePng: async (canvas) => {
          const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, "image/png"),
          );
          if (!blob) throw new Error("Unable to encode blueprint PNG");
          return new Uint8Array(await blob.arrayBuffer());
        },
      },
    })
      .then((png) => {
        if (cancelled) return;
        const buffer = new ArrayBuffer(png.byteLength);
        new Uint8Array(buffer).set(png);
        setImageUrl((previous) => {
          if (previous) URL.revokeObjectURL(previous);
          return URL.createObjectURL(new Blob([buffer], { type: "image/png" }));
        });
      })
      .catch((renderError: unknown) => {
        if (!cancelled) {
          setError(
            renderError instanceof Error ? renderError.message : "Unable to render blueprint PNG",
          );
        }
      });
    return () => {
      cancelled = true;
      worker?.terminate();
      setImageUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return null;
      });
    };
  }, [blueprint, blueprintString]);

  return (
    <div className={cx("blueprint-visual-test", capture && "blueprint-visual-test--capture")}>
      {error ? <pre className="blueprint-visual-test-error">{error}</pre> : null}
      {imageUrl ? <img className="blueprint-core-png" src={imageUrl} alt={blueprint.name} /> : null}
    </div>
  );
}
