import pack from '../../../../data/estimate-benchmarks/source-packs/tn-pvc15-cleaner472219-series-s27-63.json';
import {buildAutomaticConstructionOwnerR1,type AutomaticInclusionCondition,type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {effectivePurchaseBalanceExpressionsR1} from './effectivePurchaseBalanceR1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
export const pvc15CleanerPackS2763=pack;
export const pvc15CleanerOwnerS2763=pack.ownershipContract.newAlternateProductOwner;
export const pvc15CleanerPrefixS2763='pvc15-cleaner472219';
export const pvc15CleanerRequiredS2763:AutomaticInclusionCondition={kind:'equals',parameterId:'pvc15_cleaner_mode',value:'Требуется по подтверждённой границе'};
export const pvc15CleanerSelectedS2763:AutomaticInclusionCondition={kind:'and',operands:[pvc15CleanerRequiredS2763,{kind:'equals',parameterId:'pvc15_cleaner_product_choice',value:pack.selectedProductRu}]};
export const pvc15CleanerLegacyS2763:AutomaticInclusionCondition={kind:'equals',parameterId:'pvc15_cleaner_product_choice',value:pack.legacyProductRu};
/** Only an explicit current project scope replaces the generic cleaner/activator.
 * No membrane area, old quantity, stock or price supplies the new material. */
export function pvc15CleanerDefinitionS2763(){
 if(pack.targets.length!==3||pack.source.rateLPerM2!==0.25||pack.source.packageL!==3||pack.source.sha256!=='2c18f654cd628cc204bc657af83897e5e3d84146572c8664151e07e345ee8654')throw Error('PVC15_CLEANER_EXACT_SOURCE_REQUIRED');
 const selected=pvc15CleanerSelectedS2763,owner=pvc15CleanerOwnerS2763,prefix=pvc15CleanerPrefixS2763;
 const area='pvc15_cleaner_472219_dirty_area_m2',stock='pvc15_cleaner_472219_usable_stock_l',reserve='pvc15_cleaner_472219_retained_reserve_l';
 const consumed=area+'*0.25';const balance=effectivePurchaseBalanceExpressionsR1({ownerRowId:owner,orderUnitId:'l',consumed,stock,reserve,quantum:'3'});
 const rows:AutomaticRowSpec[]=[];
 const add=(id:string,title:string,unitId:string,expression:string,extra:Partial<AutomaticRowSpec>={})=>rows.push({rowId:prefix+':'+id,formulaId:prefix+':formula:'+id,section:'Подготовка и очистка сварных зон',category:'material',title,unitId,expression,procurement:false,costTreatment:'INFORMATIONAL_SCOPE',inclusion:selected,...extra});
 add('consumed','Расход очистителя ПВХ-мембран ТЕХНОНИКОЛЬ ЕКН472219','l',consumed,{purchaseBalanceOwnerRowId:owner});
 add('order','Очиститель ПВХ-мембран ТЕХНОНИКОЛЬ ЕКН472219, канистра 3 л','l',`ceil(max(0,(${consumed})+${reserve}-${stock})/3)*3`,{...balance.owner,rowId:owner,procurement:true,costTreatment:'OWN_COST'});
 add('packages','Канистры очистителя ЕКН472219 к покупке, по 3 л','pcs',balance.packages,{purchaseBalanceOwnerRowId:owner});
 add('remaining','Остаток очистителя ЕКН472219 после очистки','l',balance.remaining,{purchaseBalanceOwnerRowId:owner});
 add('free','Остаток очистителя ЕКН472219 сверх сохраняемого запаса','l',balance.free,{purchaseBalanceOwnerRowId:owner});
 for(const[id,title,expression]of[['shortage','Непокрытая потребность очистителя ЕКН472219',balance.consumptionShortage],['reserve-deficit','Непокрытый сохраняемый запас очистителя ЕКН472219',balance.reserveDeficit]]as const)add(id,title,'l',expression,{purchaseBalanceOwnerRowId:owner,inclusion:{kind:'and',operands:[selected,{kind:'formula_greater_than',expression,unitId:'l',value:0}]}});
 const definition=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:prefix,sourceId:pack.sourceId,normId:pack.normId,sourceMetadata:{source_title:pack.source.titleRu,source_document_version:pack.source.edition,definition_hash:pack.source.sha256,artifact_sha256:pack.source.sha256,exact_locator:pack.source.locatorRu},applicabilityRu:pack.scopeRu,
 ordinary:[{id:'pvc15_cleaner_mode',title:'Нужна ли очистка или отдельная активация ПВХ-мембраны',kind:'ordinary',valueType:'enum',unitId:null,values:['Требуется по подтверждённой границе','Не требуется по подтверждённой границе']},
 {id:'pvc15_cleaner_product_choice',title:'Чем очищаем ПВХ-мембрану в этой работе',kind:'ordinary',valueType:'enum',unitId:null,values:[pack.selectedProductRu,pack.legacyProductRu],requiredWhen:pvc15CleanerRequiredS2763},
 {id:area,title:'Площадь загрязнённой ПВХ-мембраны, которую очищаем',kind:'ordinary',valueType:'decimal',unitId:'m2',min:0.001,requiredWhen:selected}],
 conditional:[{id:stock,title:'Этот очиститель уже есть для участка',kind:'conditional',valueType:'decimal',unitId:'l',min:0,requiredWhen:selected},{id:reserve,title:'Очиститель оставить после работ',kind:'conditional',valueType:'decimal',unitId:'l',min:0,requiredWhen:selected}],profile:[],rows,deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:pack.exclusionsRu});
 const guides:Record<string,string>={pvc15_cleaner_product_choice:'Выбирайте ЕКН472219 только для действительно выбранного продукта и измеренных загрязнённых ПВХ-участков. Во всей границе заменяемой подготовки сварных зон отдельный активатор и другие применения очистителя не должны требоваться. Это явный факт технологии проекта. Если отдельная активация чистых зон, очистка инструмента, другой материал нужны или это неизвестно, сохраняйте проектную ветвь. Выбор не подтверждает весь состав кровли.',
 [area]:'Обмерьте только загрязнённую ПВХ-поверхность, которую очищают данным составом. Загрязнённые сварные зоны входят один раз. Не подставляйте общую площадь кровли, площадь рулонов или длину швов. Норму 0,25 л/м² и канистру 3 л приложение получает из источника.',
 [stock]:'Пригодный выделенный для участка остаток именно выбранного продукта, в литрах. Наличие другого очистителя не переносится. Если неизвестно, оставьте пустым: расход по площади всё равно сохранится.',
 [reserve]:'Сколько пригодного очистителя нужно оставить после работ. Это условие заказа, а не добавочная норма расхода. Ноль вводите только если запас действительно не нужен.'};
 return{...definition,parameters:definition.parameters.map(p=>({...p,truth_metadata:{...p.truth_metadata,...(guides[p.parameter_id]?{source_confirmation_required:false,provenance:{consumer_input_role_v1:[stock,reserve].includes(p.parameter_id)?'ADVANCED_OPTION':'OBJECT_FACT'},guide:{...(p.truth_metadata.guide as Record<string,unknown>),guide_short_ru:guides[p.parameter_id],guide_kind:'MEASUREMENT_RULE',source_role:'USER_SUPPLIED_OBJECT_FACT',verified_at:pack.source.reviewedAt}}:{})}})),resources:definition.resources.map(r=>{const{row_sha256:_old,...body}=r;const final={...body,source_metadata:{...r.source_metadata,sourceRole:pack.source.quantityQuality,official_url:pack.source.officialUrl,source_artifact_sha256:pack.source.sha256,full_technical_acceptance:false},resource_graph:{...r.resource_graph,publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:r.title_ru,nameRu:r.title_ru,brandAndModelRu:'ТЕХНОНИКОЛЬ ЕКН472219',specificationRu:'Для загрязнённой ПВХ-мембраны; канистра 3 л',detailsRu:[pack.scopeRu,'Расход 0,25 л/м² относится только к выбранной очистке.']}}};return{...final,row_sha256:estimateDeterministicHash(final)};})};
}
