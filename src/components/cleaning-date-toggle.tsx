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

  return (
    <button
      type="button"
      aria-label={`${taskLabel}の表示を${nextLabel}に切り替え`}
      className="rounded px-1 py-0.5 text-right font-bold text-ink hover:bg-white focus:outline-none focus:ring-2 focus:ring-moss/40"
      onClick={() => setShowDate((current) => !current)}
    >
      {/* 初期表示は経過日数にし、クリック/タッチで日付と交互に切り替える。 */}
      {showDate ? dateLabel : elapsedLabel}
    </button>
  );
}
