import { supabase } from "../../lib/supabaseClient";
import type { Company, UserProfile } from "../profile/profile.types";
import {
  loadCurrentAuthUser,
  loadProfileScreenData,
} from "../profile/profile.services";
import {
  OFFICE_BOOTSTRAP_ROLE,
  buildOfficeBootstrapProfilePayload,
} from "./officeAccess.model";
import type {
  CreateCompanyDraft,
  CreateInviteDraft,
  OfficeAccessInvite,
  OfficeAccessMember,
  OfficeAccessScreenData,
} from "./officeAccess.types";

type MemberProfileRow = {
  user_id: string;
  full_name: string | null;
  phone: string | null;
};

const normalizeText = (value: unknown): string => String(value ?? "").trim();

const firstMembershipCompanyId = (memberships: Array<{
  companyId: string | null;
  role: string | null;
}>): string | null =>
  memberships.find((item) => normalizeText(item.companyId))?.companyId ?? null;

const buildInviteCode = (): string =>
  `GOX-${Math.random().toString(36).slice(2, 6).toUpperCase()}${Date.now()
    .toString(36)
    .slice(-4)
    .toUpperCase()}`;

const buildCompanyInsertPayload = (params: {
  userId: string;
  profileEmail: string | null;
  draft: CreateCompanyDraft;
}) => ({
  owner_user_id: params.userId,
  name: params.draft.name.trim(),
  city: normalizeText(params.draft.city) || null,
  industry: normalizeText(params.draft.industry) || null,
  phone_main: normalizeText(params.draft.phoneMain) || null,
  email: normalizeText(params.draft.email) || params.profileEmail,
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

async function loadCompanyMembers(
  company: Company,
): Promise<OfficeAccessMember[]> {
  const membersResult = await supabase
    .from("company_members")
    .select("user_id,role,created_at")
    .eq("company_id", company.id)
    .order("created_at", { ascending: true });

  if (membersResult.error) throw membersResult.error;

  const memberRows = Array.isArray(membersResult.data)
    ? membersResult.data
    : [];
  const memberIds = Array.from(
    new Set(
      memberRows
        .map((row) => normalizeText(row?.user_id))
        .filter(Boolean),
    ),
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

  return memberRows.map((row) => {
    const userId = normalizeText(row?.user_id);
    const profile = profileMap.get(userId);
    return {
      userId,
      role: normalizeText(row?.role) || null,
      fullName: profile?.full_name ?? null,
      phone: profile?.phone ?? null,
      createdAt:
        typeof row?.created_at === "string" ? row.created_at : null,
      isOwner: userId === company.owner_user_id,
    };
  });
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
    ? result.data.map((row) => ({
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
      }))
    : [];
}

export async function loadOfficeAccessScreenData(): Promise<OfficeAccessScreenData> {
  const [authUser, baseProfile] = await Promise.all([
    loadCurrentAuthUser(),
    loadProfileScreenData(),
  ]);

  const membershipCompanyId = firstMembershipCompanyId(
    baseProfile.accessSourceSnapshot.companyMemberships,
  );
  const company =
    baseProfile.company ??
    (membershipCompanyId ? await loadCompanyById(membershipCompanyId) : null);

  const members = company ? await loadCompanyMembers(company) : [];
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
    accessSourceSnapshot: company
      ? {
          ...baseProfile.accessSourceSnapshot,
          ownedCompanyId:
            baseProfile.accessSourceSnapshot.ownedCompanyId ?? company.id,
        }
      : baseProfile.accessSourceSnapshot,
    members,
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
    throw new Error("Укажите название компании.");
  }

  const existingCompany = await supabase
    .from("companies")
    .select("id")
    .eq("owner_user_id", user.id)
    .maybeSingle();
  if (existingCompany.error) throw existingCompany.error;
  if (existingCompany.data?.id) {
    throw new Error("Компания уже создана. Откройте контур компании и Office.");
  }

  const { data: companyData, error: companyError } = await supabase
    .from("companies")
    .insert(buildCompanyInsertPayload({
      userId: user.id,
      profileEmail: params.profileEmail,
      draft: params.draft,
    }))
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

  const profilePayload = buildOfficeBootstrapProfilePayload(params.profile);
  const profileResult = await supabase
    .from("user_profiles")
    .upsert(profilePayload, { onConflict: "user_id" });

  if (profileResult.error) throw profileResult.error;
}

export async function createOfficeInvite(params: {
  companyId: string;
  draft: CreateInviteDraft;
}): Promise<void> {
  const name = params.draft.name.trim();
  const phone = params.draft.phone.trim();
  const role = params.draft.role.trim().toLowerCase();
  if (!name) {
    throw new Error("Укажите имя приглашённого сотрудника.");
  }
  if (!phone) {
    throw new Error("Укажите телефон для приглашения.");
  }
  if (!role) {
    throw new Error("Выберите рабочую роль для приглашения.");
  }

  const result = await supabase.from("company_invites").insert({
    company_id: params.companyId,
    invite_code: buildInviteCode(),
    name,
    phone,
    email: normalizeText(params.draft.email) || null,
    role,
    status: "pending",
    comment: normalizeText(params.draft.comment) || null,
  });

  if (result.error) throw result.error;
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
