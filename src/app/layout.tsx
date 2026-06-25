import type { Metadata } from "next";

import { AppNav } from "@/components/app-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hamster Manager",
  description: "ハムスターの衛生管理と体重管理を行うWebアプリ"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <div className="min-h-screen">
          <header className="border-b border-slate-200 bg-paper">
            <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:px-6">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-persimmon">Hamster Manager</p>
                  <h1 className="text-2xl font-bold text-ink">ハムスター管理</h1>
                </div>
              </div>
              <AppNav />
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
