import { BlueprintMap } from "../components/BlueprintMap";
import { catalogVisualFixture } from "../visual-fixtures/catalog";

export function BlueprintVisualFixturePage() {
  const visualCapture =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("visualCapture") === "1";

  return (
    <div
      className={`blueprint-visual-test${visualCapture ? " blueprint-visual-test--capture" : ""}`}
    >
      <BlueprintMap
        blueprint={catalogVisualFixture}
        remember={false}
        blueprintKey="visual-catalog-fixture"
        showSidebar={false}
        showGrid={true}
        showPngBackground={true}
        captureOnly={visualCapture}
      />
    </div>
  );
}
