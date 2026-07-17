"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookHeart, ClipboardCheck, LayoutDashboard, LineChart, PawPrint, Settings, ShieldCheck, Users } from "lucide-react";

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
          <details className="relative">
            <summary
              className={`min-h-11 cursor-pointer list-none px-2 py-3 text-sm font-medium transition [&::-webkit-details-marker]:hidden ${
                isUtilityActive ? "font-semibold text-moss underline decoration-2 underline-offset-4" : "text-slate-600 hover:text-ink"
              }`}
            >
              メニュー
            </summary>
            <div className="absolute right-0 z-20 mt-1 min-w-32 overflow-hidden rounded-md border border-slate-200 bg-white py-1 shadow-lg">
              {mobileUtilityNavItems.map((item) => {
                const isActive = item.href === activeHref;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`block px-4 py-3 text-sm font-medium transition ${
                      isActive ? "bg-moss/10 text-moss" : "text-slate-700 hover:bg-slate-50 hover:text-moss"
                    }`}
                  >
                    {item.label}
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
