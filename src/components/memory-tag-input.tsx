"use client";

import { useRef, useState } from "react";

import { MEMORY_TAG_SUGGESTIONS } from "@/lib/records";
import { normalizeSearchText } from "@/lib/search";

const separatorPattern = /[、,]/;

function splitTags(value: string) {
  return value.split(separatorPattern).map((tag) => tag.trim()).filter(Boolean);
}

function dedupeTags(tags: readonly string[]) {
  const byNormalizedName = new Map<string, string>();
  for (const tag of tags) {
    const normalized = normalizeSearchText(tag);
    if (normalized && !byNormalizedName.has(normalized)) byNormalizedName.set(normalized, tag);
  }
  return Array.from(byNormalizedName.values());
}

export function MemoryTagInput({ savedTags }: { savedTags: string[] }) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const enteredTagNames = new Set(splitTags(value).map(normalizeSearchText));
  const reusableTags = dedupeTags(savedTags);
  const initialSuggestions = dedupeTags(MEMORY_TAG_SUGGESTIONS).filter(
    (tag) => !new Set(reusableTags.map(normalizeSearchText)).has(normalizeSearchText(tag))
  );

  function addTag(tag: string) {
    const currentTags = splitTags(value);
    if (currentTags.length >= 20 || enteredTagNames.has(normalizeSearchText(tag))) return;
    const input = inputRef.current;
    setValue([...currentTags, tag].join("、"));
    window.setTimeout(() => input?.dispatchEvent(new Event("input", { bubbles: true })), 0);
  }

  function tagButtons(tags: readonly string[]) {
    return tags.map((tag) => {
      const selected = enteredTagNames.has(normalizeSearchText(tag));
      return (
        <button
          key={tag}
          type="button"
          onClick={() => addTag(tag)}
          disabled={selected}
          aria-pressed={selected}
          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-moss hover:text-moss disabled:border-moss/30 disabled:bg-moss/10 disabled:text-moss"
        >
          {tag}
        </button>
      );
    });
  }

  return (
    <div className="grid gap-3">
      <label className="grid gap-1 text-sm font-medium text-slate-700">
        タグ（「、」またはカンマ区切り・最大20件）
        <input
          ref={inputRef}
          name="tags"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          maxLength={619}
          placeholder={MEMORY_TAG_SUGGESTIONS.slice(0, 4).join("、")}
        />
      </label>
      <details className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
        <summary className="cursor-pointer text-xs font-medium text-slate-700 select-none">保存済みタグ（{reusableTags.length}件）</summary>
        <div className="mt-3">
          {reusableTags.length > 0 ? <div className="flex flex-wrap gap-2">{tagButtons(reusableTags)}</div> : <span className="text-xs text-slate-500">保存済みタグはありません。</span>}
        </div>
      </details>
      <div className="grid gap-2">
        <span className="text-xs font-medium text-slate-600">候補</span>
        <div className="flex flex-wrap gap-2">{tagButtons(initialSuggestions)}</div>
      </div>
      <label className="flex items-start gap-2 text-sm font-medium text-slate-700">
        <input type="checkbox" name="saveTags" value="true" className="mt-0.5" />
        <span>入力したタグを保存して再利用する<span className="mt-0.5 block text-xs font-normal text-slate-500">思い出の保存と同時に、区切られたタグを1件ずつ保存します。</span></span>
      </label>
    </div>
  );
}
