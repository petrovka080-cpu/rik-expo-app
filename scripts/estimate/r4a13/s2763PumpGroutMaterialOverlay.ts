import { buildMasterParameterCalculationConsumers } from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionParameterConsumersR1';
import { estimateDeterministicHash } from '../../../src/lib/estimate/estimateDeterministicHash';
import { pumpGroutMaterialDefinitionS2763, pumpGroutMaterialPackS2763 as pack, pumpGroutLegacyConditionS2763, pumpGroutMaterialPrefixS2763 } from '../../../src/lib/estimate/v4/pumpGroutMaterialS2763';
import type { PurchaseGroupRepresentative } from './s2732PurchaseGroupOverlay';

export const S2763_PUMP_GROUT_TARGETS = {
  'canonical-work:expanded:booster_pumping_station': ['rc09:bps_nonshrink_grout', 'rc09:bps-grout-balance:installed-net'],
  'canonical-work:expanded:pumping_station': ['rc09:wps_nonshrink_grout'],
  'canonical-work:base:plumbing_interior_pump_install_standard': ['rc09:non_shrink_pump_base_grout'],
} as const;
export function overlayS2763PumpGroutMaterial(parent: PurchaseGroupRepresentative, locatorId: string) {
  const catalogId = String(parent.definition.catalog_id);
  const legacyRowIds = S2763_PUMP_GROUT_TARGETS[catalogId as keyof typeof S2763_PUMP_GROUT_TARGETS];
  if (!legacyRowIds || !legacyRowIds.every(id => parent.resources.some(r => r.row_id === id))) throw Error('PUMP_GROUT_LEGACY_OWNER_DRIFT:' + catalogId);
  const result = structuredClone(parent);
  const shared = pumpGroutMaterialDefinitionS2763();
  if (shared.parameters.some(p => parent.parameters.some(old => old.parameter_id === p.parameter_id))) throw Error('PUMP_GROUT_PARAMETER_COLLISION');
  for (const row of result.resources) if ((legacyRowIds as readonly string[]).includes(row.row_id)) {
    row.inclusion_ast = { kind: 'and', operands: [row.inclusion_ast, pumpGroutLegacyConditionS2763] };
    row.source_metadata = { ...row.source_metadata, alternateMaterialBranchContract: pack.contract,
      historicalUnitAndPriceOwnerPreserved: true, selectedNewMaterialExcluded: true };
    const { row_sha256: _previousHash, ...body } = row;
    row.row_sha256 = estimateDeterministicHash(body);
  }
  const legacyFormulaIds = new Set(result.resources.filter(r => (legacyRowIds as readonly string[]).includes(r.row_id)).map(r => r.formula_id));
  const exclusiveLegacyInputs = new Set(result.formulas.filter(f => legacyFormulaIds.has(f.formula_id)).flatMap(f => f.input_parameter_ids as string[])
    .filter(id => !result.formulas.some(f => !legacyFormulaIds.has(f.formula_id) && f.input_parameter_ids.includes(id))));
  for (const p of result.parameters) if (exclusiveLegacyInputs.has(p.parameter_id) && p.truth_metadata.visibility_role !== 'INTERNAL_ONLY') {
    p.constraints_json = { ...p.constraints_json, requiredWhen: pumpGroutLegacyConditionS2763 };
    p.truth_metadata = { ...p.truth_metadata, required_when: pumpGroutLegacyConditionS2763 };
  }
  const ordinal = Math.max(...parent.parameters.map(p => Number(p.ordinal))) + 1;
  result.parameters.push(...shared.parameters.map((p, index) => ({ ...p, ordinal: ordinal + index })));
  result.formulas.push(...shared.formulas);
  const rowOrdinal = Math.max(...parent.resources.map(r => Number(r.ordinal))) + 1;
  result.resources.push(...shared.resources.map((r, index) => {
    const { row_sha256: _previousHash, ...body } = r;
    const final = { ...body, ordinal: rowOrdinal + index, row_type: r.category, semantic_owner: catalogId + ':' + r.row_id };
    return { ...final, row_sha256: estimateDeterministicHash(final) };
  }));
  result.bindings.push(...shared.resources.map(r => ({ row_id: r.row_id, locator_id: locatorId,
    applicability: { contract: pack.contract, selectedCountryProduct: pack.selectedProductRu, quantityQuality: 'APPROXIMATE',
      applicationScopeRu: pack.scopeRu, sourcePages: [1, 2, 3], fullTechnicalAcceptance: false } })));
  // The original approved project controls remain intact. The source-material
  // branch has separate independent controls; no historical m3 price is a kg price.
  result.baseline.input_values.grout_material_choice = pack.legacyProductRu;
  result.baseline.input_classification.grout_material_choice = 'VALIDATION_FIXTURE';
  result.baseline.normative_source_ids.grout_material_choice = [pack.sourceId];
  const consumers = buildMasterParameterCalculationConsumers(result);
  for (const p of result.parameters) {
    const id = p.parameter_id;
    p.truth_metadata = { ...p.truth_metadata, formula_consumers: consumers.formulaConsumers[id], resource_branch_consumers: consumers.resourceConsumers[id] };
    result.baseline.formula_consumer_ids[id] = consumers.formulaConsumers[id];
    result.baseline.resource_consumer_row_ids[id] = consumers.resourceConsumers[id];
    result.baseline.uom_by_parameter[id] = p.unit_id;
    if (!Object.hasOwn(result.baseline.normative_source_ids, id)) result.baseline.normative_source_ids[id] = [];
    if (!Object.hasOwn(result.baseline.guide_provenance_ru, id)) result.baseline.guide_provenance_ru[id] = p.truth_metadata.guide?.guide_short_ru ?? p.title_ru;
  }
  result.baseline.parameter_schema_sha256 = estimateDeterministicHash(result.parameters.map(p => ({ parameterId: p.parameter_id,
    unitId: p.unit_id, valueType: p.value_type, constraints: p.constraints_json, truth: p.truth_metadata })));
  result.passport.included_scope_ru = [...result.passport.included_scope_ru,
    'Отдельная выбранная ветвь: приблизительный расход SikaGrout-212 Казахстан по фактическому объёму, слой 10–75 мм; закупка мешками 25 кг.'];
  result.passport.decision = { ...result.passport.decision, materialSeriesContract: pack.contract, materialSourceScopeOnly: true,
    completeTechnicalEstimateAccepted: false, legacyPreliminarySourcesRemainUnaccepted: true };
  return { representative: result, legacyRowIds: [...legacyRowIds], addedRowIds: shared.resources.map(r => r.row_id),
    addedParameterIds: shared.parameters.map(p => p.parameter_id), changedFormulaIds: shared.formulas.map(f => f.formula_id),
    newPayableOwnerRowId: pumpGroutMaterialPrefixS2763 + ':order' };
}
