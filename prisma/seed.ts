import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function date(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

async function main() {
  const kinako = await prisma.hamster.upsert({
    where: { name: "きなこ" },
    update: {},
    create: {
      name: "きなこ",
      memo: "サンプルデータです。実運用では削除または編集してください。"
    }
  });

  const mugi = await prisma.hamster.upsert({
    where: { name: "むぎ" },
    update: {},
    create: {
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

