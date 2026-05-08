import { supabase } from "../supabaseClient";

type StorageBucketApi = ReturnType<typeof supabase.storage.from>;
export type AttachmentSignedUrlResult = Awaited<
  ReturnType<StorageBucketApi["createSignedUrl"]>
>;

export function createAttachmentSignedUrl(
  bucketId: string,
  storagePath: string,
  expiresInSeconds: number,
): Promise<AttachmentSignedUrlResult> {
  return supabase.storage
    .from(bucketId)
    .createSignedUrl(storagePath, expiresInSeconds);
}
