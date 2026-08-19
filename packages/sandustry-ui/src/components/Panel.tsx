import type { HTMLAttributes, PropsWithChildren, ReactNode } from "react";
import { useState } from "react";
import cx from "clsx";
import styles from "../styles/panel.module.css";

export type PanelProps = PropsWithChildren<HTMLAttributes<HTMLElement>> & {
  header?: ReactNode;
  title?: ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
};

export function Panel({
  header,
  title,
  collapsible = false,
  defaultCollapsed = false,
  className = "",
  children,
  ...props
}: PanelProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const panelHeader =
    header || (collapsible && title) ? (
      <div className={styles.header}>
        {collapsible ? (
          <button
            type="button"
            className={styles.toggle}
            onClick={() => setCollapsed((value) => !value)}
            aria-expanded={!collapsed}
          >
            <svg
              className={cx(styles.caret, collapsed && styles.caretCollapsed)}
              viewBox="0 0 12 12"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M2.5 4.5L6 8l3.5-3.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className={styles.label}>{title}</span>
          </button>
        ) : (
          <span className={styles.label}>{title}</span>
        )}
        {header}
      </div>
    ) : null;

  return (
    <section className={cx(styles.panel, className)} {...props}>
      {panelHeader}
      {collapsed ? null : children}
    </section>
  );
}
