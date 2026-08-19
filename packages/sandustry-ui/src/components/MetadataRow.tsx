import type { HTMLAttributes, ReactNode } from "react";
import cx from "clsx";

export type MetadataItem = {
  label?: ReactNode;
  value: ReactNode;
  icon?: ReactNode;
  tone?: "default" | "accent" | "muted" | "success" | "warning";
};

export type MetadataRowProps = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
  items: readonly MetadataItem[];
  wrap?: boolean;
};

export function MetadataRow({ items, wrap = true, className = "", ...props }: MetadataRowProps) {
  return (
    <div
      {...props}
      className={cx(
        "flex items-center gap-x-4 gap-y-1 text-[11px]",
        wrap && "flex-wrap",
        className,
      )}
    >
      {items.map((item, index) => (
        <span
          key={index}
          className={cx(
            "inline-flex items-center gap-1",
            item.tone === "accent" && "text-[#ffe700]",
            item.tone === "muted" && "text-slate-400",
            item.tone === "success" && "text-emerald-400/70",
            item.tone === "warning" && "text-amber-300",
            (!item.tone || item.tone === "default") && "text-slate-300",
          )}
        >
          {item.icon ? <span className="h-3 w-3 shrink-0">{item.icon}</span> : null}
          {item.label ? <span className="text-slate-400">{item.label}</span> : null}
          <span className="tabular-nums">{item.value}</span>
        </span>
      ))}
    </div>
  );
}
