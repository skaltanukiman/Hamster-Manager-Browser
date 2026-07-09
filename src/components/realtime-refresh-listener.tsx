"use client";

import { RefreshCw, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { hasDirtyForms } from "@/components/form-dirty-state";
import { REALTIME_CLIENT_COOKIE } from "@/lib/realtime-constants";

type RealtimeRefreshListenerProps = {
  householdId: string;
};

type HouseholdChangePayload = {
  householdId: string;
  actorClientId: string | null;
};

const CLIENT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function readCookie(name: string) {
  const prefix = `${name}=`;
  const cookie = document.cookie
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(prefix));

  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null;
}

function writeCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${CLIENT_COOKIE_MAX_AGE}; SameSite=Lax`;
}

function createClientId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function ensureClientId() {
  const existingCookieValue = readCookie(REALTIME_CLIENT_COOKIE);

  if (existingCookieValue) {
    return existingCookieValue;
  }

  const storageKey = REALTIME_CLIENT_COOKIE;
  const existingStorageValue = window.localStorage.getItem(storageKey);
  const clientId = existingStorageValue ?? createClientId();

  window.localStorage.setItem(storageKey, clientId);
  writeCookie(REALTIME_CLIENT_COOKIE, clientId);

  return clientId;
}

export function RealtimeRefreshListener({ householdId }: RealtimeRefreshListenerProps) {
  const router = useRouter();
  const clientIdRef = useRef<string | null>(null);
  const isRefreshingRef = useRef(false);
  const [hasPendingChange, setHasPendingChange] = useState(false);

  useEffect(() => {
    const clientId = ensureClientId();
    clientIdRef.current = clientId;

    const eventSource = new EventSource(`/api/realtime/household?householdId=${encodeURIComponent(householdId)}`);

    function handleHouseholdChange(event: MessageEvent<string>) {
      const payload = JSON.parse(event.data) as HouseholdChangePayload;

      if (payload.householdId !== householdId) {
        return;
      }

      if (payload.actorClientId && payload.actorClientId === clientIdRef.current) {
        return;
      }

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

    eventSource.addEventListener("household-change", handleHouseholdChange);

    return () => {
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
