type JsonRecord = Record<string, unknown>;

type AuditResource = Readonly<{
  resource_graph?: unknown;
  source_metadata?: unknown;
}>;

type AuditParameter = Readonly<{
  parameter_id?: unknown;
  constraints_json?: unknown;
  truth_metadata?: unknown;
}>;

const GEOMETRY_ID = /(?:^|_)(?:area|length|width|height|depth|diameter|radius|perimeter|volume|thickness|distance|span|rise|run|slope|opening|route)(?:_|$)/iu;
const NON_GEOMETRY_ID = /(?:productivity|consumption|worker|labou?r|machine|shift|trip|price|cost|rate|factor|coefficient|reserve|loss|waste|density|dosage|coverage|package|count|quantity|mass|load|capacity|designation|reference|state|mode|type|class|required|included)/iu;
const EXPLICIT_COUNTED_GEOMETRY_ID = /^(?:pile_count|anchor_group_count|bolts_per_group|element_count_piece|total_installed_mass_t)$/iu;
const GENERIC_COUNTED_WORK_MEASURE_ID = /^(?:count|[a-z0-9_]+_count)$/iu;

const PROJECT_SPECIFIC_REFINEMENT_ROLES = new Set([
  "PROJECT_SPECIFIC_INPUT",
  "PROJECT_DOCUMENTATION",
  "ENGINEERING_DESIGN",
  "SITE_SURVEY",
  "SELECTED_EQUIPMENT_PASSPORT",
  "MATERIAL_PASSPORT_VALUE",
  "MANUFACTURER_CONFIRMED",
]);

// The historical drywall successor flattened these two source-level
// MATERIAL_PASSPORT_VALUE roles to BACKEND_DERIVED when it serialized the
// parameter truth metadata. Their values still belong to the selected frame
// system / connection layout; neither is a universal rate supplied by KRER.
const LOSSY_LEGACY_PROJECT_VALUE_PARAMETER_IDS = new Set([
  "cut_protection_rate_kg_m",
  "profile_screw_rate_item_m2",
]);

function record(value: unknown): JsonRecord | null {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function textArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map(text).filter(Boolean)
    : [];
}

function hasExactSourceTrace(binding: JsonRecord, sourceMetadata: unknown): boolean {
  const sourceId = text(binding.source_id);
  const normId = text(binding.norm_id);
  const sourceDocumentVersion = text(binding.source_document_version);
  const sourceDefinitionHash = text(binding.source_definition_hash);
  if (!sourceId || !normId || !sourceDocumentVersion || !sourceDefinitionHash) return false;

  const normativeTrace = record(sourceMetadata)?.normativeTrace;
  if (!Array.isArray(normativeTrace)) return false;
  return normativeTrace.some((rawTrace) => {
    const trace = record(rawTrace);
    return trace != null
      && text(trace.source_id ?? trace.sourceId ?? trace.document_code) === sourceId
      && text(trace.norm_id ?? trace.normId) === normId
      && text(trace.source_document_version ?? trace.normVersion) === sourceDocumentVersion
      && text(trace.source_definition_hash) === sourceDefinitionHash;
  });
}

/**
 * Selects only facts already known as the initial work measure. A value that
 * explicitly requires later source confirmation must not be promoted from a
 * validation fixture merely because its identifier contains a geometric word.
 */
export function isCatalogFirstEstimateKnownGeometryParameter(
  parameter: AuditParameter,
  fixtureValue: unknown,
): boolean {
  const parameterId = text(parameter.parameter_id);
  const constraints = record(parameter.constraints_json);
  const truth = record(parameter.truth_metadata);
  const explicitlyCountedGeometry = EXPLICIT_COUNTED_GEOMETRY_ID.test(parameterId)
    || (GENERIC_COUNTED_WORK_MEASURE_ID.test(parameterId)
      && text(truth?.input_origin_class).toUpperCase() === "KNOWN_WORK_SCOPE");
  if (fixtureValue == null
    || record(constraints?.requiredWhen) != null
    || truth?.source_confirmation_required === true
    || (!GEOMETRY_ID.test(parameterId) && !explicitlyCountedGeometry)
    || (NON_GEOMETRY_ID.test(parameterId) && !explicitlyCountedGeometry)
    || /(?:^|_)(?:access|protected|protection|repair|waste|fall)(?:_|$)/iu.test(parameterId)) {
    return false;
  }
  const role = text(truth?.value_source_role).toUpperCase();
  return role === "USER_INPUT" || role === "USER_MEASURED" || role === "PROJECT_INPUT"
    || role === "PROJECT_SPECIFIC_INPUT" || role === "";
}

/**
 * Returns parameters whose professional value is already owned by an exact,
 * versioned physical-norm binding in this definition. A missing value can
 * still be a project/applicability need, but it is not a missing norm source.
 */
export function sourceBackedPhysicalNormOutputParameterIds(
  resources: readonly AuditResource[],
): ReadonlySet<string> {
  const outputIds = new Set<string>();
  for (const resource of resources) {
    const binding = record(record(resource.resource_graph)?.professionalPhysicalNormBindingV1);
    if (binding == null || !hasExactSourceTrace(binding, resource.source_metadata)) continue;
    for (const parameterId of textArray(binding.produced_parameter_ids)) outputIds.add(parameterId);
    const quantityOutputParameterId = text(binding.quantity_output_parameter_id);
    if (quantityOutputParameterId) outputIds.add(quantityOutputParameterId);
  }
  return outputIds;
}

/**
 * Project/PPR/QA-plan facts and values from the selected equipment or product
 * refine one concrete project. They may legitimately remain unknown in a
 * preliminary estimate and must not be reported as a missing universal
 * professional norm owned by the platform.
 */
export function isCatalogFirstEstimateProjectSpecificRefinementParameter(
  parameter: AuditParameter,
): boolean {
  const parameterId = text(parameter.parameter_id);
  const truth = record(parameter.truth_metadata);
  const valueSourceRole = text(truth?.value_source_role).toUpperCase();
  if (PROJECT_SPECIFIC_REFINEMENT_ROLES.has(valueSourceRole)) return true;
  if (valueSourceRole === "BACKEND_DERIVED"
    && LOSSY_LEGACY_PROJECT_VALUE_PARAMETER_IDS.has(parameterId)) return true;

  const guide = record(truth?.guide);
  const guideKind = text(guide?.guide_kind).toUpperCase();
  if (valueSourceRole === "NORM_REQUIRED_BUT_PROJECT_SELECTED"
    && guideKind === "MANUFACTURER_RANGE") return true;
  return valueSourceRole === "USER_INPUT"
    && guideKind === "PROJECT_DEFINED";
}
