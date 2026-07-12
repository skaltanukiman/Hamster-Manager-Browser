import { getHouseholdContextForRoute } from "@/lib/auth-context";
import { canServeHamsterImage, readHamsterImage } from "@/lib/hamster-image";
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
  const hamster = await prisma.hamster.findFirst({
    where: { id, householdId: context.household.id },
    select: { householdId: true, profileImageFileName: true }
  });

  if (
    !hamster ||
    !canServeHamsterImage({
      currentHouseholdId: context.household.id,
      hamsterHouseholdId: hamster.householdId,
      fileName: hamster.profileImageFileName
    })
  ) {
    return notFound();
  }

  try {
    const image = await readHamsterImage(context.household.id, hamster.profileImageFileName!);
    return new Response(image, {
      headers: {
        "Cache-Control": "private, max-age=31536000, immutable",
        "Content-Length": String(image.byteLength),
        "Content-Type": "image/webp",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch {
    return notFound();
  }
}
