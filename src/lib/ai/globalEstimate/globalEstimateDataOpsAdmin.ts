import { calculateGlobalConstructionEstimate } from "./globalEstimateCalculator";
import {
  GLOBAL_PRICE_SOURCES,
  GLOBAL_RATE_MATERIALS,
  GLOBAL_RATE_WORKS,
  GLOBAL_TAX_RULES,
} from "./globalEstimateSeedData";
import {
  getGlobalEstimateTemplateRows,
  verifyGlobalEstimateTemplateCoverage,
} from "./globalEstimateTemplateService";
import type {
  GlobalEstimateInput,
  GlobalEstimatePriceTier,
  GlobalRateRecord,
  GlobalTaxRule,
} from "./globalEstimateTypes";
import { GLOBAL_WORK_TYPE_DEFINITIONS } from "./globalWorkTypeResolver";
import { validateGlobalEstimateFormula } from "./dataOps/globalEstimateFormulaValidator";
import { resolveGlobalPriceSourceFreshness } from "./dataOps/globalPriceSourceFreshnessService";

export const GLOBAL_ESTIMATE_DATA_OPS_WAVE =
  "S_GLOBAL_ESTIMATE_DATA_OPS_PRICEBOOK_TAX_ADMIN_GOVERNANCE_POINT_OF_NO_RETURN";

export const GLOBAL_ESTIMATE_DATA_OPS_GREEN_STATUS =
  "GREEN_GLOBAL_ESTIMATE_DATA_OPS_PRICEBOOK_TAX_ADMIN_READY";

export type GlobalEstimateDataOpsRole =
  | "estimate_data_viewer"
  | "estimate_data_editor"
  | "estimate_data_reviewer"
  | "estimate_data_admin"
  | "data_ops_admin"
  | "estimate_admin"
  | "tax_admin"
  | "reviewer"
  | "consumer"
  | "seller"
  | "unauthenticated";

export type GlobalEstimateDataOpsActor = {
  userId: string;
  role: GlobalEstimateDataOpsRole;
  displayName?: string;
};

export type GlobalEstimateDataOpsEntityType =
  | "work_type"
  | "estimate_template"
  | "template_row"
  | "material_rate"
  | "labor_rate"
  | "tax_rule"
  | "price_source";

export type GlobalEstimateDataOpsOperation =
  | "create"
  | "update"
  | "deactivate"
  | "rollback";

export type GlobalEstimateDataOpsStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "rejected"
  | "ready_for_backend_apply";

export type GlobalEstimateDataOpsFeatureFlags = {
  adminEnabled: boolean;
  importEnabled: boolean;
  approvalEnabled: boolean;
  publishEnabled: boolean;
  rollbackEnabled: boolean;
};

export type GlobalEstimateDataOpsChange = {
  id: string;
  entityType: GlobalEstimateDataOpsEntityType;
  operation: GlobalEstimateDataOpsOperation;
  draft: unknown;
  before?: unknown;
  reason: string;
  author: GlobalEstimateDataOpsActor;
  createdAt: string;
  status: GlobalEstimateDataOpsStatus;
};

export type GlobalEstimateDataOpsValidation = {
  safe: boolean;
  blockers: string[];
  warnings: string[];
  requiresApproval: boolean;
  destructiveOperationFound: boolean;
  directPublishBlocked: boolean;
  sourceRequired: boolean;
  sourceFreshnessStatus: "fresh" | "aging" | "stale" | "expired" | "unknown" | "missing";
};

export type GlobalEstimateDataOpsImportRow = {
  rowNumber: number;
  entityType: GlobalEstimateDataOpsEntityType;
  operation: GlobalEstimateDataOpsOperation;
  payload: unknown;
  reason: string;
};

export type GlobalEstimateDataOpsImportPreview = {
  dryRunOnly: true;
  willWriteToDb: false;
  requiresApproval: true;
  totalRows: number;
  acceptedRows: number;
  blockedRows: number;
  warningRows: number;
  changes: GlobalEstimateDataOpsChange[];
  validations: (GlobalEstimateDataOpsValidation & { rowNumber: number })[];
};

export type GlobalEstimateDataOpsAuditEvent = {
  id: string;
  event:
    | "import_preview_created"
    | "change_submitted_for_review"
    | "change_approved"
    | "publish_plan_created"
    | "rollback_plan_created"
    | "estimate_qa_completed";
  actorId: string;
  actorRole: GlobalEstimateDataOpsRole;
  changeId?: string;
  result: "success" | "blocked" | "warning";
  metadata: Record<string, string | number | boolean | null>;
  createdAt: string;
};

export type GlobalEstimateDataOpsApprovalRequest = {
  id: string;
  change: GlobalEstimateDataOpsChange;
  status: "pending_review" | "approved" | "rejected";
  requiredApprovals: 1;
  approvals: {
    reviewer: GlobalEstimateDataOpsActor;
    approvedAt: string;
  }[];
  auditLog: GlobalEstimateDataOpsAuditEvent[];
};

export type GlobalEstimateDataOpsVersion = {
  id: string;
  entityType: GlobalEstimateDataOpsEntityType;
  entityId: string;
  changeId: string;
  versionNumber: number;
  previousSnapshot?: unknown;
  nextSnapshot: unknown;
  approvedBy: string;
  createdAt: string;
};

export type GlobalEstimateDataOpsPublishPlan = {
  status: "ready_for_backend_apply";
  directUiWrite: false;
  requiresBackendService: true;
  requiresApprovedChange: true;
  sqlStatements: [];
  version: GlobalEstimateDataOpsVersion;
  auditLog: GlobalEstimateDataOpsAuditEvent[];
};

export type GlobalEstimateDataOpsRollbackPlan = {
  rollbackReady: true;
  directDelete: false;
  destructiveSql: false;
  requiresApproval: true;
  targetVersionId: string;
  restoreSnapshot: unknown;
  steps: string[];
  auditLog: GlobalEstimateDataOpsAuditEvent[];
};

export type GlobalEstimateDataOpsCoverageMatrix = {
  workTypesTotal: number;
  templatesCovered: boolean;
  templateRowsCovered: boolean;
  materialRatesHaveSources: boolean;
  laborRatesHaveSources: boolean;
  taxRulesHaveSources: boolean;
  sourceFreshnessReady: boolean;
  countriesCovered: string[];
  priceTiersCovered: GlobalEstimatePriceTier[];
  blockers: string[];
};

export type GlobalEstimateDataOpsQaResult = {
  qaPassed: boolean;
  promptsChecked: number;
  backendResultsUsed: boolean;
  noPriceWithoutSource: boolean;
  noTaxWithoutRule: boolean;
  professionalRowsPresent: boolean;
  blockers: string[];
  p95Ms: number;
};

const DATA_OPS_FLAG_KEYS: Record<keyof GlobalEstimateDataOpsFeatureFlags, string> = {
  adminEnabled: "GLOBAL_ESTIMATE_DATA_OPS_ADMIN_ENABLED",
  importEnabled: "GLOBAL_ESTIMATE_DATA_OPS_IMPORT_ENABLED",
  approvalEnabled: "GLOBAL_ESTIMATE_DATA_OPS_APPROVAL_ENABLED",
  publishEnabled: "GLOBAL_ESTIMATE_DATA_OPS_PUBLISH_ENABLED",
  rollbackEnabled: "GLOBAL_ESTIMATE_DATA_OPS_ROLLBACK_ENABLED",
};

const DATA_OPS_AUTHOR_ROLES = new Set<GlobalEstimateDataOpsRole>([
  "data_ops_admin",
  "estimate_admin",
  "tax_admin",
  "estimate_data_editor",
  "estimate_data_admin",
]);

const DATA_OPS_REVIEWER_ROLES = new Set<GlobalEstimateDataOpsRole>([
  "reviewer",
  "data_ops_admin",
  "estimate_data_reviewer",
  "estimate_data_admin",
]);

function parseFlag(value: unknown): boolean {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

export function resolveGlobalEstimateDataOpsFeatureFlags(
  env: Record<string, string | undefined> = process.env,
): GlobalEstimateDataOpsFeatureFlags {
  return {
    adminEnabled: parseFlag(env[DATA_OPS_FLAG_KEYS.adminEnabled]),
    importEnabled: parseFlag(env[DATA_OPS_FLAG_KEYS.importEnabled]),
    approvalEnabled: parseFlag(env[DATA_OPS_FLAG_KEYS.approvalEnabled]),
    publishEnabled: parseFlag(env[DATA_OPS_FLAG_KEYS.publishEnabled]),
    rollbackEnabled: parseFlag(env[DATA_OPS_FLAG_KEYS.rollbackEnabled]),
  };
}

export function assertGlobalEstimateDataOpsFeatureFlagsDefaultOff(
  flags: GlobalEstimateDataOpsFeatureFlags,
): void {
  const enabled = Object.entries(flags).filter(([, value]) => value).map(([key]) => key);
  if (enabled.length > 0) {
    throw new Error(`GLOBAL_ESTIMATE_DATA_OPS_FLAGS_MUST_DEFAULT_OFF:${enabled.join(",")}`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function daysSince(dateText: string): number {
  const time = Date.parse(dateText);
  if (!Number.isFinite(time)) return Number.POSITIVE_INFINITY;
  return Math.floor((Date.now() - time) / 86_400_000);
}

function hasSource(payload: Record<string, unknown>): boolean {
  return text(payload.sourceLabel).length > 0
    || text(payload.source_label).length > 0
    || text(payload.sourceId).length > 0
    || text(payload.source_id).length > 0;
}

function checkedAt(payload: Record<string, unknown>): string {
  return text(payload.checkedAt) || text(payload.checked_at);
}

function sourceFreshness(payload: Record<string, unknown>): GlobalEstimateDataOpsValidation["sourceFreshnessStatus"] {
  if (!hasSource(payload)) return "missing";
  const checked = checkedAt(payload);
  if (!checked) return "missing";
  return resolveGlobalPriceSourceFreshness(checked).status;
}

function validateRatePayload(
  entityType: "material_rate" | "labor_rate",
  payload: Record<string, unknown>,
): Pick<GlobalEstimateDataOpsValidation, "blockers" | "warnings" | "sourceRequired" | "sourceFreshnessStatus"> {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const priceMin = numberValue(payload.priceMin ?? payload.price_min);
  const priceMax = numberValue(payload.priceMax ?? payload.price_max);
  const priceDefault = numberValue(payload.priceDefault ?? payload.price_default);
  const currency = text(payload.currency);
  const unit = text(payload.unit);
  const key = entityType === "material_rate"
    ? text(payload.rateKey ?? payload.materialKey ?? payload.material_key)
    : text(payload.rateKey ?? payload.workKey ?? payload.work_key);
  const freshness = sourceFreshness(payload);

  if (!key) blockers.push("GLOBAL_ESTIMATE_DATA_OPS_RATE_KEY_REQUIRED");
  if (!unit) blockers.push("GLOBAL_ESTIMATE_DATA_OPS_RATE_UNIT_REQUIRED");
  if (!/^[A-Z]{3}$/.test(currency)) blockers.push("GLOBAL_ESTIMATE_DATA_OPS_RATE_CURRENCY_3_LETTER_REQUIRED");
  if (priceMin == null || priceMax == null || priceDefault == null) {
    blockers.push("GLOBAL_ESTIMATE_DATA_OPS_RATE_PRICE_NUMBERS_REQUIRED");
  } else {
    if (priceMin < 0 || priceMax < 0 || priceDefault < 0) blockers.push("GLOBAL_ESTIMATE_DATA_OPS_NEGATIVE_PRICE_BLOCKED");
    if (priceMin > priceMax) blockers.push("GLOBAL_ESTIMATE_DATA_OPS_PRICE_MIN_GT_MAX_BLOCKED");
    if (priceDefault < priceMin || priceDefault > priceMax) blockers.push("GLOBAL_ESTIMATE_DATA_OPS_PRICE_DEFAULT_OUT_OF_RANGE_BLOCKED");
  }
  if (freshness === "missing" || freshness === "unknown") blockers.push("GLOBAL_ESTIMATE_DATA_OPS_PRICE_SOURCE_REQUIRED");
  if (freshness === "stale" || freshness === "expired" || freshness === "aging") warnings.push("GLOBAL_ESTIMATE_DATA_OPS_SOURCE_STALE_LOW_CONFIDENCE");

  return {
    blockers,
    warnings,
    sourceRequired: true,
    sourceFreshnessStatus: freshness,
  };
}

function validateTaxPayload(
  payload: Record<string, unknown>,
): Pick<GlobalEstimateDataOpsValidation, "blockers" | "warnings" | "sourceRequired" | "sourceFreshnessStatus"> {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const countryCode = text(payload.countryCode ?? payload.country_code).toUpperCase();
  const taxType = text(payload.taxType ?? payload.tax_type);
  const taxRate = numberValue(payload.taxRate ?? payload.tax_rate);
  const stateOrRegion = text(payload.stateOrRegion ?? payload.state_or_region);
  const city = text(payload.city);
  const postalCode = text(payload.postalCode ?? payload.postal_code);
  const requiresPreciseAddress = Boolean(payload.requiresPreciseAddress ?? payload.requires_precise_address);
  const freshness = sourceFreshness(payload);

  if (!/^[A-Z]{2}$/.test(countryCode)) blockers.push("GLOBAL_ESTIMATE_DATA_OPS_TAX_COUNTRY_REQUIRED");
  if (!taxType) blockers.push("GLOBAL_ESTIMATE_DATA_OPS_TAX_TYPE_REQUIRED");
  if (taxRate == null || taxRate < 0 || taxRate > 1) blockers.push("GLOBAL_ESTIMATE_DATA_OPS_TAX_RATE_RANGE_BLOCKED");
  if (freshness === "missing" || freshness === "unknown") blockers.push("GLOBAL_ESTIMATE_DATA_OPS_TAX_SOURCE_REQUIRED");
  if (freshness === "stale" || freshness === "expired" || freshness === "aging") warnings.push("GLOBAL_ESTIMATE_DATA_OPS_TAX_SOURCE_STALE_LOW_CONFIDENCE");
  if (
    countryCode === "US"
    && taxType === "sales_tax"
    && !postalCode
    && !city
    && !stateOrRegion
    && !requiresPreciseAddress
  ) {
    blockers.push("GLOBAL_ESTIMATE_DATA_OPS_US_SALES_TAX_COUNTRY_ONLY_BLOCKED");
  }

  return {
    blockers,
    warnings,
    sourceRequired: true,
    sourceFreshnessStatus: freshness,
  };
}

function validateTemplateRowPayload(
  payload: Record<string, unknown>,
): Pick<GlobalEstimateDataOpsValidation, "blockers" | "warnings" | "sourceRequired" | "sourceFreshnessStatus"> {
  const blockers: string[] = [];
  const quantityFormula = text(payload.quantityFormula ?? payload.quantity_formula);
  const sectionType = text(payload.sectionType ?? payload.section_type);

  if (!text(payload.workKey ?? payload.work_key)) blockers.push("GLOBAL_ESTIMATE_DATA_OPS_TEMPLATE_ROW_WORK_KEY_REQUIRED");
  if (!sectionType) blockers.push("GLOBAL_ESTIMATE_DATA_OPS_TEMPLATE_ROW_SECTION_REQUIRED");
  if (!text(payload.rowNumber ?? payload.row_number)) blockers.push("GLOBAL_ESTIMATE_DATA_OPS_TEMPLATE_ROW_NUMBER_REQUIRED");
  if (!text(payload.rateKey ?? payload.rate_key)) blockers.push("GLOBAL_ESTIMATE_DATA_OPS_TEMPLATE_ROW_RATE_KEY_REQUIRED");
  if (!text(payload.unitMetric ?? payload.unit_metric)) blockers.push("GLOBAL_ESTIMATE_DATA_OPS_TEMPLATE_ROW_UNIT_REQUIRED");
  if (!quantityFormula) {
    blockers.push("GLOBAL_ESTIMATE_DATA_OPS_TEMPLATE_ROW_FORMULA_REQUIRED");
  } else {
    const validation = validateGlobalEstimateFormula(quantityFormula);
    if (!validation.valid) blockers.push(...validation.blockers);
  }

  return {
    blockers,
    warnings: [],
    sourceRequired: false,
    sourceFreshnessStatus: "fresh",
  };
}

function validateWorkTypePayload(
  payload: Record<string, unknown>,
): Pick<GlobalEstimateDataOpsValidation, "blockers" | "warnings" | "sourceRequired" | "sourceFreshnessStatus"> {
  const blockers: string[] = [];
  if (!text(payload.workKey ?? payload.work_key)) blockers.push("GLOBAL_ESTIMATE_DATA_OPS_WORK_KEY_REQUIRED");
  if (!text(payload.category)) blockers.push("GLOBAL_ESTIMATE_DATA_OPS_WORK_CATEGORY_REQUIRED");
  if (!isRecord(payload.names)) blockers.push("GLOBAL_ESTIMATE_DATA_OPS_WORK_NAMES_REQUIRED");
  if (!text(payload.defaultMeasureUnit ?? payload.default_measure_unit)) {
    blockers.push("GLOBAL_ESTIMATE_DATA_OPS_WORK_DEFAULT_UNIT_REQUIRED");
  }
  return {
    blockers,
    warnings: [],
    sourceRequired: false,
    sourceFreshnessStatus: "fresh",
  };
}

export function validateGlobalEstimateDataOpsChange(
  change: GlobalEstimateDataOpsChange,
): GlobalEstimateDataOpsValidation {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const destructiveOperationFound = /delete|drop|truncate|reset/i.test(change.operation);
  const directPublishBlocked = change.status === "ready_for_backend_apply" || change.status === "approved";

  if (destructiveOperationFound) blockers.push("GLOBAL_ESTIMATE_DATA_OPS_DESTRUCTIVE_OPERATION_BLOCKED");
  if (directPublishBlocked) blockers.push("GLOBAL_ESTIMATE_DATA_OPS_DIRECT_PUBLISH_WITHOUT_APPROVAL_BLOCKED");
  if (!change.reason.trim()) blockers.push("GLOBAL_ESTIMATE_DATA_OPS_CHANGE_REASON_REQUIRED");
  if (!DATA_OPS_AUTHOR_ROLES.has(change.author.role)) {
    blockers.push("GLOBAL_ESTIMATE_DATA_OPS_AUTHOR_ROLE_BLOCKED");
  }
  if (!isRecord(change.draft)) blockers.push("GLOBAL_ESTIMATE_DATA_OPS_DRAFT_OBJECT_REQUIRED");

  let sourceRequired = false;
  let sourceFreshnessStatus: GlobalEstimateDataOpsValidation["sourceFreshnessStatus"] = "fresh";
  if (isRecord(change.draft)) {
    const detail =
      change.entityType === "material_rate" || change.entityType === "labor_rate"
        ? validateRatePayload(change.entityType, change.draft)
        : change.entityType === "tax_rule"
          ? validateTaxPayload(change.draft)
          : change.entityType === "template_row"
            ? validateTemplateRowPayload(change.draft)
            : change.entityType === "work_type"
              ? validateWorkTypePayload(change.draft)
              : {
                  blockers: [],
                  warnings: [],
                  sourceRequired: false,
                  sourceFreshnessStatus: "fresh" as const,
                };
    blockers.push(...detail.blockers);
    warnings.push(...detail.warnings);
    sourceRequired = detail.sourceRequired;
    sourceFreshnessStatus = detail.sourceFreshnessStatus;
  }

  return {
    safe: blockers.length === 0,
    blockers,
    warnings,
    requiresApproval: true,
    destructiveOperationFound,
    directPublishBlocked,
    sourceRequired,
    sourceFreshnessStatus,
  };
}

export function assertGlobalEstimateDataOpsChangeSafe(change: GlobalEstimateDataOpsChange): void {
  const validation = validateGlobalEstimateDataOpsChange(change);
  if (!validation.safe) {
    throw new Error(`GLOBAL_ESTIMATE_DATA_OPS_CHANGE_BLOCKED:${validation.blockers.join(",")}`);
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

function id(prefix: string, seed: string): string {
  return `${prefix}_${seed.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").toLowerCase()}_${Date.now().toString(36)}`;
}

function redactedMetadata(metadata: Record<string, unknown>): Record<string, string | number | boolean | null> {
  return Object.fromEntries(Object.entries(metadata).map(([key, value]) => {
    if (typeof value === "number" || typeof value === "boolean") return [key, value];
    if (value == null) return [key, null];
    const textValue = String(value);
    if (/secret|service_role|authorization|token|password|phone|email|storage|payload/i.test(key + textValue)) {
      return [key, "[redacted]"];
    }
    return [key, textValue.length > 100 ? `${textValue.slice(0, 97)}...` : textValue];
  }));
}

export function createGlobalEstimateDataOpsAuditEvent(input: {
  event: GlobalEstimateDataOpsAuditEvent["event"];
  actor: GlobalEstimateDataOpsActor;
  changeId?: string;
  result?: GlobalEstimateDataOpsAuditEvent["result"];
  metadata?: Record<string, unknown>;
}): GlobalEstimateDataOpsAuditEvent {
  return {
    id: id("geaudit", `${input.event}_${input.changeId ?? input.actor.userId}`),
    event: input.event,
    actorId: input.actor.userId,
    actorRole: input.actor.role,
    changeId: input.changeId,
    result: input.result ?? "success",
    metadata: redactedMetadata(input.metadata ?? {}),
    createdAt: nowIso(),
  };
}

export function assertGlobalEstimateDataOpsAuditRedacted(events: GlobalEstimateDataOpsAuditEvent[]): void {
  const serialized = JSON.stringify(events);
  if (/service_role|authorization|password|secret|storage_key|signedUrl|\+\d{7,}|@/.test(serialized)) {
    throw new Error("GLOBAL_ESTIMATE_DATA_OPS_AUDIT_CONTAINS_PRIVATE_DATA");
  }
}

export function buildGlobalEstimateDataOpsImportPreview(params: {
  actor: GlobalEstimateDataOpsActor;
  rows: GlobalEstimateDataOpsImportRow[];
}): GlobalEstimateDataOpsImportPreview {
  const changes = params.rows.map((row) => ({
    id: id("gechange", `${row.entityType}_${row.rowNumber}`),
    entityType: row.entityType,
    operation: row.operation,
    draft: row.payload,
    reason: row.reason,
    author: params.actor,
    createdAt: nowIso(),
    status: "draft" as const,
  }));
  const validations = changes.map((change, index) => ({
    rowNumber: params.rows[index]?.rowNumber ?? index + 1,
    ...validateGlobalEstimateDataOpsChange(change),
  }));
  return {
    dryRunOnly: true,
    willWriteToDb: false,
    requiresApproval: true,
    totalRows: params.rows.length,
    acceptedRows: validations.filter((validation) => validation.safe).length,
    blockedRows: validations.filter((validation) => !validation.safe).length,
    warningRows: validations.filter((validation) => validation.warnings.length > 0).length,
    changes,
    validations,
  };
}

export function createGlobalEstimateDataOpsApprovalRequest(
  change: GlobalEstimateDataOpsChange,
): GlobalEstimateDataOpsApprovalRequest {
  assertGlobalEstimateDataOpsChangeSafe(change);
  const pendingChange = { ...change, status: "pending_review" as const };
  return {
    id: id("geapproval", change.id),
    change: pendingChange,
    status: "pending_review",
    requiredApprovals: 1,
    approvals: [],
    auditLog: [
      createGlobalEstimateDataOpsAuditEvent({
        event: "change_submitted_for_review",
        actor: change.author,
        changeId: change.id,
        metadata: { entityType: change.entityType, operation: change.operation },
      }),
    ],
  };
}

export function approveGlobalEstimateDataOpsChange(params: {
  request: GlobalEstimateDataOpsApprovalRequest;
  reviewer: GlobalEstimateDataOpsActor;
}): GlobalEstimateDataOpsApprovalRequest {
  if (params.reviewer.userId === params.request.change.author.userId) {
    throw new Error("GLOBAL_ESTIMATE_DATA_OPS_SELF_APPROVAL_BLOCKED");
  }
  if (!DATA_OPS_REVIEWER_ROLES.has(params.reviewer.role)) {
    throw new Error("GLOBAL_ESTIMATE_DATA_OPS_REVIEWER_ROLE_BLOCKED");
  }
  assertGlobalEstimateDataOpsChangeSafe(params.request.change);
  return {
    ...params.request,
    status: "approved",
    change: { ...params.request.change, status: "approved" },
    approvals: [{ reviewer: params.reviewer, approvedAt: nowIso() }],
    auditLog: [
      ...params.request.auditLog,
      createGlobalEstimateDataOpsAuditEvent({
        event: "change_approved",
        actor: params.reviewer,
        changeId: params.request.change.id,
        metadata: { approvalCount: 1 },
      }),
    ],
  };
}

export function buildGlobalEstimateDataOpsPublishPlan(
  request: GlobalEstimateDataOpsApprovalRequest,
): GlobalEstimateDataOpsPublishPlan {
  if (request.status !== "approved" || request.approvals.length < request.requiredApprovals) {
    throw new Error("GLOBAL_ESTIMATE_DATA_OPS_APPROVAL_REQUIRED_BEFORE_PUBLISH");
  }
  const approvedBy = request.approvals[0]?.reviewer.userId ?? "unknown";
  const version: GlobalEstimateDataOpsVersion = {
    id: id("geversion", request.change.id),
    entityType: request.change.entityType,
    entityId: isRecord(request.change.draft) ? text(request.change.draft.id ?? request.change.draft.workKey ?? request.change.draft.work_key) || request.change.id : request.change.id,
    changeId: request.change.id,
    versionNumber: 1,
    previousSnapshot: request.change.before,
    nextSnapshot: request.change.draft,
    approvedBy,
    createdAt: nowIso(),
  };
  const auditLog = [
    ...request.auditLog,
    createGlobalEstimateDataOpsAuditEvent({
      event: "publish_plan_created",
      actor: request.approvals[0]?.reviewer ?? request.change.author,
      changeId: request.change.id,
      metadata: { directUiWrite: false, requiresBackendService: true },
    }),
  ];
  assertGlobalEstimateDataOpsAuditRedacted(auditLog);
  return {
    status: "ready_for_backend_apply",
    directUiWrite: false,
    requiresBackendService: true,
    requiresApprovedChange: true,
    sqlStatements: [],
    version,
    auditLog,
  };
}

export function buildGlobalEstimateDataOpsRollbackPlan(params: {
  version: GlobalEstimateDataOpsVersion;
  actor: GlobalEstimateDataOpsActor;
}): GlobalEstimateDataOpsRollbackPlan {
  const auditLog = [
    createGlobalEstimateDataOpsAuditEvent({
      event: "rollback_plan_created",
      actor: params.actor,
      changeId: params.version.changeId,
      metadata: { versionId: params.version.id, directDelete: false },
    }),
  ];
  return {
    rollbackReady: true,
    directDelete: false,
    destructiveSql: false,
    requiresApproval: true,
    targetVersionId: params.version.id,
    restoreSnapshot: params.version.previousSnapshot ?? null,
    steps: [
      "Create a rollback change draft from the previous approved snapshot.",
      "Submit rollback change for review.",
      "Apply rollback only through the backend data-ops service after approval.",
      "Keep the superseded version and audit log immutable.",
    ],
    auditLog,
  };
}

function rateFresh(rate: Pick<GlobalRateRecord, "checkedAt">): boolean {
  return daysSince(rate.checkedAt) <= 180;
}

function taxFresh(rule: Pick<GlobalTaxRule, "checkedAt">): boolean {
  return daysSince(rule.checkedAt) <= 365;
}

export function buildGlobalEstimateDataOpsCoverageMatrix(): GlobalEstimateDataOpsCoverageMatrix {
  const templateCoverage = verifyGlobalEstimateTemplateCoverage();
  const missingTemplateRows = GLOBAL_WORK_TYPE_DEFINITIONS
    .map((workType) => workType.workKey)
    .filter((workKey) => {
      const rows = getGlobalEstimateTemplateRows(workKey);
      const hasMaterials = rows.some((row) => row.sectionType === "materials");
      const hasLabor = rows.some((row) => row.sectionType === "labor");
      return rows.length === 0 || !hasMaterials || !hasLabor;
    });
  const materialRatesHaveSources = GLOBAL_RATE_MATERIALS.every((rate) => rate.id && rate.sourceLabel && rate.sourceType);
  const laborRatesHaveSources = GLOBAL_RATE_WORKS.every((rate) => rate.id && rate.sourceLabel && rate.sourceType);
  const taxRulesHaveSources = GLOBAL_TAX_RULES.every((rule) => rule.id && rule.sourceLabel && rule.sourceType);
  const sourceFreshnessReady = [
    ...GLOBAL_RATE_MATERIALS.map(rateFresh),
    ...GLOBAL_RATE_WORKS.map(rateFresh),
    ...GLOBAL_TAX_RULES.map(taxFresh),
  ].every(Boolean);
  const countriesCovered = [...new Set([
    ...GLOBAL_RATE_MATERIALS.map((rate) => rate.countryCode),
    ...GLOBAL_RATE_WORKS.map((rate) => rate.countryCode),
    ...GLOBAL_TAX_RULES.map((rule) => rule.countryCode),
  ])].sort();
  const priceTiersCovered = [...new Set([
    ...GLOBAL_RATE_MATERIALS.map((rate) => rate.priceTier),
    ...GLOBAL_RATE_WORKS.map((rate) => rate.priceTier),
  ])].sort() as GlobalEstimatePriceTier[];
  const blockers = [
    ...(!templateCoverage.passed ? [`GLOBAL_ESTIMATE_DATA_OPS_TEMPLATE_COVERAGE_MISSING:${templateCoverage.missingWorkKeys.join(",")}`] : []),
    ...(missingTemplateRows.length > 0 ? [`GLOBAL_ESTIMATE_DATA_OPS_TEMPLATE_ROWS_MISSING:${missingTemplateRows.join(",")}`] : []),
    ...(!materialRatesHaveSources ? ["GLOBAL_ESTIMATE_DATA_OPS_MATERIAL_RATE_SOURCE_MISSING"] : []),
    ...(!laborRatesHaveSources ? ["GLOBAL_ESTIMATE_DATA_OPS_LABOR_RATE_SOURCE_MISSING"] : []),
    ...(!taxRulesHaveSources ? ["GLOBAL_ESTIMATE_DATA_OPS_TAX_RULE_SOURCE_MISSING"] : []),
    ...(!sourceFreshnessReady ? ["GLOBAL_ESTIMATE_DATA_OPS_SOURCE_FRESHNESS_STALE"] : []),
  ];

  return {
    workTypesTotal: GLOBAL_WORK_TYPE_DEFINITIONS.length,
    templatesCovered: templateCoverage.passed,
    templateRowsCovered: missingTemplateRows.length === 0,
    materialRatesHaveSources,
    laborRatesHaveSources,
    taxRulesHaveSources,
    sourceFreshnessReady,
    countriesCovered,
    priceTiersCovered,
    blockers,
  };
}

function percentile95(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.max(0, Math.ceil(sorted.length * 0.95) - 1)] ?? 0;
}

export async function runGlobalEstimateDataOpsEstimateQa(
  inputs: GlobalEstimateInput[] = [
    { text: "Need laminate installation for 1000 sq ft in Dallas TX 75201", language: "en" },
    { text: "Tile installation 50 m2 in Berlin", language: "en" },
    { text: "Drywall installation 500 sq ft in Singapore", language: "en" },
    { text: "Electrical socket installation California 20 pcs", language: "en" },
  ],
): Promise<GlobalEstimateDataOpsQaResult> {
  const blockers: string[] = [];
  const durations: number[] = [];
  let noPriceWithoutSource = true;
  let noTaxWithoutRule = true;
  let professionalRowsPresent = true;

  for (const input of inputs) {
    const startedAt = Date.now();
    const result = await calculateGlobalConstructionEstimate(input);
    durations.push(Date.now() - startedAt);
    const rows = result.sections.flatMap((section) => section.rows);
    if (rows.length === 0 || !result.outputContract.hasMaterialsSection || !result.outputContract.hasLaborSection) {
      professionalRowsPresent = false;
      blockers.push("GLOBAL_ESTIMATE_DATA_OPS_QA_PROFESSIONAL_ROWS_MISSING");
    }
    if (rows.some((row) => row.unitPrice > 0 && !row.sourceId)) {
      noPriceWithoutSource = false;
      blockers.push("GLOBAL_ESTIMATE_DATA_OPS_QA_PRICE_WITHOUT_SOURCE");
    }
    if (result.tax.taxType !== "unknown" && result.tax.taxType !== "none") {
      const hasTaxSource = result.sources.some((source) =>
        source.type === "official_tax_source"
        || source.type === "tax_provider"
        || source.type === "configured_reference"
        || source.type === "manual_admin_rate"
      );
      if (!hasTaxSource) {
        noTaxWithoutRule = false;
        blockers.push("GLOBAL_ESTIMATE_DATA_OPS_QA_TAX_WITHOUT_SOURCE");
      }
    }
  }

  return {
    qaPassed: blockers.length === 0,
    promptsChecked: inputs.length,
    backendResultsUsed: true,
    noPriceWithoutSource,
    noTaxWithoutRule,
    professionalRowsPresent,
    blockers: [...new Set(blockers)],
    p95Ms: percentile95(durations),
  };
}

export function buildGlobalEstimateDataOpsInventory() {
  return {
    wave: GLOBAL_ESTIMATE_DATA_OPS_WAVE,
    existingTables: [
      "global_work_types",
      "global_work_aliases",
      "global_estimate_templates",
      "global_estimate_template_rows",
      "global_rate_materials",
      "global_rate_works",
      "global_tax_rules",
      "global_unit_conversions",
      "global_price_sources",
      "global_price_source_cache",
      "global_estimate_snapshots",
      "global_estimate_feedback",
      "global_estimate_data_versions",
      "global_estimate_data_change_log",
      "global_estimate_data_approval_queue",
    ],
    adminCapabilities: [
      "work_types_admin_contract",
      "estimate_templates_admin_contract",
      "template_rows_admin_contract",
      "material_pricebook_admin_contract",
      "labor_pricebook_admin_contract",
      "tax_rules_admin_contract",
      "source_freshness",
      "import_preview",
      "approval_workflow",
      "versioning",
      "rollback",
      "coverage_matrix",
      "estimate_qa",
      "audit_log",
    ],
    noSecondEstimateFramework: true,
    noScreenLocalCalculation: true,
    directUiWriteAllowed: false,
    liveWebBlockingRequired: false,
    migrationRequired: false,
    priceSources: GLOBAL_PRICE_SOURCES.length,
  };
}
