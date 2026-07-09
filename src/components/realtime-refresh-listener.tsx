"use client";

import { RefreshCw, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { hasDirtyForms } from "@/components/form-dirty-state";
import { REALTIME_ACTOR_FIELD } from "@/lib/realtime-constants";

type RealtimeRefreshListenerProps = {
  householdId: string;
};

type HouseholdChangePayload = {
  householdId: string;
  actorClientId: string | null;
  revision?: string;
};

type HouseholdRevisionPayload = {
  householdId: string;
  revision: string;
};

const REVISION_POLL_INTERVAL_MS = 4000;

function createClientId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function RealtimeRefreshListener({ householdId }: RealtimeRefreshListenerProps) {
  const router = useRouter();
  const clientIdRef = useRef<string>(createClientId());
  const isRefreshingRef = useRef(false);
  const lastRevisionRef = useRef<string | null>(null);
  const [hasPendingChange, setHasPendingChange] = useState(false);

  useEffect(() => {
    const clientId = clientIdRef.current;
    let isMounted = true;

    const eventSource = new EventSource(`/api/realtime/household?householdId=${encodeURIComponent(householdId)}`);

    function cleanupRealtimeQueryParam() {
      const currentUrl = new URL(window.location.href);

      if (!currentUrl.searchParams.has(REALTIME_ACTOR_FIELD)) {
        return;
      }

      currentUrl.searchParams.delete(REALTIME_ACTOR_FIELD);
      window.history.replaceState(window.history.state, "", `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`);
    }

    async function fetchRevision() {
      try {
        const response = await fetch(`/api/realtime/household/revision?householdId=${encodeURIComponent(householdId)}`, {
          cache: "no-store"
        });

        if (!response.ok) {
          return null;
        }

        const payload = (await response.json()) as HouseholdRevisionPayload;
        return payload.householdId === householdId ? payload.revision : null;
      } catch {
        return null;
      }
    }

    function applyRemoteChange() {
      if (hasDirtyForms()) {
        setHasPendingChange(true);
        return;
      }

      if (isRefreshingRef.current) {
        return;
      }

      isRefreshingRef.current = true;
      router.refresh();

      window.setTimeout(() => {
        isRefreshingRef.current = false;
      }, 800);
    }

    async function checkRevision() {
      const revision = await fetchRevision();

      if (!revision || !isMounted) {
        return;
      }

      if (!lastRevisionRef.current) {
        lastRevisionRef.current = revision;
        return;
      }

      if (revision === lastRevisionRef.current) {
        return;
      }

      lastRevisionRef.current = revision;
      applyRemoteChange();
    }

    function handleSubmitCapture(event: SubmitEvent) {
      const form = event.target;

      if (!(form instanceof HTMLFormElement)) {
        return;
      }

      if (form.method.toLowerCase() === "get") {
        return;
      }

      const existingField = form.elements.namedItem(REALTIME_ACTOR_FIELD);

      if (existingField instanceof HTMLInputElement) {
        existingField.value = clientId;
        return;
      }

      const actorField = document.createElement("input");
      actorField.type = "hidden";
      actorField.name = REALTIME_ACTOR_FIELD;
      actorField.value = clientId;
      form.append(actorField);
    }

    function handleHouseholdChange(event: MessageEvent<string>) {
      const payload = JSON.parse(event.data) as HouseholdChangePayload;

      if (payload.householdId !== householdId) {
        return;
      }

      if (payload.actorClientId && payload.actorClientId === clientIdRef.current) {
        lastRevisionRef.current = payload.revision ?? lastRevisionRef.current;
        return;
      }

      lastRevisionRef.current = payload.revision ?? lastRevisionRef.current;
      applyRemoteChange();
    }

    cleanupRealtimeQueryParam();
    void checkRevision();

    const revisionPoll = window.setInterval(() => {
      void checkRevision();
    }, REVISION_POLL_INTERVAL_MS);

    window.addEventListener("focus", checkRevision);
    document.addEventListener("submit", handleSubmitCapture, true);
    eventSource.addEventListener("household-change", handleHouseholdChange);

    return () => {
      isMounted = false;
      window.clearInterval(revisionPoll);
      window.removeEventListener("focus", checkRevision);
      document.removeEventListener("submit", handleSubmitCapture, true);
      eventSource.removeEventListener("household-change", handleHouseholdChange);
      eventSource.close();
    };
  }, [householdId, router]);

  function handleRefresh() {
    setHasPendingChange(false);
    router.refresh();
  }

  if (!hasPendingChange) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 shadow-lg shadow-slate-300/40 sm:left-auto sm:max-w-sm">
      <div className="flex items-start gap-3">
        <RefreshCw className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">他のユーザーが更新しました。</p>
          <p className="mt-1 text-amber-800">入力中の内容を守るため、自動更新は停止しています。</p>
          <button
            type="button"
            onClick={handleRefresh}
            className="mt-3 inline-flex h-9 items-center gap-2 rounded-md bg-moss px-3 text-sm font-semibold text-white hover:bg-moss/90"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            再読み込み
          </button>
        </div>
        <button
          type="button"
          onClick={() => setHasPendingChange(false)}
          aria-label="通知を閉じる"
          className="-mr-1 -mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-md text-amber-900 hover:bg-amber-100"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
