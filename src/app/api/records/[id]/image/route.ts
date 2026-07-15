import { getHouseholdContextForRoute } from "@/lib/auth-context";
import { canServeRecordImage, readRecordImage } from "@/lib/record-image";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function notFound() {
  return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getHouseholdContextForRoute();
  if (!context) {
    return new Response(null, { status: 401, headers: { "Cache-Control": "private, no-store" } });
  }

  const { id } = await params;
  const record = await prisma.hamsterRecord.findFirst({
    where: { id, recordType: "MEMORY", hamster: { householdId: context.household.id } },
    select: {
      hamster: { select: { householdId: true } },
      memoryDetail: { select: { images: { orderBy: { sortOrder: "asc" }, take: 1, select: { fileName: true } } } }
    }
  });
  const fileName = record?.memoryDetail?.images[0]?.fileName ?? null;
  if (
    !record ||
    !canServeRecordImage({
      currentHouseholdId: context.household.id,
      hamsterHouseholdId: record.hamster.householdId,
      fileName
    })
  ) {
    return notFound();
  }

  try {
    const image = await readRecordImage(context.household.id, fileName!);
    return new Response(image, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Length": String(image.byteLength),
        "Content-Type": "image/webp",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch {
    return notFound();
  }
}
