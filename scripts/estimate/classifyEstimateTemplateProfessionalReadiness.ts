import {
  buildEstimate10000ReadinessManifest,
  type Estimate10000ReadinessManifest,
  type Estimate10000ReadinessTemplate,
} from "./buildEstimate10000ReadinessManifest";

export type Estimate10000ProfessionalReadinessStatus =
  | "READY_PROFESSIONAL"
  | "READY_QUANTITY_ONLY_PRICE_MISSING"
  | "NOT_READY_MISSING_WORK_FAMILY"
  | "NOT_READY_MISSING_CALCULATOR"
  | "NOT_READY_MISSING_PARAMETER_SCHEMA"
  | "NOT_READY_MISSING_FORMULA"
  | "NOT_READY_MISSING_MATERIAL_RECIPE"
  | "NOT_READY_MISSING_LABOR_RECIPE"
  | "NOT_READY_MISSING_NORM_SOURCE"
  | "NOT_READY_MISSING_UNIT_POLICY"
  | "NOT_READY_MISSING_UI_RENDERER"
  | "NOT_READY_MISSING_PDF_POLICY"
  | "NOT_READY_MISSING_BUYER_HANDOFF"
  | "NOT_READY_GENERIC_FALLBACK"
  | "NOT_READY_SYNTHETIC_SOURCE"
  | "NOT_READY_FAKE_PRICE"
  | "NOT_READY_RAW_DUMP_UI"
  | "NOT_READY_PDF_MISMATCH";

export type Estimate10000ProfessionalTemplateReadiness =
  Omit<Estimate10000ReadinessTemplate, "readiness_status" | "blocking_reasons"> & {
    readiness_status: Estimate10000ProfessionalReadinessStatus;
    blocking_reasons: string[];
    norm_source_type: string;
    norm_source_name: string;
    source_document_ref: string;
    ui_renderer_policy_id: string;
    every_required_policy_present: boolean;
    professional_acceptance_blockers: string[];
  };

const UI_RENDERER_POLICY_ID = "grouped_professional_estimate_preview_v1";

function hasUiRendererPolicy(): boolean {
  return UI_RENDERER_POLICY_ID.length > 0;
}

function sourceType(template: Estimate10000ReadinessTemplate): string {
  if (template.norm_source_status === "READY_SOURCE_BACKED") return "versioned_professional_norm_pack";
  if (template.norm_source_status === "PARTIAL_SOURCE_BACKED") return "partial_versioned_professional_norm_pack";
  if (template.norm_source_status === "GENERIC_FAMILY_DEFAULT") return "generic_family_default";
  return "unknown";
}

function requestedStatusFromTemplate(template: Estimate10000ReadinessTemplate): Estimate10000ProfessionalReadinessStatus {
  const policyFailures: Array<[boolean, Estimate10000ProfessionalReadinessStatus]> = [
    [!template.work_family_id, "NOT_READY_MISSING_WORK_FAMILY"],
    [!template.calculator_family_id, "NOT_READY_MISSING_CALCULATOR"],
    [!template.parameter_schema_id, "NOT_READY_MISSING_PARAMETER_SCHEMA"],
    [template.formula_status !== "PRESENT", "NOT_READY_MISSING_FORMULA"],
    [template.material_recipe_status !== "PRESENT", "NOT_READY_MISSING_MATERIAL_RECIPE"],
    [template.labor_recipe_status !== "PRESENT", "NOT_READY_MISSING_LABOR_RECIPE"],
    [template.norm_source_status === "UNKNOWN_SOURCE", "NOT_READY_MISSING_NORM_SOURCE"],
    [template.unit_policy_status !== "PRESENT", "NOT_READY_MISSING_UNIT_POLICY"],
    [!hasUiRendererPolicy(), "NOT_READY_MISSING_UI_RENDERER"],
    [!template.pdf_policy_id, "NOT_READY_MISSING_PDF_POLICY"],
    [!template.buyer_handoff_policy_id, "NOT_READY_MISSING_BUYER_HANDOFF"],
    [template.generic_family_default_row_count > 0, "NOT_READY_GENERIC_FALLBACK"],
    [template.norm_source_status === "GENERIC_FAMILY_DEFAULT", "NOT_READY_SYNTHETIC_SOURCE"],
    [template.price_source_status === "PRICE_SOURCE_PRESENT" && template.readiness_status !== "READY_PROFESSIONAL", "NOT_READY_FAKE_PRICE"],
    [template.pdf_status !== "SNAPSHOT_TRACE_PRESENT", "NOT_READY_PDF_MISMATCH"],
  ];
  const failed = policyFailures.find(([condition]) => condition);
  if (failed) return failed[1];

  if (template.readiness_status === "READY_PROFESSIONAL") return "READY_PROFESSIONAL";
  if (template.readiness_status === "READY_QUANTITY_ONLY_PRICE_MISSING") return "READY_QUANTITY_ONLY_PRICE_MISSING";
  if (template.readiness_status === "NOT_READY_MISSING_NORM") return "NOT_READY_MISSING_NORM_SOURCE";
  if (template.readiness_status === "NOT_READY_MISSING_MATERIAL_RECIPE") return "NOT_READY_MISSING_MATERIAL_RECIPE";
  if (template.readiness_status === "NOT_READY_MISSING_FORMULA") return "NOT_READY_MISSING_FORMULA";
  if (template.readiness_status === "NOT_READY_PDF_MISMATCH") return "NOT_READY_PDF_MISMATCH";
  return "NOT_READY_GENERIC_FALLBACK";
}

export function classifyEstimateTemplateProfessionalReadiness(
  template: Estimate10000ReadinessTemplate,
): Estimate10000ProfessionalTemplateReadiness {
  const readinessStatus = requestedStatusFromTemplate(template);
  const policyBlockers = [
    !template.work_family_id ? "missing_work_family" : "",
    !template.calculator_family_id ? "missing_calculator_family" : "",
    !template.parameter_schema_id ? "missing_parameter_schema" : "",
    template.formula_status !== "PRESENT" ? "missing_formula" : "",
    template.material_recipe_status !== "PRESENT" ? "missing_material_recipe" : "",
    template.labor_recipe_status !== "PRESENT" ? "missing_labor_recipe" : "",
    template.norm_source_status === "UNKNOWN_SOURCE" ? "missing_norm_source" : "",
    template.norm_source_status === "GENERIC_FAMILY_DEFAULT" ? "synthetic_or_generic_norm_source" : "",
    template.unit_policy_status !== "PRESENT" ? "missing_unit_policy" : "",
    !hasUiRendererPolicy() ? "missing_ui_renderer_policy" : "",
    !template.pdf_policy_id ? "missing_pdf_policy" : "",
    !template.buyer_handoff_policy_id ? "missing_buyer_handoff_policy" : "",
    template.generic_family_default_row_count > 0 ? "generic_fallback_rows_present" : "",
  ].filter(Boolean);
  const blockingReasons = [...new Set([...template.blocking_reasons, ...policyBlockers])];
  return {
    ...template,
    readiness_status: readinessStatus,
    blocking_reasons: blockingReasons,
    norm_source_type: sourceType(template),
    norm_source_name: template.norm_pack_id,
    source_document_ref: `${template.norm_pack_id}@${template.norm_version}`,
    ui_renderer_policy_id: UI_RENDERER_POLICY_ID,
    every_required_policy_present: blockingReasons.length === 0 && readinessStatus === "READY_PROFESSIONAL",
    professional_acceptance_blockers: readinessStatus === "READY_PROFESSIONAL" ? [] : blockingReasons,
  };
}

export function classifyEstimateTemplateProfessionalReadinessById(
  templateIdOrWorkKey: string,
  manifest: Estimate10000ReadinessManifest = buildEstimate10000ReadinessManifest(),
): Estimate10000ProfessionalTemplateReadiness {
  const match = manifest.templates.find((template) =>
    template.template_id === templateIdOrWorkKey || template.work_key === templateIdOrWorkKey
  );
  if (!match) throw new Error(`ESTIMATE_TEMPLATE_NOT_FOUND:${templateIdOrWorkKey}`);
  return classifyEstimateTemplateProfessionalReadiness(match);
}
