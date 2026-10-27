export type WarehousePdfDocumentKind =
  | "issue_form"
  | "incoming_form"
  | "issue_register"
  | "incoming_register"
  | "issue_day_register"
  | "incoming_day_register"
  | "issue_materials"
  | "incoming_materials"
  | "issue_day_materials"
  | "incoming_day_materials"
  | "object_work";

type WarehousePdfRequestBase = {
  version: "v1";
  role: "warehouse";
  generatedBy?: string | null;
  companyName?: string | null;
  warehouseName?: string | null;
  clientSourceFingerprint?: string | null;
};

export type WarehouseIssueFormPdfRequest = WarehousePdfRequestBase & {
  documentType: "warehouse_document";
  documentKind: "issue_form";
  issueId: number;
};

export type WarehouseIncomingFormPdfRequest = WarehousePdfRequestBase & {
  documentType: "warehouse_document";
  documentKind: "incoming_form";
  incomingId: string;
};

type WarehouseRangePdfRequestBase = WarehousePdfRequestBase & {
  periodFrom?: string | null;
  periodTo?: string | null;
  dayLabel?: string | null;
};

export type WarehouseRegisterPdfRequest = WarehouseRangePdfRequestBase & {
  documentType: "warehouse_register";
  documentKind:
    | "issue_register"
    | "incoming_register"
    | "issue_day_register"
    | "incoming_day_register";
};

export type WarehouseMaterialsPdfRequest = WarehouseRangePdfRequestBase & {
  documentType: "warehouse_materials";
  documentKind:
    | "issue_materials"
    | "incoming_materials"
    | "issue_day_materials"
    | "incoming_day_materials"
    | "object_work";
  objectId?: string | null;
  objectName?: string | null;
};

export type WarehousePdfRequest =
  | WarehouseIssueFormPdfRequest
  | WarehouseIncomingFormPdfRequest
  | WarehouseRegisterPdfRequest
  | WarehouseMaterialsPdfRequest;

const trimText = (value: unknown) => String(value ?? "").trim();

const normalizeIso10 = (value: unknown) => {
  const text = trimText(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
};

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

async function stableHash(value: unknown): Promise<string> {
  const text = stableJsonStringify(value);
  const subtle = globalThis.crypto?.subtle;
  if (subtle && typeof subtle.digest === "function" && typeof TextEncoder !== "undefined") {
    const digest = await subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }
  return `fnv1a32_${hashString32(text)}`;
}

const WAREHOUSE_REGISTER_NOISE_KEYS = new Set([
  "_debug",
  "cache",
  "duration_ms",
  "durationMs",
  "fetched_at",
  "generated_at",
  "loaded_at",
  "nonce",
  "request_id",
  "signed_url",
  "signedUrl",
  "telemetry",
  "timing",
  "trace_id",
  "traceId",
  "transport",
]);

function stripWarehouseRegisterNoise(value: unknown, key?: string): unknown {
  if (key && WAREHOUSE_REGISTER_NOISE_KEYS.has(key)) return undefined;
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map((item) => stripWarehouseRegisterNoise(item));
  if (typeof value === "object") {
    const source = value as Record<string, unknown>;
    const output: Record<string, unknown> = {};
    for (const childKey of Object.keys(source).sort()) {
      const childValue = stripWarehouseRegisterNoise(source[childKey], childKey);
      if (childValue !== undefined) output[childKey] = childValue;
    }
    return output;
  }
  return trimText(value);
}

export const WAREHOUSE_INCOMING_REGISTER_MANIFEST_VERSION =
  "pdf_z3_warehouse_incoming_register_manifest_v1";
export const WAREHOUSE_INCOMING_REGISTER_DOCUMENT_KIND =
  "warehouse_incoming_register";
export const WAREHOUSE_INCOMING_REGISTER_TEMPLATE_VERSION =
  "warehouse_incoming_register_template_v1";
export const WAREHOUSE_INCOMING_REGISTER_RENDER_CONTRACT_VERSION =
  "backend_warehouse_pdf_v1";
export const WAREHOUSE_INCOMING_REGISTER_ARTIFACT_CONTRACT_VERSION =
  "warehouse_incoming_register_artifact_v1";

const WAREHOUSE_INCOMING_REGISTER_SOURCE_VERSION_PREFIX = "wir_src_v1";
const WAREHOUSE_INCOMING_REGISTER_ARTIFACT_VERSION_PREFIX = "wir_art_v1";
const WAREHOUSE_INCOMING_REGISTER_SCOPE_VERSION_PREFIX = "wir_scope_v1";
const WAREHOUSE_INCOMING_REGISTER_ARTIFACT_ROOT =
  "warehouse/incoming_register/artifacts/v1";
const WAREHOUSE_INCOMING_REGISTER_MANIFEST_ROOT =
  "warehouse/incoming_register/manifests/v1";

export const WAREHOUSE_ISSUE_REGISTER_MANIFEST_VERSION =
  "pdf_final_warehouse_issue_register_manifest_v1";
export const WAREHOUSE_ISSUE_REGISTER_DOCUMENT_KIND =
  "warehouse_issue_register";
export const WAREHOUSE_ISSUE_REGISTER_TEMPLATE_VERSION =
  "warehouse_issue_register_template_v1";
export const WAREHOUSE_ISSUE_REGISTER_RENDER_CONTRACT_VERSION =
  "backend_warehouse_pdf_v1";
export const WAREHOUSE_ISSUE_REGISTER_ARTIFACT_CONTRACT_VERSION =
  "warehouse_issue_register_artifact_v1";

const WAREHOUSE_ISSUE_REGISTER_SOURCE_VERSION_PREFIX = "wissue_src_v1";
const WAREHOUSE_ISSUE_REGISTER_ARTIFACT_VERSION_PREFIX = "wissue_art_v1";
const WAREHOUSE_ISSUE_REGISTER_SCOPE_VERSION_PREFIX = "wissue_scope_v1";
const WAREHOUSE_ISSUE_REGISTER_ARTIFACT_ROOT =
  "warehouse/issue_register/artifacts/v1";
const WAREHOUSE_ISSUE_REGISTER_MANIFEST_ROOT =
  "warehouse/issue_register/manifests/v1";

export type WarehouseIncomingRegisterDocumentScope = {
  role: "warehouse";
  family: "warehouse";
  report: "incoming_register";
  periodFrom: string | null;
  periodTo: string | null;
  companyName: string | null;
  warehouseName: string | null;
};

export type WarehouseIssueRegisterDocumentScope = {
  role: "warehouse";
  family: "warehouse";
  report: "issue_register";
  periodFrom: string | null;
  periodTo: string | null;
  companyName: string | null;
  warehouseName: string | null;
};

export type WarehouseIncomingRegisterManifestContract = {
  version: typeof WAREHOUSE_INCOMING_REGISTER_MANIFEST_VERSION;
  documentKind: typeof WAREHOUSE_INCOMING_REGISTER_DOCUMENT_KIND;
  documentScope: WarehouseIncomingRegisterDocumentScope;
  sourceVersion: string;
  artifactVersion: string;
  templateVersion: typeof WAREHOUSE_INCOMING_REGISTER_TEMPLATE_VERSION;
  renderContractVersion: typeof WAREHOUSE_INCOMING_REGISTER_RENDER_CONTRACT_VERSION;
  artifactPath: string;
  manifestPath: string;
  fileName: string;
  lastSourceChangeAt: string | null;
};

export type WarehouseIssueRegisterManifestContract = {
  version: typeof WAREHOUSE_ISSUE_REGISTER_MANIFEST_VERSION;
  documentKind: typeof WAREHOUSE_ISSUE_REGISTER_DOCUMENT_KIND;
  documentScope: WarehouseIssueRegisterDocumentScope;
  sourceVersion: string;
  artifactVersion: string;
  templateVersion: typeof WAREHOUSE_ISSUE_REGISTER_TEMPLATE_VERSION;
  renderContractVersion: typeof WAREHOUSE_ISSUE_REGISTER_RENDER_CONTRACT_VERSION;
  artifactPath: string;
  manifestPath: string;
  fileName: string;
  lastSourceChangeAt: string | null;
};

export type BuildWarehouseIncomingRegisterManifestContractArgs = {
  periodFrom?: string | null;
  periodTo?: string | null;
  companyName?: string | null;
  warehouseName?: string | null;
  clientSourceFingerprint?: string | null;
  incomingHeads?: unknown[] | null;
  fileName?: string | null;
};

export type BuildWarehouseIssueRegisterManifestContractArgs = {
  periodFrom?: string | null;
  periodTo?: string | null;
  companyName?: string | null;
  warehouseName?: string | null;
  clientSourceFingerprint?: string | null;
  issueHeads?: unknown[] | null;
  fileName?: string | null;
};

export function buildWarehouseIncomingRegisterDocumentScope(
  args: Pick<
    BuildWarehouseIncomingRegisterManifestContractArgs,
    "periodFrom" | "periodTo" | "companyName" | "warehouseName"
  >,
): WarehouseIncomingRegisterDocumentScope {
  return {
    role: "warehouse",
    family: "warehouse",
    report: "incoming_register",
    periodFrom: normalizeIso10(args.periodFrom),
    periodTo: normalizeIso10(args.periodTo),
    companyName: trimText(args.companyName) || null,
    warehouseName: trimText(args.warehouseName) || null,
  };
}

export function buildWarehouseIssueRegisterDocumentScope(
  args: Pick<
    BuildWarehouseIssueRegisterManifestContractArgs,
    "periodFrom" | "periodTo" | "companyName" | "warehouseName"
  >,
): WarehouseIssueRegisterDocumentScope {
  return {
    role: "warehouse",
    family: "warehouse",
    report: "issue_register",
    periodFrom: normalizeIso10(args.periodFrom),
    periodTo: normalizeIso10(args.periodTo),
    companyName: trimText(args.companyName) || null,
    warehouseName: trimText(args.warehouseName) || null,
  };
}

export function buildWarehouseIncomingRegisterClientSourceFingerprint(args: {
  periodFrom?: string | null;
  periodTo?: string | null;
  incomingRows?: unknown[] | null;
}) {
  const identity = {
    version: "warehouse_incoming_register_client_source_v1",
    periodFrom: normalizeIso10(args.periodFrom),
    periodTo: normalizeIso10(args.periodTo),
    incomingRows: stripWarehouseRegisterNoise(
      Array.isArray(args.incomingRows) ? args.incomingRows : [],
    ),
  };
  return `wir_client_v1_${hashString32(stableJsonStringify(identity))}`;
}

export function buildWarehouseIssueRegisterClientSourceFingerprint(args: {
  periodFrom?: string | null;
  periodTo?: string | null;
  issueRows?: unknown[] | null;
}) {
  const identity = {
    version: "warehouse_issue_register_client_source_v1",
    periodFrom: normalizeIso10(args.periodFrom),
    periodTo: normalizeIso10(args.periodTo),
    issueRows: stripWarehouseRegisterNoise(
      Array.isArray(args.issueRows) ? args.issueRows : [],
    ),
  };
  return `wissue_client_v1_${hashString32(stableJsonStringify(identity))}`;
}

export async function buildWarehouseIncomingRegisterManifestContract(
  args: BuildWarehouseIncomingRegisterManifestContractArgs,
): Promise<WarehouseIncomingRegisterManifestContract> {
  const documentScope = buildWarehouseIncomingRegisterDocumentScope(args);
  const fileName = trimText(args.fileName) || "warehouse_incoming_register.pdf";
  const sourceIdentity = {
    contractVersion: WAREHOUSE_INCOMING_REGISTER_MANIFEST_VERSION,
    documentKind: WAREHOUSE_INCOMING_REGISTER_DOCUMENT_KIND,
    documentScope,
    source: {
      sourceKind: "rpc:acc_report_incoming_v2",
      clientSourceFingerprint: stripWarehouseRegisterNoise(
        trimText(args.clientSourceFingerprint) || null,
      ),
      incomingHeads: stripWarehouseRegisterNoise(
        Array.isArray(args.incomingHeads) ? args.incomingHeads : [],
      ),
    },
  };
  const sourceHash = await stableHash(sourceIdentity);
  const sourceVersion = `${WAREHOUSE_INCOMING_REGISTER_SOURCE_VERSION_PREFIX}_${sourceHash}`;
  const artifactHash = await stableHash({
    artifactContractVersion: WAREHOUSE_INCOMING_REGISTER_ARTIFACT_CONTRACT_VERSION,
    sourceVersion,
    templateVersion: WAREHOUSE_INCOMING_REGISTER_TEMPLATE_VERSION,
    renderContractVersion: WAREHOUSE_INCOMING_REGISTER_RENDER_CONTRACT_VERSION,
  });
  const artifactVersion = `${WAREHOUSE_INCOMING_REGISTER_ARTIFACT_VERSION_PREFIX}_${artifactHash}`;
  const scopeHash = await stableHash({
    scopeVersion: WAREHOUSE_INCOMING_REGISTER_SCOPE_VERSION_PREFIX,
    documentKind: WAREHOUSE_INCOMING_REGISTER_DOCUMENT_KIND,
    documentScope,
  });

  return {
    version: WAREHOUSE_INCOMING_REGISTER_MANIFEST_VERSION,
    documentKind: WAREHOUSE_INCOMING_REGISTER_DOCUMENT_KIND,
    documentScope,
    sourceVersion,
    artifactVersion,
    templateVersion: WAREHOUSE_INCOMING_REGISTER_TEMPLATE_VERSION,
    renderContractVersion: WAREHOUSE_INCOMING_REGISTER_RENDER_CONTRACT_VERSION,
    artifactPath: `${WAREHOUSE_INCOMING_REGISTER_ARTIFACT_ROOT}/${sanitizePathSegment(artifactVersion)}/${fileName}`,
    manifestPath: `${WAREHOUSE_INCOMING_REGISTER_MANIFEST_ROOT}/${sanitizePathSegment(scopeHash)}.json`,
    fileName,
    lastSourceChangeAt: null,
  };
}

export async function buildWarehouseIssueRegisterManifestContract(
  args: BuildWarehouseIssueRegisterManifestContractArgs,
): Promise<WarehouseIssueRegisterManifestContract> {
  const documentScope = buildWarehouseIssueRegisterDocumentScope(args);
  const fileName = trimText(args.fileName) || "warehouse_issue_register.pdf";
  const sourceIdentity = {
    contractVersion: WAREHOUSE_ISSUE_REGISTER_MANIFEST_VERSION,
    documentKind: WAREHOUSE_ISSUE_REGISTER_DOCUMENT_KIND,
    documentScope,
    source: {
      sourceKind: "rpc:acc_report_issues_v2",
      clientSourceFingerprint: stripWarehouseRegisterNoise(
        trimText(args.clientSourceFingerprint) || null,
      ),
      issueHeads: stripWarehouseRegisterNoise(
        Array.isArray(args.issueHeads) ? args.issueHeads : [],
      ),
    },
  };
  const sourceHash = await stableHash(sourceIdentity);
  const sourceVersion = `${WAREHOUSE_ISSUE_REGISTER_SOURCE_VERSION_PREFIX}_${sourceHash}`;
  const artifactHash = await stableHash({
    artifactContractVersion: WAREHOUSE_ISSUE_REGISTER_ARTIFACT_CONTRACT_VERSION,
    sourceVersion,
    templateVersion: WAREHOUSE_ISSUE_REGISTER_TEMPLATE_VERSION,
    renderContractVersion: WAREHOUSE_ISSUE_REGISTER_RENDER_CONTRACT_VERSION,
  });
  const artifactVersion = `${WAREHOUSE_ISSUE_REGISTER_ARTIFACT_VERSION_PREFIX}_${artifactHash}`;
  const scopeHash = await stableHash({
    scopeVersion: WAREHOUSE_ISSUE_REGISTER_SCOPE_VERSION_PREFIX,
    documentKind: WAREHOUSE_ISSUE_REGISTER_DOCUMENT_KIND,
    documentScope,
  });

  return {
    version: WAREHOUSE_ISSUE_REGISTER_MANIFEST_VERSION,
    documentKind: WAREHOUSE_ISSUE_REGISTER_DOCUMENT_KIND,
    documentScope,
    sourceVersion,
    artifactVersion,
    templateVersion: WAREHOUSE_ISSUE_REGISTER_TEMPLATE_VERSION,
    renderContractVersion: WAREHOUSE_ISSUE_REGISTER_RENDER_CONTRACT_VERSION,
    artifactPath: `${WAREHOUSE_ISSUE_REGISTER_ARTIFACT_ROOT}/${sanitizePathSegment(artifactVersion)}/${fileName}`,
    manifestPath: `${WAREHOUSE_ISSUE_REGISTER_MANIFEST_ROOT}/${sanitizePathSegment(scopeHash)}.json`,
    fileName,
    lastSourceChangeAt: null,
  };
}

const isWarehouseDocumentKind = (
  value: string,
): value is WarehousePdfDocumentKind =>
  value === "issue_form" ||
  value === "incoming_form" ||
  value === "issue_register" ||
  value === "incoming_register" ||
  value === "issue_day_register" ||
  value === "incoming_day_register" ||
  value === "issue_materials" ||
  value === "incoming_materials" ||
  value === "issue_day_materials" ||
  value === "incoming_day_materials" ||
  value === "object_work";

const normalizeRangeField = (value: unknown) => {
  const text = trimText(value);
  return text || null;
};

const normalizeCommonFields = (row: Record<string, unknown>) => {
  const version = trimText(row.version);
  const role = trimText(row.role).toLowerCase();
  const documentType = trimText(row.documentType);
  const documentKind = trimText(row.documentKind);
  const generatedBy = trimText(row.generatedBy);
  const companyName = trimText(row.companyName);
  const warehouseName = trimText(row.warehouseName);
  const clientSourceFingerprint = trimText(row.clientSourceFingerprint);

  if (version !== "v1") {
    throw new Error(`warehouse pdf payload invalid version: ${version || "<empty>"}`);
  }
  if (role !== "warehouse") {
    throw new Error(`warehouse pdf payload invalid role: ${role || "<empty>"}`);
  }
  if (!isWarehouseDocumentKind(documentKind)) {
    throw new Error(`warehouse pdf payload invalid documentKind: ${documentKind || "<empty>"}`);
  }

  return {
    version: "v1" as const,
    role: "warehouse" as const,
    documentType,
    documentKind,
    generatedBy: generatedBy || null,
    companyName: companyName || null,
    warehouseName: warehouseName || null,
    ...(clientSourceFingerprint ? { clientSourceFingerprint } : {}),
  };
};

export function normalizeWarehousePdfRequest(value: unknown): WarehousePdfRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("warehouse pdf payload must be an object");
  }

  const row = value as Record<string, unknown>;
  const common = normalizeCommonFields(row);

  if (common.documentType === "warehouse_document" && common.documentKind === "issue_form") {
    const issueId = Number(trimText(row.issueId));
    if (!Number.isFinite(issueId) || issueId <= 0) {
      throw new Error("warehouse pdf payload missing issueId");
    }
    return {
      ...common,
      documentType: "warehouse_document",
      documentKind: "issue_form",
      issueId: Math.trunc(issueId),
    };
  }

  if (common.documentType === "warehouse_document" && common.documentKind === "incoming_form") {
    const incomingId = trimText(row.incomingId);
    if (!incomingId) {
      throw new Error("warehouse pdf payload missing incomingId");
    }
    return {
      ...common,
      documentType: "warehouse_document",
      documentKind: "incoming_form",
      incomingId,
    };
  }

  if (
    common.documentType === "warehouse_register" &&
    (common.documentKind === "issue_register" ||
      common.documentKind === "incoming_register" ||
      common.documentKind === "issue_day_register" ||
      common.documentKind === "incoming_day_register")
  ) {
    const dayLabel = normalizeRangeField(row.dayLabel);
    if (
      (common.documentKind === "issue_day_register" ||
        common.documentKind === "incoming_day_register") &&
      !dayLabel
    ) {
      throw new Error("warehouse pdf payload missing dayLabel");
    }
    return {
      ...common,
      documentType: "warehouse_register",
      documentKind: common.documentKind,
      periodFrom: normalizeRangeField(row.periodFrom),
      periodTo: normalizeRangeField(row.periodTo),
      dayLabel,
    };
  }

  if (
    common.documentType === "warehouse_materials" &&
    (common.documentKind === "issue_materials" ||
      common.documentKind === "incoming_materials" ||
      common.documentKind === "issue_day_materials" ||
      common.documentKind === "incoming_day_materials" ||
      common.documentKind === "object_work")
  ) {
    const dayLabel = normalizeRangeField(row.dayLabel);
    if (
      (common.documentKind === "issue_day_materials" ||
        common.documentKind === "incoming_day_materials") &&
      !dayLabel
    ) {
      throw new Error("warehouse pdf payload missing dayLabel");
    }
    return {
      ...common,
      documentType: "warehouse_materials",
      documentKind: common.documentKind,
      periodFrom: normalizeRangeField(row.periodFrom),
      periodTo: normalizeRangeField(row.periodTo),
      dayLabel,
      objectId: normalizeRangeField(row.objectId),
      objectName: normalizeRangeField(row.objectName),
    };
  }

  throw new Error(
    `warehouse pdf payload invalid documentType/documentKind combination: ${common.documentType || "<empty>"}/${common.documentKind || "<empty>"}`,
  );
}
