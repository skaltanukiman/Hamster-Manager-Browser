import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function date(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

async function main() {
  const sampleUser = await prisma.user.upsert({
    where: { email: "sample@example.com" },
    update: {},
    create: {
      id: "sample-user",
      name: "サンプルユーザー",
      email: "sample@example.com"
    }
  });

  const household = await prisma.household.upsert({
    where: { id: "sample-household" },
    update: {},
    create: {
      id: "sample-household",
      name: "サンプルのハムスター管理",
      members: {
        create: {
          userId: sampleUser.id,
          role: "OWNER"
        }
      },
      appSettings: {
        create: {
          userId: sampleUser.id,
          dashboardBoardCount: 6,
          hamsterSelectorMode: "select"
        }
      }
    }
  });

  const kinako = await prisma.hamster.upsert({
    where: {
      householdId_name: {
        householdId: household.id,
        name: "きなこ"
      }
    },
    update: {},
    create: {
      householdId: household.id,
      name: "きなこ",
      memo: "サンプルデータです。実運用では削除または編集してください。"
    }
  });

  const mugi = await prisma.hamster.upsert({
    where: {
      householdId_name: {
        householdId: household.id,
        name: "むぎ"
      }
    },
    update: {},
    create: {
      householdId: household.id,
      name: "むぎ",
      memo: "掃除と体重の入力例です。"
    }
  });

  await prisma.weightRecord.upsert({
    where: { hamsterId_recordDate: { hamsterId: kinako.id, recordDate: date("2026-06-20") } },
    update: { weightG: 38.5 },
    create: { hamsterId: kinako.id, recordDate: date("2026-06-20"), weightG: 38.5 }
  });

  await prisma.weightRecord.upsert({
    where: { hamsterId_recordDate: { hamsterId: kinako.id, recordDate: date("2026-06-24") } },
    update: { weightG: 39.1 },
    create: { hamsterId: kinako.id, recordDate: date("2026-06-24"), weightG: 39.1 }
  });

  await prisma.weightRecord.upsert({
    where: { hamsterId_recordDate: { hamsterId: mugi.id, recordDate: date("2026-06-23") } },
    update: { weightG: 42.2 },
    create: { hamsterId: mugi.id, recordDate: date("2026-06-23"), weightG: 42.2 }
  });

  await prisma.cleaningRecord.upsert({
    where: { hamsterId_recordDate: { hamsterId: kinako.id, recordDate: date("2026-06-24") } },
    update: {
      toiletCleaned: true,
      bathCleaned: true,
      flooringPartCleaned: false,
      flooringAllCleaned: false,
      houseCleaned: false,
      memo: "サンプル"
    },
    create: {
      hamsterId: kinako.id,
      recordDate: date("2026-06-24"),
      toiletCleaned: true,
      bathCleaned: true,
      memo: "サンプル"
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
