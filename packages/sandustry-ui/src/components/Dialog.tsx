import type { HTMLAttributes, ReactNode } from "react";
import cx from "clsx";

export type DialogProps = Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  open?: boolean;
  title?: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  onClose?: () => void;
  closeOnBackdrop?: boolean;
};

export function Dialog({
  open = false,
  title,
  header,
  footer,
  onClose,
  closeOnBackdrop = true,
  className = "",
  children,
  ...props
}: DialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        {...props}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        className={cx(
          "flex max-h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded border border-slate-700 bg-black/90 text-white shadow-xl",
          className,
        )}
      >
        {header || title || onClose ? (
          <div className="flex shrink-0 items-center justify-between border-b border-slate-700/40 px-5 pb-3 pt-4">
            {header ?? <h2 className="text-lg font-bold tracking-wide">{title}</h2>}
            {onClose ? (
              <button
                type="button"
                aria-label="Close dialog"
                className="text-lg leading-none text-slate-500 transition-colors hover:text-white"
                onClick={onClose}
              >
                ×
              </button>
            ) : null}
          </div>
        ) : null}
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer ? (
          <div className="flex shrink-0 border-t border-slate-700/40 px-4 py-3">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
