import assert from 'node:assert/strict';
import asphaltProtection from '../../../../data/estimate-benchmarks/source-packs/roof-flat-roll-native00204-r24.json';
import concreteSlabs from '../../../../data/estimate-benchmarks/source-packs/roof-flat-roll-native00205-r24.json';
import reinforcedCement from '../../../../data/estimate-benchmarks/source-packs/roof-flat-roll-native00206-r24.json';
import polymerMastic from '../../../../data/estimate-benchmarks/source-packs/roof-flat-roll-native00207-r24.json';
import torchThree from '../../../../data/estimate-benchmarks/source-packs/roof-flat-roll-native00208-r24.json';
import torchOne from '../../../../data/estimate-benchmarks/source-packs/roof-flat-roll-native00210-r24.json';
import gravelOnly from '../../../../data/estimate-benchmarks/source-packs/roof-flat-roll-native00211-r24.json';
import {buildRoofProtectedFlatRollMissing002R24,roofProtectedFlatRoll002NativeR24} from './roofProtectedFlatRollMissing002R24';
import {sourcePinnedRoofNormOwnerR1,type SourcePinnedRoofNormPackR1,type SourcePinnedRoofNormRateR1} from './sourcePinnedRoofNormOwnerR1';
import {buildAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,type AutomaticOwnerDefinition} from './automaticConstructionOwnerR1';
import {canonicalEstimateStableJson} from '../backendPlatform/canonicalEstimateDeterminism';
import {canonicalEstimateSha256HexText} from '../backendPlatform/canonicalEstimateSha256';
import {resolveInclusionGraph} from '../backendPlatform/inclusionGraph';
import {canonicalConditionParameterIds} from '../backendPlatform/canonicalEffectiveResourceQuantityV1';
import type {CanonicalEstimateOperationReference} from '../backendPlatform/canonicalEstimateOperationComposition';

type Json=Record<string,unknown>;
const object=(v:unknown):v is Json=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const hash=(v:unknown)=>canonicalEstimateSha256HexText(canonicalEstimateStableJson(v));
type Row=AutomaticOwnerDefinition['resources'][number];
const hashed=(row:Row,ordinal:number):Row=>{const{row_sha256:_old,...body}=row;const next={...body,ordinal};return{...next,row_sha256:hash(next)};};
export const roofRemaining002NativeR24={asphaltProtection,concreteSlabs,reinforcedCement,polymerMastic,torchThree,torchOne,gravelOnly};
type Key=keyof typeof roofRemaining002NativeR24;
const keys:readonly Key[]=['asphaltProtection','concreteSlabs','reinforcedCement','polymerMastic','torchThree','torchOne','gravelOnly'];
const chosen=(key:Key)=>({kind:'equals',parameterId:asphaltProtection.systemParameterId,value:roofRemaining002NativeR24[key].systemYesRu});
const gateId=(key:Key)=>'roof_missing002_'+roofRemaining002NativeR24[key].normId.slice(-2)+'_source_project_r24';
const gateValue=(key:Key)=>'EXACT_'+roofRemaining002NativeR24[key].normId.replace(/-/gu,'_')+'_PRODUCT_PROJECT_AND_DISTINCT_PAID_SCOPE';

/** Seven remaining whole profiles; the source09 remains captured/reused.
 * Local definitions only: no currentmetadata rewrite,source admission orConfig. */
export function buildRoofRemainingFlatRollWhole002R24(sourceKey:string):AutomaticOwnerDefinition{
 assert.equal(sourceKey,asphaltProtection.sources[0]!.id,'WHOLE002_CURRENT_IDENTITY_AND_SOURCE_REVIEW_HOLD');
 const definitions=keys.map(key=>{const p=roofRemaining002NativeR24[key];const input:SourcePinnedRoofNormPackR1={...p,measurementUnitId:'m2',rates:p.rates.map((r):SourcePinnedRoofNormRateR1=>{
  assert(r.costTreatment==='OWN_COST'||r.costTreatment==='INFORMATIONAL_SCOPE');return{...r,costTreatment:r.costTreatment==='INFORMATIONAL_SCOPE'?'INFORMATIONAL_SCOPE':'OWN_COST'};
 })};return sourcePinnedRoofNormOwnerR1(input);});
 const extra=buildAutomaticConstructionOwnerR1({contract:'roof002-remaining-source-and-project-gates/r24',semanticOwner:'roof:flat-roll:missing002:r24',sourceId:sourceKey,
  normId:'EXACT_OWN002_SOURCE_AND_PROJECT_SCOPE_UNCONFIRMED',sourceMetadata:{source_title:asphaltProtection.sources[0]!.titleRu,source_document_version:asphaltProtection.sources[0]!.printedEdition,
   definition_hash:asphaltProtection.sources[0]!.sha256,artifact_sha256:asphaltProtection.sources[0]!.sha256,exact_locator:asphaltProtection.sources[0]!.locators},
  applicabilityRu:'Точная собственная система,узел иплощадь;химические004–06 имеют отдельныйAPPLICATION_SOURCE_HOLD.',ordinary:[],profile:[],
  conditional:keys.map(key=>({id:gateId(key),title:'Точный источник/проект иединственнаяоплата'+roofRemaining002NativeR24[key].normId,valueType:'enum' as const,unitId:null,kind:'internal' as const,values:[gateValue(key)]})),
  rows:[],deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:asphaltProtection.remainingScopeRu});
 const firstById=new Map<string,AutomaticOwnerDefinition['parameters'][number]>();for(const d of definitions)for(const p of d.parameters)if(!firstById.has(p.parameter_id))firstById.set(p.parameter_id,p);
 assert.equal(firstById.size,4);const any={kind:'or',operands:keys.map(chosen)};
 const parameters:AutomaticOwnerDefinition['parameters']=[...firstById.values(),...extra.parameters].map((p,ordinal)=>{
  let constraints={...p.constraints_json};
  if(p.parameter_id===asphaltProtection.systemParameterId)constraints={...constraints,values:[...keys.map(k=>roofRemaining002NativeR24[k].systemYesRu),asphaltProtection.unknownChoiceRu,asphaltProtection.legacyChoiceRu]};
  if([asphaltProtection.conditionsParameterId,asphaltProtection.areaParameterId,asphaltProtection.measurementParameterId].includes(p.parameter_id))constraints={...constraints,requiredWhen:any};
  const key=keys.find(k=>gateId(k)===p.parameter_id),internal=key!==undefined||p.parameter_id===asphaltProtection.conditionsParameterId||p.parameter_id===asphaltProtection.areaParameterId;
  if(key)constraints={...constraints,requiredWhen:chosen(key)};
  const truth=internal?{...p.truth_metadata,visibility_role:'INTERNAL_ONLY',value_source_role:'PROJECT_DOCUMENTATION',source_confirmation_required:true,
   provenance:{...(object(p.truth_metadata.provenance)?p.truth_metadata.provenance:{}),consumer_input_role_v1:'APPLICATION_TECHNICAL'}}:p.truth_metadata;
  return{...p,ordinal,required:false,default_value:null,constraints_json:constraints,truth_metadata:key&&roofRemaining002NativeR24[key].requiresApplicationSourceResolution?unresolvedApplicationNormTruthR1(truth,roofRemaining002NativeR24[key].sourceProductReason):truth};
 });
 const resources=definitions.flatMap((d,index)=>d.resources.map(row=>{
  const key=keys[index]!,p=roofRemaining002NativeR24[key],rate=p.rates.find(r=>row.row_id===p.prefix+':'+r.role);assert(rate);
  const refs=rate.requiredOperationKeys.map(k=>{const op=p.applicableWholeOperations.find(o=>o.key===k);assert(op);return{operationId:p.prefix+':operation:'+k,
   operationTitleRu:op.titleRu,processOrdinal:op.printedOrdinal,completionCriterionRu:'Собственный целыйспособ002 выполнен;точнаясовместимость иприёмка отдельно.'};});assert(refs.length>0);
  const operation:CanonicalEstimateOperationReference={contractVersion:'canonical-operation-resource/v1',groupId:'roof:flat-roll:missing002:r24',groupTitleRu:p.groupTitleRu,...refs[0]!,...(refs.length>1?{additionalOperations:refs.slice(1)}:{})};
  const{row_sha256:_old,...body}=row;const result={...body,inclusion_ast:{kind:'and',operands:[row.inclusion_ast,{kind:'equals',parameterId:gateId(key),value:gateValue(key)}]},
   source_metadata:{...row.source_metadata,exactSourceNormId:p.normId,existing00209Unchanged:true,exactOwnResourceLocator:p.exactOwnResourceLocator,sourceProductProjectBoundary:p.sourceProductReason},
   resource_graph:{...row.resource_graph,operationCompositionV1:operation,
    publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',nameRu:row.title_ru,sourceTitleRu:rate.sourceInternalTitleRu,detailsRu:[p.scopeRu,p.sourceProductReason]},
    ...(rate.role==='boiler400l'?{roofSharedBoilerBoundaryR24:{physicalStockOwnerRowId:'roof:flat003006:r24:stock:boiler-400l',physicalQuantity:null,nativeBudgetUnit:'machine_hour',physicalStockUnit:'pcs',noConversionFromHours:true,noSecondOperatingPayment:true}}:{})}};
  return{...result,row_sha256:hash(result)};
 })).map(hashed);
 const formulas=definitions.flatMap(d=>d.formulas).map((f,ordinal)=>({...f,ordinal}));
 assert.deepEqual([parameters.length,formulas.length,resources.length],[11,69,69]);
 return{...definitions[0]!,parameters,formulas,resources,runtimeInput:{},runtimeClassification:{},runtimeSourceIds:{},ordinaryParameterIds:[]};
}

/** One proposed schema for all ten missing002 profiles. Prior3 native packs
 * andmodel are unchanged hardlinks; existing00209 is not re-built here. */
export function buildRoofMissingFlatRollAll002R24(sourceKey:string):AutomaticOwnerDefinition{
 const first=buildRoofProtectedFlatRollMissing002R24(sourceKey),rest=buildRoofRemainingFlatRollWhole002R24(sourceKey);
 const allPacks=[...Object.values(roofProtectedFlatRoll002NativeR24),...Object.values(roofRemaining002NativeR24)];
 const common=new Set([asphaltProtection.systemParameterId,asphaltProtection.conditionsParameterId,asphaltProtection.areaParameterId,asphaltProtection.measurementParameterId]);
 const merged=new Map<string,AutomaticOwnerDefinition['parameters'][number]>();
 for(const d of [first,rest])for(const p of d.parameters){const old=merged.get(p.parameter_id);if(old){assert(common.has(p.parameter_id),'DUPLICATE002_PARAMETER_NOT_SHARED');assert.equal(old.unit_id,p.unit_id);assert.equal(old.value_type,p.value_type);}else merged.set(p.parameter_id,p);}
 const values=allPacks.map(p=>p.systemYesRu);assert.equal(new Set(values).size,10);
 const any={kind:'or',operands:allPacks.map(p=>({kind:'equals',parameterId:p.systemParameterId,value:p.systemYesRu}))};
 const parameters:AutomaticOwnerDefinition['parameters']=[...merged.values()].map((p,ordinal)=>{
  let constraints={...p.constraints_json};
  if(p.parameter_id===asphaltProtection.systemParameterId)constraints={...constraints,values:[...values,asphaltProtection.unknownChoiceRu,asphaltProtection.legacyChoiceRu]};
  if(common.has(p.parameter_id)&&p.parameter_id!==asphaltProtection.systemParameterId)constraints={...constraints,requiredWhen:any};
  return{...p,ordinal,constraints_json:constraints,truth_metadata:common.has(p.parameter_id)?{...p.truth_metadata,guide:{...(object(p.truth_metadata.guide)?p.truth_metadata.guide:{}),exact_locator:'PDF9–11/table002:ten exact missingcolumns;existing09retained,perrowownlocators'}}:p.truth_metadata};
 });
 const formulas=[...first.formulas,...rest.formulas].map((f,ordinal)=>({...f,ordinal})),resources=[...first.resources,...rest.resources].map(hashed);
 assert.deepEqual([parameters.length,formulas.length,resources.length],[14,104,104]);assert.equal(new Set(resources.map(r=>r.row_id)).size,104);
 const declared=new Set(parameters.map(p=>p.parameter_id));for(const r of resources){resolveInclusionGraph(r.inclusion_ast,{});for(const id of canonicalConditionParameterIds(r.inclusion_ast))assert(declared.has(id));}
 return{...first,parameters,formulas,resources,runtimeInput:{},runtimeClassification:{},runtimeSourceIds:{},ordinaryParameterIds:[]};
}
