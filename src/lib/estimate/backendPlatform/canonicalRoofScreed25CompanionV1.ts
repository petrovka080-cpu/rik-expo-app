import pack from '../../../../data/estimate-benchmarks/source-packs/roof-screed25-companion-s27-67.json';
import base from '../../../../data/estimate-benchmarks/source-packs/roof-screed15-companion-s27-67.json';
import { sourcePinnedRoofNormOwnerR1, sourcePinnedRoofNormGuardsR1,
  type SourcePinnedRoofNormPackR1 } from '../v4/sourcePinnedRoofNormOwnerR1';
import { canonicalEstimateStableJson } from './canonicalEstimateDeterminism';
import { ROOF_FORECAST_LOWER_LAYERS_CONDITIONS_V1, ROOF_FORECAST_SCREED25_LOWER_CONDITIONS_V1 } from './canonicalRoofForecastConditionV1';
export { ROOF_FORECAST_SCREED25_LOWER_CONDITIONS_V1 } from './canonicalRoofForecastConditionV1';

type Json = Record<string, any>;
export const ROOF_SCREED25_PACK_V1 = pack;
export const ROOF_SCREED25_OPERATION_KEY_V1 = JSON.stringify([pack.prefix, `${pack.prefix}:installation`]);
export const ROOF_SCREED25_TECHNOLOGY_UNKNOWN_V1 = 'Способ подачи раствора ещё не проверен';
export const ROOF_SCREED25_DIRECT_BASE_UNKNOWN_V1 = 'Непосредственное основание ещё не проверено';
const effectivePack = { ...pack, systemParameterId: 'roof_torch_conditions',
  systemYesRu: ROOF_FORECAST_SCREED25_LOWER_CONDITIONS_V1 };
const rates = { workers: ['1', '37.22'], included_machine_operators: ['0.03', '2.24'],
  tower_crane_8t: ['0.01', '0.78'], forklift_5t: ['0.02', '1.46'], mortar_pump: ['0', '2.36'],
  water: ['0', '3.85'], roofing_felt: ['0', '4.4'], ready_cement_mortar_m100: ['0.102', '2.55'] } as const;

/** One accepted rate definition is reused by finite application bindings. */
export function assertRoofScreed25AcceptedRatesV1() {
  if (pack.rates.length !== 8 || pack.sources[0]?.sha256 !== base.sources[0]?.sha256) {
    throw new Error('ROOF_SCREED25_SOURCE_IDENTITY_INVALID');
  }
  for (const rate of pack.rates) {
    const original = base.rates.find(r => r.role === rate.role);
    const approved = rates[rate.role as keyof typeof rates];
    if (!original || !approved || rate.resourceCode !== original.resourceCode || rate.unitId !== original.unitId
      || rate.costTreatment !== original.costTreatment || rate.machinePriceCoverageRequired !== original.machinePriceCoverageRequired
      || rate.per100m2 !== approved[1] || rate.sourceRatePer100m2 !== approved[1]
      || rate.compositeRate.baseRate !== original.per100m2 || rate.compositeRate.deltaRatePerMm !== approved[0]
      || rate.compositeRate.thicknessDifferenceMm !== '10' || rate.compositeRate.basisM2 !== '100') {
      throw new Error('ROOF_SCREED25_COMPOSITE_RATE_INVALID');
    }
  }
}

export function roofScreed25OwnerV1(catalogId: string) {
  if (!['canonical-work:base:roofing_interior_flat_roof_install_technical_room',
    'canonical-work:base:roofing_interior_flat_roof_install_wet_zone'].includes(catalogId)) {
    throw new Error('ROOF_SCREED25_CATALOG_REQUIRED');
  }
  assertRoofScreed25AcceptedRatesV1();
  const owner = sourcePinnedRoofNormOwnerR1(effectivePack as SourcePinnedRoofNormPackR1);
  const profile = { kind: 'equals', parameterId: 'roof_torch_conditions', value: ROOF_FORECAST_SCREED25_LOWER_CONDITIONS_V1 };
  return { ...owner,
    parameters: owner.parameters.filter(p => p.parameter_id !== 'roof_torch_conditions').map(p => ({ ...p, truth_metadata: { ...p.truth_metadata,
      semantic_parameter_key: `${catalogId}:${p.parameter_id}` },
      ...(p.parameter_id===pack.measurementParameterId?{constraints_json:{...p.constraints_json,exclusiveMin:0}}:{}),
      ...(p.parameter_id===pack.conditionsParameterId?{title_ru:'Какую подачу раствора предусматривает проект?',constraints_json:{...p.constraints_json,
        values:[pack.conditionsYesRu,ROOF_SCREED25_TECHNOLOGY_UNKNOWN_V1,'Нужен другой расчёт']}}:{}),
      ...(p.parameter_id===pack.areaParameterId?{title_ru:'Что находится непосредственно под стяжкой25мм?',constraints_json:{...p.constraints_json,
        values:[pack.areaYesRu,ROOF_SCREED25_DIRECT_BASE_UNKNOWN_V1]}}:{}) })),
    resources: owner.resources.map(row => {
      const rate = pack.rates.find(r => row.row_id === `${pack.prefix}:${r.role}`)!;
      return { ...row, row_type: row.category, semantic_owner: `${catalogId}:${row.row_id}`,
        cost_owner_id: `${catalogId}:${row.cost_owner_id}`,
        inclusion_ast: { kind: 'and', operands: [row.inclusion_ast, profile] },
        source_metadata: { ...row.source_metadata, compositeNormRateV1: rate.compositeRate },
        resource_graph: { ...row.resource_graph, publicResourcePresentationV1: {
          ...(row.resource_graph.publicResourcePresentationV1 as Json),
          detailsRu: [pack.scopeRu, ...rate.detailsRu] } } };
    }) };
}

/** New definition only; this does not widen execution/completion evidence. */
export function extendRoofScreed25ForecastV1(ast: unknown): unknown {
  const replace = (value: unknown): unknown => Array.isArray(value) ? value.map(replace)
    : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key, child]) =>
      [key, key === 'value' && (value as Json).parameterId === 'roof_torch_conditions'
        && child === ROOF_FORECAST_LOWER_LAYERS_CONDITIONS_V1 ? ROOF_FORECAST_SCREED25_LOWER_CONDITIONS_V1 : replace(child)])) : value;
  const transformed = replace(ast);
  return canonicalEstimateStableJson(ast) === canonicalEstimateStableJson(transformed)
    ? ast : { kind: 'or', operands: [ast, transformed] };
}

export function roofScreed25ConditionsV1(): Json {
  return { kind: 'and', operands: [sourcePinnedRoofNormGuardsR1(effectivePack as SourcePinnedRoofNormPackR1).admitted,
    { kind: 'equals', parameterId: 'roof_torch_conditions', value: ROOF_FORECAST_SCREED25_LOWER_CONDITIONS_V1 }] };
}
