import { supabase } from "../../supabaseClient";
import type {
  CompleteSupabaseMediaUploadSessionParams,
  ConfirmSupabaseMediaLinkParams,
  CreateSupabaseMediaUploadSessionParams,
  SupabaseMediaStorageBucket,
  SupabaseMediaUploadBody,
  SupabaseMediaUploadSession,
} from "./mediaBackendUploadService";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function createSupabaseMediaUploadSession(
  params: CreateSupabaseMediaUploadSessionParams,
): Promise<SupabaseMediaUploadSession> {
  const { data, error } = await supabase.rpc("media_backend_create_upload_session" as never, {
    p_org_id: params.orgId,
    p_project_id: params.projectId,
    p_requested_by_user_id: params.requestedByUserId,
    p_requested_by_role: params.requestedByRole,
    p_target_type: params.targetType,
    p_target_id: params.targetId,
    p_media_kind: params.mediaKind,
    p_purpose: params.purpose,
    p_expected_mime_type: params.expectedMimeType,
    p_expected_byte_size_max: params.expectedByteSizeMax,
    p_expected_duration_ms_max: params.expectedDurationMsMax,
  } as never);
  if (error) throw error;

  const uploadSessionId = String(data ?? "").trim();
  if (!UUID_RE.test(uploadSessionId)) {
    throw new Error("media upload session did not return a valid id");
  }

  const storagePrefix = params.storageKeyPrefix ?? params.orgId;
  return {
    uploadSessionId,
    storageBucket: params.storageBucket,
    storageKey: `${storagePrefix}/${uploadSessionId}/original`,
    uploadUrl: params.uploadUrl,
    expiresAt: params.expiresAt,
  };
}

export async function uploadSupabaseMediaObject(params: {
  storageBucket: SupabaseMediaStorageBucket;
  storageKey: string;
  body: SupabaseMediaUploadBody;
  contentType: string;
  upsert?: boolean;
}): Promise<{ uploaded: true }> {
  const upload = await supabase.storage
    .from(params.storageBucket)
    .upload(params.storageKey, params.body, {
      contentType: params.contentType,
      upsert: params.upsert ?? false,
    });
  if (upload.error) throw upload.error;
  return { uploaded: true };
}

export async function completeSupabaseMediaUploadSession(
  params: CompleteSupabaseMediaUploadSessionParams,
): Promise<{ mediaAssetId: string }> {
  const completed = await supabase.rpc("media_backend_complete_upload_session" as never, {
    p_session_id: params.uploadSessionId,
    p_mime_type: params.mimeType,
    p_byte_size: params.byteSize,
    p_content_hash: params.contentHash,
    p_duration_ms: params.durationMs,
    p_width: params.width,
    p_height: params.height,
  } as never);
  if (completed.error) throw completed.error;

  const mediaAssetId = String(completed.data ?? "").trim();
  if (!UUID_RE.test(mediaAssetId)) {
    throw new Error("media upload did not create a valid media asset");
  }

  return { mediaAssetId };
}

export function getSupabaseMediaPublicUrl(params: {
  storageBucket: SupabaseMediaStorageBucket;
  storageKey: string;
}): string {
  const { data } = supabase.storage.from(params.storageBucket).getPublicUrl(params.storageKey);
  return String(data.publicUrl ?? "").trim();
}

export async function confirmSupabaseMediaLink(
  params: ConfirmSupabaseMediaLinkParams,
): Promise<void> {
  const { error } = await supabase.rpc("media_backend_confirm_link" as never, {
    p_media_asset_id: params.mediaAssetId,
    p_org_id: params.orgId,
    p_project_id: params.projectId,
    p_target_type: params.targetType,
    p_target_id: params.targetId,
    p_purpose: params.purpose,
    p_actor_user_id: params.actorUserId,
  } as never);
  if (error) throw error;
}
