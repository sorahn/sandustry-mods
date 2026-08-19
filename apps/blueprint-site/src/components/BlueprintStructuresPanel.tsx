import { Panel } from "@sandustry/ui";
import { type Blueprint } from "../utils/blueprint";

type BlueprintStructuresPanelProps = {
  blueprint: Blueprint;
  structureLabel: (type: Blueprint["data"][number]["type"]) => string;
};

export function BlueprintStructuresPanel({
  blueprint,
  structureLabel,
}: BlueprintStructuresPanelProps) {
  return (
    <Panel title={`Structures - ${blueprint.name}`} collapsible defaultCollapsed>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[42rem] text-left font-mono text-xs">
          <thead className="border-b border-slate-800 text-slate-500">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">type</th>
              <th className="px-4 py-3">position</th>
              <th className="px-4 py-3">details</th>
            </tr>
          </thead>
          <tbody>
            {blueprint.data.map((structure, index) => (
              <tr
                key={`${index}-${structure.x}-${structure.y}`}
                className="border-b border-slate-900 align-top text-slate-300"
              >
                <td className="px-4 py-3 text-slate-600">{index + 1}</td>
                <td className="px-4 py-3 break-all text-yellow-200">
                  {structureLabel(structure.type)}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  {structure.x}, {structure.y}
                </td>
                <td className="max-w-xl whitespace-pre-wrap break-all px-4 py-3 text-slate-500">
                  {structure.filter ? `filter ${JSON.stringify(structure.filter)}` : ""}
                  {structure.filter && structure.data !== undefined ? " · " : ""}
                  {structure.data !== undefined ? `data ${JSON.stringify(structure.data)}` : ""}
                  {structure.filter === undefined && structure.data === undefined ? "—" : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
