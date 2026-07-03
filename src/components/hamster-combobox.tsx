"use client";

import { ChevronDown, Search } from "lucide-react";
import type { FocusEvent } from "react";
import { useId, useMemo, useRef, useState } from "react";

import { normalizeSearchText } from "@/lib/search";

export type HamsterComboboxOption = {
  id: string;
  name: string;
  isActive: boolean;
};

type HamsterComboboxProps = {
  name: string;
  options: HamsterComboboxOption[];
  selectedId?: string;
  allOptionLabel?: string;
  autoSubmit?: boolean;
  disabled?: boolean;
  emptyMessage?: string;
  placeholder?: string;
};

type InternalOption = HamsterComboboxOption & {
  isAllOption?: boolean;
  normalizedName: string;
};

export function HamsterCombobox({
  name,
  options,
  selectedId = "",
  allOptionLabel,
  autoSubmit = true,
  disabled = false,
  emptyMessage = "候補がありません",
  placeholder = "ハムスター名で検索"
}: HamsterComboboxProps) {
  const listboxId = useId();
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const comboboxOptions = useMemo<InternalOption[]>(() => {
    const baseOptions: Array<HamsterComboboxOption & { isAllOption?: boolean }> = allOptionLabel
      ? [{ id: "", name: allOptionLabel, isActive: true, isAllOption: true }, ...options]
      : options;

    // 入力文字と候補名を同じ形に寄せ、ひらがな・カタカナの違いを検索時に吸収する。
    return baseOptions.map((option) => ({
      ...option,
      normalizedName: normalizeSearchText(option.name)
    }));
  }, [allOptionLabel, options]);
  const selectedOption = comboboxOptions.find((option) => option.id === selectedId) ?? null;
  const [inputValue, setInputValue] = useState(selectedOption?.name ?? "");
  const [selectedValue, setSelectedValue] = useState(selectedOption?.id ?? "");
  const [isOpen, setIsOpen] = useState(false);
  const currentSelectedOption = comboboxOptions.find((option) => option.id === selectedValue) ?? null;
  const normalizedInputValue = normalizeSearchText(inputValue);
  const filteredOptions =
    normalizedInputValue.length > 0
      ? comboboxOptions.filter((option) => option.normalizedName.includes(normalizedInputValue))
      : comboboxOptions;

  function syncHiddenInput(value: string) {
    if (hiddenInputRef.current) {
      hiddenInputRef.current.value = value;
    }
  }

  function submitForm() {
    hiddenInputRef.current?.form?.requestSubmit();
  }

  function selectOption(option: InternalOption, shouldSubmit = true) {
    setInputValue(option.name);
    setSelectedValue(option.id);
    setIsOpen(false);
    syncHiddenInput(option.id);

    if (shouldSubmit && autoSubmit) {
      submitForm();
    }
  }

  function findExactOption(value: string) {
    const normalizedValue = normalizeSearchText(value);
    return normalizedValue.length > 0
      ? comboboxOptions.find((option) => option.normalizedName === normalizedValue) ?? null
      : comboboxOptions.find((option) => option.id === "") ?? null;
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    if (containerRef.current?.contains(event.relatedTarget)) {
      return;
    }

    const exactOption = findExactOption(inputValue);
    if (exactOption) {
      selectOption(exactOption, exactOption.id !== selectedValue);
      return;
    }

    setInputValue(currentSelectedOption?.name ?? "");
    setIsOpen(false);
  }

  return (
    <div ref={containerRef} className="relative" onBlur={handleBlur}>
      <input ref={hiddenInputRef} type="hidden" name={name} value={selectedValue} readOnly />
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
      <input
        type="search"
        value={inputValue}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        className="pl-9 pr-10"
        role="combobox"
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-autocomplete="list"
        onFocus={() => setIsOpen(!disabled)}
        onChange={(event) => {
          setInputValue(event.currentTarget.value);
          setIsOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            const option = findExactOption(inputValue) ?? filteredOptions[0];

            if (option) {
              event.preventDefault();
              selectOption(option);
            }
          }

          if (event.key === "Escape") {
            setIsOpen(false);
          }
        }}
      />
      <button
        type="button"
        disabled={disabled}
        aria-label="候補を開く"
        className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setIsOpen((current) => !disabled && !current)}
      >
        <ChevronDown className="h-4 w-4" aria-hidden />
      </button>

      {isOpen && !disabled ? (
        <div
          id={listboxId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg"
        >
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-slate-500">{emptyMessage}</div>
          ) : (
            filteredOptions.map((option) => (
              <button
                key={option.isAllOption ? "all" : option.id}
                type="button"
                role="option"
                aria-selected={selectedValue === option.id}
                className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                  selectedValue === option.id ? "bg-slate-100 text-ink" : "text-slate-700"
                }`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectOption(option)}
              >
                <span className="min-w-0 truncate font-medium">{option.name}</span>
                {!option.isAllOption && !option.isActive ? (
                  <span className="shrink-0 rounded-md bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600">
                    管理外
                  </span>
                ) : null}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
