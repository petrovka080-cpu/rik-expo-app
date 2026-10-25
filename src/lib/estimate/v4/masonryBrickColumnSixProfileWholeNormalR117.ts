import pack from '../../../../data/estimate-benchmarks/source-packs/masonry-brick-column-six-profile-whole-r117.json';
import route from '../../../../data/estimate-benchmarks/source-packs/masonry-brick-column-six-profile-normal-route-r117.json';
import independentMap from '../../../../data/estimate-benchmarks/source-packs/masonry-brick-column-six-profile-independent-full-map-r117.json';
import {buildAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,
 type AutomaticOwnerDefinition,type AutomaticInclusionCondition,type AutomaticParameterSpec,type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {buildMasterParameterCalculationConsumers} from '../backendPlatform/canonicalDefinitionParameterConsumersR1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';

import {buildMasonryBrickColumnWholeNormalR109 as buildAccepted03_04} from './masonryBrickRectangularColumnWholeNormalR109';

type Json=Record<string,unknown>;
type Parameter=AutomaticOwnerDefinition['parameters'][number];
type Resource=AutomaticOwnerDefinition['resources'][number];
export type MasonryBrickColumnWholeModelR117=AutomaticOwnerDefinition&Readonly<{
 nativeSourceRowIds:readonly string[];includedSourceRowIds:readonly string[];unknownNeedParameterIds:readonly string[];
 unknownNeedRowIds:readonly string[];technicalReadbackParameterIds:readonly string[];
 identityAdmitted:false;publicationAllowed:false;ordinaryUiAccepted:false;fullTechnicalAcceptance:false;
}>;
export const masonryBrickColumnWholePackR117=pack;
export const masonryBrickColumnNormalRouteR117=route;
export const masonryBrickColumnIndependentMapR117=independentMap;
const volume=pack.measurement.primaryId,height=pack.measurement.heightId,physicalKind=pack.measurement.physicalKindId;
const record=(v:unknown):v is Json=>v!==null&&typeof v==='object'&&!Array.isArray(v);
function check(v:unknown,code:string):asserts v{if(!v)throw Error('MASONRY_COLUMN_WHOLE_R117_'+code);}
function object(v:unknown):Json{check(record(v),'RECORD');return v;}
const allFacts=[...pack.technicalReadbackFacts,...pack.additionalTechnicalReadbackFacts];
const facts=allFacts.map(f=>f.id);
function physicalCondition(profile:typeof pack.profiles[number]):AutomaticInclusionCondition{
 return{kind:'and',operands:[positive,{kind:'equals',parameterId:physicalKind,value:profile.physicalChoiceRu}]};
}
const positive:AutomaticInclusionCondition={kind:'greater_than',parameterId:volume,value:0};
function condition(profile:typeof pack.profiles[number]):AutomaticInclusionCondition{
 return{kind:'and',operands:[physicalCondition(profile),{kind:'greater_than',parameterId:height,value:0},
  profile.storeyHeightBand==='LTE4'?{kind:'less_than_or_equal',parameterId:height,value:4}:{kind:'greater_than',parameterId:height,value:4}]};
}
function sourceFact(f:typeof allFacts[number],active:AutomaticInclusionCondition):AutomaticParameterSpec{
 const values=object(f).values;
 check(values===undefined||Array.isArray(values)&&values.every(v=>typeof v==='string'),'SOURCE_FACT_VALUES');
 return{id:f.id,title:f.titleRu,valueType:Array.isArray(values)?'enum':'text',unitId:null,kind:'conditional',requiredWhen:active,
  ...(Array.isArray(values)?{values:values.map(String)}:{})};
}

/** One physical card; physical shape/reinforcement and storey height select six own columns.
 * Each physical kind's eleven technical confirmations use existing authority guards.
 * Accepted03/04 full formulas/resources are reused unchanged except the explicit kind gate and row checksum.
 * No live producer or complete ordinary UI is claimed by a test fixture. */
export function buildMasonryBrickColumnWholeNormalR117():MasonryBrickColumnWholeModelR117{
 check(pack.profiles.length===6&&new Set(pack.profiles.map(p=>p.normId)).size===6,'SIX_OWN_COLUMNS');
 const accepted=buildAccepted03_04();
 const oldPhysicalGate:AutomaticInclusionCondition={kind:'equals',parameterId:physicalKind,value:pack.measurement.physicalKindChoicesRu[0]!};
 const parameters:Parameter[]=accepted.parameters.map(p=>{
  if(!accepted.technicalReadbackParameterIds.includes(p.parameter_id))return p;
  const constraints=p.constraints_json;check(constraints,'ACCEPTED_SOURCE_FACT_CONSTRAINTS');
  return{...p,constraints_json:{...constraints,requiredWhen:{kind:'and',operands:[oldPhysicalGate,constraints.requiredWhen]}}};
 });
 const formulas:AutomaticOwnerDefinition['formulas'][number][]=[...accepted.formulas];
 const resources:Resource[]=accepted.resources.map(old=>{
  const{row_sha256:_hash,...body}=old;
  const next={...body,inclusion_ast:{kind:'and',operands:[oldPhysicalGate,old.inclusion_ast]}};
  return{...next,row_sha256:estimateDeterministicHash(next)};
 });
 const native:string[]=[...accepted.nativeSourceRowIds],included:string[]=[...accepted.includedSourceRowIds],
  needs:string[]=[...accepted.unknownNeedParameterIds],needRows:string[]=[...accepted.unknownNeedRowIds];
 for(const profile of pack.profiles.filter(p=>!p.acceptedR113UnchangedNormArithmeticAndIds)){
  check(profile.rows.length===profile.sourceResourceCount&&profile.openNeeds.length===profile.sourceNeedsCount,'ENTIRE_SOURCE_ROSTER');
  const active=condition(profile),prefix=profile.prefix,profileFacts=allFacts.filter(f=>profile.technicalFactIds.includes(f.id));
  check(profileFacts.length===11,'EXACT_PROFILE_SOURCE_FACTS');
  const profileFactIds=profileFacts.map(f=>f.id);
  const nativeSpec:AutomaticRowSpec[]=profile.rows.map(r=>({rowId:prefix+':'+r.id,formulaId:prefix+':formula:'+r.id,
   title:r.titleRu,section:route.card.titleRu,category:r.category,unitId:r.unitId,expression:volume+'*'+r.ratePerM3+'/1',
   inputParameterIds:profileFactIds,procurement:false,inclusion:active,
   costTreatment:r.costTreatment==='OWN_COST'?'OWN_COST':'INFORMATIONAL_SCOPE'}));
  const marker:AutomaticRowSpec={rowId:prefix+':'+profile.includedOperation.id,formulaId:prefix+':formula:'+profile.includedOperation.id,
   title:profile.markerTitleRu,section:route.card.titleRu,category:'work',unitId:'m3',
   expression:volume,inputParameterIds:profileFactIds,procurement:false,inclusion:active,costTreatment:'INCLUDED_IN_RESOURCE_ROWS'};
  const built=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:prefix,operationCompositionGroupId:prefix,
   sourceId:pack.sourceId,normId:profile.normId,
   sourceMetadata:{source_title:profile.sourceTitleRu,source_document_version:pack.source.edition,definition_hash:pack.source.sha256,
    artifact_sha256:pack.source.sha256,exact_locator:profile.sourceLocatorRu+' '+profile.normId},
   applicabilityRu:profile.physicalResultRu+'; только керамический одинарный250×120×65М100 и готовый цементно-известковыйМ50; проектный допуск отдельно.',
   ordinary:[{id:volume,title:'Самостоятельный объём кирпичной кладки столбов',valueType:'decimal',unitId:'m3',kind:'ordinary',min:0},
    {id:height,title:'Высота этажа',valueType:'decimal',unitId:'m',kind:'ordinary',min:0},
    {id:physicalKind,title:'Вид кирпичного столба',valueType:'enum',unitId:null,kind:'ordinary',values:pack.measurement.physicalKindChoicesRu}],profile:[],
   conditional:[...profileFacts.map(f=>sourceFact(f,physicalCondition(profile))),...profile.openNeeds.map(n=>({id:n.parameterId,title:n.titleRu,
    valueType:'decimal' as const,unitId:null,kind:'conditional' as const,min:0}))],
   rows:[...nativeSpec,marker,...profile.openNeeds.map(n=>({rowId:prefix+':open:'+n.id,formulaId:prefix+':formula:open:'+n.id,
    title:n.titleRu,section:'Потребности обеспечения кирпичного столба',category:'service',unitId:'',expression:n.parameterId,
    procurement:false,inclusion:active,costTreatment:'INFORMATIONAL_SCOPE' as const}))],
   deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:pack.remaining});
  for(const parameter of built.parameters){
   if(parameters.some(p=>p.parameter_id===parameter.parameter_id))continue;
   const need=profile.openNeeds.find(n=>n.parameterId===parameter.parameter_id),truth=parameter.truth_metadata;
   if(need){needs.push(parameter.parameter_id);parameters.push({...parameter,truth_metadata:unresolvedApplicationNormTruthR1(truth,need.missingFactRu)});}
   else if(facts.includes(parameter.parameter_id))parameters.push({...parameter,truth_metadata:{...truth,
    visibility_role:'INTERNAL_ONLY',visible_when:{kind:'literal',value:false},value_source_role:'PROJECT_DOCUMENTATION',
    source_confirmation_required:true,preliminary_compilation_allowed:true,
    provenance:{...(record(truth.provenance)?truth.provenance:{}),consumer_input_role_v1:'APPLICATION_TECHNICAL',
     source_readback_only_v1:true,consumer_question_allowed:false,actualProducer:'UNRUN',testConfirmationIsNotActualProject:true},
    guide:{...object(truth.guide),source_role:'PROJECT_DOCUMENTATION',guide_kind:'PROJECT_DEFINED',
     guide_short_ru:'Внутреннее подтверждённое чтение собственного источника и реального проекта. Проверенный producer и ordinaryUI остаются открыты.'}}});
   else parameters.push({...parameter,...(parameter.parameter_id===height?{constraints_json:{...parameter.constraints_json,exclusiveMin:0}}:{})});
  }
  formulas.push(...built.formulas);
  for(const old of built.resources){
   const physical=profile.rows.find(r=>old.row_id===prefix+':'+r.id),need=profile.openNeeds.find(n=>old.row_id===prefix+':open:'+n.id);
   if(physical)native.push(old.row_id);else if(need)needRows.push(old.row_id);else included.push(old.row_id);
   const isMarker=old.row_id===marker.rowId;
   const{row_sha256:_hash,...body}=old;
   const next={...body,ordinal:resources.length,...(isMarker?{cost_owner_id:profile.paidWholeOwnerId}:{}),
    resource_graph:{...old.resource_graph,scopeContextParameterIds:[volume,height,physicalKind,...profileFactIds],
     ...(isMarker?{parentCostOwnerId:profile.paidWholeOwnerId,includedInResourceOwnerRowId:profile.paidWholeOwnerId}:{}),
     ...(!need?{derivedQuantityEditPolicyV1:{contractVersion:'canonical-derived-quantity-edit-policy/v1',mode:'PARAMETERS_ONLY',
      unitId:old.unit_id,parameterIds:[volume],reasonRu:'Собственный расход по независимому объёму, высоте этажа и проверенной применимости; без замены площадью или количеством столбов.'}}:{}),
     publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:old.title_ru,
      nameRu:old.title_ru,brandAndModelRu:null,specificationRu:physical?.printedNameRu??null,detailsRu:[]}},
    source_metadata:{...old.source_metadata,sourceRole:need?'UNRESOLVED_APPLICATION_NORM':physical?'OWN_EXACT_WHOLE_SOURCE_COLUMN_RESOURCE':'INCLUDED_SOURCE_OPERATION_COMPOSITION',
     ...(need?{normativeTrace:[],normative_source_ids:[],quantityUnitUnconfirmed:true,missingFact:need.missingFactRu,nextTask:need.nextTaskRu}:{}),
     resourceCode:physical?.resourceCode??null,exact_column:profile.normId,source_artifact_sha256:pack.source.sha256,
     operatorIsNotProvenPartOfWorkerHours:true,machinePaidOwnerAdmitted:false,materialOrderAdmitted:false,
     sourceMarkerIsNotSeparateMeasuredWork:isMarker,automaticGenericPriceInheritanceAllowed:false,
     identityAdmitted:false,publicationAllowed:false,full_technical_acceptance:false}};
   resources.push({...next,row_sha256:estimateDeterministicHash(next)});
  }
 }
 check(parameters.length===104&&formulas.length===118&&resources.length===118,'FINITE_WHOLE_SHAPE');
 check(native.length===44&&included.length===6&&needs.length===68,'OWN_SOURCE_AND_NEED_COUNTS');
 check(parameters.every(p=>p.default_value===null)&&resources.every(r=>!r.procurement_eligible),'NO_DEFAULTS_OR_UNPROVEN_ORDER');
 const consumers=buildMasterParameterCalculationConsumers({parameters,formulas,resources});
 return{parameters:parameters.map((p,ordinal)=>({...p,ordinal,truth_metadata:{...p.truth_metadata,
  formula_consumers:consumers.formulaConsumers[p.parameter_id],resource_branch_consumers:consumers.resourceConsumers[p.parameter_id]}})),
  formulas,resources,runtimeInput:{},runtimeClassification:{},runtimeSourceIds:{},ordinaryParameterIds:[volume,height,physicalKind],
  nativeSourceRowIds:native,includedSourceRowIds:included,unknownNeedParameterIds:needs,unknownNeedRowIds:needRows,
  technicalReadbackParameterIds:facts,identityAdmitted:false,publicationAllowed:false,ordinaryUiAccepted:false,fullTechnicalAcceptance:false};
}

/** TEST_ONLY source/project readback fixture. No runtime default or actual act. */
export function masonryBrickColumnTestConfirmationsR117(normId:string):Record<string,unknown>{
 const profile=pack.profiles.find(p=>p.normId===normId);check(profile,'EXACT_TEST_PROFILE');
 return Object.fromEntries(allFacts.filter(f=>profile.technicalFactIds.includes(f.id)).map(f=>{const values=object(f).values;
  return[f.id,Array.isArray(values)?values[0]:'TEST_ONLY_EXACT_PROJECT_READBACK_NOT_ACTUAL_PRODUCER:'+f.titleRu];}));
}
