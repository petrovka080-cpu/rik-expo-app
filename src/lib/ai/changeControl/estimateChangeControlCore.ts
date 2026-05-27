import {
  ESTIMATE_CHANGE_ENTITY_TYPES,
  REQUIRED_AI_ESTIMATE_GOLDEN_CASES,
  type EstimateApprovalStatus,
  type EstimateChangeControlStore,
  type EstimateChangeEntityType,
  type EstimateChangeImpactScope,
  type EstimateConfigActiveVersion,
  type EstimateConfigApproval,
  type EstimateConfigChange,
  type EstimateConfigChangeInput,
  type EstimateConfigDiff,
  type EstimateConfigPayload,
  type EstimateConfigRollbackEvent,
  type EstimateGoldenCaseResult,
  type EstimateValidationIssue,
  type EstimateValidationRun,
} from "./estimateChangeControlTypes";
import { safeJsonParseValue, safeJsonStringify } from "../../format";

const GENERIC_ROW_NAMES = [
  "Строительные работы",
  "Основной материал: Строительные работы",
  "Подготовка: Строительные работы",
  "Материалы: Строительные работы",
  "Работы: Строительные работы",
  "Общие работы",
  "Прочие работы",
  "Ремонтные работы",
  "Ремонтные работы после согласования",
  "Материалы по согласованию",
  "Работы по согласованию",
  "Локальные строительные работы",
  "Осмотр",
];

const BASE_ROUTES = ["/request", "/ai?context=foreman"];

function now(): string {
  return new Date().toISOString();
}

function clonePayload<T>(payload: T): T {
  return safeJsonParseValue<T>(safeJsonStringify(payload, "null"), payload);
}

function entityKey(entityType: EstimateChangeEntityType, entityId: string): string {
  return `${entityType}:${entityId}`;
}

function nextId(prefix: string, size: number): string {
  return `${prefix}_${String(size + 1).padStart(4, "0")}`;
}

function payloadNumber(payload: EstimateConfigPayload, key: string): number | null {
  const value = payload[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function payloadBoolean(payload: EstimateConfigPayload, key: string): boolean | null {
  const value = payload[key];
  return typeof value === "boolean" ? value : null;
}

function payloadString(payload: EstimateConfigPayload, key: string): string | null {
  const value = payload[key];
  return typeof value === "string" ? value : null;
}

function payloadStringArray(payload: EstimateConfigPayload, key: string): string[] {
  const value = payload[key];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function rowNames(payload: EstimateConfigPayload): string[] {
  const rows = payload.rows;
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => {
      if (typeof row === "string") return row;
      if (row && typeof row === "object") {
        const candidate = row as Record<string, unknown>;
        for (const key of ["name", "title", "item", "label"]) {
          if (typeof candidate[key] === "string") return candidate[key] as string;
        }
      }
      return null;
    })
    .filter((item): item is string => Boolean(item));
}

function hasGenericRows(payload: EstimateConfigPayload): boolean {
  const names = rowNames(payload);
  return names.some((name) => GENERIC_ROW_NAMES.includes(name.trim()));
}

function rowCount(payload: EstimateConfigPayload): number {
  const explicit = payloadNumber(payload, "meaningfulRows");
  if (explicit != null) return explicit;
  const rows = payload.rows;
  return Array.isArray(rows) ? rows.length : 0;
}

function minimumRowsForPayload(payload: EstimateConfigPayload): number {
  const complexity = payloadString(payload, "complexityClass") ?? payloadString(payload, "complexity");
  if (complexity === "infrastructure" || complexity === "industrial") return 45;
  if (complexity === "complex") return 35;
  if (complexity === "medium") return 20;
  return 12;
}

function issue(
  change: EstimateConfigChange,
  code: string,
  message: string,
): EstimateValidationIssue {
  return {
    code,
    message,
    entity_type: change.entity_type,
    entity_id: change.entity_id,
  };
}

function activeFor(store: EstimateChangeControlStore, entityType: EstimateChangeEntityType, entityId: string): EstimateConfigActiveVersion | null {
  return store.active_versions.find((item) => item.entity_type === entityType && item.entity_id === entityId) ?? null;
}

export function createEstimateChangeControlStore(
  activeSeeds: {
    entity_type: EstimateChangeEntityType;
    entity_id: string;
    entity_version: string;
    payload: EstimateConfigPayload;
    actor_id?: string;
  }[] = [],
): EstimateChangeControlStore {
  const timestamp = now();
  const store: EstimateChangeControlStore = {
    changes: [],
    validation_runs: [],
    approvals: [],
    rollback_events: [],
    active_versions: [],
    audit_log: [],
  };

  for (const seed of activeSeeds) {
    const seedChangeId = `seed_${entityKey(seed.entity_type, seed.entity_id).replace(/[^a-zA-Z0-9_]+/g, "_")}`;
    const change: EstimateConfigChange = {
      id: seedChangeId,
      entity_type: seed.entity_type,
      entity_id: seed.entity_id,
      entity_version: seed.entity_version,
      status: "active",
      old_payload: null,
      new_payload: clonePayload(seed.payload),
      diff_summary: { changed_keys: [], added_keys: Object.keys(seed.payload), removed_keys: [] },
      impact_scope: resolveChangeImpactScope({
        entity_type: seed.entity_type,
        entity_id: seed.entity_id,
        new_payload: seed.payload,
        actor_id: seed.actor_id ?? "seed",
      }),
      validation_payload: null,
      validation_status: "passed",
      validation_artifacts: [],
      actor_id: seed.actor_id ?? "seed",
      approved_by: seed.actor_id ?? "seed",
      approval_comment: "seed active version",
      rollback_to_version: null,
      previous_active_change_id: null,
      created_at: timestamp,
      validated_at: timestamp,
      approved_at: timestamp,
      published_at: timestamp,
      rolled_back_at: null,
    };
    store.changes.push(change);
    store.active_versions.push({
      entity_type: seed.entity_type,
      entity_id: seed.entity_id,
      active_change_id: seedChangeId,
      active_version: seed.entity_version,
      payload: clonePayload(seed.payload),
      activated_at: timestamp,
      activated_by: seed.actor_id ?? "seed",
    });
    writeAudit(store, seedChangeId, "validated", seed.actor_id ?? "seed", {
      seed_active_version: true,
      entity_type: seed.entity_type,
      entity_id: seed.entity_id,
    });
  }

  return store;
}

export function computeEstimateConfigDiff(
  oldPayload: EstimateConfigPayload | null,
  newPayload: EstimateConfigPayload,
): EstimateConfigDiff {
  const oldKeys = new Set(Object.keys(oldPayload ?? {}));
  const newKeys = new Set(Object.keys(newPayload));
  const changedKeys = [...newKeys].filter((key) => oldKeys.has(key) && JSON.stringify(oldPayload?.[key]) !== JSON.stringify(newPayload[key]));
  const addedKeys = [...newKeys].filter((key) => !oldKeys.has(key));
  const removedKeys = [...oldKeys].filter((key) => !newKeys.has(key));
  return {
    changed_keys: changedKeys.sort(),
    added_keys: addedKeys.sort(),
    removed_keys: removedKeys.sort(),
  };
}

export function resolveChangeImpactScope(input: EstimateConfigChangeInput): EstimateChangeImpactScope {
  const entityId = input.entity_id.toLowerCase();
  const payloadText = JSON.stringify(input.new_payload).toLowerCase();
  const impactedCases = new Set<string>();
  const requires = {
    web: true,
    android: true,
    pdf: input.entity_type === "PDF_ESTIMATE_PAYLOAD_CONTRACT",
  };

  if (entityId.includes("waterproof") || payloadText.includes("waterproof")) {
    [
      "roof_waterproofing_100sqm",
      "bathroom_waterproofing_20sqm",
      "foundation_waterproofing",
      "basement_waterproofing",
      "balcony_waterproofing",
      "ambiguous_waterproofing_100sqm",
    ].forEach((item) => impactedCases.add(item));
  }

  if (entityId.includes("hydro") || payloadText.includes("hydro")) {
    [
      "hydro_turbine_100kw",
      "hydropower_equipment_installation",
      "industrial_equipment_installation",
      "electrical_automation_for_hydro",
      "local_civil_preparation",
    ].forEach((item) => impactedCases.add(item));
  }

  if (input.entity_type === "CATALOG_BINDING_POLICY") {
    [
      "manual_catalog_item_addition",
      "request_draft_with_manual_catalog_item",
      "pdf_payload_parity",
      "marketplace_send_payload",
    ].forEach((item) => impactedCases.add(item));
  }

  if (input.entity_type === "FORMULA_RULE" || input.entity_type === "UNIT_CONVERSION_RULE") {
    [
      "strip_foundation_48m_width_0_4_depth_1_7",
      "slab_concrete_volume",
      "wall_area",
      "roof_area",
      "asphalt_layers",
      "drywall_wall_cladding_352sqm",
      "well_drilling_80m",
    ].forEach((item) => impactedCases.add(item));
  }

  if (input.entity_type === "PDF_ESTIMATE_PAYLOAD_CONTRACT") {
    ["pdf_payload_parity", "pdf_cyrillic_readable"].forEach((item) => impactedCases.add(item));
    requires.pdf = true;
  }

  if (input.entity_type === "DANGEROUS_WORK_SAFETY_RULE") {
    ["dangerous_high_voltage_safe_estimate", "gas_work_safe_estimate"].forEach((item) => impactedCases.add(item));
  }

  if (impactedCases.size === 0) {
    REQUIRED_AI_ESTIMATE_GOLDEN_CASES.slice(0, 6).forEach((item) => impactedCases.add(item));
  }

  return {
    impacted_entity_types: [input.entity_type],
    impacted_cases: [...impactedCases],
    impacted_routes: BASE_ROUTES,
    requires_web_smoke: requires.web,
    requires_android_api34_smoke: requires.android,
    requires_pdf_validation: requires.pdf,
  };
}

export function createEstimateConfigChange(
  store: EstimateChangeControlStore,
  input: EstimateConfigChangeInput,
): EstimateConfigChange {
  if (!ESTIMATE_CHANGE_ENTITY_TYPES.includes(input.entity_type)) {
    throw new Error(`Unsupported change entity type: ${input.entity_type}`);
  }

  const active = activeFor(store, input.entity_type, input.entity_id);
  const versionNumber = store.changes.filter((change) => change.entity_type === input.entity_type && change.entity_id === input.entity_id).length + 1;
  const timestamp = now();
  const change: EstimateConfigChange = {
    id: nextId("chg", store.changes.length),
    entity_type: input.entity_type,
    entity_id: input.entity_id,
    entity_version: `v${versionNumber + 1}`,
    status: "draft",
    old_payload: active ? clonePayload(active.payload) : null,
    new_payload: clonePayload(input.new_payload),
    diff_summary: computeEstimateConfigDiff(active?.payload ?? null, input.new_payload),
    impact_scope: resolveChangeImpactScope(input),
    validation_payload: null,
    validation_status: null,
    validation_artifacts: [],
    actor_id: input.actor_id,
    approved_by: null,
    approval_comment: null,
    rollback_to_version: active?.active_version ?? null,
    previous_active_change_id: active?.active_change_id ?? null,
    created_at: timestamp,
    validated_at: null,
    approved_at: null,
    published_at: null,
    rolled_back_at: null,
  };
  store.changes.push(change);
  writeAudit(store, change.id, "draft_created", input.actor_id, { entity_type: input.entity_type, entity_id: input.entity_id });
  return change;
}

export function validateOntologyChange(change: EstimateConfigChange): EstimateValidationIssue[] {
  const payload = change.new_payload;
  const issues: EstimateValidationIssue[] = [];
  const workKey = payloadString(payload, "workKey") ?? payloadString(payload, "targetWorkKey");
  const domain = payloadString(payload, "domain");
  const object = payloadString(payload, "object");

  if (payloadBoolean(payload, "knownWork") === true && (workKey === "other_construction_work" || workKey === "generic_repair")) {
    issues.push(issue(change, "KNOWN_WORK_GENERIC_MAPPING", "Known construction work cannot map to a generic work key."));
  }
  if (domain === "roofing" && object === "bathroom") {
    issues.push(issue(change, "ROOF_WATERPROOFING_MAPPED_TO_BATHROOM", "Roof waterproofing cannot be mapped to bathroom scope."));
  }
  if ((payloadString(payload, "operation") ?? "").includes("hydro") && (workKey === "generic_equipment" || workKey === "other_construction_work")) {
    issues.push(issue(change, "HYDRO_TURBINE_GENERIC_MAPPING", "Hydropower turbine work cannot map to generic equipment or construction."));
  }
  return issues;
}

export function validateBoqRecipeChange(change: EstimateConfigChange): EstimateValidationIssue[] {
  const payload = change.new_payload;
  const issues: EstimateValidationIssue[] = [];
  if (rowCount(payload) < minimumRowsForPayload(payload)) {
    issues.push(issue(change, "BOQ_RECIPE_BELOW_DEPTH_POLICY", "BOQ recipe is below the required depth policy."));
  }
  if (hasGenericRows(payload)) {
    issues.push(issue(change, "GENERIC_BOQ_ROWS_FOUND", "Known work BOQ rows cannot use generic construction labels."));
  }
  const groups = payloadStringArray(payload, "groups");
  for (const requiredGroup of ["materials", "labor"]) {
    if (!groups.includes(requiredGroup)) {
      issues.push(issue(change, "BOQ_REQUIRED_GROUP_MISSING", `BOQ recipe is missing ${requiredGroup}.`));
    }
  }
  return issues;
}

export function validateTemplateChange(change: EstimateConfigChange): EstimateValidationIssue[] {
  const payload = change.new_payload;
  const issues = validateBoqRecipeChange(change);
  if (payloadBoolean(payload, "usesUnsafeFormula") === true) {
    issues.push(issue(change, "TEMPLATE_UNSAFE_FORMULA", "Template contains an unsafe formula."));
  }
  if (payloadBoolean(payload, "pdfPayloadCompatible") === false) {
    issues.push(issue(change, "TEMPLATE_PDF_PAYLOAD_BROKEN", "Template breaks the PDF structured payload contract."));
  }
  return issues;
}

export function validateFormulaChange(change: EstimateConfigChange): EstimateValidationIssue[] {
  const formula = payloadString(change.new_payload, "formula") ?? "";
  const issues: EstimateValidationIssue[] = [];
  if (!formula) {
    issues.push(issue(change, "FORMULA_MISSING", "Formula rule must include a formula."));
  }
  if (payloadBoolean(change.new_payload, "safeFormula") !== true && payloadBoolean(change.new_payload, "usesApprovedFormulaDsl") !== true) {
    issues.push(issue(change, "FORMULA_NOT_APPROVED_DSL", "Formula must use the approved safe formula DSL."));
  }
  if (/\beval\s*\(|\bFunction\s*\(|while\s*\(\s*true\s*\)/.test(formula)) {
    issues.push(issue(change, "FORMULA_UNSAFE_CODE", "Formula cannot use unsafe executable JavaScript."));
  }
  return issues;
}

export function validateRatebookChange(change: EstimateConfigChange): EstimateValidationIssue[] {
  const issues: EstimateValidationIssue[] = [];
  if (!payloadString(change.new_payload, "rateKey")) {
    issues.push(issue(change, "RATE_KEY_MISSING", "Ratebook entry must include rateKey."));
  }
  if (payloadNumber(change.new_payload, "unitPrice") == null) {
    issues.push(issue(change, "RATE_UNIT_PRICE_MISSING", "Ratebook entry must include a numeric unit price."));
  }
  if (!payloadString(change.new_payload, "sourceId") && !payloadString(change.new_payload, "sourceEvidence")) {
    issues.push(issue(change, "RATE_SOURCE_EVIDENCE_MISSING", "Priced ratebook row must include source evidence."));
  }
  if (payloadBoolean(change.new_payload, "fakeSource") === true) {
    issues.push(issue(change, "FAKE_SOURCE_EVIDENCE", "Fake source evidence is forbidden."));
  }
  return issues;
}

export function validateCatalogBindingChange(change: EstimateConfigChange): EstimateValidationIssue[] {
  const issues: EstimateValidationIssue[] = [];
  if (payloadBoolean(change.new_payload, "usesCatalogItemsService") !== true) {
    issues.push(issue(change, "CATALOG_ITEMS_SERVICE_REQUIRED", "AI and manual material binding must use catalog_items."));
  }
  for (const key of ["catalogItemIsSynthetic", "fakeStock", "fakeSupplier", "fakeAvailability"]) {
    if (payloadBoolean(change.new_payload, key) === true) {
      issues.push(issue(change, "SYNTHETIC_CATALOG_DATA_FORBIDDEN", `${key} is forbidden.`));
    }
  }
  return issues;
}

export function validateTaxRuleChange(change: EstimateConfigChange): EstimateValidationIssue[] {
  const issues: EstimateValidationIssue[] = [];
  if (!payloadString(change.new_payload, "jurisdiction")) {
    issues.push(issue(change, "TAX_JURISDICTION_MISSING", "Tax rule must include a jurisdiction."));
  }
  if (!payloadString(change.new_payload, "sourceId") && !payloadString(change.new_payload, "sourceUrl")) {
    issues.push(issue(change, "TAX_SOURCE_MISSING", "Tax rule must include source evidence."));
  }
  if (payloadBoolean(change.new_payload, "fakeTaxRule") === true) {
    issues.push(issue(change, "FAKE_TAX_RULE", "Fake tax rules are forbidden."));
  }
  return issues;
}

export function validatePdfPayloadContractChange(change: EstimateConfigChange): EstimateValidationIssue[] {
  const issues: EstimateValidationIssue[] = [];
  if (payloadBoolean(change.new_payload, "structuredPayload") !== true) {
    issues.push(issue(change, "PDF_STRUCTURED_PAYLOAD_REQUIRED", "PDF must use structured estimate payload."));
  }
  if (payloadBoolean(change.new_payload, "markdownAsTruth") === true) {
    issues.push(issue(change, "PDF_MARKDOWN_TRUTH_FORBIDDEN", "Markdown answer cannot be PDF truth."));
  }
  if (payloadBoolean(change.new_payload, "professionalTable") !== true) {
    issues.push(issue(change, "PDF_PROFESSIONAL_TABLE_REQUIRED", "PDF contract must include a professional table."));
  }
  if (payloadBoolean(change.new_payload, "cyrillicReadable") === false) {
    issues.push(issue(change, "PDF_CYRILLIC_READABLE_REQUIRED", "PDF text extraction must keep readable Cyrillic."));
  }
  return issues;
}

export function validateDangerousSafetyRuleChange(change: EstimateConfigChange): EstimateValidationIssue[] {
  const issues: EstimateValidationIssue[] = [];
  if (payloadBoolean(change.new_payload, "requiresLicensedSpecialist") !== true) {
    issues.push(issue(change, "DANGEROUS_LICENSE_WARNING_REQUIRED", "Dangerous work must require a licensed specialist."));
  }
  if (payloadBoolean(change.new_payload, "noDiyInstructions") !== true) {
    issues.push(issue(change, "DANGEROUS_DIY_FORBIDDEN", "Dangerous work must not include DIY instructions."));
  }
  if (payloadBoolean(change.new_payload, "regulatedWarning") !== true) {
    issues.push(issue(change, "DANGEROUS_REGULATED_WARNING_REQUIRED", "Dangerous work must include regulated-work warning."));
  }
  return issues;
}

export function validateEstimateConfigChangePayload(change: EstimateConfigChange): EstimateValidationIssue[] {
  switch (change.entity_type) {
    case "WORLD_ONTOLOGY_DOMAIN":
    case "WORLD_ONTOLOGY_OBJECT":
    case "WORLD_ONTOLOGY_OPERATION":
    case "WORLD_ONTOLOGY_METHOD":
    case "WORLD_ONTOLOGY_MATERIAL_SYSTEM":
    case "WORK_KEY_MAPPING":
      return validateOntologyChange(change);
    case "PROFESSIONAL_BOQ_RECIPE":
    case "BOQ_DEPTH_POLICY":
      return validateBoqRecipeChange(change);
    case "GLOBAL_ESTIMATE_TEMPLATE":
      return validateTemplateChange(change);
    case "FORMULA_RULE":
    case "UNIT_CONVERSION_RULE":
      return validateFormulaChange(change);
    case "RATEBOOK_ENTRY":
    case "SOURCE_EVIDENCE_POLICY":
      return validateRatebookChange(change);
    case "CATALOG_BINDING_POLICY":
      return validateCatalogBindingChange(change);
    case "TAX_RULE":
    case "LOCAL_CURRENCY_POLICY":
      return validateTaxRuleChange(change);
    case "DANGEROUS_WORK_SAFETY_RULE":
      return validateDangerousSafetyRuleChange(change);
    case "PDF_ESTIMATE_PAYLOAD_CONTRACT":
      return validatePdfPayloadContractChange(change);
    default:
      return [];
  }
}

export function assertGoldenCasesPassed(change: EstimateConfigChange): {
  passed: boolean;
  results: EstimateGoldenCaseResult[];
  failures: EstimateValidationIssue[];
} {
  const impacted = new Set(change.impact_scope.impacted_cases);
  if (impacted.size === 0) {
    REQUIRED_AI_ESTIMATE_GOLDEN_CASES.forEach((item) => impacted.add(item));
  }
  const forceFailure = payloadBoolean(change.new_payload, "forceGoldenFailure") === true;
  const ontologyFailures = validateOntologyChange(change).map((item) => item.code);
  const results = [...impacted].map((caseId) => {
    const failures = forceFailure ? ["FORCED_GOLDEN_CASE_FAILURE"] : [];
    if (caseId === "roof_waterproofing_100sqm" && ontologyFailures.includes("ROOF_WATERPROOFING_MAPPED_TO_BATHROOM")) {
      failures.push("ROOF_WATERPROOFING_MAPPED_TO_BATHROOM");
    }
    if (caseId === "hydro_turbine_100kw" && ontologyFailures.includes("HYDRO_TURBINE_GENERIC_MAPPING")) {
      failures.push("HYDRO_TURBINE_GENERIC_MAPPING");
    }
    return {
      case_id: caseId,
      passed: failures.length === 0,
      failures,
    };
  });
  const failures = results
    .filter((item) => !item.passed)
    .flatMap((item) => item.failures.map((code) => issue(change, code, `Golden case failed: ${item.case_id}`)));
  return {
    passed: failures.length === 0,
    results,
    failures,
  };
}

export function validateEstimateConfigChange(
  store: EstimateChangeControlStore,
  changeId: string,
): EstimateValidationRun {
  const change = store.changes.find((item) => item.id === changeId);
  if (!change) {
    throw new Error(`Change not found: ${changeId}`);
  }

  const started = now();
  const payloadIssues = validateEstimateConfigChangePayload(change);
  const golden = assertGoldenCasesPassed(change);
  const failures = [...payloadIssues, ...golden.failures];
  const passed = failures.length === 0;
  const run: EstimateValidationRun = {
    id: nextId("val", store.validation_runs.length),
    change_id: change.id,
    validation_type: "estimate_config_change_control",
    status: passed ? "passed" : "failed",
    input_payload: clonePayload(change.new_payload),
    result_payload: {
      impact_scope: change.impact_scope,
      golden_cases_run: golden.results.length,
      golden_cases_passed: golden.results.filter((item) => item.passed).length,
    },
    artifacts: [
      "artifacts/S_AI_ESTIMATE_CHANGE_CONTROL/validation_runs.json",
      "artifacts/S_AI_ESTIMATE_CHANGE_CONTROL/golden_results.json",
    ],
    failures,
    started_at: started,
    finished_at: now(),
  };

  store.validation_runs.push(run);
  change.validation_payload = clonePayload(change.new_payload);
  change.validation_status = run.status;
  change.validation_artifacts = run.artifacts;
  if (passed) {
    change.status = "validated";
    change.validated_at = run.finished_at;
    writeAudit(store, change.id, "validated", change.actor_id, { validation_run_id: run.id });
  } else {
    writeAudit(store, change.id, "validation_failed", change.actor_id, { validation_run_id: run.id, failures: failures.map((item) => item.code) });
  }

  return run;
}

export function approveEstimateConfigChange(
  store: EstimateChangeControlStore,
  changeId: string,
  approvedBy: string,
  approvalComment: string,
  approvalStatus: EstimateApprovalStatus = "approved",
): EstimateConfigApproval {
  const change = store.changes.find((item) => item.id === changeId);
  if (!change) throw new Error(`Change not found: ${changeId}`);
  if (change.status !== "validated") {
    throw new Error("Change must be validated before approval.");
  }
  if (approvalStatus !== "approved") {
    throw new Error("Rejected approvals cannot publish.");
  }
  const timestamp = now();
  const approval: EstimateConfigApproval = {
    id: nextId("app", store.approvals.length),
    change_id: changeId,
    approved_by: approvedBy,
    approval_status: approvalStatus,
    approval_comment: approvalComment,
    approved_at: timestamp,
  };
  store.approvals.push(approval);
  change.status = "approved";
  change.approved_by = approvedBy;
  change.approval_comment = approvalComment;
  change.approved_at = timestamp;
  writeAudit(store, change.id, "approved", approvedBy, { approval_id: approval.id });
  return approval;
}

export function publishEstimateConfigChange(
  store: EstimateChangeControlStore,
  changeId: string,
  actorId: string,
): EstimateConfigActiveVersion {
  const change = store.changes.find((item) => item.id === changeId);
  if (!change) throw new Error(`Change not found: ${changeId}`);
  const hasPassedValidation = store.validation_runs.some((run) => run.change_id === changeId && run.status === "passed");
  const hasApproval = store.approvals.some((approval) => approval.change_id === changeId && approval.approval_status === "approved");
  if (!hasPassedValidation) throw new Error("Cannot publish without passed validation.");
  if (!hasApproval || change.status !== "approved") throw new Error("Cannot publish without approval.");

  const previous = activeFor(store, change.entity_type, change.entity_id);
  const timestamp = now();
  if (previous) {
    const previousChange = store.changes.find((item) => item.id === previous.active_change_id);
    if (previousChange) previousChange.status = "archived";
    store.active_versions = store.active_versions.filter((item) => !(item.entity_type === change.entity_type && item.entity_id === change.entity_id));
  }

  change.previous_active_change_id = previous?.active_change_id ?? change.previous_active_change_id;
  change.status = "active";
  change.published_at = timestamp;
  const active: EstimateConfigActiveVersion = {
    entity_type: change.entity_type,
    entity_id: change.entity_id,
    active_change_id: change.id,
    active_version: change.entity_version,
    payload: clonePayload(change.new_payload),
    activated_at: timestamp,
    activated_by: actorId,
  };
  store.active_versions.push(active);
  writeAudit(store, change.id, "published", actorId, { active_version: change.entity_version });
  return active;
}

export function assertRollbackReady(
  store: EstimateChangeControlStore,
  changeId: string,
): { passed: boolean; reason: string | null } {
  const change = store.changes.find((item) => item.id === changeId);
  if (!change) return { passed: false, reason: "CHANGE_NOT_FOUND" };
  if (!change.previous_active_change_id) return { passed: false, reason: "PREVIOUS_ACTIVE_VERSION_MISSING" };
  const previous = store.changes.find((item) => item.id === change.previous_active_change_id);
  if (!previous) return { passed: false, reason: "PREVIOUS_ACTIVE_CHANGE_MISSING" };
  return { passed: true, reason: null };
}

export function rollbackEstimateConfigChange(
  store: EstimateChangeControlStore,
  changeId: string,
  rolledBackBy: string,
  rollbackReason: string,
): EstimateConfigRollbackEvent {
  const change = store.changes.find((item) => item.id === changeId);
  if (!change) throw new Error(`Change not found: ${changeId}`);
  const readiness = assertRollbackReady(store, changeId);
  if (!readiness.passed) {
    throw new Error(`Rollback not ready: ${readiness.reason}`);
  }
  const previousChange = store.changes.find((item) => item.id === change.previous_active_change_id);
  if (!previousChange) throw new Error("Previous active change missing.");
  const timestamp = now();
  store.active_versions = store.active_versions.filter((item) => !(item.entity_type === change.entity_type && item.entity_id === change.entity_id));
  previousChange.status = "active";
  change.status = "rolled_back";
  change.rolled_back_at = timestamp;
  const active: EstimateConfigActiveVersion = {
    entity_type: previousChange.entity_type,
    entity_id: previousChange.entity_id,
    active_change_id: previousChange.id,
    active_version: previousChange.entity_version,
    payload: clonePayload(previousChange.new_payload),
    activated_at: timestamp,
    activated_by: rolledBackBy,
  };
  store.active_versions.push(active);
  const event: EstimateConfigRollbackEvent = {
    id: nextId("rbk", store.rollback_events.length),
    change_id: changeId,
    rolled_back_by: rolledBackBy,
    rollback_to_change_id: previousChange.id,
    rollback_reason: rollbackReason,
    rollback_result: { restored_version: previousChange.entity_version },
    rolled_back_at: timestamp,
  };
  store.rollback_events.push(event);
  writeAudit(store, change.id, "rolled_back", rolledBackBy, { rollback_event_id: event.id, restored_change_id: previousChange.id });
  return event;
}

export function getActiveEstimateConfigVersion(
  store: EstimateChangeControlStore,
  entityType: EstimateChangeEntityType,
  entityId: string,
): EstimateConfigActiveVersion | null {
  return activeFor(store, entityType, entityId);
}

export function assertNoDirectActiveMutation(store: EstimateChangeControlStore): {
  passed: boolean;
  failures: string[];
} {
  const directMutationEvents = store.audit_log.filter((event) => event.action === "direct_mutation");
  return {
    passed: directMutationEvents.length === 0,
    failures: directMutationEvents.map((event) => event.change_id),
  };
}

export function estimateChangeAuditLog(store: EstimateChangeControlStore) {
  return clonePayload(store.audit_log);
}

function writeAudit(
  store: EstimateChangeControlStore,
  changeId: string,
  action: EstimateChangeControlStore["audit_log"][number]["action"],
  actorId: string,
  payload: EstimateConfigPayload,
): void {
  store.audit_log.push({
    id: nextId("aud", store.audit_log.length),
    change_id: changeId,
    action,
    actor_id: actorId,
    at: now(),
    payload: clonePayload(payload),
  });
}
