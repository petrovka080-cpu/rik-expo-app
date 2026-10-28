import pack from '../../../../data/estimate-benchmarks/source-packs/three-subwork-physical-resource-completion-r3.json';
import {facadeMineralWoolOperationCompositionR2} from './facadeMineralWoolOperationCompositionR2';
import {facadeCeresitCt190PackR1 as ct,facadeCeresitCt190ChoiceParameterR1 as choice} from './facadeCeresitCt190MaterialSubworksR1';
import {floorConcreteSimplePresentationR2,floorScreed20mmSimplePresentationR2} from './floorSimpleResourcePresentationR2';
import {floorConcreteUnderlayerPackR1 as concrete} from './floorConcreteUnderlayerKrer11Column09R1';
import {floorCementScreed20mmPackR1 as screed} from './floorCementScreed20mmKrer11Column01R1';
import {appendProjectSubworkResourceScheduleR1,type ProjectSubworkResourcePositionR1,type ProjectSubworkResourceScheduleR1} from './projectSubworkResourceScheduleR1';
import {canonicalEstimateOperationReferences} from '../backendPlatform/canonicalEstimateOperationComposition';

function cleanup(key:'facade'|'concrete'|'screed'){
 const parent=key==='facade'?facadeMineralWoolOperationCompositionR2():key==='concrete'?floorConcreteSimplePresentationR2():floorScreed20mmSimplePresentationR2();
 const operation=canonicalEstimateOperationReferences(parent.resources[0]!.resource_graph.operationCompositionV1)[0]!;
 const {additionalOperations:_old,whenResourcePresent:_condition,...group}=operation;
 return [{...group,operationId:operation.groupId+':cleanup',operationTitleRu:'Убрать место работ и вывезти отходы',processOrdinal:90,
  completionCriterionRu:'Отходы собраны и переданы по подтверждённым условиям; включённые уборка и вывоз повторно не оплачиваются.'}];
}

function positions(key:'facade'|'concrete'|'screed'):readonly ProjectSubworkResourcePositionR1[]{
 const rows=pack[key];
 if(pack.contract!=='three-subwork-physical-resource-completion/r3'||pack.fullTechnicalAcceptance||pack.status!=='CANDIDATE_NOT_PUBLISHED'
  ||rows.some(row=>!['material','tool','equipment','service','transport','work'].includes(row.category)))throw Error('THREE_RESOURCE_SOURCE_MATRIX_INVALID');
 const result=rows as readonly ProjectSubworkResourcePositionR1[];
 if(key!=='facade')return result;
 const parent=facadeMineralWoolOperationCompositionR2();
 return result.map(position=>({...position,...(position.operation==='start-profile'
  ?{active:parent.resources.find(row=>row.row_id==='rc09:facade_start_profile')!.inclusion_ast as ProjectSubworkResourceScheduleR1['active']}
  :position.operation==='base-layer'&&!position.sharedOperations.includes('attachment')
   ?{active:{kind:'greater_than' as const,parameterId:'ct190_base_layer_area_m2',value:0}}
   :['attachment','mechanical-fixing'].includes(position.operation)&&!position.sharedOperations.includes('base-layer')
    ?{active:{kind:'greater_than' as const,parameterId:'area_m2',value:0}}:{})}));
}
export function threeSubworkResourceScheduleR3(key:'facade'|'concrete'|'screed'):ProjectSubworkResourceScheduleR1 {
 const source=pack.sources[key==='facade'?0:1]!;
 if(key==='facade')return {key:'facade_ct190_r3',sourceSha256:source.sha256,sourceUrl:source.url,sourceLocatorRu:source.locatorRu,sourceId:ct.sourceId,
  primaryParameterId:'area_m2',active:{kind:'and',operands:[{kind:'equals',parameterId:choice,value:ct.selectedValueRu},
   {kind:'or',operands:[{kind:'greater_than',parameterId:'area_m2',value:0},{kind:'greater_than',parameterId:'ct190_base_layer_area_m2',value:0}]}]},
  includedOwnerRowId:'rc09:facade_mineral_wool_install',positions:positions(key),additionalOperations:cleanup(key),
  sharedOperationResourceConditions:{'start-profile':['rc09:facade_start_profile'],'fire-barrier':['rc09:mineral_wool_fire_barrier_lamella'],
   'base-layer':['subwork-resource:facade_ct190_r3:glass-mesh:separate','subwork-resource:facade_ct190_r3:glass-mesh:included',
    'subwork-resource:facade_ct190_r3:base-coat-work:separate','subwork-resource:facade_ct190_r3:base-coat-work:included']},replacements:{
   [ct.prefix+':open-mesh-layout']:['glass-mesh'],
   [ct.prefix+':open-base-layer-labor']:['base-coat-work'],
   [ct.prefix+':open-mixing-tools']:['mixer','large-notched-float','mesh-notched-float','flat-float','trowel','mixing-container','water-measure'],
   [ct.prefix+':open-delivery']:['material-delivery'],
   [ct.prefix+':open-preparation-protection']:['surface-preparation','ct17-primer','ct29-repair','ct99-treatment','facade-cover','scaffold-rental'],
  }};
 const floor=key==='concrete'?concrete:screed;
 return {key:key==='concrete'?'floor_concrete_r3':'floor_screed20_r3',sourceSha256:source.sha256,sourceUrl:source.url,sourceLocatorRu:source.locatorRu,
  sourceId:floor.sourceId,primaryParameterId:floor.measurement.parameterId,
  active:{kind:'greater_than',parameterId:floor.measurement.parameterId,value:0},includedOwnerRowId:floor.prefix+':whole-labor',positions:positions(key),additionalOperations:cleanup(key),
  replacements:key==='concrete'?{
   [floor.prefix+':open-tools-access']:['straightedge','float','shovel','brush','level','tape-measure','extension-cord','gloves','goggles','temporary-access'],
   [floor.prefix+':open-external-logistics']:['material-delivery','unloading'],
   [floor.prefix+':open-quality-acceptance']:['quality-test'],
  }:{
   [floor.prefix+':open-tools-and-ppe']:['straightedge','float','shovel','brush','level','tape-measure','extension-cord','gloves','goggles'],
   [floor.prefix+':open-additional-logistics-and-waste']:['material-delivery','unloading','waste-bags','waste-transport'],
  }};
}

/** Governed successor candidates. Importing these factories neither mutates a
 * saved estimate nor registers, publishes or activates a catalogue release. */
export const facadePhysicalResourceCompletionR3=()=>appendProjectSubworkResourceScheduleR1(facadeMineralWoolOperationCompositionR2(),threeSubworkResourceScheduleR3('facade'));
export const floorConcretePhysicalResourceCompletionR3=()=>appendProjectSubworkResourceScheduleR1(floorConcreteSimplePresentationR2(),threeSubworkResourceScheduleR3('concrete'));
export const floorScreedPhysicalResourceCompletionR3=()=>appendProjectSubworkResourceScheduleR1(floorScreed20mmSimplePresentationR2(),threeSubworkResourceScheduleR3('screed'));
