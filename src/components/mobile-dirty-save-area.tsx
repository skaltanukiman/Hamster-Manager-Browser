"use client";

import { Save } from "lucide-react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

import { useFormDirtyById } from "@/components/form-dirty-state";

type MobileDirtySaveAreaProps = {
  children: ReactNode;
  disabled?: boolean;
  formId: string;
};

export function MobileDirtySaveArea({ children, disabled = false, formId }: MobileDirtySaveAreaProps) {
  const isDirty = useFormDirtyById(formId, disabled);

  const fixedSaveButton =
    isDirty && !disabled ? (
      // transform/animation を持つ親要素の影響を避け、常に現在の画面右下に固定する。
      <div className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-[calc(1rem+env(safe-area-inset-right))] z-40 lg:hidden">
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
    <div className="space-y-4">
      {children}

      {typeof document !== "undefined" && fixedSaveButton ? createPortal(fixedSaveButton, document.body) : null}
    </div>
  );
}
