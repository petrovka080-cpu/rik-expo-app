import pack from '../../../../data/estimate-benchmarks/source-packs/basin-mixer-grohe33265002-kit-r1.json';
import {buildAutomaticConstructionOwnerR1, unresolvedApplicationNormTruthR1,
 type AutomaticOwnerDefinition, type AutomaticParameterSpec, type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {effectivePurchaseBalanceExpressionsR1} from './effectivePurchaseBalanceR1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';

type Json = Record<string, unknown>;
export const basinMixerGrohe33265002PackR1 = pack;
const p = pack.prefix, id = (key: string) => p + ':' + key;
const n = pack.primaryParameterId;
const product = 'grohe33265002_product_scope', site = 'grohe33265002_site_scope';
const stock = 'grohe33265002_usable_stock_item', reserve = 'grohe33265002_required_reserve_item';
const active = {kind: 'greater_than' as const, parameterId: n, value: 0};

/** Source-specific candidate for a NEW VERSION of the existing mixer card.
 * It does not append a kit over the 63 generic legacy resources, convert point
 * to item, alter old revisions, register a source, or publish a definition. */
export function basinMixerGrohe33265002KitDefinitionR1(): AutomaticOwnerDefinition {
 if (pack.catalogId !== 'canonical-work:base:plumbing_interior_mixer_install_standard'
  || pack.sku !== '33265002' || pack.ean !== '4005176861543' || pack.isNewWorkType || pack.publicationAllowed
  || pack.source.sha256 !== '601da351cbf1a4423b3af76bfa5e92e70bad2c339564ed72e2bae6dfda7df9bd'
  || pack.unitMigration.automaticLegacyPointConversionAllowed || pack.unitMigration.savedRevisionRewriteAllowed)
  throw Error('GROHE_33265002_EXACT_KIT_VERSION_AND_EXPLICIT_ITEM_SCOPE_REQUIRED');
 const conditional: AutomaticParameterSpec[] = [
  {id: product, title: 'Какой комплект смесителя выбран?', kind: 'conditional', valueType: 'enum', unitId: null, values: [pack.productValueRu], requiredWhen: active},
  {id: site, title: 'Подготовленный узел подходит для этого комплекта?', kind: 'conditional', valueType: 'enum', unitId: null, values: [pack.siteValueRu], requiredWhen: active},
  {id: 'grohe33265002_supply_reference', title: 'Какая поставка комплектных смесителей согласована?', kind: 'conditional', valueType: 'text', unitId: null, requiredWhen: active},
  {id: stock, title: 'Сколько пригодных комплектных смесителей уже есть?', kind: 'conditional', valueType: 'integer', unitId: 'item', min: 0, max: 1_000_000, requiredWhen: active},
  {id: 'grohe33265002_stock_reference', title: 'Чем подтверждён пригодный комплектный остаток?', kind: 'conditional', valueType: 'text', unitId: null,
   requiredWhen: {kind: 'greater_than', parameterId: stock, value: 0}},
  {id: reserve, title: 'Сколько целых комплектов оставить после монтажа?', kind: 'conditional', valueType: 'integer', unitId: 'item', min: 0, max: 1_000_000, requiredWhen: active},
  {id: 'grohe33265002_work_scope', title: 'Какая граница оплаты полного монтажа согласована?', kind: 'conditional', valueType: 'enum', unitId: null, values: [pack.laborValueRu], requiredWhen: active},
  {id: 'grohe33265002_work_reference', title: 'Чем подтверждена расценка за полный монтаж?', kind: 'conditional', valueType: 'text', unitId: null, requiredWhen: active},
 ];
 const rows: AutomaticRowSpec[] = [];
 const add = (key: string, title: string, category: string, unit: string, expression: string, extra: Partial<AutomaticRowSpec> = {}) => rows.push({
  rowId: id(key), formulaId: id('formula:' + key), section: pack.titleRu, title, category, unitId: unit, expression,
  procurement: false, costTreatment: 'INFORMATIONAL_SCOPE', inclusion: active, inputParameterIds: [product, site], ...extra});
 const balance = effectivePurchaseBalanceExpressionsR1({ownerRowId: id('kit-order'), orderUnitId: 'item', consumed: n, stock, reserve, quantum: '1'});
 add('kit-consumed', 'Комплектные смесители для установки', 'material', 'item', n, {purchaseBalanceOwnerRowId: id('kit-order')});
 add('kit-order', 'GROHE Eurosmart 33265002, полный комплект', 'material', 'item', `ceil(max(0,${n}+${reserve}-${stock}))`, {
  ...balance.owner, procurement: true, costTreatment: 'OWN_COST', inputParameterIds: [product, site, 'grohe33265002_supply_reference', 'grohe33265002_stock_reference']});
 for (const [key, title, expression] of [
  ['kit-remaining', 'Целые комплектные смесители после монтажа', balance.remaining],
  ['kit-free', 'Свободный остаток комплектов сверх резерва', balance.free],
  ['kit-shortage', 'Недостающие комплекты для монтажа', balance.consumptionShortage],
  ['kit-reserve-deficit', 'Непокрытый резерв комплектов', balance.reserveDeficit],
 ] as const) add(key, title, 'material', 'item', expression, {purchaseBalanceOwnerRowId: id('kit-order')});
 for (const c of pack.components) add(c.id, c.titleRu, 'material', c.unitId, n, {purchaseBalanceOwnerRowId: id('kit-order')});
 add('complete-installation-work', 'Полный монтаж одного комплектного смесителя по согласованной границе', 'work', 'item', n, {
  costTreatment: 'OWN_COST', inputParameterIds: [product, site, 'grohe33265002_work_scope', 'grohe33265002_work_reference']});
 for (const o of pack.operations) add('process-' + o.id, o.titleRu, 'work', 'item', n);
 for (const need of pack.needs) {
  const parameter = 'grohe33265002_application_need_' + need.id.replaceAll('-', '_');
  conditional.push({id: parameter, title: need.titleRu, kind: 'internal', valueType: 'decimal', unitId: null, min: 0});
  add('open-' + need.id, need.titleRu, need.category, '', parameter);
 }
 const built = buildAutomaticConstructionOwnerR1({contract: pack.contract, semanticOwner: p, operationCompositionGroupId: p,
  sourceId: pack.sourceId, normId: pack.normId, sourceMetadata: {source_title: pack.titleRu, source_document_version: pack.source.edition,
   artifact_sha256: pack.source.sha256, definition_hash: pack.source.sha256, exact_locator: pack.source.locatorRu},
  applicabilityRu: pack.scopeRu, ordinary: [{id: n, title: 'Сколько комплектных смесителей нужно установить?', kind: 'ordinary', valueType: 'integer', unitId: 'item', min: 0, max: 1_000_000}],
  conditional, profile: [], rows, deferMissingProjectFactsToRows: true, excludedUnownedAssumptions: pack.exclusionsRu});
 const help: Record<string, string> = {
  [n]: 'Посчитайте монтажные места на плане или на объекте, например 3. Один монтаж означает установку одного полного комплекта на готовую совместимую раковину. Старая «точка» автоматически сюда не пересчитывается.',
  [product]: 'Снабжение сверяет артикул 33265002, EAN и комплектность фактической поставки. Подводка, FastFixation и донный клапан входят в один комплект. Другой артикул или исполнение требует отдельного выбора.',
  [site]: 'Прораб проверяет отверстие и поверхность раковины, выводы воды и совместимость с существующим сливом по инструкции поставки. Если нужен переходник, новая раковина или переделка, эта ветка пока неприменима.',
  grohe33265002_supply_reference: 'Укажите предложение на точный полный комплект, например номер и дату согласованной спецификации. Уточните включение доставки. Не переносите цену другого смесителя или цену из старой общей строки.',
  [stock]: 'Посчитайте только пригодные полные комплекты выбранного артикула, например 0 при отсутствии. Неизвестный остаток оставьте пустым; неполные или неподтверждённые изделия не вычитаются из заказа.',
  grohe33265002_stock_reference: 'Укажите акт проверки артикула, комплектности и состояния остатка. В наличии должны быть штатные подводка, крепление и донный клапан. Отдельные запасные части не считаются полным комплектом.',
  [reserve]: 'Укажите число целых комплектов, которое нужно сохранить после монтажа, например 0 без резерва. Процент потерь и запас автоматически не добавляются.',
  grohe33265002_work_scope: 'Подрядчик подтверждает одну расценку за весь монтаж: крепление, штатные подключения и местную проверку. Смеситель, переделки, доставка и общая опрессовка оплачиваются отдельно только при доказанной потребности.',
  grohe33265002_work_reference: 'Укажите договор или предложение с единицей «один полный монтаж» и согласованной границей. Цена остаётся пустой до её ввода. Это число монтажей, а не норматив человеко-часов.',
 };
 const parameters = built.parameters.map(q => {
  if (q.parameter_id.startsWith('grohe33265002_application_need_')) return {...q, required: false,
   truth_metadata: unresolvedApplicationNormTruthR1(q.truth_metadata, 'Источник не задаёт единицу и количество дополнительной работы. Цена, 0 или 77 не заменяют отдельного доказанного основания.')};
  if (q.truth_metadata.visibility_role === 'INTERNAL_ONLY') return q;
  return {...q, truth_metadata: {...q.truth_metadata, source_confirmation_required: false,
   value_source_role: q.parameter_id === n ? 'USER_INPUT' : 'PROJECT_SPECIFIC_INPUT',
   provenance: {consumer_input_role_v1: [stock, reserve, 'grohe33265002_stock_reference'].includes(q.parameter_id) ? 'ADVANCED_OPTION' : 'OBJECT_FACT'},
   guide: {...q.truth_metadata.guide as Json, guide_short_ru: help[q.parameter_id], full_condition_ru: pack.scopeRu + ' ' + pack.source.locatorRu,
    source_snapshot_hash: pack.source.sha256, verified_at: pack.source.reviewedAt}}};
 });
 const operation = (key: string) => {const o = pack.operations.find(o => o.id === key)!; return {operationId: id('operation:' + o.id),
  operationTitleRu: o.titleRu, processOrdinal: o.ordinal, completionCriterionRu: o.criterionRu, processRole: 'PROCESS' as const};};
 const resources = built.resources.map(r => {
  const key = r.row_id.slice(p.length + 1), need = pack.needs.find(x => key === 'open-' + x.id);
  const component = pack.components.find(x => key === x.id), wholeWork = key === 'complete-installation-work';
  const processKey = key.startsWith('process-') ? key.slice(8) : undefined;
  const op = operation(need?.operationId ?? component?.operationId ?? processKey ?? 'mounting');
  const formula = built.formulas.find(f => f.formula_id === r.formula_id)!;
  const {row_sha256: _old, ...body} = r;
  const changed = {...body, cost_owner_id: component ? id('kit-order') : processKey ? id('complete-installation-work') : r.cost_owner_id,
   resource_graph: {...r.resource_graph,
    operationCompositionV1: {contractVersion: 'canonical-operation-resource/v1', groupId: p, groupTitleRu: pack.titleRu, ...op,
     ...(wholeWork || key === 'kit-order' ? {additionalOperations: pack.operations.filter(o => o.id !== 'mounting').map(o => operation(o.id))} : {})},
    ...(key !== 'kit-order' && !need ? {derivedQuantityEditPolicyV1: {contractVersion: 'canonical-derived-quantity-edit-policy/v1', mode: 'PARAMETERS_ONLY',
     unitId: r.unit_id, parameterIds: [...formula.input_parameter_ids], reasonRu: 'Измените число полных монтажей или фактические условия. Включённые детали и рабочий объём не заменяются прямой правкой строки.'}} : {}),
    publicResourcePresentationV1: {contractVersion: 'canonical-public-resource-presentation/v1', sourceTitleRu: r.title_ru,
     nameRu: wholeWork ? 'Монтаж смесителя' : key === 'flexible-hoses-reference' ? 'Комплект гибкой подводки смесителя' : r.title_ru,
     ...(key.startsWith('kit-') && key !== 'kit-order' ? {rowKind:'CALCULATION_DETAIL'} : need ? {rowKind:'PROCESS_NOTE'} : processKey ? {rowKind:'PROCESS_NOTE'} : {}),
     brandAndModelRu: component || key.startsWith('kit-') ? 'GROHE Eurosmart 33265002, EAN 4005176861543' : null,
     specificationRu: component ? 'Входит в комплект GROHE Eurosmart 33265002.' : key === 'kit-order' ? 'GROHE Eurosmart 33265002, хром, EAN 4005176861543; штатные подводка, донный клапан 1¼ и крепление.' : null,
     detailsRu: need ? [need.reasonRu, need.nextTaskRu, 'Кто уточняет: ' + need.ownerRu]
      : component ? [component.quantityMeaningRu, 'Входит в один оплачиваемый комплект; отдельно не заказывать и не оплачивать.', pack.source.locatorRu]
      : wholeWork ? [pack.laborQuantityBasisRu, pack.laborValueRu]
      : [pack.source.locatorRu, 'Комплект имеет одного владельца закупки. Шаги монтажа не начисляют вторую оплату.'] }},
   source_metadata: {...r.source_metadata,
    sourceRole: need ? 'UNRESOLVED_APPLICATION_NORM' : wholeWork ? 'PROJECT_CONTRACT_UNIT_WORK_SCOPE' : key === 'kit-order' ? 'DERIVED_PURCHASE_BALANCE' : 'MANUFACTURER_COMPLETE_PRODUCT_SCOPE',
    normativeTrace: need || wholeWork ? [] : (Array.isArray(r.source_metadata?.normativeTrace) ? r.source_metadata.normativeTrace : []).map((t: Json) => ({...t,
     sourceRole: 'MANUFACTURER_PRODUCT_COMPOSITION_NOT_LABOR_NORM', artifact_sha256: pack.source.sha256})),
    ...(need ? {normative_source_ids: [], quantityUnitUnconfirmed: true, missingFact: need.reasonRu, nextTask: need.nextTaskRu, resolutionOwner: need.ownerRu} : {}),
    ...(wholeWork ? {quantityBasisRu: pack.laborQuantityBasisRu, laborHoursNormClaimed: false, requiredContractScopeRu: pack.laborValueRu} : {}),
    source_artifact_sha256: pack.source.sha256, automaticGenericPriceInheritanceAllowed: false,
    legacyPointConversionAllowed: false, legacySavedRevisionRewriteAllowed: false,
    sourceAdmissionPending: true, publicationAllowed: false, full_technical_acceptance: false}};
  return {...changed, row_sha256: estimateDeterministicHash(changed)};
 });
 return {...built, parameters, resources};
}
