import type { HTMLAttributes, PropsWithChildren } from "react";
import cx from "clsx";

export type BadgeProps = PropsWithChildren<HTMLAttributes<HTMLSpanElement>> & {
  tone?: "default" | "accent" | "success" | "warning" | "danger" | "info";
};

export function Badge({ tone = "default", className = "", children, ...props }: BadgeProps) {
  return (
    <span
      {...props}
      className={cx(
        "inline-flex items-center rounded-tr-lg rounded-bl-lg border bg-black px-2 py-0.5 text-xs",
        {
          "border-slate-200/25 text-white": tone === "default",
          "border-[#ffe700]/50 bg-[#ffe700]/10 text-[#ffe700]": tone === "accent",
          "border-emerald-400/50 text-emerald-400": tone === "success",
          "border-amber-300/50 text-amber-200": tone === "warning",
          "border-red-400/50 text-red-300": tone === "danger",
          "border-cyan-300/50 text-cyan-300": tone === "info",
        },
        className,
      )}
    >
      {children}
    </span>
  );
}
