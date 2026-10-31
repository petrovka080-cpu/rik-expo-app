import pack from '../../../../data/estimate-benchmarks/source-packs/master31-mixer-tool-provision-r1.json';
import {buildAutomaticConstructionOwnerR1,type AutomaticOwnerDefinition,type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';
import {buildMasterParameterCalculationConsumers} from '../backendPlatform/canonicalDefinitionParameterConsumersR1';
import {master30FactoryKitCompletenessMapR1,master30FactoryKitsPackR1} from './master30ElectricalPlumbingFactoryKitsR1';
import type {PurchaseGroupRepresentative as Rep} from '../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';

type Json=Record<string,any>;
const fixture=require('../../../../data/estimate-benchmarks/fixtures/master31-mixer-current-three-v4-r1.json') as {captures:Json[]};
export const master31MixerToolPackR1=pack;
const copy=<T,>(v:T):T=>structuredClone(v),eq=(parameterId:string,value:string)=>({kind:'equals',parameterId,value});
const selected=(parameterId:string,value:string)=>({kind:'selected',parameterId,value});
const and=(...operands:Json[])=>({kind:'and',operands});
const requireThat=(value:unknown,code:string):void=>{if(!value)throw Error('MASTER31_MIXER_TOOLS_'+code);};
const rehash=(r:Json):Json=>{const{row_sha256:_h,...body}=r;return{...body,row_sha256:hash(body)};};
const decl=(r:Json):Json=>Object.fromEntries(Object.entries(r).filter(([k])=>!['id','definition_version_id','created_at','updated_at','row_sha256'].includes(k)));
export const master31MixerCurrentCaptureR1=(catalogId:string)=>{const c=fixture.captures.find(c=>c.definition.catalog_id===catalogId);requireThat(c,'EXACT_CURRENT_CAPTURE_REQUIRED');return copy(c!);};
export function master31MixerCurrentRepresentativeR1(catalogId:string):Rep{
 const c=master31MixerCurrentCaptureR1(catalogId),ids=new Map(c.resources.map((r:Json)=>[r.id,r.row_id]));
 return{definition:c.definition,baseline:c.baseline,passport:c.contentPassport,parameters:c.parameters,formulas:c.formulas,resources:c.resources,
  bindings:c.bindings.map((b:Json)=>({row_id:ids.get(b.resource_spec_id),locator_id:b.locator_id,applicability:b.applicability}))};
}
/** Independent workflow roles: a turning wrench and counterhold must be two
 * physical assets. A mounting adapter is not the second joint wrench. */
export function assertMaster31MixerToolWorkflowR1(p:typeof pack=pack):void{
 const keys=['mounting-key-13','turning-wrench','counterhold-wrench','slotted-screwdriver','hacksaw-with-blade','measuring-rule','marking-pencil','hex-key-2-5','hex-key-3'];
 requireThat(p.tools.length===9&&new Set(p.tools.map(t=>t.key)).size===9&&keys.every(k=>p.tools.some(t=>t.key===k)),'WHOLE_WORKFLOW_TOOLS_REQUIRED');
 requireThat(p.tools.every(t=>t.unitId==='piece'&&t.category==='equipment'&&t.countExpression==='min(1,m30_fixture_count)'),'PHYSICAL_ASSET_DIMENSION_AND_POST_COUNT');
 requireThat(p.tools.find(t=>t.key==='mounting-key-13')?.profile.socketMm===13,'EXACT_MOUNTING_SOCKET');
 requireThat(p.tools.find(t=>t.key==='counterhold-wrench')?.profile.distinctPhysicalToolFrom==='turning-wrench','TWO_INDEPENDENT_JOINT_WRENCHES');
 requireThat(p.tools.find(t=>t.key==='turning-wrench')?.profile.supplyNutMm===19,'EXACT_G3_8_SUPPLY_NUT');
 requireThat(p.tools.find(t=>t.key==='hacksaw-with-blade')?.profile.assembly==='FRAME_WITH_FITTED_METAL_BLADE','WHOLE_SAW_NOT_EMPTY_FRAME');
 requireThat(p.tools.find(t=>t.key==='hex-key-2-5')?.profile.acrossFlatsMm===2.5&&p.tools.find(t=>t.key==='hex-key-3')?.profile.acrossFlatsMm===3,'EXACT_SETTING_KEYS');
 requireThat(p.workflow.find(w=>w.id==='water-connection')?.simultaneousToolRoleCount===2,'SIMULTANEOUS_COUNTERHOLD_REQUIRED');
 requireThat(p.ownerRowId===p.prefix+':provision-owner'&&p.ownerRowId!=='plumbing:basin-mixer:ready-site:r3:kit-order','SEPARATE_WHOLE_PROVISION_PRICE_OWNER');
}
const usingGroup=master30FactoryKitsPackR1.profiles.find(p=>p.key==='plumbing')!;
// Use the actual accepted material-consuming operations. A second operation
// with a similar label would leave tools outside the existing subwork rows.
const operationId=(key:string)=>key==='tool-provision'?pack.prefix+':operation:tool-provision':'master30:plumbing:'+key;
const operation=(key:string)=>({operationId:operationId(key),operationTitleRu:pack.workflow.find(w=>w.id===key)?.titleRu??'Обеспечить пост ручным инструментом',
 processOrdinal:key==='tool-provision'?10:30,processRole:'PROCESS' as const,completionCriterionRu:'Инструмент физически совместим с принятым узлом; часы, расходники и СИЗ этим комплектом не подтверждаются.'});
/** The explicit organization supplies simultaneous tool assets, not a tool
 * purchase, wear rate, rental duration, labour hours or actual warehouse stock. */
export function master31MixerToolSubjectR1():AutomaticOwnerDefinition{
 assertMaster31MixerToolWorkflowR1();
 const n=pack.countId,id=(key:string)=>pack.prefix+':'+key;
 const row=(key:string,title:string,category:string,unitId:string,costTreatment:AutomaticRowSpec['costTreatment']):AutomaticRowSpec=>({
  rowId:id(key),formulaId:id('formula:'+key),title,category,unitId,section:pack.titleRu,expression:pack.postExpression,procurement:false,costTreatment,inputParameterIds:[pack.fitId]});
 const d=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:pack.prefix,sourceId:pack.sourceId,normId:pack.normId,
  sourceMetadata:{source_title:pack.titleRu,source_document_version:pack.source.edition,definition_hash:pack.source.sha256,artifact_sha256:pack.source.sha256,exact_locator:pack.source.locatorRu},
  applicabilityRu:pack.scopeRu,ordinary:[{id:n,title:'Число монтажных мест',kind:'ordinary',valueType:'integer',unitId:'item',min:0,max:1000000}],profile:[],
  conditional:[{id:pack.methodId,title:'Оснащение поста ручного монтажа',kind:'conditional',valueType:'enum',unitId:null,values:[pack.methodRu,pack.unresolvedMethodRu]},
   {id:pack.fitId,title:'Совместимы ли инструмент и доступ к фактическому узлу?',kind:'conditional',valueType:'enum',unitId:null,values:[pack.fitRu]}],
  rows:[row('provision-owner','Оснащение поста ручного монтажа','service','set','OWN_COST'),...pack.tools.map(t=>row(t.key,t.titleRu,t.category,t.unitId,'INCLUDED_IN_RESOURCE_ROWS'))],
  deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:pack.notCoveredRu});
 const choice=selected(pack.methodId,pack.methodRu),positive={kind:'greater_than',parameterId:n,value:0};
 const active=and(eq(pack.factorySelectorId,pack.factoryChoiceRu),choice,selected(pack.fitId,pack.fitRu),positive);
 return{...d,parameters:d.parameters.map(q=>q.parameter_id===n?q:{...q,required:false,default_value:null,
  constraints_json:{...q.constraints_json,...(q.parameter_id===pack.fitId?{requiredWhen:and(choice,positive)}:{
   forbiddenWhen:and(choice,{kind:'not',operand:selected(pack.factorySelectorId,pack.factoryChoiceRu)})})},
  truth_metadata:{...q.truth_metadata,visibility_role:'USER_INPUT',value_source_role:'PROJECT_SPECIFIC_INPUT',source_confirmation_required:false,
   visible_when:q.parameter_id===pack.fitId?choice:eq(pack.factorySelectorId,pack.factoryChoiceRu),provenance:{consumer_input_role_v1:'OBJECT_FACT'},
   guide:{...(q.truth_metadata.guide as Json),guide_short_ru:q.parameter_id===pack.methodId?pack.scopeRu:pack.fitRu,source_document:pack.sourceId,source_locator:pack.source.locatorRu}}}),
  resources:d.resources.map(r=>{
   const key=r.row_id.slice(pack.prefix.length+1),tool=pack.tools.find(t=>t.key===key),owner=key==='provision-owner';
   const uses=owner?pack.workflow.map(w=>w.id):tool!.operations;
   return rehash({...r,inclusion_ast:active,cost_owner_id:owner?r.row_id:pack.ownerRowId,
    resource_graph:{...r.resource_graph,inputParameterIds:[pack.methodId,pack.fitId],scopeContextParameterIds:[n],
     ...(owner?{}:{parentCostOwnerId:pack.ownerRowId,includedInResourceOwnerRowId:pack.ownerRowId}),
     operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:'master30:plumbing',groupTitleRu:usingGroup.publicNameRu,...operation(owner?'tool-provision':uses[0]!),
      additionalOperations:(owner?uses:uses.slice(1)).map(operation)},
     physicalProvisionV1:{basis:'EXPLICIT_SELECTED_SINGLE_SERIAL_POST',assetRoleId:key,postCountExpression:pack.postExpression,actualWarehouseClaimed:false,
      newPurchaseClaimed:false,rentalDurationClaimed:false,consumptionOrWearNormClaimed:false,...(!owner?{toolProfile:tool!.profile}:{priceScopeRu:pack.priceScopeRu})},
     derivedQuantityEditPolicyV1:{contractVersion:'canonical-derived-quantity-edit-policy/v1',mode:'PARAMETERS_ONLY',unitId:r.unit_id,parameterIds:[n],reasonRu:'Количество определяется числом изделий для одного последовательного поста; это не покупка инструмента на каждый смеситель.'},
     publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:r.title_ru,nameRu:r.title_ru,brandAndModelRu:null,specificationRu:null,detailsRu:[]}},
    source_metadata:{...r.source_metadata,normativeTrace:[],sourceRole:owner?'EXPLICIT_WHOLE_TOOL_POST_CONTRACTUAL_PRICE_SCOPE':'CALCULATED_SINGLE_SERIAL_POST_CONCRETE_TOOL_PROVISION',
     physicalProvisionAccepted:true,physicalProvisionBasis:'ONE_ACTIVE_SEQUENTIAL_POST_NOT_MANUFACTURER_CREW_NORM',sourceNormQuantityAccepted:false,
     wholeToolKitNotWholeInstallation:true,manufacturerCrewQuantityNormClaimed:false,automaticGenericPriceInheritanceAllowed:false,full_technical_acceptance:false,
     methodEvidence:pack.source,exact_locator:owner?pack.priceScopeRu:tool!.locator}}) as unknown as AutomaticOwnerDefinition['resources'][number];
  })};
}
export function buildMaster31MixerToolSuccessorR1(parent:Rep):Rep{
 const target=pack.targets.find(t=>t.catalogId===parent.definition.catalog_id);requireThat(target,'EXACT_TARGET_REQUIRED');
 const frozen=master31MixerCurrentRepresentativeR1(target!.catalogId);
 requireThat(parent.definition.id===target!.definitionId&&parent.definition.definition_sha256===target!.definitionSha256&&parent.definition.definition_version===4
  &&hash([parent.parameters,parent.formulas,parent.resources])===hash([frozen.parameters,frozen.formulas,frozen.resources]),'EXACT_V4_PARENT_COMPUTATION_REQUIRED');
 const result=copy(parent),subject=master31MixerToolSubjectR1(),oldIds=new Set(parent.parameters.map(q=>q.parameter_id));
 for(const q of subject.parameters)if(!oldIds.has(q.parameter_id))result.parameters.push({...decl(q),ordinal:result.parameters.length} as any);
 result.formulas.push(...subject.formulas as any);
 const complete=and(selected(pack.methodId,pack.methodRu),selected(pack.fitId,pack.fitRu));
 result.resources=result.resources.map(r=>pack.coveredNeedIds.includes(r.row_id)?rehash({...r,
  // `selected` is false on omission. Ordinary equals/not would be unknown and
  // could hide the previous needs merely because the new selector is absent.
  inclusion_ast:and(r.inclusion_ast,{kind:'not',operand:complete}),
  source_metadata:{...r.source_metadata,completionNeedTransitionV1:{featureContract:pack.contract,selectedMethodParameterId:pack.methodId,resolvedOnlyForMethod:pack.methodRu,
   automaticLegacyPriceOrQuantityTransferAllowed:false,resolvedThroughPaidOwnerRowId:pack.ownerRowId}}}) as any:r);
 for(const r of subject.resources)result.resources.push(rehash({...decl(r),ordinal:result.resources.length,row_type:r.category,semantic_owner:target!.catalogId+':'+r.row_id}) as any);
 const consumers=buildMasterParameterCalculationConsumers(result);
 for(const q of result.parameters){const id=q.parameter_id;q.truth_metadata={...q.truth_metadata,formula_consumers:consumers.formulaConsumers[id],resource_branch_consumers:consumers.resourceConsumers[id]};
  result.baseline.formula_consumer_ids[id]=consumers.formulaConsumers[id];result.baseline.resource_consumer_row_ids[id]=consumers.resourceConsumers[id];result.baseline.uom_by_parameter[id]=q.unit_id;
  result.baseline.guide_provenance_ru[id]=q.truth_metadata.guide?.guide_short_ru??q.title_ru;
  if(!oldIds.has(id))result.baseline.normative_source_ids[id]=[pack.sourceId];}
 result.passport.decision={...result.passport.decision,quantityScope:'PARTIAL',technicalScopeStatus:'NEEDS_SOURCE',completeTechnicalEstimateAccepted:false,newFullTechnologies:0,
  master31WholeToolProvisionContract:pack.contract,typedCurrentNeedClosuresOnlyWhenExplicitMethodAndFit:2,
  // The passport covers every selectable scope. The old factory-only path
  // still has all30 needs; only the explicit compatible post resolves two.
  unresolvedResourceRowIds:[...pack.coveredNeedIds,...pack.uncoveredNeedIds],
  conditionalToolProvisionScope:{methodParameterId:pack.methodId,methodValue:pack.methodRu,fitParameterId:pack.fitId,fitValue:pack.fitRu,
   condition:complete,resolvedNeedRowIds:pack.coveredNeedIds,remainingNeedRowIds:pack.uncoveredNeedIds,fullTechnicalAcceptance:false},
  independentCompletenessMap:master31MixerToolCompletenessR1(target!.catalogId)};
 return result;
}
export function master31MixerToolCompletenessR1(catalogId:string){
 const base=master30FactoryKitCompletenessMapR1(catalogId),id=(key:string)=>pack.prefix+':'+key;
 return{...base,generatedFromCurrentRows:false,sourceKind:'TECHNOLOGY_MAP',fullTechnicalAcceptance:false,physicalResourceCoverageComplete:false,
  entries:[...base.entries,...[{key:'provision-owner',category:'service',unitId:'set',operations:['tool-provision'],titleRu:pack.titleRu},...pack.tools].map(t=>({
   expectedResourceId:'master31:'+t.key,operationId:operationId(t.operations[0]!),requiredOperationIds:t.operations.map(operationId),
   category:t.category,unitId:t.unitId,sourceId:pack.sourceId,condition:pack.methodRu+'; '+pack.fitRu,specification:t.titleRu,
   quantityRule:'ONE_ACTIVE_SEQUENTIAL_POST_ASSET_NOT_PURCHASE_WEAR_OR_HOURS',formulaId:id('formula:'+t.key),
   resolution:t.key==='provision-owner'?{kind:'ROW',rowId:id(t.key)}:{kind:'INCLUDED_COMPONENT_ROW',rowId:id(t.key),parentRowId:pack.ownerRowId}}))],
  openAuthorObligations:pack.notCoveredRu};
}
