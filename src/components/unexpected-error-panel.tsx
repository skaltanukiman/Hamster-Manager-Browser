"use client";

import Link from "next/link";

type UnexpectedErrorPanelProps = {
  errorId: string;
  onRetry: () => void;
};

export function UnexpectedErrorPanel({ errorId, onRetry }: UnexpectedErrorPanelProps) {
  return (
    <section
      role="alert"
      style={{
        width: "min(100%, 32rem)",
        border: "1px solid #fecaca",
        borderRadius: "0.5rem",
        background: "#ffffff",
        padding: "1.5rem",
        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
        color: "#172033"
      }}
    >
      <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>予期しないエラーが発生しました</h1>
      <p style={{ margin: "0.75rem 0 0", color: "#475569", lineHeight: 1.7 }}>
        一時的な問題の可能性があります。再試行しても解決しない場合は、下記のエラーIDを管理者へお知らせください。
      </p>
      <p
        style={{
          margin: "1rem 0 0",
          borderRadius: "0.375rem",
          background: "#f8fafc",
          padding: "0.75rem",
          overflowWrap: "anywhere",
          fontSize: "0.875rem"
        }}
      >
        エラーID: <strong>{errorId}</strong>
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginTop: "1.25rem" }}>
        <button
          type="button"
          onClick={onRetry}
          style={{
            minHeight: "2.5rem",
            flex: "1 1 9rem",
            border: 0,
            borderRadius: "0.375rem",
            background: "#3f725f",
            padding: "0.625rem 1rem",
            color: "white",
            fontWeight: 700,
            cursor: "pointer"
          }}
        >
          再試行
        </button>
        <Link
          href="/"
          style={{
            minHeight: "2.5rem",
            flex: "1 1 9rem",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            boxSizing: "border-box",
            border: "1px solid #cbd5e1",
            borderRadius: "0.375rem",
            background: "white",
            padding: "0.625rem 1rem",
            color: "#334155",
            fontWeight: 700,
            textDecoration: "none"
          }}
        >
          ダッシュボードへ戻る
        </Link>
      </div>
    </section>
  );
}
