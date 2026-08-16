import type { ButtonHTMLAttributes, HTMLAttributes, PropsWithChildren } from "react";
import { createElement } from "react";
import { defineSandustryUI } from "./index";

defineSandustryUI();

type PanelProps = PropsWithChildren<HTMLAttributes<HTMLElement>> & { title?: string };
type ButtonProps = PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>> & {
  accent?: boolean;
};

export function Panel({ title, className = "", children, ...props }: PanelProps) {
  return createElement("sd-panel", { title, class: className, ...props }, children);
}

export function Button({ accent = false, className = "", children, ...props }: ButtonProps) {
  return createElement(
    "sd-button",
    { accent: accent ? "" : undefined, class: className, ...props },
    children,
  );
}
