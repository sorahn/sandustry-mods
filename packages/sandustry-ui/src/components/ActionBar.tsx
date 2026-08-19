import type { HTMLAttributes, PropsWithChildren } from "react";
import cx from "clsx";

export type ActionBarProps = PropsWithChildren<HTMLAttributes<HTMLDivElement>> & {
  align?: "start" | "end" | "between";
};

export function ActionBar({ align = "end", className = "", children, ...props }: ActionBarProps) {
  return (
    <div
      {...props}
      className={cx(
        "flex shrink-0 items-center gap-3 border-t border-slate-700/40 px-4 py-3",
        align === "start" && "justify-start",
        align === "end" && "justify-end",
        align === "between" && "justify-between",
        className,
      )}
    >
      {children}
    </div>
  );
}
