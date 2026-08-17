import { type ReactNode } from "react";
import { Button, Panel, TextArea } from "@sandustry/ui/react";
import { type Blueprint } from "../utils/blueprint";

export type BlueprintSummary = {
  format: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  types: number;
  numericTypes: number;
  stringTypes: number;
  filters: number;
  dataRecords: number;
  links: number;
};

type BlueprintSubmissionPanelProps = {
  encoded: string;
  message: string;
  rememberHeader: ReactNode;
  onEncodedChange: (value: string) => void;
  onInspect: () => void;
  summary: BlueprintSummary | null;
  blueprint: Blueprint | null;
};

export function BlueprintSubmissionPanel({
  encoded,
  message,
  rememberHeader,
  onEncodedChange,
  onInspect,
  summary,
  blueprint,
}: BlueprintSubmissionPanelProps) {
  return (
    <Panel title="Blueprint string" header={rememberHeader}>
      <div className="space-y-4 p-4">
        <TextArea
          value={encoded}
          onChange={(event) => onEncodedChange(event.target.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              event.preventDefault();
              onInspect();
            }
          }}
          placeholder="SAND:BP:v2:..."
          spellCheck={false}
          className="min-h-48 placeholder:text-slate-600"
        />
        <Button onClick={onInspect}>Inspect blueprint</Button>
        <p
          role="status"
          className="border-l-2 border-yellow-300/60 bg-black/40 px-3 py-2 font-mono text-xs text-slate-400"
        >
          {message}
        </p>
        {blueprint && summary ? (
          <div className="space-y-3 border-t border-slate-800 pt-4 text-xs text-slate-300">
            <p className="font-mono text-yellow-200">
              {blueprint.name} · {summary.format}
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <span>
                Structures <strong className="text-white">{blueprint.data.length}</strong>
              </span>
              <span>
                Types <strong className="text-white">{summary.types}</strong> (
                {summary.numericTypes} native / {summary.stringTypes} string)
              </span>
              <span>
                Bounds{" "}
                <strong className="text-white">
                  {summary.minX},{summary.minY}
                </strong>{" "}
                →{" "}
                <strong className="text-white">
                  {summary.maxX},{summary.maxY}
                </strong>
              </span>
              <span>
                Links <strong className="text-white">{summary.links}</strong> · Filters{" "}
                <strong className="text-white">{summary.filters}</strong> · Data{" "}
                <strong className="text-white">{summary.dataRecords}</strong>
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </Panel>
  );
}
