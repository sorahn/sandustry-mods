import type { HTMLAttributes, PropsWithChildren } from "react";
import cx from "clsx";

export type ListProps = PropsWithChildren<HTMLAttributes<HTMLDivElement>> & {
  variant?: "default" | "panel" | "flush";
};

export function List({ variant = "default", className = "", children, ...props }: ListProps) {
  return (
    <div
      {...props}
      role={props.role ?? "list"}
      className={cx(
        "flex flex-col",
        variant === "default" && "gap-1",
        variant === "panel" && "gap-1 rounded border border-slate-700 bg-black/30 p-2",
        variant === "flush" && "divide-y divide-slate-800",
        className,
      )}
    >
      {children}
    </div>
  );
}
