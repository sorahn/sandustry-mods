import type { InputHTMLAttributes } from "react";
import cx from "clsx";

export type TextInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  tone?: "default" | "accent";
  monospace?: boolean;
};

export function TextInput({
  tone = "default",
  monospace = false,
  className = "",
  ...props
}: TextInputProps) {
  return (
    <input
      {...props}
      type="text"
      className={cx(
        "h-[38px] min-w-0 flex-1 rounded-sm border border-slate-600 bg-black/60 px-3 text-sm tracking-wide text-white outline-none transition-colors focus:border-[#ffe700]",
        tone === "accent" && "text-[#f5a623]",
        monospace && "font-mono",
        className,
      )}
    />
  );
}
