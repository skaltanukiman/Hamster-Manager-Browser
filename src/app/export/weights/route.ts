import type { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";

import { monthDateRange, toDateInputValue } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import { toCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const hamsterId = searchParams.get("hamsterId") || undefined;
  const month = searchParams.get("month") || undefined;
  const where: Prisma.WeightRecordWhereInput = {};

  if (hamsterId) {
    where.hamsterId = hamsterId;
  }

  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const { start, end } = monthDateRange(month);
    where.recordDate = {
      gte: start,
      lt: end
    };
  }

  const records = await prisma.weightRecord.findMany({
    where,
    include: { hamster: true },
    orderBy: [{ recordDate: "asc" }, { createdAt: "asc" }]
  });

  const rows: Array<Array<string | number>> = [
    ["date", "hamster", "weight_g", "created_at", "updated_at"],
    ...records.map((record) => [
      toDateInputValue(record.recordDate),
      record.hamster.name,
      record.weightG,
      record.createdAt.toISOString(),
      record.updatedAt.toISOString()
    ])
  ];

  const fileParts = ["weight_records"];
  if (hamsterId) {
    fileParts.push("filtered");
  }
  if (month) {
    fileParts.push(month);
  }

  return new Response(`\uFEFF${toCsv(rows)}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileParts.join("_")}.csv"`
    }
  });
}

