import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isRpcNonEmptyString,
  isRpcRecord,
  validateRpcResponse,
} from "./queryBoundary";

type ProposalAttachmentEvidenceClient = Pick<SupabaseClient<any, any, any>, "rpc">;

export type ProposalAttachmentEvidenceAttachInput = {
  proposalId: string;
  bucketId: string;
  storagePath: string;
  fileName: string;
  groupKey: string;
  mimeType?: string | null;
  createdBy?: string | null;
};

export type ProposalAttachmentEvidenceDescriptor = {
  attachmentId: string;
  proposalId: string;
  entityType: string;
  entityId: string;
  evidenceKind: string;
  createdBy: string | null;
  visibilityScope: string;
  groupKey: string;
  fileName: string;
  bucketId: string;
  storagePath: string;
  mimeType: string | null;
  sourceKind: string;
};

const text = (value: unknown) => String(value ?? "").trim();

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const isProposalAttachmentEvidenceAttachRpcResponse = (
  value: unknown,
): value is Record<string, unknown> => {
  if (!isRpcRecord(value)) return false;
  return (
    isRpcNonEmptyString(value.attachment_id ?? value.attachmentId) &&
    isRpcNonEmptyString(value.proposal_id ?? value.proposalId) &&
    isRpcNonEmptyString(value.group_key ?? value.groupKey) &&
    isRpcNonEmptyString(value.bucket_id ?? value.bucketId) &&
    isRpcNonEmptyString(value.storage_path ?? value.storagePath)
  );
};

export function parseProposalAttachmentEvidenceDescriptor(
  value: unknown,
): ProposalAttachmentEvidenceDescriptor {
  const row = asRecord(value);
  const attachmentId = text(row.attachment_id ?? row.attachmentId);
  const proposalId = text(row.proposal_id ?? row.proposalId);
  const entityType = text(row.entity_type ?? row.entityType) || "proposal";
  const entityId = text(row.entity_id ?? row.entityId) || proposalId;
  const evidenceKind = text(row.evidence_kind ?? row.evidenceKind) || "secondary_attachment";
  const visibilityScope =
    text(row.visibility_scope ?? row.visibilityScope) || "buyer_director_accountant";
  const groupKey = text(row.group_key ?? row.groupKey);
  const fileName = text(row.file_name ?? row.fileName) || "file";
  const bucketId = text(row.bucket_id ?? row.bucketId);
  const storagePath = text(row.storage_path ?? row.storagePath);

  if (!attachmentId) throw new Error("proposal_attachment_evidence_attach_v1 missing attachment_id");
  if (!proposalId) throw new Error("proposal_attachment_evidence_attach_v1 missing proposal_id");
  if (!groupKey) throw new Error("proposal_attachment_evidence_attach_v1 missing group_key");
  if (!bucketId) throw new Error("proposal_attachment_evidence_attach_v1 missing bucket_id");
  if (!storagePath) throw new Error("proposal_attachment_evidence_attach_v1 missing storage_path");

  return {
    attachmentId,
    proposalId,
    entityType,
    entityId,
    evidenceKind,
    createdBy: text(row.created_by ?? row.createdBy) || null,
    visibilityScope,
    groupKey,
    fileName,
    bucketId,
    storagePath,
    mimeType: text(row.mime_type ?? row.mimeType) || null,
    sourceKind:
      text(row.source_kind ?? row.sourceKind) || "rpc:proposal_attachment_evidence_attach_v1",
  };
}

export async function attachProposalAttachmentEvidence(
  client: ProposalAttachmentEvidenceClient,
  input: ProposalAttachmentEvidenceAttachInput,
): Promise<ProposalAttachmentEvidenceDescriptor> {
  const args = {
    p_proposal_id: text(input.proposalId),
    p_bucket_id: text(input.bucketId),
    p_storage_path: text(input.storagePath),
    p_file_name: text(input.fileName),
    p_group_key: text(input.groupKey),
    p_mime_type: text(input.mimeType) || null,
    p_created_by: text(input.createdBy) || null,
  };

  const rpc = await client.rpc("proposal_attachment_evidence_attach_v1" as never, args as never);
  if (rpc.error) throw rpc.error;
  const validated = validateRpcResponse(
    rpc.data,
    isProposalAttachmentEvidenceAttachRpcResponse,
    {
      rpcName: "proposal_attachment_evidence_attach_v1",
      caller: "attachProposalAttachmentEvidence",
      domain: "proposal",
    },
  );
  return parseProposalAttachmentEvidenceDescriptor(validated);
}
