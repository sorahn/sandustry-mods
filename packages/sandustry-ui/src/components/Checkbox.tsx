import type { InputHTMLAttributes, ReactNode } from "react";
import cx from "clsx";

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "type"> & {
  boxed?: boolean;
  label?: ReactNode;
  size?: "default" | "small";
};

export function Checkbox({
  boxed = false,
  className = "",
  label,
  size = "default",
  ...props
}: CheckboxProps) {
  return (
    <label
      className={cx(
        "inline-flex cursor-pointer items-center gap-1.5 font-mono text-[11px] text-slate-400",
        size === "small" && "min-h-6 gap-1 text-[10px]",
        boxed &&
          "gap-2.5 rounded-[var(--sd-radius)_0_var(--sd-radius)_0] border border-slate-300/25 bg-black px-2.5 py-1",
        className,
      )}
    >
      {label ? <span>{label}</span> : null}
      <input {...props} type="checkbox" className="cursor-pointer accent-yellow-300" />
    </label>
  );
}
