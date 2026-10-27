import pack from '../../../../data/estimate-benchmarks/source-packs/sikagrout212-kz-pump-bases-s27-63.json';
import { buildAutomaticConstructionOwnerR1, type AutomaticInclusionCondition, type AutomaticParameterSpec, type AutomaticRowSpec } from './automaticConstructionOwnerR1';
import { effectivePurchaseBalanceExpressionsR1 } from './effectivePurchaseBalanceR1';
import { estimateDeterministicHash } from '../estimateDeterministicHash';

export const pumpGroutMaterialPackS2763 = pack;
export const pumpGroutMaterialPrefixS2763 = 'pump-grout-sikagrout212-kz';
export const pumpGroutMaterialChoicesS2763 = [pack.selectedProductRu, pack.legacyProductRu] as const;
export const pumpGroutSelectedConditionS2763: AutomaticInclusionCondition = {
  kind: 'equals', parameterId: 'grout_material_choice', value: pack.selectedProductRu,
};
export const pumpGroutLegacyConditionS2763: AutomaticInclusionCondition = {
  kind: 'equals', parameterId: 'grout_material_choice', value: pack.legacyProductRu,
};
const prefix = pumpGroutMaterialPrefixS2763;
const selected = pumpGroutSelectedConditionS2763;
const source = pack.source;
const title = 'Безусадочная цементная сухая смесь для подливки оборудования, мешок 25 кг, слой 10–75 мм';
const nominal = 'grout_actual_total_volume_m3*2000';

/** One source-owned material operation. Object geometry and stock have no
 * defaults; the manufacturer coefficient and bag mass are not user questions. */
export function pumpGroutMaterialDefinitionS2763() {
  if (source.sha256 !== '6a3bc57749dfb2dc7aabcc63d3d18c70bce54522f38f8629e95ba54859459d76'
    || source.normalizedDryKgPerM3 !== 2000 || source.bagKg !== 25
    || source.layerMinMm !== 10 || source.layerMaxMm !== 75) throw Error('PUMP_GROUT_EXACT_SOURCE_REQUIRED');
  const ordinary: AutomaticParameterSpec[] = [
    { id: 'grout_material_choice', title: 'Смесь для подливки оборудования', valueType: 'enum', kind: 'ordinary', unitId: null, values: pumpGroutMaterialChoicesS2763 },
    { id: 'grout_actual_total_volume_m3', title: 'Общий объём подливки', valueType: 'decimal', kind: 'ordinary', unitId: 'm3', min: 0.000001, requiredWhen: selected },
    { id: 'grout_actual_layer_min_mm', title: 'Минимальная толщина подливки', valueType: 'decimal', kind: 'ordinary', unitId: 'mm', min: 10, max: 75, requiredWhen: selected },
    { id: 'grout_actual_layer_max_mm', title: 'Максимальная толщина подливки', valueType: 'decimal', kind: 'ordinary', unitId: 'mm', min: 10, max: 75,
      numericPeerConstraints: { greaterThanOrEqualParameter: 'grout_actual_layer_min_mm' }, requiredWhen: selected },
  ];
  const conditional: AutomaticParameterSpec[] = [
    { id: 'grout_compatible_stock_kg', title: 'Пригодная смесь в наличии', valueType: 'decimal', kind: 'conditional', unitId: 'kg', min: 0, requiredWhen: selected },
    { id: 'grout_retained_reserve_kg', title: 'Запас смеси после подливки', valueType: 'decimal', kind: 'conditional', unitId: 'kg', min: 0, requiredWhen: selected },
  ];
  const physicalInputs = ['grout_actual_layer_min_mm', 'grout_actual_layer_max_mm'];
  const balance = effectivePurchaseBalanceExpressionsR1({ ownerRowId: prefix + ':order', orderUnitId: 'kg', consumed: nominal,
    stock: 'grout_compatible_stock_kg', reserve: 'grout_retained_reserve_kg', quantum: '25' });
  const rows: AutomaticRowSpec[] = [];
  const add = (id: string, name: string, unitId: string, expression: string, extra: Partial<AutomaticRowSpec> = {}) => rows.push({
    rowId: prefix + ':' + id, formulaId: prefix + ':formula:' + id, section: 'Подливка основания оборудования',
    category: 'material', title: name, unitId, expression, procurement: false, costTreatment: 'INFORMATIONAL_SCOPE',
    inclusion: selected, inputParameterIds: physicalInputs, ...extra,
  });
  add('volume', 'Фактический общий объём подливки основания', 'm3', 'grout_actual_total_volume_m3');
  add('consumed', 'Приблизительная потребность — ' + title, 'kg', nominal, { purchaseBalanceOwnerRowId: prefix + ':order' });
  add('order', title, 'kg', 'ceil(max(0,' + nominal + '+grout_retained_reserve_kg-grout_compatible_stock_kg)/25)*25',
    { ...balance.owner, procurement: true, costTreatment: 'OWN_COST' });
  add('bags', 'Мешки смеси к покупке, по 25 кг', 'pcs', balance.packages, { purchaseBalanceOwnerRowId: prefix + ':order' });
  add('remaining', 'Приблизительный остаток смеси после подливки', 'kg', balance.remaining, { purchaseBalanceOwnerRowId: prefix + ':order' });
  add('free', 'Приблизительный остаток сверх сохраняемого запаса', 'kg', balance.free, { purchaseBalanceOwnerRowId: prefix + ':order' });
  for (const [id, name, expression] of [
    ['shortage', 'Непокрытая потребность смеси для подливки', balance.consumptionShortage],
    ['reserve-deficit', 'Непокрытый запас смеси после подливки', balance.reserveDeficit],
  ] as const) add(id, name, 'kg', expression, { purchaseBalanceOwnerRowId: prefix + ':order',
    inclusion: { kind: 'and', operands: [selected, { kind: 'formula_greater_than', expression, unitId: 'kg', value: 0 }] } });
  const definition = buildAutomaticConstructionOwnerR1({ contract: pack.contract, semanticOwner: prefix, sourceId: pack.sourceId, normId: pack.normId,
    sourceMetadata: { source_title: source.titleRu, source_document_version: source.edition, definition_hash: source.sha256,
      artifact_sha256: source.sha256, exact_locator: source.locatorRu }, applicabilityRu: pack.scopeRu,
    ordinary, profile: [], conditional, rows, deferMissingProjectFactsToRows: true, excludedUnownedAssumptions: pack.exclusionsRu });
  const guides: Record<string, string> = {
    grout_material_choice: 'Выберите фактически предусмотренный состав. Для SikaGrout-212 применяется именно казахстанский паспорт 26.05.2017; состав должен быть пригоден для вашего узла оборудования.',
    grout_actual_total_volume_m3: 'Суммарный объём заполняемых полостей под всеми основаниями этой работы, без объёма металла и других вытеснений. Не умножайте общий объём ещё раз на число насосов.',
    grout_actual_layer_min_mm: 'Наименьшая фактическая толщина слоя во всех учитываемых полостях. Допустимо 10–75 мм. При одинаковой толщине укажите её в обоих полях.',
    grout_actual_layer_max_mm: 'Наибольшая фактическая толщина слоя. Допустимо 10–75 мм; она не может быть меньше минимальной. Значение 100 мм для этой смеси недопустимо.',
    grout_compatible_stock_kg: 'Масса пригодной сухой смеси точно выбранного исполнения, которую можно использовать на этой работе. Если наличие неизвестно, оставьте поле пустым; расход всё равно рассчитывается.',
    grout_retained_reserve_kg: 'Масса смеси, которую нужно сохранить после подливки. Это условие заказа, не дополнительный расход. Ноль указывайте только если запас действительно не нужен.',
  };
  return { ...definition, parameters: definition.parameters.map(p => ({ ...p, truth_metadata: { ...p.truth_metadata,
    ...(guides[p.parameter_id] ? { source_confirmation_required: false, guide: { ...(p.truth_metadata.guide as Record<string, unknown>),
      guide_short_ru: guides[p.parameter_id], guide_kind: 'MEASUREMENT_RULE', source_role: 'USER_SUPPLIED_OBJECT_FACT', verified_at: '2026-10-11T09:47:09Z' } } : {}) } })),
    resources: definition.resources.map(r => {
      const { row_sha256: _hash, ...body } = r;
      const updated = { ...body, source_metadata: { ...r.source_metadata, sourceRole: source.quantityQuality,
        official_url: source.officialUrl, source_artifact_sha256: source.sha256, exact_locator: source.locatorRu,
        quantityQuality: 'APPROXIMATE', objectApplicabilityNotCertified: true, full_technical_acceptance: false,
        normativeTrace: [{ sourceId: pack.sourceId, normId: pack.normId, normVersion: source.edition, source_title: source.titleRu,
          sourceRole: source.quantityQuality, exact_locator: source.locatorRu, source_definition_hash: source.sha256 }] },
        resource_graph: { ...r.resource_graph, operationCompositionV1: { contractVersion: 'canonical-operation-resource/v1',
          groupId: prefix, groupTitleRu: 'Подливка основания оборудования', operationId: prefix + ':operation:grouting',
          operationTitleRu: 'Подливка основания оборудования', processOrdinal: 20,
          completionCriterionRu: 'Материальная потребность рассчитана; подготовка, выполнение и уход требуют собственного подтверждённого состава.' },
          publicResourcePresentationV1: { contractVersion: 'canonical-public-resource-presentation/v1', sourceTitleRu: r.title_ru,
            nameRu: r.title_ru, brandAndModelRu: 'SikaGrout-212, Казахстан', specificationRu: title,
            detailsRu: [pack.scopeRu, 'Расход приблизительный: 2,0 кг сухой смеси/(м²·мм), то есть около 2000 кг/м³. Упаковка 25 кг; точный заказ зависит от наличия и запаса.'] } } };
      return { ...updated, row_sha256: estimateDeterministicHash(updated) };
    }) };
}
