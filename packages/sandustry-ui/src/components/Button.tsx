import type { ButtonHTMLAttributes, PropsWithChildren } from "react";
import cx from "clsx";
import styles from "../styles/button.module.css";

export const buttonStyles = styles;

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
  return (
    <button
      className={cx(
        styles.button,
        buttonVariant === "accent" && styles.accent,
        buttonVariant === "danger" && styles.danger,
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
