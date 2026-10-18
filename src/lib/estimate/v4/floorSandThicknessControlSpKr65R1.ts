// WORK-only source-bound informational completion. No registry/writer/API.
import pack from '../../../../data/estimate-benchmarks/source-packs/floor-sand-thickness-control-spkr65-101-r1.json';
import {floorSandUnderlayerDefinitionR1,floorSandUnderlayerPackR1} from './floorSandUnderlayerKrer11Column01R1';
import {buildAutomaticConstructionOwnerR1,compileAutomaticConstructionOwnerR1,
 type AutomaticOwnerDefinition,type AutomaticInclusionCondition,type AutomaticParameterSpec} from './automaticConstructionOwnerR1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
export const floorSandThicknessControlPackR1=pack;
const selected:AutomaticInclusionCondition={kind:'equals',parameterId:pack.selectionParameter,value:pack.selectedValue};
const p=pack.prefix,oldPrefix=floorSandUnderlayerPackR1.prefix;

/** Uses the existing floor consumer and compiler. Count/tolerance are minimum
 * control information, not performed tests, a paid norm or a procurement owner.
 * Multiple rooms are deliberately not collapsed into ceil(totalArea/100). */
export function appendFloorSandThicknessControlR1(parent:AutomaticOwnerDefinition=floorSandUnderlayerDefinitionR1()):AutomaticOwnerDefinition{
 if(pack.source.sha256!=='d80e0d65fcf4c269f044381eac13a2b6c8b376878d60e439a41e6296f9901fa1'
  ||pack.primaryFacts.areaM2PerMinimumMeasurement!=='100'||pack.primaryFacts.maximumThicknessDeviationFraction!=='0.1'
  ||pack.formulaBasis.minimumCount!=='ceil(floor_sand_control_room_area_m2/100)'||pack.formulaBasis.deviationLimit!=='floor_sand_project_thickness_mm*0.1')throw Error('FLOOR_SAND_CONTROL_EXACT_TABLE8_5_SOURCE_REQUIRED');
 if(parent.parameters.length!==22||parent.formulas.length!==26||parent.resources.length!==26)throw Error('FLOOR_SAND_CONTROL_EXACT_PARENT_SHAPE');
 const need=parent.resources.find(r=>r.row_id===pack.completionNeedRowId);
 if(!need||need.unit_id!=='item'||need.source_metadata?.sourceRole!=='UNRESOLVED_APPLICATION_NORM')throw Error('FLOOR_SAND_CONTROL_ORIGINAL_NEED_REQUIRED');
 if(floorSandUnderlayerPackR1.sourceId!==pack.parentSourceId||floorSandUnderlayerPackR1.normId!==pack.parentNormId
  ||floorSandUnderlayerPackR1.primaryUnitId!=='m3')throw Error('FLOOR_SAND_CONTROL_INTERIOR_SOURCE_REQUIRED');
 for(const[id,unit,expression]of [
  ['worker','man_hour','floor_sand_net_volume_m3*2.3'],
  ['equipment:forklift5t','machine_hour','floor_sand_net_volume_m3*0.08'],
  ['equipment:compressor','machine_hour','floor_sand_net_volume_m3*0.22'],
  ['equipment:pneumaticRammer','machine_hour','floor_sand_net_volume_m3*0.44'],
 ]as const){const r=parent.resources.find(r=>r.row_id===oldPrefix+':'+id),f=parent.formulas.find(x=>x.formula_id===r?.formula_id);
  if(!r||r.unit_id!==unit||f?.expression_source!==expression)throw Error('FLOOR_SAND_CONTROL_OLD_OPERATION_BOUNDARY_DRIFT:'+id);}
 for(const[id,code,expression]of [['sand','01-6208-0005','floor_sand_net_volume_m3*1.2'],['water','01-0601-0001','floor_sand_net_volume_m3*0.15']]as const){
  const r=parent.resources.find(x=>x.row_id===oldPrefix+':material:'+id+':consumed'),f=parent.formulas.find(x=>x.formula_id===r?.formula_id);
  if(!r||r.unit_id!=='m3'||r.source_metadata?.normativeResourceCode!==code||f?.expression_source!==expression)throw Error('FLOOR_SAND_CONTROL_SAND_WATER_SOURCE_BOUNDARY:'+id);}
 const specs:AutomaticParameterSpec[]=pack.requiredFacts.map(f=>({id:f.id,title:f.titleRu,kind:'conditional',valueType:f.valueType as 'enum'|'text'|'decimal',
  unitId:f.unitId,...('value'in f?{values:[f.value as string]}:{}),...('min'in f?{min:f.min as number}:{}),requiredWhen:selected}));
 const facts=pack.requiredFacts.map(f=>f.id);
 const added=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:p,sourceId:pack.sourceId,normId:pack.normId,
  sourceMetadata:{source_title:'СП КР 65-101:2025: контроль толщины промежуточного элемента пола',source_document_version:pack.source.edition,
   definition_hash:pack.source.sha256,artifact_sha256:pack.source.sha256,exact_locator:pack.source.exactLocatorRu},
  applicabilityRu:pack.primaryFacts.scope,
  ordinary:[{id:pack.selectionParameter,title:'Минимум измерений толщины одного песчаного слоя в одном помещении',kind:'ordinary',valueType:'enum',unitId:null,values:[pack.selectedValue,pack.otherValue]}],
  conditional:specs,profile:[],deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:pack.limitations,
  rows:[
   {rowId:pack.rows.minimumCount,formulaId:p+':formula:minimum-count',title:'Минимальное число измерений толщины песчаного слоя — не выполненная услуга',
    section:'Контроль песчаного подстилающего слоя',category:'work',unitId:'test',expression:pack.formulaBasis.minimumCount,
    procurement:false,costTreatment:'INFORMATIONAL_SCOPE',inclusion:selected,inputParameterIds:facts},
   {rowId:pack.rows.deviationLimit,formulaId:p+':formula:deviation-limit',title:'Предельное отклонение толщины от проектного значения — не результат измерения',
    section:'Контроль песчаного подстилающего слоя',category:'work',unitId:'mm',expression:pack.formulaBasis.deviationLimit,
    procurement:false,costTreatment:'INFORMATIONAL_SCOPE',inclusion:selected,inputParameterIds:facts},
  ]});
 const oldParameters=new Set(parent.parameters.map(x=>x.parameter_id)),oldFormulas=new Set(parent.formulas.map(x=>x.formula_id)),oldRows=new Set(parent.resources.map(x=>x.row_id));
 if(added.parameters.some(x=>oldParameters.has(x.parameter_id))||added.formulas.some(x=>oldFormulas.has(x.formula_id))||added.resources.some(x=>oldRows.has(x.row_id)))throw Error('FLOOR_SAND_CONTROL_ID_COLLISION');
 const parameters=added.parameters.map((x,i)=>{const fact=pack.requiredFacts.find(f=>f.id===x.parameter_id);
  return {...x,ordinal:parent.parameters.length+i,required:false,truth_metadata:{...x.truth_metadata,
   value_source_role:'PROJECT_SPECIFIC_INPUT',source_confirmation_required:false,provenance:{consumer_input_role_v1:'OBJECT_FACT'},
   guide:{...(x.truth_metadata.guide as Record<string,unknown>),guide_short_ru:fact?.guideRu??'Выберите только отдельное фактически подтверждённое помещение. Этот минимум не закрывает общий контроль и не создаёт платную услугу.',source_role:'USER_SUPPLIED_OBJECT_FACT'}}};});
 const resources=added.resources.map((x,i)=>{const{row_sha256:_old,...body}=x;const row={...body,ordinal:parent.resources.length+i,
  source_metadata:{...x.source_metadata,sourceRole:'OFFICIAL_CONTROL_MINIMUM_INFORMATIONAL_NOT_PAID',completionNeedRowId:pack.completionNeedRowId,
   completionNeedSha256:pack.completionNeedSha256,originalNeedRemainsOpen:true,quantityQuality:x.row_id===pack.rows.minimumCount?'MINIMUM_INTEGER_CONTROL_COUNT_NOT_ACTUAL_PERFORMED':'PERMITTED_DEVIATION_NOT_ACTUAL_MEASUREMENT',
   noSeparatePaidNormProved:true,sitePerformedOrPassed:false,full_technical_acceptance:false},
  resource_graph:{...x.resource_graph,scopeContextParameterIds:[pack.parentPrimaryMeasureParameterId,'floor_sand_control_room_area_m2'],
   derivedQuantityEditPolicyV1:{contractVersion:'canonical-derived-quantity-edit-policy/v1',mode:'PARAMETERS_ONLY',unitId:x.unit_id,
    parameterIds:[x.row_id===pack.rows.minimumCount?'floor_sand_control_room_area_m2':'floor_sand_project_thickness_mm'],
    reasonRu:'Минимум контроля и допуск определены источником и отдельными объектными фактами; ручная строка не заменяет исходную величину.'},
   operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:oldPrefix,groupTitleRu:floorSandUnderlayerPackR1.titleRu,
    operationId:p,operationTitleRu:'Минимум контроля толщины одного песчаного слоя',
    completionCriterionRu:'Рассчитаны только минимальное число измерений и предельное отклонение. Выполнение, плотность, приёмка, протоколы и отдельная оплата не подтверждены.'},
   publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:x.title_ru,nameRu:x.title_ru,brandAndModelRu:null,specificationRu:null,
    detailsRu:['Только одно отдельно измеренное помещение и один слой; площадь не выводится из м³.','Без отдельной оплаты: цельный труд 2,3 чел.-ч/м³ и существующие машины не изменяются.','Общая потребность контроля остаётся открыта; это не протокол и не положительный результат контроля.']}}};
  return {...row,row_sha256:estimateDeterministicHash(row)};});
 return {...parent,parameters:[...parent.parameters,...parameters],formulas:[...parent.formulas,...added.formulas],resources:[...parent.resources,...resources],
  ordinaryParameterIds:[...parent.ordinaryParameterIds,pack.selectionParameter]};
}
export function compileFloorSandThicknessControlR1(parameters:Record<string,unknown>){return compileAutomaticConstructionOwnerR1({catalogId:pack.catalogId,
 compilerVersion:pack.contract,primaryMeasureParameterId:pack.parentPrimaryMeasureParameterId,definition:appendFloorSandThicknessControlR1(),submittedParameters:parameters});}
export function floorSandThicknessControlSyntheticFactsR1(area='250',thickness='100'):Record<string,unknown>{return{
 [pack.selectionParameter]:pack.selectedValue,
 ...Object.fromEntries(pack.requiredFacts.map(f=>[f.id,'value'in f?f.value:'QA_SYNTHETIC_ONLY measured single room/layer/project plan; not an actual acceptance document'])),
 floor_sand_control_room_area_m2:area,floor_sand_project_thickness_mm:thickness};}
