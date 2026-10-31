import pack from '../../../../data/estimate-benchmarks/source-packs/road-platform-150-plus-50-s27-36.json';
import {buildAutomaticConstructionOwnerR1,type AutomaticParameterSpec,type AutomaticRowSpec,type AutomaticOwnerDefinition} from './automaticConstructionOwnerR1';
import {compileCanonicalEstimateCore} from '../backendPlatform/canonicalEstimateCompileCore';
import {effectivePurchaseBalanceExpressionsR1} from './effectivePurchaseBalanceR1';
import {GRAVEL_BASE_DEFINITION_S2735} from './gravelBaseOperationS2735';
import {ASPHALT_INSTALL_KRER27_PARAMETERS,ASPHALT_INSTALL_KRER27_FORMULAS,ASPHALT_INSTALL_KRER27_RESOURCES,ASPHALT_INSTALL_KRER27_RUNTIME_INPUT,ASPHALT_INSTALL_KRER27_RUNTIME_CLASSIFICATION,ASPHALT_INSTALL_KRER27_RUNTIME_SOURCE_IDS,ASPHALT_INSTALL_KRER27_SOURCE_PACK_SHA256,ASPHALT_INSTALL_KRER27_SOURCE_ID,ASPHALT_INSTALL_KRER27_SOURCE_METADATA} from './asphaltInstallKrer27ProfileR1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';

export const ROAD_PLATFORM_CONTRACT_S2736=pack.contract;
export const ROAD_PLATFORM_WORK_KEY_S2736='road_platform_crushed_stone_150mm_hot_asphalt_50mm';
export const ROAD_PLATFORM_CATALOG_S2736='canonical-work:master:'+ROAD_PLATFORM_WORK_KEY_S2736;
export const ROAD_PLATFORM_SOURCE_ID_S2736='kg_krer27_04_005_01_plus_ready_hot_asphalt_s2736';
export const ROAD_PLATFORM_NORM_ID_S2736='KRER27-04-005-01-PLUS-27-06-020-01-021-01';
export const ROAD_PLATFORM_SOURCE_METADATA_S2736={
  source_title:'КРЕР27: однослойное щебёночное основание15см и готовая операция горячего асфальта50мм',
  source_authority:pack.source.authority,source_document_version:ROAD_PLATFORM_CONTRACT_S2736,
  official_url:pack.source.url,artifact_sha256:pack.source.sha256,
  definition_hash:'eacb46e40565cade13ea79389e4855ff4852be5f5922433ce2b013bb083b52bb',
  exact_locator:pack.source.locator+'; '+ASPHALT_INSTALL_KRER27_SOURCE_METADATA.exact_locator,
  use_restriction:'Выбранный предварительный конструктив: однослойное основание15см из щебняМ1200 40–70мм с расклинцовкой10–20мм, на принятом земляном полотне; поверх один слой50мм горячей плотной мелкозернистой смеси. Не проект для любого объекта. Другие толщины, прочность, слои, грунт и водоотвод требуют своего решения.',
};
if(pack.reusedOperations[0].sourcePackSha256!==ASPHALT_INSTALL_KRER27_SOURCE_PACK_SHA256)throw Error('ROAD_PLATFORM_READY_ASPHALT_VERSION_MISMATCH');
if(pack.source.sha256!==ASPHALT_INSTALL_KRER27_SOURCE_METADATA.artifact_sha256||pack.source.url!==ASPHALT_INSTALL_KRER27_SOURCE_METADATA.official_url)throw Error('ROAD_PLATFORM_DIFFERENT_NORMATIVE_DOCUMENTS_REQUIRE_SEPARATE_BINDINGS');

const confirmed={kind:'equals' as const,parameterId:'road_applicability_mode',value:'CONFIRMED_PROJECT_FACTS'};
const profile=(id:string,title:string,valueType:AutomaticParameterSpec['valueType'],unitId:string|null,defaultValue:string|number,rest:Partial<AutomaticParameterSpec>={}):AutomaticParameterSpec=>({id,title,valueType,unitId,kind:'profile',defaultValue,...rest});
const facts=['formation_accepted','base_150mm_m1200_approved','asphalt_50mm_approved','layer_interface_approved'];
const baseSupplyLabels={stone40:'щебень40–70ммМ1200',stone10:'щебень10–20ммМ1200',water:'вода для поливки основания'} as const;
const parameters:AutomaticParameterSpec[]=[
  profile('road_applicability_mode','Применимость: выбранный предварительный15+5см профиль либо четыре подтверждённых проектных факта','enum',null,'PRELIMINARY_PROFILE',{values:['PRELIMINARY_PROFILE','CONFIRMED_PROJECT_FACTS']}),
  profile('base_thickness_mm','Выбранное однослойное основание15см; эта операция применяет только150мм','integer','mm',150,{min:150,max:150}),
  profile('base_stone_quantum_m3','Предварительная кратность поставки каждого вида щебня1м³; заменить условиями поставщика','decimal','m3',1,{min:0.000001}),
  profile('base_water_quantum_l','Предварительная кратность поставки воды1000л; заменить условиями источника','decimal','l',1000,{min:0.000001}),
  profile('base_toolkits','Предварительно один комплект оснастки подрядчика; состав раскрыт и включён в труд, количество звеньев уточнить','integer','set',1,{min:1}),
  ...(['stone40','stone10','water'] as const).flatMap(key=>[
    profile('base_'+key+'_stock',`Предварительно0 пригодного наличия: ${baseSupplyLabels[key]}; заменить обследованным наличием`,'decimal',key==='water'?'l':'m3',0,{min:0}),
    profile('base_'+key+'_reserve',`Предварительно0 сохраняемого резерва: ${baseSupplyLabels[key]}`,'decimal',key==='water'?'l':'m3',0,{min:0}),
  ]),
  ...facts.map((id):AutomaticParameterSpec=>({id:'road_'+id,title:{formation_accepted:'Принято подготовленное земляное полотно; его разработка и укрепление вне этой сметы',base_150mm_m1200_approved:'Проектом приняты однослойные150мм, щебеньМ1200 40–70мм и расклинцовка10–20мм',asphalt_50mm_approved:'Проектом принят один горячий плотный мелкозернистый слой50мм и паспорт смеси',layer_interface_approved:'Приняты отметки, уклоны, несущая способность, интерфейс слоёв и водоотвод'}[id]!,valueType:'enum',unitId:null,kind:'conditional',values:['YES'],requiredWhen:confirmed})),
];
const costScopes=[['delivery','Доставка двух фракций щебня','base_delivery_trips','trip'],['extra_mobilization','Дополнительная мобилизация машин только основания','base_extra_mobilization_count','service'],['qa','Контроль щебёночного основания','base_qa_services_count','service']] as const;
const extraFacts:AutomaticParameterSpec[]=costScopes.flatMap(([key,title,count,unit]):AutomaticParameterSpec[]=>[
  {id:'base_'+key+'_cost_mode',title:title+': отдельно оплачивается или включено в подтверждённую стоимость',kind:'ordinary',valueType:'enum',unitId:null,values:['SEPARATE','INCLUDED']},
  {id:count,title:title+': фактически отдельно оплачиваемое количество',kind:'conditional',valueType:'integer',unitId:unit,min:1,requiredWhen:{kind:'equals',parameterId:'base_'+key+'_cost_mode',value:'SEPARATE'}},
  {id:'base_'+key+'_included_reference',title:title+': ссылка на договор/спецификацию, где эта услуга включена, и оплачиваемый владелец',kind:'conditional',valueType:'text',unitId:null,requiredWhen:{kind:'equals',parameterId:'base_'+key+'_cost_mode',value:'INCLUDED'}},
]);
const rows:AutomaticRowSpec[]=[];
const includedOwners=new Map<string,string>();
const scale='area_m2/1000';
function add(row:Omit<AutomaticRowSpec,'formulaId'>){rows.push({...row,formulaId:'road_base_'+row.rowId.replace(/[^a-z0-9_]/g,'_')+'_v1'});}
add({rowId:'road-base:scope:formation',section:'Граница конструкции',category:'service',title:'Принятое земляное полотно; земляные работы не посчитаны этой операцией',unitId:'m2',expression:'area_m2',costTreatment:'INFORMATIONAL_SCOPE'});
const rate=pack.source.ratesPer1000M2;
for(const [key,title,unit,amount] of [
  ['stone40','Щебень из природного камня40–70мм, марка1200; основной материал основания15см','m3',rate.stone40to70M1200M3],
  ['stone10','Щебень из природного камня10–20мм, марка1200; расклинцовка основания','m3',rate.stone10to20M1200M3],
  ['water','Вода для нормативной поливки щебёночного основания;30м³/1000м², не вода асфальтовых катков','l',rate.waterM3*1000],
] as const){
  const rowId='road-base:material:'+key;
  const consumed=`${scale}*${amount}`,stock='base_'+key+'_stock',reserve='base_'+key+'_reserve',quantum=key==='water'?'base_water_quantum_l':'base_stone_quantum_m3';
  const balance=effectivePurchaseBalanceExpressionsR1({ownerRowId:rowId,orderUnitId:unit,consumed,stock,reserve,quantum});
  add({rowId,section:'Материалы щебёночного основания',category:'material',title,unitId:unit,expression:`ceil(max(0,(${consumed})+${reserve}-${stock})/(${quantum}))*(${quantum})`,procurement:true,...balance.owner});
}
add({rowId:'road-base:labor:workers',section:'Укладка, профилирование и уплотнение основания',category:'construction_work',title:'Рабочие-строители разряд2.5;КРЕР27-04-005-01,33.29чел.-ч/1000м²',unitId:'man_hour',expression:`${scale}*${rate.workerManH}`});
const fleet=[
  ['loader','Автопогрузчик5т',rate.loader5tMachineH],['bulldozer','Бульдозер79кВт на других видах строительства',rate.bulldozer79kwMachineH],
  ['grader','Автогрейдер среднего типа99кВт',rate.grader99kwMachineH],['roller8','Каток гладкий8т: только щебёночный слой',rate.roller8tMachineH],
  ['roller13','Каток гладкий13т: только щебёночный слой',rate.roller13tMachineH],['water-bowser','Поливомоечная машина6000л: только щебёночный слой',rate.waterBowser6000lMachineH],
  ['stone-spreader','Распределитель каменной мелочи',rate.stoneSpreaderMachineH],
] as const;
for(const [key,title,hours] of fleet){
  const rowId='road-base:equipment:'+key;
  add({rowId,section:'Машины основания; отдельные часы слоя',category:'equipment',title,unitId:'machine_hour',expression:`${scale}*${hours}`});
  for(const [part,category,label] of [['operator','construction_work','Машинист'],['fuel','service','Эксплуатационное топливо и жидкости']] as const){
    const child='road-base:included:'+part+':'+key;includedOwners.set(child,rowId);
    add({rowId:child,section:'Включено в ставку машин основания',category,title:label+': '+title+'; отдельной оплаты нет',unitId:part==='operator'?'man_hour':'machine_hour',expression:`${scale}*${hours}`,costTreatment:'INCLUDED_IN_RESOURCE_ROWS'});
  }
}
for(const key of ['shovel','rake','gloves','goggles']){
  const source=GRAVEL_BASE_DEFINITION_S2735.resources.find(r=>r.row_id==='gravel-base:material:trench:tool:'+key);
  if(!source)throw Error('ROAD_PLATFORM_READY_TOOL_MISSING:'+key);
  const rowId='road-base:tool:'+key;includedOwners.set(rowId,'road-base:labor:workers');
  add({rowId,section:'Раскрытая оснастка подрядчика',category:'material',title:source.title_ru+' в оснастке звена подрядчика; входит в труд, отдельно не закупается',unitId:'set',expression:'base_toolkits',costTreatment:'INCLUDED_IN_RESOURCE_ROWS'});
}
for(const [key,title,id,unit] of costScopes){
  const mode='base_'+key+'_cost_mode',reference='base_'+key+'_included_reference';
  add({rowId:'road-base:scope:cost-'+key,section:'Сохранённые границы оплаты',category:'service',title:title+': режим оплаты и ссылка включённой стоимости; контрольная строка не оплачивается',unitId:'m2',expression:'area_m2',costTreatment:'INFORMATIONAL_SCOPE',inputParameterIds:[mode,reference],titleParameterIds:[mode,reference]});
  add({rowId:'road-base:project:'+id,section:'Проектная логистика и контроль',category:'service',title:title+': только отдельная оплата; количество из проекта',unitId:unit,expression:id,inclusion:{kind:'equals',parameterId:mode,value:'SEPARATE'},inputParameterIds:[mode]});
}
const base=buildAutomaticConstructionOwnerR1({contract:ROAD_PLATFORM_CONTRACT_S2736,semanticOwner:'road-base-krer27-04-005-01',sourceId:ROAD_PLATFORM_SOURCE_ID_S2736,normId:'KRER27-04-005-01',sourceMetadata:ROAD_PLATFORM_SOURCE_METADATA_S2736,applicabilityRu:ROAD_PLATFORM_SOURCE_METADATA_S2736.use_restriction,
  ordinary:[{id:'area_m2',title:'Чистая площадь двух совместимых слоёв площадки; обмер или проект',kind:'ordinary',valueType:'decimal',unitId:'m2',min:0.000001},...extraFacts.filter(p=>p.kind==='ordinary')],profile:parameters.filter(p=>p.kind==='profile'),conditional:[...parameters,...extraFacts].filter(p=>p.kind==='conditional'),rows,
  deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:pack.exclusions});

const withComposition=(resources:AutomaticOwnerDefinition['resources'],stage:'base'|'asphalt')=>resources.map((r)=>{
  const included=includedOwners.get(r.row_id);
  const result={...r,section:(stage==='base'?'Основание15см — ':'Асфальт50мм — ')+r.section,resource_graph:{...r.resource_graph,
    inputParameterIds:[...(r.resource_graph.inputParameterIds as string[]??[]),'road_applicability_mode',...facts.map(id=>'road_'+id)],
    scopeContextParameterIds:[...(r.resource_graph.scopeContextParameterIds as string[]??[]),'base_thickness_mm'],
    ...(included?{includedInResourceOwnerRowId:included}:{}),
    operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:'road-platform-150-plus-50',groupTitleRu:'Выбранная площадка: щебёночное основание15см → асфальт50мм',operationId:stage,operationTitleRu:stage==='base'?'Нормативное однослойное щебёночное основание':'Готовая укладка асфальта с собственным уплотнением',completionCriterionRu:'Подтвердить проект, материалы, доставку и применимый контроль слоёв'},
  },source_metadata:{...r.source_metadata,operationInstanceId:stage,reusedOperation:stage==='asphalt'?{module:'asphaltInstallKrer27ProfileR1',sourcePackSha256:ASPHALT_INSTALL_KRER27_SOURCE_PACK_SHA256,originalRowId:r.row_id,formulaArithmeticPreserved:true}:null,projectApprovalClaimed:false}};
  return {...result,row_sha256:estimateDeterministicHash({...result,row_sha256:''})};
});
const asphaltParameters=ASPHALT_INSTALL_KRER27_PARAMETERS.filter(p=>p.parameter_id!=='area_m2').map((p)=>{
  // The older public parameter type omits publisher display fields. Treat
  // them as unknown until their actual imported values have been checked.
  const metadata=p as typeof p&{unit_id?:unknown;title_ru?:unknown};
  const unit=metadata.unit_id,title=metadata.title_ru,truth=p.truth_metadata;
  if((unit!==null&&typeof unit!=='string')||typeof title!=='string'||!truth)throw Error('ROAD_PLATFORM_READY_PARAMETER_METADATA_MISSING:'+p.parameter_id);
  return {...p,unit_id:unit,title_ru:p.parameter_id==='layer_thickness_mm'?'Выбранный слой горячего асфальта50мм; другой слой требует другого профиля':title,
    truth_metadata:ASPHALT_INSTALL_KRER27_RUNTIME_CLASSIFICATION[p.parameter_id]==='ASSUMPTION'?{...truth,visibility_role:'USER_INPUT'}:truth,
    constraints_json:p.parameter_id==='layer_thickness_mm'?{...p.constraints_json,min:50,max:50}:p.constraints_json};
});
type RoadCompositeDefinition=Omit<AutomaticOwnerDefinition,'runtimeClassification'>&{runtimeClassification:Readonly<Record<string,'ASSUMPTION'|'NORMATIVE'|'DERIVED'>>};
// Two sets of norms belong to the same verified physical KRER PDF. The
// published baseline binds that combined document; original parameter guides
// and per-row normative traces remain untouched. Unknown documents fail closed.
const combinedRuntimeSourceIds=Object.fromEntries(Object.entries({...base.runtimeSourceIds,...ASPHALT_INSTALL_KRER27_RUNTIME_SOURCE_IDS}).map(([id,sources])=>{
  if(sources.some(source=>source!==ROAD_PLATFORM_SOURCE_ID_S2736&&source!==ASPHALT_INSTALL_KRER27_SOURCE_ID))throw Error('ROAD_PLATFORM_UNKNOWN_NORMATIVE_DOCUMENT:'+id);
  return [id,sources.length?[ROAD_PLATFORM_SOURCE_ID_S2736]:[]];
}));
export const ROAD_PLATFORM_DEFINITION_S2736:RoadCompositeDefinition=Object.freeze({
  parameters:[...base.parameters,...asphaltParameters].map((p,ordinal)=>({...p,ordinal})),
  formulas:[...base.formulas,...ASPHALT_INSTALL_KRER27_FORMULAS],
  resources:[...withComposition(base.resources,'base'),...withComposition(ASPHALT_INSTALL_KRER27_RESOURCES,'asphalt')].map((r,ordinal)=>({...r,ordinal})),
  runtimeInput:{...base.runtimeInput,...ASPHALT_INSTALL_KRER27_RUNTIME_INPUT},
  runtimeClassification:{...base.runtimeClassification,...ASPHALT_INSTALL_KRER27_RUNTIME_CLASSIFICATION},
  runtimeSourceIds:combinedRuntimeSourceIds,ordinaryParameterIds:['area_m2'],
});
for(const [kind,key] of [['parameters','parameter_id'],['formulas','formula_id'],['resources','row_id']] as const){const ids=ROAD_PLATFORM_DEFINITION_S2736[kind].map(x=>(x as unknown as Record<string,unknown>)[key]);if(new Set(ids).size!==ids.length)throw Error('ROAD_PLATFORM_IDENTIFIER_COLLISION:'+kind);}
export function compileRoadPlatform150Plus50S2736(submittedParameters:Record<string,unknown>){return compileCanonicalEstimateCore({operation:'compile',compilerVersion:ROAD_PLATFORM_CONTRACT_S2736,catalogId:ROAD_PLATFORM_CATALOG_S2736,primaryMeasureParameterId:'area_m2',parameterDefinitions:definitionCopy(ROAD_PLATFORM_DEFINITION_S2736.parameters),formulaDefinitions:definitionCopy(ROAD_PLATFORM_DEFINITION_S2736.formulas),resourceDefinitions:definitionCopy(ROAD_PLATFORM_DEFINITION_S2736.resources),submittedParameters,confirmedParameters:{...ROAD_PLATFORM_DEFINITION_S2736.runtimeInput},currencyCode:'KGS',priceItems:[],maximumResourceRows:ROAD_PLATFORM_DEFINITION_S2736.resources.length,hashJson:async value=>estimateDeterministicHash(value)});}
function definitionCopy<T>(values:readonly T[]):T[]{return [...values];}
