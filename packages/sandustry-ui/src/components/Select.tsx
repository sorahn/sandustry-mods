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
      <select
        className={cx(
          "min-h-[var(--sd-control-height)] appearance-none rounded-[var(--sd-radius)_0_var(--sd-radius)_0] border border-slate-700 bg-black/70 px-2.5 py-1.5 pr-5 font-mono text-[11px] leading-normal text-slate-200 focus:border-slate-500 focus:outline-2 focus:outline-yellow-300 focus:outline-offset-2",
          className,
        )}
        {...props}
      >
        {children}
      </select>
    </span>
  );
}
