import type { InputHTMLAttributes, ReactNode } from "react";
import cx from "clsx";

export type SwitchProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: ReactNode;
};

export function Switch({ label, className = "", ...props }: SwitchProps) {
  return (
    <label
      className={cx(
        "inline-flex cursor-pointer items-center gap-2 text-xs text-slate-300",
        className,
      )}
    >
      <input {...props} type="checkbox" className="peer sr-only" />
      <span
        aria-hidden="true"
        className="relative inline-flex h-[22px] w-10 shrink-0 items-center rounded-full bg-black ring-1 ring-inset ring-slate-700 transition-colors duration-200 after:absolute after:left-[3px] after:top-[3px] after:h-4 after:w-4 after:rounded-full after:bg-slate-500 after:shadow-sm after:transition-all after:duration-200 peer-checked:bg-[#ffe700] peer-checked:ring-[#ffe700] peer-checked:after:translate-x-[18px] peer-checked:after:bg-black peer-focus-visible:ring-2 peer-focus-visible:ring-[#ffe700]"
      />
      {label ? <span>{label}</span> : null}
    </label>
  );
}
