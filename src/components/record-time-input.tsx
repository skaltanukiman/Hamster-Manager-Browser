"use client";

import { useState } from "react";

export function RecordTimeInput({ defaultValue = null }: { defaultValue?: string | null }) {
  const [enabled, setEnabled] = useState(Boolean(defaultValue));

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <label className="flex h-10 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-700">
        <input
          type="checkbox"
          name="recordTimeEnabled"
          value="true"
          defaultChecked={Boolean(defaultValue)}
          onChange={(event) => setEnabled(event.currentTarget.checked)}
        />
        時間も記録する
      </label>
      {enabled ? (
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          時刻
          <input type="time" name="recordTime" defaultValue={defaultValue ?? ""} step="60" required className="sm:w-36" />
        </label>
      ) : null}
    </div>
  );
}
