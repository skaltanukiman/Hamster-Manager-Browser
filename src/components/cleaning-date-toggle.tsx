"use client";

import { useState } from "react";

type CleaningDateToggleProps = {
  dateLabel: string;
  elapsedLabel: string;
  taskLabel: string;
};

export function CleaningDateToggle({ dateLabel, elapsedLabel, taskLabel }: CleaningDateToggleProps) {
  const [showDate, setShowDate] = useState(false);
  const nextLabel = showDate ? "経過日数" : "日付";
  const optionClass = "flex-1 rounded px-1.5 py-0.5 text-center transition";
  const activeOptionClass = "bg-moss text-white shadow-sm";
  const inactiveOptionClass = "text-slate-500";

  return (
    <button
      type="button"
      aria-label={`${taskLabel}の表示を${nextLabel}に切り替え`}
      className="inline-grid min-w-28 cursor-pointer gap-1 rounded-md border border-slate-200 bg-white p-1 text-right shadow-sm transition hover:border-moss focus:outline-none focus:ring-2 focus:ring-moss/40"
      onClick={() => setShowDate((current) => !current)}
    >
      {/* 初期表示は経過日数にし、クリック/タッチで日付と交互に切り替える。 */}
      <span className="flex rounded bg-slate-100 p-0.5 text-[10px] font-bold leading-none" aria-hidden>
        <span className={`${optionClass} ${showDate ? inactiveOptionClass : activeOptionClass}`}>経過</span>
        <span className={`${optionClass} ${showDate ? activeOptionClass : inactiveOptionClass}`}>日付</span>
      </span>
      <span className="px-1 text-sm font-bold text-ink">{showDate ? dateLabel : elapsedLabel}</span>
    </button>
  );
}
