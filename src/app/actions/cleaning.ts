"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getDaysInMonth, isFutureDateInput, parseDateInput } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import { cleaningMonthSchema } from "@/lib/schemas";

function getText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getChecked(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

export async function saveCleaningMonth(formData: FormData) {
  const result = cleaningMonthSchema.safeParse(Object.fromEntries(formData));

  if (!result.success) {
    redirect("/cleaning?status=invalid");
  }

  const { hamsterId, yearMonth } = result.data;
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
    redirect(`/cleaning?hamsterId=${encodeURIComponent(hamsterId)}&month=${yearMonth}&status=future`);
  }

  // 未来日を含む月でも、当日以前の行だけを保存対象にする。
  const editableDays = days.filter((day) => !isFutureDateInput(day.date));

  if (editableDays.length === 0) {
    redirect(`/cleaning?hamsterId=${encodeURIComponent(hamsterId)}&month=${yearMonth}&status=future`);
  }

  const operations = editableDays.map((day) => {
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

    const recordDate = parseDateInput(day.date);

    if (!hasRecord) {
      // チェックもメモも空になった日は、空レコードを残さず未記録として扱う。
      return prisma.cleaningRecord.deleteMany({
        where: {
          hamsterId,
          recordDate
        }
      });
    }

    // ハムスターごとに1日1レコードへ集約するため、同じ日の入力は作成または更新で保存する。
    return prisma.cleaningRecord.upsert({
      where: {
        hamsterId_recordDate: {
          hamsterId,
          recordDate
        }
      },
      update: data,
      create: {
        hamsterId,
        recordDate,
        ...data
      }
    });
  });

  // 月の表全体を一括保存するため、日別の作成・更新・削除を同一トランザクションで確定する。
  await prisma.$transaction(operations);

  revalidatePath("/");
  revalidatePath("/cleaning");
  redirect(`/cleaning?hamsterId=${encodeURIComponent(hamsterId)}&month=${yearMonth}&status=saved`);
}
