import mastic from '../../../../data/estimate-benchmarks/source-packs/roof-expansion-joint-native-whole01-mastic-r24.json';
import torch from '../../../../data/estimate-benchmarks/source-packs/roof-expansion-joint-native-whole02-torch-r24.json';
import common from '../../../../data/estimate-benchmarks/source-packs/roof-flat003006-composition-r24.json';
import {buildRoofMasticMeshExisting003R24 as build003,roofMasticMeshPackR24 as pack003,
 roofMasticMeshControlsR24 as ids003,roofMasticMeshProfilesR24 as profiles003,roofMasticMeshPostRowR24,type RoofMasticMeshCurrentCaptureR24 as Capture} from './roofMasticMeshExisting003R24';
import {sourcePinnedRoofNormOwnerR1,type SourcePinnedRoofNormPackR1} from './sourcePinnedRoofNormOwnerR1';
import {buildAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,type AutomaticOwnerDefinition} from './automaticConstructionOwnerR1';
import {buildMasterParameterCalculationConsumers} from '../backendPlatform/canonicalDefinitionParameterConsumersR1';
import {canonicalEstimateOperationReference,type CanonicalEstimateOperationReference} from '../backendPlatform/canonicalEstimateOperationComposition';
import {canonicalEstimateStableJson} from '../backendPlatform/canonicalEstimateDeterminism';
import {canonicalEstimateSha256HexText} from '../backendPlatform/canonicalEstimateSha256';
import type {CanonicalEstimateCompileCoreInput as CoreInput} from '../backendPlatform/canonicalEstimateCompileCore';
type Json=Record<string,unknown>;
const obj=(v:unknown):v is Json=>v!==null&&typeof v==='object'&&!Array.isArray(v);
function check(v:unknown,code:string):asserts v{if(!v)throw Error('ROOF_FLAT003006_R24_'+code);}
const hash=(v:unknown)=>canonicalEstimateSha256HexText(canonicalEstimateStableJson(v));
const copy=<T,>(v:T):T=>structuredClone(v);
export const roofFlat003006PackR24=common;
export const roofJoint006ProfilesR24={mastic,torch};
const keys=['mastic','torch']as const,ids=common.jointControls;
const eq=(parameterId:string,value:string)=>({kind:'equals',parameterId,value});
// Existing optional-scope semantics: absence is false only for selected, not present.
const selected=(key:typeof keys[number])=>({kind:'selected',parameterId:ids.method,value:common.jointChoices[key]});
const jointOnlyScope={kind:'selected',parameterId:ids003.publicMethod,value:common.jointOnlyPublicWorkScopeChoice};
// An explicit joint-only scope retains unknown general provision while the
// unchosen M/T normative alternatives remain excluded; no method default.
const anyJoint={kind:'or',operands:[...keys.map(selected),jointOnlyScope]};
const any003={kind:'or',operands:Object.values(profiles003).map(p=>eq(ids003.selector,p.systemYesRu))};
function stage(key:string){const o=mastic.sourceOperationRoster.find(o=>o.operationKey===key);check(o,'EXACT006_OPERATION');
 return{operationId:common.prefix+':006:'+key,operationTitleRu:o.titleRu,processOrdinal:o.ordinal+40,
 completionCriterionRu:'Выполнена операция целого способа006; неизвестное обеспечение остаётся видимым.'};}
function operation(ops:readonly string[]):CanonicalEstimateOperationReference{check(ops.length>0,'OPERATION_KEYS');return{
 contractVersion:'canonical-operation-resource/v1',groupId:common.operationGroupId,groupTitleRu:common.operationGroupTitleRu,
 ...stage(ops[0]!),...(ops.length>1?{additionalOperations:ops.slice(1).map(stage)}:{})};}
type Resource=CoreInput['resourceDefinitions'][number];
function rowHash(r:Omit<Resource,'row_sha256'>&{row_sha256?:string}):Resource{const{row_sha256:_old,...body}=r;return{...body,row_sha256:hash(body)};}
function appendRelated(row:CoreInput['resourceDefinitions'][number],refs:readonly NonNullable<CanonicalEstimateOperationReference['additionalOperations']>[number][]){
 const prior=canonicalEstimateOperationReference(row.resource_graph.operationCompositionV1);check(prior,'OPERATION_REFERENCE_REQUIRED');
 const related=[...(prior.additionalOperations??[])];for(const ref of refs){const i=related.findIndex(x=>x.operationId===ref.operationId);
  if(i<0)related.push(ref);else related[i]={...related[i]!,whenResourcePresent:[...new Set([...(related[i]!.whenResourcePresent??[]),...(ref.whenResourcePresent??[])])]};}
 return rowHash({...row,resource_graph:{...row.resource_graph,operationCompositionV1:{...prior,
  groupId:common.operationGroupId,groupTitleRu:common.operationGroupTitleRu,additionalOperations:related}}});
}
/** One family composition over the immutable003 adapter. No writer, UUID
 * allocator, formula evaluator or implicit project confirmation is added. */
export function buildRoofFlat003006R24(c:Capture){
 const field=build003(c),sourceKey=common.prospectiveAbsenceOnlyRegistrySourceKey;check(sourceKey===pack003.sourceKey,'ONE_SOURCE_KEY');
 const defs=keys.map(key=>{const p=roofJoint006ProfilesR24[key];const native:SourcePinnedRoofNormPackR1={...p,
  measurementUnitId:'linear_m',measurementConditional:true,
  sources:p.sources.map(s=>({...s,id:sourceKey})),rates:p.rates.map(r=>{check(r.costTreatment==='OWN_COST'||r.costTreatment==='INFORMATIONAL_SCOPE','COST_KIND');
   return{...r,costTreatment:r.costTreatment==='INFORMATIONAL_SCOPE'?'INFORMATIONAL_SCOPE':'OWN_COST'};})};return sourcePinnedRoofNormOwnerR1(native);});
 const first=defs[0];check(first,'FIRST006');const newNeeds=common.newPhysicalNeeds;
 const extra=buildAutomaticConstructionOwnerR1({contract:common.contract,semanticOwner:common.prefix,sourceId:sourceKey,normId:'UNRESOLVED_PHYSICAL_STOCK_NOT_MACHINE_HOURS',
  sourceMetadata:{source_title:mastic.sources[0]!.titleRu,source_document_version:mastic.sources[0]!.printedEdition,
   definition_hash:common.registrySourceArtifactSha256,artifact_sha256:common.registrySourceArtifactSha256,exact_locator:'КРЕР12PDF11–12/15, физический комплект/stock не нормирован'},
  applicabilityRu:mastic.scopeRu,ordinary:[],profile:[],conditional:newNeeds.map(n=>({id:n.parameterId,title:n.titleRu,valueType:'integer'as const,unitId:n.unitId,kind:'internal'as const,min:0})),
  rows:newNeeds.map(n=>({rowId:n.rowId,formulaId:n.rowId+':formula',title:n.titleRu,unitId:n.unitId,category:n.category,section:'Общее физическое обеспечение поля и шва',
   expression:n.parameterId,procurement:false,costTreatment:n.costTreatment==='INFORMATIONAL_SCOPE'?'INFORMATIONAL_SCOPE':'OWN_COST'})),
  deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:mastic.remainingScopeRu});
 const oldIds=new Set(field.parameters.map(p=>p.parameter_id));check(first.parameters.every(p=>!oldIds.has(p.parameter_id)),'NEW006_PARAMETER_COLLISION');
 const jointParameters=first.parameters.map(p=>{const truth=p.truth_metadata;
  if(p.parameter_id===ids.method)return{...p,required:false,constraints_json:{...p.constraints_json,values:[...Object.values(common.jointChoices),mastic.unknownChoiceRu,mastic.legacyChoiceRu],
   requiredWhen:jointOnlyScope}};
  if(p.parameter_id===ids.length)return{...p,required:false,constraints_json:{...p.constraints_json,requiredWhen:anyJoint}};
  return{...p,required:false,constraints_json:{...p.constraints_json,requiredWhen:anyJoint},truth_metadata:{...truth,
   visibility_role:'INTERNAL_ONLY',value_source_role:'PROJECT_DOCUMENTATION',source_confirmation_required:true,
   provenance:{...(obj(truth.provenance)?truth.provenance:{}),consumer_input_role_v1:'APPLICATION_TECHNICAL'},
   guide:{...(obj(truth.guide)?truth.guide:{}),source_role:'PROJECT_DOCUMENTATION'}}};});
 const baseParameters=field.parameters.map(p=>{
  if(p.parameter_id!==ids003.publicMethod&&p.parameter_id!==ids003.selector)return copy(p);
  check(obj(p.constraints_json)&&Array.isArray(p.constraints_json.values),'EXACT_ENUM_DOMAIN');return{...copy(p),constraints_json:{...p.constraints_json,
   values:[...p.constraints_json.values,p.parameter_id===ids003.publicMethod?common.jointOnlyPublicWorkScopeChoice:common.jointOnlyOwnedSelectorValue]}};});
 const parameters:AutomaticOwnerDefinition['parameters']=[...baseParameters,...jointParameters,...extra.parameters.map(p=>({...p,default_value:null,
  truth_metadata:unresolvedApplicationNormTruthR1(p.truth_metadata,newNeeds.find(n=>n.parameterId===p.parameter_id)!.reasonRu)}))].map((p,ordinal)=>({...p,ordinal}));
 const jointRows=defs.flatMap((d,index)=>d.resources.map(r=>{const key=keys[index]!,rate=roofJoint006ProfilesR24[key].rates.find(x=>r.row_id===roofJoint006ProfilesR24[key].prefix+':'+x.role);check(rate,'ROW_RATE');
  return rowHash({...r,inclusion_ast:{kind:'and',operands:[selected(key),r.inclusion_ast]},
   resource_graph:{...r.resource_graph,operationCompositionV1:operation(rate.requiredNativeOperationKeys)}});}));
 const jointIds=jointRows.map(r=>r.row_id),fieldIds=new Set(field.nativeRowIds),byKey=(key:typeof keys[number])=>jointRows.filter(r=>r.row_id.startsWith(roofJoint006ProfilesR24[key].prefix+':')).map(r=>r.row_id);
 const refs=(opKeys:readonly string[],present:readonly string[])=>opKeys.map(k=>({...stage(k),whenResourcePresent:present}));
 const baseRows=field.resources.map(r=>{
  let row:Resource=r;const reuse=common.reusedCurrentPhysicalNeeds.find(n=>n.rowId===r.row_id);
  if(!reuse&&r.row_id!==roofMasticMeshPostRowR24)row=rowHash({...row,inclusion_ast:{kind:'and',operands:[row.inclusion_ast,{kind:'not',operand:eq(ids003.selector,common.jointOnlyOwnedSelectorValue)}]}});
  if(reuse){const raw=c.resources.find(x=>x.row_id===r.row_id);check(raw?.row_sha256===reuse.capturedRowSha256&&raw.unit_id===reuse.unitId&&raw.cost_owner_id===reuse.costOwnerId,'CURRENT_NEED_PHYSICAL_DRIFT');
   const condition=reuse.scope==='MASTIC_ONLY'?selected('mastic'):reuse.scope==='TORCH_ONLY'?selected('torch'):anyJoint;
   row=rowHash({...row,inclusion_ast:{kind:'or',operands:[row.inclusion_ast,condition]}});
   row=appendRelated(row,refs(reuse.operationKeys,reuse.scope==='MASTIC_ONLY'?byKey('mastic'):reuse.scope==='TORCH_ONLY'?byKey('torch'):jointIds));}
  if(fieldIds.has(r.row_id)||r.row_id===roofMasticMeshPostRowR24){const op=canonicalEstimateOperationReference(row.resource_graph.operationCompositionV1);check(op,'003_OPERATION');
   row=rowHash({...row,resource_graph:{...row.resource_graph,operationCompositionV1:{...op,groupId:common.operationGroupId,groupTitleRu:common.operationGroupTitleRu}}});}
  if(r.row_id===roofMasticMeshPostRowR24){row=rowHash({...row,inclusion_ast:{kind:'or',operands:[row.inclusion_ast,selected('mastic')]}});
   const original=canonicalEstimateOperationReference(row.resource_graph.operationCompositionV1);check(original,'HEATFEED_OPERATION');
   row=rowHash({...row,resource_graph:{...row.resource_graph,operationCompositionV1:{...original,operationId:common.prefix+':shared:heat-feed',operationTitleRu:'Подготовка и подача горячей мастики',
    additionalOperations:[{operationId:original.operationId,operationTitleRu:original.operationTitleRu,completionCriterionRu:original.completionCriterionRu,processOrdinal:original.processOrdinal,whenResourcePresent:field.nativeRowIds},...refs(['additional_roll_layers'],byKey('mastic'))]}}});}
  return row;
 });
 // Every003 physical need keeps its original cost/stock owner; related refs
 // display that SAME row under the exact new stages, only when native present.
 const allFieldOps=pack003.nativeOperationRoster.map(o=>({operationId:pack003.prefix+':'+o.key,operationTitleRu:o.titleRu,
  processOrdinal:o.ordinal,completionCriterionRu:o.completionCriterionRu,whenResourcePresent:field.nativeRowIds}));
 const withFieldRefs=baseRows.map(r=>pack003.existingUnknownNeedsToReuse.some(n=>n.rowId===r.row_id)?appendRelated(r,allFieldOps):r);
 const physical=extra.resources.map(r=>{const n=newNeeds.find(n=>n.rowId===r.row_id)!;
  const inclusion=n.key==='boiler-physical-stock'?{kind:'or',operands:[any003,selected('mastic')]}:anyJoint;
  const{row_sha256:_old,...body}=r;return rowHash({...body,inclusion_ast:inclusion,source_metadata:{...r.source_metadata,
   sourceRole:'UNRESOLVED_APPLICATION_NORM',sourceNormQuantityAccepted:false,normativeTrace:[],unresolved_norm_reason:n.reasonRu,
   physicalStockCountFromMachineHoursAllowed:false,duplicateOperatedMachinePaymentAllowed:false},
   resource_graph:{...r.resource_graph,operationCompositionV1:n.key==='boiler-physical-stock'?{
    contractVersion:'canonical-operation-resource/v1',groupId:common.operationGroupId,groupTitleRu:common.operationGroupTitleRu,
    operationId:common.prefix+':shared:boiler-stock',operationTitleRu:'Обеспечение битумным котлом',completionCriterionRu:n.reasonRu,
    additionalOperations:[...pack003.nativeOperationRoster.filter(o=>pack003.independentNativeRequiredOperationKeys.mobile_bitumen_boiler_400l.includes(o.key)).map(o=>({operationId:pack003.prefix+':'+o.key,
     operationTitleRu:o.titleRu,completionCriterionRu:o.completionCriterionRu,processOrdinal:o.ordinal,whenResourcePresent:field.nativeRowIds})),...refs(['additional_roll_layers'],byKey('mastic'))]}
    :operation(n.operationKeys)}});});
 const stockOwner=newNeeds.find(n=>n.key==='boiler-physical-stock')!.rowId;
 const resources=[...withFieldRefs,...jointRows,...physical].map(r=>{
  const boiler=(fieldIds.has(r.row_id)||jointIds.includes(r.row_id))&&r.row_id.endsWith(':mobile_bitumen_boiler_400l');
  const burner=jointIds.includes(r.row_id)&&r.row_id.endsWith(':flame_burner');
  if(!boiler&&!burner)return r;
  return rowHash({...r,resource_graph:{...r.resource_graph,roofFlat003006PhysicalStockR24:{
   stockOwnerRowId:boiler?stockOwner:'master212:roof:r1:need:torch-burner-line',
   normativeQuantityUnitId:'machine_hour',physicalStockUnitId:boiler?'pcs':'piece',
   stockQuantityRelation:'UNRESOLVED_NO_CONVERSION_FROM_NORMATIVE_HOURS',normativeOperatedMachinePaymentOwner:r.cost_owner_id,
   physicalStockCreatesSecondOperatingCharge:false}}});
 });
 const formulas=[...field.formulas,...defs.flatMap(d=>d.formulas),...extra.formulas];
 const consumers=buildMasterParameterCalculationConsumers({parameters,formulas,resources});
 const finalParameters:AutomaticOwnerDefinition['parameters']=parameters.map(p=>({...p,truth_metadata:{...p.truth_metadata,
  formula_consumers:consumers.formulaConsumers[p.parameter_id],resource_branch_consumers:consumers.resourceConsumers[p.parameter_id]}}));
 const sourceSelection=field.applicability.sourceProfileSelectionV1;check(obj(sourceSelection)&&Array.isArray(sourceSelection.profiles),'BASE_SOURCE_PROFILE');
 const primary=field.applicability.primaryMeasureSelectionV1;check(obj(primary)&&Array.isArray(primary.selections),'BASE_PRIMARY');
 const applicability={...field.applicability,sourceProfileSelectionV1:{...copy(sourceSelection),profiles:[...copy(sourceSelection.profiles),{
  selectorValue:common.jointOnlyOwnedSelectorValue,sources:[{sourceId:sourceKey,artifactSha256:common.registrySourceArtifactSha256,locator:'КРЕР12-01-006-01/02;PDF15,целые12/12ресурсов и5операций'}],
  when:{kind:'and',operands:[eq(ids003.publicMethod,common.jointOnlyPublicWorkScopeChoice),{kind:'literal',value:true}]},geometryCopies:[]}]},
  primaryMeasureSelectionV1:{...copy(primary),selections:[...copy(primary.selections),{selectorValue:common.jointOnlyOwnedSelectorValue,primaryMeasureParameterId:ids.length,unitId:'linear_m'}]},
  roofFlat003006Composition:{contract:common.contract,ownJointMeasure:ids.length,stockCountNotFromHours:true,sourceFirstAbsenceOnly:true,fullTechnicalAcceptance:false}};
 check(finalParameters.length===163&&formulas.length===330&&resources.length===336,'EXACT_COMMON_SHAPE');
 return{capture:c,field,parameters:finalParameters,formulas,resources,applicability,native003RowIds:field.nativeRowIds,native006RowIds:jointIds,
  nativeRowIds:[...field.nativeRowIds,...jointIds],newParameterIds:finalParameters.filter(p=>!c.parameters.some(q=>q.parameter_id===p.parameter_id)).map(p=>p.parameter_id),
  stockRowId:common.newPhysicalNeeds.find(n=>n.key==='boiler-physical-stock')!.rowId,groupId:common.operationGroupId};
}
export function roofFlat003006MapEntriesR24(){
 const native=keys.flatMap(key=>roofJoint006ProfilesR24[key].rates.map(r=>({expectedResourceId:'joint006:'+key+':'+r.role,
  operationId:common.prefix+':006:'+r.requiredNativeOperationKeys[0],requiredOperationIds:r.requiredNativeOperationKeys.map(k=>common.prefix+':006:'+k),
  sourceId:common.prospectiveAbsenceOnlyRegistrySourceKey,category:r.category,unitId:r.unitId,specification:r.titleRu,condition:'EXACT_'+roofJoint006ProfilesR24[key].normId,
  quantityRule:'SOURCE_PER100_LINEAR_M_TIMES_INDEPENDENT_JOINT_LENGTH_DIV100',formulaId:roofJoint006ProfilesR24[key].prefix+':formula:'+r.role,
  resolution:{kind:'ROW',rowId:roofJoint006ProfilesR24[key].prefix+':'+r.role}})));
 const reused=common.reusedCurrentPhysicalNeeds.map(n=>({expectedResourceId:'joint006:reused:'+n.rowId,operationId:common.prefix+':006:'+n.operationKeys[0],
  requiredOperationIds:n.operationKeys.map(k=>common.prefix+':006:'+k),sourceId:'EXACT_CURRENT_UNRESOLVED_SHARED_PHYSICAL_OWNER',category:n.category,unitId:n.unitId,
  specification:n.titleRu,condition:n.scope,quantityRule:'REUSE_CURRENT_UNKNOWN_QUANTITY_AND_ONE_OWNER',formulaId:n.formulaId,resolution:{kind:'ROW',rowId:n.rowId}}));
 const unknown=common.newPhysicalNeeds.map(n=>({expectedResourceId:'joint006:new-physical:'+n.key,operationId:common.prefix+':006:'+n.operationKeys[0],
  requiredOperationIds:n.operationKeys.map(k=>common.prefix+':006:'+k),sourceId:'UNRESOLVED_NO_MACHINE_HOUR_TO_STOCK_COUNT',category:n.category,unitId:n.unitId,
  specification:n.titleRu,condition:n.key==='boiler-physical-stock'?'ANY003_OR_MASTIC006':'ANY006',quantityRule:'UNKNOWN_NOT_ZERO_NO_PURCHASE_OR_SECOND_OPERATED_MACHINE_PAYMENT',
  formulaId:n.rowId+':formula',resolution:{kind:'ROW',rowId:n.rowId}}));
 return[...native,...reused,...unknown,{expectedResourceId:'joint006:shared003-feed-post',operationId:common.prefix+':006:additional_roll_layers',requiredOperationIds:[common.prefix+':006:additional_roll_layers'],
  sourceId:'SHARED_UNRESOLVED_HEAT_FEED_NOT_SECOND_BOILER',category:'equipment',unitId:'set',specification:'Термостойкий пост подачи мастики',condition:'MASTIC006',quantityRule:'SAME003_UNKNOWN_ROW_OWNER',
  formulaId:roofMasticMeshPostRowR24+':formula',resolution:{kind:'ROW',rowId:roofMasticMeshPostRowR24}}];
}
