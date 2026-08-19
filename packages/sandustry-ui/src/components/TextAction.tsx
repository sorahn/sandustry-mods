import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  PropsWithChildren,
  ReactNode,
} from "react";
import cx from "clsx";

type SharedTextActionProps = {
  icon?: ReactNode;
  className?: string;
};

export type TextActionProps = PropsWithChildren<SharedTextActionProps> &
  (
    | ({ as?: "button" } & ButtonHTMLAttributes<HTMLButtonElement>)
    | ({ as: "a" } & AnchorHTMLAttributes<HTMLAnchorElement>)
  );

export function TextAction({
  as = "button",
  icon,
  className = "",
  children,
  ...props
}: TextActionProps) {
  const classes = cx(
    "inline-flex items-center gap-1.5 whitespace-nowrap text-sm text-white/85 transition-colors hover:text-[#ffe700] focus-visible:outline-2 focus-visible:outline-[#ffe700] focus-visible:outline-offset-2",
    className,
  );

  if (as === "a") {
    return (
      <a {...(props as AnchorHTMLAttributes<HTMLAnchorElement>)} className={classes}>
        {icon}
        {children}
      </a>
    );
  }

  return (
    <button
      {...(props as ButtonHTMLAttributes<HTMLButtonElement>)}
      type={(props as ButtonHTMLAttributes<HTMLButtonElement>).type ?? "button"}
      className={classes}
    >
      {icon}
      {children}
    </button>
  );
}
