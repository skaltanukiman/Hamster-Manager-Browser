import { cookies } from "next/headers";

import { REALTIME_CLIENT_COOKIE } from "@/lib/realtime-constants";

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
  actorClientId
}: {
  householdId: string;
  source: HouseholdChangeSource;
  actorClientId?: string | null;
}) {
  const bus = getRealtimeBus();
  const event: HouseholdChangeEvent = {
    id: bus.nextId,
    householdId,
    source,
    actorClientId: actorClientId ?? null,
    createdAt: new Date().toISOString()
  };

  bus.nextId += 1;

  for (const listener of bus.listeners) {
    listener(event);
  }
}

export async function notifyHouseholdChange(householdId: string, source: HouseholdChangeSource) {
  const cookieStore = await cookies();
  const actorClientId = cookieStore.get(REALTIME_CLIENT_COOKIE)?.value ?? null;

  publishHouseholdChange({ householdId, source, actorClientId });
}

export async function notifyHouseholdChanges(householdIds: string[], source: HouseholdChangeSource) {
  const uniqueHouseholdIds = [...new Set(householdIds)];
  const cookieStore = await cookies();
  const actorClientId = cookieStore.get(REALTIME_CLIENT_COOKIE)?.value ?? null;

  for (const householdId of uniqueHouseholdIds) {
    publishHouseholdChange({ householdId, source, actorClientId });
  }
}
