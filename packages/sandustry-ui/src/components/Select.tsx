import type { PropsWithChildren, SelectHTMLAttributes } from "react";
import cx from "clsx";
import styles from "../styles/select.module.css";

export function Select({
  className = "",
  children,
  ...props
}: PropsWithChildren<SelectHTMLAttributes<HTMLSelectElement>>) {
  return (
    <span className={styles.selectWrap}>
      <select className={cx(styles.select, className)} {...props}>
        {children}
      </select>
    </span>
  );
}
