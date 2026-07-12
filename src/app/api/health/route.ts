import { NextResponse } from "next/server";

import { isApplicationHealthy } from "@/lib/health";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const healthy = await isApplicationHealthy();

  return NextResponse.json(
    { status: healthy ? "ok" : "unavailable" },
    {
      status: healthy ? 200 : 503,
      headers: { "Cache-Control": "no-store" }
    }
  );
}
