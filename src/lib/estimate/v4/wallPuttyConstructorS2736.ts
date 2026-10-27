import {
  buildAutomaticConstructionOwnerR1, compileAutomaticConstructionOwnerR1,
  type AutomaticParameterSpec, type AutomaticRowSpec, type AutomaticInclusionCondition,
} from './automaticConstructionOwnerR1';
import { effectivePurchaseBalanceExpressionsR1 } from './effectivePurchaseBalanceR1';
import { interiorFinishesDomainFactory } from './domains/interiorFinishesComplete/domainPackage';
import { INTERIOR_FINISHES_DOMAIN_INVENTORY } from './domains/interiorFinishesComplete/inventory';
import {
  WALL_PUTTY_CT127_KRER15_WORK_KEY, WALL_PUTTY_CT127_KRER15_RATE_CODE,
  WALL_PUTTY_CT127_KRER15_SOURCE_ID, WALL_PUTTY_CT127_KRER15_RATES,
} from './domains/interiorFinishesComplete/wallPuttyCeresitCt127Krer15ProfessionalV1';
import { buildPaintCeresitCt54Ct17ProfessionalPackagePartsV1 } from './domains/interiorFinishesComplete/paintCeresitCt54Ct17ProfessionalV1';
import {
  CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_METADATA as CT127,
  CERESIT_CT17_PAINT_PRIMER_SOURCE_METADATA as CT17,
} from './domainFactory/professionalPhysicalNormApplicabilityV1';
import sourcePack from '../../../../data/estimate-benchmarks/source-packs/wall-putty-third-mineral-ct127-s27-36.json';
import { estimateDeterministicHash } from '../estimateDeterministicHash';

export const WALL_PUTTY_CATALOG_S2736 = 'canonical-work:base:' + WALL_PUTTY_CT127_KRER15_WORK_KEY;
export const WALL_PUTTY_CONTRACT_S2736 = 'wall-putty-third-mineral:s27-36.v1';
export const WALL_PUTTY_SOURCE_ID_S2736 = 'src_wall_putty_third_mineral_ct127_s27_36';
export const WALL_PUTTY_NORM_ID_S2736 = 'project:wall-putty:third-mineral-ct127:s27-36.v1';
const sourceHash = '4db2814f57890daf26ebd1d6cb561649919f6c14e34d79164dc179502379d517';
export const WALL_PUTTY_SOURCE_METADATA_S2736 = {
  source_title: 'Третья шпаклёвка подготовленных минеральных стен: готовая КРЕР15-04-027-05, CT127 и индивидуальные ресурсы',
  source_authority: 'КРЕР2015 №15; Henkel CT127/CT17; видимый план оснащения объекта',
  source_document_version: WALL_PUTTY_CONTRACT_S2736, definition_hash: sourceHash, artifact_sha256: sourceHash,
  exact_locator: 'КРЕР15 печатные стр.191–192, колонка15-04-027-05,100м²; CT127 C_CT127_TDS_1_0120 стр.1–2; source-packs/wall-putty-third-mineral-ct127-s27-36.json',
  use_restriction: 'Только третье нанесение и шлифование на уже подготовленной штукатурке/сборной минеральной стене под высококачественную окраску. Предварительная замена масляно-клеевой шпаклёвки таблицы на конкретную CT127 требует проектного согласования применимости труда. Не полное выравнивание, не все слои, не дерево, не потолок и не постоянно влажная зона. Расход CT127 выбран внутри0.4–1.2кг/м², не на миллиметр. Оснащение и защита — открытый предварительный план, не опубликованная норма.',
};
const inventory = INTERIOR_FINISHES_DOMAIN_INVENTORY.find(row => row.work_key === WALL_PUTTY_CT127_KRER15_WORK_KEY);
if (!inventory) throw Error('WALL_PUTTY_READY_INVENTORY_MISSING');
const technology = interiorFinishesDomainFactory.technology_by_id.get(inventory.canonical_technology_id);
const assembly = technology && interiorFinishesDomainFactory.assembly_profile_by_id.get(technology.assembly_profile_id);
if (!assembly || WALL_PUTTY_CT127_KRER15_RATE_CODE !== '15-04-027-05' || CT127.documented_bag_size_kg !== 20 ||
  sourcePack.krer.rates.worker_man_hour !== WALL_PUTTY_CT127_KRER15_RATES.construction_worker_man_hours ||
  sourcePack.ct17_optional.definition_hash !== CT17.definition_hash || sourcePack.ct17_optional.url !== CT17.source_url) throw Error('WALL_PUTTY_READY_SOURCE_DRIFT');
const readyRows = assembly.child_assemblies.flatMap(child => child.rows);
const pick = (key: string) => {
  const row = readyRows.find(item => item.row_id.endsWith(':row:' + key));
  if (!row) throw Error('WALL_PUTTY_READY_ROW_MISSING:' + key);
  return row;
};
export const WALL_PUTTY_READY_ROWS_S2736 = Object.fromEntries(
  ['primary_material', 'construction_worker_labor', 'machine_operator_labor', 'cargo_lift', 'flatbed_truck', 'sanding_sheet', 'rags'].map(key => [key, pick(key)]),
);
const paintInventory = INTERIOR_FINISHES_DOMAIN_INVENTORY.find(row => row.work_key === 'plaster_paint_interior_paint_wall_paint_standard');
if (!paintInventory) throw Error('WALL_PUTTY_PRIMER_OPERATION_MISSING');
const paintParts = buildPaintCeresitCt54Ct17ProfessionalPackagePartsV1(paintInventory);
const preparation = paintParts?.child_assemblies.flatMap(child => child.rows).find(row => row.row_id.endsWith(':row:substrate_preparation'));
if (!preparation) throw Error('WALL_PUTTY_READY_PREPARATION_MISSING');
const profile = (id: string, title: string, valueType: AutomaticParameterSpec['valueType'], unitId: string | null,
  defaultValue: string | number, extra: Partial<AutomaticParameterSpec> = {}): AutomaticParameterSpec =>
  ({ id, title, valueType, unitId, kind: 'profile', defaultValue, ...extra });
const fact = (id: string, title: string, valueType: AutomaticParameterSpec['valueType'], unitId: string | null,
  extra: Partial<AutomaticParameterSpec> = {}): AutomaticParameterSpec => ({ id, title, valueType, unitId, kind: 'conditional', ...extra });
const eq = (parameterId: string, value: string): AutomaticInclusionCondition => ({ kind: 'equals', parameterId, value });
const confirmed = eq('applicability_mode', 'CONFIRMED_PROJECT_FACTS');
const prime = eq('putty_priming_mode', 'CT17_UNDILUTED');
const systemFacts = ['prepared_mineral_wall_confirmed', 'third_coat_and_ct127_norm_replacement_confirmed',
  'dry_interior_conditions_confirmed', 'delivered_ct127_version_confirmed'] as const;
const systemInputs = ['applicability_mode', ...systemFacts];
const parameters: AutomaticParameterSpec[] = [
  { id: 'area_m2', title: 'Измеренная площадь минеральных стен для одного третьего финишного нанесения, не вся система слоёв', valueType: 'decimal', unitId: 'm2', kind: 'ordinary', min: 0.001 },
  profile('applicability_mode', 'Предварительный профиль либо подтверждённые факты объекта', 'enum', null, 'PRELIMINARY_PROFILE', { values: ['PRELIMINARY_PROFILE', 'CONFIRMED_PROJECT_FACTS'] }),
  profile('putty_scope', 'Выбран узкий этап: третье нанесение и шлифование подготовленной минеральной стены, не все слои', 'enum', null, 'THIRD_COAT_PREPARED_MINERAL_WALL', { values: ['THIRD_COAT_PREPARED_MINERAL_WALL'] }),
  profile('ct127_delivered_version', 'CT127en_GL C_CT127_TDS_1_0120: конкретная выбранная версия; поставку подтвердить', 'enum', null, 'CT127_EN_GL_0120', { values: ['CT127_EN_GL_0120'] }),
  profile('ct127_selected_rate_kg_m2', 'Предварительно0.7кг/м² в диапазоне0.4–1.2; уточнить пробным участком, это не кг/м²/мм', 'decimal', 'kg_per_m2', 0.7, { min: 0.4, max: 1.2 }),
  profile('ct127_layer_mm', 'Предварительно1мм отдельного слоя; не множитель выбранного расхода', 'decimal', 'mm', 1, { min: 0.001, max: 2 }),
  profile('ct127_pack_kg', 'CT127: мешок20кг выбранной версии', 'decimal', 'kg', 20, { min: 20, max: 20 }),
  profile('ct127_additional_full_batches', 'Дополнительные полные замесы CT127 сверх минимальных: предварительно0; мокрый остаток отдельно', 'integer', 'piece', 0, { min: 0 }),
  profile('putty_priming_mode', 'Для третьего нанесения основание предварительно уже подготовлено и загрунтовано; новое CT17 выбрать отдельно', 'enum', null, 'ALREADY_PRIMED', { values: ['ALREADY_PRIMED', 'CT17_UNDILUTED'] }),
  profile('ct17_rate_l_m2', 'Для нового CT17PROFIen_GL03.24 предварительно0.2л/м² продукта; не концентрат и не разведённый раствор', 'decimal', 'l_per_m2', 0.2, { min: CT17.rate_range_l_m2[0], max: CT17.rate_range_l_m2[1] }),
  profile('ct17_pack_l', 'CT17PROFIen_GL03.24: предварительно5л', 'enum', 'l', '5', { values: CT17.documented_container_sizes_l.map(String) }),
  fact('primer_productivity_m2_per_man_hour', 'Производительность дополнительного грунтования по применимой карте; не входит в третье шпаклевание', 'decimal', 'm2_per_man_hour', { requiredWhen: prime, min: 0.000001 }),
  fact('primer_compatibility_drying_reference', 'Подтверждённый CT17, совместимость и полное высыхание до CT127', 'text', null, { requiredWhen: prime }),
  profile('cleaning_water_l_m2', 'Вода мойки инструмента: видимый предварительный план0.1л/м², не норма производителя', 'decimal', 'l_per_m2', 0.1, { min: 0 }),
  profile('water_quantum_l', 'Единая поставка чистой воды: предварительно5л', 'decimal', 'l', 5, { min: 0.000001 }),
  profile('abrasive_order_m2', 'Кратность шкурки в м²: предварительно1м²; подобрать совместимый фактический абразив, не угадывать число листов', 'decimal', 'm2', 1, { min: 0.000001 }),
  profile('rags_order_kg', 'Кратность ветоши: предварительно1кг', 'decimal', 'kg', 1, { min: 0.000001 }),
  ...systemFacts.map(id => fact(id, ({
    prepared_mineral_wall_confirmed: 'Прочность, сухость, чистота, подготовленная штукатурка/сборная минеральная стена подтверждены',
    third_coat_and_ct127_norm_replacement_confirmed: 'Подтверждены именно третье нанесение и применимость труда/машин КРЕР при замене масляно-клеевой шпаклёвки на CT127',
    dry_interior_conditions_confirmed: 'Сухое внутреннее помещение без постоянной влажности, температура5–30°C и условия основания проверены',
    delivered_ct127_version_confirmed: 'Поставленная CT127 соответствует выбранному паспорту и фасовке',
  })[id], 'enum', null, { requiredWhen: confirmed, values: ['YES'] })),
];
const rows: AutomaticRowSpec[] = [
  { rowId: 'scope:wall-putty:area', formulaId: 'wall_putty_area_v1', section: 'Объём и применимость', category: 'service', title: 'Площадь третьего финишного нанесения на подготовленные минеральные стены', unitId: 'm2', expression: 'area_m2', costTreatment: 'INFORMATIONAL_SCOPE', titleParameterIds: ['putty_scope'] },
  { rowId: 'scope:wall-putty:net', formulaId: 'wall_putty_net_v1', section: 'CT127: чистое укладываемое количество', category: 'service', title: 'CT127: выбранный расход на площадь одного этапа, до замеса и фасовки', unitId: 'kg', expression: 'area_m2*ct127_selected_rate_kg_m2', costTreatment: 'INFORMATIONAL_SCOPE', effectiveQuantityOutput: { parameterId: 'putty_net_quantity_kg', unitId: 'kg' }, titleParameterIds: ['ct127_layer_mm', 'ct127_delivered_version'] },
  { rowId: 'scope:wall-putty:mixed', formulaId: 'wall_putty_mixed_v1', section: 'Выбранный способ замеса', category: 'service', title: 'CT127: предварительно полные замесы20кг, минимум по чистой потребности; не количество нового заказа', unitId: 'kg', expression: '(ceil(putty_net_quantity_kg/ct127_pack_kg)+ct127_additional_full_batches)*ct127_pack_kg', costTreatment: 'INFORMATIONAL_SCOPE', effectiveQuantityOutput: { parameterId: 'putty_mixed_powder_kg', unitId: 'kg' } },
  { rowId: 'scope:wall-putty:wet-surplus', formulaId: 'wall_putty_wet_surplus_v1', section: 'Остаток замеса', category: 'service', title: 'CT127: сухой эквивалент в мокром остатке; до24ч в закрытой ёмкости по паспорту, не сухое наличие/резерв', unitId: 'kg', expression: 'putty_mixed_powder_kg-putty_net_quantity_kg', costTreatment: 'INFORMATIONAL_SCOPE' },
];
const provenance = new Map<string, ReturnType<typeof pick>>();
function supply(key: string, title: string, unitId: string, consumed: string, quantum: string, extra: Partial<AutomaticRowSpec> = {}) {
  const rowId = 'material:wall-putty:' + key, prefix = 'wall_putty_' + key.replaceAll('-', '_');
  parameters.push(profile(prefix + '_stock', title + ': предварительно0 пригодного наличия', 'decimal', unitId, 0, { min: 0 }),
    profile(prefix + '_reserve', title + ': предварительно0 сохраняемого резерва', 'decimal', unitId, 0, { min: 0 }));
  rows.push({ rowId, formulaId: prefix + '_order_v1', section: 'Материалы и оснащение', category: 'material', title, unitId,
    expression: `ceil(max(0,(${consumed})+${prefix}_reserve-${prefix}_stock)/(${quantum}))*(${quantum})`, procurement: true,
    ...effectivePurchaseBalanceExpressionsR1({ ownerRowId: rowId, orderUnitId: unitId, consumed, stock: prefix + '_stock', reserve: prefix + '_reserve', quantum }).owner,
    inputParameterIds: systemInputs, ...extra });
}
supply('ct127', 'CT127en_GL: сухой порошок для выбранных полных замесов; отдельно от мокрого остатка', 'kg', 'putty_mixed_powder_kg', 'ct127_pack_kg', { titleParameterIds: ['ct127_delivered_version'] });
provenance.set('material:wall-putty:ct127', pick('primary_material'));
supply('water', 'Чистая прохладная вода: CT1278л/20кг реально замешанного порошка и мойка, один заказ', 'l', 'putty_mixed_powder_kg*8/20+area_m2*cleaning_water_l_m2', 'water_quantum_l');
for (const [key, expression, title] of [
  ['mixing', 'putty_mixed_powder_kg*8/20', 'Вода замеса CT127: не от заказа/сухого резерва'],
  ['cleaning', 'area_m2*cleaning_water_l_m2', 'Вода мойки: открытый предварительный план'],
] as const) rows.push({ rowId: 'allocation:wall-putty:water:' + key, formulaId: 'wall_putty_water_' + key + '_v1', section: 'Распределение общей воды', category: 'material', title, unitId: 'l', expression, costTreatment: 'INCLUDED_IN_RESOURCE_ROWS', procurement: false, purchaseBalanceOwnerRowId: 'material:wall-putty:water' });
for (const [key, quantum] of [['sanding_sheet', 'abrasive_order_m2'], ['rags', 'rags_order_kg']] as const) {
  const source = pick(key);
  supply(key.replaceAll('_', '-'), source.title_ru + ': точное количество КРЕР15-04-027-05 и выбранная кратность', source.formula.output_unit_id, source.formula.expression, quantum);
  provenance.set('material:wall-putty:' + key.replaceAll('_', '-'), source);
}
for (const key of ['construction_worker_labor', 'machine_operator_labor', 'cargo_lift', 'flatbed_truck']) {
  const source = pick(key), rowId = 'wall-putty:ready:' + key;
  rows.push({ rowId, formulaId: 'wall_putty_ready_' + key + '_v1', section: source.section, category: source.category,
    title: source.title_ru, unitId: source.formula.output_unit_id, expression: source.formula.expression,
    ...(key === 'machine_operator_labor' ? { costTreatment: 'INCLUDED_IN_RESOURCE_ROWS' as const } : {}),
    inputParameterIds: systemInputs });
  provenance.set(rowId, source);
}
supply('ct17', 'CT17PROFIen_GL03.24: новое совместимое грунтование только при выбранной необходимости', 'l', 'area_m2*ct17_rate_l_m2', 'ct17_pack_l', { inclusion: prime, inputParameterIds: [...systemInputs, 'primer_compatibility_drying_reference'] });
rows.push({ rowId: 'labor:wall-putty:new-primer', formulaId: 'wall_putty_new_primer_labor_v1', section: 'Дополнительное грунтование', category: 'labor', title: 'Новое грунтование CT17: отдельная применимая операция перед третьей шпаклёвкой', unitId: 'man_hour',
  expression: preparation.formula.expression.replaceAll('substrate_preparation_productivity_m2_per_man_hour', 'primer_productivity_m2_per_man_hour'), inclusion: prime, inputParameterIds: ['primer_compatibility_drying_reference'] });
provenance.set('labor:wall-putty:new-primer', preparation);
const tools = [
  ['mixing-drill', 'Дрель перемешивания; оснащение, оператор в труде нанесения, не дополнительная аренда', 'piece', 1],
  ['mixing-paddle', 'Совместимая мешалка CT127', 'piece', 1], ['mixing-bucket', 'Чистая ёмкость с крышкой для замеса и допустимого хранения', 'piece', 2],
  ['water-measure', 'Мерная ёмкость точного дозирования воды', 'piece', 1], ['metal-float', 'Металлическая гладилка нанесения CT127', 'piece', 1],
  ['wide-stainless-float', 'Широкая нержавеющая гладилка финишного разглаживания', 'piece', 1], ['detail-spatula', 'Узкий шпатель примыканий выбранного этапа', 'piece', 1],
  ['manual-sanding-holder', 'Держатель ручного шлифования; выбран ручной способ, без автоматической аренды шлифмашины', 'piece', 1],
  ['dust-brush', 'Щётка обеспыливания после шлифования', 'piece', 1], ['masking-tape', 'Защитная лента: предварительно0.5м/м², заменить обмером примыканий', 'm', 0.5],
  ['protection-film', 'Защитная плёнка: предварительно0.3м²/м², заменить обмером защищаемых поверхностей', 'm2', 0.3],
  ['gloves', 'Перчатки для цементного состава, пары', 'pair', 2], ['eye-protection', 'Защитные очки', 'piece', 1],
  ['dust-mask', 'Респиратор для применимого ручного шлифования; тип подобрать по условиям', 'piece', 2], ['waste-bags', 'Мешки упаковки и отходов', 'piece', 2],
] as const;
for (const [key, title, unit, value] of tools) {
  const id = 'wall_putty_tool_' + key.replaceAll('-', '_') + '_required';
  parameters.push(profile(id, title + ': открытое предварительное оснащение, не норматив расхода', 'decimal', unit, value, { min: 0 }));
  supply('tool-' + key, title, unit, key === 'masking-tape' || key === 'protection-film' ? 'area_m2*' + id : id, key === 'masking-tape' ? '25' : '1');
}
const built = buildAutomaticConstructionOwnerR1({ contract: WALL_PUTTY_CONTRACT_S2736, semanticOwner: 'wall-putty-third-mineral', sourceId: WALL_PUTTY_SOURCE_ID_S2736, normId: WALL_PUTTY_NORM_ID_S2736,
  sourceMetadata: WALL_PUTTY_SOURCE_METADATA_S2736, applicabilityRu: WALL_PUTTY_SOURCE_METADATA_S2736.use_restriction,
  ordinary: parameters.filter(p => p.kind === 'ordinary'), profile: parameters.filter(p => p.kind === 'profile'), conditional: parameters.filter(p => p.kind === 'conditional'), rows, deferMissingProjectFactsToRows: true,
  excludedUnownedAssumptions: ['полное выравнивание и все предыдущие слои', 'деревянное основание/потолок/постоянная влажность', 'автоматическое согласование замены нормативного материала', 'неизвестные цены', 'мокрый остаток как сухое наличие', 'двойная оплата машиниста'] });
export const WALL_PUTTY_DEFINITION_S2736 = Object.freeze({ ...built,
  parameters: built.parameters.map(parameter => ({ ...parameter, truth_metadata: { ...parameter.truth_metadata,
    guide: { ...(parameter.truth_metadata.guide as Record<string, unknown>), verified_at: '2026-10-05T00:00:00+06:00' } } })),
  resources: built.resources.map(row => {
    const source = provenance.get(row.row_id);
    const primerTrace = row.row_id === 'material:wall-putty:ct17' ? [{
      sourceId: CT17.source_id, source_id: CT17.source_id, normId: CT17.norm_id, norm_id: CT17.norm_id,
      normVersion: CT17.source_document_version, source_title: CT17.source_title, source_url: CT17.source_url,
      tds_identifier: CT17.tds_identifier, exact_locator: CT17.exact_locator, source_definition_hash: CT17.definition_hash,
      sourceRole: 'MATERIAL_PASSPORT_SELECTED_PROJECT_RATE_REQUIRES_CT127_COMPATIBILITY',
    }] : [];
    const resource = { ...row, source_metadata: { ...row.source_metadata,
      normativeTrace: [...(row.source_metadata?.normativeTrace as unknown[] ?? []), ...primerTrace],
      engineeringApprovalClaimed: false, normReplacementApprovalRequired: true,
      reusedOperation: source ? { sourceRowId: source.row_id, sourceFormulaId: source.formula.formula_id, sourceIds: source.normative_source_ids, sourceVersion: keyVersion(source.row_id), expression: source.formula.expression } : null },
      resource_graph: { ...row.resource_graph, operationCompositionV1: { contractVersion: 'canonical-operation-resource/v1', groupId: 'wall-putty-third-mineral', groupTitleRu: 'Третья шпаклёвка подготовленных минеральных стен',
        operationId: row.row_id.includes('primer') || row.row_id.endsWith('ct17') ? 'new-priming' : row.row_id.includes('water') ? 'shared-water' : 'third-putty-and-sanding',
        operationTitleRu: 'Готовая применимая операция и её раскрытые ресурсы', completionCriterionRu: 'Подтвердить подготовленное минеральное основание, третье нанесение, замену материала и условия; предыдущие слои отдельно' },
        ...(row.row_id.startsWith('allocation:') ? { includedInResourceOwnerRowId: 'material:wall-putty:water', purchaseConsumptionAllocationV1: { contractVersion: 'canonical-purchase-consumption-allocation/v1', ownerRowId: 'material:wall-putty:water' } } : {}) } };
    return { ...resource, row_sha256: estimateDeterministicHash({ ...resource, row_sha256: '' }) };
  }),
});
function keyVersion(rowId: string): string { return rowId.includes('substrate_preparation') ? 'ceresit-ct54-ct17-professional-v1' : 'ct127-krer15-04-027-05:v3'; }
export function compileWallPuttyConstructorS2736(submittedParameters: Record<string, unknown>) {
  return compileAutomaticConstructionOwnerR1({ compilerVersion: WALL_PUTTY_CONTRACT_S2736, catalogId: WALL_PUTTY_CATALOG_S2736,
    primaryMeasureParameterId: 'area_m2', definition: WALL_PUTTY_DEFINITION_S2736, submittedParameters });
}
