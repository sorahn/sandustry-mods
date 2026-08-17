import { type ChangeEvent, type ComponentProps, useEffect, useState } from "react";
import { Checkbox } from "@sandustry/ui/react";

function readStoredBoolean(key: string, fallback: boolean) {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = window.localStorage.getItem(key);
    return stored === null ? fallback : stored !== "false";
  } catch {
    return fallback;
  }
}

function writeStoredBoolean(key: string, value: boolean) {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // Local storage can be unavailable in private browsing contexts.
  }
}

type PersistentCheckboxProps = Omit<ComponentProps<typeof Checkbox>, "checked" | "onChange"> & {
  storageKey: string;
  defaultChecked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  onInitialCheckedChange?: (checked: boolean) => void;
};

export function PersistentCheckbox({
  storageKey,
  defaultChecked,
  onCheckedChange,
  onInitialCheckedChange,
  ...props
}: PersistentCheckboxProps) {
  const [checked, setChecked] = useState(() => readStoredBoolean(storageKey, defaultChecked));

  useEffect(() => {
    onInitialCheckedChange?.(checked);
  }, []);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextChecked = event.target.checked;
    setChecked(nextChecked);
    writeStoredBoolean(storageKey, nextChecked);
    onCheckedChange?.(nextChecked);
  };

  return <Checkbox {...props} checked={checked} onChange={handleChange} />;
}
