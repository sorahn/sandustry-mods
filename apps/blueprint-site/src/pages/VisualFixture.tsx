import { BlueprintMap } from "../components/BlueprintMap";
import cx from "clsx";
import { decodeBlueprint } from "../utils/blueprint";
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
    <div className={cx("blueprint-visual-test", visualCapture && "blueprint-visual-test--capture")}>
      <BlueprintMap
        blueprint={blueprint}
        remember={false}
        blueprintKey={`visual-${blueprint.name}`}
        showSidebar={false}
        showGrid={true}
        showPngBackground={true}
        captureOnly={visualCapture}
      />
    </div>
  );
}
