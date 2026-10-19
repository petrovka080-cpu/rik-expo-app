// WORK-only R2: canonical exclusiveMin0, no normative epsilon; explicit per-target price-inheritance optout. Prospective completion of an existing FLOOR need. No writer/API/registry admission.
import pack from '../../../../data/estimate-benchmarks/source-packs/floor-sand-small-room-straightedge-spkr65-r1.json';
import {appendFloorSandThicknessControlR1} from './floorSandThicknessControlSpKr65R1';
import {floorSandUnderlayerPackR1} from './floorSandUnderlayerKrer11Column01R1';
import {buildAutomaticConstructionOwnerR1,type AutomaticOwnerDefinition,
 type AutomaticInclusionCondition,type AutomaticParameterSpec} from './automaticConstructionOwnerR1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';

export const floorSandStraightedgePackR1=pack;
const p=pack.prefix;
const selected:AutomaticInclusionCondition={kind:'or',operands:[pack.planValue,pack.recordedValue].map(value=>({kind:'equals',parameterId:pack.selectionParameter,value}))};
const recorded:AutomaticInclusionCondition={kind:'equals',parameterId:pack.selectionParameter,value:pack.recordedValue};
const id=(suffix:string)=>'floor_sand_straightedge_'+suffix;
const scope='ONE_SEPARATELY_MEASURED_ROOM_ONE_NONRIGID_SAND_UNDERFLOOR_LAYER';
const method='CONTROL_STRAIGHTEDGE_2000_MM_AND_GAP_MEASUREMENTS';
const visual='EXPLICIT_PLAN_COVERS_ALL_VISUALLY_IDENTIFIED_LOCATIONS_OR_DOCUMENTS_NONE';
const payment='NO_NEW_PAID_TOOL_CREW_TEST_OR_CONSUMABLE_NORM_PROVED';

/** New rows are informational constraints/project observations. Existing whole labour,
 * machines/materials, five unresolved needs and two thickness controls remain exact.
 * The 50–70m² range supplies no chosen ceil divisor: only one room0<A≤50m² is addressed.
 * Recorded observations do not certify density, thickness, project acceptance or site work. */
export function appendFloorSandSmallRoomStraightedgeR1(parent:AutomaticOwnerDefinition=appendFloorSandThicknessControlR1()):AutomaticOwnerDefinition{
 if(pack.source.sha256!=='d80e0d65fcf4c269f044381eac13a2b6c8b376878d60e439a41e6296f9901fa1'
  ||pack.sourceFacts.straightedgeLengthMm!=='2000'||pack.sourceFacts.maximumGapMm!=='15'
  ||pack.sourceFacts.minimumBaseMeasurements!=='5'||pack.boundedDesign.areaMaximumM2!=='50')throw Error('FLOOR_STRAIGHTEDGE_EXACT_NONRIGID_SOURCE_REQUIRED');
 if(parent.parameters.length!==29||parent.formulas.length!==28||parent.resources.length!==28)throw Error('FLOOR_STRAIGHTEDGE_CURRENT_V2_PARENT_SHAPE_REQUIRED');
 const oldNeed=parent.resources.find(r=>r.row_id===pack.completionNeedRowId);
 if(!oldNeed||oldNeed.unit_id!=='item'||oldNeed.source_metadata?.sourceRole!=='UNRESOLVED_APPLICATION_NORM')throw Error('FLOOR_STRAIGHTEDGE_ORIGINAL_OPEN_QC_NEED_REQUIRED');
 for(const[suffix,unit,formula]of [
  ['worker','man_hour','floor_sand_net_volume_m3*2.3'],['equipment:forklift5t','machine_hour','floor_sand_net_volume_m3*0.08'],
  ['equipment:compressor','machine_hour','floor_sand_net_volume_m3*0.22'],['equipment:pneumaticRammer','machine_hour','floor_sand_net_volume_m3*0.44'],
 ]as const){const r=parent.resources.find(r=>r.row_id===floorSandUnderlayerPackR1.prefix+':'+suffix);
  if(!r||r.unit_id!==unit||parent.formulas.find(f=>f.formula_id===r.formula_id)?.expression_source!==formula)throw Error('FLOOR_STRAIGHTEDGE_OLD_PAYMENT_OR_UNIT_DRIFT:'+suffix);}
 const common:AutomaticParameterSpec[]=[
  {id:id('scope'),title:'Одно помещение и нежёсткий песчаный подстилающий слой под полы',kind:'conditional',valueType:'enum',unitId:null,values:[scope]},
  {id:id('room_reference'),title:'Помещение/слой, границы и фактический обмер; не объём и не сумма помещений',kind:'conditional',valueType:'text',unitId:null},
  {id:id('room_area_m2'),title:'Отдельно измеренная площадь одного помещения не более50м²; без выбора делителя50или70',kind:'conditional',valueType:'decimal',unitId:'m2',min:0,max:50},
  {id:id('method'),title:'Измерение просвета под контрольной двухметровой рейкой',kind:'conditional',valueType:'enum',unitId:null,values:[method]},
  {id:id('plan_reference'),title:'ППР/план точек измерения, минимум5базовых проверок и дополнительные проектные требования',kind:'conditional',valueType:'text',unitId:null},
  {id:id('visual_reference'),title:'Визуальный осмотр и все выявленные места дополнительной проверки либо документированное отсутствие',kind:'conditional',valueType:'text',unitId:null},
  {id:id('visual_coverage'),title:'Все визуально выявленные места включены в отдельный фактический план без автоматического сложения дубликатов',kind:'conditional',valueType:'enum',unitId:null,values:[visual]},
  {id:id('planned_measurement_count'),title:'Фактический полный план измерений в этом помещении: не менее5базовых и все дополнительные/визуальные точки без дубликатов',kind:'conditional',valueType:'integer',unitId:'test',min:5},
  {id:id('payment_scope'),title:'Оплата не назначена; исходные труд2,3ч и три машины не изменены',kind:'conditional',valueType:'enum',unitId:null,values:[payment]},
 ];
 const observations:AutomaticParameterSpec[]=[
  {id:id('performed_measurement_count'),title:'Фактически выполненные измерения по полному журналу и плану, целое число не менее5',kind:'conditional',valueType:'integer',unitId:'test',min:5,numericPeerConstraints:{greaterThanOrEqualParameter:id('planned_measurement_count')}},
  {id:id('observed_maximum_gap_mm'),title:'Максимальный фактически зарегистрированный просвет по всем требуемым точкам; не оценка из объёма/толщины',kind:'conditional',valueType:'decimal',unitId:'mm',min:0},
  {id:id('journal_reference'),title:'Полный журнал с точками, датой, результатами и привязкой к тому же помещению/слою',kind:'conditional',valueType:'text',unitId:null},
  {id:id('device_reference'),title:'Фактическая контрольная2мрейка и средство измерения просвета по применимому плану',kind:'conditional',valueType:'text',unitId:null},
 ];
 const gate=common.map(f=>f.id),observedGate=[...gate,...observations.map(f=>f.id)];
 const added=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:p,operationCompositionGroupId:p,sourceId:pack.sourceIdProposal,normId:pack.normId,
  sourceMetadata:{source_title:'СП КР65-101:2025, табл.8.5: просвет под2мрейкой нежёсткого подстилающего слоя',source_document_version:'СП КР65-101:2025',
   artifact_sha256:pack.source.sha256,definition_hash:pack.source.sha256,exact_locator:pack.source.exactLocatorRu},
  applicabilityRu:'Одно фактически измеренное помещение0<A≤50м²; только песчаный нежёсткий подстилающий слой пола;2мрейка, не более15мм, минимум5измерений и отдельный план визуально выявленных мест.',
  ordinary:[{id:pack.selectionParameter,title:'Информационный контроль просвета под2мрейкой одного малого помещения',kind:'ordinary',valueType:'enum',unitId:null,values:[pack.planValue,pack.recordedValue,pack.otherValue]}],
  profile:[],conditional:[...common.map(f=>({...f,requiredWhen:selected})),...observations.map(f=>({...f,requiredWhen:recorded}))],
  deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:['Площадь из м³/толщины не выводится; помещения не агрегируются.','ДляA>50м² делитель50/70или число участков не назначены.','Пять базовых измерений не означают достаточность проекта, покрытие визуальных дефектов, выполнение или приёмку.','Не вводит15мм для грунта, бетона, стяжки, дорожной конструкции или покрытия.','Не новый платный инструмент/труд/услуга и не повторная оплата машинистов, компрессора/воздуха или трамбовки.'],
  rows:[
   {rowId:pack.rows.minimumCount,formulaId:p+':formula:minimum-base-measurements',title:'Запланированные проверки просвета2мрейкой малого помещения — минимум5и проектные точки, не выполнение',section:'Контроль ровности песчаного слоя',category:'work',unitId:'test',expression:id('planned_measurement_count'),inclusion:selected,inputParameterIds:gate,costTreatment:'INFORMATIONAL_SCOPE',procurement:false},
   {rowId:pack.rows.recordedMaximum,formulaId:p+':formula:recorded-maximum-gap-mm',title:'Зарегистрированный максимальный просвет из полного журнала; объектный факт',section:'Контроль ровности песчаного слоя',category:'work',unitId:'mm',expression:id('observed_maximum_gap_mm'),inclusion:recorded,inputParameterIds:observedGate,costTreatment:'INFORMATIONAL_SCOPE',procurement:false},
   {rowId:pack.rows.excess,formulaId:p+':formula:recorded-excess-over-gap-limit-mm',title:'Превышение зарегистрированного просвета над15мм — не автоматическая приёмка',section:'Контроль ровности песчаного слоя',category:'work',unitId:'mm',expression:`max(0,${id('observed_maximum_gap_mm')}-15)`,inclusion:recorded,inputParameterIds:observedGate,costTreatment:'INFORMATIONAL_SCOPE',procurement:false},
  ]});
 const oldIds=new Set([...parent.parameters.map(x=>x.parameter_id),...parent.formulas.map(x=>x.formula_id),...parent.resources.map(x=>x.row_id)]);
 if(added.parameters.some(x=>oldIds.has(x.parameter_id))||added.formulas.some(x=>oldIds.has(x.formula_id))||added.resources.some(x=>oldIds.has(x.row_id)))throw Error('FLOOR_STRAIGHTEDGE_ID_COLLISION');
 const parameters=added.parameters.map((x,i)=>({...x,ordinal:parent.parameters.length+i,required:false,
  ...(x.parameter_id===id('room_area_m2')?{constraints_json:{...x.constraints_json,min:0,exclusiveMin:0,max:50}}:{}),truth_metadata:{...x.truth_metadata,
  value_source_role:'PROJECT_SPECIFIC_INPUT',source_confirmation_required:false,provenance:{consumer_input_role_v1:'OBJECT_FACT'}}}));
 const resources=added.resources.map((r,i)=>{const observed=[pack.rows.recordedMaximum,pack.rows.excess].includes(r.row_id);const{row_sha256:_old,...body}=r;
  const value={...body,ordinal:parent.resources.length+i,resource_graph:{...r.resource_graph,
   scopeContextParameterIds:[floorSandUnderlayerPackR1.primaryMeasureParameterId,id('room_area_m2')],
   derivedQuantityEditPolicyV1:{contractVersion:'canonical-derived-quantity-edit-policy/v1',mode:'PARAMETERS_ONLY',unitId:r.unit_id,
    parameterIds:observed?[id('observed_maximum_gap_mm')]:[id('planned_measurement_count')],reasonRu:'Источник и отдельно подтверждённые объектные факты; цена/количество строки не заменяют контроль.'}},
   source_metadata:{...r.source_metadata,sourceRole:observed?'PROJECT_RECORDED_CONTROL_DERIVED_INFORMATIONAL':'PREPARED_OFFICIAL_CONTROL_CONSTRAINT_INFORMATIONAL',
    ...(r.row_id===pack.rows.recordedMaximum?{normativeTrace:[],normative_source_ids:[]}:{sourceNormativeBindingProposed:true,sourceBindingConstraintOnlyNotObservationProof:true}),
    automaticGenericPriceInheritanceAllowed:false,
    completionNeedRowId:pack.completionNeedRowId,originalNeedRemainsOpen:true,sitePerformedOrPassed:false,projectObservationIsUserDeclared:observed,
    noSeparatePaidNormProved:true,registryAdmissionPending:true,full_technical_acceptance:false}};
  return{...value,row_sha256:estimateDeterministicHash(value)};});
 return{...parent,parameters:[...parent.parameters,...parameters],formulas:[...parent.formulas,...added.formulas],resources:[...parent.resources,...resources],ordinaryParameterIds:[...parent.ordinaryParameterIds,pack.selectionParameter]};
}
/** QA-only explicit facts. No source/site default or actual acceptance document. */
export function floorSandStraightedgeSyntheticFactsR1(recordedResults=false,area='40',gap='15'):Record<string,unknown>{return{
 [pack.selectionParameter]:recordedResults?pack.recordedValue:pack.planValue,[id('scope')]:scope,[id('room_reference')]:'QA_ONLY separate room/layer/measured boundary',
 [id('room_area_m2')]:area,[id('method')]:method,[id('plan_reference')]:'QA_ONLY full measurement plan; project may require more',
 [id('planned_measurement_count')]:'5',[id('visual_reference')]:'QA_ONLY visual survey and location coverage, not actualsiteevidence',[id('visual_coverage')]:visual,[id('payment_scope')]:payment,
 ...(recordedResults?{[id('performed_measurement_count')]:'5',[id('observed_maximum_gap_mm')]:gap,[id('journal_reference')]:'QA_ONLY full journal, allpoints',[id('device_reference')]:'QA_ONLY actual2mstraightedge/gapmeasurementdevice'}:{})};}
