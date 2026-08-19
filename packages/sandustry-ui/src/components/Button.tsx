import type { ButtonHTMLAttributes, PropsWithChildren } from "react";
import cx from "clsx";
import styles from "../styles/button.module.css";

export const buttonStyles = {
  button:
    "relative left-0 min-h-[var(--sd-control-height)] overflow-hidden rounded-[0_var(--sd-button-radius)_0_var(--sd-button-radius)] border px-2.5 py-1.5 text-[11px] font-normal transition-[border-color,left] duration-1000 ease-in-out",
  default: "border-slate-200 bg-black text-white",
  accent: "border-yellow-300/50 bg-yellow-300/10 text-yellow-300",
  danger: "border-red-400 bg-black text-white",
  compact: "min-h-0 px-1.5 py-0.75 text-[10px]",
  noShift: styles.noShift,
};

export type ButtonProps = PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>> & {
  accent?: boolean;
  variant?: "default" | "accent" | "danger";
};

export function Button({
  accent = false,
  variant,
  className = "",
  children,
  ...props
}: ButtonProps) {
  const buttonVariant = variant ?? (accent ? "accent" : "default");
  const variantClassName =
    buttonVariant === "accent"
      ? buttonStyles.accent
      : buttonVariant === "danger"
        ? buttonStyles.danger
        : buttonStyles.default;
  return (
    <button
      className={cx(buttonStyles.button, styles.effects, variantClassName, className)}
      {...props}
    >
      {children}
    </button>
  );
}
