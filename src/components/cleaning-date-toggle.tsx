"use client";

import { Repeat2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const FEEDBACK_DURATION_MS = 1200;

type CleaningDateToggleProps = {
  dateLabel: string;
  elapsedLabel: string;
  taskLabel: string;
};

export function CleaningDateToggle({ dateLabel, elapsedLabel, taskLabel }: CleaningDateToggleProps) {
  const [showDate, setShowDate] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextLabel = showDate ? "経過日数" : "日付";
  const optionClass = "flex-1 rounded px-1.5 py-0.5 text-center transition";
  const activeOptionClass = "bg-moss text-white shadow-sm";
  const inactiveOptionClass = "text-slate-500";

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
      }
    };
  }, []);

  function handleToggle() {
    setShowDate((current) => !current);
    setShowFeedback(true);

    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
    }

    // クリック直後だけ切り替わったことを見せ、通常時は値だけを大きく読めるように戻す。
    feedbackTimerRef.current = setTimeout(() => {
      setShowFeedback(false);
      feedbackTimerRef.current = null;
    }, FEEDBACK_DURATION_MS);
  }

  return (
    <button
      type="button"
      aria-label={`${taskLabel}の表示を${nextLabel}に切り替え`}
      className="group relative inline-flex min-w-28 cursor-pointer items-center justify-end gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-right text-sm font-bold text-ink shadow-sm transition hover:border-moss hover:bg-moss/5 focus:outline-none focus:ring-2 focus:ring-moss/40"
      onClick={handleToggle}
    >
      {/* 初期表示は経過日数にし、クリック/タッチで日付と交互に切り替える。 */}
      <span>{showDate ? dateLabel : elapsedLabel}</span>
      <Repeat2 className="h-3.5 w-3.5 shrink-0 text-slate-400 transition group-hover:text-moss" aria-hidden />
      <span
        className={`pointer-events-none absolute right-0 top-full z-10 mt-1 flex min-w-28 rounded border border-slate-200 bg-white p-0.5 text-[10px] font-bold leading-none shadow-sm transition ${
          showFeedback ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
        }`}
        aria-hidden
      >
        <span className={`${optionClass} ${showDate ? inactiveOptionClass : activeOptionClass}`}>経過</span>
        <span className={`${optionClass} ${showDate ? activeOptionClass : inactiveOptionClass}`}>日付</span>
      </span>
    </button>
  );
}
