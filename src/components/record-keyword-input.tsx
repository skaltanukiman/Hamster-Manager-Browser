"use client";

import { Search } from "lucide-react";
import { useId, useMemo, useState, type FocusEvent, type MouseEvent } from "react";

import { normalizeSearchText } from "@/lib/search";

function getLastSeparatorIndex(value: string) {
  return Math.max(value.lastIndexOf(","), value.lastIndexOf("，"), value.lastIndexOf("、"));
}

function getActiveTagQuery(value: string) {
  const segment = value.slice(getLastSeparatorIndex(value) + 1).trimStart().normalize("NFKC");
  return segment.startsWith("#") ? segment.slice(1).trim() : null;
}

function replaceActiveTag(value: string, tag: string, maxLength: number) {
  const separatorIndex = getLastSeparatorIndex(value);
  const prefix = value.slice(0, separatorIndex + 1);
  const segment = value.slice(separatorIndex + 1);
  const leadingWhitespace = segment.match(/^\s*/)?.[0] ?? "";
  return `${prefix}${leadingWhitespace}#${tag}`.slice(0, maxLength);
}

export function RecordKeywordInput({
  name,
  defaultValue,
  tagSuggestions,
  maxLength = 100
}: {
  name: string;
  defaultValue: string;
  tagSuggestions: string[];
  maxLength?: number;
}) {
  const listboxId = useId();
  const [inputState, setInputState] = useState(() => ({ sourceValue: defaultValue, value: defaultValue }));
  const inputValue = inputState.sourceValue === defaultValue ? inputState.value : defaultValue;
  const [isOpen, setIsOpen] = useState(false);
  const activeTagQuery = getActiveTagQuery(inputValue);
  const filteredTags = useMemo(() => {
    if (activeTagQuery === null) return [];
    const normalizedQuery = normalizeSearchText(activeTagQuery);
    if (!normalizedQuery) return tagSuggestions;
    return tagSuggestions.filter((tag) => normalizeSearchText(tag).includes(normalizedQuery));
  }, [activeTagQuery, tagSuggestions]);

  function setInputValue(value: string) {
    setInputState({ sourceValue: defaultValue, value });
  }

  function selectTag(tag: string, form: HTMLFormElement | null) {
    setInputValue(replaceActiveTag(inputValue, tag, maxLength));
    setIsOpen(false);
    setTimeout(() => form?.requestSubmit(), 0);
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) setIsOpen(false);
  }

  return (
    <div className="relative" onBlur={handleBlur}>
      <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
      <input
        name={name}
        value={inputValue}
        maxLength={maxLength}
        placeholder="症状、診断、薬、タイトル、#タグなど"
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isOpen && activeTagQuery !== null}
        aria-controls={listboxId}
        className="w-full pl-9"
        onFocus={() => setIsOpen(getActiveTagQuery(inputValue) !== null)}
        onChange={(event) => {
          setInputValue(event.currentTarget.value);
          setIsOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && activeTagQuery !== null && filteredTags[0]) {
            event.preventDefault();
            selectTag(filteredTags[0], event.currentTarget.form);
          }
          if (event.key === "Escape") setIsOpen(false);
        }}
      />
      {isOpen && activeTagQuery !== null ? (
        <div id={listboxId} role="listbox" className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-md border border-slate-200 bg-white p-1 shadow-lg">
          {filteredTags.length > 0 ? (
            filteredTags.map((tag) => (
              <button
                key={tag}
                type="button"
                role="option"
                aria-selected={false}
                onMouseDown={(event: MouseEvent<HTMLButtonElement>) => event.preventDefault()}
                onClick={(event) => selectTag(tag, event.currentTarget.form)}
                className="block w-full rounded-md px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                #{tag}
              </button>
            ))
          ) : (
            <p className="px-3 py-2 text-sm text-slate-500">一致する使用済みタグはありません。</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
