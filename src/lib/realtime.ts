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
  latestEventsByHouseholdId: Map<string, HouseholdChangeEvent>;
};

type RealtimeGlobal = typeof globalThis & {
  __hamsterRealtimeBus?: RealtimeBus;
};

function getRealtimeBus() {
  const globalForRealtime = globalThis as RealtimeGlobal;

  if (!globalForRealtime.__hamsterRealtimeBus) {
    globalForRealtime.__hamsterRealtimeBus = {
      nextId: 1,
      listeners: new Set(),
      latestEventsByHouseholdId: new Map()
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
  bus.latestEventsByHouseholdId.set(householdId, event);

  for (const listener of bus.listeners) {
    listener(event);
  }
}

export function getLatestHouseholdChange(householdId: string) {
  return getRealtimeBus().latestEventsByHouseholdId.get(householdId) ?? null;
}

export function getRealtimeActorId(formData: FormData | undefined) {
  const actorId = formData?.get(REALTIME_ACTOR_FIELD);
  return typeof actorId === "string" && actorId.length > 0 ? actorId : null;
}

export async function notifyHouseholdChange(
  householdId: string,
  source: HouseholdChangeSource,
  actorClientId?: string | null,
  actorUserId?: string | null
) {
  const revisionDate = new Date();

  await prisma.household.updateMany({
    where: { id: householdId },
    data: { updatedAt: revisionDate }
  });

  publishHouseholdChange({ householdId, source, actorClientId, actorUserId, revision: revisionDate.toISOString() });
}

export async function notifyHouseholdChanges(
  householdIds: string[],
  source: HouseholdChangeSource,
  actorClientId?: string | null,
  actorUserId?: string | null
) {
  const uniqueHouseholdIds = [...new Set(householdIds)];
  const revisionDate = new Date();

  await prisma.household.updateMany({
    where: { id: { in: uniqueHouseholdIds } },
    data: { updatedAt: revisionDate }
  });

  for (const householdId of uniqueHouseholdIds) {
    publishHouseholdChange({ householdId, source, actorClientId, actorUserId, revision: revisionDate.toISOString() });
  }
}
