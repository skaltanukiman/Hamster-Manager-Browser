"use client";

import type { ReactNode } from "react";

type SelectionActionBarProps = {
  selectedCount: number;
  children: ReactNode;
};

export function SelectionActionBar({ selectedCount, children }: SelectionActionBarProps) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-sm text-slate-600">{selectedCount} 件選択中</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
