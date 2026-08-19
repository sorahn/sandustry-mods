import type { HTMLAttributes, PropsWithChildren, ReactNode } from "react";
import cx from "clsx";

export type SplitPaneProps = PropsWithChildren<HTMLAttributes<HTMLDivElement>> & {
  sidebar: ReactNode;
  sidebarClassName?: string;
  contentClassName?: string;
  sidebarPosition?: "start" | "end";
};

export function SplitPane({
  sidebar,
  sidebarClassName = "",
  contentClassName = "",
  sidebarPosition = "start",
  className = "",
  children,
  ...props
}: SplitPaneProps) {
  const sidebarNode = (
    <aside
      className={cx(
        "flex min-h-0 w-52 shrink-0 flex-col border-slate-700/40 bg-slate-900/20",
        sidebarPosition === "start" ? "border-r" : "border-l",
        sidebarClassName,
      )}
    >
      {sidebar}
    </aside>
  );

  return (
    <div {...props} className={cx("flex min-h-0", className)}>
      {sidebarPosition === "start" ? sidebarNode : null}
      <main className={cx("flex min-h-0 min-w-0 flex-1 flex-col", contentClassName)}>
        {children}
      </main>
      {sidebarPosition === "end" ? sidebarNode : null}
    </div>
  );
}
