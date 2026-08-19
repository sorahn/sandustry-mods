import type { FieldsetHTMLAttributes, PropsWithChildren, ReactNode } from "react";
import cx from "clsx";

export type FieldsetProps = PropsWithChildren<FieldsetHTMLAttributes<HTMLFieldSetElement>> & {
  legend?: ReactNode;
};

export function Fieldset({ legend, className = "", children, ...props }: FieldsetProps) {
  return (
    <fieldset
      {...props}
      className={cx(
        "relative rounded-tr-lg rounded-bl-lg border border-dashed border-slate-600 p-4",
        className,
      )}
    >
      {legend ? (
        <legend className="mb-2 block text-xs uppercase tracking-widest text-slate-300">
          {legend}
        </legend>
      ) : null}
      {children}
    </fieldset>
  );
}
