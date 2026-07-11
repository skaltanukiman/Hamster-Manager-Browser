import { REALTIME_ACTOR_FIELD } from "@/lib/realtime-constants";
import { prisma } from "@/lib/prisma";

export type HouseholdChangeSource =
  | "hamster"
  | "cleaning"
  | "weight"
  | "settings"
  | "member"
  | "profile";

export type HouseholdChangeEvent = {
  id: number;
  householdId: string;
  source: HouseholdChangeSource;
  actorClientId: string | null;
  actorUserId: string | null;
  revision: string;
  createdAt: string;
};

type HouseholdChangeListener = (event: HouseholdChangeEvent) => void;

type RealtimeBus = {
  nextId: number;
  listeners: Set<HouseholdChangeListener>;
};

type RealtimeGlobal = typeof globalThis & {
  __hamsterRealtimeBus?: RealtimeBus;
};

const REALTIME_ACTOR_ID_PATTERN = /^[A-Za-z0-9-]{1,128}$/;

function getRealtimeBus() {
  const globalForRealtime = globalThis as RealtimeGlobal;

  if (!globalForRealtime.__hamsterRealtimeBus) {
    globalForRealtime.__hamsterRealtimeBus = {
      nextId: 1,
      listeners: new Set()
    };
  }

  return globalForRealtime.__hamsterRealtimeBus;
}

export function subscribeHouseholdChanges(listener: HouseholdChangeListener) {
  const bus = getRealtimeBus();
  bus.listeners.add(listener);

  return () => {
    bus.listeners.delete(listener);
  };
}

export function publishHouseholdChange({
  householdId,
  source,
  actorClientId,
  actorUserId,
  revision
}: {
  householdId: string;
  source: HouseholdChangeSource;
  actorClientId?: string | null;
  actorUserId?: string | null;
  revision: string;
}) {
  const bus = getRealtimeBus();
  const event: HouseholdChangeEvent = {
    id: bus.nextId,
    householdId,
    source,
    actorClientId: actorClientId ?? null,
    actorUserId: actorUserId ?? null,
    revision,
    createdAt: new Date().toISOString()
  };

  bus.nextId += 1;

  for (const listener of bus.listeners) {
    listener(event);
  }
}

export function getRealtimeActorId(formData: FormData | undefined) {
  const actorId = formData?.get(REALTIME_ACTOR_FIELD);
  return typeof actorId === "string" && REALTIME_ACTOR_ID_PATTERN.test(actorId) ? actorId : null;
}

export async function notifyHouseholdChange(
  householdId: string,
  source: HouseholdChangeSource,
  actorClientId?: string | null,
  actorUserId?: string | null
) {
  const household = await prisma.household.update({
    where: { id: householdId },
    data: {
      realtimeRevision: { increment: 1 },
      realtimeActorClientId: actorClientId ?? null,
      realtimeActorUserId: actorUserId ?? null
    },
    select: { realtimeRevision: true }
  });

  publishHouseholdChange({
    householdId,
    source,
    actorClientId,
    actorUserId,
    revision: household.realtimeRevision.toString()
  });
}

export async function notifyHouseholdChanges(
  householdIds: string[],
  source: HouseholdChangeSource,
  actorClientId?: string | null,
  actorUserId?: string | null
) {
  const uniqueHouseholdIds = [...new Set(householdIds)];
  const households = await prisma.$transaction(
    uniqueHouseholdIds.map((householdId) =>
      prisma.household.update({
        where: { id: householdId },
        data: {
          realtimeRevision: { increment: 1 },
          realtimeActorClientId: actorClientId ?? null,
          realtimeActorUserId: actorUserId ?? null
        },
        select: { id: true, realtimeRevision: true }
      })
    )
  );

  for (const household of households) {
    publishHouseholdChange({
      householdId: household.id,
      source,
      actorClientId,
      actorUserId,
      revision: household.realtimeRevision.toString()
    });
  }
}
