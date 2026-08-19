import type { TextareaHTMLAttributes } from "react";
import cx from "clsx";

export function TextArea({
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cx(
        "min-h-80 w-full resize-y rounded border border-slate-700 bg-black/70 p-3 font-mono text-xs leading-6 text-slate-200 placeholder:text-slate-600 focus:border-slate-500 focus:outline-2 focus:outline-yellow-300 focus:outline-offset-2",
        className,
      )}
      {...props}
    />
  );
}
