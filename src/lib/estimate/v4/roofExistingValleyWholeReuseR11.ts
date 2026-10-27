import type {
  CanonicalEstimateFormulaDefinition,
  CanonicalEstimateParameterDefinition,
  CanonicalEstimateResourceDefinition,
} from '../backendPlatform/canonicalEstimateCompileCore';
import {roofSourceProfileCaptureR11, roofSourceProfileEntryR11} from './roofExistingSourceProfileR11';

type JsonObject = Record<string, unknown>;
export type RoofExistingValleyModelR11 = {
  definition: {catalog_id: string; id: string; definition_sha256: string; applicability: JsonObject};
  parameters: CanonicalEstimateParameterDefinition[];
  formulas: CanonicalEstimateFormulaDefinition[];
  resources: CanonicalEstimateResourceDefinition[];
};
const source: unknown = require('../../../../data/estimate-benchmarks/source-packs/roof-valley-torch-two-companion-s27-67.json');
const selectorId = 'm212_roof_complete_system';
const mainMeasureId = 'm212_roof_covering_area_m2';
const fieldWorkersId = 'master212:roof:r1:reuse:torch_field:roof:torch-two:krer12-002-09:workers';
const prefix = 'roof:valley-torch-two:krer12-005-03:';
const artifactSha256 = '114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8';
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
function check(condition: unknown, code: string): asserts condition {
  if (!condition) throw Error('ROOF_EXISTING_VALLEY_WHOLE_R11_' + code);
}
function record(value: unknown): JsonObject {
  check(value !== null && typeof value === 'object' && !Array.isArray(value), 'OBJECT_REQUIRED');
  return value as JsonObject;
}
function records(value: unknown): JsonObject[] {
  check(Array.isArray(value), 'ARRAY_REQUIRED');
  return value.map(record);
}
function parameter(model: RoofExistingValleyModelR11, id: string): CanonicalEstimateParameterDefinition {
  const matches = model.parameters.filter(item => item.parameter_id === id);
  check(matches.length === 1, 'EXACT_PARAMETER_REQUIRED_' + id);
  return matches[0];
}

/** Reconnect the existing seven-row 005-03 kit to the compatible existing
 * two-layer field. This is a model adapter, not a calculator or publisher.
 * Project necessity, prepared base, safety and payment scope stay unresolved.
 * The ordinary retained publisher must separately admit these seven predicate
 * changes; the earlier metadata-only R11 gate does not admit this delta. */
export function buildRoofExistingValleyWholeReuseR11<T extends RoofExistingValleyModelR11>(model: T): T {
  const entry = record(roofSourceProfileEntryR11(model.definition.catalog_id));
  check(entry.kind === 'flat_torch' && entry.definitionId === model.definition.id
    && entry.definitionSha256 === model.definition.definition_sha256, 'EXACT_COMPATIBLE_CURRENT_PARENT_REQUIRED');
  check(same(model.definition.applicability.sourceProfileSelectionV1, entry.sourceProfileSelectionV1),
    'EXISTING_SOURCE_PROFILE_REQUIRED');
  const frozen = record(roofSourceProfileCaptureR11(model.definition.catalog_id));
  const frozenResources = records(frozen.resources), frozenParameters = records(frozen.parameters);
  check(same(model.formulas, frozen.formulas) && same(model.resources, frozen.resources),
    'CAPTURED_RESOURCE_OR_FORMULA_DRIFT');
  const pinned = record(source), rates = records(pinned.rates);
  check(pinned.contract === 'rik-expo-app.s27-67.roof-valley-torch-two-companion.v1'
    && pinned.normId === '12-01-005-03' && pinned.measurementParameterId === 'roof_valley_length_m'
    && pinned.measurementUnitId === 'linear_m' && rates.length === 7, 'EXACT_ACCEPTED_WHOLE_SOURCE_REQUIRED');
  const primarySource = records(pinned.sources).find(item => item.kind === 'roof');
  check(primarySource?.sha256 === artifactSha256 && primarySource.quantityAdmitted === true
    && entry.artifactSha256 === artifactSha256, 'COMPATIBLE_PINNED_PRIMARY_SOURCE_REQUIRED');
  const printed = record(pinned.printedReferenceOnly);
  check(printed.numericRosterAdmitted === false && printed.separatePaymentAdmitted === false
    && printed.correctedCounterAdmitted === false && printed.neighborLoaderAdmitted === false,
    'UNVERIFIED_OPERATOR_COUNTER_FORBIDDEN');
  const rowIds = rates.map(rate => {
    check(typeof rate.role === 'string' && typeof rate.per100Measure === 'string'
      && rate.costTreatment === 'OWN_COST', 'EXACT_PHYSICAL_RATE_REQUIRED');
    return prefix + rate.role;
  });
  check(new Set(rowIds).size === 7
    && model.resources.filter(row => row.row_id.startsWith(prefix)).length === 7, 'EXACT_SEVEN_EXISTING_ROWS_REQUIRED');
  const field = frozenResources.find(row => row.row_id === fieldWorkersId);
  check(field && record(field.source_metadata).sourceNormQuantityAccepted === true, 'EXISTING_WHOLE_FIELD_REQUIRED');
  const fieldWhen = record(field.inclusion_ast);
  // Keep the complete accepted field predicate. Its project confirmations are
  // not manufactured from the source-owned method or the measured valley length.
  const sourceScopeId = String(pinned.systemParameterId), lengthId = String(pinned.measurementParameterId);
  check(sourceScopeId === 'roof_valley_scope', 'EXACT_PROJECT_SCOPE_REQUIRED');
  const length = parameter(model, lengthId), scope = parameter(model, sourceScopeId);
  const lengthTruth = record(length.truth_metadata), scopeTruth = record(scope.truth_metadata);
  check(length.value_type === 'decimal' && length.unit_id === 'linear_m' && length.default_value === null
    && lengthTruth.visibility_role === 'USER_INPUT' && lengthTruth.value_source_role === 'USER_MEASURED'
    && record(lengthTruth.provenance).consumer_input_role_v1 === 'OBJECT_FACT', 'REAL_MEASURED_LENGTH_REQUIRED');
  check(scope.value_type === 'enum' && scope.default_value === null && scopeTruth.visibility_role === 'USER_INPUT'
    && scopeTruth.value_source_role === 'PROJECT_SPECIFIC_INPUT'
    && Array.isArray(scope.constraints_json?.values) && scope.constraints_json.values.includes(pinned.systemYesRu),
    'EXISTING_PROJECT_SCOPE_ENUM_REQUIRED');
  for (const p of [length, scope]) {
    const captured = frozenParameters.find(item => item.parameter_id === p.parameter_id);
    check(captured && same(p.constraints_json, captured.constraints_json)
      && same(p.default_value, captured.default_value) && same(record(p.truth_metadata).guide, record(captured.truth_metadata).guide),
      'EXISTING_CONSTRAINT_DEFAULT_OR_GUIDE_DRIFT');
  }
  const currentWhen: JsonObject = {kind: 'and', operands: [structuredClone(fieldWhen),
    {kind: 'greater_than', parameterId: lengthId, value: 0},
    {kind: 'equals', parameterId: sourceScopeId, value: pinned.systemYesRu}]};
  const next = structuredClone(model);
  for (const rate of rates) {
    const row = next.resources.find(item => item.row_id === prefix + rate.role);
    check(row, 'EXISTING_WHOLE_ROW_REQUIRED');
    const metadata = record(row.source_metadata);
    const formula = next.formulas.find(item => item.formula_id === row.formula_id);
    check(metadata.sourceNormQuantityAccepted === true && metadata.normativeMeasureParameterId === lengthId
      && metadata.normativeMeasureUnitId === 'linear_m' && metadata.normativeRatePer100Measure === rate.per100Measure
      && row.unit_id === rate.unitId && record(row.resource_graph).costTreatment === 'OWN_COST'
      && records(metadata.normativeTrace).some(trace => trace.sourceSnapshotHash === artifactSha256)
      && formula?.expression_source === lengthId + '/100*' + rate.per100Measure
      && same(formula.input_parameter_ids, [lengthId]), 'CAPTURED_WHOLE_NORM_OR_OWNER_DRIFT');
    // The old branch is kept verbatim. It excludes this source-managed profile,
    // so the OR cannot create a second resource or a second paid contribution.
    row.inclusion_ast = {kind: 'or', operands: [structuredClone(row.inclusion_ast), structuredClone(currentWhen)]};
  }
  const nextLength = parameter(next, lengthId), nextScope = parameter(next, sourceScopeId);
  nextLength.truth_metadata = {...lengthTruth, visible_when: {kind: 'or', operands: [
    structuredClone(record(lengthTruth.visible_when)),
    {kind: 'selected', parameterId: selectorId, value: entry.selectorValue}]}};
  nextScope.truth_metadata = {...scopeTruth, visibility_role: 'INTERNAL_ONLY', value_source_role: 'PROJECT_DOCUMENTATION',
    source_confirmation_required: true,
    provenance: {...record(scopeTruth.provenance), consumer_input_role_v1: 'APPLICATION_TECHNICAL'}};
  check(parameter(next, mainMeasureId).parameter_id === mainMeasureId, 'EXISTING_PRIMARY_REQUIRED');
  return next;
}
