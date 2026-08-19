import type { LabelHTMLAttributes, PropsWithChildren, ReactNode } from "react";
import cx from "clsx";

export type FormFieldProps = PropsWithChildren<LabelHTMLAttributes<HTMLLabelElement>> & {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
};

export function FormField({
  label,
  hint,
  error,
  required = false,
  className = "",
  children,
  ...props
}: FormFieldProps) {
  return (
    <label {...props} className={cx("block", className)}>
      <span className="mb-1.5 block text-xs uppercase tracking-wide text-slate-300">
        {label}
        {required ? (
          <span className="ml-1 text-[#ffe700]" aria-hidden="true">
            *
          </span>
        ) : null}
      </span>
      {children}
      {error ? (
        <span className="mt-1.5 block text-xs text-red-300" role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className="mt-1.5 block text-xs text-slate-500">{hint}</span>
      ) : null}
    </label>
  );
}
