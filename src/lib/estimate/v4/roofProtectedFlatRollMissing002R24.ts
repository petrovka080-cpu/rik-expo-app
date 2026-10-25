import assert from 'node:assert/strict';
import plainGlue from '../../../../data/estimate-benchmarks/source-packs/roof-protected-flat-roll-native00201-r24.json';
import treatedGlue from '../../../../data/estimate-benchmarks/source-packs/roof-protected-flat-roll-native00202-r24.json';
import cementProtection from '../../../../data/estimate-benchmarks/source-packs/roof-protected-flat-roll-native00203-r24.json';
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
export const roofProtectedFlatRoll002NativeR24={plainGlue,treatedGlue,cementProtection};
type Key=keyof typeof roofProtectedFlatRoll002NativeR24;
const keys:readonly Key[]=['plainGlue','treatedGlue','cementProtection'];
const chosen=(key:Key)=>({kind:'equals',parameterId:plainGlue.systemParameterId,value:roofProtectedFlatRoll002NativeR24[key].systemYesRu});
const gateId=(key:Key)=>'roof_protected002_'+roofProtectedFlatRoll002NativeR24[key].normId.slice(-2)+'_source_product_resolution_r24';
const gateValue=(key:Key)=>'EXACT_'+roofProtectedFlatRoll002NativeR24[key].normId.replace(/-/gu,'_')+'_SIMAZINE_AND_WHOLE_PRODUCT_SYSTEM_ADMITTED';

/** Three complete source kernels, not extensions of the existing00209 source.
 * Every new row stays behind the existing APPLICATION_NORM authority gate for
 * exact historical simazine/antiseptic products; object/PPR data cannot admit it. */
export function buildRoofProtectedFlatRollMissing002R24(sourceKey:string):AutomaticOwnerDefinition{
 assert.equal(sourceKey,plainGlue.sources[0]!.id,'PROTECTED002_SOURCE_IDENTITY_AND_PRODUCT_APPLICABILITY_REVIEW_HOLD');
 const definitions=keys.map(key=>{const p=roofProtectedFlatRoll002NativeR24[key];const input:SourcePinnedRoofNormPackR1={...p,measurementUnitId:'m2',
  rates:p.rates.map((r):SourcePinnedRoofNormRateR1=>{assert(r.costTreatment==='OWN_COST'||r.costTreatment==='INFORMATIONAL_SCOPE');return{...r,costTreatment:r.costTreatment==='INFORMATIONAL_SCOPE'?'INFORMATIONAL_SCOPE':'OWN_COST'};})};
  return sourcePinnedRoofNormOwnerR1(input);});
 const extra=buildAutomaticConstructionOwnerR1({contract:'roof002-exact-historical-product-source-applicability/r24',semanticOwner:'roof:protected-flat:missing002:r24',sourceId:sourceKey,
  normId:'EXACT_SIMAZINE_ANTISEPTIC_SOURCE_SYSTEM_UNRESOLVED',sourceMetadata:{source_title:plainGlue.sources[0]!.titleRu,source_document_version:plainGlue.sources[0]!.printedEdition,
   definition_hash:plainGlue.sources[0]!.sha256,artifact_sha256:plainGlue.sources[0]!.sha256,exact_locator:plainGlue.sources[0]!.locators},
  applicabilityRu:plainGlue.sourceProductReason,ordinary:[],profile:[],conditional:keys.map(key=>({id:gateId(key),title:'Точный первичный продукт иприменимость всейколонки'+roofProtectedFlatRoll002NativeR24[key].normId,
   valueType:'enum' as const,unitId:null,kind:'internal' as const,values:[gateValue(key)]})),rows:[],deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:plainGlue.remainingScopeRu});
 const firstById=new Map<string,AutomaticOwnerDefinition['parameters'][number]>();for(const d of definitions)for(const p of d.parameters)if(!firstById.has(p.parameter_id))firstById.set(p.parameter_id,p);
 assert.equal(firstById.size,4);
 const any={kind:'or',operands:keys.map(chosen)};
 const parameters:AutomaticOwnerDefinition['parameters']=[...firstById.values(),...extra.parameters].map((p,ordinal)=>{
  let constraints={...p.constraints_json};
  if(p.parameter_id===plainGlue.systemParameterId)constraints={...constraints,values:[...keys.map(k=>roofProtectedFlatRoll002NativeR24[k].systemYesRu),plainGlue.unknownChoiceRu,plainGlue.legacyChoiceRu]};
  if([plainGlue.conditionsParameterId,plainGlue.areaParameterId,plainGlue.measurementParameterId].includes(p.parameter_id))constraints={...constraints,requiredWhen:any};
  const key=keys.find(k=>gateId(k)===p.parameter_id),internal=key!==undefined||p.parameter_id===plainGlue.conditionsParameterId||p.parameter_id===plainGlue.areaParameterId;
  if(key)constraints={...constraints,requiredWhen:chosen(key)};
  const truth=internal?{...p.truth_metadata,visibility_role:'INTERNAL_ONLY',value_source_role:'PROJECT_DOCUMENTATION',source_confirmation_required:true,
   provenance:{...(object(p.truth_metadata.provenance)?p.truth_metadata.provenance:{}),consumer_input_role_v1:'APPLICATION_TECHNICAL'}}:p.truth_metadata;
  return{...p,ordinal,required:false,default_value:null,constraints_json:constraints,truth_metadata:key?unresolvedApplicationNormTruthR1(truth,roofProtectedFlatRoll002NativeR24[key].sourceProductReason):truth};
 });
 const resources=definitions.flatMap((d,index)=>d.resources.map(row=>{
  const key=keys[index]!,p=roofProtectedFlatRoll002NativeR24[key],rate=p.rates.find(r=>row.row_id===p.prefix+':'+r.role);assert(rate);
  const refs=rate.requiredOperationKeys.map(k=>{const op=p.applicableWholeOperations.find(o=>o.key===k);assert(op);return{operationId:p.prefix+':operation:'+k,
   operationTitleRu:op.titleRu,processOrdinal:op.printedOrdinal,completionCriterionRu:'Целый исходный способ002;точный продукт/применимость ифактическаяприёмка отдельно.'};});assert(refs.length>0);
  const operation:CanonicalEstimateOperationReference={contractVersion:'canonical-operation-resource/v1',groupId:'roof:protected-flat:missing002:r24',groupTitleRu:p.groupTitleRu,...refs[0]!,...(refs.length>1?{additionalOperations:refs.slice(1)}:{})};
  const{row_sha256:_old,...body}=row;const result={...body,inclusion_ast:{kind:'and',operands:[row.inclusion_ast,{kind:'equals',parameterId:gateId(key),value:gateValue(key)}]},
   source_metadata:{...row.source_metadata,exactSourceNormId:p.normId,existing00209SourceAndRowsUnchanged:true,sourceProductApplicabilityHold:p.sourceProductReason},
   resource_graph:{...row.resource_graph,operationCompositionV1:operation,
    publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',nameRu:row.title_ru,sourceTitleRu:rate.sourceInternalTitleRu,detailsRu:[p.scopeRu,p.sourceProductReason]},
    ...(rate.role==='boiler400l'?{roofSharedBoilerBoundaryR24:{physicalStockOwnerRowId:'roof:flat003006:r24:stock:boiler-400l',physicalQuantity:null,nativeBudgetUnit:'machine_hour',physicalStockUnit:'pcs',noConversionFromHours:true,noSecondOperatingPayment:true}}:{})}};
  return{...result,row_sha256:hash(result)};
 }));
 const formulas=definitions.flatMap(d=>d.formulas);assert.deepEqual([parameters.length,formulas.length,resources.length],[7,35,35]);
 const declared=new Set(parameters.map(p=>p.parameter_id));for(const r of resources){resolveInclusionGraph(r.inclusion_ast,{});for(const id of canonicalConditionParameterIds(r.inclusion_ast))assert(declared.has(id));}
 return{...definitions[0]!,parameters,formulas,resources,runtimeInput:{},runtimeClassification:{},runtimeSourceIds:{},ordinaryParameterIds:[]};
}
