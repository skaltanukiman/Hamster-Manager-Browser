"use client";

import { useEffect, useState } from "react";

import { UnexpectedErrorPanel } from "@/components/unexpected-error-panel";

function createClientErrorId() {
  const suffix = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Date.now().toString(36);
  return `CLIENT-${suffix}`;
}

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [fallbackErrorId] = useState(createClientErrorId);
  const errorId = error.digest || fallbackErrorId;

  useEffect(() => {
    // Server Component由来ではdigestがサーバーログとの照合IDになる。クライアント例外は一度だけブラウザログへ残す。
    console.error("Unexpected application error", { errorId, error });
  }, [error, errorId]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center px-4 py-8">
      <UnexpectedErrorPanel errorId={errorId} onRetry={reset} />
    </div>
  );
}
