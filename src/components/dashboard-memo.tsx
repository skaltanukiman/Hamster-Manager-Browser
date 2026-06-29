"use client";

import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";

type DashboardMemoProps = {
  hamsterName: string;
  memo: string;
};

export function DashboardMemo({ hamsterName, memo }: DashboardMemoProps) {
  const titleId = useId();
  const memoRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const element = memoRef.current;

    if (!element) {
      return;
    }

    // カード幅やフォント反映後に、1行表示で省略が発生しているかを実測してクリック可否を切り替える。
    const updateTruncated = () => {
      setIsTruncated(element.scrollWidth > element.clientWidth + 1);
    };

    updateTruncated();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateTruncated);
      return () => window.removeEventListener("resize", updateTruncated);
    }

    const observer = new ResizeObserver(updateTruncated);
    observer.observe(element);
    return () => observer.disconnect();
  }, [memo]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <>
      <button
        ref={memoRef}
        type="button"
        tabIndex={isTruncated ? 0 : -1}
        aria-haspopup={isTruncated ? "dialog" : undefined}
        aria-label={isTruncated ? `${hamsterName}のメモ全文を表示` : undefined}
        title={isTruncated ? "クリックして全文を表示" : undefined}
        onClick={() => {
          if (isTruncated) {
            setIsOpen(true);
          }
        }}
        className={`mt-1 block w-full truncate rounded-sm text-left text-sm text-slate-500 transition ${
          isTruncated ? "cursor-pointer hover:text-moss focus-visible:outline focus-visible:outline-2 focus-visible:outline-moss" : "cursor-default"
        }`}
      >
        {memo}
      </button>

      {isOpen ? (
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6"
          onClick={() => setIsOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="max-h-[80vh] w-full max-w-lg overflow-hidden rounded-md bg-white shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <h3 id={titleId} className="min-w-0 truncate text-base font-bold text-ink">
                {hamsterName}のメモ
              </h3>
              <button
                type="button"
                aria-label="メモを閉じる"
                onClick={() => setIsOpen(false)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
              <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{memo}</p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
