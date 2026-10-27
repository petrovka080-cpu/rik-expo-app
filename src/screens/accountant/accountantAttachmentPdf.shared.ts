const trimText = (value: unknown) => String(value ?? "").trim();

const sanitizePathSegment = (value: string) =>
  trimText(value)
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "") || "version";

function stableJsonStringify(value: unknown): string {
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

export const ACCOUNTANT_ATTACHMENT_PDF_MANIFEST_VERSION =
  "pdf_acc_final_attachment_manifest_v1";
export const ACCOUNTANT_ATTACHMENT_PDF_DOCUMENT_KIND =
  "accountant_attachment_pdf";
export const ACCOUNTANT_ATTACHMENT_PDF_TEMPLATE_VERSION =
  "source-attachment-v1";
export const ACCOUNTANT_ATTACHMENT_PDF_RENDER_CONTRACT_VERSION =
  "remote_attachment_viewer_contract_v1";
export const ACCOUNTANT_ATTACHMENT_PDF_ARTIFACT_CONTRACT_VERSION =
  "accountant_attachment_pdf_artifact_v1";

const ACCOUNTANT_ATTACHMENT_PDF_SOURCE_VERSION_PREFIX = "aatt_src_v1";
const ACCOUNTANT_ATTACHMENT_PDF_ARTIFACT_VERSION_PREFIX = "aatt_art_v1";
const ACCOUNTANT_ATTACHMENT_PDF_SCOPE_VERSION_PREFIX = "aatt_scope_v1";
const ACCOUNTANT_ATTACHMENT_PDF_ARTIFACT_ROOT =
  "accountant/attachment/artifacts/v1";
const ACCOUNTANT_ATTACHMENT_PDF_MANIFEST_ROOT =
  "accountant/attachment/manifests/v1";

export type AccountantAttachmentPdfManifestStatus =
  | "ready"
  | "building"
  | "stale"
  | "failed"
  | "missing";

export type AccountantAttachmentPdfDocumentScope = {
  role: "accountant";
  family: "attachment_pdf";
  proposalId: string;
  groupKey: string;
};

export type AccountantAttachmentPdfSource = {
  proposalId: string | number;
  groupKey: string;
  attachmentId?: string | number | null;
  fileName: string;
  url: string;
  bucketId?: string | null;
  storagePath?: string | null;
  createdAt?: string | null;
};

export type AccountantAttachmentPdfManifestContract = {
  version: typeof ACCOUNTANT_ATTACHMENT_PDF_MANIFEST_VERSION;
  documentKind: typeof ACCOUNTANT_ATTACHMENT_PDF_DOCUMENT_KIND;
  documentScope: AccountantAttachmentPdfDocumentScope;
  sourceVersion: string;
  artifactVersion: string;
  status: AccountantAttachmentPdfManifestStatus;
  artifactPath: string;
  manifestPath: string;
  fileName: string;
  lastBuiltAt: string | null;
  lastSourceChangeAt: string | null;
  lastSuccessfulArtifact: string | null;
  templateVersion: typeof ACCOUNTANT_ATTACHMENT_PDF_TEMPLATE_VERSION;
  renderContractVersion: typeof ACCOUNTANT_ATTACHMENT_PDF_RENDER_CONTRACT_VERSION;
};

export function buildAccountantAttachmentPdfDocumentScope(args: {
  proposalId: string | number;
  groupKey: string;
}): AccountantAttachmentPdfDocumentScope {
  const proposalId = trimText(args.proposalId);
  const groupKey = trimText(args.groupKey);
  if (!proposalId) {
    throw new Error("accountant attachment PDF manifest missing proposalId");
  }
  if (!groupKey) {
    throw new Error("accountant attachment PDF manifest missing groupKey");
  }
  return {
    role: "accountant",
    family: "attachment_pdf",
    proposalId,
    groupKey,
  };
}

function stripUrlQuery(value: unknown) {
  return trimText(value).split("?")[0] || null;
}

export function buildAccountantAttachmentPdfSourceModel(
  source: AccountantAttachmentPdfSource,
) {
  return {
    attachmentId: trimText(source.attachmentId) || null,
    fileName: trimText(source.fileName) || "document.pdf",
    urlBase: stripUrlQuery(source.url),
    bucketId: trimText(source.bucketId) || null,
    storagePath: trimText(source.storagePath) || null,
    createdAt: trimText(source.createdAt) || null,
  };
}

export function buildAccountantAttachmentPdfManifestContract(
  source: AccountantAttachmentPdfSource,
): AccountantAttachmentPdfManifestContract {
  const documentScope = buildAccountantAttachmentPdfDocumentScope(source);
  const fileName = trimText(source.fileName) || "accountant_attachment.pdf";
  const sourceModel = buildAccountantAttachmentPdfSourceModel(source);
  const sourceIdentity = {
    contractVersion: ACCOUNTANT_ATTACHMENT_PDF_MANIFEST_VERSION,
    documentKind: ACCOUNTANT_ATTACHMENT_PDF_DOCUMENT_KIND,
    documentScope,
    source: {
      sourceKind: "accountant_attachment_latest_preview_v1",
      sourceModel,
    },
  };
  const sourceVersion = `${ACCOUNTANT_ATTACHMENT_PDF_SOURCE_VERSION_PREFIX}_${hashString32(stableJsonStringify(sourceIdentity))}`;
  const artifactVersion = `${ACCOUNTANT_ATTACHMENT_PDF_ARTIFACT_VERSION_PREFIX}_${hashString32(stableJsonStringify({
    artifactContractVersion: ACCOUNTANT_ATTACHMENT_PDF_ARTIFACT_CONTRACT_VERSION,
    sourceVersion,
    templateVersion: ACCOUNTANT_ATTACHMENT_PDF_TEMPLATE_VERSION,
    renderContractVersion: ACCOUNTANT_ATTACHMENT_PDF_RENDER_CONTRACT_VERSION,
  }))}`;
  const scopeHash = hashString32(stableJsonStringify({
    scopeVersion: ACCOUNTANT_ATTACHMENT_PDF_SCOPE_VERSION_PREFIX,
    documentKind: ACCOUNTANT_ATTACHMENT_PDF_DOCUMENT_KIND,
    documentScope,
  }));

  return {
    version: ACCOUNTANT_ATTACHMENT_PDF_MANIFEST_VERSION,
    documentKind: ACCOUNTANT_ATTACHMENT_PDF_DOCUMENT_KIND,
    documentScope,
    sourceVersion,
    artifactVersion,
    status: "ready",
    artifactPath: `${ACCOUNTANT_ATTACHMENT_PDF_ARTIFACT_ROOT}/${sanitizePathSegment(artifactVersion)}/${fileName}`,
    manifestPath: `${ACCOUNTANT_ATTACHMENT_PDF_MANIFEST_ROOT}/${sanitizePathSegment(scopeHash)}.json`,
    fileName,
    lastBuiltAt: null,
    lastSourceChangeAt: null,
    lastSuccessfulArtifact: null,
    templateVersion: ACCOUNTANT_ATTACHMENT_PDF_TEMPLATE_VERSION,
    renderContractVersion: ACCOUNTANT_ATTACHMENT_PDF_RENDER_CONTRACT_VERSION,
  };
}
