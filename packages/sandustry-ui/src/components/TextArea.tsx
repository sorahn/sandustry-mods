import type { TextareaHTMLAttributes } from "react";
import cx from "clsx";
import styles from "../styles/textarea.module.css";

export function TextArea({
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(styles.textarea, className)} {...props} />;
}
