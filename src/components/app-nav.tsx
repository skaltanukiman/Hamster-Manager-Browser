"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardCheck, Download, LayoutDashboard, LineChart, PawPrint, Settings } from "lucide-react";

const navItems = [
  { href: "/", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/hamsters", label: "ハムスター", icon: PawPrint },
  { href: "/cleaning", label: "衛生管理", icon: ClipboardCheck },
  { href: "/weights", label: "体重管理", icon: LineChart },
  { href: "/export", label: "CSV出力", icon: Download },
  { href: "/settings", label: "設定", icon: Settings }
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));

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
