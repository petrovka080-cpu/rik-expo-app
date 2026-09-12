import {
  buildEstimateNormItemForTemplateRow,
  getProductionExpandedTemplate10000,
  PROFESSIONAL_NORM_PACK_REGISTRY_ITEMS,
  PRODUCTION_WORK_DEFINITIONS_10000,
} from "../../src/lib/ai/estimateTemplate10000";
import {
  CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1,
} from "../../src/lib/estimate/v4/domainFactory/professionalPhysicalNormApplicabilityV1";

export type PhysicalNormBindingCandidateSpec = {
  norm_id: string;
  work_group: string;
  basis_parameter: string;
  work_basis_unit: string | null;
  output_unit: string;
  required_parameter_keys: readonly string[];
};

export type ProductionNormBindingCandidateInventoryEntry = {
  norm_id: string;
  work_group: string;
  basis_parameter: string;
  work_basis_unit: string | null;
  output_unit: string;
  registered: boolean;
  binding_route: "TEMPLATE_10000_STATIC" | "CANONICAL_V4_APPLICABILITY" | null;
  binding_owner: string | null;
  unresolved_applicability_keys: string[];
  dimensional_candidate_rows_count: number;
  dimensional_candidate_work_keys: string[];
  dimensional_candidate_row_ids: string[];
  dimensional_candidate_samples: Array<{
    work_key: string;
    template_key: string;
    row_code: string;
    row_title_ru: string;
    line_type: string;
    section: string;
    work_basis_unit: string;
    output_unit: string;
  }>;
  disposition:
    | "REGISTERED_EXECUTABLE_BINDING"
    | "DIMENSIONAL_CANDIDATE_REVIEW_REQUIRED"
    | "NO_DIMENSIONALLY_COMPATIBLE_ROW";
  next_action: string;
};

function normalizeUnit(value: string | null | undefined): string {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "sq_m" || normalized === "sqm") return "m2";
  if (normalized === "pcs") return "piece";
  if (normalized === "shift") return "day";
  return normalized;
}

function dimensionKey(workGroup: string, workBasisUnit: string | null, outputUnit: string): string {
  return `${workGroup}|${normalizeUnit(workBasisUnit)}|${normalizeUnit(outputUnit)}`;
}

export function inspectProductionNormBindingCandidates(
  specs: readonly PhysicalNormBindingCandidateSpec[],
): ProductionNormBindingCandidateInventoryEntry[] {
  const staticRegisteredIds = new Set(PROFESSIONAL_NORM_PACK_REGISTRY_ITEMS.map((item) => item.normId));
  const canonicalRuntimeBindingByNormId = new Map<
    string,
    (typeof CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1)[number]
  >(
    CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1.map((binding) => [binding.norm_id, binding]),
  );
  const registeredIds = new Set([
    ...staticRegisteredIds,
    ...canonicalRuntimeBindingByNormId.keys(),
  ]);
  const candidatesByNormId = new Map<string, ProductionNormBindingCandidateInventoryEntry["dimensional_candidate_samples"]>();
  const workKeysByNormId = new Map<string, Set<string>>();
  const rowIdsByNormId = new Map<string, Set<string>>();
  const unregisteredSpecsByDimension = new Map<string, PhysicalNormBindingCandidateSpec[]>();

  for (const spec of specs) {
    candidatesByNormId.set(spec.norm_id, []);
    workKeysByNormId.set(spec.norm_id, new Set());
    rowIdsByNormId.set(spec.norm_id, new Set());
    if (registeredIds.has(spec.norm_id) || !spec.work_basis_unit) continue;
    const key = dimensionKey(spec.work_group, spec.work_basis_unit, spec.output_unit);
    const candidates = unregisteredSpecsByDimension.get(key) ?? [];
    candidates.push(spec);
    unregisteredSpecsByDimension.set(key, candidates);
  }

  for (const definition of PRODUCTION_WORK_DEFINITIONS_10000) {
    const template = getProductionExpandedTemplate10000(definition.workKey);
    for (const row of template.rows) {
      const norm = buildEstimateNormItemForTemplateRow(definition, row);
      const specsForDimension = unregisteredSpecsByDimension.get(
        dimensionKey(norm.work_group, norm.base_unit, norm.unit),
      );
      if (!specsForDimension?.length) continue;
      for (const spec of specsForDimension) {
        const samples = candidatesByNormId.get(spec.norm_id);
        const workKeys = workKeysByNormId.get(spec.norm_id);
        const rowIds = rowIdsByNormId.get(spec.norm_id);
        if (!samples || !workKeys || !rowIds) continue;
        workKeys.add(definition.workKey);
        rowIds.add(row.rowCode);
        if (samples.length >= 8) continue;
        samples.push({
          work_key: definition.workKey,
          template_key: definition.templateKey,
          row_code: row.rowCode,
          row_title_ru: String(row.titleRu ?? ""),
          line_type: String(row.lineType ?? ""),
          section: row.section,
          work_basis_unit: norm.base_unit,
          output_unit: norm.unit,
        });
      }
    }
  }

  return specs.map((spec) => {
    const registered = registeredIds.has(spec.norm_id);
    const canonicalRuntimeBinding = canonicalRuntimeBindingByNormId.get(spec.norm_id) ?? null;
    const bindingRoute: ProductionNormBindingCandidateInventoryEntry["binding_route"] = canonicalRuntimeBinding
      ? "CANONICAL_V4_APPLICABILITY"
      : staticRegisteredIds.has(spec.norm_id)
        ? "TEMPLATE_10000_STATIC"
        : null;
    const bindingOwner = canonicalRuntimeBinding?.binding_owner ??
      (bindingRoute === "TEMPLATE_10000_STATIC" ? "PROFESSIONAL_NORM_PACK_REGISTRY_ITEMS" : null);
    const samples = candidatesByNormId.get(spec.norm_id) ?? [];
    const workKeys = [...(workKeysByNormId.get(spec.norm_id) ?? [])].sort();
    const rowIds = [...(rowIdsByNormId.get(spec.norm_id) ?? [])].sort();
    const unresolvedApplicabilityKeys = [...new Set(
      spec.required_parameter_keys.filter((key) => key !== spec.basis_parameter),
    )].sort();
    const disposition: ProductionNormBindingCandidateInventoryEntry["disposition"] = registered
      ? "REGISTERED_EXECUTABLE_BINDING"
      : rowIds.length === 0
        ? "NO_DIMENSIONALLY_COMPATIBLE_ROW"
        : "DIMENSIONAL_CANDIDATE_REVIEW_REQUIRED";
    const nextAction = registered
      ? `No action: executable production binding is registered via ${bindingRoute}.`
      : disposition === "NO_DIMENSIONALLY_COMPATIBLE_ROW"
        ? "Locate or add the canonical owner with compatible work/output units; do not coerce dimensions."
        : `Review semantic row IDs, then bind applicability inputs (${unresolvedApplicabilityKeys.join(", ")}) in the canonical source resolver; do not select the first source by order.`;

    return {
      norm_id: spec.norm_id,
      work_group: spec.work_group,
      basis_parameter: spec.basis_parameter,
      work_basis_unit: spec.work_basis_unit,
      output_unit: spec.output_unit,
      registered,
      binding_route: bindingRoute,
      binding_owner: bindingOwner,
      unresolved_applicability_keys: unresolvedApplicabilityKeys,
      dimensional_candidate_rows_count: rowIds.length,
      dimensional_candidate_work_keys: workKeys,
      dimensional_candidate_row_ids: rowIds,
      dimensional_candidate_samples: samples,
      disposition,
      next_action: nextAction,
    };
  }).sort((left, right) => left.norm_id.localeCompare(right.norm_id));
}
