import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logUnexpectedError } from "@/lib/server-errors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const householdId = request.nextUrl.searchParams.get("householdId");
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (!householdId) return NextResponse.json({ message: "Bad Request" }, { status: 400 });

    const membership = await prisma.householdMember.findUnique({
    where: {
      householdId_userId: {
        householdId,
        userId
      }
    },
    select: {
      household: {
        select: {
          realtimeRevision: true,
          realtimeActorClientId: true,
          realtimeActorUserId: true
        }
      }
    }
  });

    if (!membership) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    return NextResponse.json({
      householdId,
      revision: membership.household.realtimeRevision.toString(),
      actorClientId: membership.household.realtimeActorClientId,
      actorUserId: membership.household.realtimeActorUserId
    });
  } catch (error) {
    const errorId = logUnexpectedError(error, {
      operation: "realtime.revision.get",
      context: { householdId }
    });
    return NextResponse.json({ message: "同期情報を取得できませんでした。", errorId }, { status: 500 });
  }
}
