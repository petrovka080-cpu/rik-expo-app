import assert from 'node:assert/strict';
import firstRoll from '../../../../data/estimate-benchmarks/source-packs/roof-vapor-native01501-r24.json';
import extraRoll from '../../../../data/estimate-benchmarks/source-packs/roof-vapor-native01502-r24.json';
import firstCoat from '../../../../data/estimate-benchmarks/source-packs/roof-vapor-native01504-r24.json';
import extraCoat from '../../../../data/estimate-benchmarks/source-packs/roof-vapor-native01505-r24.json';
import {sourcePinnedRoofNormOwnerR1,type SourcePinnedRoofNormPackR1,type SourcePinnedRoofNormRateR1} from './sourcePinnedRoofNormOwnerR1';
import {buildAutomaticConstructionOwnerR1,type AutomaticOwnerDefinition} from './automaticConstructionOwnerR1';
import {canonicalEstimateStableJson} from '../backendPlatform/canonicalEstimateDeterminism';
import {canonicalEstimateSha256HexText} from '../backendPlatform/canonicalEstimateSha256';
import {resolveInclusionGraph} from '../backendPlatform/inclusionGraph';
import {canonicalConditionParameterIds} from '../backendPlatform/canonicalEffectiveResourceQuantityV1';
import type {CanonicalEstimateOperationReference} from '../backendPlatform/canonicalEstimateOperationComposition';

type Json=Record<string,unknown>;
const object=(v:unknown):v is Json=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const hash=(v:unknown)=>canonicalEstimateSha256HexText(canonicalEstimateStableJson(v));
export const roofMissing015NativeR24={firstRoll,extraRoll,firstCoat,extraCoat};
type Key=keyof typeof roofMissing015NativeR24;
const keys:readonly Key[]=['firstRoll','extraRoll','firstCoat','extraCoat'];
const c={firstMethod:firstRoll.systemParameterId,firstArea:firstRoll.measurementParameterId,
 extraRollMethod:extraRoll.systemParameterId,extraRollArea:extraRoll.measurementParameterId,
 extraCoatMethod:extraCoat.systemParameterId,extraCoatArea:extraCoat.measurementParameterId,
 conditions:firstRoll.conditionsParameterId,measurement:firstRoll.areaParameterId};
const selected=(key:Key)=>({kind:'equals',parameterId:roofMissing015NativeR24[key].systemParameterId,value:roofMissing015NativeR24[key].systemYesRu});
const firstAny={kind:'or',operands:[selected('firstRoll'),selected('firstCoat')]};
const anyProfile={kind:'or',operands:keys.map(selected)};
const projectId=(key:Key)=>'roof_missing015_'+roofMissing015NativeR24[key].normId.slice(-2)+'_source_project_r24';
const projectChoice=(key:Key)=>'EXACT_'+roofMissing015NativeR24[key].normId.replace(/-/gu,'_')+'_SYSTEM_PRIMER_AND_DISTINCT_LAYERS';

/** Only missing01501/02/04/05 kernels. Existing01503 stays under its own
 * captured source/IDs. Additional layers require the compatible positive
 * first-layer scope; no extra-on-zero-first or old-paid-first substitute. */
export function buildRoofMissingVaporProfilesWhole015R24(sourceKey:string):AutomaticOwnerDefinition{
 assert.equal(sourceKey,firstRoll.sources[0]!.id,'VAPOR015_SOURCE_IDENTITY_REVIEW_HOLD');
 const definitions=keys.map(key=>{
  const p=roofMissing015NativeR24[key];
  const input:SourcePinnedRoofNormPackR1={...p,measurementUnitId:'m2',rates:p.rates.map((rate):SourcePinnedRoofNormRateR1=>{
   assert(rate.costTreatment==='OWN_COST'||rate.costTreatment==='INFORMATIONAL_SCOPE');
   return{...rate,costTreatment:rate.costTreatment==='INFORMATIONAL_SCOPE'?'INFORMATIONAL_SCOPE':'OWN_COST'};
  })};return sourcePinnedRoofNormOwnerR1(input);
 });
 const extra=buildAutomaticConstructionOwnerR1({contract:'roof-vapor015-local-project-source-boundary/r24',semanticOwner:'roof:vapor:missing015:r24',sourceId:sourceKey,
  normId:'EXACT_015_NATIVE_PRODUCT_AND_LAYER_SCOPE_UNCONFIRMED',sourceMetadata:{source_title:'КРЕР12:собственные оклеечные и обмазочные профили015',source_document_version:firstRoll.sources[0]!.printedEdition,
   definition_hash:firstRoll.sources[0]!.sha256,artifact_sha256:firstRoll.sources[0]!.sha256,exact_locator:firstRoll.sources[0]!.locators},
  applicabilityRu:'Точная система и последовательность оплачиваемых слоёв;приготовление грунтовки включено только в01/04.',ordinary:[],profile:[],
  conditional:keys.map(key=>({id:projectId(key),title:'Точная система и самостоятельный слой'+roofMissing015NativeR24[key].normId,valueType:'enum' as const,unitId:null,kind:'internal' as const,values:[projectChoice(key)]})),
  rows:[],deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:firstRoll.remainingScopeRu});
 const firstById=new Map<string,AutomaticOwnerDefinition['parameters'][number]>();
 for(const d of definitions)for(const p of d.parameters)if(!firstById.has(p.parameter_id))firstById.set(p.parameter_id,p);
 assert.equal(firstById.size,8,'EXACT_SINGLE015_NEW_FIRST_EXTRA_SCHEMA');
 const parameters:AutomaticOwnerDefinition['parameters']=[...firstById.values(),...extra.parameters].map((p,ordinal)=>{
  let constraints={...p.constraints_json};
  if(p.parameter_id===c.firstMethod)constraints={...constraints,values:[firstRoll.systemYesRu,firstCoat.systemYesRu,firstRoll.unknownChoiceRu,firstRoll.legacyChoiceRu]};
  if(p.parameter_id===c.extraRollMethod)constraints={...constraints,values:[extraRoll.systemYesRu],forbiddenWhen:{kind:'or',operands:[{kind:'not',operand:selected('firstRoll')},{kind:'less_than_or_equal',parameterId:c.firstArea,value:0}]}};
  if(p.parameter_id===c.extraCoatMethod)constraints={...constraints,values:[extraCoat.systemYesRu],forbiddenWhen:{kind:'or',operands:[{kind:'not',operand:selected('firstCoat')},{kind:'less_than_or_equal',parameterId:c.firstArea,value:0}]}};
  if(p.parameter_id===c.firstArea)constraints={...constraints,requiredWhen:firstAny};
  if(p.parameter_id===c.extraRollArea)constraints={...constraints,requiredWhen:selected('extraRoll')};
  if(p.parameter_id===c.extraCoatArea)constraints={...constraints,requiredWhen:selected('extraCoat')};
  if(p.parameter_id===c.conditions||p.parameter_id===c.measurement)constraints={...constraints,requiredWhen:anyProfile};
  const key=keys.find(k=>projectId(k)===p.parameter_id);
  if(key)constraints={...constraints,requiredWhen:selected(key)};
  const internal=p.parameter_id===c.conditions||p.parameter_id===c.measurement||key!==undefined;
  return{...p,ordinal,required:false,default_value:null,constraints_json:constraints,truth_metadata:internal?{...p.truth_metadata,
   visibility_role:'INTERNAL_ONLY',value_source_role:'PROJECT_DOCUMENTATION',source_confirmation_required:true,
   provenance:{...(object(p.truth_metadata.provenance)?p.truth_metadata.provenance:{}),consumer_input_role_v1:'APPLICATION_TECHNICAL'},
   guide:{...(object(p.truth_metadata.guide)?p.truth_metadata.guide:{}),source_role:'PROJECT_DOCUMENTATION',exact_locator:firstRoll.sources[0]!.locators}}:p.truth_metadata};
 });
 const resources:AutomaticOwnerDefinition['resources']=definitions.flatMap((d,index)=>d.resources.map(row=>{
  const key=keys[index]!,p=roofMissing015NativeR24[key],rate=p.rates.find(r=>row.row_id===p.prefix+':'+r.role);assert(rate);
  const stages=rate.requiredOperationKeys.map(k=>{const op=p.printedOperationRoster.find(o=>o.key===k);assert(op);return{
   operationId:p.prefix+':operation:'+k,operationTitleRu:op.titleRu,processOrdinal:op.printedOrdinal,
   completionCriterionRu:'Целая собственная операция015;выполнение и совместимость всех слоёв подтверждаются отдельно.'};});assert(stages.length>0);
  const operation:CanonicalEstimateOperationReference={contractVersion:'canonical-operation-resource/v1',groupId:'roof:vapor:missing015:r24',groupTitleRu:p.groupTitleRu,
   ...stages[0]!,...(stages.length>1?{additionalOperations:stages.slice(1)}:{})};
  const firstForExtra=key==='extraRoll'?'firstRoll':key==='extraCoat'?'firstCoat':null;
  const layer=firstForExtra?{kind:'and',operands:[selected(key),selected(firstForExtra),{kind:'greater_than',parameterId:c.firstArea,value:0}]}:selected(key);
  const presentation=row.resource_graph.publicResourcePresentationV1;assert(object(presentation));const{row_sha256:_old,...body}=row;
  const result={...body,inclusion_ast:{kind:'and',operands:[row.inclusion_ast,layer,{kind:'equals',parameterId:projectId(key),value:projectChoice(key)}]},
   source_metadata:{...row.source_metadata,exactSourceNormId:p.normId,sourceMeasureQuantity:'100',sourceMeasureUnitId:'m2',
    sourceAdditionalLayerHasNoNewPrimerPreparation:key==='extraRoll'||key==='extraCoat',existing01503NotRecreated:true},
   resource_graph:{...row.resource_graph,operationCompositionV1:operation,publicResourcePresentationV1:{...presentation,sourceTitleRu:rate.sourceInternalTitleRu},
    ...(rate.role==='boiler400l'?{roofSharedBoilerBoundaryR24:{physicalStockOwnerRowId:'roof:flat003006:r24:stock:boiler-400l',physicalQuantity:null,nativeBudgetUnit:'machine_hour',physicalStockUnit:'pcs',noConversionFromHours:true,noSecondOperatingPayment:true}}:{})}};
  return{...result,row_sha256:hash(result)};
 }));
 const formulas=definitions.flatMap(d=>d.formulas);assert.deepEqual([parameters.length,formulas.length,resources.length],[12,34,34]);
 assert.equal(resources.filter(r=>r.resource_graph.costTreatment==='INFORMATIONAL_SCOPE').length,4);
 const declared=new Set(parameters.map(p=>p.parameter_id));
 for(const r of resources){resolveInclusionGraph(r.inclusion_ast,{});for(const id of canonicalConditionParameterIds(r.inclusion_ast))assert(declared.has(id));}
 return{...definitions[0]!,parameters,formulas,resources,runtimeInput:{},runtimeClassification:{},runtimeSourceIds:{},ordinaryParameterIds:[]};
}
