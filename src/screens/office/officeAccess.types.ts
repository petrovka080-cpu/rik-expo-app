import type { AppAccessSourceSnapshot } from "../../lib/appAccessModel";
import type { DeveloperOverrideContext } from "../../lib/developerOverride";
import type { Company, UserProfile } from "../profile/profile.types";

export type OfficeAccessMember = {
  userId: string;
  role: string | null;
  fullName: string | null;
  phone: string | null;
  createdAt: string | null;
  isOwner: boolean;
};

export type OfficeMembersPagination = {
  limit: number;
  nextOffset: number;
  total: number;
  hasMore: boolean;
};

export type OfficeMembersPageResult = {
  members: OfficeAccessMember[];
  membersPagination: OfficeMembersPagination;
};

export type OfficeAccessInvite = {
  id: string;
  inviteCode: string;
  name: string;
  phone: string;
  email: string | null;
  role: string;
  status: string;
  createdAt: string;
  expiresAt: string | null;
  comment: string | null;
};

export type OfficeAccessScreenData = {
  currentUserId: string;
  profile: UserProfile;
  profileEmail: string | null;
  profileRole: string | null;
  company: Company | null;
  companyAccessRole: string | null;
  developerOverride?: DeveloperOverrideContext | null;
  accessSourceSnapshot: AppAccessSourceSnapshot;
  members: OfficeAccessMember[];
  membersPagination: OfficeMembersPagination;
  invites: OfficeAccessInvite[];
};

export type CreateCompanyDraft = {
  name: string;
  legalAddress: string;
  industry: string;
  inn: string;
  phoneMain: string;
  additionalPhones: string[];
  email: string;
  constructionObjectName: string;
  siteAddress: string;
  website: string;
};

export type CreateInviteDraft = {
  name: string;
  phone: string;
  email: string;
  role: string;
  comment: string;
};

export type CreatedOfficeInvite = {
  id: string;
  companyId: string;
  inviteCode: string;
  name: string;
  phone: string;
  email: string | null;
  role: string;
  status: string;
  createdAt: string | null;
  comment: string | null;
};

export const OFFICE_MEMBERS_PAGE_LIMIT = 25;
export const OFFICE_MEMBERS_PAGE_MAX_LIMIT = 100;

export type OfficeMembersPageParams = {
  limit?: number | null;
  offset?: number | null;
};

export const EMPTY_OFFICE_MEMBERS_PAGINATION: OfficeMembersPagination = {
  limit: OFFICE_MEMBERS_PAGE_LIMIT,
  nextOffset: 0,
  total: 0,
  hasMore: false,
};

const toFiniteInteger = (value: unknown): number | null => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.trunc(numeric);
};

export function normalizeOfficeMembersPageParams(
  params: OfficeMembersPageParams = {},
) {
  const limitValue = toFiniteInteger(params.limit);
  const offsetValue = toFiniteInteger(params.offset);

  return {
    limit:
      limitValue && limitValue > 0
        ? Math.min(limitValue, OFFICE_MEMBERS_PAGE_MAX_LIMIT)
        : OFFICE_MEMBERS_PAGE_LIMIT,
    offset: offsetValue && offsetValue > 0 ? offsetValue : 0,
  };
}

export function buildOfficeMembersPagination(params: {
  limit: number;
  offset: number;
  total: number | null;
  loadedCount: number;
}): OfficeMembersPagination {
  const total =
    typeof params.total === "number" && Number.isFinite(params.total)
      ? Math.max(0, Math.trunc(params.total))
      : 0;
  const loadedCount = Math.max(0, Math.trunc(params.loadedCount));
  const nextOffset = Math.min(params.offset + loadedCount, total);

  return {
    limit: params.limit,
    nextOffset,
    total,
    hasMore: nextOffset < total,
  };
}

export function mergeOfficeMembersPages(
  current: OfficeAccessMember[],
  next: OfficeAccessMember[],
) {
  const seenUserIds = new Set(
    current.map((member) => member.userId).filter((userId) => userId.trim()),
  );
  const merged = [...current];

  for (const member of next) {
    const userId = member.userId.trim();
    if (!userId || seenUserIds.has(userId)) continue;
    seenUserIds.add(userId);
    merged.push(member);
  }

  return merged;
}
