import type { HTMLAttributes, PropsWithChildren, ReactNode } from "react";
import cx from "clsx";

export type StatusIndicatorProps = PropsWithChildren<HTMLAttributes<HTMLSpanElement>> & {
  label?: ReactNode;
  value?: ReactNode;
  tone?: "neutral" | "online" | "warning" | "danger";
};

export function StatusIndicator({
  label,
  value,
  tone = "neutral",
  className = "",
  children,
  ...props
}: StatusIndicatorProps) {
  return (
    <span
      {...props}
      className={cx("inline-flex items-center gap-1.5 text-xs text-white/70", className)}
    >
      <span
        aria-hidden="true"
        className={cx("h-1.5 w-1.5 rounded-full border", {
          "border-slate-500 bg-slate-400": tone === "neutral",
          "border-green-600 bg-green-500": tone === "online",
          "border-amber-500 bg-amber-400": tone === "warning",
          "border-red-600 bg-red-500": tone === "danger",
        })}
      />
      {label}
      {value !== undefined ? <span className="tabular-nums">{value}</span> : null}
      {children}
    </span>
  );
}
