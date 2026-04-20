const trimText = (value: unknown) => String(value ?? "").trim();

const sanitizePathSegment = (value: string) =>
  trimText(value)
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "") || "version";

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

export const ACCOUNTANT_PROPOSAL_PDF_MANIFEST_VERSION =
  "pdf_acc_final_proposal_manifest_v1";
export const ACCOUNTANT_PROPOSAL_PDF_DOCUMENT_KIND =
  "accountant_proposal_pdf";
export const ACCOUNTANT_PROPOSAL_PDF_TEMPLATE_VERSION =
  "proposal-template-v1";
export const ACCOUNTANT_PROPOSAL_PDF_RENDER_CONTRACT_VERSION =
  "local_proposal_pdf_render_v1";
export const ACCOUNTANT_PROPOSAL_PDF_ARTIFACT_CONTRACT_VERSION =
  "accountant_proposal_pdf_artifact_v1";

const ACCOUNTANT_PROPOSAL_PDF_SOURCE_VERSION_PREFIX = "aprop_src_v1";
const ACCOUNTANT_PROPOSAL_PDF_ARTIFACT_VERSION_PREFIX = "aprop_art_v1";
const ACCOUNTANT_PROPOSAL_PDF_SCOPE_VERSION_PREFIX = "aprop_scope_v1";
const ACCOUNTANT_PROPOSAL_PDF_ARTIFACT_ROOT =
  "accountant/proposal/artifacts/v1";
const ACCOUNTANT_PROPOSAL_PDF_MANIFEST_ROOT =
  "accountant/proposal/manifests/v1";

export type AccountantProposalPdfManifestStatus =
  | "ready"
  | "building"
  | "stale"
  | "failed"
  | "missing";

export type AccountantProposalPdfDocumentScope = {
  role: "accountant";
  family: "proposal";
  proposalId: string;
};

export type AccountantProposalPdfManifestContract = {
  version: typeof ACCOUNTANT_PROPOSAL_PDF_MANIFEST_VERSION;
  documentKind: typeof ACCOUNTANT_PROPOSAL_PDF_DOCUMENT_KIND;
  documentScope: AccountantProposalPdfDocumentScope;
  sourceVersion: string;
  artifactVersion: string;
  status: AccountantProposalPdfManifestStatus;
  artifactPath: string;
  manifestPath: string;
  fileName: string;
  lastBuiltAt: string | null;
  lastSourceChangeAt: string | null;
  lastSuccessfulArtifact: string | null;
  templateVersion: typeof ACCOUNTANT_PROPOSAL_PDF_TEMPLATE_VERSION;
  renderContractVersion: typeof ACCOUNTANT_PROPOSAL_PDF_RENDER_CONTRACT_VERSION;
};

export function buildAccountantProposalPdfDocumentScope(
  proposalId: string | number,
): AccountantProposalPdfDocumentScope {
  const id = trimText(proposalId);
  if (!id) {
    throw new Error("accountant proposal PDF manifest missing proposalId");
  }
  return {
    role: "accountant",
    family: "proposal",
    proposalId: id,
  };
}

export function normalizeAccountantProposalPdfHtmlForSourceVersion(html: string) {
  return trimText(html)
    .replace(/\r\n/g, "\n")
    .replace(
      /(РЎС„РѕСЂРјРёСЂРѕРІР°РЅРѕ:|Сформировано:)\s*[^<]+/g,
      "$1 <generated_at>",
    )
    .replace(
      /(<span class="ml">(?:Р”Р°С‚Р° СЃРѕР·РґР°РЅРёСЏ|Дата создания):<\/span><span class="mv">)[^<]*(<\/span>)/g,
      "$1<created_at>$2",
    );
}

export function buildAccountantProposalPdfClientSourceFingerprint(args: {
  proposalId: string | number;
  html: string;
}) {
  const documentScope = buildAccountantProposalPdfDocumentScope(args.proposalId);
  const sourceModel = {
    normalizedHtml: normalizeAccountantProposalPdfHtmlForSourceVersion(args.html),
  };
  return `aprop_client_v1_${hashString32(stableJsonStringify({
    version: "accountant_proposal_pdf_client_source_v1",
    documentScope,
    sourceModel,
  }))}`;
}

export function buildAccountantProposalPdfManifestContract(args: {
  proposalId: string | number;
  html: string;
  fileName?: string | null;
}): AccountantProposalPdfManifestContract {
  const documentScope = buildAccountantProposalPdfDocumentScope(args.proposalId);
  const fileName = trimText(args.fileName) || "accountant_proposal.pdf";
  const clientSourceFingerprint = buildAccountantProposalPdfClientSourceFingerprint(args);
  const sourceIdentity = {
    contractVersion: ACCOUNTANT_PROPOSAL_PDF_MANIFEST_VERSION,
    documentKind: ACCOUNTANT_PROPOSAL_PDF_DOCUMENT_KIND,
    documentScope,
    source: {
      sourceKind: "accountant_proposal_pdf_html_source_v1",
      clientSourceFingerprint,
    },
  };
  const sourceVersion = `${ACCOUNTANT_PROPOSAL_PDF_SOURCE_VERSION_PREFIX}_${hashString32(stableJsonStringify(sourceIdentity))}`;
  const artifactVersion = `${ACCOUNTANT_PROPOSAL_PDF_ARTIFACT_VERSION_PREFIX}_${hashString32(stableJsonStringify({
    artifactContractVersion: ACCOUNTANT_PROPOSAL_PDF_ARTIFACT_CONTRACT_VERSION,
    sourceVersion,
    templateVersion: ACCOUNTANT_PROPOSAL_PDF_TEMPLATE_VERSION,
    renderContractVersion: ACCOUNTANT_PROPOSAL_PDF_RENDER_CONTRACT_VERSION,
  }))}`;
  const scopeHash = hashString32(stableJsonStringify({
    scopeVersion: ACCOUNTANT_PROPOSAL_PDF_SCOPE_VERSION_PREFIX,
    documentKind: ACCOUNTANT_PROPOSAL_PDF_DOCUMENT_KIND,
    documentScope,
  }));

  return {
    version: ACCOUNTANT_PROPOSAL_PDF_MANIFEST_VERSION,
    documentKind: ACCOUNTANT_PROPOSAL_PDF_DOCUMENT_KIND,
    documentScope,
    sourceVersion,
    artifactVersion,
    status: "ready",
    artifactPath: `${ACCOUNTANT_PROPOSAL_PDF_ARTIFACT_ROOT}/${sanitizePathSegment(artifactVersion)}/${fileName}`,
    manifestPath: `${ACCOUNTANT_PROPOSAL_PDF_MANIFEST_ROOT}/${sanitizePathSegment(scopeHash)}.json`,
    fileName,
    lastBuiltAt: null,
    lastSourceChangeAt: null,
    lastSuccessfulArtifact: null,
    templateVersion: ACCOUNTANT_PROPOSAL_PDF_TEMPLATE_VERSION,
    renderContractVersion: ACCOUNTANT_PROPOSAL_PDF_RENDER_CONTRACT_VERSION,
  };
}
