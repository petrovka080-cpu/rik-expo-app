import type { SupabaseClient } from "@supabase/supabase-js";

type BuyerRepoStorageBucket = ReturnType<SupabaseClient["storage"]["from"]>;
export type BuyerRepoSignedUrlResult = Awaited<
  ReturnType<BuyerRepoStorageBucket["createSignedUrl"]>
>;

export function createBuyerProposalAttachmentSignedUrl(params: {
  supabase: SupabaseClient;
  bucketId: string;
  storagePath: string;
  expiresInSeconds: number;
}): Promise<BuyerRepoSignedUrlResult> {
  return params.supabase.storage
    .from(params.bucketId)
    .createSignedUrl(params.storagePath, params.expiresInSeconds);
}
