import type { HTMLAttributes, PropsWithChildren } from "react";
import cx from "clsx";

export type InputGroupProps = PropsWithChildren<HTMLAttributes<HTMLDivElement>>;

export function InputGroup({ className = "", children, ...props }: InputGroupProps) {
  return (
    <div {...props} className={cx("flex items-center gap-2", className)}>
      {children}
    </div>
  );
}
