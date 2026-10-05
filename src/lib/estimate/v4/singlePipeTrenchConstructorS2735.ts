import {buildAutomaticConstructionOwnerR1,compileAutomaticConstructionOwnerR1,type AutomaticParameterSpec,type AutomaticRowSpec,type AutomaticInclusionCondition} from './automaticConstructionOwnerR1';
import {effectivePurchaseBalanceExpressionsR1} from './effectivePurchaseBalanceR1';
import {PIPE_BEDDING_BACKFILL_PARAMETERS as childParameters,PIPE_BEDDING_BACKFILL_FORMULAS as childFormulas,
  PIPE_BEDDING_BACKFILL_RESOURCES as childResources,PIPE_BEDDING_BACKFILL_SOURCE_METADATA as childSource} from './pipeBeddingBackfillR1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';

export const SINGLE_PIPE_TRENCH_CATALOG_ID_S2735='canonical-work:expanded:utility_trench';
export const SINGLE_PIPE_TRENCH_SOURCE_ID_S2735='project_single_pipe_trench_actual_geometry_s27_35';
export const SINGLE_PIPE_TRENCH_NORM_ID_S2735='project:single-pipe-trench:geometry-and-supply:s27-35.v1';
export const SINGLE_PIPE_TRENCH_CONTRACT_S2735='single-pipe-trench-constructor:s27-35.v1';
export const SINGLE_PIPE_TRENCH_SOURCE_METADATA_S2735={
  source_title:'Геометрия прямоугольной траншеи одного трубопровода по фактическим размерам; повторно используемая операция постели и засыпки',
  source_authority:'Фактический проект, ведомость объёмов, поставщик материалов и инженер объекта; подтверждение ещё требуется',
  source_document_version:SINGLE_PIPE_TRENCH_CONTRACT_S2735,
  definition_hash:'c3948621e8be3dc8dcfa8240669fb8eceb518b2a36a6626acf12aaae79146613',
  artifact_sha256:'c3948621e8be3dc8dcfa8240669fb8eceb518b2a36a6626acf12aaae79146613',
  exact_locator:'source-packs/single-pipe-trench-constructor-s27-35.json: одна круглая труба, постоянное прямоугольное сечение; объёмы по размерам, коэффициенты поставки/повторного использования и часы только по фактам',
  source_kind:'PROJECT_DIMENSIONS_AND_SUPPLIER_SPECIFICATION_REQUIRED',
  use_restriction:'Не назначает ширину, глубину, крепление, уплотнение и нормы труда. Не применяется к откосам, нескольким трубам, колодцам, переборам и восстановлению покрытия без отдельных операций. Труба, соединения и испытание сети не включены.',
};
const eq=(parameterId:string,value:string):AutomaticInclusionCondition=>({kind:'equals',parameterId,value});
const required=(parameterId:string)=>eq(parameterId,'REQUIRED');
const positive=(parameterId:string):AutomaticInclusionCondition=>({kind:'greater_than',parameterId,value:0});
const and=(...operands:AutomaticInclusionCondition[]):AutomaticInclusionCondition=>({kind:'and',operands});
const ids=new Map([['pbb_route_length_m','length_m'],['pbb_pipe_outside_diameter_mm','diameter_mm']]);
const remap=(x:unknown):any=>typeof x==='string'?ids.get(x)??x:Array.isArray(x)?x.map(remap):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).map(([k,v])=>[k,remap(v)])):x;
const ordinary=(id:string,title:string,unitId:string|null,min=0):AutomaticParameterSpec=>({id,title,unitId,valueType:'decimal',kind:'ordinary',min});
const text=(id:string,title:string):AutomaticParameterSpec=>({id,title,unitId:null,valueType:'text',kind:'ordinary'});
const profile=(id:string,title:string,unitId:string|null,defaultValue:number):AutomaticParameterSpec=>({...ordinary(id,title,unitId),kind:'profile',defaultValue});
const ordinaryParameters:AutomaticParameterSpec[]=[
  ordinary('trench_width_m','Фактическая постоянная ширина выемки; откосы не моделируются','m',0.001),
  ordinary('trench_depth_m','Фактическая постоянная глубина выемки','m',0.001),
  ordinary('lower_base_thickness_m','Толщина нижнего основания; явный 0 если его нет','m'),
  ordinary('bedding_loose_per_installed_m3','Поставка рыхлого материала постели на 1 м³ в конструкции: по проекту/плотностям','ratio',0.001),
  ordinary('backfill_loose_per_installed_m3','Поставка рыхлого материала верхней засыпки на 1 м³ в конструкции: по проекту/плотностям','ratio',0.001),
  ordinary('base_loose_per_installed_m3','Поставка нижнего основания на 1 м³ в конструкции: по проекту/плотностям','ratio',0.001),
  ordinary('excavation_worker_h','Фактический труд разработки грунта и подготовки дна; оператор включён','man_hour'),
  ordinary('soil_export_loose_m3','Фактический объём вывоза рыхлого грунта после проектного повторного использования','m3'),
  ordinary('compaction_water_l','Фактическая дополнительная вода для влажности уплотнения; явный 0 если не нужна','l'),
  text('soil_reuse_export_reference','Баланс повторного использования, разрыхления и вывоза грунта по проекту'),
  text('excavation_method_reference','Грунт, доступ, коммуникации и способ разработки по обследованию/ППР'),
  text('machine_rate_scope_reference','Ставки механизмов: энергия/топливо включены; оператор учтён в труде один раз'),
  text('material_delivery_scope_reference','Отдельно оплачиваемые рейсы доставки; перевозка в цене поставщика исключена'),
  {id:'bedding_backfill_supply_mode',title:'Поставка постели и верхней засыпки: разные материалы либо явно совместимая партия',unitId:null,valueType:'enum',kind:'profile',values:['DISTINCT','SHARED'],defaultValue:'DISTINCT'},
  {id:'geotextile_mode',title:'Геотекстиль по проекту: не подтверждён, требуется, либо не требуется',unitId:null,valueType:'enum',kind:'profile',values:['SURVEY_PENDING','REQUIRED','NOT_REQUIRED'],defaultValue:'SURVEY_PENDING'},
  {id:'warning_tape_mode',title:'Сигнальная лента по проекту: не подтверждена, требуется, либо не требуется',unitId:null,valueType:'enum',kind:'profile',values:['SURVEY_PENDING','REQUIRED','NOT_REQUIRED'],defaultValue:'SURVEY_PENDING'},
  {...text('shared_aggregate_designation','Совпадающий продукт/фракция и поставщик общей партии'),kind:'conditional',requiredWhen:eq('bedding_backfill_supply_mode','SHARED')},
  {...text('compatible_aggregate_batch_reference','Подтверждение совместимости общей партии постели и верхней засыпки'),kind:'conditional',requiredWhen:eq('bedding_backfill_supply_mode','SHARED')},
];
const profileParameters:AutomaticParameterSpec[]=[];
const rows:AutomaticRowSpec[]=[];
const bounds=(unitId:string,reasonRu:string,exclusive=false)=>({schemaVersion:'canonical_formula_output_bounds_v1' as const,unitId,reasonRu,...(exclusive?{exclusiveMinimum:0}:{minimum:0})});
const scope=(rowId:string,title:string,unitId:string,expression:string,parameterId?:string,reason?:string):AutomaticRowSpec=>({rowId,section:'Геометрия и объёмы',category:'service',title,unitId,formulaId:rowId.replaceAll(':','_')+'_v1',expression,costTreatment:'INFORMATIONAL_SCOPE',
  ...(parameterId?{effectiveQuantityOutput:{parameterId,unitId}}:{}),...(reason?{formulaOutputBounds:bounds(unitId,reason)}:{})});
const d='diameter_mm/1000';
const pipe=`length_m*3.141592653589793*(${d})*(${d})/4`;
const surround=`length_m*(trench_width_m*(pbb_bedding_thickness_mm/1000+${d}+pbb_surround_cover_above_pipe_mm/1000)-3.141592653589793*(${d})*(${d})/4)`;
const upper=`length_m*trench_width_m*(trench_depth_m-lower_base_thickness_m-pbb_bedding_thickness_mm/1000-${d}-pbb_surround_cover_above_pipe_mm/1000)`;
rows.push(
  {...scope('scope:trench:pipe-clearance','Свободная ширина выемки сверх наружного диаметра трубы','m',`trench_width_m-(${d})`),formulaOutputBounds:bounds('m','Ширина траншеи должна быть больше наружного диаметра трубы',true)},
  scope('scope:trench:excavation','Геометрический объём выемки в естественном состоянии; не объём вывоза','m3','length_m*trench_width_m*trench_depth_m'),
  scope('scope:trench:pipe-displacement','Объём вытеснения одной круглой трубы; поставка трубы не включена','m3',pipe),
  scope('scope:trench:base','Геометрический объём нижнего основания в конструкции','m3','length_m*trench_width_m*lower_base_thickness_m'),
  scope('scope:trench:bedding','Постель и обсыпка: объём в конструкции за вычетом трубы','m3',surround,undefined,'Объём постели и обсыпки не может быть отрицательным'),
  scope('scope:trench:upper-backfill','Верхняя засыпка: объём в конструкции','m3',upper,undefined,'Глубина не вмещает нижнее основание, постель, трубу и покрытие'),
  scope('scope:trench:bottom-area','Площадь подготовки дна; оплачивается фактическим трудом','m2','length_m*trench_width_m','pbb_trench_bottom_preparation_area_m2'),
  scope('scope:trench:bedding-supply','Расход рыхлого материала постели по фактическому коэффициенту поставки','m3',`(${surround})*bedding_loose_per_installed_m3`,'pbb_bedding_surround_installed_volume_m3','Количество материала постели не может быть отрицательным'),
  scope('scope:trench:backfill-supply','Расход рыхлого материала верхней засыпки по фактическому коэффициенту','m3',`(${upper})*backfill_loose_per_installed_m3`,'pbb_selected_backfill_volume_m3','Количество засыпки не может быть отрицательным'),
  {...scope('scope:trench:base-supply','Расход материала нижнего основания по фактическому коэффициенту','m3','length_m*trench_width_m*lower_base_thickness_m*base_loose_per_installed_m3','pbb_foundation_aggregate_volume_m3'),inclusion:positive('lower_base_thickness_m')},
  scope('scope:trench:export-supply','Вывозимый рыхлый грунт по отдельному балансу повторного использования','m3','soil_export_loose_m3','pbb_excess_soil_volume_m3'),
  {rowId:'labor:trench:excavation',section:'Разработка и подготовка дна',category:'labor',title:'Разработка грунта и подготовка дна; оператор учтён здесь',unitId:'man_hour',formulaId:'single_trench_excavation_labor_v1',expression:'excavation_worker_h',inputParameterIds:['excavation_method_reference']},
);
// Original child materials become exact source consumption nodes. Supply is
// owned separately so compatible demands can aggregate before one rounding.
const distinct=eq('bedding_backfill_supply_mode','DISTINCT'),shared=eq('bedding_backfill_supply_mode','SHARED');
function supply(rowId:string,title:string,unitId:string,consumed:string,key:string,inclusion?:AutomaticInclusionCondition,inputParameterIds:string[]=[],titleParameterIds:string[]=[]){
  const stock=key+'_stock',reserve=key+'_reserve',quantum=key+'_quantum';
  profileParameters.push(profile(stock,'Пригодное наличие: '+title,unitId,0),profile(reserve,'Сохраняемый резерв: '+title,unitId,0),{...profile(quantum,'Кратность поставки: '+title,unitId,unitId==='l'?5:1),min:0.000001});
  const balance=effectivePurchaseBalanceExpressionsR1({ownerRowId:rowId,orderUnitId:unitId,consumed,stock,reserve,quantum});
  rows.push({rowId,section:'Поставка материалов',category:'material',title,unitId,formulaId:rowId.replaceAll(':','_')+'_v1',expression:`ceil(max(0,(${consumed})+${reserve}-${stock})/${quantum})*${quantum}`,procurement:true,costTreatment:'OWN_COST',...balance.owner,
    ...(inclusion?{inclusion}:{}),inputParameterIds,titleParameterIds});
}
supply('material:trench:bedding','Поставка постели и обсыпки отдельной спецификации','m3','pbb_bedding_surround_installed_volume_m3','bedding',distinct,['pbb_bedding_material'],['pbb_bedding_material']);
supply('material:trench:upper-backfill','Поставка верхней засыпки отдельной спецификации','m3','pbb_selected_backfill_volume_m3','backfill',distinct,['pbb_backfill_material'],['pbb_backfill_material']);
const sharedId='material:trench:shared-aggregate';
supply(sharedId,'Совместимая общая партия постели и верхней засыпки; одна закупка','m3','pbb_bedding_surround_installed_volume_m3+pbb_selected_backfill_volume_m3','shared_aggregate',shared,['shared_aggregate_designation','compatible_aggregate_batch_reference'],['shared_aggregate_designation']);
for(const [id,title,expression] of [['bedding','постель и обсыпка','pbb_bedding_surround_installed_volume_m3'],['backfill','верхняя засыпка','pbb_selected_backfill_volume_m3']])rows.push({rowId:'allocation:trench:shared:'+id,section:'Распределение общей партии',category:'material',title:'Распределение общей партии — '+title,unitId:'m3',formulaId:'single_trench_shared_allocation_'+id+'_v1',expression,costTreatment:'INCLUDED_IN_RESOURCE_ROWS',purchaseBalanceOwnerRowId:sharedId,inclusion:shared});
supply('material:trench:base','Нижнее основание по отдельной проектной спецификации','m3','pbb_foundation_aggregate_volume_m3','base',positive('lower_base_thickness_m'),['pbb_foundation_aggregate_designation'],['pbb_foundation_aggregate_designation']);
supply('material:trench:geotextile','Геотекстиль по фактической раскладке с нахлёстами','m2','pbb_geotextile_area_m2','geotextile',required('geotextile_mode'),['pbb_geotextile_designation'],['pbb_geotextile_designation']);
supply('material:trench:warning-tape','Сигнальная лента по проекту и фактическим нахлёстам','m','pbb_warning_tape_length_m','warning_tape',required('warning_tape_mode'),['pbb_warning_tape_designation'],['pbb_warning_tape_designation']);
supply('material:trench:compaction-water','Вода для проектной влажности уплотнения','l','compaction_water_l','compaction_water');
for(const [key,title,count] of [['stakes','Колышки разбивки',null],['marking_string','Разбивочный шнур, фактическая длина',null],['marking_paint','Маркировочная краска по фактическому расходу',null],['barrier_tape','Ограждающая лента по схеме рабочей зоны',null],['gloves','Защитные перчатки, пары',null],['goggles','Защитные очки',null],['shovel','Лопата доводки основания',null],['rake','Грабли/правило разравнивания',null],['bags','Мешки упаковки и строительных остатков',null]] as const){
  void count;const unitId=key==='marking_string'||key==='barrier_tape'?'m':key==='marking_paint'?'l':key==='gloves'?'pair':'piece';
  const input='tool_'+key+'_required';ordinaryParameters.push(ordinary(input,title+': подтверждённое количество',unitId));
  supply('material:trench:tool:'+key,title,unitId,input,'tool_'+key);
}
const extension=buildAutomaticConstructionOwnerR1({contract:SINGLE_PIPE_TRENCH_CONTRACT_S2735,semanticOwner:'single-pipe-trench',sourceId:SINGLE_PIPE_TRENCH_SOURCE_ID_S2735,normId:SINGLE_PIPE_TRENCH_NORM_ID_S2735,sourceMetadata:SINGLE_PIPE_TRENCH_SOURCE_METADATA_S2735,
  applicabilityRu:SINGLE_PIPE_TRENCH_SOURCE_METADATA_S2735.use_restriction,ordinary:[...ordinaryParameters.filter(p=>p.kind==='ordinary'),...['pbb_bedding_material','pbb_backfill_material','pbb_foundation_aggregate_designation','pbb_geotextile_designation','pbb_warning_tape_designation'].map(id=>text(id,childParameters.find(p=>p.parameter_id===id)!.title_ru))],profile:[...ordinaryParameters.filter(p=>p.kind==='profile'),...profileParameters],conditional:ordinaryParameters.filter(p=>p.kind==='conditional'),rows,
  deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:['готовая проектная геометрия','850м/OD315 fixture','нормы труда/механизмов','свойства грунта и уплотнение','готовность крепления/водоотлива','инженерное согласование','цены']});
const replacedChildRows=new Set(['rc09:pbb_geotextile','rc09:pbb_foundation_aggregate','rc09:pbb_bedding_surround','rc09:pbb_selected_backfill','rc09:pbb_warning_tape']);
const retained=childResources.filter(r=>!replacedChildRows.has(r.row_id)&&!r.row_id.startsWith('rc09:pbb-bedding-balance:')).map(r=>{
  const x=remap(r) as typeof r;
  const inputParameterIds=[...((x.resource_graph as Record<string,unknown>).inputParameterIds as string[]??[])];
  if(x.row_id==='rc09:pbb_excess_soil_removal'||x.row_id==='rc09:logistics:pbb-removal')inputParameterIds.push('soil_reuse_export_reference');
  if(x.row_id==='rc09:logistics:pbb-delivery')inputParameterIds.push('material_delivery_scope_reference');
  if(x.category==='equipment')inputParameterIds.push('machine_rate_scope_reference');
  return {...x,resource_graph:{...x.resource_graph,inputParameterIds,...(x.row_id==='rc09:pbb_trench_bottom_preparation'||x.row_id==='rc09:pbb_excess_soil_removal'?{costTreatment:'INFORMATIONAL_SCOPE'}:{})},
    source_metadata:{...x.source_metadata,sourceRole:'REUSED_PROJECT_OPERATION_WITH_ACTUAL_GEOMETRY_BINDINGS',originalOperation:{catalogId:'canonical-work:expanded:pipe_bedding_backfill',version:'pipe-bedding-backfill-r1',sourceDefinitionHash:childSource.definition_hash},
      normativeTrace:[{sourceId:SINGLE_PIPE_TRENCH_SOURCE_ID_S2735,normId:SINGLE_PIPE_TRENCH_NORM_ID_S2735,source_title:SINGLE_PIPE_TRENCH_SOURCE_METADATA_S2735.source_title,exact_locator:SINGLE_PIPE_TRENCH_SOURCE_METADATA_S2735.exact_locator,source_definition_hash:SINGLE_PIPE_TRENCH_SOURCE_METADATA_S2735.definition_hash}],projectApprovalClaimed:false}};
});
const formulaIds=new Set(retained.map(r=>r.formula_id));
const removedParameters=new Set(['pbb_bedding_retained_reserve_m3','pbb_bedding_supplier_load_m3','pbb_bedding_surround_installed_volume_m3','pbb_selected_backfill_volume_m3','pbb_foundation_aggregate_volume_m3','pbb_trench_bottom_preparation_area_m2','pbb_excess_soil_volume_m3']);
const modeIds=new Set(['pbb_unsuitable_soil_replacement_mode','pbb_dewatering_mode','pbb_shoring_mode']);
const childParameterDefs=childParameters.filter(p=>!removedParameters.has(p.parameter_id)).map(p=>{
  const x=remap(p) as typeof p;
  const optionalMode=x.parameter_id.startsWith('pbb_geotextile_')?'geotextile_mode':x.parameter_id.startsWith('pbb_warning_tape_')?'warning_tape_mode':null;
  return {...x,...(optionalMode?{required:false,constraints_json:{...x.constraints_json,requiredWhen:required(optionalMode)}}:{}),
    ...(modeIds.has(x.parameter_id)?{constraints_json:{...x.constraints_json,values:['SURVEY_PENDING','NOT_REQUIRED','REQUIRED']}}:{}),
    truth_metadata:{...x.truth_metadata,preliminary_compilation_allowed:true,source_confirmation_required:true,guide:{...(x.truth_metadata.guide as Record<string,unknown>),source_document:SINGLE_PIPE_TRENCH_SOURCE_ID_S2735,source_locator:SINGLE_PIPE_TRENCH_SOURCE_METADATA_S2735.exact_locator,source_snapshot_hash:SINGLE_PIPE_TRENCH_SOURCE_METADATA_S2735.artifact_sha256},fixtureValuesNeverRuntimeDefaults:true}};
});
const allResources=[...retained,...extension.resources].map((r,ordinal)=>{
  const operationId=r.row_id.startsWith('allocation:')||r.row_id.includes('shared-aggregate')?'shared-supply':r.row_id.startsWith('scope:')?'geometry':r.row_id.startsWith('material:')?'materials':r.row_id.startsWith('labor:trench:')?'excavation':'bedding-backfill';
  const projectInputs=r.row_id.startsWith('rc09:labor:')||r.row_id.startsWith('rc09:equipment:')||['material:trench:bedding','material:trench:upper-backfill',sharedId,'material:trench:base','rc09:pbb_compaction_tests'].includes(r.row_id)?['pbb_assembly_designation','pbb_compaction_coefficient']:[];
  const x={...r,ordinal,resource_graph:{...r.resource_graph,inputParameterIds:[...new Set([...((r.resource_graph as Record<string,unknown>).inputParameterIds as string[]??[]),...projectInputs])],operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:'single-pipe-trench',groupTitleRu:'Траншея одного трубопровода: разработка, постель, обсыпка и засыпка',operationId,
    operationTitleRu:({'shared-supply':'Совместимая общая поставка',geometry:'Геометрия и баланс объёмов',materials:'Поставка и оснащение',excavation:'Разработка грунта','bedding-backfill':'Готовая операция постели и засыпки'})[operationId],completionCriterionRu:'Уточнить фактическую геометрию, проектную технологию и подтверждённые количества'},
    ...(r.row_id.startsWith('allocation:')?{includedInResourceOwnerRowId:sharedId,purchaseConsumptionAllocationV1:{contractVersion:'canonical-purchase-consumption-allocation/v1',ownerRowId:sharedId}}:{})},source_metadata:{...r.source_metadata,projectApprovalClaimed:false,universal_productivity_claimed:false}};
  return {...x,row_sha256:estimateDeterministicHash({...x,row_sha256:''})};
});
const runtimeInput={...extension.runtimeInput,pbb_unsuitable_soil_replacement_mode:'SURVEY_PENDING',pbb_dewatering_mode:'SURVEY_PENDING',pbb_shoring_mode:'SURVEY_PENDING'};
const childParameterIds=new Set(childParameterDefs.map(p=>p.parameter_id));
export const SINGLE_PIPE_TRENCH_DEFINITION_S2735=Object.freeze({parameters:[...childParameterDefs,...extension.parameters.filter(p=>!childParameterIds.has(p.parameter_id))].map((p,ordinal)=>({...p,ordinal})),
  formulas:[...childFormulas.filter(f=>formulaIds.has(f.formula_id)).map(f=>{
    if(typeof f.expression_source!=='string')throw Error('SINGLE_PIPE_TRENCH_SOURCE_EXPRESSION_REQUIRED:'+f.formula_id);
    return {...f,ast:remap(f.ast),input_parameter_ids:f.input_parameter_ids.map(id=>ids.get(id)??id),expression_source:f.expression_source.replace(/[A-Za-z_][A-Za-z0-9_]*/gu,id=>ids.get(id)??id)};
  }),...extension.formulas],resources:allResources,runtimeInput,
  runtimeClassification:Object.fromEntries(Object.keys(runtimeInput).map(id=>[id,'ASSUMPTION' as const])),runtimeSourceIds:Object.fromEntries(Object.keys(runtimeInput).map(id=>[id,[SINGLE_PIPE_TRENCH_SOURCE_ID_S2735]])),ordinaryParameterIds:['length_m']});
for(const kind of ['parameters','formulas','resources'] as const){const key=kind==='parameters'?'parameter_id':kind==='formulas'?'formula_id':'row_id';const values=SINGLE_PIPE_TRENCH_DEFINITION_S2735[kind].map(v=>(v as unknown as Record<string,unknown>)[key]);if(new Set(values).size!==values.length)throw Error('SINGLE_PIPE_TRENCH_ID_COLLISION:'+kind);}
export function compileSinglePipeTrenchConstructorS2735(submittedParameters:Record<string,unknown>){return compileAutomaticConstructionOwnerR1({compilerVersion:SINGLE_PIPE_TRENCH_CONTRACT_S2735,catalogId:SINGLE_PIPE_TRENCH_CATALOG_ID_S2735,primaryMeasureParameterId:'length_m',definition:SINGLE_PIPE_TRENCH_DEFINITION_S2735,submittedParameters});}
