import pack from '../../../../data/estimate-benchmarks/source-packs/knauf-interior-plaster-materials-six-s27-63.json';
import {buildAutomaticConstructionOwnerR1, compileAutomaticConstructionOwnerR1,
  unresolvedApplicationNormTruthR1, type AutomaticInclusionCondition,
  type AutomaticParameterSpec, type AutomaticRowSpec, type AutomaticOwnerDefinition} from './automaticConstructionOwnerR1';
import {effectivePurchaseBalanceExpressionsR1} from './effectivePurchaseBalanceR1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';

export const knaufInteriorPlasterPackS2763 = pack;
export const knaufInteriorPlasterPrefixS2763 = 'plaster:knauf-materials';
export const knaufInteriorPlasterChoiceIdS2763 = 'interior_plaster_material_system';
export const knaufInteriorPlasterLegacyS2763: AutomaticInclusionCondition = {
  kind:'equals',parameterId:knaufInteriorPlasterChoiceIdS2763,value:pack.legacyChoiceRu,
};
const equal = (parameterId:string,value:string):AutomaticInclusionCondition => ({kind:'equals',parameterId,value});
const both = (...operands:AutomaticInclusionCondition[]):AutomaticInclusionCondition => ({kind:'and',operands});

/** The source owns consumption, the customer owns measured area and remaining
 * work. Stock and purchase terms never supply an invented consumption norm. */
export function knaufInteriorPlasterMaterialDefinitionS2763(primerOnly:boolean):AutomaticOwnerDefinition {
  const prefix=knaufInteriorPlasterPrefixS2763;
  const choice=primerOnly?pack.mechanizedChoiceRu:pack.manualChoiceRu;
  const exact=equal(knaufInteriorPlasterChoiceIdS2763,choice);
  const needed=both(exact,equal('betogrund_primer_state',pack.primerNeededRu));
  const undetermined=both(exact,equal('betogrund_primer_state',pack.primerUnknownRu));
  const rows:AutomaticRowSpec[]=[];
  const add=(id:string,title:string,unitId:string,expression:string,
    inclusion:AutomaticInclusionCondition,extra:Partial<AutomaticRowSpec>={}) => {
    rows.push({rowId:prefix+':'+id,formulaId:prefix+':formula:'+id,
      section:id.startsWith('rotband')?'Ручное оштукатуривание Ротбанд, слой10мм':'Подготовка основания: Бетогрунд',
      category:'material',title,unitId,expression,inclusion,procurement:false,
      costTreatment:'INFORMATIONAL_SCOPE',...extra});
  };
  const conditional:AutomaticParameterSpec[]=[
    {id:'betogrund_primer_state',title:'Нужно ли ещё грунтовать этот бетон',kind:'conditional',valueType:'enum',unitId:null,
      values:[pack.primerNeededRu,pack.primerCompleteRu,pack.primerUnknownRu],requiredWhen:exact},
    {id:'betogrund_actual_area_m2',title:'Площадь, которую ещё грунтуем Бетогрундом, м²',kind:'conditional',valueType:'decimal',unitId:'m2',min:.001,requiredWhen:needed},
    {id:'betogrund_package_kg',title:'Фасовка выбранного Бетогрунда, кг',kind:'conditional',valueType:'enum',unitId:'kg',values:['5','15'],requiredWhen:needed},
    {id:'betogrund_usable_stock_kg',title:'Пригодный Бетогрунд уже есть, кг',kind:'conditional',valueType:'decimal',unitId:'kg',min:0,requiredWhen:needed},
    {id:'betogrund_retained_reserve_kg',title:'Бетогрунд оставить после работ, кг',kind:'conditional',valueType:'decimal',unitId:'kg',min:0,requiredWhen:needed},
    {id:'betogrund_bucket_multiple',title:'Кратность заказа Бетогрунда, в вёдрах',kind:'conditional',valueType:'integer',unitId:'pcs',min:1,requiredWhen:needed},
    {id:'betogrund_undetermined_need_kg',title:'Неопределённая потребность в грунтовании',kind:'conditional',valueType:'decimal',unitId:'kg',min:0,requiredWhen:undetermined},
  ];
  const primerConsumed='betogrund_actual_area_m2*0.25';
  add('betogrund-consumed','Приблизительный расход КНАУФ-Бетогрунд, один неразбавленный слой','kg',primerConsumed,needed);
  add('betogrund-application-area','Нанесение КНАУФ-Бетогрунд, один слой — измеренный объём','m2','betogrund_actual_area_m2',needed,
    {category:'labor',costTreatment:'INFORMATIONAL_SCOPE'});
  add('betogrund-undetermined','Грунтование бетона: необходимость и оставшаяся площадь ещё не определены','kg','betogrund_undetermined_need_kg',undetermined);
  for(const kg of [5,15]) {
    const selected=both(needed,equal('betogrund_package_kg',String(kg)));
    const owner=prefix+':betogrund-'+kg+'kg-order';
    const balance=effectivePurchaseBalanceExpressionsR1({ownerRowId:owner,orderUnitId:'kg',consumed:primerConsumed,
      stock:'betogrund_usable_stock_kg',reserve:'betogrund_retained_reserve_kg',quantum:kg+'*betogrund_bucket_multiple'});
    add('betogrund-'+kg+'kg-order','КНАУФ-Бетогрунд, ведро'+kg+'кг; стоимость за кг этого SKU','kg',
      `ceil(max(0,(${primerConsumed})+betogrund_retained_reserve_kg-betogrund_usable_stock_kg)/(${kg}*betogrund_bucket_multiple))*${kg}*betogrund_bucket_multiple`,selected,
      {...balance.owner,rowId:owner,procurement:true,costTreatment:'OWN_COST'});
    add('betogrund-'+kg+'kg-buckets','Вёдра КНАУФ-Бетогрунд по'+kg+'кг к покупке — без второй цены','pcs',`${balance.effective}/${kg}`,selected,{purchaseBalanceOwnerRowId:owner});
    add('betogrund-'+kg+'kg-remaining','Пригодный остаток КНАУФ-Бетогрунд после работ, фасовка'+kg+'кг','kg',balance.remaining,selected,{purchaseBalanceOwnerRowId:owner});
    add('betogrund-'+kg+'kg-free','Свободный остаток КНАУФ-Бетогрунд сверх сохраняемого запаса, фасовка'+kg+'кг','kg',balance.free,selected,{purchaseBalanceOwnerRowId:owner});
    for(const [id,title,expression] of [['shortage','Непокрытая потребность Бетогрунда',balance.consumptionShortage],['reserve-deficit','Непокрытый сохраняемый запас Бетогрунда',balance.reserveDeficit]] as const)
      add('betogrund-'+kg+'kg-'+id,title,'kg',expression,both(selected,{kind:'formula_greater_than',expression,unitId:'kg',value:0}),{purchaseBalanceOwnerRowId:owner});
  }
  if(!primerOnly) {
    conditional.push(
      {id:'rotband_usable_stock_kg',title:'Пригодный Ротбанд этой поставки уже есть, кг',kind:'conditional',valueType:'decimal',unitId:'kg',min:0,requiredWhen:exact},
      {id:'rotband_retained_reserve_kg',title:'Сухой Ротбанд оставить после работ, кг',kind:'conditional',valueType:'decimal',unitId:'kg',min:0,requiredWhen:exact},
      {id:'rotband_bag_multiple',title:'Кратность заказа Ротбанд, в мешках30кг',kind:'conditional',valueType:'integer',unitId:'pcs',min:1,requiredWhen:exact});
    const consumed='q*8.5',owner=prefix+':rotband-30kg-order';
    const balance=effectivePurchaseBalanceExpressionsR1({ownerRowId:owner,orderUnitId:'kg',consumed,stock:'rotband_usable_stock_kg',reserve:'rotband_retained_reserve_kg',quantum:'30*rotband_bag_multiple'});
    add('rotband-consumed','Приблизительный расход КНАУФ-Ротбанд, вручную ровно10мм — без потерь','kg',consumed,exact);
    add('rotband-30kg-order','КНАУФ-Ротбанд, мешок30кг; стоимость за кг этого SKU','kg',
      'ceil(max(0,(q*8.5)+rotband_retained_reserve_kg-rotband_usable_stock_kg)/(30*rotband_bag_multiple))*30*rotband_bag_multiple',exact,
      {...balance.owner,rowId:owner,procurement:true,costTreatment:'OWN_COST'});
    add('rotband-30kg-bags','Мешки КНАУФ-Ротбанд по30кг к покупке — без второй цены','pcs',`${balance.effective}/30`,exact,{purchaseBalanceOwnerRowId:owner});
    add('rotband-30kg-remaining','Пригодный сухой остаток КНАУФ-Ротбанд после планового расхода','kg',balance.remaining,exact,{purchaseBalanceOwnerRowId:owner});
    add('rotband-30kg-free','Свободный сухой остаток КНАУФ-Ротбанд сверх сохраняемого запаса','kg',balance.free,exact,{purchaseBalanceOwnerRowId:owner});
    for(const [id,title,expression] of [['shortage','Непокрытая потребность Ротбанд',balance.consumptionShortage],['reserve-deficit','Непокрытый сохраняемый запас Ротбанд',balance.reserveDeficit]] as const)
      add('rotband-30kg-'+id,title,'kg',expression,both(exact,{kind:'formula_greater_than',expression,unitId:'kg',value:0}),{purchaseBalanceOwnerRowId:owner});
    add('rotband-application-area','Ручное оштукатуривание КНАУФ-Ротбанд, слой10мм — измеренный объём','m2','q',exact,
      {category:'labor',costTreatment:'INFORMATIONAL_SCOPE'});
  }
  const source=pack.sources[0];
  const definition=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:prefix,
    sourceId:source.id,normId:pack.contract+':material-scope',sourceMetadata:{source_title:source.titleRu,
      source_document_version:source.printedEdition,definition_hash:source.sha256,artifact_sha256:source.sha256,exact_locator:'Бетогрунд p1–2; Ротбанд p1–2; МП75 p1–2 только совместимость'},
    applicabilityRu:pack.scopeRu,ordinary:[
      ...(!primerOnly?[{id:'q',title:'Площадь штукатурки Ротбанд слоем10мм, м²',kind:'ordinary' as const,valueType:'decimal' as const,unitId:'m2',min:.001}]:[]),
      {id:knaufInteriorPlasterChoiceIdS2763,title:'Технология на этом участке',kind:'ordinary',valueType:'enum',unitId:null,values:[pack.legacyChoiceRu,choice]}],
    conditional,profile:[],rows,deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:pack.exclusionsRu});
  const objectIds=new Set(['q',knaufInteriorPlasterChoiceIdS2763,'betogrund_primer_state','betogrund_actual_area_m2']);
  const guides:Record<string,string>={
    [knaufInteriorPlasterChoiceIdS2763]:primerOnly?'Бетогрунд выбран перед совместимым МП75 на плотном гладком бетоне внутри сухого/нормального помещения. Основная смесь15мм, труд, инструмент, подготовка и завершение сохраняют прежние потребности.':'Выбирайте эту ветвь только для ручного Ротбанд ровно10мм по плотному гладкому бетону внутри сухого/нормального помещения. Обязательны подготовка, грунт, условия и завершение по паспорту; готовность всех этих операций выбор не подтверждает. Иная толщина, цементная смесь или фасад остаются в исходной проектной ветви.',
    q:'Измерьте фактическую оштукатуриваемую площадь. Шаблон100 не является обмером. Приложение получает приблизительный расход8,5кг/м² для10мм из паспорта, без потерь.',
    betogrund_primer_state:'Пригодное выполненное грунтование повторно не оплачивается. Если необходимость пока неизвестна, соответствующая потребность остаётся открытой; известный расход основной смеси всё равно можно сохранить.',
    betogrund_actual_area_m2:'Обмерьте только бетон, который ещё действительно нужно грунтовать выбранным Бетогрундом. Не переносите автоматически всю площадь штукатурки или уже выполненный участок. Приблизительный расход0,25кг/м² приложение получает из паспорта.',
  };
  const parameters=definition.parameters.map(p=>{
    const parameterSource=p.parameter_id==='q'||p.parameter_id.startsWith('rotband_')||(!primerOnly&&p.parameter_id===knaufInteriorPlasterChoiceIdS2763)?pack.sources[1]:pack.sources[0];
    const measured=p.parameter_id==='q'||p.parameter_id==='betogrund_actual_area_m2';
    const guide={...p.truth_metadata.guide as object,
      guide_short_ru:guides[p.parameter_id]??'Фактическое условие выбранной поставки. Если неизвестно, оставьте пустым; известный расход сохранится.',
      guide_kind:measured?'MEASUREMENT_RULE':'PROJECT_DEFINED',source_role:measured?'USER_MEASURED':'PROJECT_DOCUMENTATION',
      source_id:parameterSource.id,source_title:parameterSource.titleRu,source_document_version:parameterSource.printedEdition,
      source_document:parameterSource.id,source_snapshot_hash:parameterSource.sha256,
      source_locator:parameterSource.id===pack.sources[1].id?'Ротбанд, p1–2; расход при10мм без потерь':'Бетогрунд, p1–2; основание, нанесение и расход',
      source_sha256:parameterSource.sha256,source_artifact_sha256:parameterSource.sha256,
      definition_hash:parameterSource.sha256,artifact_sha256:parameterSource.sha256,
      exact_locator:parameterSource.id===pack.sources[1].id?'Ротбанд, p1–2; расход при10мм без потерь':'Бетогрунд, p1–2; основание, нанесение и расход',
      verified_at:parameterSource.reviewedAt};
    return { ...p,default_value:null,truth_metadata:p.parameter_id==='betogrund_undetermined_need_kg'
    ?{...unresolvedApplicationNormTruthR1(p.truth_metadata,'Не определены необходимость грунтования и площадь. Неизвестность не считается готовым основанием, нулём или принятой нормой.'),
      guide:{...guide,guide_short_ru:'Проверьте, нужно ли ещё грунтовать бетон. Если нужно — укажите оставшуюся непрогрунтованную площадь; если уже выполнено — подтвердите пригодность. Расход Бетогрунда около0,25кг/м² уже подтверждён.'}}
    :p.truth_metadata.visibility_role==='INTERNAL_ONLY'?p.truth_metadata:{...p.truth_metadata,
      value_source_role:measured?'USER_MEASURED':'PROJECT_SPECIFIC_INPUT',source_confirmation_required:false,
      visible_when:p.parameter_id==='q'||p.parameter_id===knaufInteriorPlasterChoiceIdS2763?{kind:'literal',value:true}:p.constraints_json?.requiredWhen??exact,
      provenance:{...p.truth_metadata.provenance as object,consumer_input_role_v1:objectIds.has(p.parameter_id)?'OBJECT_FACT':'ADVANCED_OPTION'},
      guide}};
  });
  const resources=definition.resources.map(r=>{
    const source=r.row_id.includes('rotband')?pack.sources[1]:pack.sources[0];
    const unresolved=r.row_id.endsWith('undetermined'),service=r.unit_id==='m2';
    const {row_sha256:_sha,...body}=r;
    const result={...body,source_metadata:{...r.source_metadata,sourceRole:unresolved?'UNRESOLVED_APPLICATION_SCOPE':service?'MEASURED_OPERATION_SCOPE_NOT_LABOUR_PRODUCTIVITY':'PINNED_MANUFACTURER_APPROXIMATE_MATERIAL_RATE',
      normativeTrace:unresolved?[]:[{sourceId:source.id,normId:pack.contract+':'+(r.row_id.includes('rotband')?'rotband-10mm':'betogrund'),sourceDocument:source.titleRu,sourceLocator:service?'Порядок работ, p2':'Расход, p2; Бетогрунд такжеp1',sourceSnapshotHash:source.sha256}],
      sourceNormQuantityAccepted:!unresolved&&!service,physicalLabourHourNormAccepted:false,approximatePlanningQuantity:!service,
      source_artifact_sha256:source.sha256,official_url:source.officialUrl,full_technical_acceptance:false},
      resource_graph:{...r.resource_graph,operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:prefix,groupTitleRu:'Гипсовая штукатурка КНАУФ: материалы и объёмы операций',
        operationId:prefix+(r.row_id.includes('rotband')?':plaster':':primer'),operationTitleRu:r.row_id.includes('rotband')?'Ручное оштукатуривание Ротбанд, слой10мм':'Нужное грунтование Бетогрундом',processOrdinal:r.row_id.includes('rotband')?20:10,
        completionCriterionRu:'Проверены подготовка, совместимость, нанесение, сушка и завершение; материал сам по себе не закрывает всю операцию.'},
        publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:r.title_ru,nameRu:r.title_ru,
          brandAndModelRu:r.row_id.includes('rotband')?'КНАУФ-Ротбанд':'КНАУФ-Бетогрунд',detailsRu:[pack.scopeRu,service?'Это измеренный объём операции вм², не норма труда в часах. Цена отдельного выполнения не подтверждена.':'Расход производителя приблизительный; фактический расход может отличаться. Потери не добавлены.']}}};
    return {...result,row_sha256:estimateDeterministicHash(result)};
  });
  return {...definition,parameters,resources};
}
export function compileKnaufInteriorPlasterMaterialS2763(primerOnly:boolean,submittedParameters:Record<string,unknown>){
  const target=pack.targets.find(t=>t.primerOnly===primerOnly)!;
  // Isolated material control only. A published successor composes this with
  // the real parent and retains its whole-work primary measure and other rows.
  return compileAutomaticConstructionOwnerR1({catalogId:target.catalogId,compilerVersion:pack.contract,
    primaryMeasureParameterId:primerOnly?'betogrund_actual_area_m2':'q',definition:knaufInteriorPlasterMaterialDefinitionS2763(primerOnly),submittedParameters});
}
