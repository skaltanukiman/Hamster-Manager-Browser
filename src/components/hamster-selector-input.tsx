import type { HamsterSelectorMode } from "@/lib/dashboard-settings";

import { AutoSubmitSelect } from "@/components/auto-submit-select";
import { HamsterCombobox, type HamsterComboboxOption } from "@/components/hamster-combobox";

type HamsterSelectorInputProps = {
  mode: HamsterSelectorMode;
  name: string;
  options: HamsterComboboxOption[];
  selectedId?: string;
  allOptionLabel?: string;
  disabled?: boolean;
  emptyMessage?: string;
};

export function HamsterSelectorInput({
  mode,
  name,
  options,
  selectedId = "",
  allOptionLabel,
  disabled = false,
  emptyMessage = "条件に一致するハムスターはいません"
}: HamsterSelectorInputProps) {
  if (mode === "select") {
    return (
      <AutoSubmitSelect name={name} defaultValue={selectedId} disabled={disabled}>
        {allOptionLabel ? <option value="">{allOptionLabel}</option> : null}
        {!allOptionLabel ? <option value="">{options.length === 0 ? emptyMessage : "選択してください"}</option> : null}
        {options.map((hamster) => (
          <option key={hamster.id} value={hamster.id}>
            {hamster.name}
            {hamster.isActive ? "" : "（管理外）"}
          </option>
        ))}
      </AutoSubmitSelect>
    );
  }

  return (
    <HamsterCombobox
      name={name}
      selectedId={selectedId}
      options={options}
      allOptionLabel={allOptionLabel}
      disabled={disabled}
      emptyMessage={emptyMessage}
    />
  );
}
