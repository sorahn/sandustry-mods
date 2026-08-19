import type { ReactNode } from "react";
import cx from "clsx";
import { ItemCard } from "./ItemCard";
import { SearchInput } from "./SearchInput";
import { SegmentedControl, type Segment } from "./SegmentedControl";

export type ElementPickerItem = {
  id: string;
  label: string;
  matter?: string;
  icon?: ReactNode;
};

export type ElementPickerProps = {
  items: readonly ElementPickerItem[];
  value?: string;
  query?: string;
  matter?: string;
  matterOptions?: readonly Segment[];
  onQueryChange?: (query: string) => void;
  onMatterChange?: (matter: string) => void;
  onSelect?: (item: ElementPickerItem) => void;
  className?: string;
};

export function ElementPicker({
  items,
  value,
  query = "",
  matter = "all",
  matterOptions,
  onQueryChange,
  onMatterChange,
  onSelect,
  className = "",
}: ElementPickerProps) {
  const normalizedQuery = query.trim().toLowerCase();
  const filteredItems = items.filter((item) => {
    const matchesQuery = !normalizedQuery || item.label.toLowerCase().includes(normalizedQuery);
    const matchesMatter = matter === "all" || item.matter === matter;
    return matchesQuery && matchesMatter;
  });

  return (
    <div
      className={cx(
        "flex min-w-72 flex-col gap-2 rounded border border-slate-700 bg-black/75 p-2",
        className,
      )}
    >
      <SearchInput
        value={query}
        onChange={(event) => onQueryChange?.(event.target.value)}
        placeholder="Search"
      />
      {matterOptions ? (
        <SegmentedControl
          options={matterOptions}
          value={matter}
          onChange={(nextMatter) => onMatterChange?.(nextMatter)}
        />
      ) : null}
      <div className="grid max-h-80 grid-cols-4 gap-1.5 overflow-y-auto py-1.5">
        {filteredItems.map((item) => (
          <ItemCard
            key={item.id}
            icon={item.icon}
            label={item.label}
            selected={item.id === value}
            onClick={() => onSelect?.(item)}
          />
        ))}
        {filteredItems.length === 0 ? (
          <p className="col-span-4 px-2 py-4 text-center text-xs text-slate-500">
            No elements found
          </p>
        ) : null}
      </div>
    </div>
  );
}
