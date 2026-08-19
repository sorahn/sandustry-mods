import type { HTMLAttributes, PropsWithChildren, ReactNode } from "react";
import { useState } from "react";
import cx from "clsx";

export type PanelProps = PropsWithChildren<HTMLAttributes<HTMLElement>> & {
  header?: ReactNode;
  title?: ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  variant?: "default" | "hero";
  contentClassName?: string;
};

export function Panel({
  header,
  title,
  collapsible = false,
  defaultCollapsed = false,
  variant = "default",
  contentClassName = "",
  className = "",
  children,
  ...props
}: PanelProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const panelHeader =
    header || (collapsible && title) ? (
      <div className="box-border flex min-h-[var(--sd-control-height)] items-center justify-between border-b border-slate-800 px-4 py-2">
        {collapsible ? (
          <button
            type="button"
            className="inline-flex items-center gap-2 border-0 bg-transparent p-0 font-inherit text-slate-400 focus-visible:outline-2 focus-visible:outline-yellow-300 focus-visible:outline-offset-3"
            onClick={() => setCollapsed((value) => !value)}
            aria-expanded={!collapsed}
          >
            <svg
              className={cx(
                "h-3 w-3 shrink-0 transition-transform duration-150",
                collapsed && "-rotate-90",
              )}
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
            <span className="text-[11px] text-white/70">{title}</span>
          </button>
        ) : (
          <span className="text-[11px] text-white/70">{title}</span>
        )}
        {header}
      </div>
    ) : null;

  return (
    <section
      className={cx(
        "overflow-hidden border border-slate-700 bg-black/75 shadow-xl",
        variant === "hero"
          ? "rounded-[0_12px] border-slate-500/70 bg-black/[0.92] shadow-[0_28px_64px_rgba(0,0,0,0.56)] outline outline-1 outline-black"
          : "rounded",
        className,
      )}
      {...props}
    >
      {panelHeader}
      {collapsed ? null : <div className={contentClassName}>{children}</div>}
    </section>
  );
}
