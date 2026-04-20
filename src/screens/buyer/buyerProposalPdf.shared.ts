import type { ProposalHeadLite, ProposalViewLine } from "./buyer.types";

const trimText = (value: unknown) => String(value ?? "").trim();

const sanitizePathSegment = (value: string) =>
  trimText(value)
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "") || "version";

const normalizeNullableText = (value: unknown) => {
  const text = trimText(value);
  return text || null;
};

const normalizeNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export function stableJsonStringify(value: unknown): string {
  if (value == null) return "null";
  if (typeof value === "number" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJsonStringify).join(",")}]`;
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJsonStringify(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(trimText(value));
}

function hashString32(input: string): string {
  let hash = 2166136261;
  const source = String(input || "");
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export const BUYER_PROPOSAL_PDF_MANIFEST_VERSION =
  "pdf_pur_1_buyer_proposal_manifest_v1";
export const BUYER_PROPOSAL_PDF_DOCUMENT_KIND = "buyer_proposal";
export const BUYER_PROPOSAL_PDF_TEMPLATE_VERSION = "proposal_template_v1";
export const BUYER_PROPOSAL_PDF_RENDER_CONTRACT_VERSION =
  "local_proposal_pdf_render_v1";
export const BUYER_PROPOSAL_PDF_ARTIFACT_CONTRACT_VERSION =
  "buyer_proposal_artifact_v1";

const BUYER_PROPOSAL_PDF_SOURCE_VERSION_PREFIX = "bprop_src_v1";
const BUYER_PROPOSAL_PDF_ARTIFACT_VERSION_PREFIX = "bprop_art_v1";
const BUYER_PROPOSAL_PDF_SCOPE_VERSION_PREFIX = "bprop_scope_v1";
const BUYER_PROPOSAL_PDF_ARTIFACT_ROOT = "buyer/proposal/artifacts/v1";
const BUYER_PROPOSAL_PDF_MANIFEST_ROOT = "buyer/proposal/manifests/v1";

export type BuyerProposalPdfManifestStatus =
  | "ready"
  | "building"
  | "stale"
  | "failed"
  | "missing";

export type BuyerProposalPdfDocumentScope = {
  role: "buyer";
  family: "proposal";
  proposalId: string;
};

export type BuyerProposalPdfSnapshot = {
  head?: ProposalHeadLite | null;
  lines?: ProposalViewLine[] | null;
};

export type BuyerProposalPdfManifestArgs = BuyerProposalPdfSnapshot & {
  proposalId: string | number;
  fileName?: string | null;
};

export type BuyerProposalPdfManifestContract = {
  version: typeof BUYER_PROPOSAL_PDF_MANIFEST_VERSION;
  documentKind: typeof BUYER_PROPOSAL_PDF_DOCUMENT_KIND;
  documentScope: BuyerProposalPdfDocumentScope;
  sourceVersion: string;
  artifactVersion: string;
  status: BuyerProposalPdfManifestStatus;
  artifactPath: string;
  manifestPath: string;
  fileName: string;
  lastBuiltAt: string | null;
  lastSourceChangeAt: string | null;
  lastSuccessfulArtifact: string | null;
  templateVersion: typeof BUYER_PROPOSAL_PDF_TEMPLATE_VERSION;
  renderContractVersion: typeof BUYER_PROPOSAL_PDF_RENDER_CONTRACT_VERSION;
};

export function buildBuyerProposalPdfDocumentScope(
  proposalId: string | number,
): BuyerProposalPdfDocumentScope {
  const id = trimText(proposalId);
  if (!id) {
    throw new Error("buyer proposal manifest missing proposalId");
  }
  return {
    role: "buyer",
    family: "proposal",
    proposalId: id,
  };
}

export function buildBuyerProposalPdfSourceModel(args: BuyerProposalPdfSnapshot) {
  const head = args.head ?? null;
  const lines = Array.isArray(args.lines) ? args.lines : [];
  return {
    head: {
      status: normalizeNullableText(head?.status),
      submitted_at: normalizeNullableText(head?.submitted_at),
    },
    lines: lines.map((line, index) => ({
      index,
      request_item_id: normalizeNullableText(line.request_item_id),
      app_code: normalizeNullableText(line.app_code),
      name_human: normalizeNullableText(line.name_human),
      note: normalizeNullableText(line.note),
      price: line.price == null ? null : normalizeNumber(line.price),
      qty: line.qty == null ? null : normalizeNumber(line.qty),
      rik_code: normalizeNullableText(line.rik_code),
      supplier: normalizeNullableText(line.supplier),
      uom: normalizeNullableText(line.uom),
    })),
  };
}

export function buildBuyerProposalPdfClientSourceFingerprint(
  args: BuyerProposalPdfManifestArgs,
) {
  const documentScope = buildBuyerProposalPdfDocumentScope(args.proposalId);
  const sourceModel = buildBuyerProposalPdfSourceModel(args);
  return `bprop_client_v1_${hashString32(stableJsonStringify({
    version: "buyer_proposal_client_source_v1",
    documentScope,
    sourceModel,
  }))}`;
}

export function buildBuyerProposalPdfManifestContract(
  args: BuyerProposalPdfManifestArgs,
): BuyerProposalPdfManifestContract {
  const documentScope = buildBuyerProposalPdfDocumentScope(args.proposalId);
  const fileName = trimText(args.fileName) || "buyer_proposal.pdf";
  const sourceModel = buildBuyerProposalPdfSourceModel(args);
  const clientSourceFingerprint = buildBuyerProposalPdfClientSourceFingerprint(args);
  const sourceIdentity = {
    contractVersion: BUYER_PROPOSAL_PDF_MANIFEST_VERSION,
    documentKind: BUYER_PROPOSAL_PDF_DOCUMENT_KIND,
    documentScope,
    source: {
      sourceKind: "buyer_proposal_details_snapshot_v1",
      clientSourceFingerprint,
      sourceModel,
    },
  };
  const sourceVersion = `${BUYER_PROPOSAL_PDF_SOURCE_VERSION_PREFIX}_${hashString32(stableJsonStringify(sourceIdentity))}`;
  const artifactVersion = `${BUYER_PROPOSAL_PDF_ARTIFACT_VERSION_PREFIX}_${hashString32(stableJsonStringify({
    artifactContractVersion: BUYER_PROPOSAL_PDF_ARTIFACT_CONTRACT_VERSION,
    sourceVersion,
    templateVersion: BUYER_PROPOSAL_PDF_TEMPLATE_VERSION,
    renderContractVersion: BUYER_PROPOSAL_PDF_RENDER_CONTRACT_VERSION,
  }))}`;
  const scopeHash = hashString32(stableJsonStringify({
    scopeVersion: BUYER_PROPOSAL_PDF_SCOPE_VERSION_PREFIX,
    documentKind: BUYER_PROPOSAL_PDF_DOCUMENT_KIND,
    documentScope,
  }));

  return {
    version: BUYER_PROPOSAL_PDF_MANIFEST_VERSION,
    documentKind: BUYER_PROPOSAL_PDF_DOCUMENT_KIND,
    documentScope,
    sourceVersion,
    artifactVersion,
    status: "ready",
    artifactPath: `${BUYER_PROPOSAL_PDF_ARTIFACT_ROOT}/${sanitizePathSegment(artifactVersion)}/${fileName}`,
    manifestPath: `${BUYER_PROPOSAL_PDF_MANIFEST_ROOT}/${sanitizePathSegment(scopeHash)}.json`,
    fileName,
    lastBuiltAt: null,
    lastSourceChangeAt: null,
    lastSuccessfulArtifact: null,
    templateVersion: BUYER_PROPOSAL_PDF_TEMPLATE_VERSION,
    renderContractVersion: BUYER_PROPOSAL_PDF_RENDER_CONTRACT_VERSION,
  };
}
