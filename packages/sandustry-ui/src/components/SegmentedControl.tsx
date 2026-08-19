import type { ButtonHTMLAttributes, ReactNode } from "react";
import cx from "clsx";

export type Segment<T extends string = string> = {
  value: T;
  label: ReactNode;
  disabled?: boolean;
};

export type SegmentedControlProps<T extends string = string> = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "onChange" | "value"
> & {
  options: readonly Segment<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className = "",
  ...props
}: SegmentedControlProps<T>) {
  return (
    <div className={cx("flex flex-wrap gap-1", className)} role="group">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            {...props}
            key={option.value}
            type="button"
            disabled={option.disabled || props.disabled}
            aria-pressed={selected}
            className={cx(
              "rounded-tr-lg rounded-bl-lg border border-slate-200 px-3 py-1 text-xs transition-colors",
              selected
                ? "border-[#ffe700]/50 bg-[#ffe700]/10 text-[#ffe700]"
                : "border-slate-200/25 bg-black text-white hover:border-transparent hover:text-[#ffe700]",
              (option.disabled || props.disabled) &&
                "cursor-not-allowed border-slate-200/10 bg-black text-slate-600 hover:text-slate-600",
            )}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
