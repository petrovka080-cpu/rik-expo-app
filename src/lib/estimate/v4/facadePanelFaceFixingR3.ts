import source from '../../../../data/estimate-benchmarks/source-packs/facade-panel-face-fixing-r3.json';
import {buildAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,type AutomaticOwnerDefinition,type AutomaticParameterSpec,type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput} from '../backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';
const isSourceMetadataObject=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value);
function sourceProvenance(value:unknown):Record<string,unknown>{
 if(value==null)return{};
 if(!isSourceMetadataObject(value))throw new Error('FACADE_PANEL_FIXING_SOURCE_PROVENANCE_OBJECT_REQUIRED');
 return value;
}

export type FacadePanelFaceFixingKeyR3='fibre-cement-uni8'|'hpl-rivet8-aluminium';
export type FacadeApprovedPanelScheduleR3=Readonly<{
 profile:FacadePanelFaceFixingKeyR3;sourceSha256:string;panelThicknessMm:'8';
 exactMaterialFrameAndFastenerAccepted:true;approvedProjectReference:string;
 approvedPointLayoutSha256:string;
 panels:ReadonlyArray<Readonly<{panelId:string;points:ReadonlyArray<Readonly<{pointId:string;kind:'fixed'|'sliding'}>>}>>;
}>;
const fail=(message:string):never=>{throw Object.assign(new Error(message),{code:'PARAMETER_VALIDATION_FAILED'});};
const pack=(key:FacadePanelFaceFixingKeyR3)=>source.profiles.find(p=>p.key===key)??fail('EXACT_PANEL_FIXING_PROFILE_REQUIRED');
const normParameter=(key:string)=>'panel_fixing_unknown_'+key.replaceAll('-','_');
export const facadeFaceFixingPrimaryR3='panel_fixing_scheduled_panel_count';

/** Verifies the literal fixed/sliding count in an independently approved source
 * point schedule. It does not generate a structural layout or approve geometry,
 * wind, fire, anchors, panel strength or the truth of a project signature. */
export function facadeApprovedPanelFixingCountsR3(capture:FacadeApprovedPanelScheduleR3){
 const p=pack(capture.profile);
 if(capture.sourceSha256!==p.source.sha256||capture.panelThicknessMm!=='8'||capture.exactMaterialFrameAndFastenerAccepted!==true)fail('EXACT_PANEL_FRAME_FASTENER_SOURCE_REQUIRED');
 if(!capture.approvedProjectReference.trim()||!/^[0-9a-f]{64}$/i.test(capture.approvedPointLayoutSha256))fail('ACTUAL_APPROVED_PANEL_LAYOUT_REQUIRED');
 if(capture.panels.length===0)fail('NONEMPTY_APPROVED_PANEL_LAYOUT_REQUIRED');
 const ids=new Set<string>();let total=0n,fixed=0n,sliding=0n;
 for(const panel of capture.panels){
  if(!panel.panelId.trim()||ids.has(panel.panelId))fail('UNIQUE_PROJECT_PANEL_IDS_REQUIRED');ids.add(panel.panelId);
  const points=new Set<string>();let perPanelFixed=0n;
  if(panel.points.length<2)fail('APPROVED_MULTIPOINT_PANEL_LAYOUT_REQUIRED');
  for(const point of panel.points){
   if(!point.pointId.trim()||points.has(point.pointId))fail('UNIQUE_POINT_IDS_PER_PANEL_REQUIRED');points.add(point.pointId);
   if(point.kind!=='fixed'&&point.kind!=='sliding')fail('EXACT_POINT_ROLE_REQUIRED');
   total++;if(point.kind==='fixed'){fixed++;perPanelFixed++;}else sliding++;
  }
  if(perPanelFixed!==BigInt(p.fixedPointsPerPanel))fail('SOURCE_FIXED_POINT_COUNT_PER_PANEL_REQUIRED');
 }
 return{panels:BigInt(capture.panels.length).toString(),total:total.toString(),fixed:fixed.toString(),sliding:sliding.toString(),sourceSha256:p.source.sha256,approvedPointLayoutSha256:capture.approvedPointLayoutSha256};
}

/** Internal component on the normal automatic construction owner. This draft
 * has no catalog/registry/publisher entry. The whole enclosing facade must own
 * base, profiles, anchors, panel supply, labour, access and unknown needs once. */
export function facadePanelFaceFixingDefinitionR3(key:FacadePanelFaceFixingKeyR3):AutomaticOwnerDefinition{
 const p=pack(key),rid=(key:string)=>p.prefix+':'+key,primary=facadeFaceFixingPrimaryR3;
 const positive={kind:'greater_than' as const,parameterId:primary,value:0};
 const conditional:AutomaticParameterSpec[]=[
  {id:'panel_fixing_actual_total_points',title:'Число точек по принятой поэлементной проектной схеме',unitId:'piece',valueType:'integer',kind:'conditional',min:0,requiredWhen:positive},
  ...['panel_fixing_approved_project','panel_fixing_layout_sha256','panel_fixing_exact_source'].map(id=>({id,title:({panel_fixing_approved_project:'Принятая проектная схема плит и креплений',panel_fixing_layout_sha256:'Идентичность исходной поэлементной схемы',panel_fixing_exact_source:'Точный исходный способ лицевого крепления'} as Record<string,string>)[id]!,unitId:null,valueType:'text' as const,kind:'conditional' as const,requiredWhen:positive})),
  ...source.protectedNeeds.map(n=>({id:normParameter(n.key),title:n.titleRu,unitId:null,valueType:'decimal' as const,kind:'internal' as const,min:0})),
 ];
 const row=(key:string,title:string,category:string,unitId:string,expression:string,more:Partial<AutomaticRowSpec>={}):AutomaticRowSpec=>({rowId:rid(key),formulaId:rid('formula:'+key),section:p.titleRu,title,category,unitId,expression,inclusion:positive,inputParameterIds:['panel_fixing_approved_project','panel_fixing_layout_sha256','panel_fixing_exact_source'],procurement:false,costTreatment:'INFORMATIONAL_SCOPE',...more});
 const rows:AutomaticRowSpec[]=[
  row('fixed','Лицевая заклёпка в фиксированной точке','material','piece',primary+'*'+p.fixedPointsPerPanel,{costTreatment:'OWN_COST',procurement:true}),
  row('sliding','Лицевая заклёпка в подвижной точке','material','piece','panel_fixing_actual_total_points-'+primary+'*'+p.fixedPointsPerPanel,{costTreatment:'OWN_COST',procurement:true}),
  ...source.protectedNeeds.map(n=>row('need:'+n.key,n.titleRu,n.category,n.unitId??'',normParameter(n.key))),
 ];
 const built=buildAutomaticConstructionOwnerR1({contract:source.contract,semanticOwner:p.prefix,sourceId:'gox_facade_panel_face_fixing_r3_'+key,normId:'EXACT_FIXED_POINTS_PER_PANEL_AND_APPROVED_SCHEDULE',sourceMetadata:{source_title:p.titleRu,source_document_version:p.source.territory,definition_hash:p.source.sha256,artifact_sha256:p.source.sha256,exact_locator:'PDF'+p.source.pdfPagesActuallyReviewed.join(',')},applicabilityRu:p.titleRu+'; только исходные материалы и принятая поэлементная схема; не полный фасад и не расчёт ветровой сетки.',ordinary:[{id:primary,title:'Фактическое число плит по принятой поэлементной схеме',unitId:'piece',valueType:'integer',kind:'ordinary',min:0}],profile:[],conditional,rows,deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:p.exclusions});
 return{...built,ordinaryParameterIds:[],parameters:built.parameters.map(q=>{
  const need=source.protectedNeeds.find(n=>q.parameter_id===normParameter(n.key));
  return need?{...q,truth_metadata:unresolvedApplicationNormTruthR1(q.truth_metadata,need.missing)}:q.truth_metadata.value_source_role==='COMPILER_DERIVED_RESOURCE_QUANTITY'?q:{...q,truth_metadata:{...q.truth_metadata,visibility_role:'INTERNAL_ONLY',value_source_role:q.parameter_id.endsWith('exact_source')?'MANUFACTURER_CONFIRMED':'PROJECT_DOCUMENTATION',source_confirmation_required:false,preliminary_compilation_allowed:true,provenance:{...sourceProvenance(q.truth_metadata.provenance),consumer_input_role_v1:'APPLICATION_TECHNICAL',source_readback_only_v1:true,consumer_question_allowed:false}}};
 }),resources:built.resources.map(r=>{
  const key=r.row_id.slice(p.prefix.length+1),n=source.protectedNeeds.find(n=>key==='need:'+n.key),f=built.formulas.find(f=>f.formula_id===r.formula_id)!,operations=n?source.operations:source.operations.filter(o=>['drill-center','rivet','inspect-clean'].includes(o.key));
  const{row_sha256:_old,...body}=r;
  const next={...body,resource_graph:{...r.resource_graph,...(n?{}:{derivedQuantityEditPolicyV1:{contractVersion:'canonical-derived-quantity-edit-policy/v1',mode:'PARAMETERS_ONLY',unitId:r.unit_id,parameterIds:[...f.input_parameter_ids],reasonRu:'Используйте принятую поэлементную схему. Норма фиксированных точек не заменяется ручным количеством.'}}),operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:p.prefix,groupTitleRu:p.titleRu,operationId:rid('operation:'+operations[0]!.key),operationTitleRu:operations[0]!.titleRu,processOrdinal:1,additionalOperations:operations.slice(1).map((o,i)=>({operationId:rid('operation:'+o.key),operationTitleRu:o.titleRu,processOrdinal:i+2,completionCriterionRu:'Применён тот же исходный ресурс в указанной операции лицевого крепления; материал, проектная схема и единственный владелец сохранены.'})),completionCriterionRu:n?n.missing:'Количество подтверждено только в пределах исходной нормы и принятой схемы.'}},source_metadata:{...r.source_metadata,source_artifact_sha256:p.source.sha256,sourceRole:n?'UNRESOLVED_APPLICATION_NORM':'EXACT_PER_PANEL_POINT_COUNT_PLUS_APPROVED_PROJECT_SCHEDULE',normativeTrace:n?[]:[{sourceId:'gox_facade_panel_face_fixing_r3_'+p.key,source_artifact_sha256:p.source.sha256,exact_locator:'PDF'+p.source.pdfPagesActuallyReviewed.join(',')}],automaticGenericPriceInheritanceAllowed:false,panelProcurementNotIncluded:true,requiresWholeFacadeOwner:true,sourceRivetCannotBeSubstitutedByPublicName:true,...(n?{normative_source_ids:[],quantityNormAccepted:false,missingFact:n.missing}:{}),full_technical_acceptance:false,newFull:0}};
  return{...next,row_sha256:hash(next)};
 })};
}

/** Only the validated immutable capture supplies layout quantities. No arbitrary
 * submittedParameters/area conversion or default approved-project fact here. */
export function compileFacadePanelFaceFixingR3(capture:FacadeApprovedPanelScheduleR3,options:{rowOverrides?:CanonicalEstimateCompileCoreInput['rowOverrides']}={}){
 const counts=facadeApprovedPanelFixingCountsR3(capture),d=facadePanelFaceFixingDefinitionR3(capture.profile);
 return compileCanonicalEstimateCore({operation:'recalculate',compilerVersion:source.contract,catalogId:'INTERNAL_COMPONENT_NOT_PUBLIC_CATALOG',primaryMeasureParameterId:facadeFaceFixingPrimaryR3,parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],submittedParameters:{},confirmedParameters:{[facadeFaceFixingPrimaryR3]:counts.panels,panel_fixing_actual_total_points:counts.total,panel_fixing_approved_project:capture.approvedProjectReference,panel_fixing_layout_sha256:capture.approvedPointLayoutSha256,panel_fixing_exact_source:capture.sourceSha256},rowOverrides:options.rowOverrides??{},priceItems:[],currencyCode:'KGS',maximumResourceRows:d.resources.length,hashJson:hash});
}
