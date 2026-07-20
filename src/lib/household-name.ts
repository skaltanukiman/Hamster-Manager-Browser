import type { HouseholdRole } from "@prisma/client";

import { canUpdateHouseholdName } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { updateHouseholdRevision, type CommittedHouseholdChange } from "@/lib/realtime";

type HouseholdNameMembership = {
  role: HouseholdRole;
  household: {
    name: string;
  };
};

export type HouseholdNameRepository = {
  lockHousehold(householdId: string): Promise<void>;
  findMembership(householdId: string, userId: string): Promise<HouseholdNameMembership | null>;
  updateName(input: {
    householdId: string;
    actorUserId: string;
    currentName: string;
    nextName: string;
  }): Promise<number>;
  commitChange(input: {
    householdId: string;
    actorClientId: string | null;
    actorUserId: string;
  }): Promise<CommittedHouseholdChange>;
};

export type HouseholdNameExecutor = <T>(
  operation: (repository: HouseholdNameRepository) => Promise<T>
) => Promise<T>;

const executePrismaHouseholdNameUpdate: HouseholdNameExecutor = (operation) =>
  prisma.$transaction(async (tx) =>
    operation({
      lockHousehold: async (householdId) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${householdId}, 0))`;
      },
      findMembership: (householdId, userId) =>
        tx.householdMember.findUnique({
          where: { householdId_userId: { householdId, userId } },
          select: {
            role: true,
            household: {
              select: { name: true }
            }
          }
        }),
      updateName: async ({ householdId, actorUserId, currentName, nextName }) => {
        const updated = await tx.household.updateMany({
          where: {
            id: householdId,
            name: currentName,
            members: {
              some: {
                userId: actorUserId,
                role: "OWNER"
              }
            }
          },
          data: { name: nextName }
        });
        return updated.count;
      },
      commitChange: ({ householdId, actorClientId, actorUserId }) =>
        updateHouseholdRevision(tx, householdId, "household", actorClientId, actorUserId)
    })
  );

export type HouseholdNameMutationResult =
  | {
      status: "updated";
      actorHouseholdRole: HouseholdRole;
      change: CommittedHouseholdChange;
    }
  | { status: "unchanged" }
  | { status: "forbidden" }
  | { status: "stateChanged" };

export async function updateHouseholdNameMutation(
  input: {
    householdId: string;
    actorUserId: string;
    actorClientId: string | null;
    expectedName: string;
    nextName: string;
  },
  execute: HouseholdNameExecutor = executePrismaHouseholdNameUpdate
): Promise<HouseholdNameMutationResult> {
  return execute(async (repository) => {
    // 画面表示後の権限・名称変更を見落とさないよう、lock取得後の値を基準に判定する。
    await repository.lockHousehold(input.householdId);

    const membership = await repository.findMembership(input.householdId, input.actorUserId);
    if (!membership || !canUpdateHouseholdName(membership.role)) {
      return { status: "forbidden" };
    }
    if (membership.household.name !== input.expectedName) {
      return { status: "stateChanged" };
    }
    if (membership.household.name === input.nextName) {
      return { status: "unchanged" };
    }

    // 更新条件にも旧名称とOWNER権限を含め、確認後の状態変化を楽観的に検出する。
    const updatedCount = await repository.updateName({
      householdId: input.householdId,
      actorUserId: input.actorUserId,
      currentName: membership.household.name,
      nextName: input.nextName
    });
    if (updatedCount !== 1) {
      return { status: "stateChanged" };
    }

    const change = await repository.commitChange({
      householdId: input.householdId,
      actorClientId: input.actorClientId,
      actorUserId: input.actorUserId
    });
    return {
      status: "updated",
      actorHouseholdRole: membership.role,
      change
    };
  });
}
