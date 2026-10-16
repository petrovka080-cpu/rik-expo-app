// Exact EUROFLEX Recycling 50 mm material owner through the shared compiler.
// Catalog identity belongs to the governed publisher; this module allocates none.
import pack from '../../../../data/estimate-benchmarks/source-packs/euroflex-recycling50-materials-s27-75.json';
import {buildAutomaticConstructionOwnerR1,compileAutomaticConstructionOwnerR1,
  unresolvedApplicationNormTruthR1,type AutomaticOwnerDefinition,
  type AutomaticParameterSpec,type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {effectivePurchaseBalanceExpressionsR1,effectiveResourceQuantityParameterId} from './effectivePurchaseBalanceR1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';

export const euroflexRecycling50MaterialContractR1=pack.contract;
export const euroflexRecycling50SourcePackR1=pack;
export const euroflexRecycling50PrefixR1='euroflex:recycling-50mm';
const prefix=euroflexRecycling50PrefixR1;
// Whole millimetres keep the modular predicate exact at the canonical
// FormulaGraph scale; a decimal input beyond its scale must not round into fit.
const length='surface_length_along_rows_mm',width='surface_width_across_rows_mm';
export const euroflexRecycling50PrimaryMeasureParameterIdR1=effectiveResourceQuantityParameterId(prefix+':installed-area');
const areaOutput=euroflexRecycling50PrimaryMeasureParameterIdR1;
const fraction=`(${length}/500-floor(${length}/500))+(${width}/500-floor(${width}/500))`;
const valid={kind:'formula_greater_than' as const,expression:`1-ceil(${fraction})`,unitId:'pcs',value:0};
const invalid={kind:'formula_greater_than' as const,expression:`ceil(${fraction})`,unitId:'pcs',value:0};
const demands={full:`${areaOutput}/0.25-floor((${width}/500)/2)`,half:`2*floor((${width}/500)/2)`};
const sourceTrace=(source:typeof pack.sources[number])=>({id:source.id,sha:source.sha256,url:source.officialUrl,locator:source.locatorRu});
const pds=sourceTrace(pack.sources[0]),installation=sourceTrace(pack.sources[1]);
const products={full:pack.products[0].nameRu,half:pack.products[1].nameRu};
const gaps=pack.openNeeds.map(gap=>[gap.key,gap.nameRu,gap.unitId,gap.category,gap.reasonRu] as const);
function assertExactProductPack(){
  if(pack.geometry.rowModuleMm!==500||pack.applicability.productListedMaximumFreeFallHeightM!==1.5
    ||pack.products.length!==2||pack.products[0].role!=='full'||pack.products[1].role!=='half'
    ||pack.products[0].lengthMm!==500||pack.products[0].widthMm!==500||pack.products[0].thicknessMm!==50
    ||pack.products[1].lengthMm!==500||pack.products[1].widthMm!==250||pack.products[1].thicknessMm!==50
    ||pack.products[0].unitId!=='pcs'||pack.products[1].unitId!=='pcs'
    ||pack.products[0].nominalAreaM2!=='0.25'||pack.products[1].nominalAreaM2!=='0.125'
    ||pack.sources.length!==2||pack.openNeeds.length!==8||pack.fullTechnicalAcceptance!==false)
    throw Error('EUROFLEX_EXACT_RECYCLING_50MM_PRODUCT_PACK_REQUIRED');
}

export function euroflexRecycling50MaterialDefinitionR1():AutomaticOwnerDefinition {
  assertExactProductPack();
  const ordinary:AutomaticParameterSpec[]=[
    {id:length,title:'Длина прямоугольного участка вдоль рядов, мм',valueType:'integer',unitId:'mm',kind:'ordinary',min:1},
    {id:width,title:'Ширина прямоугольного участка поперёк рядов, мм',valueType:'integer',unitId:'mm',kind:'ordinary',min:1},
  ];
  const conditional:AutomaticParameterSpec[]=[
    {id:'equipment_max_free_fall_height_m',title:'Наибольшая высота свободного падения с оборудования, м (для этого изделия — до 1,5 м)',valueType:'decimal',unitId:'m',kind:'conditional',min:0,max:1.5,requiredWhen:valid},
    {id:'prepared_base_condition',title:'Пригодность готового основания под выбранное покрытие',valueType:'enum',unitId:null,kind:'conditional',requiredWhen:valid,
      values:[pack.applicability.preparedBaseValueRu]},
    {id:'fall_zone_condition',title:'Соответствие размеров покрытия зонам падения оборудования',valueType:'enum',unitId:null,kind:'conditional',requiredWhen:valid,
      values:[pack.applicability.fallZoneValueRu]},
  ];
  const rows:AutomaticRowSpec[]=[];
  const add=(key:string,title:string,unitId:string,expression:string,extra:Partial<AutomaticRowSpec>={})=>rows.push({
    rowId:prefix+':'+key,formulaId:prefix+':formula:'+key,section:'Резиновое покрытие EUROFLEX Recycling 50 мм',
    category:'material',title,unitId,expression,procurement:false,costTreatment:'INFORMATIONAL_SCOPE',inclusion:valid,...extra});
  add('installed-area','Измеренная площадь прямоугольного покрытия','m2',`${length}*${width}/1000000`,{category:'other',inclusion:undefined,
    effectiveQuantityOutput:{parameterId:areaOutput,unitId:'m2'}});
  for(const role of ['full','half'] as const) {
    const demand=demands[role],owner=prefix+':'+role+'-order';
    const consumedOutput=effectiveResourceQuantityParameterId(prefix+':'+role+'-consumed');
    // A zero installed half count does not erase an authored spare order or
    // unknown reserve. Both supply owners retain their existing manual state.
    const inclusion=valid;
    for(const [suffix,title,min] of [['usable_stock_pcs','Пригодные плитки в наличии',0],['reserve_pcs','Плитки, которые нужно оставить в резерве',0],['supply_quantum_pcs','Количество плиток в одной партии поставки, шт.',1]] as const)
      conditional.push({id:role+'_'+suffix,title:title+': '+products[role],valueType:'integer',unitId:'pcs',kind:'conditional',min,requiredWhen:inclusion});
    const specification=role+'_supply_specification';
    conditional.push({id:specification,title:'Цвет плитки и условия поставки: '+products[role],valueType:'text',unitId:null,kind:'conditional',requiredWhen:inclusion});
    const stock=role+'_usable_stock_pcs',reserve=role+'_reserve_pcs',quantum=role+'_supply_quantum_pcs';
    const balance=effectivePurchaseBalanceExpressionsR1({ownerRowId:owner,orderUnitId:'pcs',consumed:consumedOutput,stock,reserve,quantum});
    add(role+'-consumed','Расход по раскладке: '+products[role],'pcs',demand,{inclusion,purchaseBalanceOwnerRowId:owner,
      effectiveQuantityOutput:{parameterId:consumedOutput,unitId:'pcs'}});
    add(role+'-order',products[role],'pcs',`ceil(max(0,${consumedOutput}+${reserve}-${stock})/${quantum})*${quantum}`,
      {inclusion:undefined,...balance.owner,procurement:true,costTreatment:'OWN_COST',inputParameterIds:[specification,
        'equipment_max_free_fall_height_m','prepared_base_condition','fall_zone_condition'],titleParameterIds:[specification]});
    add(role+'-packages','Партии поставки к заказу: '+products[role],'item',balance.packages,{inclusion:undefined,purchaseBalanceOwnerRowId:owner});
    add(role+'-remaining','Остаток плитки после укладки: '+products[role],'pcs',balance.remaining,{inclusion:undefined,purchaseBalanceOwnerRowId:owner});
    add(role+'-free','Свободный остаток сверх резерва: '+products[role],'pcs',balance.free,{inclusion:undefined,purchaseBalanceOwnerRowId:owner});
    for(const [suffix,title,expression] of [['shortage','Недостаток материала для укладки',balance.consumptionShortage],['reserve-deficit','Непокрытый резерв',balance.reserveDeficit]] as const)
      add(role+'-'+suffix,title+': '+products[role],'pcs',expression,{purchaseBalanceOwnerRowId:owner,inclusion:{kind:'formula_greater_than',expression,unitId:'pcs',value:0}});
  }
  conditional.push({id:'unresolved_layout_quantity',title:'Раскладка и резка для немодульного участка',valueType:'decimal',unitId:'item',kind:'conditional',min:0});
  add('open-layout','Раскладка и резка для участка с подгонкой плит','item','unresolved_layout_quantity',{category:'work',costTreatment:'OWN_COST',inclusion:invalid});
  for(const [key,title,unit,category] of gaps) {
    const id='unresolved_'+key.replaceAll('-','_');
    conditional.push({id,title,valueType:'decimal',unitId:unit,kind:'conditional',min:0});
    add('open-'+key,title,unit,id,{category,costTreatment:'OWN_COST',inclusion:undefined});
  }
  const built=buildAutomaticConstructionOwnerR1({contract:euroflexRecycling50MaterialContractR1,semanticOwner:prefix,sourceId:pack.sourceId,normId:pack.normId,
    sourceMetadata:{source_title:pack.sourceTitleRu,source_document_version:pack.contract,definition_hash:estimateDeterministicHash(pack),
      artifact_sha256:pack.sourceManifestSha256,exact_locator:pack.sources.map(source=>`${source.id}: ${source.officialUrl}; ${source.locatorRu}; SHA256 ${source.sha256}`).join(' | ')},
    applicabilityRu:'Прямоугольный участок без внутренних препятствий. Полные и заводские половинные плитки Recycling толщиной 50 мм, шаг раскладки 0,5 м, фиксированное направление рядов. Пригодность основания, примыкания, зоны падения и приёмка системы проверяются отдельно.',
    ordinary,profile:[],conditional,rows,deferMissingProjectFactsToRows:true,
    excludedUnownedAssumptions:['Труд, клей, основание и завершение не нормированы размерами плит.','Заводские половинные плитки не заменяются обрезками целых плит; другая толщина и система Softsystem требуют отдельного расчёта.','Наличие, резерв, поставка и цены не заполнены нулями или процентом отходов.']});
  return {...built,parameters:built.parameters.map(parameter=>{
    const unresolved=parameter.parameter_id.startsWith('unresolved_');
    return {...parameter,truth_metadata:unresolved?unresolvedApplicationNormTruthR1(parameter.truth_metadata,
      parameter.parameter_id==='unresolved_layout_quantity'?'Нужны подтверждённая карта раскроя и измеренные потери; модульная раскладка к этому участку неприменима.':gaps.find(g=>'unresolved_'+g[0].replaceAll('-','_')===parameter.parameter_id)![4]):
      parameter.truth_metadata.visibility_role==='INTERNAL_ONLY'?parameter.truth_metadata:{...parameter.truth_metadata,source_confirmation_required:false,
        provenance:{consumer_input_role_v1:'OBJECT_FACT'}}};
  }),resources:built.resources.map(resource=>{
    const gap=resource.row_id.includes(':open-'),{row_sha256:_old,...body}=resource;
    const value={...body,...(resource.row_id===prefix+':open-installation-labor'?{row_type:'labor'}:{}),source_metadata:{...resource.source_metadata,
      sourceRole:gap?'UNRESOLVED_APPLICATION_NORM':'PROJECT_GEOMETRY_DERIVED_LAYOUT',sourceNormQuantityAccepted:!gap,
      full_technical_acceptance:false,manufacturerDimensionsOnly:!gap,nominalLayoutNotInstallationAcceptance:true,
      normativeTrace:gap?[]:[pds,installation].map(source=>({sourceId:source.id,normId:'recycling50-rectangular-t-joints',source_definition_hash:source.sha,
        exact_locator:source.locator,official_url:source.url,sourceRole:'MANUFACTURER_PRODUCT_DIMENSIONS_WITH_EXPLICIT_PROJECT_GEOMETRY'}))},
      resource_graph:{...resource.resource_graph,fullTechnicalAcceptance:false,
        ...(resource.resource_graph.costTreatment==='INFORMATIONAL_SCOPE'?{derivedQuantityEditPolicyV1:{
          contractVersion:'canonical-derived-quantity-edit-policy/v1',mode:'PARAMETERS_ONLY',unitId:resource.unit_id,
          parameterIds:[...built.formulas.find(formula=>formula.formula_id===resource.formula_id)!.input_parameter_ids],
          reasonRu:'Расход полных и половинных плиток и площадь меняются через фактические размеры участка и проверенную раскладку.'}}:{}),
        operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:prefix,groupTitleRu:'Покрытие площадки плиткой EUROFLEX Recycling толщиной 50 мм',
          operationId:prefix+(gap?':completion':':slab-layout'),operationTitleRu:gap?'Дополнительные работы и приёмка':'Плиты по раскладке со смещением швов',processOrdinal:gap?30:10,
          completionCriterionRu:gap?'Применимый состав и его расчёт подтверждены.':'Геометрия проверена; полный и половинный форматы учтены раздельно.'},
        publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:resource.title_ru,nameRu:resource.title_ru,
          brandAndModelRu:null,specificationRu:null,detailsRu:gap?['Применимость, количество и цена требуют отдельного подтверждения.']:
            ['В каждом втором ряду используются заводские половинные плитки; резка целых плит не принята.','Номинальные размеры не подтверждают отсутствие подгонки на объекте.','Соединительные штифты входят в изделие; отдельная покупка не добавлена.','Монтаж, основание, клей и приёмка остаются отдельными потребностями.']}}};
    return {...value,row_sha256:estimateDeterministicHash(value)};
  })};
}
export function compileEuroflexRecycling50MaterialsR1(catalogId:string,input:Record<string,unknown>) {
  if(!catalogId.trim())throw Error('ACTUAL_OR_EXPLICIT_DRAFT_CATALOG_ID_REQUIRED');
  return compileAutomaticConstructionOwnerR1({compilerVersion:euroflexRecycling50MaterialContractR1,catalogId,primaryMeasureParameterId:areaOutput,
    definition:euroflexRecycling50MaterialDefinitionR1(),submittedParameters:input});
}
