"use client";

import Link from "next/link";
import { Download, MoreVertical, Upload } from "lucide-react";
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
    <div ref={containerRef} className="relative md:hidden">
      <button
        ref={triggerRef}
        type="button"
        aria-label="CSVデータ管理を開く"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setIsOpen((open) => !open)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-moss bg-white text-moss hover:bg-moss hover:text-white"
      >
        <MoreVertical className="h-5 w-5" aria-hidden />
      </button>

      {isOpen ? (
        <div
          id={menuId}
          role="menu"
          aria-label="データ管理"
          className="absolute right-0 z-20 mt-2 w-60 max-w-[calc(100vw-2rem)] rounded-md border border-slate-200 bg-white p-1 shadow-sm"
        >
          <Link
            href="/weights/export"
            role="menuitem"
            onClick={() => setIsOpen(false)}
            className="flex min-h-11 items-center gap-3 rounded px-3 py-2 text-sm font-semibold text-moss hover:bg-slate-50"
          >
            <Download className="h-4 w-4 shrink-0" aria-hidden />
            <span className="whitespace-nowrap">CSVエクスポート</span>
          </Link>
          {canEdit ? (
            <Link
              href="/weights/import"
              role="menuitem"
              onClick={() => setIsOpen(false)}
              className="flex min-h-11 items-start gap-3 rounded px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <Upload className="mt-0.5 h-4 w-4 shrink-0 text-moss" aria-hidden />
              <span>
                <span className="block whitespace-nowrap font-semibold text-moss">CSVインポート</span>
                <span className="mt-0.5 block whitespace-nowrap text-xs leading-5 text-slate-500">
                  PCでの操作を推奨
                </span>
              </span>
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
