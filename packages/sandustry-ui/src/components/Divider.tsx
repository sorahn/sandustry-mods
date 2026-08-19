import type { HTMLAttributes } from "react";
import cx from "clsx";

export type DividerProps = HTMLAttributes<HTMLDivElement> & {
  variant?: "solid" | "accent";
};

export function Divider({ variant = "solid", className = "", ...props }: DividerProps) {
  return (
    <div
      {...props}
      role={props.role ?? "separator"}
      className={cx(
        "h-px w-full",
        variant === "solid"
          ? "bg-slate-700/60"
          : "bg-gradient-to-r from-transparent via-[#ffe700]/40 to-transparent",
        className,
      )}
    />
  );
}
