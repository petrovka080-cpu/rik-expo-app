import assert from 'node:assert/strict';
import concrete from '../../../../data/estimate-benchmarks/source-packs/roof-insulation-native01401-r24.json';
import shungizite from '../../../../data/estimate-benchmarks/source-packs/roof-insulation-native01403-r24.json';
import perlite from '../../../../data/estimate-benchmarks/source-packs/roof-insulation-native01404-r24.json';
import vermiculite from '../../../../data/estimate-benchmarks/source-packs/roof-insulation-native01405-r24.json';
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
export const roofMissing014NativeR24={concrete,shungizite,perlite,vermiculite};
type Key=keyof typeof roofMissing014NativeR24;
const keys:readonly Key[]=['concrete','shungizite','perlite','vermiculite'];
const projectId=(key:Key)=>'roof_missing014_'+roofMissing014NativeR24[key].normId.slice(-2)+'_project_r24';
const projectChoice=(key:Key)=>'EXACT_'+roofMissing014NativeR24[key].normId.replace(/-/gu,'_')+'_SOURCE_MATERIAL_VOLUME_AND_LAYER';

/** Local kernels of ONLY four missing columns. Existing01402 is reused outside
 * this builder with its original row IDs/source, not re-created or reauthorized.
 * This is not an ordinary Config: final single-layer mutual exclusion with the
 * captured01402 selector and current source admission remain ROOT-review HOLD. */
export function buildRoofMissingInsulationProfilesWhole014R24(sourceKey:string):AutomaticOwnerDefinition{
 assert.equal(sourceKey,concrete.sources[0]!.id,'MISSING014_NEW_SOURCE_IDENTITY_REVIEW_HOLD');
 const definitions=keys.map(key=>{
  const p=roofMissing014NativeR24[key];
  assert.equal(p.sourceBasisQuantity,'1');assert.equal(p.measurementUnitId,'m3');
  const input:SourcePinnedRoofNormPackR1={...p,measurementUnitId:'m3',sourceBasisQuantity:'1',
   rates:p.rates.map((rate):SourcePinnedRoofNormRateR1=>{
    assert(rate.costTreatment==='OWN_COST'||rate.costTreatment==='INFORMATIONAL_SCOPE');
    return{...rate,costTreatment:rate.costTreatment==='INFORMATIONAL_SCOPE'?'INFORMATIONAL_SCOPE':'OWN_COST'};
   })};
  return sourcePinnedRoofNormOwnerR1(input);
 });
 const extra=buildAutomaticConstructionOwnerR1({contract:'roof-missing014-local-project-conditions/r24',semanticOwner:'roof:insulation:missing014:r24',sourceId:sourceKey,
  normId:'EXACT_014_MATERIAL_AND_SINGLE_LAYER_PROJECT_NOT_CONFIRMED',sourceMetadata:{source_title:'КРЕР12:четыре недостающих собственных профиля014',source_document_version:concrete.sources[0]!.printedEdition,
   definition_hash:concrete.sources[0]!.sha256,artifact_sha256:concrete.sources[0]!.sha256,exact_locator:concrete.sources[0]!.locators},
  applicabilityRu:'Точный материал и обмер собственного слоя;объём нормы не определяет толщину,плотность,несущую способность или полный пирог.',ordinary:[],profile:[],
  conditional:keys.map(key=>({id:projectId(key),title:'Точный проектный материал и самостоятельный слой'+roofMissing014NativeR24[key].normId,valueType:'enum' as const,unitId:null,kind:'internal' as const,values:[projectChoice(key)]})),
  rows:[],deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:concrete.remainingScopeRu});
 const firstById=new Map<string,AutomaticOwnerDefinition['parameters'][number]>();
 for(const d of definitions)for(const p of d.parameters)if(!firstById.has(p.parameter_id))firstById.set(p.parameter_id,p);
 assert.equal(firstById.size,4,'EXACT_ONE_NEW014_SHARED_SCHEMA');
 const anyProfile={kind:'or',operands:keys.map(key=>({kind:'equals',parameterId:concrete.systemParameterId,value:roofMissing014NativeR24[key].systemYesRu}))};
 const parameters:AutomaticOwnerDefinition['parameters']=[...firstById.values(),...extra.parameters].map((p,ordinal)=>{
  let constraints=p.constraints_json;
  if(p.parameter_id===concrete.systemParameterId)constraints={...constraints,values:[...keys.map(k=>roofMissing014NativeR24[k].systemYesRu),concrete.unknownChoiceRu,concrete.legacyChoiceRu]};
  if([concrete.conditionsParameterId,concrete.areaParameterId,concrete.measurementParameterId].includes(p.parameter_id))constraints={...constraints,requiredWhen:anyProfile};
  const key=keys.find(k=>projectId(k)===p.parameter_id);
  if(key)constraints={...constraints,requiredWhen:{kind:'equals',parameterId:concrete.systemParameterId,value:roofMissing014NativeR24[key].systemYesRu}};
  const internal=key!==undefined||p.parameter_id===concrete.conditionsParameterId||p.parameter_id===concrete.areaParameterId;
  return{...p,ordinal,required:false,default_value:null,constraints_json:constraints,truth_metadata:internal?{...p.truth_metadata,
   visibility_role:'INTERNAL_ONLY',value_source_role:'PROJECT_DOCUMENTATION',source_confirmation_required:true,
   provenance:{...(object(p.truth_metadata.provenance)?p.truth_metadata.provenance:{}),consumer_input_role_v1:'APPLICATION_TECHNICAL'},
   guide:{...(object(p.truth_metadata.guide)?p.truth_metadata.guide:{}),source_role:'PROJECT_DOCUMENTATION',exact_locator:concrete.sources[0]!.locators}}:p.truth_metadata};
 });
 const resources:AutomaticOwnerDefinition['resources']=definitions.flatMap((d,index)=>d.resources.map(row=>{
  const key=keys[index]!,p=roofMissing014NativeR24[key],rate=p.rates.find(r=>row.row_id===p.prefix+':'+r.role);assert(rate);
  const op=p.printedOperationRoster[0];assert(op);
  const operation:CanonicalEstimateOperationReference={contractVersion:'canonical-operation-resource/v1',groupId:'roof:insulation:missing014:r24',groupTitleRu:p.groupTitleRu,
   operationId:p.prefix+':operation:'+op.key,operationTitleRu:op.titleRu,processOrdinal:op.printedOrdinal,
   completionCriterionRu:'Собственный исходный способ утепления выполнен;несущая способность,совместимость и фактическая приёмка подтверждаются отдельно.'};
  const presentation=row.resource_graph.publicResourcePresentationV1;assert(object(presentation));
  const{row_sha256:_old,...body}=row;
  const result={...body,inclusion_ast:{kind:'and',operands:[row.inclusion_ast,{kind:'equals',parameterId:projectId(key),value:projectChoice(key)}]},
   source_metadata:{...row.source_metadata,exactSourceNormId:p.normId,sourceMeasureQuantity:'1',sourceMeasureUnitId:'m3',
    noDensityOrThicknessFromSourceConsumption:true,doesNotRecreateExisting01402:true},
   resource_graph:{...row.resource_graph,operationCompositionV1:operation,publicResourcePresentationV1:{...presentation,sourceTitleRu:rate.sourceInternalTitleRu}}};
  return{...result,row_sha256:hash(result)};
 }));
 const formulas=definitions.flatMap(d=>d.formulas);
 assert.deepEqual([parameters.length,formulas.length,resources.length],[8,22,22]);
 assert.equal(resources.filter(r=>r.resource_graph.costTreatment==='INFORMATIONAL_SCOPE').length,4);
 const declared=new Set(parameters.map(p=>p.parameter_id));
 for(const r of resources){resolveInclusionGraph(r.inclusion_ast,{});for(const id of canonicalConditionParameterIds(r.inclusion_ast))assert(declared.has(id));}
 return{...definitions[0]!,parameters,formulas,resources,runtimeInput:{},runtimeClassification:{},runtimeSourceIds:{}};
}
