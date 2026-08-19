import type { HTMLAttributes, PropsWithChildren, ReactNode } from "react";
import cx from "clsx";

export type PopoverProps = Omit<PropsWithChildren<HTMLAttributes<HTMLDivElement>>, "content"> & {
  content: ReactNode;
  open?: boolean;
  side?: "top" | "bottom" | "left" | "right";
};

export function Popover({
  content,
  open = false,
  side = "bottom",
  className = "",
  children,
  ...props
}: PopoverProps) {
  return (
    <span className="relative inline-flex">
      {children}
      {open ? (
        <span
          {...props}
          role="dialog"
          className={cx(
            "absolute z-50 min-w-48 rounded border border-slate-700 bg-black/90 p-2 text-white shadow-xl backdrop-blur-sm",
            side === "top" && "bottom-full left-0 mb-2",
            side === "bottom" && "left-0 top-full mt-2",
            side === "left" && "right-full top-0 mr-2",
            side === "right" && "left-full top-0 ml-2",
            className,
          )}
        >
          {content}
        </span>
      ) : null}
    </span>
  );
}
