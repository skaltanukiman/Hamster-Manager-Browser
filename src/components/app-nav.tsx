"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardCheck, LayoutDashboard, LineChart, PawPrint, Settings, ShieldCheck, Users } from "lucide-react";

const baseNavItems = [
  { href: "/", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/hamsters", label: "ハムスター", icon: PawPrint },
  { href: "/cleaning", label: "衛生管理", icon: ClipboardCheck },
  { href: "/weights", label: "体重管理", icon: LineChart },
  { href: "/settings", label: "設定", icon: Settings },
  { href: "/settings/members", label: "共有", icon: Users }
];

export function AppNav({ isAppAdmin = false }: { isAppAdmin?: boolean }) {
  const pathname = usePathname();
  const navItems = isAppAdmin ? [...baseNavItems, { href: "/admin", label: "管理", icon: ShieldCheck }] : baseNavItems;
  const activeHref = navItems
    .filter((item) => pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`)))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav className="flex flex-wrap gap-2">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = item.href === activeHref;

        return (
          <Link
            key={item.href}
            href={item.href}
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
  );
}
