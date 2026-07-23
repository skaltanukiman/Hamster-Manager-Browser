"use client";

import { useState } from "react";

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
  showEmptyOption?: boolean;
};

export function HamsterSelectorInput({
  mode,
  name,
  options,
  selectedId = "",
  allOptionLabel,
  autoSubmit = true,
  disabled = false,
  emptyMessage = "条件に一致するハムスターはいません",
  showEmptyOption = true
}: HamsterSelectorInputProps) {
  const [previousSelectedId, setPreviousSelectedId] = useState(selectedId);
  const [selectValue, setSelectValue] = useState(selectedId);

  if (previousSelectedId !== selectedId) {
    setPreviousSelectedId(selectedId);
    setSelectValue(selectedId);
  }

  if (mode === "select") {
    const optionsElement = (
      <>
        {allOptionLabel ? <option value="">{allOptionLabel}</option> : null}
        {!allOptionLabel && showEmptyOption ? <option value="">{options.length === 0 ? emptyMessage : "選択してください"}</option> : null}
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
        <select
          name={name}
          value={selectValue}
          disabled={disabled}
          onChange={(event) => setSelectValue(event.currentTarget.value)}
        >
          {optionsElement}
        </select>
      );
    }

    return (
      <AutoSubmitSelect
        name={name}
        value={selectValue}
        disabled={disabled}
        onChange={(event) => setSelectValue(event.currentTarget.value)}
      >
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
