"use client";

import { RefreshCw, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { hasDirtyForms } from "@/components/form-dirty-state";
import { REALTIME_ACTOR_FIELD, REALTIME_LOCAL_SUBMIT_EVENT } from "@/lib/realtime-constants";

type RealtimeRefreshListenerProps = {
  householdId: string;
  currentUserId: string;
};

type HouseholdChangePayload = {
  householdId: string;
  actorClientId: string | null;
  actorUserId: string | null;
  revision?: string;
};

type HouseholdRevisionPayload = {
  householdId: string;
  revision: string;
  actorClientId: string | null;
  actorUserId: string | null;
};

const REVISION_POLL_INTERVAL_MS = 4000;
const CLIENT_STORAGE_KEY = "hamster-manager-realtime-client-id";
const LOCAL_SUBMIT_STORAGE_KEY_PREFIX = "hamster-manager-realtime-local-submit:";
const LOCAL_SUBMIT_SUPPRESS_MS = 15000;

function createClientId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function readSessionStorage(key: string) {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSessionStorage(key: string, value: string) {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // Storage access can fail in restricted browser modes. In that case the in-memory id still works.
  }
}

function removeSessionStorage(key: string) {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // Ignore storage cleanup failures for the same reason as writes.
  }
}

function ensureClientId() {
  const existingClientId = readSessionStorage(CLIENT_STORAGE_KEY);

  if (existingClientId) {
    return existingClientId;
  }

  const clientId = createClientId();
  writeSessionStorage(CLIENT_STORAGE_KEY, clientId);
  return clientId;
}

function getLocalSubmitStorageKey(householdId: string) {
  return `${LOCAL_SUBMIT_STORAGE_KEY_PREFIX}${householdId}`;
}

function markLocalSubmit(householdId: string) {
  writeSessionStorage(getLocalSubmitStorageKey(householdId), String(Date.now()));
}

function hasRecentLocalSubmit(householdId: string) {
  const storageKey = getLocalSubmitStorageKey(householdId);
  const submittedAt = Number(readSessionStorage(storageKey));

  if (!Number.isFinite(submittedAt)) {
    return false;
  }

  if (Date.now() - submittedAt <= LOCAL_SUBMIT_SUPPRESS_MS) {
    return true;
  }

  removeSessionStorage(storageKey);
  return false;
}

function isGetForm(form: HTMLFormElement) {
  return form.method.toLowerCase() === "get" && !form.hasAttribute("data-dirty-watch");
}

export function RealtimeRefreshListener({ currentUserId, householdId }: RealtimeRefreshListenerProps) {
  const router = useRouter();
  const clientIdRef = useRef<string>(createClientId());
  const isRefreshingRef = useRef(false);
  const lastRevisionRef = useRef<string | null>(null);
  const localSubmitUntilRef = useRef(0);
  const suppressedLocalRevisionRef = useRef<string | null>(null);
  const [hasPendingChange, setHasPendingChange] = useState(false);

  useEffect(() => {
    const clientId = ensureClientId();
    clientIdRef.current = clientId;
    let isMounted = true;

    const eventSource = new EventSource(`/api/realtime/household?householdId=${encodeURIComponent(householdId)}`);

    function ensureActorField(form: HTMLFormElement) {
      if (isGetForm(form)) {
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

    function syncActorFields() {
      document.querySelectorAll<HTMLFormElement>("form").forEach(ensureActorField);
    }

    function suppressRecentLocalSubmit(revision: string | null) {
      if (Date.now() > localSubmitUntilRef.current && !hasRecentLocalSubmit(householdId)) {
        return false;
      }

      if (revision) {
        suppressedLocalRevisionRef.current = revision;
      }

      setHasPendingChange(false);
      return true;
    }

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
        return payload.householdId === householdId ? payload : null;
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
      const revisionPayload = await fetchRevision();

      if (!revisionPayload || !isMounted) {
        return;
      }

      const { actorClientId, actorUserId, revision } = revisionPayload;

      if (!lastRevisionRef.current) {
        lastRevisionRef.current = revision;
        return;
      }

      if (revision === lastRevisionRef.current) {
        return;
      }

      if (actorUserId && actorUserId === currentUserId) {
        lastRevisionRef.current = revision;
        suppressedLocalRevisionRef.current = revision;
        setHasPendingChange(false);
        return;
      }

      if (actorClientId && actorClientId === clientIdRef.current) {
        lastRevisionRef.current = revision;
        suppressedLocalRevisionRef.current = revision;
        setHasPendingChange(false);
        return;
      }

      if (suppressRecentLocalSubmit(revision)) {
        lastRevisionRef.current = revision;
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

      if (isGetForm(form)) {
        return;
      }

      ensureActorField(form);
      localSubmitUntilRef.current = Date.now() + LOCAL_SUBMIT_SUPPRESS_MS;
      markLocalSubmit(householdId);
    }

    function handleLocalSubmitEvent(event: Event) {
      if (!(event instanceof CustomEvent)) {
        return;
      }

      const form = (event.detail as { form?: unknown } | null)?.form;

      if (!(form instanceof HTMLFormElement) || isGetForm(form)) {
        return;
      }

      ensureActorField(form);
      localSubmitUntilRef.current = Date.now() + LOCAL_SUBMIT_SUPPRESS_MS;
      markLocalSubmit(householdId);
    }

    function handleFormData(event: FormDataEvent) {
      const form = event.target;

      if (!(form instanceof HTMLFormElement) || isGetForm(form)) {
        return;
      }

      event.formData.set(REALTIME_ACTOR_FIELD, clientId);
      localSubmitUntilRef.current = Date.now() + LOCAL_SUBMIT_SUPPRESS_MS;
      markLocalSubmit(householdId);
    }

    function handleHouseholdChange(event: MessageEvent<string>) {
      const payload = JSON.parse(event.data) as HouseholdChangePayload;

      if (payload.householdId !== householdId) {
        return;
      }

      if (payload.actorUserId && payload.actorUserId === currentUserId) {
        lastRevisionRef.current = payload.revision ?? lastRevisionRef.current;
        suppressedLocalRevisionRef.current = payload.revision ?? suppressedLocalRevisionRef.current;
        setHasPendingChange(false);
        return;
      }

      if (suppressRecentLocalSubmit(payload.revision ?? null)) {
        lastRevisionRef.current = payload.revision ?? lastRevisionRef.current;
        return;
      }

      if (payload.actorClientId && payload.actorClientId === clientIdRef.current) {
        lastRevisionRef.current = payload.revision ?? lastRevisionRef.current;
        suppressedLocalRevisionRef.current = payload.revision ?? suppressedLocalRevisionRef.current;
        setHasPendingChange(false);
        return;
      }

      if (payload.revision && payload.revision === lastRevisionRef.current) {
        return;
      }

      if (payload.revision && payload.revision === suppressedLocalRevisionRef.current) {
        return;
      }

      lastRevisionRef.current = payload.revision ?? lastRevisionRef.current;
      applyRemoteChange();
    }

    cleanupRealtimeQueryParam();
    syncActorFields();
    void checkRevision();

    const observer = new MutationObserver(syncActorFields);
    observer.observe(document.body, { childList: true, subtree: true });

    const revisionPoll = window.setInterval(() => {
      void checkRevision();
    }, REVISION_POLL_INTERVAL_MS);

    window.addEventListener("focus", checkRevision);
    window.addEventListener(REALTIME_LOCAL_SUBMIT_EVENT, handleLocalSubmitEvent);
    document.addEventListener("submit", handleSubmitCapture, true);
    document.addEventListener("formdata", handleFormData, true);
    eventSource.addEventListener("household-change", handleHouseholdChange);

    return () => {
      isMounted = false;
      observer.disconnect();
      window.clearInterval(revisionPoll);
      window.removeEventListener("focus", checkRevision);
      window.removeEventListener(REALTIME_LOCAL_SUBMIT_EVENT, handleLocalSubmitEvent);
      document.removeEventListener("submit", handleSubmitCapture, true);
      document.removeEventListener("formdata", handleFormData, true);
      eventSource.removeEventListener("household-change", handleHouseholdChange);
      eventSource.close();
    };
  }, [currentUserId, householdId, router]);

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
