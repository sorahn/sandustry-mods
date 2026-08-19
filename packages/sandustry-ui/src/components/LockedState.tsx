import type { HTMLAttributes, PropsWithChildren, ReactNode } from "react";
import cx from "clsx";

export type LockedStateProps = PropsWithChildren<HTMLAttributes<HTMLDivElement>> & {
  icon?: ReactNode;
  label?: ReactNode;
};

export function LockedState({
  icon,
  label = "Coming soon",
  className = "",
  children,
  ...props
}: LockedStateProps) {
  return (
    <div
      {...props}
      aria-disabled="true"
      className={cx("flex items-center justify-center gap-2 py-2 text-slate-300", className)}
    >
      {icon ? <span className="h-4 w-4 shrink-0 opacity-60">{icon}</span> : null}
      <span className="text-sm italic">{children ?? label}</span>
    </div>
  );
}
