import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  PropsWithChildren,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { createElement } from "react";
import { defineSandustryUI } from "./index";

defineSandustryUI();

type PanelProps = PropsWithChildren<HTMLAttributes<HTMLElement>> & {
  header?: ReactNode;
  title?: string;
};
type ButtonProps = PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>> & {
  accent?: boolean;
};
type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;
type SelectProps = PropsWithChildren<SelectHTMLAttributes<HTMLSelectElement>>;
type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "type"> & {
  boxed?: boolean;
  label?: ReactNode;
  size?: "default" | "small";
};

export function Panel({ header, title, className = "", children, ...props }: PanelProps) {
  const panelHeader = header
    ? createElement(
        "div",
        { className: "sd-panel__header" },
        createElement("span", { className: "sd-label" }, title),
        header,
      )
    : null;
  return createElement(
    "sd-panel",
    {
      title: header ? undefined : title,
      "data-panel-header": header ? "true" : undefined,
      class: className,
      ...props,
    },
    panelHeader,
    children,
  );
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

export function Checkbox({
  boxed = false,
  className = "",
  label,
  size = "default",
  ...props
}: CheckboxProps) {
  return createElement(
    "label",
    {
      className: `sd-checkbox${size === "small" ? " sd-checkbox--small" : ""}${boxed ? " sd-checkbox--boxed" : ""} ${className}`,
    },
    createElement("input", { ...props, type: "checkbox", className: "sd-checkbox__input" }),
    label ? createElement("span", { className: "sd-checkbox__label" }, label) : null,
  );
}
