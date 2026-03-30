import { supabase } from "../supabaseClient";
import { attachProposalAttachmentEvidence } from "./proposalAttachmentEvidence.api";

export type QueuedProposalAttachment = {
  supplierKey: string;
  fileName: string;
  bucketId: string;
  storagePath: string;
  groupKey: string;
  mimeType?: string | null;
  size?: number | null;
};

export async function bindQueuedProposalAttachmentToProposal(
  proposalId: string,
  attachment: QueuedProposalAttachment,
): Promise<void> {
  const pid = String(proposalId ?? "").trim();
  const bucketId = String(attachment.bucketId ?? "").trim();
  const storagePath = String(attachment.storagePath ?? "").trim();
  const fileName = String(attachment.fileName ?? "").trim();
  const groupKey = String(attachment.groupKey ?? "").trim();

  if (!pid) throw new Error("bindQueuedProposalAttachmentToProposal: proposalId empty");
  if (!bucketId) throw new Error("bindQueuedProposalAttachmentToProposal: bucket_id empty");
  if (!storagePath) throw new Error("bindQueuedProposalAttachmentToProposal: storage_path empty");
  if (!fileName) throw new Error("bindQueuedProposalAttachmentToProposal: file_name empty");
  if (!groupKey) throw new Error("bindQueuedProposalAttachmentToProposal: group_key empty");

  await attachProposalAttachmentEvidence(supabase, {
    proposalId: pid,
    bucketId,
    storagePath,
    fileName,
    groupKey,
    mimeType: attachment.mimeType ?? null,
  });
}
