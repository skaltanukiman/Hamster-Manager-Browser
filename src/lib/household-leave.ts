import { Prisma, type HouseholdRole } from "@prisma/client";

import {
  getHouseholdLeaveRequirement,
  ownershipTransferTargetDenial
} from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { updateHouseholdRevision, type CommittedHouseholdChange } from "@/lib/realtime";

type LeaveMembership = {
  id: string;
  householdId: string;
  userId: string;
  role: HouseholdRole;
};

export type HouseholdLeaveRepository = {
  lockHousehold(householdId: string): Promise<void>;
  findMembership(householdId: string, userId: string): Promise<LeaveMembership | null>;
  countMembers(householdId: string): Promise<number>;
  countOwners(householdId: string): Promise<number>;
  promoteToOwner(membership: LeaveMembership): Promise<number>;
  deleteAppSetting(householdId: string, userId: string): Promise<number>;
  deleteMembership(membership: LeaveMembership): Promise<number>;
  commitChange(input: {
    householdId: string;
    actorClientId: string | null;
    actorUserId: string;
  }): Promise<CommittedHouseholdChange>;
};

export type HouseholdLeaveExecutor = <T>(
  operation: (repository: HouseholdLeaveRepository) => Promise<T>
) => Promise<T>;

class HouseholdLeaveConflictError extends Error {}

export function createPrismaHouseholdLeaveRepository(
  tx: Prisma.TransactionClient
): HouseholdLeaveRepository {
  return {
    lockHousehold: async (householdId) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${householdId}, 0))`;
    },
    findMembership: (householdId, userId) =>
      tx.householdMember.findUnique({
        where: { householdId_userId: { householdId, userId } },
        select: { id: true, householdId: true, userId: true, role: true }
      }),
    countMembers: (householdId) => tx.householdMember.count({ where: { householdId } }),
    countOwners: (householdId) =>
      tx.householdMember.count({ where: { householdId, role: "OWNER" } }),
    promoteToOwner: async (membership) => {
      const updated = await tx.householdMember.updateMany({
        where: {
          id: membership.id,
          householdId: membership.householdId,
          userId: membership.userId,
          role: membership.role
        },
        data: { role: "OWNER" }
      });
      return updated.count;
    },
    deleteAppSetting: async (householdId, userId) => {
      const deleted = await tx.appSetting.deleteMany({ where: { householdId, userId } });
      return deleted.count;
    },
    deleteMembership: async (membership) => {
      const deleted = await tx.householdMember.deleteMany({
        where: {
          id: membership.id,
          householdId: membership.householdId,
          userId: membership.userId,
          role: membership.role
        }
      });
      return deleted.count;
    },
    commitChange: ({ householdId, actorClientId, actorUserId }) =>
      updateHouseholdRevision(tx, householdId, "member", actorClientId, actorUserId)
  };
}

const executePrismaHouseholdLeave: HouseholdLeaveExecutor = (operation) =>
  prisma.$transaction(async (tx) => operation(createPrismaHouseholdLeaveRepository(tx)));

type HouseholdLeaveFailureStatus =
  | "notMember"
  | "soleMember"
  | "transferRequired"
  | "invalidTransferTarget"
  | "transferTargetUnavailable"
  | "stateChanged";

export type HouseholdLeaveMutationResult =
  | {
      status: "left";
      previousRole: HouseholdRole;
      change: CommittedHouseholdChange;
    }
  | {
      status: "transferredAndLeft";
      previousRole: HouseholdRole;
      transferTargetUserId: string;
      transferTargetPreviousRole: HouseholdRole;
      change: CommittedHouseholdChange;
    }
  | { [Status in HouseholdLeaveFailureStatus]: { status: Status } }[HouseholdLeaveFailureStatus];

export async function leaveHouseholdMembership(
  input: {
    householdId: string;
    actorUserId: string;
    actorClientId: string | null;
    transferToUserId: string | null;
  },
  execute: HouseholdLeaveExecutor = executePrismaHouseholdLeave
): Promise<HouseholdLeaveMutationResult> {
  try {
    return await execute(async (repository) => {
      // OWNER移譲と退出を分離できないよう、Household単位のlock内で最新状態を再確認する。
      await repository.lockHousehold(input.householdId);

      const membership = await repository.findMembership(input.householdId, input.actorUserId);
      if (!membership) return { status: "notMember" };

      const [memberCount, ownerCount] = await Promise.all([
        repository.countMembers(input.householdId),
        repository.countOwners(input.householdId)
      ]);
      if (ownerCount < 1) return { status: "stateChanged" };

      const requirement = getHouseholdLeaveRequirement({
        role: membership.role,
        ownerCount,
        memberCount
      });
      if (requirement === "soleMember") return { status: "soleMember" };

      let transferTarget: LeaveMembership | null = null;
      if (requirement === "transferOwnership") {
        if (!input.transferToUserId) return { status: "transferRequired" };
        if (input.transferToUserId === input.actorUserId) return { status: "invalidTransferTarget" };

        transferTarget = await repository.findMembership(input.householdId, input.transferToUserId);
        const targetDenial = ownershipTransferTargetDenial({
          actorUserId: input.actorUserId,
          targetUserId: input.transferToUserId,
          targetHouseholdId: transferTarget?.householdId ?? null,
          householdId: input.householdId
        });
        if (targetDenial) return { status: targetDenial };

        // 退出者を削除する前に移譲先をOWNERへ更新し、transaction内でもOWNER不在の順序を作らない。
        if (!transferTarget || (await repository.promoteToOwner(transferTarget)) !== 1) {
          throw new HouseholdLeaveConflictError();
        }
      }

      // 個人設定はmembershipのCascade対象ではないため、退出するHousehold分だけ明示的に削除する。
      await repository.deleteAppSetting(input.householdId, input.actorUserId);
      if ((await repository.deleteMembership(membership)) !== 1) {
        throw new HouseholdLeaveConflictError();
      }
      const change = await repository.commitChange({
        householdId: input.householdId,
        actorClientId: input.actorClientId,
        actorUserId: input.actorUserId
      });

      if (transferTarget) {
        return {
          status: "transferredAndLeft",
          previousRole: membership.role,
          transferTargetUserId: transferTarget.userId,
          transferTargetPreviousRole: transferTarget.role,
          change
        };
      }
      return { status: "left", previousRole: membership.role, change };
    });
  } catch (error) {
    if (error instanceof HouseholdLeaveConflictError) return { status: "stateChanged" };
    throw error;
  }
}
