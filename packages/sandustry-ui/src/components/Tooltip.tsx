import type { HTMLAttributes, PropsWithChildren, ReactNode } from "react";
import cx from "clsx";

export type TooltipProps = PropsWithChildren<HTMLAttributes<HTMLDivElement>> & {
  content: ReactNode;
  side?: "top" | "bottom";
};

export function Tooltip({
  content,
  side = "top",
  className = "",
  children,
  ...props
}: TooltipProps) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        {...props}
        role="tooltip"
        className={cx(
          "pointer-events-none absolute left-1/2 z-50 w-64 -translate-x-1/2 rounded-lg border border-gray-700 bg-black/90 p-3 text-sm text-white opacity-0 shadow-[0_4px_20px_rgba(0,0,0,0.6)] backdrop-blur-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100",
          side === "top" ? "bottom-full mb-2" : "top-full mt-2",
          className,
        )}
      >
        {content}
      </span>
    </span>
  );
}
