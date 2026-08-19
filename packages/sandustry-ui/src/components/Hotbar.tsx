import type { ButtonHTMLAttributes, ReactNode } from "react";
import cx from "clsx";

export type HotbarSlot = {
  id: string;
  label?: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
};

export type HotbarProps = {
  slots: readonly HotbarSlot[];
  selectedId?: string;
  onSelect?: (slot: HotbarSlot) => void;
  className?: string;
};

export function Hotbar({ slots, selectedId, onSelect, className = "" }: HotbarProps) {
  return (
    <div className={cx("flex gap-2", className)} role="toolbar" aria-label="Hotbar">
      {slots.map((slot, index) => (
        <button
          key={slot.id}
          type="button"
          disabled={slot.disabled}
          aria-label={typeof slot.label === "string" ? slot.label : slot.id}
          aria-pressed={slot.id === selectedId}
          onClick={() => onSelect?.(slot)}
          className={cx(
            "relative flex h-16 w-16 items-center justify-center border text-white shadow-md ring-2 ring-inset ring-black transition-colors active:brightness-125",
            slot.id === selectedId
              ? "border-[#ffe700] bg-[#ffe700]/10"
              : "border-slate-200/25 hover:border-slate-200/50",
            slot.disabled && "cursor-not-allowed opacity-40",
          )}
        >
          <span className="absolute left-0 top-0 z-10 rounded-br bg-black/50 px-1 text-xs text-white">
            {index + 1}
          </span>
          {slot.icon}
        </button>
      ))}
    </div>
  );
}

export type HotbarStepperProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> & {
  onChange?: (direction: "previous" | "next") => void;
};

export function HotbarStepper({ onChange, className = "", ...props }: HotbarStepperProps) {
  return (
    <div
      className={cx(
        "flex h-16 w-5 flex-col overflow-hidden rounded border border-slate-700/50 bg-slate-900/90 shadow-lg",
        className,
      )}
    >
      <button
        {...props}
        type="button"
        className="flex-1 text-[8px] text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        onClick={() => onChange?.("previous")}
      >
        ▲
      </button>
      <button
        {...props}
        type="button"
        className="flex-1 border-t border-slate-700/50 text-[8px] text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        onClick={() => onChange?.("next")}
      >
        ▼
      </button>
    </div>
  );
}
