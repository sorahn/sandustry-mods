import type { ButtonHTMLAttributes, ReactNode } from "react";
import cx from "clsx";

export type ItemCardProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  icon?: ReactNode;
  label: ReactNode;
  meta?: ReactNode;
  selected?: boolean;
};

export function ItemCard({
  icon,
  label,
  meta,
  selected = false,
  className = "",
  ...props
}: ItemCardProps) {
  return (
    <button
      {...props}
      type="button"
      className={cx(
        "group flex w-full items-center gap-2 rounded border px-2 py-1.5 text-left transition-all duration-200",
        selected
          ? "border-[#ffe700] bg-[#ffe700]/10"
          : "border-slate-700 bg-black/40 hover:border-slate-500 hover:bg-black/60",
        props.disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      {icon ? (
        <span className="flex h-3 w-3 shrink-0 items-center justify-center">{icon}</span>
      ) : null}
      <span
        className={cx(
          "truncate text-xs transition-colors",
          selected ? "text-[#ffe700]" : "text-slate-300 group-hover:text-white",
        )}
      >
        {label}
      </span>
      {meta ? <span className="ml-auto shrink-0 text-[10px] text-slate-500">{meta}</span> : null}
    </button>
  );
}
