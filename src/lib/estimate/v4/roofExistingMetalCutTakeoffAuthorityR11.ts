import type {CanonicalEstimateParameterDefinition, CanonicalEstimateFormulaDefinition,
  CanonicalEstimateResourceDefinition} from '../backendPlatform/canonicalEstimateCompileCore';
import {buildRoofExistingSourceProfileR11, roofSourceProfileCaptureR11} from './roofExistingSourceProfileR11';
import {canonicalDefinitionPublicationStableValueR1 as stable} from '../backendPlatform/canonicalDefinitionPublicationStableValueR1';

type JsonObject = Record<string, unknown>;
export type RoofExistingMetalTakeoffModelR11 = {
  definition: {catalog_id: string; id: string; definition_sha256: string};
  parameters: CanonicalEstimateParameterDefinition[];
  formulas: CanonicalEstimateFormulaDefinition[];
  resources: CanonicalEstimateResourceDefinition[];
};
const parameterId = 'm212_roof_metal_cut_length_m';
const catalogId = 'canonical-work:base:roofing_interior_metal_roof_install_standard';
const same = (a: unknown, b: unknown) => JSON.stringify(stable(a)) === JSON.stringify(stable(b));
function check(value: unknown, code: string): asserts value {
  if (!value) throw Error('ROOF_EXISTING_METAL_TAKEOFF_R11_' + code);
}
function record(value: unknown): JsonObject {
  check(value !== null && typeof value === 'object' && !Array.isArray(value), 'OBJECT_REQUIRED');
  return value as JsonObject;
}

/** Existing cut-length takeoff is application technical data, not another
 * customer measurement question. No cut programme or trusted import is
 * supplied here: without one, all three existing cutting quantities stay
 * unknown. The existing compiler source-authority guard rejects a raw key.
 * Only this parameter's authority/guide changes; all old physical rows remain.
 */
export function buildRoofExistingMetalCutTakeoffAuthorityR11<T extends RoofExistingMetalTakeoffModelR11>(model: T): T {
  check(model.definition.catalog_id === catalogId, 'EXACT_EXISTING_METAL_CARD_REQUIRED');
  const captured = roofSourceProfileCaptureR11(catalogId);
  const expected: RoofExistingMetalTakeoffModelR11 = buildRoofExistingSourceProfileR11(captured);
  check(same(model, expected), 'EXACT_R11_METADATA_CANDIDATE_REQUIRED');
  const next = structuredClone(model), p = next.parameters.find(item => item.parameter_id === parameterId);
  check(p && p.value_type === 'decimal' && p.unit_id === 'linear_m' && p.default_value === null,
    'EXISTING_CUT_LENGTH_DECLARATION_REQUIRED');
  const truth = record(p.truth_metadata), guide = record(truth.guide);
  check(truth.visibility_role === 'USER_INPUT' && truth.value_source_role === 'USER_MEASURED'
    && record(truth.provenance).consumer_input_role_v1 === 'OBJECT_GEOMETRY'
    && truth.source_confirmation_required === false && guide.source_role === 'USER_SUPPLIED_PRIMARY_FACT',
    'CAPTURED_LEGACY_TAKEOFF_AUTHORITY_REQUIRED');
  check(model.resources.filter(row => row.row_id.startsWith('master212:roof:r1:metal_cut:')).length === 3,
    'THREE_EXISTING_CUT_RESOURCES_REQUIRED');
  p.truth_metadata = {...truth, visibility_role: 'INTERNAL_ONLY', value_source_role: 'PROJECT_DOCUMENTATION',
    source_confirmation_required: true,
    provenance: {...record(truth.provenance), consumer_input_role_v1: 'APPLICATION_TECHNICAL'},
    guide: {...guide, source_role: 'PROJECT_DOCUMENTATION'}};
  return next;
}
