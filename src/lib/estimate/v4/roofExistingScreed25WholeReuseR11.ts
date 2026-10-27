import {buildRoofExistingSourceProfileR11, roofSourceProfileCaptureR11, roofSourceProfileEntryR11} from './roofExistingSourceProfileR11';
import {buildRoofExistingValleyWholeReuseR11, type RoofExistingValleyModelR11} from './roofExistingValleyWholeReuseR11';
import {canonicalDefinitionPublicationStableValueR1 as stable} from '../backendPlatform/canonicalDefinitionPublicationStableValueR1';

type JsonObject = Record<string, unknown>;
const source: unknown = require('../../../../data/estimate-benchmarks/source-packs/roof-screed25-companion-s27-67.json');
const prefix = 'roof:cement-screed25:krer12-017-01-plus-10x02:';
const areaId = 'roof_planned_screed25_area_m2';
const documents = ['roof_torch_conditions', 'roof_screed25_technology', 'roof_screed25_direct_base'] as const;
const artifact = '114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8';
const same = (left: unknown, right: unknown): boolean => JSON.stringify(stable(left)) === JSON.stringify(stable(right));
function check(value: unknown, code: string): asserts value {
  if (!value) throw Error('ROOF_EXISTING_SCREED25_WHOLE_R11_' + code);
}
function record(value: unknown): JsonObject {
  check(value !== null && typeof value === 'object' && !Array.isArray(value), 'OBJECT_REQUIRED');
  return value as JsonObject;
}
function records(value: unknown): JsonObject[] {
  check(Array.isArray(value), 'ARRAY_REQUIRED');
  return value.map(record);
}

/** The already captured 25 mm whole kit is reconnected, not copied or
 * recalculated from the 15 mm rows. Its existing composite source rates remain
 * exact. Planned 25 mm work, pumping suitability and the prepared loose-fill
 * substrate remain document facts; a measured area does not supply them.
 *
 * Input is the exact preceding family candidate (R11 + valley), so unrelated
 * edits cannot be smuggled through this adapter. The old 15 mm and 25 mm source
 * rows, defaults, formulas, units and cost owners are untouched. The inherited
 * multi-choice project guide described only its 15 mm choice. Its one phrase
 * is clarified to cover the already present 25 mm choice, with an independent
 * accepted composition; no quantity norm is taken from that project guide.
 * The original guide is retained in the captured historical definition.
 */
export function buildRoofExistingScreed25WholeReuseR11<T extends RoofExistingValleyModelR11>(model: T): T {
  const entry = record(roofSourceProfileEntryR11(model.definition.catalog_id));
  check(entry.kind === 'flat_torch', 'EXACT_EXISTING_FLAT_CONSUMER_REQUIRED');
  const base: RoofExistingValleyModelR11 = buildRoofExistingSourceProfileR11(roofSourceProfileCaptureR11(model.definition.catalog_id));
  const expected = buildRoofExistingValleyWholeReuseR11(base);
  check(same(model, expected), 'EXACT_PRECEDING_FAMILY_CANDIDATE_REQUIRED');
  const pinned = record(source), rates = records(pinned.rates);
  check(pinned.contract === 'rik-expo-app.s27-67.roof-screed25-companion.v1'
    && pinned.normId === '12-01-017-01+10*12-01-017-02' && pinned.measurementParameterId === areaId
    && pinned.measurementUnitId === 'm2' && rates.length === 8
    && pinned.numericRateValidationComplete === true, 'EXACT_EXISTING_25MM_SOURCE_REQUIRED');
  check(records(pinned.sources).some(item => item.sha256 === artifact), 'PINNED_PRIMARY_SOURCE_REQUIRED');
  const rows = model.resources.filter(row => row.row_id.startsWith(prefix));
  check(rows.length === 9 && new Set(rows.map(row => row.row_id)).size === 9
    && rows.some(row => row.row_id === prefix + 'project-scope'), 'EXACT_NINE_EXISTING_WHOLE_ROWS_REQUIRED');
  const worker = rows.find(row => row.row_id === prefix + 'workers');
  check(worker, 'EXISTING_WORKER_REQUIRED');
  const oldWhen = worker.inclusion_ast;
  const branches = records(oldWhen.operands);
  check(oldWhen.kind === 'and' && branches.length === 2 && branches[1].kind === 'not', 'EXACT_LEGACY_SCOPE_SHAPE_REQUIRED');
  // Keep the entire accepted planned-25mm scope, including its original
  // payment boundary, machine technology and direct-base conditions.
  const fieldWhen: JsonObject[] = [
    {kind: 'selected', parameterId: 'm212_roof_complete_system', value: entry.selectorValue},
    {kind: 'greater_than', parameterId: 'm212_roof_covering_area_m2', value: 0}];
  const currentWhen: JsonObject = {kind: 'and', operands: [...structuredClone(fieldWhen),
    {kind: 'greater_than', parameterId: areaId, value: 0}, structuredClone(branches[0])]},
    next = structuredClone(model);
  for (const rate of rates) {
    check(typeof rate.role === 'string' && typeof rate.per100m2 === 'string', 'EXACT_EXISTING_RATE_REQUIRED');
    const row = rows.find(item => item.row_id === prefix + rate.role);
    check(row, 'EXISTING_RATE_ROW_REQUIRED');
    const metadata = record(row.source_metadata), formula = model.formulas.find(item => item.formula_id === row.formula_id);
    const informational = rate.costTreatment === 'INFORMATIONAL_SCOPE';
    check(same(row.inclusion_ast, oldWhen) && metadata.sourceNormQuantityAccepted === !informational
      && metadata.normativeMeasureParameterId === areaId && metadata.normativeMeasureUnitId === 'm2'
      && metadata.normativeRatePer100M2 === rate.per100m2
      && same(metadata.compositeNormRateV1, rate.compositeRate)
      && record(row.resource_graph).costTreatment === rate.costTreatment && row.unit_id === rate.unitId
      && formula?.expression_source === areaId + '/100*' + rate.per100m2
      && same(formula.input_parameter_ids, [areaId]), 'EXISTING_SOURCE_RATE_FORMULA_OR_OWNER_DRIFT');
  }
  for (const row of next.resources) if (row.row_id.startsWith(prefix)) {
    let currentBranch = currentWhen;
    if (row.row_id === prefix + 'project-scope') {
      // This existing INFO row represents the unknown whole-roof scope, not
      // another 25 mm quantity norm. Preserve its broad field-method boundary
      // instead of hiding it behind the three narrower placement conditions.
      const prior = records(row.inclusion_ast.operands);
      check(row.inclusion_ast.kind === 'and' && prior.length === 2 && prior[1].kind === 'not'
        && prior[0].kind === 'equals' && prior[0].parameterId === 'roof_torch_system'
        && prior[0].value === 'Наружная кровля: ЭПП-4 снизу, ЭКП-4.5 сверху, два наплавляемых слоя'
        && record(row.source_metadata).sourceRole === 'UNRESOLVED_ROOF_SCOPE_REMAINDER'
        && record(row.resource_graph).costTreatment === 'INFORMATIONAL_SCOPE', 'EXACT_UNKNOWN_PROJECT_SCOPE_REQUIRED');
      currentBranch = {kind: 'and', operands: structuredClone(fieldWhen)};
    }
    row.inclusion_ast = {kind: 'or', operands: [structuredClone(row.inclusion_ast), structuredClone(currentBranch)]};
  }
  for (const id of documents) {
    const p = next.parameters.find(item => item.parameter_id === id);
    check(p && p.value_type === 'enum' && p.default_value === null, 'EXISTING_PROJECT_FACT_REQUIRED');
    const truth = record(p.truth_metadata);
    check(truth.visibility_role === 'USER_INPUT' && truth.value_source_role === 'PROJECT_SPECIFIC_INPUT'
      && record(truth.provenance).consumer_input_role_v1 === 'OBJECT_FACT', 'CAPTURED_DOCUMENT_ROLE_REQUIRED');
    p.truth_metadata = {...truth, visibility_role: 'INTERNAL_ONLY', value_source_role: 'PROJECT_DOCUMENTATION',
      source_confirmation_required: true,
      provenance: {...record(truth.provenance), consumer_input_role_v1: 'APPLICATION_TECHNICAL'}};
    if (id === 'roof_torch_conditions') {
      const guide = record(truth.guide), short = guide.guide_short_ru;
      const oldPhrase = 'именно машинной стяжки 15 мм М100 в этой конструкции';
      check(typeof short === 'string' && short.split(oldPhrase).length === 2, 'EXACT_CAPTURED_PROJECT_GUIDE_PHRASE_REQUIRED');
      p.truth_metadata.guide = {...guide, guide_short_ru: short.replace(oldPhrase,
        'предусмотренной для отдельного участка машинной стяжки 15 мм либо 25 мм М100 только по её собственному принятому составу')};
    }
  }
  const area = next.parameters.find(item => item.parameter_id === areaId);
  check(area && area.value_type === 'decimal' && area.unit_id === 'm2' && area.default_value === null,
    'EXISTING_INDEPENDENT_AREA_REQUIRED');
  const truth = record(area.truth_metadata);
  check(truth.visibility_role === 'USER_INPUT' && truth.value_source_role === 'USER_MEASURED'
    && record(truth.provenance).consumer_input_role_v1 === 'OBJECT_FACT', 'ACTUAL_MEASURED_AREA_REQUIRED');
  area.truth_metadata = {...truth, visible_when: {kind: 'or', operands: [structuredClone(record(truth.visible_when)),
    {kind: 'selected', parameterId: 'm212_roof_complete_system', value: entry.selectorValue}]}};
  return next;
}
