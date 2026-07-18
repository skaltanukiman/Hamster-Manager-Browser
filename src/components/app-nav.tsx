"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookHeart,
  ChevronDown,
  ClipboardCheck,
  LayoutDashboard,
  LineChart,
  PawPrint,
  Settings,
  ShieldCheck,
  Users
} from "lucide-react";

const primaryNavItems = [
  { href: "/", label: "ダッシュボード", mobileLabel: "ホーム", icon: LayoutDashboard },
  { href: "/hamsters", label: "ハムスター", mobileLabel: "ハムスター", icon: PawPrint },
  { href: "/records", label: "記録", mobileLabel: "記録", icon: BookHeart },
  { href: "/cleaning", label: "衛生管理", mobileLabel: "衛生", icon: ClipboardCheck },
  { href: "/weights", label: "体重管理", mobileLabel: "体重", icon: LineChart }
];

const utilityNavItems = [
  { href: "/settings", label: "設定", icon: Settings },
  { href: "/settings/members", label: "共有", icon: Users }
];

const baseNavItems = [...primaryNavItems, ...utilityNavItems];

export function AppNav({ isAppAdmin = false }: { isAppAdmin?: boolean }) {
  const pathname = usePathname();
  const navItems = isAppAdmin ? [...baseNavItems, { href: "/admin", label: "管理", icon: ShieldCheck }] : baseNavItems;
  const activeHref = navItems
    .filter((item) => pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`)))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  const mobileUtilityNavItems = isAppAdmin
    ? [...utilityNavItems, { href: "/admin", label: "管理", icon: ShieldCheck }]
    : utilityNavItems;
  const isUtilityActive = mobileUtilityNavItems.some((item) => item.href === activeHref);

  return (
    <>
      <nav className="sm:hidden" aria-label="主要ナビゲーション">
        <div className="grid grid-cols-5 border-b border-slate-200">
          {primaryNavItems.map((item) => {
            const isActive = item.href === activeHref;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex min-h-11 items-center justify-center whitespace-nowrap border-b-2 px-1 text-center text-[11px] font-medium transition ${
                  isActive
                    ? "border-moss font-semibold text-moss"
                    : "border-transparent text-slate-600 hover:border-slate-300 hover:text-ink"
                }`}
              >
                {item.mobileLabel}
              </Link>
            );
          })}
        </div>

        <div className="mt-2 flex justify-end">
          <details className="group relative">
            <summary
              className={`inline-flex min-h-10 cursor-pointer list-none items-center justify-center gap-1 rounded-md px-2 text-sm font-medium text-moss transition-colors hover:text-moss/75 active:bg-moss/5 active:text-moss/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden ${
                isUtilityActive ? "font-semibold" : ""
              }`}
            >
              <span>メニュー</span>
              <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-open:rotate-180" aria-hidden />
            </summary>
            <div className="absolute right-0 z-30 mt-2 w-56 max-w-[calc(100vw-2rem)] space-y-1 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-panel">
              {mobileUtilityNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.href === activeHref;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex min-h-12 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-moss ${
                      isActive
                        ? "bg-moss/10 text-moss hover:bg-moss/20 active:bg-moss/20"
                        : "text-slate-700 hover:bg-slate-50 hover:text-moss active:bg-slate-100"
                    }`}
                  >
                    <Icon className="h-5 w-5 shrink-0" aria-hidden />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </details>
        </div>
      </nav>

      <nav className="hidden flex-wrap gap-2 sm:flex" aria-label="画面ナビゲーション">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.href === activeHref;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? "border-moss bg-moss text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-700 hover:border-moss hover:text-moss"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
