import { NextResponse, type NextRequest } from "next/server";

import { isCareHistoryPeriod } from "@/lib/care-history";
import { getPublicDemoCareHistory } from "@/lib/public-demo-queries";
import { logUnexpectedError } from "@/lib/server-errors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };

/** 匿名履歴は固定デモqueryだけへ接続し、セッション・Cookie・任意Householdを参照しない。 */
export async function GET(request: NextRequest) {
  try {
    const hamsterId = request.nextUrl.searchParams.get("hamsterId");
    const period = Number(request.nextUrl.searchParams.get("days"));
    if (!hamsterId || hamsterId.length > 200 || !isCareHistoryPeriod(period)) {
      return NextResponse.json({ message: "期間またはハムスターの指定が不正です。" }, { status: 400, headers });
    }
    const data = await getPublicDemoCareHistory(hamsterId, period);
    return data
      ? NextResponse.json(data, { headers })
      : NextResponse.json({ message: "サンプル履歴を閲覧できません。" }, { status: 404, headers });
  } catch (error) {
    const errorId = logUnexpectedError(error, { operation: "publicDemo.careHistory.get" });
    return NextResponse.json({ message: "お世話履歴を取得できませんでした。", errorId }, { status: 500, headers });
  }
}
