import { supabase } from "../supabaseClient";

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

  const existing = await supabase
    .from("proposal_attachments")
    .select("id")
    .eq("proposal_id", pid)
    .eq("bucket_id", bucketId)
    .eq("storage_path", storagePath)
    .eq("group_key", groupKey)
    .limit(1)
    .maybeSingle();

  if (existing.error) {
    throw new Error(
      `proposal_attachments SELECT failed: ${existing.error.message}\nproposal_id=${pid}\nbucket_id=${bucketId}\npath=${storagePath}`,
    );
  }
  if (existing.data?.id) return;

  const ins = await supabase.from("proposal_attachments").insert({
    proposal_id: pid,
    bucket_id: bucketId,
    storage_path: storagePath,
    file_name: fileName,
    group_key: groupKey,
    url: null,
  });

  if (ins.error) {
    throw new Error(
      `proposal_attachments INSERT failed: ${ins.error.message}\nproposal_id=${pid}\ngroup_key=${groupKey}\nfile_name=${fileName}\npath=${storagePath}`,
    );
  }
}
