import type { AppAccessSourceSnapshot } from "../../lib/appAccessModel";
import type { Company, UserProfile } from "../profile/profile.types";

export type OfficeAccessMember = {
  userId: string;
  role: string | null;
  fullName: string | null;
  phone: string | null;
  createdAt: string | null;
  isOwner: boolean;
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
  accessSourceSnapshot: AppAccessSourceSnapshot;
  members: OfficeAccessMember[];
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
