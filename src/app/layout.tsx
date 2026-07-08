import type { Metadata } from "next";
import { LogOut } from "lucide-react";

import { switchCurrentHousehold } from "@/app/actions/households";
import { auth, signOut } from "@/auth";
import { AppNav } from "@/components/app-nav";
import { HouseholdSwitcher } from "@/components/household-switcher";
import { getCurrentHouseholdSwitcherData } from "@/lib/auth-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hamster Manager",
  description: "ハムスターの衛生管理と体重管理を行うWebアプリ"
};

async function signOutAction() {
  "use server";

  await signOut({ redirectTo: "/login" });
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const currentUserLabel = session?.user?.name || session?.user?.email;
  const householdSwitcherData = session?.user ? await getCurrentHouseholdSwitcherData() : null;

  return (
    <html lang="ja">
      <body>
        <div className="min-h-screen">
          {session?.user ? (
            <header className="border-b border-slate-200 bg-paper">
              <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:px-6">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-persimmon">Hamster Manager</p>
                    <h1 className="text-2xl font-bold text-ink">ハムスター管理</h1>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                    {householdSwitcherData ? (
                      <HouseholdSwitcher
                        currentHouseholdId={householdSwitcherData.context.household.id}
                        households={householdSwitcherData.households}
                        action={switchCurrentHousehold}
                      />
                    ) : null}
                    {currentUserLabel ? <span className="font-medium text-ink">{currentUserLabel}</span> : null}
                    <form action={signOutAction}>
                      <button
                        type="submit"
                        className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <LogOut className="h-4 w-4" aria-hidden />
                        ログアウト
                      </button>
                    </form>
                  </div>
                </div>
                <AppNav />
              </div>
            </header>
          ) : null}
          <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
