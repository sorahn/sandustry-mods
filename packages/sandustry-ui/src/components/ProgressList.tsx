import type { HTMLAttributes, PropsWithChildren } from "react";
import cx from "clsx";

export type ProgressListProps = PropsWithChildren<HTMLAttributes<HTMLDivElement>> & {
  height?: string;
};

export function ProgressList({
  height = "120px",
  className = "",
  children,
  ...props
}: ProgressListProps) {
  return (
    <div
      {...props}
      role={props.role ?? "list"}
      className={cx(
        "relative overflow-y-auto rounded border border-slate-200/20 bg-black/30 p-4 pr-5 text-left text-sm leading-[1.8] text-white/75",
        "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
      style={{ ...props.style, height }}
    >
      {children}
    </div>
  );
}

export type ProgressListItemVariant = "default" | "active" | "substep";

export type ProgressListItemProps = PropsWithChildren<HTMLAttributes<HTMLDivElement>> & {
  variant?: ProgressListItemVariant;
  last?: boolean;
};

export function ProgressListItem({
  variant = "default",
  last = false,
  className = "",
  children,
  ...props
}: ProgressListItemProps) {
  return (
    <div
      {...props}
      role={props.role ?? "listitem"}
      className={cx(
        "relative mb-2 pl-5 font-medium opacity-0 [animation:sd-progress-item-fade-in_0.5s_ease-out_forwards]",
        variant === "active" && "text-[#ffe700] [text-shadow:0_0_10px_rgba(255,231,0,0.5)]",
        variant === "substep" && "mb-1 text-[13px] font-normal text-white/75",
        last && "mb-0",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cx(
          "absolute left-0 w-4 text-center font-bold text-[#ffe700]",
          variant === "substep"
            ? last
              ? "text-sm [animation:sd-progress-marker-slide_1.5s_ease-in-out_infinite]"
              : "text-sm"
            : "text-base [animation:sd-progress-marker-pulse_2s_ease-in-out_infinite]",
          variant === "active" && "[animation:none] [text-shadow:0_0_10px_rgba(255,231,0,0.5)]",
          variant === "substep" && !last && "before:content-['•']",
          variant === "substep" && last && "before:content-['→']",
          variant !== "substep" && "before:content-['▸']",
        )}
      />
      {children}
    </div>
  );
}
