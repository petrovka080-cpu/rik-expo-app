import pack from '../../../../data/estimate-benchmarks/source-packs/facade-ceresit-ct190-kz-material-subworks-r1.json';
import {buildAutomaticConstructionOwnerR1, unresolvedApplicationNormTruthR1,
 type AutomaticOwnerDefinition, type AutomaticParameterSpec, type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {effectivePurchaseBalanceExpressionsR1} from './effectivePurchaseBalanceR1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
import {FACADE_MINERAL_WOOL_INSTALLATION_CATALOG_ID, FACADE_MINERAL_WOOL_INSTALLATION_PARAMETERS,
 FACADE_MINERAL_WOOL_INSTALLATION_FORMULAS, FACADE_MINERAL_WOOL_INSTALLATION_RESOURCES} from './facadeMineralWoolInstallationR1';

type Json = Record<string, unknown>;
export const facadeCeresitCt190PackR1 = pack;
export const facadeCeresitCt190ConditionsR1 = 'Основание и проектная система проверены; условия +5…+30 °C, влажность до80%, защита от солнца/ветра/дождя обеспечена';
export const facadeCeresitCt190ChoiceParameterR1 = 'facade_adhesive_material_choice';
const p = pack.prefix, id = (suffix: string) => p + ':' + suffix;
const attach = 'area_m2', base = 'ct190_base_layer_area_m2';
export const facadeCeresitCt190GeometryR5=[attach,base] as const;
const publicTitleRu='Приклеивание минераловатных плит и устройство армированного базового слоя';
const demand = attach + '*5+' + base + '*5.8';
const scope = ['ct190_product_scope', 'ct190_conditions'];
const active = {kind: 'formula_greater_than' as const, expression: demand, unitId: 'kg', value: 0};

/** A source-owned material subset of the existing façade estimate. No source
 * registration, special compiler, persistence or release activation here. */
export function facadeCeresitCt190MaterialDefinitionR1(): AutomaticOwnerDefinition {
 if (pack.catalogId !== FACADE_MINERAL_WOOL_INSTALLATION_CATALOG_ID || pack.isNewWorkType || pack.publicationAllowed
  || pack.source.sha256 !== '58b52276c77deb9d2835cf5464d26506b17e8be7a89b3a31bdca064c0368cdca'
  || pack.rates.attachmentKgPerM2 !== '5' || pack.rates.baseLayerKgPerM2 !== '5.8' || pack.rates.packageKg !== '25'
  || !pack.rates.approximate) throw Error('FACADE_CT190_EXACT_KZ_MATERIAL_SUBSET_REQUIRED');
 const conditional: AutomaticParameterSpec[] = [
  {id: base, title: 'Какая площадь защитного слоя со стеклосеткой?', kind: 'conditional', valueType: 'decimal', unitId: 'm2', min: 0},
  {id: scope[0]!, title: 'Какое исполнение смеси предусмотрено?', kind: 'conditional', valueType: 'enum', unitId: null, values: [pack.selectedValueRu], requiredWhen: active},
  {id: scope[1]!, title: 'Проверены ли основание и условия фасадных работ?', kind: 'conditional', valueType: 'enum', unitId: null, values: [facadeCeresitCt190ConditionsR1], requiredWhen: active},
  {id: 'ct190_supply_reference', title: 'Какая поставка CT 190 согласована?', kind: 'conditional', valueType: 'text', unitId: null, requiredWhen: active},
  {id: 'ct190_usable_stock_kg', title: 'Сколько пригодной смеси CT 190 уже есть?', kind: 'conditional', valueType: 'decimal', unitId: 'kg', min: 0, requiredWhen: active},
  {id: 'ct190_stock_reference', title: 'Чем подтверждены пригодность и исполнение остатка?', kind: 'conditional', valueType: 'text', unitId: null,
   requiredWhen: {kind: 'greater_than', parameterId: 'ct190_usable_stock_kg', value: 0}},
  {id: 'ct190_required_reserve_kg', title: 'Сколько смеси оставить после работы?', kind: 'conditional', valueType: 'decimal', unitId: 'kg', min: 0, requiredWhen: active},
  {id: 'ct190_actual_water_l_per_25kg', title: 'Сколько воды отмеряют на 25 кг смеси?', kind: 'conditional', valueType: 'decimal', unitId: 'l', min: 5.75, max: 6.25},
 ];
 const rows: AutomaticRowSpec[] = [];
 const add = (suffix: string, title: string, category: string, unitId: string, expression: string, extra: Partial<AutomaticRowSpec> = {}) => rows.push({
  rowId: id(suffix), formulaId: id('formula:' + suffix), section: pack.titleRu, title, category, unitId, expression,
  procurement: false, inclusion: active, inputParameterIds: scope, costTreatment: 'INFORMATIONAL_SCOPE', ...extra});
 for (const [key, title, expression, measure] of [
  ['attachment-consumed', 'CT 190 для приклеивания плит: предварительный расход', attach + '*5', attach],
  ['base-layer-consumed', 'CT 190 для защитного слоя: предварительный расход', base + '*5.8', base],
 ] as const) add(key, title, 'material', 'kg', expression, {purchaseBalanceOwnerRowId: id('dry-mix-order'),
  inclusion: {kind: 'greater_than', parameterId: measure, value: 0}});
 add('dry-mix-consumed', 'Общий предварительный расход CT 190', 'material', 'kg', demand, {purchaseBalanceOwnerRowId: id('dry-mix-order')});
 const balance = effectivePurchaseBalanceExpressionsR1({ownerRowId: id('dry-mix-order'), orderUnitId: 'kg', consumed: demand,
  stock: 'ct190_usable_stock_kg', reserve: 'ct190_required_reserve_kg', quantum: '25'});
 add('dry-mix-order', 'CT 190 исполнения KZ, мешки 25 кг', 'material', 'kg',
  `ceil(max(0,(${demand})+ct190_required_reserve_kg-ct190_usable_stock_kg)/25)*25`,
  {...balance.owner, costTreatment: 'OWN_COST', procurement: true, inputParameterIds: [...scope, 'ct190_supply_reference', 'ct190_stock_reference']});
 for (const [key, title, unit, expression] of [
  ['bags', 'Мешки CT 190 к заказу', 'item', balance.packages],
  ['remaining', 'Остаток CT 190 после работы', 'kg', balance.remaining],
  ['free', 'Свободный остаток CT 190 сверх резерва', 'kg', balance.free],
  ['shortage', 'Недостающее количество CT 190 для расхода', 'kg', balance.consumptionShortage],
  ['reserve-deficit', 'Непокрытый резерв CT 190', 'kg', balance.reserveDeficit],
 ] as const) add('dry-mix-' + key, title, 'material', unit, expression, {purchaseBalanceOwnerRowId: id('dry-mix-order')});
 add('water-min', 'Нижняя граница воды затворения по паспорту', 'material', 'l', `(${demand})*5.75/25`);
 add('water-max', 'Верхняя граница воды затворения по паспорту', 'material', 'l', `(${demand})*6.25/25`);
 add('water-used', 'Вода затворения по фактически выбранной дозировке', 'material', 'l', `(${demand})*ct190_actual_water_l_per_25kg/25`, {costTreatment: 'OWN_COST'});
 for (const [key, measure, title] of [['attachment', attach, pack.operations[0]!.titleRu], ['base-layer', base, pack.operations[1]!.titleRu]] as const)
  add('process-' + key, title, 'work', 'm2', measure, {inclusion: {kind: 'greater_than', parameterId: measure, value: 0}});
 for (const n of pack.needs) {
  const parameter = 'ct190_application_need_' + n.id.replaceAll('-', '_');
  conditional.push({id: parameter, title: n.titleRu, kind: 'conditional', valueType: 'decimal', unitId: null, min: 0});
  add('open-' + n.id, n.titleRu, n.category, '', parameter);
 }
 const built = buildAutomaticConstructionOwnerR1({contract: pack.contract, semanticOwner: p, operationCompositionGroupId: p,
  sourceId: pack.sourceId, normId: pack.normId, sourceMetadata: {source_title: pack.titleRu, source_document_version: pack.source.edition,
   artifact_sha256: pack.source.sha256, definition_hash: pack.source.sha256, exact_locator: pack.source.locatorRu},
  applicabilityRu: pack.scopeRu, ordinary: [{id: attach, title: 'Какая площадь приклеивания минераловаты?', kind: 'ordinary', valueType: 'decimal', unitId: 'm2', min: 0}],
  conditional, profile: [], rows, deferMissingProjectFactsToRows: true, excludedUnownedAssumptions: pack.exclusionsRu});
 const parameters = built.parameters.map(q => {
  if (q.parameter_id.startsWith('ct190_application_need_')) return {...q, required: false, truth_metadata:
   unresolvedApplicationNormTruthR1(q.truth_metadata, 'Паспорт не подтверждает единицу и количество. Цена или 0/1/77 не закрывают эту потребность.')};
  if (q.truth_metadata.visibility_role === 'INTERNAL_ONLY') return q;
  const geometry=facadeCeresitCt190GeometryR5.some(id=>id===q.parameter_id);
  const title=({area_m2:'Площадь приклеивания минераловатных плит',ct190_base_layer_area_m2:'Площадь армированного базового слоя',
   ct190_product_scope:'Исходное исполнение клеевой смеси',ct190_conditions:'Фактическая готовность основания и условий',
   ct190_supply_reference:'Согласованная поставка клеевой смеси',ct190_usable_stock_kg:'Подтверждённый пригодный остаток клеевой смеси',
   ct190_stock_reference:'Документ проверки пригодности остатка',ct190_required_reserve_kg:'Подтверждённый сохраняемый запас',
   ct190_actual_water_l_per_25kg:'Дозировка воды по принятому способу приготовления'} as Record<string,string>)[q.parameter_id]??q.title_ru;
  const guide=q.truth_metadata.guide,provenance=q.truth_metadata.provenance;
  if(!guide||typeof guide!=='object'||Array.isArray(guide))throw Error('FACADE_MATERIAL_EXISTING_GUIDE_REQUIRED');
  if(provenance!=null&&(typeof provenance!=='object'||Array.isArray(provenance)))throw Error('FACADE_MATERIAL_EXISTING_PROVENANCE_REQUIRED');
  const help=geometry?(q.parameter_id===attach?'Чистая площадь приклеивания по обмеру или проекту.':'Фактическая площадь армированного слоя; она не выводится из площади приклеивания автоматически.')
   :'Сведения из точного паспорта, принятого проекта, поставки или складского чтения. Не вопрос потребителю; неизвестное значение не заменяется нулём.';
  return {...q,title_ru:title,truth_metadata:{...q.truth_metadata,source_confirmation_required:false,
   visibility_role:geometry?'USER_INPUT':'INTERNAL_ONLY',
   value_source_role:geometry?'USER_MEASURED':q.parameter_id==='ct190_product_scope'?'MANUFACTURER_CONFIRMED'
    :q.parameter_id==='ct190_conditions'?'SITE_SURVEY':q.parameter_id==='ct190_actual_water_l_per_25kg'?'ENGINEERING_DESIGN':'PROJECT_DOCUMENTATION',
   preliminary_compilation_allowed:!geometry,
   provenance:{...provenance,consumer_input_role_v1:geometry?'OBJECT_FACT':'APPLICATION_TECHNICAL',
    ...(geometry?{}:{source_readback_only_v1:true,consumer_question_allowed:false})},
   guide:{...guide,...(geometry?{guide_kind:'MEASUREMENT_RULE',source_role:'USER_MEASURED'}:{}),guide_short_ru:help,
    full_condition_ru:pack.scopeRu+' '+pack.source.locatorRu,source_snapshot_hash:pack.source.sha256,verified_at:pack.source.reviewedAt}}};
 });
 const operation = (key: string) => {const o = pack.operations.find(o => o.id === key)!; return {operationId: id('operation:' + key),
  operationTitleRu: o.titleRu, processOrdinal: o.ordinal, completionCriterionRu: o.criterionRu, processRole: 'PROCESS' as const};};
 const resources = built.resources.map(r => {
  const key = r.row_id.slice(p.length + 1), need = pack.needs.find(n => key === 'open-' + n.id);
  const onlyBase = key === 'base-layer-consumed' || key === 'process-base-layer';
  const shared = key.startsWith('dry-mix-') || key.startsWith('water-');
  const {row_sha256: _old, ...body} = r;
  const formula = built.formulas.find(f => f.formula_id === r.formula_id)!;
  const changed = {...body,section:publicTitleRu, resource_graph: {...r.resource_graph,
   operationCompositionV1: {contractVersion: 'canonical-operation-resource/v1', groupId: p, groupTitleRu: publicTitleRu,
    ...operation(need?.operationId ?? (onlyBase ? 'base-layer' : 'attachment')), ...(shared ? {additionalOperations: [operation('base-layer')]} : {})},
   ...(!need && key !== 'dry-mix-order' ? {derivedQuantityEditPolicyV1: {contractVersion: 'canonical-derived-quantity-edit-policy/v1', mode: 'PARAMETERS_ONLY',
    unitId: r.unit_id, parameterIds: [...formula.input_parameter_ids], reasonRu: 'Автоматическое количество следует из площади и подтверждённых условий; явная ручная правка сохраняется отдельно с основанием и исходной формулой.'}} : {}),
   publicResourcePresentationV1: {contractVersion: 'canonical-public-resource-presentation/v1', sourceTitleRu: r.title_ru, nameRu: r.title_ru,
    brandAndModelRu: key.startsWith('dry-mix-') || key.endsWith('-consumed') ? 'Ceresit CT 190, KZ, 25 кг' : null,
    specificationRu: pack.scopeRu, detailsRu: need ? [need.reasonRu, need.nextTaskRu, 'Кто уточняет: ' + need.ownerRu]
     : [pack.rates.attachmentRaw, pack.rates.baseLayerRaw, pack.rates.waterRaw, pack.source.locatorRu,
      'Для двух подработ один владелец смеси и один общий заказ; остаток не затворяется водой. Труд и инструмент не оплачиваются по паспорту материала.']}},
   source_metadata: {...r.source_metadata, sourceRole: need ? 'UNRESOLVED_APPLICATION_NORM' : key === 'dry-mix-order' ? 'DERIVED_PURCHASE_BALANCE' : 'MANUFACTURER_APPROXIMATE_MATERIAL_QUANTITY',
    normativeTrace: need ? [] : (Array.isArray(r.source_metadata?.normativeTrace) ? r.source_metadata.normativeTrace : []).map((t: Json) => ({...t, sourceRole: 'MANUFACTURER_MATERIAL_TDS', artifact_sha256: pack.source.sha256})),
    ...(need ? {normative_source_ids: [], quantityUnitUnconfirmed: true, missingFact: need.reasonRu, nextTask: need.nextTaskRu, resolutionOwner: need.ownerRu} : {}),
    approximateMaterialCoverage: true, materialEdition: 'KZ', physicalPackageKg: '25', source_artifact_sha256: pack.source.sha256,
    automaticGenericPriceInheritanceAllowed: false, identityAdmissionPending: false, sourceAdmissionPending: true,
    publicationAllowed: false, full_technical_acceptance: false}};
  return {...changed, row_sha256: estimateDeterministicHash(changed)};
 });
 return {...built, parameters, resources,ordinaryParameterIds:[...facadeCeresitCt190GeometryR5]};
}

/** Reviewable successor composition against the exact existing subject arrays.
 * The publisher still must compare the live preimage before admission. Old
 * definitions are never edited. This candidate requires an explicit choice. */
export function facadeCeresitCt190SuccessorDefinitionR1(): AutomaticOwnerDefinition {
 const added = facadeCeresitCt190MaterialDefinitionR1(), choice = facadeCeresitCt190ChoiceParameterR1;
 const selected = {kind: 'equals', parameterId: choice, value: pack.selectedValueRu};
 const legacy = {kind: 'equals', parameterId: choice, value: pack.legacyValueRu};
 const oldOwner = FACADE_MINERAL_WOOL_INSTALLATION_RESOURCES.find(r => r.row_id === pack.legacyOwner.rowId);
 if (!oldOwner || oldOwner.unit_id !== 'kg' || oldOwner.formula_id !== pack.legacyOwner.formulaId || oldOwner.cost_owner_id !== oldOwner.row_id)
  throw Error('FACADE_CT190_LEGACY_ADHESIVE_PREIMAGE_REQUIRED');
 const oldIds = new Set(FACADE_MINERAL_WOOL_INSTALLATION_PARAMETERS.map(q => q.parameter_id));
 const choiceParameter = {...added.parameters.find(q => q.parameter_id === 'ct190_product_scope')!, parameter_id: choice,
  ordinal: 0, title_ru: 'Какой клеевой материал использовать?', required: true,
  constraints_json: {values: [pack.legacyValueRu, pack.selectedValueRu]}, default_value: null,
  truth_metadata: {...added.parameters.find(q => q.parameter_id === 'ct190_product_scope')!.truth_metadata,
   semantic_parameter_key: p + ':material-choice',visibility_role:'USER_INPUT',value_source_role:'PROJECT_SPECIFIC_INPUT',
   provenance:{consumer_input_role_v1:'OBJECT_FACT'}}};
 const parameters = [...FACADE_MINERAL_WOOL_INSTALLATION_PARAMETERS.map(q => [pack.legacyOwner.quantityParameterId, pack.legacyOwner.designationParameterId].includes(q.parameter_id)
  ? {...q, required: false, constraints_json: {...q.constraints_json, requiredWhen: legacy}} : q).map(q=>q.parameter_id===attach?q:{...q,truth_metadata:{...q.truth_metadata,visibility_role:'INTERNAL_ONLY',value_source_role:'PROJECT_DOCUMENTATION',
    source_confirmation_required:false,preliminary_compilation_allowed:true,provenance:{...q.truth_metadata.provenance as Json,consumer_input_role_v1:'APPLICATION_TECHNICAL',source_readback_only_v1:true,consumer_question_allowed:false}}}), choiceParameter,
  ...added.parameters.filter(q => !oldIds.has(q.parameter_id)).map(q => ({...q, required: false,
   constraints_json: {...q.constraints_json, ...(q.constraints_json?.requiredWhen ? {requiredWhen: {kind: 'and', operands: [selected, q.constraints_json.requiredWhen]}} : {})}}))]
  .map((q, ordinal) => ({...q, ordinal}));
 const oldResources = FACADE_MINERAL_WOOL_INSTALLATION_RESOURCES.map(r => {
  if (r.row_id !== oldOwner.row_id) return r;
  const {row_sha256: _old, ...body} = r;
  const changed = {...body, inclusion_ast: legacy};
  return {...changed, row_sha256: estimateDeterministicHash(changed)};
 });
 const resources = [...oldResources, ...added.resources.map(r => {
  const {row_sha256: _old, ...body} = r;
  const changed = {...body, inclusion_ast: {kind: 'and', operands: [selected, r.inclusion_ast]}};
  return {...changed, row_sha256: estimateDeterministicHash(changed)};
 })].map((r, ordinal) => {
  const {row_sha256: _old, ...body} = r;
  const changed = {...body, ordinal};
  return {...changed, row_sha256: estimateDeterministicHash(changed)};
 });
 return {...added, parameters, formulas: [...FACADE_MINERAL_WOOL_INSTALLATION_FORMULAS, ...added.formulas], resources,
  ordinaryParameterIds: ['area_m2',base,choice]};
}
