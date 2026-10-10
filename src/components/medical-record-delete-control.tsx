"use client";

import { Ellipsis, Trash2 } from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";

export function MedicalRecordDeleteControl({
  title,
  action,
  onSubmit,
  children
}: {
  title: string;
  action: (formData: FormData) => void | Promise<void>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [opensAbove, setOpensAbove] = useState(false);
  const menuId = useId();
  const containerRef = useRef<HTMLFormElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const deleteRef = useRef<HTMLButtonElement>(null);

  function openMenu() {
    const rect = triggerRef.current?.getBoundingClientRect();
    setOpensAbove(Boolean(rect && window.innerHeight - rect.bottom < 64 && rect.top > 64));
    setIsOpen(true);
  }

  useEffect(() => {
    if (!isOpen) return;
    deleteRef.current?.focus();

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }
    // PC幅に切り替えた際に非表示のメニューへフォーカスを残さない。
    const desktop = window.matchMedia("(min-width: 640px)");
    function handleBreakpoint() {
      if (desktop.matches) {
        setIsOpen(false);
        containerRef.current?.querySelector<HTMLButtonElement>("[data-desktop-delete]")?.focus();
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    desktop.addEventListener("change", handleBreakpoint);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      desktop.removeEventListener("change", handleBreakpoint);
    };
  }, [isOpen]);

  return (
    <form
      ref={containerRef}
      action={action}
      onSubmit={(event) => {
        onSubmit(event);
        setIsOpen(false);
        if (event.defaultPrevented) triggerRef.current?.focus();
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsOpen(false);
      }}
      className="relative col-start-2 row-start-1 shrink-0"
    >
      {children}
      <button type="submit" data-desktop-delete className="hidden h-9 items-center gap-1 rounded-md border border-red-200 px-3 text-sm font-semibold text-red-600 hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss sm:inline-flex">
        <Trash2 className="h-4 w-4" aria-hidden />削除
      </button>
      <button
        ref={triggerRef}
        type="button"
        aria-label={title + "の操作メニュー"}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
        onClick={() => isOpen ? setIsOpen(false) : openMenu()}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            openMenu();
          }
        }}
        className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-transparent text-slate-500 hover:bg-slate-50 active:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss sm:hidden"
      >
        <Ellipsis className="h-4 w-4" aria-hidden />
      </button>
      {isOpen ? (
        <div
          id={menuId}
          role="menu"
          aria-label="通院記録の操作"
          onKeyDown={(event) => {
            if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
              event.preventDefault();
              deleteRef.current?.focus();
            }
          }}
          className={`absolute right-0 z-20 w-36 max-w-[calc(100vw-2rem)] rounded-md border border-slate-200 bg-white p-1 shadow-lg sm:hidden ${opensAbove ? "bottom-full mb-1" : "top-full mt-1"}`}
        >
          <button ref={deleteRef} type="submit" role="menuitem" className="flex min-h-11 w-full items-center gap-2 rounded px-3 text-sm font-semibold text-red-600 hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-300">
            <Trash2 className="h-4 w-4" aria-hidden />削除
          </button>
        </div>
      ) : null}
    </form>
  );
}
