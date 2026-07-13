import type { HamsterSelectorMode } from "@/lib/dashboard-settings";

import { AutoSubmitSelect } from "@/components/auto-submit-select";
import { HamsterCombobox, type HamsterComboboxOption } from "@/components/hamster-combobox";

type HamsterSelectorInputProps = {
  mode: HamsterSelectorMode;
  name: string;
  options: HamsterComboboxOption[];
  selectedId?: string;
  allOptionLabel?: string;
  autoSubmit?: boolean;
  disabled?: boolean;
  emptyMessage?: string;
};

export function HamsterSelectorInput({
  mode,
  name,
  options,
  selectedId = "",
  allOptionLabel,
  autoSubmit = true,
  disabled = false,
  emptyMessage = "条件に一致するハムスターはいません"
}: HamsterSelectorInputProps) {
  if (mode === "select") {
    const optionsElement = (
      <>
        {allOptionLabel ? <option value="">{allOptionLabel}</option> : null}
        {!allOptionLabel ? <option value="">{options.length === 0 ? emptyMessage : "選択してください"}</option> : null}
        {options.map((hamster) => (
          <option key={hamster.id} value={hamster.id}>
            {hamster.name}
            {hamster.isActive ? "" : "（管理外）"}
          </option>
        ))}
      </>
    );

    if (!autoSubmit) {
      return (
        <select name={name} defaultValue={selectedId} disabled={disabled}>
          {optionsElement}
        </select>
      );
    }

    return (
      <AutoSubmitSelect name={name} defaultValue={selectedId} disabled={disabled}>
        {optionsElement}
      </AutoSubmitSelect>
    );
  }

  return (
    <HamsterCombobox
      name={name}
      selectedId={selectedId}
      options={options}
      allOptionLabel={allOptionLabel}
      autoSubmit={autoSubmit}
      disabled={disabled}
      emptyMessage={emptyMessage}
    />
  );
}
