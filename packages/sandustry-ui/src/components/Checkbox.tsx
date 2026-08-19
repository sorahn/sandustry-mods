import type { InputHTMLAttributes, ReactNode } from "react";
import cx from "clsx";
import styles from "../styles/checkbox.module.css";

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
        styles.checkbox,
        size === "small" && styles.small,
        boxed && styles.boxed,
        className,
      )}
    >
      {label ? <span className={styles.label}>{label}</span> : null}
      <input {...props} type="checkbox" className={styles.input} />
    </label>
  );
}
