import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export const ADMIN_INVITATION_PAGE_SIZE = 20;
export const ADMIN_INVITATION_SEARCH_MAX_LENGTH = 100;

export type AdminInvitationStatusFilter = "all" | "active" | "accepted" | "expired" | "revoked";
export type AdminInvitationSort = "created-desc" | "created-asc" | "expires-asc" | "expires-desc";

export type AdminInvitationQuery = {
  status: AdminInvitationStatusFilter;
  search: string;
  sort: AdminInvitationSort;
  page: number;
};

type AdminInvitationSearchParams = {
  inviteStatus?: string | string[];
  inviteSearch?: string | string[];
  inviteSort?: string | string[];
  invitePage?: string | string[];
};

const adminInvitationSelect = {
  id: true,
  createdAt: true,
  expiresAt: true,
  acceptedAt: true,
  revokedAt: true,
  household: {
    select: {
      name: true
    }
  },
  createdBy: {
    select: {
      name: true,
      email: true
    }
  }
} satisfies Prisma.HouseholdInvitationSelect;

export type AdminInvitationListItem = Prisma.HouseholdInvitationGetPayload<{
  select: typeof adminInvitationSelect;
}>;

type InvitationCountArgs = {
  where: Prisma.HouseholdInvitationWhereInput;
};

type InvitationFindManyArgs = InvitationCountArgs & {
  orderBy: Prisma.HouseholdInvitationOrderByWithRelationInput[];
  skip: number;
  take: number;
  select: typeof adminInvitationSelect;
};

type AdminInvitationReader = {
  count: (args: InvitationCountArgs) => Promise<number>;
  findMany: (args: InvitationFindManyArgs) => Promise<AdminInvitationListItem[]>;
};

type AdminInvitationCounter = {
  count: (args: InvitationCountArgs) => Promise<number>;
};

const adminInvitationReader: AdminInvitationReader = {
  count: (args) => prisma.householdInvitation.count(args),
  findMany: (args) => prisma.householdInvitation.findMany(args)
};

const adminInvitationCounter: AdminInvitationCounter = {
  count: (args) => prisma.householdInvitation.count(args)
};

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function normalizeAdminInvitationStatus(value: string | undefined): AdminInvitationStatusFilter {
  switch (value) {
    case "active":
    case "accepted":
    case "expired":
    case "revoked":
      return value;
    default:
      return "all";
  }
}

export function normalizeAdminInvitationSort(value: string | undefined): AdminInvitationSort {
  switch (value) {
    case "created-asc":
    case "expires-asc":
    case "expires-desc":
      return value;
    default:
      return "created-desc";
  }
}

export function normalizeAdminInvitationSearch(value: string | undefined) {
  if (!value) return "";
  return Array.from(value.trim().normalize("NFKC")).slice(0, ADMIN_INVITATION_SEARCH_MAX_LENGTH).join("");
}

export function normalizeAdminInvitationPage(value: string | undefined) {
  if (!value || !/^\d+$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

export function parseAdminInvitationQuery(params: AdminInvitationSearchParams): AdminInvitationQuery {
  return {
    status: normalizeAdminInvitationStatus(getParam(params.inviteStatus)),
    search: normalizeAdminInvitationSearch(getParam(params.inviteSearch)),
    sort: normalizeAdminInvitationSort(getParam(params.inviteSort)),
    page: normalizeAdminInvitationPage(getParam(params.invitePage))
  };
}

export function buildActiveInvitationWhere(now: Date): Prisma.HouseholdInvitationWhereInput {
  return {
    acceptedAt: null,
    revokedAt: null,
    expiresAt: { gt: now }
  };
}

export function buildAdminInvitationWhere(
  query: Pick<AdminInvitationQuery, "status" | "search">,
  now: Date
): Prisma.HouseholdInvitationWhereInput {
  const where: Prisma.HouseholdInvitationWhereInput = {};

  switch (query.status) {
    case "active":
      Object.assign(where, buildActiveInvitationWhere(now));
      break;
    case "accepted":
      Object.assign(where, { acceptedAt: { not: null }, revokedAt: null });
      break;
    case "expired":
      Object.assign(where, { acceptedAt: null, revokedAt: null, expiresAt: { lte: now } });
      break;
    case "revoked":
      where.revokedAt = { not: null };
      break;
  }

  if (query.search) {
    where.household = {
      name: {
        contains: query.search,
        mode: "insensitive"
      }
    };
  }

  return where;
}

export function buildAdminInvitationOrderBy(
  sort: AdminInvitationSort
): Prisma.HouseholdInvitationOrderByWithRelationInput[] {
  switch (sort) {
    case "created-asc":
      return [{ createdAt: "asc" }, { id: "asc" }];
    case "expires-asc":
      return [{ expiresAt: "asc" }, { id: "asc" }];
    case "expires-desc":
      return [{ expiresAt: "desc" }, { id: "desc" }];
    default:
      return [{ createdAt: "desc" }, { id: "desc" }];
  }
}

export function buildAdminInvitationHref(query: AdminInvitationQuery, page: number) {
  const params = new URLSearchParams({
    inviteStatus: query.status,
    inviteSort: query.sort,
    invitePage: String(page)
  });

  if (query.search) {
    params.set("inviteSearch", query.search);
  }

  return `/admin?${params.toString()}`;
}

export async function getAdminInvitationPage(
  query: AdminInvitationQuery,
  now: Date,
  reader: AdminInvitationReader = adminInvitationReader
) {
  const where = buildAdminInvitationWhere(query, now);
  const totalCount = await reader.count({ where });
  const totalPages = Math.max(Math.ceil(totalCount / ADMIN_INVITATION_PAGE_SIZE), 1);
  const currentPage = Math.min(query.page, totalPages);
  const invitations = await reader.findMany({
    where,
    orderBy: buildAdminInvitationOrderBy(query.sort),
    skip: (currentPage - 1) * ADMIN_INVITATION_PAGE_SIZE,
    take: ADMIN_INVITATION_PAGE_SIZE,
    select: adminInvitationSelect
  });

  return {
    invitations,
    pagination: {
      currentPage,
      totalPages,
      totalCount,
      pageSize: ADMIN_INVITATION_PAGE_SIZE
    }
  };
}

export function getActiveInvitationCount(
  now: Date,
  counter: AdminInvitationCounter = adminInvitationCounter
) {
  return counter.count({ where: buildActiveInvitationWhere(now) });
}
