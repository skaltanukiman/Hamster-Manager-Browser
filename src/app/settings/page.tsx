import { DashboardSettingsForm } from "@/components/dashboard-settings-form";
import { StatusMessage } from "@/components/status-message";
import { getDashboardSettingsPageData } from "@/lib/queries";

export const dynamic = "force-dynamic";

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SettingsPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string | string[] }>;
}) {
  const params = await searchParams;
  const { boardCount, hamsters, selectedHamsterIds } = await getDashboardSettingsPageData();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-ink">設定</h2>
        <p className="mt-1 text-sm text-slate-600">ダッシュボードの表示数と表示対象を管理します。</p>
      </div>

      <StatusMessage status={getParam(params.status)} />

      <DashboardSettingsForm boardCount={boardCount} hamsters={hamsters} selectedHamsterIds={selectedHamsterIds} />
    </div>
  );
}
