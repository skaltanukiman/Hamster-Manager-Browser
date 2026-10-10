"use client";

import { Check, History, LoaderCircle, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  CARE_HISTORY_PERIODS, careTimeDateNote, formatCareDate,
  type CareHistoryData, type CareHistoryPeriod
} from "@/lib/care-history";
import { formatDateTimeJst, formatTimeJst } from "@/lib/date";
import { formatMinutesAsTime } from "@/lib/care-day";

const LOAD_ERROR_MESSAGE = "お世話履歴を取得できませんでした。ログイン状態・共有グループを確認して再試行してください。";

type CareHistoryPanelProps = {
  hamsterId: string;
  hamsterName: string;
  householdId: string;
  historyVersion: string;
  demo?: boolean;
  canManageCareDaySettings?: boolean;
};

export function CareHistoryPanel(props: CareHistoryPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-label={`${props.hamsterName}のお世話履歴を見る`}
        onClick={() => setIsOpen(true)}
        className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-2 text-sm font-semibold text-moss hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
      >
        <History className="h-4 w-4" aria-hidden />
        履歴
      </button>
      {isOpen ? createPortal(
        <CareHistoryModal {...props} onClose={() => setIsOpen(false)} returnFocus={() => triggerRef.current?.focus()} />,
        document.body
      ) : null}
    </>
  );
}

function CareTime({ timestamp, recordDate }: { timestamp: string | null; recordDate: string }) {
  if (!timestamp) return <span aria-label="記録なし" className="text-slate-400">―</span>;
  const date = new Date(timestamp);
  const note = careTimeDateNote(timestamp, recordDate);
  return (
    <time dateTime={timestamp} title={formatDateTimeJst(date)} className="inline-flex flex-wrap items-center justify-center gap-1 text-moss">
      <Check className="h-4 w-4 shrink-0" aria-hidden />
      <span className="sr-only">記録あり </span>
      {formatTimeJst(date)}
      {note ? <span className="text-xs text-slate-500">({note})</span> : null}
    </time>
  );
}

/** native dialogで背景をinertにしてフォーカスを閉じ込め、取得は開いている間だけ行う。 */
function CareHistoryModal({
  hamsterId, hamsterName, householdId, historyVersion, demo = false, canManageCareDaySettings = false, onClose, returnFocus
}: CareHistoryPanelProps & { onClose: () => void; returnFocus: () => void }) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [period, setPeriod] = useState<CareHistoryPeriod>(7);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{ version: string; retry: number; data?: CareHistoryData; error?: string } | null>(null);
  const currentResult = result?.version === historyVersion && result.retry === retry ? result : null;
  const data = currentResult?.data;
  const error = currentResult?.error;
  // 開閉用callbackの変更でdialogを再表示し、フォーカスやスクロールを動かさない。
  const returnFocusRef = useRef(returnFocus);
  useEffect(() => { returnFocusRef.current = returnFocus; }, [returnFocus]);

  useEffect(() => {
    const dialog = dialogRef.current!;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    closeRef.current?.focus();
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      returnFocusRef.current();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    // 最大30日を一度だけ取得し、7/14/30日の切り替えでは追加queryを行わない。
    const params = new URLSearchParams({ hamsterId, days: "30" });
    if (!demo) params.set("householdId", householdId);
    const endpoint = demo ? "/demo/care-history" : "/api/care-history";
    void (async () => {
      try {
        const response = await fetch(`${endpoint}?${params}`, { cache: "no-store", signal: controller.signal });
        if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) {
          throw new Error(LOAD_ERROR_MESSAGE);
        }
        const fetched = await response.json() as CareHistoryData;
        if (active) setResult({ version: historyVersion, retry, data: fetched });
      } catch {
        // ネットワーク例外やJSON解析エラーの英語・内部詳細を利用者へ表示しない。
        if (active) setResult({ version: historyVersion, retry, error: LOAD_ERROR_MESSAGE });
      }
    })();
    return () => { active = false; controller.abort(); };
  }, [hamsterId, householdId, historyVersion, demo, retry]);

  const days = data?.days.slice(0, period) ?? [];
  const noRecords = data && days.every((day) => !day.fedAt && !day.replacedAt);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        // native dialogの端でブラウザUIへ移る挙動も防ぎ、操作をdialog内で循環させる。
        const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not([disabled])");
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
      }}
      className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-hidden rounded-md border-0 bg-white p-0 text-sm text-ink shadow-xl backdrop:bg-slate-950/45"
    >
      <div className="flex max-h-[85dvh] flex-col">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-bold">お世話履歴</h2>
            <p className="mt-1 break-words text-sm text-slate-600">{hamsterName}</p>
          </div>
          <button ref={closeRef} type="button" aria-label="お世話履歴を閉じる" onClick={onClose} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto overscroll-contain px-4 py-3">
          <div role="group" aria-label="履歴の表示期間" className="mb-3 flex flex-wrap gap-2">
            {CARE_HISTORY_PERIODS.map((value) => (
              <button key={value} type="button" aria-pressed={period === value} onClick={() => setPeriod(value)} className={`min-h-11 rounded-md border px-3 py-2 font-semibold ${period === value ? "border-moss bg-moss text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                {value === 7 ? "直近7日" : `${value}日`}
              </button>
            ))}
          </div>
          <p id={descriptionId} className="mb-3 text-xs leading-5 text-slate-500">
            <span className="block">記録なしは未実施を意味するものではありません。</span>
            {data ? <span className="block">お世話日は{formatMinutesAsTime(data.careDayStartMinutes)}に切り替わります。</span> : null}
            {!demo && canManageCareDaySettings ? <span className="block">切り替え時刻は設定画面の「お世話日の設定」から変更できます。</span> : null}
          </p>
          {!currentResult ? <p role="status" className="flex items-center gap-2 py-6 text-slate-600"><LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />履歴を読み込み中...</p> : null}
          {error ? (
            <div role="alert" className="space-y-2 rounded-md bg-red-50 p-3 text-red-800">
              <p>{error}</p>
              <button type="button" onClick={() => setRetry((value) => value + 1)} className="min-h-11 rounded-md border border-red-200 px-3 py-2 font-semibold">再試行</button>
            </div>
          ) : null}
          {data ? (
            <>
              {noRecords ? <p role="status" className="mb-3 text-center font-semibold text-slate-600">この期間のお世話記録はありません。</p> : null}
              <table className="w-full table-fixed border-collapse text-center text-sm">
                <caption className="sr-only">{hamsterName}の直近{period}日のお世話履歴</caption>
                <thead className="border-b border-slate-200 text-slate-600"><tr><th scope="col" className="w-[36%] py-2">お世話日</th><th scope="col">食事</th><th scope="col">水替え</th></tr></thead>
                <tbody>
                  {days.map((day) => (
                    <tr key={day.recordDate} className="border-b border-slate-100">
                      <th scope="row" className="break-words px-1 py-3 font-medium"><time dateTime={day.recordDate}>{formatCareDate(day.recordDate, days[0].recordDate)}</time></th>
                      <td className="px-1 py-3"><CareTime timestamp={day.fedAt} recordDate={day.recordDate} /></td>
                      <td className="px-1 py-3"><CareTime timestamp={day.replacedAt} recordDate={day.recordDate} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : null}
        </div>
      </div>
    </dialog>
  );
}
