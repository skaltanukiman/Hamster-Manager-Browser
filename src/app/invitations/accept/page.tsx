import Link from "next/link";
import { Check, XCircle } from "lucide-react";

import { acceptHouseholdInvitation } from "@/app/actions/members";
import { StatusMessage } from "@/components/status-message";

export const dynamic = "force-dynamic";

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AcceptInvitationPage({
  searchParams
}: {
  searchParams: Promise<{ token?: string | string[]; status?: string | string[]; errorId?: string | string[] }>;
}) {
  const params = await searchParams;
  const token = getParam(params.token);
  const status = getParam(params.status);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h2 className="text-xl font-bold text-ink">共有への参加</h2>
        <p className="mt-1 text-sm text-slate-600">招待リンクを確認し、現在のGoogleアカウントで参加します。</p>
      </div>

      <StatusMessage status={status} errorId={getParam(params.errorId)} />

      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        {token ? (
          <form action={acceptHouseholdInvitation} className="space-y-4">
            <input type="hidden" name="token" value={token} />
            <p className="text-sm leading-6 text-slate-600">
              参加すると、同じ共有内のハムスター、体重記録、衛生記録を共有できます。
            </p>
            <button
              type="submit"
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-moss px-4 text-sm font-semibold text-white hover:bg-moss/90"
            >
              <Check className="h-4 w-4" aria-hidden />
              この共有に参加する
            </button>
          </form>
        ) : (
          <div className="space-y-4 text-sm text-slate-600">
            <div className="flex items-start gap-2">
              <XCircle className="mt-0.5 h-4 w-4 text-red-600" aria-hidden />
              <p>招待トークンが見つかりません。共有画面で新しい招待リンクを作成してください。</p>
            </div>
            <Link
              href="/"
              className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              ダッシュボードへ戻る
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
