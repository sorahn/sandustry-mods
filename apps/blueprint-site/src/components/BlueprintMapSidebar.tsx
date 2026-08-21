import { type ReactNode } from "react";
import cx from "clsx";
import { type Blueprint } from "../utils/blueprint";
import { catalogEntry, catalogRender, catalogRenderSize } from "../utils/catalog";
import { structureLabel } from "@sandustry/blueprint-core";
import { structureFootprint } from "../utils/blueprint-map";

type BlueprintStructure = Blueprint["data"][number];

export function BlueprintMapSidebar({
  selected,
  debugOptions,
}: {
  selected: BlueprintStructure | null;
  debugOptions: ReactNode;
}) {
  return (
    <aside className="flex flex-col border-l border-slate-800 pl-4 text-xs text-slate-400">
      {debugOptions}
      <p className={cx("font-mono uppercase tracking-[0.18em] text-slate-500")}>Selected record</p>
      {selected ? (
        <div className="mt-3 space-y-3">
          {(() => {
            const entry = catalogEntry(selected.type);
            const render = entry ? catalogRender(entry) : undefined;
            const renderSize = render ? catalogRenderSize(render) : undefined;
            return (
              <>
                <p className="break-all font-mono text-yellow-200">
                  {entry?.name ?? structureLabel(selected.type)}
                </p>
                {entry ? (
                  <>
                    <p>
                      Catalog footprint{" "}
                      <strong className="text-white">
                        {structureFootprint(selected).width}×{structureFootprint(selected).height}
                      </strong>
                    </p>
                    {entry.category ? (
                      <p>
                        Category <strong className="text-white">{entry.category}</strong>
                      </p>
                    ) : null}
                    {entry.buildModes ? (
                      <p className="break-all">Build modes {JSON.stringify(entry.buildModes)}</p>
                    ) : null}
                    {entry.variants ? (
                      <p className="break-all">Variants {JSON.stringify(entry.variants)}</p>
                    ) : null}
                    {render?.imageName ? (
                      <p className="break-all">
                        Render asset <strong className="text-white">{render.imageName}</strong>
                        {renderSize ? ` · ${renderSize.width}×${renderSize.height}px` : ""}
                      </p>
                    ) : null}
                    <details className="rounded border border-slate-800 bg-black/30 p-2">
                      <summary className="cursor-pointer text-slate-300">
                        Runtime definition
                      </summary>
                      <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-all text-[11px] leading-5 text-slate-500">
                        {JSON.stringify(entry.definition ?? entry, null, 2)}
                      </pre>
                    </details>
                  </>
                ) : null}
                <p>
                  Position{" "}
                  <strong className="text-white">
                    {selected.x}, {selected.y}
                  </strong>
                </p>
                <p className="break-all whitespace-pre-wrap">
                  {selected.filter
                    ? `filter ${JSON.stringify(selected.filter, null, 2)}`
                    : "No filter"}
                </p>
                <p className="break-all whitespace-pre-wrap">
                  {selected.data !== undefined
                    ? `data ${JSON.stringify(selected.data, null, 2)}`
                    : "No structure data"}
                </p>
              </>
            );
          })()}
        </div>
      ) : (
        <p className="mt-3 leading-6">Choose a tile to inspect its raw blueprint record.</p>
      )}
    </aside>
  );
}
