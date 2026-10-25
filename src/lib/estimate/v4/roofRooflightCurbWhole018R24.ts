import assert from 'node:assert/strict';
import rcOrganic from '../../../../data/estimate-benchmarks/source-packs/roof-rooflight-curb-native01801-r24.json';
import rcGlass from '../../../../data/estimate-benchmarks/source-packs/roof-rooflight-curb-native01802-r24.json';
import deckOrganic from '../../../../data/estimate-benchmarks/source-packs/roof-rooflight-curb-native01803-r24.json';
import deckGlass from '../../../../data/estimate-benchmarks/source-packs/roof-rooflight-curb-native01804-r24.json';
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
export const roofRooflight018NativeR24={rcOrganic,rcGlass,deckOrganic,deckGlass};
type Key=keyof typeof roofRooflight018NativeR24;
const keys:readonly Key[]=['rcOrganic','rcGlass','deckOrganic','deckGlass'];
function projectId(key:Key){return 'roof_rooflight018_'+roofRooflight018NativeR24[key].normId.slice(-2)+'_exact_project_r24';}
function projectChoice(key:Key){return 'EXACT_'+roofRooflight018NativeR24[key].normId.replace(/-/gu,'_')+'_CURB_DECK_GLASS_AND_SOURCE_SYSTEM';}

/** Source-only local definitions of the four whole profiles. No window count,
 * roof area conversion, stock, ordinary Config or source admission is created. */
export function buildRoofRooflightCurbWhole018R24(sourceKey:string):AutomaticOwnerDefinition{
 assert.equal(sourceKey,rcOrganic.sources[0]!.id,'ROOFLIGHT018_SOURCE_IDENTITY_REVIEW_HOLD');
 const definitions=keys.map(key=>{const p=roofRooflight018NativeR24[key];const input:SourcePinnedRoofNormPackR1={...p,measurementUnitId:'linear_m',
  quantityEditReasonRu:'Количество рассчитано по собственной полной колонке018 и наружному периметру стаканов выбранного профиля. Изменяйте этот обмер;числофонарей/площадькровли/толщинуслоёв изресурсногобюджета не выводить.',
  rates:p.rates.map((rate):SourcePinnedRoofNormRateR1=>{assert(rate.costTreatment==='OWN_COST'||rate.costTreatment==='INFORMATIONAL_SCOPE');
   return{...rate,costTreatment:rate.costTreatment==='INFORMATIONAL_SCOPE'?'INFORMATIONAL_SCOPE':'OWN_COST'};})};
  return sourcePinnedRoofNormOwnerR1(input);});
 const extra=buildAutomaticConstructionOwnerR1({contract:'roof-rooflight018-four-local-profile-project-boundary/r24',semanticOwner:'roof:rooflight-curb:whole018:r24',sourceId:sourceKey,
  normId:'EXACT_OWN_CURB_DECK_GLASS_AND_SOURCE_SYSTEM_UNCONFIRMED',sourceMetadata:{source_title:'КРЕР12:собственные4профиля изоляциистаканов',source_document_version:rcOrganic.sources[0]!.printedEdition,
   definition_hash:rcOrganic.sources[0]!.sha256,artifact_sha256:rcOrganic.sources[0]!.sha256,exact_locator:rcOrganic.sources[0]!.locators},
  applicabilityRu:'Собственный профиль покрытия/остекления/стакана;неизвестныеполныйкомплект/stock/PPR/приёмка',ordinary:[],profile:[],
  conditional:keys.map(key=>({id:projectId(key),title:'Точный проектный профиль стакана и совместимость'+roofRooflight018NativeR24[key].normId,valueType:'enum' as const,unitId:null,kind:'internal' as const,values:[projectChoice(key)]})),
  rows:[],deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:rcOrganic.remainingScopeRu});
 const firstById=new Map<string,AutomaticOwnerDefinition['parameters'][number]>();for(const d of definitions)for(const p of d.parameters)if(!firstById.has(p.parameter_id))firstById.set(p.parameter_id,p);
 assert.equal(firstById.size,4,'EXACT_ONE_018_SHARED_SCHEMA');
 const anyProfile={kind:'or',operands:keys.map(key=>({kind:'equals',parameterId:rcOrganic.systemParameterId,value:roofRooflight018NativeR24[key].systemYesRu}))};
 const parameters:AutomaticOwnerDefinition['parameters']=[...firstById.values(),...extra.parameters].map((p,ordinal)=>{
  let constraints=p.constraints_json;
  if(p.parameter_id===rcOrganic.systemParameterId)constraints={...constraints,values:[...keys.map(k=>roofRooflight018NativeR24[k].systemYesRu),rcOrganic.unknownChoiceRu,rcOrganic.legacyChoiceRu]};
  if([rcOrganic.conditionsParameterId,rcOrganic.areaParameterId,rcOrganic.measurementParameterId].includes(p.parameter_id))constraints={...constraints,requiredWhen:anyProfile};
  const key=keys.find(k=>projectId(k)===p.parameter_id);if(key)constraints={...constraints,requiredWhen:{kind:'equals',parameterId:rcOrganic.systemParameterId,value:roofRooflight018NativeR24[key].systemYesRu}};
  const internal=key!==undefined||p.parameter_id===rcOrganic.conditionsParameterId||p.parameter_id===rcOrganic.areaParameterId;
  return{...p,ordinal,required:false,default_value:null,constraints_json:constraints,truth_metadata:internal?{...p.truth_metadata,
   visibility_role:'INTERNAL_ONLY',value_source_role:'PROJECT_DOCUMENTATION',source_confirmation_required:true,
   provenance:{...(object(p.truth_metadata.provenance)?p.truth_metadata.provenance:{}),consumer_input_role_v1:'APPLICATION_TECHNICAL'},
   guide:{...(object(p.truth_metadata.guide)?p.truth_metadata.guide:{}),source_role:'PROJECT_DOCUMENTATION',exact_locator:rcOrganic.sources[0]!.locators}}:p.truth_metadata};
 });
 const resources:AutomaticOwnerDefinition['resources']=definitions.flatMap((d,index)=>d.resources.map(row=>{
  const key=keys[index]!,p=roofRooflight018NativeR24[key],rate=p.rates.find(r=>row.row_id===p.prefix+':'+r.role);assert(rate);
  const refs=rate.requiredOperationKeys.map(k=>{const op=p.printedOperationRoster.find(o=>o.key===k);assert(op);return{
   operationId:p.prefix+':operation:'+k,operationTitleRu:op.titleRu,processOrdinal:op.printedOrdinal,
   completionCriterionRu:'Собственная операция изоляциистакана/примыкания выполнена в целом исходном составе;проект и фактическаяприёмка отдельно.'};});assert(refs.length>0);
  const op:CanonicalEstimateOperationReference={contractVersion:'canonical-operation-resource/v1',groupId:'roof:rooflight-curb:whole018:r24',groupTitleRu:p.groupTitleRu,
   ...refs[0]!,...(refs.length>1?{additionalOperations:refs.slice(1)}:{})};
  const presentation=row.resource_graph.publicResourcePresentationV1;assert(object(presentation));const{row_sha256:_old,...body}=row;
  const result={...body,inclusion_ast:{kind:'and',operands:[row.inclusion_ast,{kind:'equals',parameterId:projectId(key),value:projectChoice(key)}]},
   source_metadata:{...row.source_metadata,exactSourceNormId:p.normId,sourceHeaderGlassDoesNotSupplyGlassProduct:true},
   resource_graph:{...row.resource_graph,operationCompositionV1:op,publicResourcePresentationV1:{...presentation,sourceTitleRu:rate.sourceInternalTitleRu},
    ...(rate.role==='boiler400l'?{roofSharedBoilerBoundaryR24:{physicalStockOwnerRowId:'roof:flat003006:r24:stock:boiler-400l',physicalQuantity:null,nativeBudgetUnit:'machine_hour',physicalStockUnit:'pcs',noConversionFromHours:true,noSecondOperatingPayment:true}}:{})}};
  return{...result,row_sha256:hash(result)};
 }));
 const formulas=definitions.flatMap(d=>d.formulas);assert.deepEqual([parameters.length,formulas.length,resources.length],[8,46,46]);
 assert.equal(resources.filter(r=>r.resource_graph.costTreatment==='INFORMATIONAL_SCOPE').length,4);
 const declared=new Set(parameters.map(p=>p.parameter_id));for(const r of resources){resolveInclusionGraph(r.inclusion_ast,{});for(const id of canonicalConditionParameterIds(r.inclusion_ast))assert(declared.has(id));}
 return{...definitions[0]!,parameters,formulas,resources,runtimeInput:{},runtimeClassification:{},runtimeSourceIds:{}};
}
