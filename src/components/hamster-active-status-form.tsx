"use client";

import { Archive, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useRef, useState, useTransition, type FormEvent } from "react";

import {
  updateHamsterActiveStatus,
  type HamsterActiveStatusActionResult
} from "@/app/actions/hamsters";
import { StatusMessage } from "@/components/status-message";

type HamsterActiveStatusFormProps = {
  hamsterId: string;
  isActive: boolean;
  compact?: boolean;
};

export function HamsterActiveStatusForm({
  hamsterId,
  isActive,
  compact = false
}: HamsterActiveStatusFormProps) {
  const router = useRouter();
  const [result, setResult] = useState<HamsterActiveStatusActionResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const submittingRef = useRef(false);
  const refreshScrollPositionRef = useRef<{ x: number; y: number } | null>(null);
  const nextIsActive = !isActive;

  useLayoutEffect(() => {
    const position = refreshScrollPositionRef.current;
    if (!position) return;

    refreshScrollPositionRef.current = null;
    window.scrollTo(position.x, position.y);
    const animationFrame = window.requestAnimationFrame(() => window.scrollTo(position.x, position.y));
    return () => window.cancelAnimationFrame(animationFrame);
  }, [isActive]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;

    submittingRef.current = true;
    setResult(null);
    const formData = new FormData(event.currentTarget);
    formData.set("isActive", String(nextIsActive));
    const scrollPosition = { x: window.scrollX, y: window.scrollY };

    startTransition(async () => {
      try {
        const actionResult = await updateHamsterActiveStatus(formData);
        setResult(actionResult);
        refreshScrollPositionRef.current = scrollPosition;
        // App RouterのrefreshはURLとスクロール位置、HamsterListの検索・並び順・ページ状態を維持したまま
        // Server Componentのデータだけを再取得する。メッセージ追加時のscroll anchoringも操作前座標へ戻す。
        router.refresh();
        window.requestAnimationFrame(() => window.scrollTo(scrollPosition.x, scrollPosition.y));
      } finally {
        submittingRef.current = false;
      }
    });
  }

  return (
    <div className={compact ? "grid gap-2" : "grid w-full gap-2"}>
      <form onSubmit={handleSubmit} className={compact ? "" : "flex w-full items-end"}>
        <input type="hidden" name="id" value={hamsterId} />
        <button
          type="submit"
          disabled={isPending}
          className={
            compact
              ? "inline-flex h-8 items-center justify-center gap-2 rounded-md border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
              : "inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
          }
        >
          {nextIsActive ? (
            <RotateCcw className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} aria-hidden />
          ) : (
            <Archive className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} aria-hidden />
          )}
          {isPending ? "更新中..." : nextIsActive ? "管理中に戻す" : "管理外にする"}
        </button>
      </form>
      {result && !result.success ? <StatusMessage status={result.status} errorId={result.errorId} /> : null}
    </div>
  );
}
