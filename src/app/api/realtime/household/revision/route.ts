import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getLatestHouseholdChange } from "@/lib/realtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const householdId = request.nextUrl.searchParams.get("householdId");

  if (!householdId) {
    return NextResponse.json({ message: "Bad Request" }, { status: 400 });
  }

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
          updatedAt: true
        }
      }
    }
  });

  if (!membership) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const revision = membership.household.updatedAt.toISOString();
  const latestChange = getLatestHouseholdChange(householdId);
  const latestMatchingChange = latestChange?.revision === revision ? latestChange : null;

  return NextResponse.json({
    householdId,
    revision,
    actorClientId: latestMatchingChange?.actorClientId ?? null,
    actorUserId: latestMatchingChange?.actorUserId ?? null
  });
}
