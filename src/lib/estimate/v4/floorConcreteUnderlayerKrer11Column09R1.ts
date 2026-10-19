import pack from '../../../../data/estimate-benchmarks/source-packs/floor-concrete-underlayer-krer11-002-09-r1.json';
import {buildAutomaticConstructionOwnerR1, unresolvedApplicationNormTruthR1,
 type AutomaticOwnerDefinition, type AutomaticParameterSpec, type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {effectivePurchaseBalanceExpressionsR1} from './effectivePurchaseBalanceR1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';

type Json = Record<string, unknown>;
export const floorConcreteUnderlayerPackR1 = pack;
export const floorConcreteUnderlayerPrimaryR1 = pack.measurement.parameterId;
export const floorConcreteUnderlayerPrefixR1 = pack.prefix;
export const floorConcreteUnderlayerProposedCatalogIdR1 = pack.proposedIdentity.catalogId;
const p = pack.prefix, volume = pack.measurement.parameterId;
const id = (suffix: string) => p + ':' + suffix;
const needParameter = (key: string) => 'floor_concrete_underlayer_application_need_' + key.replaceAll('-', '_');
export const floorConcreteUnderlayerNeedParameterIdsR1 = pack.needs.map(n => needParameter(n.id));
const positiveVolume = {kind: 'greater_than' as const, parameterId: volume, value: 0};

/** One source-owned adapter of the existing compiler. ROOT owns identity, source
 * registration, price coverage admission and publication. No I/O on import. */
export function floorConcreteUnderlayerDefinitionR1(): AutomaticOwnerDefinition {
 if (pack.normId !== '11-01-002-09' || pack.source.sha256 !== 'e56ef148df993609c325b7d505c54b1806e8185a4fd7a1550b15266144538223'
  || pack.measurement.denominator !== '1' || pack.materials.length !== 4 || pack.operations.length !== 4
  || pack.worker.ratePerM3 !== '1.8' || pack.machine.ratePerM3 !== '0.48'
  || pack.catalogId !== null || pack.identityAdmitted || pack.publicationAllowed || !pack.machine.priceCoverageAdmissionPending)
  throw Error('FLOOR_CONCRETE00209_EXACT_PRE_ADMISSION_SOURCE_REQUIRED');
 const facts = [pack.scopeFact.id];
 const conditional: AutomaticParameterSpec[] = [
  {id: pack.scopeFact.id, title: pack.scopeFact.titleRu, valueType: 'enum', unitId: null, kind: 'conditional',
   values: [pack.scopeFact.valueRu], requiredWhen: positiveVolume},
  {id: pack.machine.fulfillmentParameterId, title: 'Как обеспечить вибратор?', valueType: 'enum', unitId: null, kind: 'conditional',
   values: [pack.machine.ownValueRu, pack.machine.hiredValueRu], requiredWhen: positiveVolume},
 ];
 const rows: AutomaticRowSpec[] = [];
 const add = (suffix: string, title: string, category: string, unitId: string, expression: string, extra: Partial<AutomaticRowSpec> = {}) => {
  rows.push({rowId: id(suffix), formulaId: id('formula:' + suffix), title, section: pack.titleRu, category, unitId, expression,
   procurement: false, inputParameterIds: facts, inclusion: positiveVolume, ...extra});
 };
 add('whole-labor', pack.worker.titleRu, 'labor', 'man_hour', volume + '*1.8');
 add('surface-vibrator-consumed', 'Нормативная работа поверхностного вибратора', 'equipment', 'machine_hour', volume + '*0.48', {costTreatment: 'INFORMATIONAL_SCOPE'});
 // Unknown machine-price coverage is a financial gate. Scalar price alone may
 // not turn either prospective fulfillment into an admitted paid machine.
 for (const [kind, choice] of [['own', pack.machine.ownValueRu], ['hired', pack.machine.hiredValueRu]] as const) {
  add('surface-vibrator-' + kind, pack.machine.titleRu + (kind === 'own' ? ': собственная эксплуатация' : ': аренда'), 'equipment', 'machine_hour', volume + '*0.48',
   {costTreatment: 'INFORMATIONAL_SCOPE', procurement: false, inputParameterIds: [...facts, pack.machine.fulfillmentParameterId],
    inclusion: {kind: 'and', operands: [positiveVolume, {kind: 'equals', parameterId: pack.machine.fulfillmentParameterId, value: choice}]}});
 }
 for (const m of pack.materials) {
  const key = m.parameterPrefix, owner = id(m.id + '-order'), consumed = volume + '*' + m.ratePerM3;
  conditional.push({id: key + '_specification', title: 'Что будет поставлено: ' + m.titleRu + '?', valueType: 'text', unitId: null, kind: 'conditional', requiredWhen: positiveVolume},
   {id: key + '_stock_reference', title: 'Чем подтверждено пригодное наличие: ' + m.titleRu + '?', valueType: 'text', unitId: null, kind: 'conditional',
    requiredWhen: {kind: 'greater_than', parameterId: key + '_stock', value: 0}});
  for (const [suffix, title, min] of [['stock', 'Сколько пригодного материала уже есть', 0], ['reserve', 'Сколько оставить в резерве', 0], ['quantum', 'Какая кратность поставки', 0.000000001]] as const) {
   conditional.push({id: key + '_' + suffix, title: title + ': ' + m.titleRu + '?', valueType: 'decimal', unitId: m.unitId, kind: 'conditional', min, requiredWhen: positiveVolume});
  }
  add(m.id + '-consumed', 'Нормативный расход: ' + m.titleRu, 'material', m.unitId, consumed,
   {costTreatment: 'INFORMATIONAL_SCOPE', purchaseBalanceOwnerRowId: owner});
  const balance = effectivePurchaseBalanceExpressionsR1({ownerRowId: owner, orderUnitId: m.unitId, consumed,
   stock: key + '_stock', reserve: key + '_reserve', quantum: key + '_quantum'});
  add(m.id + '-order', m.titleRu, 'material', m.unitId,
   `ceil(max(0,(${consumed})+${key}_reserve-${key}_stock)/${key}_quantum)*${key}_quantum`,
   {...balance.owner, procurement: true, titleParameterIds: [key + '_specification'], inputParameterIds: [...facts, key + '_specification', key + '_stock_reference']});
  for (const [suffix, title, unitId, expression] of [
   ['available', 'Пригодное наличие', m.unitId, key + '_stock'],
   ['required-reserve', 'Сохраняемый резерв', m.unitId, key + '_reserve'],
   ['supply-quantum', 'Кратность поставки', m.unitId, key + '_quantum'],
   ['order-multiples', 'Единицы кратности заказа', 'item', balance.packages],
   ['remaining', 'Остаток после устройства слоя', m.unitId, balance.remaining],
   ['free', 'Свободный остаток сверх резерва', m.unitId, balance.free],
   ['shortage', 'Недостающее количество для расхода', m.unitId, balance.consumptionShortage],
   ['reserve-deficit', 'Непокрытый резерв', m.unitId, balance.reserveDeficit],
  ] as const) add(m.id + '-' + suffix, title + ': ' + m.titleRu, 'material', unitId, expression,
   {costTreatment: 'INFORMATIONAL_SCOPE', purchaseBalanceOwnerRowId: owner});
 }
 for (const operation of pack.operations) add('included-' + operation.id, operation.titleRu, 'work', 'm3', volume, {costTreatment: 'INCLUDED_IN_RESOURCE_ROWS'});
 for (const n of pack.needs) {
  const parameter = needParameter(n.id);
  conditional.push({id: parameter, title: n.titleRu, valueType: 'decimal', unitId: null, kind: 'conditional', min: 0});
  add('open-' + n.id, n.titleRu, n.category, '', parameter, {costTreatment: 'INFORMATIONAL_SCOPE'});
 }
 // A machine-price scope need is independent of selected own/hired supply.
 const machineScopeParameter = needParameter('machine-price-scope');
 conditional.push({id: machineScopeParameter, title: 'Состав ставки поверхностного вибратора', valueType: 'decimal', unitId: null, kind: 'conditional', min: 0});
 add('open-machine-price-scope', 'Состав ставки поверхностного вибратора', 'service', '', machineScopeParameter, {costTreatment: 'INFORMATIONAL_SCOPE'});
 const built = buildAutomaticConstructionOwnerR1({contract: pack.contract, semanticOwner: p, operationCompositionGroupId: p,
  sourceId: pack.sourceId, normId: pack.normId, sourceMetadata: {source_title: pack.titleRu, source_document_version: pack.source.edition,
   artifact_sha256: pack.source.sha256, definition_hash: pack.source.sha256, exact_locator: pack.source.locatorRu},
  applicabilityRu: pack.selectionRestrictionRu, ordinary: [{id: volume, title: 'Какой чистый объём бетонного слоя?', valueType: 'decimal', unitId: 'm3', kind: 'ordinary', min: 0}],
  profile: [], conditional, rows, deferMissingProjectFactsToRows: true, excludedUnownedAssumptions: pack.exclusionsRu});
 const parameters = built.parameters.map(q => {
  if (q.parameter_id.startsWith('floor_concrete_underlayer_application_need_')) return {...q, required: false,
   truth_metadata: unresolvedApplicationNormTruthR1(q.truth_metadata,
    'Нужны источник единицы, применимость, количество и отдельная граница оплаты. Пользовательская цена или0/1/77 не закрывают эту техническую потребность.')};
  if (q.truth_metadata.visibility_role === 'INTERNAL_ONLY') return q;
  const m = pack.materials.find(m => q.parameter_id.startsWith(m.parameterPrefix + '_'));
  const short = q.parameter_id === volume
   ? 'Укажите объём по плану полов или обмеру, например 12,5 м³. Вычтите места, занятые колоннами, печами и выступающими фундаментами.'
   : q.parameter_id === pack.scopeFact.id ? pack.scopeFact.guideRu
   : q.parameter_id === pack.machine.fulfillmentParameterId
    ? 'Выберите собственный или арендованный вибратор по договору с подрядчиком. До подтверждения состава ставки показанные часы не создают оплату или заказ.'
   : q.parameter_id.endsWith('_specification')
    ? 'Укажите материал из согласованного предложения поставщика. Сверьте характеристики и единицу с исходным ресурсом в подробностях.'
   : q.parameter_id.endsWith('_stock_reference')
    ? 'Укажите документ или отметку складской проверки. Остаток должен соответствовать выбранному материалу и быть пригоден для этой работы.'
   : q.parameter_id.endsWith('_stock')
    ? 'Укажите проверенный пригодный остаток на объекте, например 0 при отсутствии. Если данных нет, оставьте поле пустым: заказ пока не рассчитывается.'
   : q.parameter_id.endsWith('_reserve')
    ? 'Укажите количество, которое должно остаться после работы, например 0 без дополнительного резерва. Это отдельный запас, исходный нормативный расход уже учтён.'
    : 'Укажите шаг заказа из предложения поставщика, например ' + (m?.id === 'concrete-b125' ? '0,5 м³ бетона' : m?.unitId === 't' ? '0,01 т мастики' : '0,001 м³')
      + '. Эта величина не означает число рейсов или состав упаковки.';
  const guide = q.truth_metadata.guide as Json;
  return {...q, truth_metadata: {...q.truth_metadata, source_confirmation_required: false,
   value_source_role: q.parameter_id === volume ? 'USER_INPUT' : 'PROJECT_SPECIFIC_INPUT',
   provenance: {consumer_input_role_v1: m ? 'ADVANCED_OPTION' : 'OBJECT_FACT'},
   guide: {...guide, guide_short_ru: short, verified_at: pack.source.reviewedAt,
    applicability: pack.selectionRestrictionRu,
    full_condition_ru: [pack.source.locatorRu, q.parameter_id === volume ? pack.measurement.ruleRu : m?.specificationRu ?? pack.selectionRestrictionRu,
     m?.quantityCautionRu ?? 'Цельный труд не разделяется на часы отдельных этапов.'].join(' ')} }};
 });
 const operation = (key: string) => {
  const o = pack.operations.find(o => o.id === key)!;
  return {operationId: id('operation:' + key), operationTitleRu: o.titleRu, completionCriterionRu: o.criterionRu,
   processOrdinal: o.ordinal, processRole: 'PROCESS' as const};
 };
 const resources = built.resources.map(r => {
  const key = r.row_id.slice(p.length + 1), material = pack.materials.find(m => key.startsWith(m.id + '-'));
  const included = pack.operations.find(o => key === 'included-' + o.id), need = pack.needs.find(n => key === 'open-' + n.id);
  const machine = key.startsWith('surface-vibrator-'), machineScope = key === 'open-machine-price-scope';
  const unresolved = !!need || machineScope, whole = key === 'whole-labor', consumed = key.endsWith('-consumed');
  const main = need ? {operationId: id('operation:' + need.operationId), operationTitleRu: need.operationTitleRu,
    completionCriterionRu: need.nextTaskRu, processOrdinal: need.ordinal, processRole: 'PROCESS' as const}
   : operation(included?.id ?? (material ? material.operationIds[0]! : whole ? 'planning' : 'placement'));
  const related = whole ? pack.operations.slice(1).map(o => operation(o.id))
   : material ? material.operationIds.slice(1).map(operation) : [];
  const formula = built.formulas.find(f => f.formula_id === r.formula_id)!;
  const paidOrder = !!material && key === material.id + '-order';
  const protectedPhysical = !unresolved && !paidOrder;
  const sourceCode = whole ? pack.worker.code : machine ? pack.machine.code : material?.code ?? null;
  const {row_sha256: _previous, ...body} = r;
  const changed = {...body, cost_owner_id: included ? id('whole-labor') : r.cost_owner_id,
   resource_graph: {...r.resource_graph,
    operationCompositionV1: {contractVersion: 'canonical-operation-resource/v1', groupId: p, groupTitleRu: pack.titleRu, ...main,
     ...(related.length ? {additionalOperations: related} : {})},
    ...(included ? {parentCostOwnerId: id('whole-labor'), includedInResourceOwnerRowId: id('whole-labor')} : {}),
    ...(protectedPhysical ? {derivedQuantityEditPolicyV1: {contractVersion: 'canonical-derived-quantity-edit-policy/v1', mode: 'PARAMETERS_ONLY',
     unitId: r.unit_id, parameterIds: [...formula.input_parameter_ids], reasonRu: 'Измените исходный объём или условия поставки. Ручная строка не заменяет точный расход колонки11-01-002-09.'}} : {}),
    ...(machine ? {physicalNormOwnerRowId: id('surface-vibrator-consumed'), machinePriceAdmissionPending: true} : {}),
    publicResourcePresentationV1: {contractVersion: 'canonical-public-resource-presentation/v1', sourceTitleRu: r.title_ru, nameRu: r.title_ru,
     brandAndModelRu: null, specificationRu: material?.specificationRu ?? null,
     detailsRu: need ? [need.reasonRu, need.nextTaskRu, 'Кто уточняет: ' + need.ownerRu]
      : machineScope ? [pack.machine.priceScopeRu, 'Подрядчик подтверждает состав ставки; пока проверены только нормативные часы.']
      : [pack.selectionRestrictionRu, pack.source.locatorRu,
       material?.quantityCautionRu ?? (machine ? pack.machine.priceScopeRu : 'Цельный труд1,8ч/м³ охватывает все четыре исходные операции; часы не делятся и повторно не начисляются.'),
       ...(material ? ['Расход и коммерческий заказ раздельны. Физическая фасовка не установлена; указана только подтверждённая кратность поставки в исходной единице.'] : [])]}},
   source_metadata: {...r.source_metadata,
    sourceRole: unresolved ? 'UNRESOLVED_APPLICATION_NORM' : included ? 'INCLUDED_OFFICIAL_OPERATION' : paidOrder ? 'DERIVED_PURCHASE_BALANCE'
     : whole || consumed ? 'OFFICIAL_EXACT_COLUMN_QUANTITY' : machine ? 'EXCLUSIVE_MACHINE_FULFILLMENT_PRICE_SCOPE_PENDING' : 'DERIVED_PURCHASE_BALANCE_CONTROL',
    normativeTrace: unresolved ? [] : (Array.isArray(r.source_metadata?.normativeTrace) ? r.source_metadata.normativeTrace : [])
     .map((trace: Json) => ({...trace, sourceRole: 'OFFICIAL_NORM', artifact_sha256: pack.source.sha256})),
    normativeResourceCode: sourceCode, source_artifact_sha256: pack.source.sha256, exact_column: pack.normId,
    exact_locator: pack.source.locatorRu, official_url: pack.source.officialUrl,
    sourceNormQuantityAccepted: !unresolved && (whole || consumed || !!included),
    automaticGenericPriceInheritanceAllowed: whole,
    ...(unresolved ? {normative_source_ids: [], quantityUnitUnconfirmed: true} : {}),
    ...(machine ? {machinePriceScopePending: true, machinePriceOwnerAdmitted: false, operatorRoleNotAdmitted: true,
     noAdditionalOperatorInferred: false, priceScopeNeedRowId: id('open-machine-price-scope')} : {}),
    ...(material ? {materialQuantityKind: consumed ? 'NORMATIVE_CONSUMPTION' : paidOrder ? 'COMMERCIAL_ORDER_WITH_SUPPLY_FACTS' : 'BALANCE_CONTROL',
     sourceRateIsNotWastePercent: true, physicalPackageCompositionProven: false} : {}),
    ...(need ? {missingFact: need.reasonRu, nextTask: need.nextTaskRu, resolutionOwner: need.ownerRu} : {}),
    sourceAdmissionPending: true, identityAdmissionPending: true, publicationAllowed: false, full_technical_acceptance: false}};
  return {...changed, row_sha256: estimateDeterministicHash(changed)};
 });
 return {...built, parameters, resources};
}

/** Synthetic test facts only; no runtime default, supplier offer or site approval. */
export function floorConcreteUnderlayerScenarioFactsR1(volumeM3 = '12.5'): Record<string, unknown> {
 const facts: Record<string, unknown> = {[volume]: volumeM3, [pack.scopeFact.id]: pack.scopeFact.valueRu,
  [pack.machine.fulfillmentParameterId]: pack.machine.ownValueRu};
 for (const m of pack.materials) {
  facts[m.parameterPrefix + '_specification'] = 'TEST_ONLY exact source-compatible supply, not an actual supplier offer';
  facts[m.parameterPrefix + '_stock'] = '0'; facts[m.parameterPrefix + '_reserve'] = '0'; facts[m.parameterPrefix + '_quantum'] = '0.001';
 }
 return facts;
}

/** Expected composition from the source transcription and explicitly declared
 * supply controls; never produced by iterating the emitted definition rows. */
export function floorConcreteUnderlayerCompletenessMapR1() {
 const entry = (suffix: string, operationId: string, category: string, unitId: string | null, quantityRule: string,
  specification: string, included = false) => ({expectedResourceId: pack.normId + ':' + suffix, operationId,
   category, unitId, quantityRule, specification, sourceId: pack.sourceId,
   condition: 'EXACT00209_FLOOR_UNDERLAYER_B125_SURFACE_VIBRATION_NET_VOLUME', formulaId: id('formula:' + suffix),
   resolution: included ? {kind: 'INCLUDED_COMPONENT_ROW', rowId: id(suffix), parentRowId: id('whole-labor')}
    : {kind: 'ROW', rowId: id(suffix)}});
 const controls = ['available', 'required-reserve', 'supply-quantum', 'order-multiples', 'remaining', 'free', 'shortage', 'reserve-deficit'];
 return {contract: 'rik-expo-app.s26-3.independent-completeness-map.v1', sourceKind: 'NORMATIVE_OPERATION_MAP', generatedFromCurrentRows: false,
  evidenceSha256: pack.source.sha256, evidenceReferences: [pack.source.officialUrl, pack.source.locatorRu], entries: [
   entry('whole-labor', 'planning', 'labor', 'man_hour', '1.8_WHOLE_MAN_HOUR_PER_NET_M3_NO_STAGE_SPLIT', '000-1002-5: рабочие среднего разряда2,5; вся норма09'),
   entry('surface-vibrator-consumed', 'placement', 'equipment', 'machine_hour', '0.48_MACHINE_HOUR_PER_NET_M3', '11-0183: поверхностный вибратор'),
   ...['own', 'hired'].map(kind => entry('surface-vibrator-' + kind, 'placement', 'equipment', 'machine_hour', 'EXCLUSIVE_FULFILLMENT_QUANTITY_ONLY_PRICE_SCOPE_PENDING', pack.machine.priceScopeRu)),
   ...pack.materials.flatMap(m => [
    entry(m.id + '-consumed', m.operationIds[0]!, 'material', m.unitId, m.ratePerM3 + '_SOURCE_UNIT_PER_NET_M3', m.specificationRu),
    entry(m.id + '-order', m.operationIds[0]!, 'material', m.unitId, 'CEIL_MAX0_CONSUMED_PLUS_RESERVE_MINUS_COMPATIBLE_STOCK_DIV_SUPPLY_QUANTUM', m.specificationRu),
    ...controls.map(control => entry(m.id + '-' + control, m.operationIds[0]!, 'material', control === 'order-multiples' ? 'item' : m.unitId,
     'EXACT_SUPPLY_BALANCE_CONTROL_REFERENCE_ONLY_' + control.toUpperCase().replaceAll('-', '_'), m.quantityCautionRu)),
   ]),
   ...pack.operations.map(o => entry('included-' + o.id, o.id, 'work', 'm3', 'SOURCE_OPERATION_INCLUDED_IN_WHOLE_LABOUR_NO_SECOND_PRICE', o.printedRu, true)),
   ...pack.needs.map(n => entry('open-' + n.id, n.operationId, n.category, null, 'UNRESOLVED_APPLICATION_SCOPE_UNIT_QUANTITY_PAYMENT_REQUIRED', n.nextTaskRu)),
   entry('open-machine-price-scope', 'placement', 'service', null, 'MACHINE_PRICE_SCOPE_NOT_PROVEN_BY_SCALAR_OR_SOURCE_DASH', pack.machine.priceScopeRu),
  ]};
}
