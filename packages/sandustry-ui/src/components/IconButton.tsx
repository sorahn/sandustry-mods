import type { ButtonHTMLAttributes, ReactNode } from "react";
import cx from "clsx";

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  size?: "small" | "default" | "large";
  children: ReactNode;
};

export function IconButton({
  label,
  size = "default",
  className = "",
  children,
  ...props
}: IconButtonProps) {
  return (
    <button
      {...props}
      type="button"
      aria-label={label}
      title={props.title ?? label}
      className={cx(
        "inline-flex shrink-0 items-center justify-center rounded text-slate-400 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-yellow-300 focus-visible:outline-offset-2",
        size === "small" && "h-6 w-6 text-xs",
        size === "default" && "h-8 w-8 text-sm",
        size === "large" && "h-10 w-10 text-lg",
        props.disabled && "cursor-not-allowed opacity-40 hover:text-slate-400",
        className,
      )}
    >
      {children}
    </button>
  );
}
