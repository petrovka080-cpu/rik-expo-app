import bitumen from '../../../../data/estimate-benchmarks/source-packs/roof-mastic-mesh-native-whole00301-r24.json';
import rubber from '../../../../data/estimate-benchmarks/source-packs/roof-mastic-mesh-native-whole00302-r24.json';
import pack from '../../../../data/estimate-benchmarks/source-packs/roof-mastic-mesh-existing-owner-operation-map-r24.json';
import {sourcePinnedRoofNormOwnerR1,type SourcePinnedRoofNormPackR1} from './sourcePinnedRoofNormOwnerR1';
import {buildAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,type AutomaticInclusionCondition,type AutomaticOwnerDefinition} from './automaticConstructionOwnerR1';
import {buildMasterParameterCalculationConsumers} from '../backendPlatform/canonicalDefinitionParameterConsumersR1';
import {canonicalEstimateStableJson} from '../backendPlatform/canonicalEstimateDeterminism';
import {canonicalEstimateSha256HexText} from '../backendPlatform/canonicalEstimateSha256';
import type {CanonicalEstimateCompileCoreInput as CoreInput} from '../backendPlatform/canonicalEstimateCompileCore';
import type {CanonicalEstimateOperationReference} from '../backendPlatform/canonicalEstimateOperationComposition';

type Json=Record<string,unknown>;
export type RoofMasticMeshCurrentCaptureR24=Readonly<{
 definition:Json&{id:string;catalog_id:string;definition_version:number;definition_sha256:string;passport:Json;applicability:Json;source_metadata:Json};
 baseline:Json;parameters:AutomaticOwnerDefinition['parameters'];formulas:CoreInput['formulaDefinitions'];resources:CoreInput['resourceDefinitions'];
 bindings:readonly Json[];normativeSources:readonly Json[];normativeLocators:readonly Json[];
}>;
export const roofMasticMeshPackR24=pack;
export const roofMasticMeshProfilesR24={bitumen,bitumen_rubber:rubber};
export const roofMasticMeshControlsR24=pack.controls;
const keys=['bitumen','bitumen_rubber']as const;
type Key=typeof keys[number];
const copy=<T,>(value:T):T=>structuredClone(value);
function check(value:unknown,message:string):asserts value{if(!value)throw Error('ROOF_MASTIC_MESH003_R24_'+message);}
const record=(v:unknown):v is Json=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const valueSha=(v:unknown)=>canonicalEstimateSha256HexText(canonicalEstimateStableJson(v));
const controls=pack.controls;
export const roofMasticMeshPostParameterR24='roof_mastic_mesh003_hot_feed_post_sets_r24';
export const roofMasticMeshPostRowR24=pack.prefix+':hot-feed-post';
const equals=(value:string):AutomaticInclusionCondition=>({kind:'equals',parameterId:controls.selector,value});
const anyNew:AutomaticInclusionCondition={kind:'or',operands:keys.map(k=>equals(roofMasticMeshProfilesR24[k].systemYesRu))};
function operation(ops:readonly string[]):CanonicalEstimateOperationReference{
 check(ops.length>0,'NATIVE_OPERATION_LIST_REQUIRED');
 const stage=(key:string)=>{const o=pack.nativeOperationRoster.find(x=>x.key===key);check(o,'EXACT_NATIVE_OPERATION_REQUIRED');
  return{operationId:pack.prefix+':'+key,operationTitleRu:o!.titleRu,processOrdinal:o!.ordinal,completionCriterionRu:o!.completionCriterionRu};};
 return{contractVersion:'canonical-operation-resource/v1',groupId:pack.prefix,groupTitleRu:'Армированное мастичное покрытие',
  ...stage(ops[0]!),...(ops.length>1?{additionalOperations:ops.slice(1).map(stage)}:{})};
}
const nativeRequired:Readonly<Record<string,readonly string[]>>=pack.independentNativeRequiredOperationKeys;
/** This family adapter composes the two existing owners and retains the exact
 * current card. No catalog identity, source UUID, publisher or evaluator here. */
export function buildRoofMasticMeshExisting003R24(c:RoofMasticMeshCurrentCaptureR24){
 check(c.definition.catalog_id===pack.currentParent.catalogId&&c.definition.id===pack.currentParent.definitionId
  &&c.definition.definition_version===14&&c.definition.definition_sha256===pack.currentParent.definitionSha256,'EXACT_CURRENT_HEADER_REQUIRED');
 check(valueSha(c)==='6cb74afe8bea80c78d5fa75431ff03ec442d16f27ed955f84cb7e6a3280fb8cb','FULL_CURRENT_CAPTURE_DRIFT');
 const definitions=keys.map(k=>{const p=roofMasticMeshProfilesR24[k];
  const nativePack:SourcePinnedRoofNormPackR1={...p,measurementUnitId:'m2',rates:p.rates.map(r=>{
   check(r.costTreatment==='OWN_COST'||r.costTreatment==='INFORMATIONAL_SCOPE','NATIVE_COST_TREATMENT_REQUIRED');
   return{...r,costTreatment:r.costTreatment==='INFORMATIONAL_SCOPE'?'INFORMATIONAL_SCOPE':'OWN_COST'};
  })};return sourcePinnedRoofNormOwnerR1(nativePack);});
 const first=definitions[0];check(first,'FIRST_NATIVE_PROFILE_REQUIRED');
 const extra=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:pack.prefix+':physical-post',sourceId:pack.sourceKey,
  normId:'UNRESOLVED_NON_BOILER_PHYSICAL_POST',sourceMetadata:{source_title:bitumen.sources[0]!.titleRu,
   source_document_version:bitumen.sources[0]!.printedEdition,artifact_sha256:bitumen.sources[0]!.sha256,
   definition_hash:bitumen.sources[0]!.sha256,exact_locator:'КРЕР12 PDF11–12,00301/02; физический остаток неизвестен'},
  applicabilityRu:bitumen.scopeRu,ordinary:[{id:controls.publicMethod,title:'Способ устройства покрытия кровли',valueType:'enum',unitId:null,
   kind:'ordinary',values:Object.values(pack.choices)}],profile:[],conditional:[{id:roofMasticMeshPostParameterR24,
   title:pack.newPhysicalNeeds[0]!.titleRu,valueType:'integer',unitId:'set',kind:'internal',min:0}],
  rows:[{rowId:roofMasticMeshPostRowR24,formulaId:roofMasticMeshPostRowR24+':formula',section:'Физическое обеспечение мастичного покрытия',
   category:'equipment',title:pack.newPhysicalNeeds[0]!.titleRu,unitId:'set',expression:roofMasticMeshPostParameterR24,
   inclusion:anyNew,inputParameterIds:[controls.publicMethod],procurement:false,costTreatment:'OWN_COST'}],
  deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:bitumen.remainingScopeRu});
 const oldIds=new Set(c.parameters.map(p=>p.parameter_id));
 const gates=first!.parameters.filter(p=>!oldIds.has(p.parameter_id)).map(p=>({...p,default_value:null,constraints_json:{...p.constraints_json,requiredWhen:anyNew},
  truth_metadata:{...p.truth_metadata,visibility_role:'INTERNAL_ONLY',value_source_role:'PROJECT_DOCUMENTATION',source_confirmation_required:true,
   provenance:{...(record(p.truth_metadata.provenance)?p.truth_metadata.provenance:{}),consumer_input_role_v1:'APPLICATION_TECHNICAL'},
   guide:{...(record(p.truth_metadata.guide)?p.truth_metadata.guide:{}),source_role:'PROJECT_DOCUMENTATION'}}}));
 check(gates.length===2,'EXACT_TWO_PROJECT_GATES_REQUIRED');
 const parameters=[...c.parameters.map(p=>{
  if(p.parameter_id!==controls.selector)return copy(p);
  check(record(p.constraints_json)&&Array.isArray(p.constraints_json.values),'EXISTING_SELECTOR_DOMAIN_REQUIRED');
  return{...copy(p),constraints_json:{...p.constraints_json,values:[...p.constraints_json.values,...keys.map(k=>roofMasticMeshProfilesR24[k].systemYesRu)]}};
 }),...gates,...extra.parameters.map(p=>p.parameter_id===controls.publicMethod?{...p,default_value:null,truth_metadata:{...p.truth_metadata,
   visibility_role:'USER_INPUT',value_source_role:'PROJECT_SPECIFIC_INPUT',source_confirmation_required:false,
   provenance:{consumer_input_role_v1:'OBJECT_FACT'},guide:{...(record(p.truth_metadata.guide)?p.truth_metadata.guide:{}),
    guide_short_ru:'Выберите фактически предусмотренный способ покрытия. Это не подтверждение основания, условий, проекта или допуска работ.'}}}
  :{...p,default_value:null,truth_metadata:unresolvedApplicationNormTruthR1(p.truth_metadata,pack.newPhysicalNeeds[0]!.reasonRu)})]
  .map((p,ordinal)=>({...p,ordinal}));
 const oldNeedIds=new Set(pack.existingUnknownNeedsToReuse.map(n=>n.rowId));
 const oldResources=c.resources.map(row=>{
  const reuse=oldNeedIds.has(row.row_id);
  if(reuse){const expected=pack.existingUnknownNeedsToReuse.find(n=>n.rowId===row.row_id)!;
   check(row.row_sha256===expected.capturedRowSha256&&row.unit_id===expected.unitId&&row.cost_owner_id===expected.costOwnerId,'EXISTING_PHYSICAL_NEED_DRIFT');}
  // Existing native/legacy alternatives stay intact and are excluded only
  // while a NEW003 method is selected. The 36 compatible unknown needs grow
  // by OR; no old material, formula, unit, provenance or price owner changes.
  const{row_sha256:_old,...body}=copy(row);const next={...body,
   inclusion_ast:reuse?{kind:'or',operands:[row.inclusion_ast,anyNew]}
    :{kind:'and',operands:[row.inclusion_ast,{kind:'not',operand:anyNew}]}};
  return{...next,row_sha256:valueSha(next)};
 });
 const native=definitions.flatMap((d,index)=>d.resources.map(row=>{
  const profile=roofMasticMeshProfilesR24[keys[index]!],rate=profile.rates.find(r=>profile.prefix+':'+r.role===row.row_id);
  check(rate&&nativeRequired[rate.role],'EXACT_NATIVE_ROW_OPERATION_REQUIRED');
  const{row_sha256:_old,...body}=row;const next={...body,
   resource_graph:{...row.resource_graph,operationCompositionV1:operation(nativeRequired[rate!.role]!)}};
  return{...next,row_sha256:valueSha(next)};
 }));
 const post=extra.resources.map(row=>{const{row_sha256:_old,...body}=row;const next={...body,
  source_metadata:{...row.source_metadata,sourceRole:'UNRESOLVED_APPLICATION_NORM',sourceNormQuantityAccepted:false,normativeTrace:[],
   excludedExistingCostOwnerRows:pack.costOwnershipBoundary.nativeBoilerRows,excludedExistingMaterialRows:pack.costOwnershipBoundary.nativeMaterialRows,
   duplicateBoilerOrReadyPrimerOrTorchGasAllowed:false,unresolved_norm_reason:pack.newPhysicalNeeds[0]!.reasonRu},
  resource_graph:{...row.resource_graph,operationCompositionV1:operation(['reinforced_carpet'])}};return{...next,row_sha256:valueSha(next)};});
 const resources=[...oldResources,...native,...post],formulas=[...copy(c.formulas),...definitions.flatMap(d=>d.formulas),...extra.formulas];
 const consumers=buildMasterParameterCalculationConsumers({parameters,formulas,resources});
 const finalParameters:AutomaticOwnerDefinition['parameters']=parameters.map(p=>({...p,truth_metadata:{...p.truth_metadata,formula_consumers:consumers.formulaConsumers[p.parameter_id],
  resource_branch_consumers:consumers.resourceConsumers[p.parameter_id]}}));
 const oldProfile=c.definition.applicability.sourceProfileSelectionV1,oldPrimary=c.definition.applicability.primaryMeasureSelectionV1;
 check(record(oldProfile)&&record(oldPrimary)&&Array.isArray(oldPrimary.selections),'EXACT_OLD_PROFILE_PRIMARY_REQUIRED');
 const oldTorch='Два наплавляемых слоя по готовому минеральному основанию',oldMastic='Полимерная мастичная кровля в три слоя толщиной 1,8 мм с проектными узлами';
 const choice=(publicValue:string,selectorValue:string,sources:readonly Json[])=>({selectorValue,sources,
  when:{kind:'and',operands:[{kind:'equals',parameterId:controls.publicMethod,value:publicValue},{kind:'greater_than',parameterId:controls.area,value:0}]},geometryCopies:[]});
 check(Array.isArray(oldProfile.profiles)&&record(oldProfile.profiles[0])&&Array.isArray(oldProfile.profiles[0].sources)
  &&oldProfile.profiles[0].sources.every(record),'EXACT_OLD_TORCH_SOURCE_REQUIRED');
 const masticSource=c.normativeSources.find(s=>s.source_key==='master212_roof_four_technology_family_r1:'+pack.currentParent.catalogId);
 check(masticSource,'RETAINED033_SOURCE_REQUIRED');
 const sourceProfileSelectionV1={...copy(oldProfile),publicMethodSelectionV1:{contract:'canonical-source-profile-public-method/r1',parameterId:controls.publicMethod},
  profiles:[choice(pack.choices.torch_existing,oldTorch,oldProfile.profiles[0].sources),
   choice(pack.choices.polymer_mastic_existing,oldMastic,[{sourceId:masticSource!.source_key,artifactSha256:bitumen.sources[0]!.sha256,locator:'КРЕР12-01-033-01,PDF40;только прежние9строк,без новой приёмки'}]),
   ...keys.map(k=>choice(pack.choices[k],roofMasticMeshProfilesR24[k].systemYesRu,[{sourceId:pack.sourceKey,artifactSha256:bitumen.sources[0]!.sha256,locator:roofMasticMeshProfilesR24[k].sources[0]!.locators}]))]};
 const witnessBody={contract:'canonical-source-profile-captured-absence/r1',capturedParentDefinitionId:c.definition.id,
  capturedParentDefinitionVersion:c.definition.definition_version,capturedParentDefinitionSha256:c.definition.definition_sha256,
  capturedSourceProfileSelectionMetadata:copy(oldProfile),capturedSourceProfileSelectionMetadataSha256:valueSha(oldProfile)};
 const witness={...witnessBody,witnessSha256:valueSha(witnessBody)};
 const sourceMetadataWithLegacy={...sourceProfileSelectionV1,publicMethodSelectionV1:{...sourceProfileSelectionV1.publicMethodSelectionV1,absentParameterLegacyV1:witness}};
 const parametersWithWitness=finalParameters.map(p=>p.parameter_id!==controls.selector?p:{...p,truth_metadata:{...p.truth_metadata,
  provenance:{...(record(p.truth_metadata.provenance)?p.truth_metadata.provenance:{}),public_method_absence_witness_sha256:witness.witnessSha256}}});
 const primaryMeasureSelectionV1={...copy(oldPrimary),selections:[...oldPrimary.selections,
  ...keys.map(k=>({selectorValue:roofMasticMeshProfilesR24[k].systemYesRu,primaryMeasureParameterId:controls.area,unitId:'m2'}))]};
 check(finalParameters.length===156&&formulas.length===303&&resources.length===309,'EXACT_RESULT_SHAPE');
 return{capture:c,parameters:parametersWithWitness,formulas,resources,addedRowIds:native.map(r=>r.row_id).concat(roofMasticMeshPostRowR24),
  nativeRowIds:native.map(r=>r.row_id),newParameterIds:finalParameters.filter(p=>!oldIds.has(p.parameter_id)).map(p=>p.parameter_id),
  applicability:{...copy(c.definition.applicability),sourceProfileSelectionV1:sourceMetadataWithLegacy,primaryMeasureSelectionV1,fullTechnicalAcceptance:false,newFullTechnologies:0,
   masticMesh003WholeSourceColumns:pack.normIds,explicitPublicMethodIsNotProjectApproval:true}};
}
export function roofMasticMeshIndependentMapEntriesR24(){
 const native=keys.flatMap(k=>roofMasticMeshProfilesR24[k].rates.map(r=>{const ops=nativeRequired[r.role];check(ops,'NATIVE_OPERATIONS_REQUIRED');
  return{expectedResourceId:'mastic003:'+k+':'+r.role,operationId:pack.prefix+':'+ops![0],requiredOperationIds:ops!.map(o=>pack.prefix+':'+o),
   sourceId:pack.sourceKey,category:r.category,unitId:r.unitId,specification:r.titleRu,condition:'EXACT_WHOLE_'+roofMasticMeshProfilesR24[k].normId,
   quantityRule:'EXACT_NATIVE_RATE_TIMES_OWN_MEASURED_FIELD_AREA_DIV100',formulaId:roofMasticMeshProfilesR24[k].prefix+':formula:'+r.role,
   resolution:{kind:'ROW',rowId:roofMasticMeshProfilesR24[k].prefix+':'+r.role}};}));
 const reused=pack.existingUnknownNeedsToReuse.map(n=>({expectedResourceId:'mastic003:existing-physical:'+n.rowId,operationId:n.operationId,
  requiredOperationIds:n.requiredOperationIds,sourceId:'MASTER216_EXISTING_UNRESOLVED_APPLICATION_NEED',category:n.category,unitId:n.unitId,
  specification:n.titleRu,condition:'EITHER_NEW003_PROFILE',quantityRule:'RETAIN_EXISTING_NULL_NO_NEW_NORM_OR_OWNER',formulaId:n.formulaId,resolution:{kind:'ROW',rowId:n.rowId}}));
 return[...native,...reused,{expectedResourceId:'mastic003:hot-feed-post',operationId:pack.prefix+':reinforced_carpet',requiredOperationIds:[pack.prefix+':reinforced_carpet'],
  sourceId:'MASTER216_UNRESOLVED_NON_BOILER_APPLICATION_POST',category:'equipment',unitId:'set',specification:pack.newPhysicalNeeds[0]!.titleRu,
  condition:'EITHER_NEW003_PROFILE',quantityRule:'UNKNOWN_NOT_ZERO_NO_SECOND_BOILER_OR_PRIMER',formulaId:roofMasticMeshPostRowR24+':formula',resolution:{kind:'ROW',rowId:roofMasticMeshPostRowR24}}];
}
