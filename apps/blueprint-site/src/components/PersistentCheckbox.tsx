import { type ChangeEvent, type ComponentProps, useEffect, useState } from "react";
import { Checkbox } from "@sandustry/ui";
import { readStoredBoolean, writeStoredBoolean } from "../utils/storage";

type PersistentCheckboxProps = Omit<ComponentProps<typeof Checkbox>, "checked" | "onChange"> & {
  storageKey: string;
  defaultChecked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  onInitialCheckedChange?: (checked: boolean) => void;
  resetVersion?: number;
};

export function PersistentCheckbox({
  storageKey,
  defaultChecked,
  onCheckedChange,
  onInitialCheckedChange,
  resetVersion,
  ...props
}: PersistentCheckboxProps) {
  const [checked, setChecked] = useState(() => readStoredBoolean(storageKey, defaultChecked));

  useEffect(() => {
    onInitialCheckedChange?.(checked);
  }, []);

  useEffect(() => {
    if (resetVersion === undefined) return;
    setChecked(defaultChecked);
  }, [defaultChecked, resetVersion]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextChecked = event.target.checked;
    setChecked(nextChecked);
    writeStoredBoolean(storageKey, nextChecked);
    onCheckedChange?.(nextChecked);
  };

  return <Checkbox {...props} checked={checked} onChange={handleChange} />;
}
