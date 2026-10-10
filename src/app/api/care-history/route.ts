import { unstable_rethrow } from "next/navigation";
import { NextResponse, type NextRequest } from "next/server";

import { getRequiredHouseholdContext } from "@/lib/auth-context";
import { isCareHistoryPeriod } from "@/lib/care-history";
import { getCareHistory } from "@/lib/care-history-queries";
import { prisma } from "@/lib/prisma";
import { logUnexpectedError } from "@/lib/server-errors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };

/** Cookieの現在Householdを再検証し、開いていた別グループのカードへの応答を拒否する。 */
export async function GET(request: NextRequest) {
  try {
    const context = await getRequiredHouseholdContext();
    const params = request.nextUrl.searchParams;
    const hamsterId = params.get("hamsterId");
    const period = Number(params.get("days"));
    if (!hamsterId || hamsterId.length > 200 || !isCareHistoryPeriod(period)) {
      return NextResponse.json({ message: "期間またはハムスターの指定が不正です。" }, { status: 400, headers });
    }
    if (params.get("householdId") !== context.household.id) {
      return NextResponse.json({ message: "共有グループが変更されました。画面を更新してください。" }, { status: 403, headers });
    }
    const data = await getCareHistory(prisma, { householdId: context.household.id, userId: context.user.id }, hamsterId, period);
    return data
      ? NextResponse.json(data, { headers })
      : NextResponse.json({ message: "履歴を閲覧できません。" }, { status: 404, headers });
  } catch (error) {
    unstable_rethrow(error);
    const errorId = logUnexpectedError(error, { operation: "careHistory.get" });
    return NextResponse.json({ message: "お世話履歴を取得できませんでした。", errorId }, { status: 500, headers });
  }
}
