import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  PropsWithChildren,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { createElement, useState } from "react";
import { defineSandustryUI } from "./index";

defineSandustryUI();

type PanelProps = PropsWithChildren<HTMLAttributes<HTMLElement>> & {
  header?: ReactNode;
  title?: ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
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

export function Panel({
  header,
  title,
  collapsible = false,
  defaultCollapsed = false,
  className = "",
  children,
  ...props
}: PanelProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const panelHeader =
    header || (collapsible && title)
      ? createElement(
          "div",
          { className: "sd-panel__header" },
          collapsible
            ? createElement(
                "button",
                {
                  type: "button",
                  className: "sd-panel__toggle",
                  onClick: () => setCollapsed((value) => !value),
                  "aria-expanded": !collapsed,
                },
                createElement(
                  "svg",
                  {
                    className: `sd-panel__caret${collapsed ? " sd-panel__caret--collapsed" : ""}`,
                    viewBox: "0 0 12 12",
                    fill: "none",
                    "aria-hidden": "true",
                  },
                  createElement("path", {
                    d: "M2.5 4.5L6 8l3.5-3.5",
                    stroke: "currentColor",
                    "stroke-width": "1.5",
                    "stroke-linecap": "round",
                    "stroke-linejoin": "round",
                  }),
                ),
                createElement("span", { className: "sd-label" }, title),
              )
            : createElement("span", { className: "sd-label" }, title),
          header,
        )
      : null;
  return createElement(
    "sd-panel",
    {
      title: header ? undefined : title,
      "data-panel-header": panelHeader ? "true" : undefined,
      class: className,
      ...props,
    },
    panelHeader,
    collapsed ? null : children,
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
    label ? createElement("span", { className: "sd-checkbox__label" }, label) : null,
    createElement("input", { ...props, type: "checkbox", className: "sd-checkbox__input" }),
  );
}
