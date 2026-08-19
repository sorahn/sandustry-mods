import type { ButtonHTMLAttributes, ReactNode } from "react";
import cx from "clsx";

export type ListItemProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  label: ReactNode;
  description?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  selected?: boolean;
  variant?: "default" | "compact" | "subtle";
};

export function ListItem({
  label,
  description,
  leading,
  trailing,
  selected = false,
  variant = "default",
  className = "",
  ...props
}: ListItemProps) {
  return (
    <button
      {...props}
      type="button"
      aria-current={selected ? "true" : undefined}
      className={cx(
        "flex w-full items-center gap-2 border-l-2 text-left transition-all duration-150",
        variant === "default" && "px-3 py-3",
        variant === "compact" && "px-2 py-1.5",
        variant === "subtle" && "px-3 py-2 text-slate-400",
        selected
          ? "border-l-[#ffe700] bg-slate-800/60"
          : "border-l-transparent hover:border-l-slate-600 hover:bg-slate-800/30",
        props.disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      {leading ? <span className="shrink-0">{leading}</span> : null}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-white">{label}</span>
        {description ? (
          <span className="mt-1 block text-[11px] text-slate-300">{description}</span>
        ) : null}
      </span>
      {trailing ? <span className="shrink-0">{trailing}</span> : null}
    </button>
  );
}
