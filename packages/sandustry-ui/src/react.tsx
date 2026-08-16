import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  PropsWithChildren,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { createElement } from "react";
import { defineSandustryUI } from "./index";

defineSandustryUI();

type PanelProps = PropsWithChildren<HTMLAttributes<HTMLElement>> & { title?: string };
type ButtonProps = PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>> & {
  accent?: boolean;
};
type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;
type SelectProps = PropsWithChildren<SelectHTMLAttributes<HTMLSelectElement>>;

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

export function TextArea({ className = "", ...props }: TextAreaProps) {
  return createElement("textarea", { className: `sd-textarea ${className}`, ...props });
}

export function Select({ className = "", children, ...props }: SelectProps) {
  return createElement(
    "span",
    { className: "sd-select-wrap" },
    createElement("select", { className: `sd-select ${className}`, ...props }, children),
  );
}
