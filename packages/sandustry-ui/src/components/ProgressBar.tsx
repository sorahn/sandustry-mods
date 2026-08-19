import type { HTMLAttributes } from "react";
import cx from "clsx";

export type ProgressBarProps = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
  value: number;
  max?: number;
  tone?: "accent" | "success" | "info" | "warning" | "danger";
  label?: string;
};

export function ProgressBar({
  value,
  max = 100,
  tone = "accent",
  label,
  className = "",
  ...props
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div
      {...props}
      className={cx("relative h-2 overflow-hidden rounded-full bg-gray-800", className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label={label}
    >
      <div
        className={cx(
          "h-full rounded-full transition-all duration-300",
          tone === "accent" && "bg-[#ffe700]",
          tone === "success" && "bg-emerald-400",
          tone === "info" && "bg-cyan-300",
          tone === "warning" && "bg-amber-300",
          tone === "danger" && "bg-red-400",
        )}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
