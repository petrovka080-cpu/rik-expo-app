import { supabase } from "../../lib/supabaseClient";

export const PROFILE_AVATAR_BUCKET = "avatars" as const;

type ProfileAvatarStorageBucket = ReturnType<typeof supabase.storage.from>;
export type ProfileAvatarUploadBody = Parameters<ProfileAvatarStorageBucket["upload"]>[1];
export type ProfileAvatarUploadOptions = Parameters<ProfileAvatarStorageBucket["upload"]>[2];
export type ProfileAvatarUploadResult = Awaited<ReturnType<ProfileAvatarStorageBucket["upload"]>>;
export type ProfileAvatarPublicUrlResult = ReturnType<ProfileAvatarStorageBucket["getPublicUrl"]>;

export function uploadProfileAvatarObject(
  filePath: string,
  body: ProfileAvatarUploadBody,
  options: ProfileAvatarUploadOptions,
): Promise<ProfileAvatarUploadResult> {
  return supabase.storage.from(PROFILE_AVATAR_BUCKET).upload(filePath, body, options);
}

export function getProfileAvatarPublicUrl(filePath: string): ProfileAvatarPublicUrlResult {
  return supabase.storage.from(PROFILE_AVATAR_BUCKET).getPublicUrl(filePath);
}
