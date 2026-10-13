import screed from '../../../../data/estimate-benchmarks/source-packs/roof-screed15-companion-s27-67.json';
import standalone from '../../../../data/estimate-benchmarks/source-packs/roof-screed25-five-bindings-s27-69.json';
import { ROOF_LOWER_CHAIN_SCOPE_ROW_V1 } from './canonicalRoofLowerLayersCompanionV1';
import { canonicalEstimateStableJson } from './canonicalEstimateDeterminism';
import { ROOF_FORECAST_LOWER_LAYERS_CONDITIONS_V1 } from './canonicalRoofForecastConditionV1';

type Json = Record<string, any>;
export const ROOF_SCREED15_DIRECT_BASE_PARAMETER_V1 = 'roof_screed15_direct_base_scope';
export const ROOF_SCREED15_SUPPORTED_BASE_V1 = 'Отдельное пригодное плитное или монолитное основание; проект назначает именно М100 15 мм на этом участке';
export const ROOF_SCREED15_LOOSE_FILL_BASE_V1 = 'Непосредственно под стяжкой засыпной утеплитель — требуется ветвь 25 мм';
export const ROOF_SCREED15_UNKNOWN_BASE_V1 = 'Непосредственное основание или границы участка ещё не проверены';
export const ROOF_SCREED_DIRECT_BASE_SOURCE_V1 = {
  sha256: '6291b9410ac2a272b3439f65dcf8a45de327ad1b8c22e9606f76ae57aedd58d7',
  locator: 'СП КР31-102:2024 §3.28–3.29; PDF105, печатная21',
};
const rowIds = new Set(screed.rates.map(rate => `${screed.prefix}:${rate.role}`));
const baseAccepted = () => ({ kind: 'equals', parameterId: ROOF_SCREED15_DIRECT_BASE_PARAMETER_V1,
  value: ROOF_SCREED15_SUPPORTED_BASE_V1 });

/** Used only by a new definition overlay. Historical snapshots are immutable. */
export function roofScreed15DirectBaseParameterV1(exemplar: Json, requested15When: Json, catalogId: string, binding?: 'STANDALONE_OWN_Q'): Json {
  const admittedMeasurement = binding === 'STANDALONE_OWN_Q'
    ? standalone.targets.some(t => t.catalogId === catalogId) && exemplar.parameter_id === 'q'
      && exemplar.value_type === 'decimal' && exemplar.unit_id === 'm2'
    : exemplar.parameter_id === screed.measurementParameterId;
  if (!admittedMeasurement || !requested15When || !catalogId) {
    throw new Error('ROOF_SCREED_DIRECT_BASE_PARENT_REQUIRED');
  }
  return { ...structuredClone(exemplar), parameter_id: ROOF_SCREED15_DIRECT_BASE_PARAMETER_V1,
    title_ru: 'Что находится непосредственно под участком стяжки 15 мм?', value_type: 'enum', unit_id: null,
    required: true, default_value: null,
    constraints_json: { values: [ROOF_SCREED15_SUPPORTED_BASE_V1, ROOF_SCREED15_LOOSE_FILL_BASE_V1,
      ROOF_SCREED15_UNKNOWN_BASE_V1], requiredWhen: requested15When },
    truth_metadata: { ...exemplar.truth_metadata, value_source_role: 'PROJECT_SPECIFIC_INPUT', visibility_role: 'USER_INPUT',
      semantic_parameter_key: `${catalogId}:${ROOF_SCREED15_DIRECT_BASE_PARAMETER_V1}`,
      guide: { ...exemplar.truth_metadata.guide, guide_kind: 'PROJECT_DEFINED', source_role: 'PROJECT_DOCUMENTATION',
        source_id: 'SP_KR_31_102_2024_SCREED_DIRECT_BASE', source_title: 'СП КР31-102:2024 Кровли',
        source_document: 'SP_KR_31_102_2024_SCREED_DIRECT_BASE', source_document_version: 'СП КР31-102:2024, приказ212',
        source_snapshot_hash: ROOF_SCREED_DIRECT_BASE_SOURCE_V1.sha256,
        source_sha256: ROOF_SCREED_DIRECT_BASE_SOURCE_V1.sha256, source_artifact_sha256: ROOF_SCREED_DIRECT_BASE_SOURCE_V1.sha256,
        definition_hash: ROOF_SCREED_DIRECT_BASE_SOURCE_V1.sha256, artifact_sha256: ROOF_SCREED_DIRECT_BASE_SOURCE_V1.sha256,
        verified_at: '2026-10-13',
        source_locator: ROOF_SCREED_DIRECT_BASE_SOURCE_V1.locator,
        exact_locator: ROOF_SCREED_DIRECT_BASE_SOURCE_V1.locator,
        guide_short_ru: 'Укажите непосредственное основание именно этого участка. Наличие керамзита в другой части сметы и разные площади не доказывают расположение слоёв. По засыпному утеплителю СП предусматривает М100 25 мм; приложение само получает добавки и количества. Исключение стоимости или работы утепления не меняет фактическое основание. Смешанные участки нужно разделить.' } } };
}

export function roofScreed15DirectBaseRowV1(row: Json): Json {
  if (!rowIds.has(row.row_id) && row.row_id !== ROOF_LOWER_CHAIN_SCOPE_ROW_V1) return row;
  const result = structuredClone(row);
  if (rowIds.has(row.row_id)) {
    if (!result.inclusion_ast) throw new Error('ROOF_SCREED_DIRECT_BASE_INCLUSION_REQUIRED');
    result.inclusion_ast = { kind: 'and', operands: [result.inclusion_ast, baseAccepted()] };
  } else {
    const scope = result.resource_graph?.scopeRequirementV1;
    if (scope?.objectFactMode !== 'PROJECT_APPLICABILITY_ONLY' || !scope.exactScopeWhen) {
      throw new Error('ROOF_SCREED_DIRECT_BASE_PROJECT_CHAIN_REQUIRED');
    }
    scope.projectOperationContextsV1 = [...scope.projectOperationContextsV1,{
      when: {kind:'equals',parameterId:'roof_torch_conditions',value:ROOF_FORECAST_LOWER_LAYERS_CONDITIONS_V1},
      resourceRowIds:[...rowIds],applicabilityWhen:baseAccepted(),requiredFactParameterIds:[ROOF_SCREED15_DIRECT_BASE_PARAMETER_V1],
      unknownFactValues:{[ROOF_SCREED15_DIRECT_BASE_PARAMETER_V1]:[ROOF_SCREED15_UNKNOWN_BASE_V1]}}];
    scope.reasonRu += ' Для выбранной стяжки15мм дополнительно требуется отдельное пригодное непосредственное основание. Общая отметка о согласовании проекта не заменяет эту проверку; по засыпке применяется25мм.';
    scope.sourceEvidence = [...scope.sourceEvidence, ROOF_SCREED_DIRECT_BASE_SOURCE_V1];
  }
  if (canonicalEstimateStableJson(result.formula_id) !== canonicalEstimateStableJson(row.formula_id)
    || result.cost_owner_id !== row.cost_owner_id || result.unit_id !== row.unit_id) {
    throw new Error('ROOF_SCREED_DIRECT_BASE_PHYSICAL_OWNER_DRIFT');
  }
  return result;
}
