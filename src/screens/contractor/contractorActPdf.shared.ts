import type { ContractorActPdfData } from "./contractorPdf.data";

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

const normalizeDateForPdfVersion = (value: unknown) => {
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isFinite(time) ? value.toISOString().slice(0, 10) : null;
  }
  const text = trimText(value);
  if (text) {
    const direct = text.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(direct)) return direct;
    const parsed = new Date(text);
    const time = parsed.getTime();
    return Number.isFinite(time) ? parsed.toISOString().slice(0, 10) : text;
  }
  return new Date().toISOString().slice(0, 10);
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

export const CONTRACTOR_ACT_MANIFEST_VERSION =
  "pdf_z5_contractor_act_manifest_v1";
export const CONTRACTOR_ACT_DOCUMENT_KIND = "contractor_act";
export const CONTRACTOR_ACT_TEMPLATE_VERSION = "contractor_act_template_v1";
export const CONTRACTOR_ACT_RENDER_CONTRACT_VERSION =
  "local_contractor_act_render_v1";
export const CONTRACTOR_ACT_ARTIFACT_CONTRACT_VERSION =
  "contractor_act_artifact_v1";

const CONTRACTOR_ACT_SOURCE_VERSION_PREFIX = "cact_src_v1";
const CONTRACTOR_ACT_ARTIFACT_VERSION_PREFIX = "cact_art_v1";
const CONTRACTOR_ACT_SCOPE_VERSION_PREFIX = "cact_scope_v1";
const CONTRACTOR_ACT_ARTIFACT_ROOT = "contractor/act/artifacts/v1";
const CONTRACTOR_ACT_MANIFEST_ROOT = "contractor/act/manifests/v1";

export type ContractorActManifestStatus =
  | "ready"
  | "building"
  | "stale"
  | "failed"
  | "missing";

export type ContractorActDocumentScope = {
  role: "contractor";
  family: "act";
  mode: ContractorActPdfData["mode"];
  progressId: string;
  actNo: string;
};

export type ContractorActManifestContract = {
  version: typeof CONTRACTOR_ACT_MANIFEST_VERSION;
  documentKind: typeof CONTRACTOR_ACT_DOCUMENT_KIND;
  documentScope: ContractorActDocumentScope;
  sourceVersion: string;
  artifactVersion: string;
  status: ContractorActManifestStatus;
  artifactPath: string;
  manifestPath: string;
  fileName: string;
  lastBuiltAt: string | null;
  lastSourceChangeAt: string | null;
  lastSuccessfulArtifact: string | null;
  templateVersion: typeof CONTRACTOR_ACT_TEMPLATE_VERSION;
  renderContractVersion: typeof CONTRACTOR_ACT_RENDER_CONTRACT_VERSION;
};

export function buildContractorActSourceModel(data: ContractorActPdfData) {
  return {
    work: {
      progress_id: trimText(data.work.progress_id),
      work_code: normalizeNullableText(data.work.work_code),
      work_name: normalizeNullableText(data.work.work_name),
      object_name: normalizeNullableText(data.work.object_name),
      contractor_org: normalizeNullableText(data.work.contractor_org),
    },
    materials: (Array.isArray(data.materials) ? data.materials : []).map((material) => ({
      name: normalizeNullableText(material.name),
      qty_fact: normalizeNumber(material.qty_fact),
      price: material.price == null ? null : normalizeNumber(material.price),
      uom: normalizeNullableText(material.uom),
      unit: normalizeNullableText(material.unit),
      act_used_qty: material.act_used_qty == null ? null : normalizeNumber(material.act_used_qty),
    })),
    options: {
      effectiveActDate: normalizeDateForPdfVersion(data.options.actDate),
      selectedWorks: (Array.isArray(data.options.selectedWorks) ? data.options.selectedWorks : []).map((work) => ({
        name: trimText(work.name),
        unit: trimText(work.unit),
        price: normalizeNumber(work.price),
        qty: work.qty == null ? null : normalizeNumber(work.qty),
        comment: normalizeNullableText(work.comment),
      })),
      contractorName: normalizeNullableText(data.options.contractorName),
      contractorInn: normalizeNullableText(data.options.contractorInn),
      contractorPhone: normalizeNullableText(data.options.contractorPhone),
      customerName: normalizeNullableText(data.options.customerName),
      customerInn: normalizeNullableText(data.options.customerInn),
      contractNumber: normalizeNullableText(data.options.contractNumber),
      contractDate: normalizeNullableText(data.options.contractDate),
      zoneText: normalizeNullableText(data.options.zoneText),
      mainWorkName: normalizeNullableText(data.options.mainWorkName),
      actNumber: normalizeNullableText(data.options.actNumber),
    },
  };
}

export function buildContractorActDocumentScope(
  data: ContractorActPdfData,
): ContractorActDocumentScope {
  const progressId = trimText(data.work.progress_id);
  const actNo = trimText(data.actNo);
  if (!progressId) {
    throw new Error("contractor act manifest missing progressId");
  }
  if (!actNo) {
    throw new Error("contractor act manifest missing actNo");
  }
  return {
    role: "contractor",
    family: "act",
    mode: data.mode,
    progressId,
    actNo,
  };
}

export function buildContractorActClientSourceFingerprint(data: ContractorActPdfData) {
  const sourceModel = buildContractorActSourceModel(data);
  const identity = {
    version: "contractor_act_client_source_v1",
    documentScope: buildContractorActDocumentScope(data),
    sourceModel,
  };
  return `cact_client_v1_${hashString32(stableJsonStringify(identity))}`;
}

export function buildContractorActManifestContract(
  data: ContractorActPdfData,
): ContractorActManifestContract {
  const documentScope = buildContractorActDocumentScope(data);
  const fileName = trimText(data.fileName) || "contractor_act.pdf";
  const sourceModel = buildContractorActSourceModel(data);
  const clientSourceFingerprint = `cact_client_v1_${hashString32(stableJsonStringify({
    version: "contractor_act_client_source_v1",
    documentScope,
    sourceModel,
  }))}`;
  const sourceIdentity = {
    contractVersion: CONTRACTOR_ACT_MANIFEST_VERSION,
    documentKind: CONTRACTOR_ACT_DOCUMENT_KIND,
    documentScope,
    source: {
      sourceKind: "contractor_act_pdf_data_v1",
      clientSourceFingerprint,
      sourceModel,
    },
  };
  const sourceVersion = `${CONTRACTOR_ACT_SOURCE_VERSION_PREFIX}_${hashString32(stableJsonStringify(sourceIdentity))}`;
  const artifactVersion = `${CONTRACTOR_ACT_ARTIFACT_VERSION_PREFIX}_${hashString32(stableJsonStringify({
    artifactContractVersion: CONTRACTOR_ACT_ARTIFACT_CONTRACT_VERSION,
    sourceVersion,
    templateVersion: CONTRACTOR_ACT_TEMPLATE_VERSION,
    renderContractVersion: CONTRACTOR_ACT_RENDER_CONTRACT_VERSION,
  }))}`;
  const scopeHash = hashString32(stableJsonStringify({
    scopeVersion: CONTRACTOR_ACT_SCOPE_VERSION_PREFIX,
    documentKind: CONTRACTOR_ACT_DOCUMENT_KIND,
    documentScope,
  }));

  return {
    version: CONTRACTOR_ACT_MANIFEST_VERSION,
    documentKind: CONTRACTOR_ACT_DOCUMENT_KIND,
    documentScope,
    sourceVersion,
    artifactVersion,
    status: "ready",
    artifactPath: `${CONTRACTOR_ACT_ARTIFACT_ROOT}/${sanitizePathSegment(artifactVersion)}/${fileName}`,
    manifestPath: `${CONTRACTOR_ACT_MANIFEST_ROOT}/${sanitizePathSegment(scopeHash)}.json`,
    fileName,
    lastBuiltAt: null,
    lastSourceChangeAt: null,
    lastSuccessfulArtifact: null,
    templateVersion: CONTRACTOR_ACT_TEMPLATE_VERSION,
    renderContractVersion: CONTRACTOR_ACT_RENDER_CONTRACT_VERSION,
  };
}
