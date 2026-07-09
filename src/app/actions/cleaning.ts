"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getRequiredHouseholdContext } from "@/lib/auth-context";
import { getDaysInMonth, isFutureDateInput, parseDateInput, toDateInputValue } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import { getRealtimeActorId, notifyHouseholdChange } from "@/lib/realtime";
import { cleaningMonthSchema } from "@/lib/schemas";

type CleaningDayData = {
  toiletCleaned: boolean;
  bathCleaned: boolean;
  flooringPartCleaned: boolean;
  flooringAllCleaned: boolean;
  houseCleaned: boolean;
  memo: string | null;
};

function isSameCleaningData(existing: CleaningDayData, submitted: CleaningDayData) {
  return (
    existing.toiletCleaned === submitted.toiletCleaned &&
    existing.bathCleaned === submitted.bathCleaned &&
    existing.flooringPartCleaned === submitted.flooringPartCleaned &&
    existing.flooringAllCleaned === submitted.flooringAllCleaned &&
    existing.houseCleaned === submitted.houseCleaned &&
    existing.memo === submitted.memo
  );
}

function getText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getChecked(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function cleaningRedirect(hamsterId: string, yearMonth: string, status: string, includeInactive: boolean) {
  const params = new URLSearchParams({
    hamsterId,
    month: yearMonth,
    status
  });

  if (includeInactive) {
    params.set("includeInactive", "1");
  }

  redirect(`/cleaning?${params.toString()}`);
}

export async function saveCleaningMonth(formData: FormData) {
  const context = await getRequiredHouseholdContext();
  const result = cleaningMonthSchema.safeParse(Object.fromEntries(formData));
  const includeInactive = formData.get("includeInactive") === "1";

  if (!result.success) {
    redirect("/cleaning?status=invalid");
  }

  const { hamsterId, yearMonth } = result.data;
  const hamster = await prisma.hamster.findUnique({
    where: { id: hamsterId },
    select: { householdId: true, isActive: true }
  });

  if (!hamster) {
    redirect("/cleaning?status=invalid");
  }

  // 月次フォームは大量の行を保存するため、最初に対象ハムスターの所属家庭を必ず確認する。
  if (hamster.householdId !== context.household.id) {
    redirect("/cleaning?status=invalid");
  }

  // 管理外のハムスターは衛生記録もロックし、復活するまで保存できないようにする。
  if (!hamster.isActive) {
    cleaningRedirect(hamsterId, yearMonth, "locked", includeInactive);
  }

  const days = getDaysInMonth(yearMonth);

  // 画面上は未来日を無効化しているが、直接送信された場合も保存しないようサーバー側で確認する。
  const hasFutureInput = days.some((day) => {
    if (!isFutureDateInput(day.date)) {
      return false;
    }

    return (
      getChecked(formData, `toilet_${day.date}`) ||
      getChecked(formData, `bath_${day.date}`) ||
      getChecked(formData, `flooring_part_${day.date}`) ||
      getChecked(formData, `flooring_all_${day.date}`) ||
      getChecked(formData, `house_${day.date}`) ||
      Boolean(getText(formData, `memo_${day.date}`))
    );
  });

  if (hasFutureInput) {
    cleaningRedirect(hamsterId, yearMonth, "future", includeInactive);
  }

  // 未来日を含む月でも、当日以前の行だけを保存対象にする。
  const editableDays = days.filter((day) => !isFutureDateInput(day.date));

  if (editableDays.length === 0) {
    cleaningRedirect(hamsterId, yearMonth, "future", includeInactive);
  }

  const submittedDays = editableDays.map((day) => {
    const memo = getText(formData, `memo_${day.date}`) || null;
    const data = {
      toiletCleaned: getChecked(formData, `toilet_${day.date}`),
      bathCleaned: getChecked(formData, `bath_${day.date}`),
      flooringPartCleaned: getChecked(formData, `flooring_part_${day.date}`),
      flooringAllCleaned: getChecked(formData, `flooring_all_${day.date}`),
      houseCleaned: getChecked(formData, `house_${day.date}`),
      memo
    };

    const hasRecord =
      data.toiletCleaned ||
      data.bathCleaned ||
      data.flooringPartCleaned ||
      data.flooringAllCleaned ||
      data.houseCleaned ||
      Boolean(memo);

    return {
      date: day.date,
      recordDate: parseDateInput(day.date),
      data,
      hasRecord
    };
  });

  const existingRecords = await prisma.cleaningRecord.findMany({
    where: {
      hamsterId,
      recordDate: {
        in: submittedDays.map((day) => day.recordDate)
      }
    },
    select: {
      id: true,
      recordDate: true,
      toiletCleaned: true,
      bathCleaned: true,
      flooringPartCleaned: true,
      flooringAllCleaned: true,
      houseCleaned: true,
      memo: true
    }
  });
  const existingByDate = new Map(existingRecords.map((record) => [toDateInputValue(record.recordDate), record]));

  const operations = submittedDays.flatMap((day) => {
    const existing = existingByDate.get(day.date);

    if (!day.hasRecord) {
      if (!existing) {
        return [];
      }

      // チェックもメモも空になった日は、空レコードを残さず未記録として扱う。
      return [
        prisma.cleaningRecord.delete({
          where: {
            id: existing.id
          }
        })
      ];
    }

    if (existing) {
      if (isSameCleaningData(existing, day.data)) {
        return [];
      }

      return [
        prisma.cleaningRecord.update({
          where: {
            id: existing.id
          },
          data: day.data
        })
      ];
    }

    // ハムスターごとに1日1レコードへ集約し、入力がある日だけ新規作成する。
    return [
      prisma.cleaningRecord.create({
        data: {
          hamsterId,
          recordDate: day.recordDate,
          ...day.data
        }
      })
    ];
  });

  if (operations.length === 0) {
    cleaningRedirect(hamsterId, yearMonth, "unchanged", includeInactive);
  }

  // 月の表全体を一括保存するため、日別の作成・更新・削除を同一トランザクションで確定する。
  await prisma.$transaction(operations);

  revalidatePath("/");
  revalidatePath("/cleaning");
  await notifyHouseholdChange(context.household.id, "cleaning", getRealtimeActorId(formData));
  cleaningRedirect(hamsterId, yearMonth, "saved", includeInactive);
}
