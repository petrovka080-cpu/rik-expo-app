import pack from '../../../../data/estimate-benchmarks/source-packs/sika-antisol250w-us-curing-series-s27-63.json';
import {buildAutomaticConstructionOwnerR1, type AutomaticInclusionCondition, type AutomaticParameterSpec, type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {effectivePurchaseBalanceExpressionsR1} from './effectivePurchaseBalanceR1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';

export const concreteCuringAntisolPackS2763=pack;
export const concreteCuringAntisolOwnerS2763=pack.ownershipContract.newAlternateProductOwner;
export const concreteCuringAntisolPrefixS2763='concrete-curing-antisol250w-us';
export const concreteCuringAntisolReadyChoicesS2763=[
  'Горизонтальная поверхность: вода сошла, бетон не повреждается, конденсата нет',
  'Вертикальная поверхность: опалубка только снята, конденсата нет',
] as const;
export const concreteCuringAntisolInterfaceS2763='Без приклеиваемой отделки, гидроизоляции и контакта с питьевой водой';
export const concreteCuringAntisolSelectedS2763:AutomaticInclusionCondition={kind:'equals',parameterId:'antisol_material_choice',value:pack.selectedProductRu};
export const concreteCuringAntisolLegacyS2763:AutomaticInclusionCondition={kind:'equals',parameterId:'antisol_material_choice',value:pack.legacyProductRu};

/** Source-backed alternate material within the existing curing operation.
 * Actual exposed area is shared with its current owner, never inferred from m3.
 * A distinct material identity preserves legacy quantities and prices. */
export function concreteCuringAntisolDefinitionS2763(contextPrefix='') {
  if(!['','external_curing_'].includes(contextPrefix))throw Error('CURING_ANTISOL_PREFIX_NOT_ADMITTED');
  if(pack.targets.length!==55||pack.source.coverageM2PerL!==4.9||pack.source.packageL!==19
    ||pack.source.sha256!=='b2f03cae00c6edf37228a1836104b5beba33a56dbb19b559caa8cc435a8b14b3')throw Error('CURING_ANTISOL_EXACT_SOURCE_REQUIRED');
  const area=contextPrefix+'exposed_curing_surface_area_m2',method=contextPrefix+'approved_external_curing_method';
  const selected:AutomaticInclusionCondition={kind:'and',operands:[concreteCuringAntisolSelectedS2763,
    {kind:'equals',parameterId:method,value:'MEMBRANE_CURING_COMPOUND'}]};
  const ordinary:AutomaticParameterSpec[]=[
    {id:area,title:'Обрабатываемая площадь бетона',kind:'ordinary',valueType:'decimal',unitId:'m2',min:0.001},
    {id:method,title:'Способ ухода за бетоном',kind:'ordinary',valueType:'enum',unitId:null,values:['WATER_CURING','WET_COVERING','IMPERVIOUS_SHEET','MEMBRANE_CURING_COMPOUND']},
    {id:'antisol_material_choice',title:'Материал и поверхность для ухода',kind:'ordinary',valueType:'enum',unitId:null,values:[pack.selectedProductRu,pack.legacyProductRu],requiredWhen:{kind:'equals',parameterId:method,value:'MEMBRANE_CURING_COMPOUND'}},
    {id:'antisol_surface_ready',title:'Готовность поверхности к нанесению',kind:'ordinary',valueType:'enum',unitId:null,values:concreteCuringAntisolReadyChoicesS2763,requiredWhen:selected},
    {id:'antisol_minimum_temperature_12h_c',title:'Минимальная температура поверхности и воздуха в ближайшие 12 часов',kind:'ordinary',valueType:'decimal',unitId:'degC',min:7.000000001,requiredWhen:selected},
    {id:'antisol_subsequent_surface_use',title:'Дальнейшее использование поверхности',kind:'ordinary',valueType:'enum',unitId:null,values:[concreteCuringAntisolInterfaceS2763],requiredWhen:selected},
  ];
  const conditional:AutomaticParameterSpec[]=[
    {id:'antisol_usable_stock_l',title:'Пригодный Antisol-250 W в наличии',kind:'conditional',valueType:'decimal',unitId:'l',min:0,requiredWhen:selected},
    {id:'antisol_retained_reserve_l',title:'Запас Antisol после ухода за бетоном',kind:'conditional',valueType:'decimal',unitId:'l',min:0,requiredWhen:selected},
  ];
  const nominal=area+'/4.9',owner=concreteCuringAntisolOwnerS2763,prefix=concreteCuringAntisolPrefixS2763;
  const balance=effectivePurchaseBalanceExpressionsR1({ownerRowId:owner,orderUnitId:'l',consumed:nominal,stock:'antisol_usable_stock_l',reserve:'antisol_retained_reserve_l',quantum:'19'});
  const physical=['antisol_surface_ready','antisol_minimum_temperature_12h_c','antisol_subsequent_surface_use'];
  const rows:AutomaticRowSpec[]=[];
  const add=(id:string,title:string,unitId:string,expression:string,extra:Partial<AutomaticRowSpec>={})=>rows.push({rowId:prefix+':'+id,formulaId:prefix+':formula:'+id,
    section:'Уход за бетоном',category:'material',title,unitId,expression,procurement:false,costTreatment:'INFORMATIONAL_SCOPE',inclusion:selected,inputParameterIds:physical,...extra});
  add('consumed','Приблизительная потребность в составе для ухода за бетоном Sika Antisol-250 W','l',nominal,{purchaseBalanceOwnerRowId:owner});
  add('order','Состав для ухода за свежим бетоном Sika Antisol-250 W, готовый к применению, канистра 19 л','l',`ceil(max(0,(${nominal})+antisol_retained_reserve_l-antisol_usable_stock_l)/19)*19`,
    {...balance.owner,rowId:owner,procurement:true,costTreatment:'OWN_COST'});
  add('packages','Канистры Antisol-250 W к покупке, по 19 л','pcs',balance.packages,{purchaseBalanceOwnerRowId:owner});
  add('remaining','Приблизительный остаток Antisol после ухода за бетоном','l',balance.remaining,{purchaseBalanceOwnerRowId:owner});
  add('free','Приблизительный остаток Antisol сверх сохраняемого запаса','l',balance.free,{purchaseBalanceOwnerRowId:owner});
  for(const[id,title,expression]of[
    ['shortage','Непокрытая потребность Antisol для ухода за бетоном',balance.consumptionShortage],
    ['reserve-deficit','Непокрытый сохраняемый запас Antisol',balance.reserveDeficit],
  ]as const)add(id,title,'l',expression,{purchaseBalanceOwnerRowId:owner,inclusion:{kind:'and',operands:[selected,{kind:'formula_greater_than',expression,unitId:'l',value:0}]}});
  const definition=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:prefix,sourceId:pack.sourceId,normId:pack.normId,
    sourceMetadata:{source_title:pack.source.titleRu,source_document_version:pack.source.edition,definition_hash:pack.source.sha256,artifact_sha256:pack.source.sha256,exact_locator:pack.source.locatorRu},
    applicabilityRu:pack.scopeRu,ordinary,conditional,profile:[],rows,deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:pack.exclusionsRu});
  const guides:Record<string,string>={
    [area]:'Вся реально обрабатываемая поверхность свежего бетона с одинаковой отделкой щёткой, включая измеренные грани. Не подменяйте её площадью основания, плёнки или объёмом бетона. Для гладкой либо смешанной поверхности эта ветвь не применяется.',
    [method]:'Выберите предусмотренный на объекте способ ухода. Вода, влажные покрытия, листовая плёнка и наносимый состав имеют отдельные ресурсы.',
    antisol_material_choice:'Выбирайте Antisol только для фактически предусмотренного продукта исполнения США по паспорту June 2020 Version 01.03. Вся введённая обрабатываемая площадь должна быть свежим бетоном с однородной отделкой щёткой, без гладких, смешанных или ранее обработанных участков. Для другого исполнения или поверхности сохраняется проектная ветвь. Норму расхода и упаковку приложение получает само.',
    antisol_surface_ready:'Горизонталь: свободная вода сошла, поверхность не повреждается при проходе. Вертикаль: наносить сразу после снятия опалубки. Конденсат исключён до высыхания; подготовка и защита смежных участков остаются самостоятельными потребностями. Условия пока неизвестны — оставьте пустым.',
    antisol_minimum_temperature_12h_c:'Наименьшая подтверждённая температура поверхности и воздуха при нанесении и в следующие 12 часов. При 7 °C и ниже этот состав наносить нельзя. Это фактическое условие объекта, расходную норму вводить не нужно.',
    antisol_subsequent_surface_use:'Данная ветвь пока покрывает поверхности без приклеиваемой отделки, гидроизоляции и питьевого контакта. Если они предусмотрены либо неизвестны, нужны отдельные подтверждения совместимости; не выбирайте это условие автоматически.',
    antisol_usable_stock_l:'Только пригодный материал точно выбранного исполнения: исходная невскрытая тара, срок не более 12 месяцев и сухое хранение при 60–80 °F по паспорту. Когда-либо замороженный материал использовать нельзя. Негодный или непроверенный запас не вычитайте из закупки. Если пригодное наличие неизвестно, оставьте пустым: потребность всё равно рассчитывается.',
    antisol_retained_reserve_l:'Пригодный запас, который нужно оставить после работ, в литрах. Это условие заказа, а не добавочная норма расхода. Ноль вводите только если сохраняемый запас действительно не нужен.',
  };
  return {...definition,parameters:definition.parameters.map(p=>({...p,truth_metadata:{...p.truth_metadata,...(guides[p.parameter_id]?{
    source_confirmation_required:false,provenance:{consumer_input_role_v1:'OBJECT_FACT'},guide:{...(p.truth_metadata.guide as Record<string,unknown>),guide_short_ru:guides[p.parameter_id],guide_kind:'MEASUREMENT_RULE',source_role:'USER_SUPPLIED_OBJECT_FACT',verified_at:'2026-10-11T10:54:00Z'}}:{})}})),
    resources:definition.resources.map(r=>{const{row_sha256:_old,...body}=r;const updated={...body,source_metadata:{...r.source_metadata,sourceRole:pack.source.quantityQuality,quantityQuality:'APPROXIMATE',official_url:pack.source.officialUrl,source_artifact_sha256:pack.source.sha256,full_technical_acceptance:false},
      resource_graph:{...r.resource_graph,operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:'concrete-curing',groupTitleRu:'Уход за бетоном',operationId:'curing',operationTitleRu:'Уход за бетоном',processOrdinal:60,completionCriterionRu:'Материальная потребность определена; подготовка, нанесение, защита и завершение имеют собственные потребности.'},
      publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:r.title_ru,nameRu:r.title_ru,brandAndModelRu:'Sika Antisol-250 W, США',specificationRu:'Готовый состав для ухода; канистра 19 л; новая поверхность после обработки щёткой',detailsRu:[pack.scopeRu,'Приблизительный расход: площадь / 4,9 м²/л. Нет автоматической добавки на потери, срок ухода или число слоёв.']}}};return{...updated,row_sha256:estimateDeterministicHash(updated)};})};
}
