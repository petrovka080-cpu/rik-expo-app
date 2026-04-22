import { supabase } from "../../lib/supabaseClient";
import { loadDeveloperOverrideContext } from "../../lib/developerOverride";
import type { Company, UserProfile } from "../profile/profile.types";
import {
  loadCurrentAuthUser,
  loadProfileScreenData,
} from "../profile/profile.services";
import {
  OFFICE_BOOTSTRAP_ROLE,
  buildOfficeBootstrapProfilePayload,
} from "./officeAccess.model";
import {
  buildOfficeMembersPagination,
  normalizeOfficeMembersPageParams,
} from "./officeAccess.types";
import type {
  CreateCompanyDraft,
  CreateInviteDraft,
  CreatedOfficeInvite,
  OfficeAccessInvite,
  OfficeMembersPageResult,
  OfficeAccessScreenData,
} from "./officeAccess.types";

type MemberProfileRow = {
  user_id: string;
  full_name: string | null;
  phone: string | null;
};

type CompanyInviteRow = {
  id: string;
  company_id: string;
  invite_code: string;
  name: string;
  phone: string;
  email: string | null;
  role: string;
  status: string;
  created_at: string;
  expires_at: string | null;
  comment: string | null;
};

const normalizeText = (value: unknown): string => String(value ?? "").trim();

const firstMembershipCompanyId = (memberships: {
  companyId: string | null;
  role: string | null;
}[]): string | null =>
  memberships.find((item) => normalizeText(item.companyId))?.companyId ?? null;

const buildInviteCode = (): string =>
  `GOX-${Math.random().toString(36).slice(2, 6).toUpperCase()}${Date.now()
    .toString(36)
    .slice(-4)
    .toUpperCase()}`;

const buildPhoneOverflow = (phones: string[]): string | null => {
  const normalized = phones
    .map((phone) => normalizeText(phone))
    .filter(Boolean)
    .join(", ");
  return normalized || null;
};

const buildCompanyInsertPayload = (params: {
  userId: string;
  profileEmail: string | null;
  profileCity: string | null;
  draft: CreateCompanyDraft;
}) => ({
  owner_user_id: params.userId,
  name: params.draft.name.trim(),
  city: normalizeText(params.profileCity) || null,
  address: normalizeText(params.draft.legalAddress) || null,
  industry: normalizeText(params.draft.industry) || null,
  inn: normalizeText(params.draft.inn) || null,
  phone_main: normalizeText(params.draft.phoneMain) || null,
  phone_whatsapp: buildPhoneOverflow(params.draft.additionalPhones),
  email: normalizeText(params.draft.email) || params.profileEmail,
  site: normalizeText(params.draft.website) || null,
  about_short: normalizeText(params.draft.constructionObjectName) || null,
  about_full: normalizeText(params.draft.siteAddress) || null,
});

const buildCompanyProfileInsertPayload = (params: {
  companyId: string;
  userId: string;
  profileEmail: string | null;
  draft: CreateCompanyDraft;
}) => ({
  id: params.companyId,
  user_id: params.userId,
  owner_user_id: params.userId,
  name: params.draft.name.trim(),
  inn: normalizeText(params.draft.inn) || null,
  legal_address: normalizeText(params.draft.legalAddress) || null,
  phone: normalizeText(params.draft.phoneMain) || null,
  email: normalizeText(params.draft.email) || params.profileEmail,
  site_address: normalizeText(params.draft.siteAddress) || null,
});

const mapInviteRow = (row: CompanyInviteRow): OfficeAccessInvite => ({
  id: row.id,
  inviteCode: row.invite_code,
  name: row.name,
  phone: row.phone,
  email: row.email,
  role: row.role,
  status: row.status,
  createdAt: row.created_at,
  expiresAt: row.expires_at,
  comment: row.comment,
});

async function loadCompanyById(companyId: string): Promise<Company | null> {
  const result = await supabase
    .from("companies")
    .select("*")
    .eq("id", companyId)
    .maybeSingle();

  if (result.error) throw result.error;
  return result.data ? (result.data as Company) : null;
}

export async function loadOfficeMembersPage(params: {
  company: Company;
  limit?: number | null;
  offset?: number | null;
}): Promise<OfficeMembersPageResult> {
  const page = normalizeOfficeMembersPageParams({
    limit: params.limit,
    offset: params.offset,
  });
  const membersResult = await supabase
    .from("company_members")
    .select("user_id,role,created_at", { count: "exact" })
    .eq("company_id", params.company.id)
    .order("created_at", { ascending: true })
    .order("user_id", { ascending: true })
    .range(page.offset, page.offset + page.limit - 1);

  if (membersResult.error) throw membersResult.error;

  const memberRows = Array.isArray(membersResult.data)
    ? membersResult.data
    : [];
  const memberIds = Array.from(
    new Set(memberRows.map((row) => normalizeText(row?.user_id)).filter(Boolean)),
  );

  const profilesResult = memberIds.length
    ? await supabase
        .from("user_profiles")
        .select("user_id,full_name,phone")
        .in("user_id", memberIds)
    : { data: [], error: null };

  if (profilesResult.error) throw profilesResult.error;

  const profileMap = new Map<string, MemberProfileRow>();
  for (const row of (profilesResult.data ?? []) as MemberProfileRow[]) {
    profileMap.set(row.user_id, row);
  }

  const members = memberRows.map((row) => {
    const userId = normalizeText(row?.user_id);
    const profile = profileMap.get(userId);
    return {
      userId,
      role: normalizeText(row?.role) || null,
      fullName: profile?.full_name ?? null,
      phone: profile?.phone ?? null,
      createdAt: typeof row?.created_at === "string" ? row.created_at : null,
      isOwner: userId === params.company.owner_user_id,
    };
  });

  return {
    members,
    membersPagination: buildOfficeMembersPagination({
      limit: page.limit,
      offset: page.offset,
      total: membersResult.count ?? null,
      loadedCount: members.length,
    }),
  };
}

async function loadCompanyInvites(
  companyId: string,
): Promise<OfficeAccessInvite[]> {
  const result = await supabase
    .from("company_invites")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(30);

  if (result.error) throw result.error;

  return Array.isArray(result.data)
    ? result.data.map((row) => mapInviteRow(row as CompanyInviteRow))
    : [];
}

export async function loadOfficeAccessScreenData(): Promise<OfficeAccessScreenData> {
  const [authUser, baseProfile] = await Promise.all([
    loadCurrentAuthUser(),
    loadProfileScreenData(),
  ]);
  const developerOverride = await loadDeveloperOverrideContext();

  const membershipCompanyId = firstMembershipCompanyId(
    baseProfile.accessSourceSnapshot.companyMemberships,
  );
  const company =
    baseProfile.company ??
    (membershipCompanyId ? await loadCompanyById(membershipCompanyId) : null);

  const defaultMembersPage = {
    members: [],
    membersPagination: buildOfficeMembersPagination({
      limit: normalizeOfficeMembersPageParams().limit,
      offset: 0,
      total: 0,
      loadedCount: 0,
    }),
  };
  const membersPage = company
    ? await loadOfficeMembersPage({ company })
    : defaultMembersPage;
  const invites = company ? await loadCompanyInvites(company.id) : [];
  const companyAccessRole =
    company?.owner_user_id === authUser.id
      ? OFFICE_BOOTSTRAP_ROLE
      : baseProfile.accessSourceSnapshot.companyMemberships.find(
          (item) => item.companyId === company?.id,
        )?.role ?? null;

  return {
    currentUserId: authUser.id,
    profile: baseProfile.profile,
    profileEmail: baseProfile.profileEmail,
    profileRole: baseProfile.profileRole,
    company,
    companyAccessRole,
    developerOverride,
    accessSourceSnapshot: company
      ? {
          ...baseProfile.accessSourceSnapshot,
          developerOverride,
          ownedCompanyId:
            baseProfile.accessSourceSnapshot.ownedCompanyId ?? company.id,
        }
      : {
          ...baseProfile.accessSourceSnapshot,
          developerOverride,
        },
    members: membersPage.members,
    membersPagination: membersPage.membersPagination,
    invites,
  };
}

export async function createOfficeCompany(params: {
  profile: UserProfile;
  profileEmail: string | null;
  draft: CreateCompanyDraft;
}): Promise<void> {
  const user = await loadCurrentAuthUser();
  const companyName = params.draft.name.trim();
  if (!companyName) {
    throw new Error("Укажите наименование компании.");
  }

  const existingCompany = await supabase
    .from("companies")
    .select("id")
    .eq("owner_user_id", user.id)
    .maybeSingle();
  if (existingCompany.error) throw existingCompany.error;
  if (existingCompany.data?.id) {
    throw new Error(
      "Компания уже создана. Откройте Office и продолжайте работу как директор.",
    );
  }

  const { data: companyData, error: companyError } = await supabase
    .from("companies")
    .insert(
      buildCompanyInsertPayload({
        userId: user.id,
        profileEmail: params.profileEmail,
        profileCity: params.profile.city ?? null,
        draft: params.draft,
      }),
    )
    .select("*")
    .single();

  if (companyError) throw companyError;

  const company = companyData as Company;

  const membershipResult = await supabase.from("company_members").insert({
    company_id: company.id,
    user_id: user.id,
    role: OFFICE_BOOTSTRAP_ROLE,
  });
  if (membershipResult.error) throw membershipResult.error;

  const companyProfileResult = await supabase.from("company_profiles").insert(
    buildCompanyProfileInsertPayload({
      companyId: company.id,
      userId: user.id,
      profileEmail: params.profileEmail,
      draft: params.draft,
    }),
  );
  if (companyProfileResult.error) throw companyProfileResult.error;

  const profilePayload = buildOfficeBootstrapProfilePayload(params.profile);
  const profileResult = await supabase
    .from("user_profiles")
    .upsert(profilePayload, { onConflict: "user_id" });

  if (profileResult.error) throw profileResult.error;
}

export async function createOfficeInvite(params: {
  companyId: string;
  draft: CreateInviteDraft;
}): Promise<CreatedOfficeInvite> {
  const name = params.draft.name.trim();
  const phone = params.draft.phone.trim();
  const role = params.draft.role.trim().toLowerCase();
  if (!name) {
    throw new Error("Укажите ФИО сотрудника.");
  }
  if (!phone) {
    throw new Error("Укажите телефон для приглашения.");
  }
  if (!role) {
    throw new Error("Роль приглашения должна быть зафиксирована контекстом.");
  }

  const inviteCode = buildInviteCode();
  const result = await supabase
    .from("company_invites")
    .insert({
      company_id: params.companyId,
      invite_code: inviteCode,
      name,
      phone,
      email: normalizeText(params.draft.email) || null,
      role,
      status: "pending",
      comment: normalizeText(params.draft.comment) || null,
    })
    .select("*")
    .single();

  if (result.error) throw result.error;

  const invite = result.data as CompanyInviteRow;
  return {
    id: invite.id,
    companyId: invite.company_id,
    inviteCode: invite.invite_code,
    name: invite.name,
    phone: invite.phone,
    email: invite.email,
    role: invite.role,
    status: invite.status,
    createdAt: invite.created_at ?? null,
    comment: invite.comment,
  };
}

export async function updateOfficeMemberRole(params: {
  companyId: string;
  memberUserId: string;
  nextRole: string;
}): Promise<void> {
  const role = params.nextRole.trim().toLowerCase();
  if (!role) {
    throw new Error("Выберите роль для назначения.");
  }

  const result = await supabase
    .from("company_members")
    .update({ role })
    .eq("company_id", params.companyId)
    .eq("user_id", params.memberUserId);

  if (result.error) throw result.error;
}
