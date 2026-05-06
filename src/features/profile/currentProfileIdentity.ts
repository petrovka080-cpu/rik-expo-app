import { resolveCurrentSessionRole } from "../../lib/sessionRole";
import { loadCurrentProfileFullNameRow } from "../../lib/assistant_store_read.low_risk.transport";
import { supabase } from "../../lib/supabaseClient";

export type CurrentProfileIdentity = {
  userId: string | null;
  fullName: string | null;
  email: string | null;
  role: string | null;
  avatarUrl: string | null;
};

export const EMPTY_CURRENT_PROFILE_IDENTITY: CurrentProfileIdentity = {
  userId: null,
  fullName: null,
  email: null,
  role: null,
  avatarUrl: null,
};

export function toProfileAvatarText(
  name: string | null | undefined,
  fallbackId: string | null | undefined,
): string {
  const trimmedName = String(name ?? "").trim();
  if (trimmedName) return trimmedName[0]!.toUpperCase();
  const trimmedId = String(fallbackId ?? "").trim();
  if (trimmedId) return trimmedId[0]!.toUpperCase();
  return "G";
}

export async function loadCurrentProfileIdentity(): Promise<CurrentProfileIdentity> {
  const sessionResult = await supabase.auth.getSession();
  const user = sessionResult.data.session?.user ?? null;
  if (!user) return EMPTY_CURRENT_PROFILE_IDENTITY;

  const [roleResolution, profileResult] = await Promise.all([
    resolveCurrentSessionRole({
      user,
      trigger: "current_profile_identity",
    }),
    loadCurrentProfileFullNameRow(user.id),
  ]);

  const fullName =
    profileResult.data?.[0]?.full_name ??
    (typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null) ??
    null;

  const avatarUrl =
    typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null;

  return {
    userId: user.id,
    fullName,
    email: user.email ?? null,
    role: roleResolution.role,
    avatarUrl,
  };
}
