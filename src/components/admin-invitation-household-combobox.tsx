"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";

import { normalizeSearchText } from "@/lib/search";

type HouseholdOption = {
  id: string;
  name: string;
};

export function AdminInvitationHouseholdCombobox({
  name,
  options,
  defaultValue,
  maxLength
}: {
  name: string;
  options: HouseholdOption[];
  defaultValue: string;
  maxLength: number;
}) {
  const [inputValue, setInputValue] = useState(defaultValue);
  const [isOpen, setIsOpen] = useState(false);
  const listboxId = `${name}-suggestions`;
  const uniqueOptions = useMemo(
    () => Array.from(new Map(options.map((option) => [option.name, option])).values()),
    [options]
  );
  const filteredOptions = useMemo(() => {
    const normalizedInput = normalizeSearchText(inputValue);
    if (!normalizedInput) return uniqueOptions;
    return uniqueOptions.filter((option) => normalizeSearchText(option.name).includes(normalizedInput));
  }, [inputValue, uniqueOptions]);

  return (
    <div
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsOpen(false);
      }}
    >
      <Search
        className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400"
        aria-hidden
      />
      <input
        type="search"
        name={name}
        value={inputValue}
        onChange={(event) => {
          setInputValue(event.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setIsOpen(false);
        }}
        maxLength={maxLength}
        placeholder="共有名を入力"
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        className="w-full pl-9 pr-9"
      />
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="absolute right-1 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
        aria-label="共有名の候補を表示"
        aria-expanded={isOpen}
        aria-controls={listboxId}
      >
        <ChevronDown className="h-4 w-4" aria-hidden />
      </button>
      {isOpen ? (
        <div
          id={listboxId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-md border border-slate-200 bg-white p-1 shadow-lg"
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                role="option"
                aria-selected={option.name === inputValue}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setInputValue(option.name);
                  setIsOpen(false);
                }}
                className="block w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
              >
                {option.name}
              </button>
            ))
          ) : (
            <p className="px-3 py-2 text-sm text-slate-500">一致する共有はありません。</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
