"use client";

import { Save } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useState } from "react";
import { createPortal } from "react-dom";

type MobileDirtySaveAreaProps = {
  children: ReactNode;
  disabled?: boolean;
  formId: string;
};

export function MobileDirtySaveArea({ children, disabled = false, formId }: MobileDirtySaveAreaProps) {
  const [isDirty, setIsDirty] = useState(false);

  function handleChangeCapture(event: FormEvent<HTMLDivElement>) {
    const target = event.target;

    if (
      disabled ||
      !(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) ||
      target.type === "hidden" ||
      target.disabled
    ) {
      return;
    }

    setIsDirty(true);
  }

  const fixedSaveButton =
    isDirty && !disabled ? (
      // transform/animation を持つ親要素の影響を避け、常に現在の画面右下に固定する。
      <div className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-[calc(1rem+env(safe-area-inset-right))] z-40 md:hidden">
        <button
          type="submit"
          form={formId}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-moss px-5 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 hover:bg-moss/90"
        >
          <Save className="h-4 w-4" aria-hidden />
          保存
        </button>
      </div>
    ) : null;

  return (
    <div className="space-y-4" onChangeCapture={handleChangeCapture}>
      {children}

      {typeof document !== "undefined" && fixedSaveButton ? createPortal(fixedSaveButton, document.body) : null}
    </div>
  );
}
