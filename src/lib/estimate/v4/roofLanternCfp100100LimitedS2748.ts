import pack from '../../../../data/estimate-benchmarks/source-packs/roof-lantern-cfp100100-limited-s27-48.json';
import { buildAutomaticConstructionOwnerR1, type AutomaticParameterSpec, type AutomaticRowSpec } from './automaticConstructionOwnerR1';
import { compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreInput, type CanonicalEstimateParameterDefinition } from '../backendPlatform/canonicalEstimateCompileCore';
import { estimateDeterministicHash } from '../estimateDeterministicHash';
import { effectivePurchaseBalanceExpressionsR1 } from './effectivePurchaseBalanceR1';

export const sourcePack = pack;
const prefix = 'roof-cfp100100';
const productId = 'lantern_model';
const countId = 'lantern_count';
const facts: Record<string, { value: number; unitId: string; title: string }> = {
  daylight_area_per_unit: { value: pack.productFacts.effectiveDaylightAreaM2, unitId: 'm2', title: 'Эффективная световая площадь одного фонаря' },
  base_net_mass_kg: { value: pack.productFacts.baseNetMassKg, unitId: 'kg', title: 'Масса основания без упаковки' },
  dome_net_mass_kg: { value: pack.productFacts.domeNetMassKg, unitId: 'kg', title: 'Масса купола без упаковки' },
  nominal_opening_width_mm: { value: pack.productFacts.roofOpeningNominalWidthMm, unitId: 'mm', title: 'Номинальная ширина проёма выбранного изделия' },
  nominal_opening_height_mm: { value: pack.productFacts.roofOpeningNominalHeightMm, unitId: 'mm', title: 'Номинальная длина проёма выбранного изделия' },
};
const unresolved: AutomaticParameterSpec[] = [
  { id: 'mounting_fixings_per_unit', title: 'Применимая норма крепежа — уточняет приложение', unitId: 'item' },
  { id: 'flashing_consumption_m2_per_unit', title: 'Норма гидроизоляционного примыкания — уточняет приложение', unitId: 'm2' },
  { id: 'installation_hours_per_unit', title: 'Норма труда монтажа — уточняет приложение', unitId: 'man_hour' },
  { id: 'lifting_shifts', title: 'Техника подъёма — уточняет приложение', unitId: 'shift' },
  { id: 'delivery_trips', title: 'Условия доставки — уточняет приложение', unitId: 'trip' },
  { id: 'inspection_hours_per_unit', title: 'Норма проверки монтажа — уточняет приложение', unitId: 'man_hour' },
  { id: 'vapour_connection_sets_per_unit', title: 'Комплект пароизоляционного примыкания — уточняет приложение', unitId: 'item' },
  { id: 'thermal_connection_m3_per_unit', title: 'Утепление примыкания — уточняет приложение', unitId: 'm3' },
  { id: 'extension_frames_per_unit', title: 'Доборные основания — уточняет приложение', unitId: 'item' },
  { id: 'membrane_termination_sets_per_unit', title: 'Завершение гидроизоляционного примыкания — уточняет приложение', unitId: 'item' },
  { id: 'protective_film_removal_hours', title: 'Снятие защитной плёнки и включение в труд монтажа — уточняет приложение', unitId: 'man_hour' },
  { id: 'final_cleanup_hours', title: 'Финальная уборка и сбор упаковки — уточняет приложение', unitId: 'man_hour' },
  { id: 'packaging_waste_service_kg', title: 'Партия отходов упаковки и полный состав вывоза — уточняет приложение', unitId: 'kg' },
].map(p => ({ ...p, valueType: 'decimal', kind: 'conditional', min: 0 }));
const inventory: AutomaticParameterSpec[] = ['base', 'dome'].flatMap(key => [
  { id: `${key}_stock_units`, title: `Доступно на объекте: ${key === 'base' ? 'основания CFP' : 'купола ISD'}`, valueType: 'integer' as const, unitId: 'item', kind: 'conditional' as const, min: 0 },
  { id: `${key}_reserve_units`, title: `Сохранить в запасе: ${key === 'base' ? 'основания CFP' : 'купола ISD'}`, valueType: 'integer' as const, unitId: 'item', kind: 'conditional' as const, min: 0 },
]);
const productRow = (key: string, title: string): Omit<AutomaticRowSpec, 'section' | 'formulaId'> => ({
  rowId: `${prefix}:${key}`, title, unitId: 'item',
  expression: `max(0,${countId}+${key}_reserve_units-${key}_stock_units)`,
  procurement: true, category: 'material',
  ...effectivePurchaseBalanceExpressionsR1({ownerRowId:`${prefix}:${key}`,orderUnitId:'item',consumed:countId,stock:`${key}_stock_units`,reserve:`${key}_reserve_units`,quantum:'1'}).owner,
});
const specs: AutomaticRowSpec[] = [
  productRow('base', 'Основание VELUX CFP Q 73FQV 100100 со стеклопакетом'),
  productRow('dome', 'Прозрачный купол VELUX ISD 100100 0010'),
  { rowId: `${prefix}:included-glazing`, title: 'Стеклопакет в составе основания CFP — включён', unitId: 'item', expression: countId, procurement: false, costTreatment: 'INCLUDED_IN_RESOURCE_ROWS', purchaseBalanceOwnerRowId: `${prefix}:base`, category: 'material' },
  { rowId: `${prefix}:included-dome-fastening`, title: 'Встроенные узлы крепления купола ISD — включены в купол', unitId: 'item', expression: countId, procurement: false, costTreatment: 'INCLUDED_IN_RESOURCE_ROWS', purchaseBalanceOwnerRowId: `${prefix}:dome`, category: 'material' },
  { rowId: `${prefix}:daylight`, title: 'Эффективная световая площадь — справочно', unitId: 'm2', expression: `${countId}*daylight_area_per_unit`, procurement: false, costTreatment: 'INFORMATIONAL_SCOPE', category: 'material' },
  { rowId: `${prefix}:product-net-mass`, title: 'Масса оснований и куполов без упаковки — справочно', unitId: 'kg', expression: `${countId}*(base_net_mass_kg+dome_net_mass_kg)`, procurement: false, costTreatment: 'INFORMATIONAL_SCOPE', category: 'material' },
  { rowId: `${prefix}:fixings`, title: 'Крепление основания к несущему основанию — норма не подтверждена', unitId: 'item', expression: `${countId}*mounting_fixings_per_unit`, procurement: true, category: 'material' },
  { rowId: `${prefix}:flashing`, title: 'Гидроизоляция примыкания — расход не подтверждён', unitId: 'm2', expression: `${countId}*flashing_consumption_m2_per_unit`, procurement: true, category: 'material' },
  { rowId: `${prefix}:vapour-connection`, title: 'Пароизоляционное примыкание — комплект и включение в отделку не подтверждены', unitId: 'item', expression: `${countId}*vapour_connection_sets_per_unit`, procurement: true, category: 'material' },
  { rowId: `${prefix}:thermal-connection`, title: 'Непрерывность утепления примыкания — материал и объём не подтверждены', unitId: 'm3', expression: `${countId}*thermal_connection_m3_per_unit`, procurement: true, category: 'material' },
  { rowId: `${prefix}:extension`, title: 'Доборное основание — необходимость и исполнение не подтверждены', unitId: 'item', expression: `${countId}*extension_frames_per_unit`, procurement: true, category: 'material' },
  { rowId: `${prefix}:membrane-termination`, title: 'Завершение мембранного примыкания — применимый комплект не подтверждён', unitId: 'item', expression: `${countId}*membrane_termination_sets_per_unit`, procurement: true, category: 'material' },
  { rowId: `${prefix}:installation`, title: 'Монтаж основания и купола — трудозатраты не подтверждены', unitId: 'man_hour', expression: `${countId}*installation_hours_per_unit`, procurement: false, category: 'labor' },
  { rowId: `${prefix}:lifting`, title: 'Подъём и доступ — схема не подтверждена', unitId: 'shift', expression: 'lifting_shifts', procurement: false, category: 'equipment' },
  { rowId: `${prefix}:delivery`, title: 'Доставка фонарей — условия не подтверждены', unitId: 'trip', expression: 'delivery_trips', procurement: false, category: 'service' },
  { rowId: `${prefix}:inspection`, title: 'Проверка монтажа — трудозатраты не подтверждены', unitId: 'man_hour', expression: `${countId}*inspection_hours_per_unit`, procurement: false, category: 'labor' },
  { rowId: prefix + ':opening-width', title: 'Номинальная ширина проёма для одного фонаря — справочно', unitId: 'mm', expression: 'nominal_opening_width_mm', procurement: false, costTreatment: 'INFORMATIONAL_SCOPE', category: 'material' },
  { rowId: prefix + ':opening-height', title: 'Номинальная длина проёма для одного фонаря — справочно', unitId: 'mm', expression: 'nominal_opening_height_mm', procurement: false, costTreatment: 'INFORMATIONAL_SCOPE', category: 'material' },
  { rowId: prefix + ':protective-film', title: 'Снятие защитной плёнки — включение в монтаж и труд не подтверждены', unitId: 'man_hour', expression: 'protective_film_removal_hours', procurement: false, category: 'labor' },
  { rowId: prefix + ':final-cleanup', title: 'Финальная уборка и сбор упаковки — граница и труд не подтверждены', unitId: 'man_hour', expression: 'final_cleanup_hours', procurement: false, category: 'labor' },
  { rowId: prefix + ':packaging-waste', title: 'Упаковка: сбор, погрузка, вывоз и приём — партия и состав услуги не подтверждены', unitId: 'kg', expression: 'packaging_waste_service_kg', procurement: false, category: 'service' },
].map((row, ordinal) => ({ ...row, section: row.category === 'material' ? 'Материалы и состав фонаря' : 'Монтаж и необходимые услуги', formulaId: `${prefix}:formula:${ordinal}`, inputParameterIds: [productId],
  inclusion: { kind: 'equals' as const, parameterId: productId, value: pack.model } }));
const built = buildAutomaticConstructionOwnerR1({
  contract: pack.contract, semanticOwner: prefix, sourceId: pack.sourceId, normId: 'PRODUCT_SELECTION_ONLY_NO_INSTALLATION_NORM',
  sourceMetadata: { source_title: pack.model, source_document_version: '2026-09', definition_hash: estimateDeterministicHash(pack), artifact_sha256: pack.sources[0].artifactSha256, exact_locator: pack.sources.map(s => s.exactLocator).join(' | ') },
  applicabilityRu: pack.scopeRu,
  ordinary: [{ id: countId, title: 'Количество одинаковых фонарей', valueType: 'integer', unitId: 'item', kind: 'ordinary', min: 1 }],
  profile: [], conditional: [
    { id: productId, title: 'Выбранная модель фонаря', valueType: 'enum', unitId: null, kind: 'conditional', values: [pack.model] },
    ...Object.entries(facts).map(([id, f]): AutomaticParameterSpec => ({ id, title: f.title, valueType: 'decimal', unitId: f.unitId, kind: 'conditional', min: 0 })),
    ...unresolved, ...inventory,
  ], rows: specs, excludedUnownedAssumptions: pack.acceptanceRestrictions, deferMissingProjectFactsToRows: true,
});
export const parameterDefinitions: CanonicalEstimateParameterDefinition[] = built.parameters.map(p => {
  const f = facts[p.parameter_id];
  if (p.truth_metadata.effective_resource_quantity_v1 != null) return p;
  const source = pack.sources[p.parameter_id === 'dome_net_mass_kg' ? 1 : p.parameter_id.startsWith('nominal_opening_') ? 2 : 0];
  const guide = { ...(p.truth_metadata.guide as Record<string, unknown>), verified_at: '2026-10-09T04:48:46Z' };
  p = { ...p, truth_metadata: { ...p.truth_metadata, guide } };
  if (f) return { ...p, truth_metadata: { ...p.truth_metadata,
    visibility_role: 'USER_DERIVED_READONLY', value_source_role: 'BACKEND_DERIVED',
    provenance: { consumer_input_role_v1: 'APPLICATION_TECHNICAL' }, catalogue_owned_lookup_v1: true,
    guide: { ...guide, guide_kind: 'DERIVED_VALUE_RULE', source_role: 'PRIMARY_MANUFACTURER_DOCUMENT',
      source_document: source.sourceId, source_locator: source.exactLocator, source_snapshot_hash: source.artifactSha256,
      guide_short_ru: 'Паспортное значение выбранного изделия; приложение получает его из документа изготовителя.' },
    runtime_profile_classification: 'CATALOGUE_SOURCE_SELECTION', derived_from: [productId],
    derived_exact_lookup_v1: { version: 'canonical-derived-exact-lookup:v1', interpolation: 'FORBIDDEN', inputParameterIds: [productId], rows: [{ inputValues: [pack.model], outputValue: f.value }] },
  } };
  if (Object.hasOwn(pack.unresolvedApplicationParameters, p.parameter_id)) return { ...p, truth_metadata: { ...p.truth_metadata,
    visibility_role: 'INTERNAL_ONLY', value_source_role: 'UNRESOLVED_APPLICATION_NORM',
    provenance: { consumer_input_role_v1: 'APPLICATION_TECHNICAL' }, source_confirmation_required: true,
    guide: { ...guide, guide_kind: 'PROJECT_DEFINED', source_role: 'UNRESOLVED_APPLICATION_REQUIREMENT',
      guide_short_ru: 'Потребность сохранена. Приложению требуется применимый источник или подтверждённая схема; числовую норму пользователь не назначает.' },
    unresolved_norm_reason: pack.unresolvedApplicationParameters[p.parameter_id as keyof typeof pack.unresolvedApplicationParameters],
  } };
  return { ...p, truth_metadata: { ...p.truth_metadata, provenance: { consumer_input_role_v1: 'OBJECT_FACT' } } };
});
export const formulaDefinitions = built.formulas;
export const resourceDefinitions = built.resources.map(r => ({ ...r, source_metadata: { ...r.source_metadata,
  limited_product_composition: true, technical_acceptance: 'NOT_ACCEPTED',
  normativeTrace: Object.keys(pack.unresolvedApplicationParameters).some(id => formulaDefinitions.find(f => f.formula_id === r.formula_id)?.input_parameter_ids.includes(id)) ? [] : r.source_metadata.normativeTrace,
  sourceRole: Object.keys(pack.unresolvedApplicationParameters).some(id => formulaDefinitions.find(f => f.formula_id === r.formula_id)?.input_parameter_ids.includes(id))
    ? 'UNRESOLVED_INSTALLATION_SOURCE' : 'PRIMARY_MANUFACTURER_PRODUCT_FACT',
} }));
export async function compileCandidate(submittedParameters: Record<string, unknown>, rowOverrides?: CanonicalEstimateCompileCoreInput['rowOverrides']) {
  return compileCanonicalEstimateCore({ operation: rowOverrides ? 'recalculate' : 'compile', compilerVersion: pack.contract,
    catalogId: pack.catalogId, primaryMeasureParameterId: countId, parameterDefinitions, formulaDefinitions: [...formulaDefinitions], resourceDefinitions,
    submittedParameters, confirmedParameters: {}, currencyCode: 'KGS', priceItems: [], rowOverrides,
    maximumResourceRows: resourceDefinitions.length, hashJson: value => estimateDeterministicHash(value),
  });
}
