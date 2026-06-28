import type { Prisma } from "@prisma/client";

import { APP_SETTING_ID, normalizeDashboardBoardCount } from "@/lib/dashboard-settings";
import { monthDateRange, toDateInputValue } from "@/lib/date";
import { prisma } from "@/lib/prisma";

// ダッシュボードの最終掃除日は、何かしらの掃除項目がチェックされた日だけを対象にする。
const cleaningDoneWhere: Prisma.CleaningRecordWhereInput = {
  OR: [
    { toiletCleaned: true },
    { bathCleaned: true },
    { flooringPartCleaned: true },
    { flooringAllCleaned: true },
    { houseCleaned: true }
  ]
};

// 設定済みの表示対象を優先し、未設定・削除済みIDがある場合は登録順のハムスターで不足分を補う。
function pickDashboardHamsters<T extends { id: string }>(hamsters: T[], boardCount: number, selectedIds: string[]) {
  const hamsterById = new Map(hamsters.map((hamster) => [hamster.id, hamster]));
  const selectedHamsters = selectedIds
    .map((id) => hamsterById.get(id))
    .filter((hamster): hamster is T => Boolean(hamster));
  const selectedIdSet = new Set(selectedHamsters.map((hamster) => hamster.id));
  const fallbackHamsters = hamsters.filter((hamster) => !selectedIdSet.has(hamster.id));

  return [...selectedHamsters, ...fallbackHamsters].slice(0, boardCount);
}

export async function getDashboardData() {
  const [hamsters, setting] = await Promise.all([
    // 一覧カードで使う最新体重・最新掃除だけを取得し、不要な履歴全体は読み込まない。
    prisma.hamster.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        weightRecords: {
          orderBy: [{ recordDate: "desc" }, { createdAt: "desc" }],
          take: 1
        },
        cleaningRecords: {
          where: cleaningDoneWhere,
          orderBy: [{ recordDate: "desc" }, { updatedAt: "desc" }],
          take: 1
        }
      }
    }),
    prisma.appSetting.findUnique({
      where: { id: APP_SETTING_ID },
      include: {
        dashboardHamsters: {
          orderBy: { sortOrder: "asc" }
        }
      }
    })
  ]);
  const boardCount = normalizeDashboardBoardCount(setting?.dashboardBoardCount);
  const selectedIds = setting?.dashboardHamsters.map((entry) => entry.hamsterId) ?? [];

  return {
    hamsters: pickDashboardHamsters(hamsters, boardCount, selectedIds),
    boardCount,
    totalHamsters: hamsters.length
  };
}

export async function getHamsterManagementData() {
  return prisma.hamster.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      _count: {
        select: {
          cleaningRecords: true,
          weightRecords: true
        }
      }
    }
  });
}

export async function getHamsterOptions() {
  return prisma.hamster.findMany({
    orderBy: { createdAt: "asc" }
  });
}

export async function getCleaningPageData(selectedHamsterId: string | undefined, yearMonth: string) {
  const hamsters = await getHamsterOptions();
  // URLのhamsterIdが未指定または削除済みの場合でも、画面を開けるよう先頭のハムスターを選択する。
  const selectedHamster = hamsters.find((hamster) => hamster.id === selectedHamsterId) ?? hamsters[0] ?? null;

  if (!selectedHamster) {
    return { hamsters, selectedHamster, recordsByDate: new Map() };
  }

  const { start, end } = monthDateRange(yearMonth);
  const records = await prisma.cleaningRecord.findMany({
    where: {
      hamsterId: selectedHamster.id,
      recordDate: {
        gte: start,
        lt: end
      }
    },
    orderBy: { recordDate: "asc" }
  });

  return {
    hamsters,
    selectedHamster,
    // 表形式では日付文字列から即座にレコードを引けるよう、DB結果をMapへ変換しておく。
    recordsByDate: new Map(records.map((record) => [toDateInputValue(record.recordDate), record]))
  };
}

export async function getWeightPageData(selectedHamsterId: string | undefined) {
  const hamsters = await getHamsterOptions();
  // URLのhamsterIdが未指定または削除済みの場合でも、画面を開けるよう先頭のハムスターを選択する。
  const selectedHamster = hamsters.find((hamster) => hamster.id === selectedHamsterId) ?? hamsters[0] ?? null;

  if (!selectedHamster) {
    return { hamsters, selectedHamster, records: [], chartRecords: [] };
  }

  const records = await prisma.weightRecord.findMany({
    where: { hamsterId: selectedHamster.id },
    orderBy: [{ recordDate: "desc" }, { createdAt: "desc" }]
  });

  return {
    hamsters,
    selectedHamster,
    records,
    // 履歴一覧は新しい順、グラフは時系列順で扱うため、同じ取得結果から表示用途ごとに並びを分ける。
    chartRecords: [...records].reverse()
  };
}

export async function getDashboardSettingsPageData() {
  const [hamsters, setting] = await Promise.all([
    prisma.hamster.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        memo: true
      }
    }),
    prisma.appSetting.findUnique({
      where: { id: APP_SETTING_ID },
      include: {
        dashboardHamsters: {
          orderBy: { sortOrder: "asc" }
        }
      }
    })
  ]);
  const boardCount = normalizeDashboardBoardCount(setting?.dashboardBoardCount);
  const selectedIds = setting?.dashboardHamsters.map((entry) => entry.hamsterId) ?? [];
  // 設定画面の初期表示でも、ダッシュボードと同じ補完ルールで選択状態を作る。
  const selectedHamsterIds = pickDashboardHamsters(hamsters, boardCount, selectedIds).map((hamster) => hamster.id);

  return {
    boardCount,
    hamsters,
    selectedHamsterIds
  };
}
