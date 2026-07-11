"use client";

import { useEffect, useState } from "react";

import { UnexpectedErrorPanel } from "@/components/unexpected-error-panel";

function createClientErrorId() {
  const suffix = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Date.now().toString(36);
  return `CLIENT-${suffix}`;
}

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [fallbackErrorId] = useState(createClientErrorId);
  const errorId = error.digest || fallbackErrorId;

  useEffect(() => {
    console.error("Unexpected root application error", { errorId, error });
  }, [error, errorId]);

  return (
    <html lang="ja">
      <body style={{ margin: 0, background: "#f6f7f5", fontFamily: "sans-serif" }}>
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxSizing: "border-box",
            padding: "1rem"
          }}
        >
          <UnexpectedErrorPanel errorId={errorId} onRetry={reset} />
        </main>
      </body>
    </html>
  );
}
