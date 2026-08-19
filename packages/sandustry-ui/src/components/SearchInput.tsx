import type { InputHTMLAttributes } from "react";
import cx from "clsx";

export type SearchInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function SearchInput({ className = "", ...props }: SearchInputProps) {
  return (
    <input
      {...props}
      type="search"
      className={cx(
        "w-full rounded border border-slate-700 bg-black/60 px-3 py-1.5 text-xs text-white placeholder:text-slate-600 transition-colors focus:border-slate-500 focus:outline-none",
        className,
      )}
    />
  );
}
