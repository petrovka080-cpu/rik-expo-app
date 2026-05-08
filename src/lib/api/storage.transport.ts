import { supabase } from "../supabaseClient";
import {
  attachProposalAttachmentEvidence,
  type ProposalAttachmentEvidenceAttachInput,
} from "./proposalAttachmentEvidence.api";

export const PROPOSAL_FILES_BUCKET = "proposal_files";

type StorageBucketApi = ReturnType<typeof supabase.storage.from>;
export type StorageUploadBody = Parameters<StorageBucketApi["upload"]>[1];

export async function uploadProposalFileObject(params: {
  storagePath: string;
  uploadBody: StorageUploadBody;
  contentType: string;
}): Promise<{ error: Error | null }> {
  const { error } = await supabase.storage
    .from(PROPOSAL_FILES_BUCKET)
    .upload(params.storagePath, params.uploadBody, {
      contentType: params.contentType,
      upsert: false,
    });
  return { error };
}

export async function removeProposalFileObject(
  bucketId: string,
  storagePath: string,
): Promise<void> {
  const removal = await supabase.storage.from(bucketId).remove([storagePath]);
  if (removal.error) throw removal.error;
}

export async function attachProposalAttachmentEvidenceWithDefaultClient(
  input: ProposalAttachmentEvidenceAttachInput,
): Promise<void> {
  await attachProposalAttachmentEvidence(supabase, input);
}
