import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const LEGACY_APP_SETTING_ID = "default";
const DEFAULT_DASHBOARD_BOARD_COUNT = 6;
const DEFAULT_HAMSTER_SELECTOR_MODE = "select";

function getEmailArgument() {
  const emailFlagIndex = process.argv.indexOf("--email");

  if (emailFlagIndex >= 0) {
    return process.argv[emailFlagIndex + 1];
  }

  const inlineEmail = process.argv.find((value) => value.startsWith("--email="));
  return inlineEmail?.slice("--email=".length);
}

function defaultHouseholdName(user: { name: string | null; email: string | null }) {
  return `${user.name || user.email || "管理者"}のハムスター管理`;
}

async function main() {
  const email = getEmailArgument();

  if (!email) {
    throw new Error("Usage: npm run migrate:assign-owner -- --email example@gmail.com");
  }

  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    throw new Error(`User not found: ${email}. Run Google login once before assigning legacy data.`);
  }

  const membership =
    (await prisma.householdMember.findFirst({
      where: { userId: user.id },
      include: { household: true },
      orderBy: { createdAt: "asc" }
    })) ??
    (
      await prisma.household.create({
        data: {
          name: defaultHouseholdName(user),
          members: {
            create: {
              userId: user.id,
              role: "OWNER"
            }
          }
        },
        include: {
          members: {
            where: { userId: user.id },
            include: { household: true }
          }
        }
      })
    ).members[0];

  const legacySetting = await prisma.appSetting.findUnique({
    where: { id: LEGACY_APP_SETTING_ID },
    include: {
      dashboardHamsters: {
        orderBy: { sortOrder: "asc" }
      }
    }
  });
  const assignedHamsters = await prisma.hamster.updateMany({
    where: { householdId: null },
    data: { householdId: membership.householdId }
  });
  const appSetting = await prisma.appSetting.upsert({
    where: {
      userId_householdId: {
        userId: user.id,
        householdId: membership.householdId
      }
    },
    update: {
      dashboardBoardCount: legacySetting?.dashboardBoardCount ?? DEFAULT_DASHBOARD_BOARD_COUNT,
      hamsterSelectorMode: legacySetting?.hamsterSelectorMode ?? DEFAULT_HAMSTER_SELECTOR_MODE
    },
    create: {
      userId: user.id,
      householdId: membership.householdId,
      dashboardBoardCount: legacySetting?.dashboardBoardCount ?? DEFAULT_DASHBOARD_BOARD_COUNT,
      hamsterSelectorMode: legacySetting?.hamsterSelectorMode ?? DEFAULT_HAMSTER_SELECTOR_MODE
    }
  });

  let migratedDashboardEntries = 0;

  if (legacySetting) {
    const householdHamsters = await prisma.hamster.findMany({
      where: { householdId: membership.householdId },
      select: { id: true }
    });
    const householdHamsterIds = new Set(householdHamsters.map((hamster) => hamster.id));

    for (const entry of legacySetting.dashboardHamsters) {
      if (!householdHamsterIds.has(entry.hamsterId)) {
        continue;
      }

      await prisma.dashboardHamster.upsert({
        where: {
          settingId_hamsterId: {
            settingId: appSetting.id,
            hamsterId: entry.hamsterId
          }
        },
        update: { sortOrder: entry.sortOrder },
        create: {
          settingId: appSetting.id,
          hamsterId: entry.hamsterId,
          sortOrder: entry.sortOrder
        }
      });
      migratedDashboardEntries++;
    }
  }

  console.log(`Owner: ${user.email}`);
  console.log(`Household: ${membership.household.name} (${membership.householdId})`);
  console.log(`Assigned hamsters: ${assignedHamsters.count}`);
  console.log(`Migrated dashboard entries: ${migratedDashboardEntries}`);
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
