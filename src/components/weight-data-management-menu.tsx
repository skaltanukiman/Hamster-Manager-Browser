"use client";

import Link from "next/link";
import { ChevronDown, Download, Upload } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

export function WeightDataManagementMenu({ canEdit }: { canEdit: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative sm:hidden">
      <button
        ref={triggerRef}
        type="button"
        aria-label="CSVデータ管理を開く"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setIsOpen((open) => !open)}
        className="inline-flex min-h-10 items-center justify-center gap-1 rounded-md px-2 text-sm font-medium text-moss transition-colors hover:text-moss/75 active:text-moss/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss focus-visible:ring-offset-2"
      >
        <span>CSV</span>
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-200 ease-out ${isOpen ? "rotate-180" : "rotate-0"}`}
          aria-hidden
        />
      </button>

      <div
        id={menuId}
        role="menu"
        aria-label="データ管理"
        aria-hidden={!isOpen}
        className={`absolute right-0 z-20 mt-2 w-60 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200/80 bg-white/95 p-1.5 shadow-md shadow-slate-900/10 backdrop-blur transition-[opacity,transform] duration-200 ease-out ${
          isOpen ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-1 opacity-0"
        }`}
      >
        <Link
          href="/weights/export"
          role="menuitem"
          tabIndex={isOpen ? 0 : -1}
          onClick={() => setIsOpen(false)}
          className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-moss transition-colors hover:bg-moss/10 active:bg-moss/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss/70"
        >
          <Download className="h-4 w-4 shrink-0" aria-hidden />
          <span className="whitespace-nowrap">CSVエクスポート</span>
        </Link>
        {canEdit ? (
          <Link
            href="/weights/import"
            role="menuitem"
            tabIndex={isOpen ? 0 : -1}
            onClick={() => setIsOpen(false)}
            className="flex min-h-11 items-start gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-moss/10 active:bg-moss/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss/70"
          >
            <Upload className="mt-0.5 h-4 w-4 shrink-0 text-moss" aria-hidden />
            <span>
              <span className="block whitespace-nowrap font-semibold text-moss">CSVインポート</span>
              <span className="mt-0.5 block whitespace-nowrap text-xs leading-5 text-slate-500">PCでの利用を推奨</span>
            </span>
          </Link>
        ) : null}
      </div>
    </div>
  );
}
