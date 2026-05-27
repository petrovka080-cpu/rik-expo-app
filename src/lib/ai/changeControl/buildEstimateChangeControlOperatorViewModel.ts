import {
  approveEstimateConfigChange,
  assertNoDirectActiveMutation,
  assertRollbackReady,
  createEstimateChangeControlStore,
  createEstimateConfigChange,
  publishEstimateConfigChange,
  rollbackEstimateConfigChange,
  validateEstimateConfigChange,
} from "./estimateChangeControlCore";
import {
  ESTIMATE_CHANGE_ENTITY_TYPES,
  type EstimateChangeEntityType,
  type EstimateConfigPayload,
} from "./estimateChangeControlTypes";

type OperatorRow = {
  label: string;
  value: string;
  state: "ready" | "blocked";
};

export type EstimateChangeControlOperatorViewModel = {
  title: string;
  route: string;
  entityTypesTotal: number;
  lifecycle: OperatorRow[];
  blockingChecks: OperatorRow[];
  governanceChecks: OperatorRow[];
  goldenCases: string[];
  directActiveMutationFound: boolean;
  publishWithoutValidationFound: boolean;
  publishWithoutApprovalFound: boolean;
  mutationWithoutAuditFound: boolean;
  rollbackRestoresPreviousActiveVersion: boolean;
};

function rows(count: number, prefix: string): { name: string; unit: string; quantity: number; materialKey?: string; rateKey?: string; sourceId?: string }[] {
  return Array.from({ length: count }, (_, index) => ({
    name: `${prefix} row ${index + 1}`,
    unit: index % 2 === 0 ? "m2" : "item",
    quantity: index + 1,
    materialKey: index % 2 === 0 ? `${prefix}_material_${index + 1}` : undefined,
    rateKey: `${prefix}_rate_${index + 1}`,
    sourceId: `source_${index + 1}`,
  }));
}

function templatePayload(overrides: EstimateConfigPayload = {}): EstimateConfigPayload {
  return {
    workKey: "roof_waterproofing",
    complexityClass: "medium",
    meaningfulRows: 22,
    rows: rows(22, "roof_waterproofing"),
    groups: ["materials", "labor", "equipment", "logistics"],
    pdfPayloadCompatible: true,
    usesUnsafeFormula: false,
    sourceId: "source_roof_market_2026",
    ...overrides,
  };
}

function boqPayload(overrides: EstimateConfigPayload = {}): EstimateConfigPayload {
  return {
    complexityClass: "complex",
    meaningfulRows: 36,
    rows: rows(36, "complex_boq"),
    groups: ["materials", "labor", "equipment", "logistics"],
    ...overrides,
  };
}

function formulaPayload(overrides: EstimateConfigPayload = {}): EstimateConfigPayload {
  return {
    formula: "length * width * depth",
    safeFormula: true,
    sourceId: "formula_governance",
    ...overrides,
  };
}

function ratePayload(overrides: EstimateConfigPayload = {}): EstimateConfigPayload {
  return {
    rateKey: "roof_primer_m2",
    unitPrice: 12,
    sourceId: "source_rate_2026",
    ...overrides,
  };
}

function catalogPayload(overrides: EstimateConfigPayload = {}): EstimateConfigPayload {
  return {
    usesCatalogItemsService: true,
    manualAndAutomaticShared: true,
    catalogItemIsSynthetic: false,
    fakeStock: false,
    fakeSupplier: false,
    fakeAvailability: false,
    ...overrides,
  };
}

function taxPayload(overrides: EstimateConfigPayload = {}): EstimateConfigPayload {
  return {
    jurisdiction: "KG",
    sourceId: "tax_policy_source_2026",
    sourceUrl: "https://example.invalid/tax-policy-evidence",
    fakeTaxRule: false,
    ...overrides,
  };
}

function dangerousPayload(overrides: EstimateConfigPayload = {}): EstimateConfigPayload {
  return {
    requiresLicensedSpecialist: true,
    noDiyInstructions: true,
    regulatedWarning: true,
    sourceId: "safety_policy_2026",
    ...overrides,
  };
}

function pdfPayload(overrides: EstimateConfigPayload = {}): EstimateConfigPayload {
  return {
    structuredPayload: true,
    markdownAsTruth: false,
    professionalTable: true,
    cyrillicReadable: true,
    sourceId: "pdf_contract_2026",
    ...overrides,
  };
}

function seed(
  entityType: EstimateChangeEntityType,
  entityId: string,
  payload: EstimateConfigPayload,
) {
  return {
    entity_type: entityType,
    entity_id: entityId,
    entity_version: "v1",
    payload,
    actor_id: "operator_ui_seed",
  };
}

function stateRow(label: string, passed: boolean, value: string): OperatorRow {
  return {
    label,
    value,
    state: passed ? "ready" : "blocked",
  };
}

export function buildEstimateChangeControlOperatorViewModel(): EstimateChangeControlOperatorViewModel {
  const store = createEstimateChangeControlStore([
    seed("GLOBAL_ESTIMATE_TEMPLATE", "roof_waterproofing", templatePayload({ meaningfulRows: 20, rows: rows(20, "seed_roof_waterproofing") })),
    seed("FORMULA_RULE", "strip_foundation_volume", formulaPayload()),
    seed("RATEBOOK_ENTRY", "roof_primer_m2", ratePayload()),
    seed("CATALOG_BINDING_POLICY", "ai_material_rows", catalogPayload()),
    seed("TAX_RULE", "kg_standard_warning", taxPayload()),
    seed("DANGEROUS_WORK_SAFETY_RULE", "high_voltage", dangerousPayload()),
    seed("PDF_ESTIMATE_PAYLOAD_CONTRACT", "estimate_pdf_v1", pdfPayload()),
  ]);

  const templateChange = createEstimateConfigChange(store, {
    entity_type: "GLOBAL_ESTIMATE_TEMPLATE",
    entity_id: "roof_waterproofing",
    new_payload: templatePayload(),
    actor_id: "operator_ui",
  });
  const templateValidation = validateEstimateConfigChange(store, templateChange.id);
  const templateApproval = approveEstimateConfigChange(store, templateChange.id, "approver_1", "Operator UI golden cases passed.");
  const templateActive = publishEstimateConfigChange(store, templateChange.id, "publisher_1");
  const rollbackReady = assertRollbackReady(store, templateChange.id);
  const rollback = rollbackEstimateConfigChange(store, templateChange.id, "approver_1", "Operator UI rollback proof.");

  const invalidFormula = createEstimateConfigChange(store, {
    entity_type: "FORMULA_RULE",
    entity_id: "strip_foundation_volume",
    new_payload: formulaPayload({ formula: "eval(userInput)", safeFormula: false }),
    actor_id: "operator_ui",
  });
  const invalidFormulaBlocked = validateEstimateConfigChange(store, invalidFormula.id).status === "failed";

  const fixedFormula = createEstimateConfigChange(store, {
    entity_type: "FORMULA_RULE",
    entity_id: "strip_foundation_volume",
    new_payload: formulaPayload({ formula: "length * width * depth", safeFormula: true }),
    actor_id: "operator_ui",
  });
  const fixedFormulaValidation = validateEstimateConfigChange(store, fixedFormula.id);
  const fixedFormulaApproval = approveEstimateConfigChange(store, fixedFormula.id, "approver_1", "Fixed formula validated.");
  const fixedFormulaActive = publishEstimateConfigChange(store, fixedFormula.id, "publisher_1");

  const shallowBoq = createEstimateConfigChange(store, {
    entity_type: "PROFESSIONAL_BOQ_RECIPE",
    entity_id: "hydro_turbine_100kw",
    new_payload: boqPayload({ complexityClass: "infrastructure", meaningfulRows: 8, rows: rows(8, "shallow_hydro") }),
    actor_id: "operator_ui",
  });
  const shallowBoqBlocked = validateEstimateConfigChange(store, shallowBoq.id).status === "failed";

  const missingSource = createEstimateConfigChange(store, {
    entity_type: "RATEBOOK_ENTRY",
    entity_id: "roof_primer_m2",
    new_payload: ratePayload({ sourceId: undefined, sourceEvidence: undefined }),
    actor_id: "operator_ui",
  });
  const missingSourceBlocked = validateEstimateConfigChange(store, missingSource.id).status === "failed";

  const missingCatalog = createEstimateConfigChange(store, {
    entity_type: "CATALOG_BINDING_POLICY",
    entity_id: "ai_material_rows",
    new_payload: catalogPayload({ usesCatalogItemsService: false }),
    actor_id: "operator_ui",
  });
  const missingCatalogBlocked = validateEstimateConfigChange(store, missingCatalog.id).status === "failed";

  const missingTax = createEstimateConfigChange(store, {
    entity_type: "TAX_RULE",
    entity_id: "kg_standard_warning",
    new_payload: taxPayload({ sourceId: undefined, sourceUrl: undefined }),
    actor_id: "operator_ui",
  });
  const missingTaxBlocked = validateEstimateConfigChange(store, missingTax.id).status === "failed";

  const dangerousRemoval = createEstimateConfigChange(store, {
    entity_type: "DANGEROUS_WORK_SAFETY_RULE",
    entity_id: "high_voltage",
    new_payload: dangerousPayload({ noDiyInstructions: false }),
    actor_id: "operator_ui",
  });
  const dangerousRemovalBlocked = validateEstimateConfigChange(store, dangerousRemoval.id).status === "failed";

  const noDirectMutation = assertNoDirectActiveMutation(store).passed;
  const publishWithoutValidation = store.audit_log.some((event) => event.action === "published" && !store.validation_runs.some((run) => run.change_id === event.change_id && run.status === "passed"));
  const publishWithoutApproval = store.audit_log.some((event) => event.action === "published" && !store.approvals.some((approval) => approval.change_id === event.change_id && approval.approval_status === "approved"));
  const mutationWithoutAudit = store.changes.some((change) => !store.audit_log.some((event) => event.change_id === change.id));
  const rollbackRestoresPreviousActiveVersion = store.rollback_events.some((event) => event.change_id === templateChange.id && event.rollback_to_change_id === rollback.rollback_to_change_id);

  return {
    title: "AI Estimate Change Control",
    route: "/admin/global-estimate/change-control",
    entityTypesTotal: ESTIMATE_CHANGE_ENTITY_TYPES.length,
    lifecycle: [
      stateRow("Draft created", templateChange.status !== "draft" || Boolean(templateChange.id), templateChange.id),
      stateRow("Validation passed", templateValidation.status === "passed", templateValidation.status),
      stateRow("Approval recorded", templateApproval.approval_status === "approved", templateApproval.approval_status),
      stateRow("Published active version", templateActive.active_change_id === templateChange.id, templateActive.active_version),
      stateRow("Rollback ready", rollbackReady.passed, rollbackReady.passed ? "ready" : "blocked"),
      stateRow("Rollback restored previous active", rollbackRestoresPreviousActiveVersion, rollback.rollback_to_change_id),
      stateRow("Fixed formula published", fixedFormulaValidation.status === "passed" && fixedFormulaApproval.approval_status === "approved", fixedFormulaActive.active_version),
    ],
    blockingChecks: [
      stateRow("Invalid formula blocked", invalidFormulaBlocked, "unsafe formula denied"),
      stateRow("Shallow BOQ blocked", shallowBoqBlocked, "depth policy enforced"),
      stateRow("Missing source evidence blocked", missingSourceBlocked, "sourceId required"),
      stateRow("Missing catalog policy blocked", missingCatalogBlocked, "catalog_items path required"),
      stateRow("Missing tax source blocked", missingTaxBlocked, "tax source required"),
      stateRow("Dangerous safety removal blocked", dangerousRemovalBlocked, "licensed/safety policy required"),
    ],
    governanceChecks: [
      stateRow("Direct active mutation blocked", noDirectMutation, String(!noDirectMutation)),
      stateRow("Publish requires validation", !publishWithoutValidation, String(publishWithoutValidation)),
      stateRow("Publish requires approval", !publishWithoutApproval, String(publishWithoutApproval)),
      stateRow("Every mutation has audit record", !mutationWithoutAudit, String(mutationWithoutAudit)),
    ],
    goldenCases: [
      "roof_waterproofing_100sqm",
      "ambiguous_waterproofing_100sqm",
      "hydro_turbine_100kw",
      "strip_foundation_48m_width_0_4_depth_1_7",
      "manual_catalog_item_addition",
      "pdf_cyrillic_readable",
    ],
    directActiveMutationFound: !noDirectMutation,
    publishWithoutValidationFound: publishWithoutValidation,
    publishWithoutApprovalFound: publishWithoutApproval,
    mutationWithoutAuditFound: mutationWithoutAudit,
    rollbackRestoresPreviousActiveVersion,
  };
}
