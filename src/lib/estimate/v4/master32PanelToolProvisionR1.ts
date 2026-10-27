import pack from '../../../../data/estimate-benchmarks/source-packs/master32-panel-tool-provision-r1.json';
import {buildAutomaticConstructionOwnerR1,type AutomaticOwnerDefinition,type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';
import {buildMasterParameterCalculationConsumers} from '../backendPlatform/canonicalDefinitionParameterConsumersR1';
import {master30FactoryKitCompletenessMapR1,master30FactoryKitsPackR1} from './master30ElectricalPlumbingFactoryKitsR1';
import type {PurchaseGroupRepresentative as Rep} from '../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';

type Json=Record<string,any>;
const fixture=require('../../../../data/estimate-benchmarks/fixtures/master32-panel-current-two-v4-r1.json') as {captures:Json[]};
export const master32PanelToolPackR1=pack;
const copy=<T,>(v:T):T=>structuredClone(v),eq=(parameterId:string,value:string)=>({kind:'equals',parameterId,value});
const selected=(parameterId:string,value:string)=>({kind:'selected',parameterId,value});
const and=(...operands:Json[])=>({kind:'and',operands});
const requireThat=(value:unknown,code:string):void=>{if(!value)throw Error('MASTER32_PANEL_TOOLS_'+code);};
const rehash=(r:Json):Json=>{const{row_sha256:_h,...body}=r;return{...body,row_sha256:hash(body)};};
const decl=(r:Json):Json=>Object.fromEntries(Object.entries(r).filter(([k])=>!['id','definition_version_id','created_at','updated_at','row_sha256'].includes(k)));
export const master32PanelCurrentCaptureR1=(catalogId:string)=>{const c=fixture.captures.find(c=>c.definition.catalog_id===catalogId);requireThat(c,'EXACT_CURRENT_CAPTURE_REQUIRED');return copy(c!);};
export function master32PanelCurrentRepresentativeR1(catalogId:string):Rep{
 const c=master32PanelCurrentCaptureR1(catalogId),ids=new Map(c.resources.map((r:Json)=>[r.id,r.row_id]));
 return{definition:c.definition,baseline:c.baseline,passport:c.contentPassport,parameters:c.parameters,formulas:c.formulas,resources:c.resources,
  bindings:c.bindings.map((b:Json)=>({row_id:ids.get(b.resource_spec_id),locator_id:b.locator_id,applicability:b.applicability}))};
}
/** Functional coverage is authored independently of emitted calculation rows.
 * The proving device is manufacturer-matched; it cannot substitute for the
 * separate Class I PE continuity instrument, leads, zero adapter and power. */
export function assertMaster32PanelToolWorkflowR1(p:typeof pack=pack):void{
 const expected=['stripper-cutter','measuring-rule','slotted-screwdriver','voltage-indicator','proving-unit','proving-batteries','proving-magnetic-hanger','voltage-kit-case','installation-tester','continuity-red-lead','continuity-green-lead','continuity-red-probe','continuity-green-probe','continuity-red-gs38-cap','continuity-green-gs38-cap','continuity-red-clip','continuity-green-clip','continuity-zero-adapter','continuity-batteries','continuity-padded-strap','continuity-hard-case'];
 requireThat(p.tools.length===21&&new Set(p.tools.map(t=>t.key)).size===21&&expected.every(k=>p.tools.some(t=>t.key===k)),'WHOLE_WORKFLOW_TOOLS_REQUIRED');
 requireThat(p.tools.every(t=>t.unitId==='piece'&&t.category==='equipment'&&t.countExpression===(t.countPerPost===1?p.postExpression:String(t.countPerPost)+'*'+p.postExpression)),'PHYSICAL_POST_ASSET_DIMENSION_AND_COUNT');
 const get=(key:string)=>p.tools.find(t=>t.key===key)!;
 requireThat(get('stripper-cutter').profile.assembly==='FITTED_BLADES_CUTTER_AND_LENGTH_STOP'&&get('stripper-cutter').profile.stripSettingMm===11&&get('stripper-cutter').profile.usedOnlyDeenergized,'COMPLETE_COMPATIBLE_CONDUCTOR_PREPARATION');
 requireThat(get('voltage-indicator').profile.poles===2&&get('voltage-indicator').profile.batteryCount===0&&get('voltage-indicator').profile.assembly==='INTEGRAL_TWO_PRODS_LINKED_LEAD_TWO_RETRACTABLE_GS38_SHROUDS','DUAL_POLE_COMPLETE_INDICATOR');
 requireThat(get('proving-unit').profile.manufacturerMatchedTo===get('voltage-indicator').profile.internalModel&&get('proving-unit').profile.internalModel==='PD690SRD','EXACT_MATCHED_PROVING_CYCLE');
 requireThat(get('proving-batteries').countPerPost===6&&get('continuity-batteries').countPerPost===6,'BOTH_INSTRUMENT_POWER_SOURCES');
 requireThat(get('proving-unit').profile.maximumCycleSeconds===10&&get('proving-unit').profile.minimumRestSeconds===3&&get('voltage-indicator').profile.maximumOnSeconds===30&&get('voltage-indicator').profile.offToOnRatio===8,'BOTH_DEVICE_DUTY_LIMITS');
 requireThat(get('installation-tester').profile.function==='RLO_EN61557_4'&&get('installation-tester').profile.noAutomaticInsulationTestOnLedDriver&&get('continuity-zero-adapter').profile.role==='LEAD_RESISTANCE_ZERO_NOT_CALIBRATION_SUBSTITUTE','SEPARATE_CLASS_I_PE_MEASUREMENT_CAPABILITY');
 requireThat(p.workflow[0]!.provingSequence.join('|')==='INSPECT|PROVE_BEFORE|ABSENCE_VOLTAGE_CHECK|PROVE_AFTER'&&p.workflow[0]!.absenceCheckPairs.join('|')==='L_N|L_PE|N_PE','WHOLE_DEAD_TEST_WORKFLOW');
 requireThat(p.tools.reduce((n,t)=>n+t.countPerPost,0)===31&&p.ownerRowId===p.prefix+':provision-owner'&&p.ownerRowId!=='led-grid:dvo6560-6562:opal-4000','ONE_WHOLE_PROVISION_NOT_FACTORY_PAYMENT');
}
const usingGroup=master30FactoryKitsPackR1.profiles.find(p=>p.key==='electrical')!;
// Use the actual accepted material-consuming operations. A second operation
// with a similar label would leave tools outside the existing subwork rows.
const operationId=(key:string)=>{requireThat(key==='installation','ONLY_EXISTING_USING_OPERATION');return 'master30:electrical:installation';};
const operation=(key:string)=>({operationId:operationId(key),operationTitleRu:'Установка в готовую решётку и подключение',processOrdinal:30,processRole:'PROCESS' as const,
 completionCriterionRu:'Инструмент совместим с принятым узлом; материалы, СИЗ, доступ, труд и программа приёмки остаются отдельными потребностями.'});
/** The explicit organization supplies simultaneous tool assets, not a tool
 * purchase, wear rate, rental duration, labour hours or actual warehouse stock. */
export function master32PanelToolSubjectR1():AutomaticOwnerDefinition{
 assertMaster32PanelToolWorkflowR1();
 const n=pack.countId,id=(key:string)=>pack.prefix+':'+key;
 const row=(key:string,title:string,category:string,unitId:string,costTreatment:AutomaticRowSpec['costTreatment']):AutomaticRowSpec=>({
  rowId:id(key),formulaId:id('formula:'+key),title,category,unitId,section:pack.titleRu,expression:pack.tools.find(t=>t.key===key)?.countExpression??pack.postExpression,procurement:false,costTreatment,inputParameterIds:[pack.fitId]});
 const d=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:pack.prefix,sourceId:pack.sourceId,normId:pack.normId,
  sourceMetadata:{source_title:pack.titleRu,source_document_version:pack.source.edition,definition_hash:pack.source.sha256,artifact_sha256:pack.source.sha256,exact_locator:pack.source.locatorRu},
  applicabilityRu:pack.scopeRu,ordinary:[{id:n,title:'Число монтажных мест',kind:'ordinary',valueType:'integer',unitId:'item',min:0,max:1000000}],profile:[],
  conditional:[{id:pack.methodId,title:'Ручное и измерительное оснащение поста',kind:'conditional',valueType:'enum',unitId:null,values:[pack.methodRu,pack.unresolvedMethodRu]},
   {id:pack.fitId,title:'Приняты ли фактический узел и условия применения оснащения?' ,kind:'conditional',valueType:'enum',unitId:null,values:[pack.fitRu]}],
  rows:[row('provision-owner','Ручное и измерительное оснащение поста','service','set','OWN_COST'),...pack.tools.map(t=>row(t.key,t.titleRu,t.category,t.unitId,'INCLUDED_IN_RESOURCE_ROWS'))],
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
     operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:'master30:electrical',groupTitleRu:usingGroup.publicNameRu,...operation(uses[0]!),
      additionalOperations:uses.slice(1).map(operation)},
     physicalProvisionV1:{basis:'EXPLICIT_SELECTED_SINGLE_SERIAL_POST',assetRoleId:key,postCountExpression:pack.postExpression,actualWarehouseClaimed:false,countPerPost:tool?.countPerPost??1,
      newPurchaseClaimed:false,rentalDurationClaimed:false,consumptionOrWearNormClaimed:false,...(!owner?{toolProfile:tool!.profile}:{priceScopeRu:pack.priceScopeRu})},
     derivedQuantityEditPolicyV1:{contractVersion:'canonical-derived-quantity-edit-policy/v1',mode:'PARAMETERS_ONLY',unitId:r.unit_id,parameterIds:[n],reasonRu:'Число физических предметов задано для одного последовательного поста; это не покупка инструмента на каждую панель.'},
     publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:r.title_ru,nameRu:r.title_ru,brandAndModelRu:null,specificationRu:null,detailsRu:[]}},
    source_metadata:{...r.source_metadata,normativeTrace:[],sourceRole:owner?'EXPLICIT_WHOLE_TOOL_POST_CONTRACTUAL_PRICE_SCOPE':'CALCULATED_SINGLE_SERIAL_POST_CONCRETE_TOOL_PROVISION',
     physicalProvisionAccepted:true,physicalProvisionBasis:'ONE_ACTIVE_SEQUENTIAL_POST_NOT_MANUFACTURER_CREW_NORM',sourceNormQuantityAccepted:false,
     wholeHandAndMeasuringToolKitNotWholeInstallation:true,manufacturerCrewQuantityNormClaimed:false,automaticGenericPriceInheritanceAllowed:false,full_technical_acceptance:false,
     methodEvidence:pack.source,primaryCapabilityArtifacts:pack.sourceArtifacts.filter(s=>owner||(tool!.sourceArtifactIds as readonly string[]).includes(s.id)),exact_locator:owner?pack.priceScopeRu:tool!.locator}}) as unknown as AutomaticOwnerDefinition['resources'][number];
  })};
}
export function buildMaster32PanelToolSuccessorR1(parent:Rep):Rep{
 const target=pack.targets.find(t=>t.catalogId===parent.definition.catalog_id);requireThat(target,'EXACT_TARGET_REQUIRED');
 const frozen=master32PanelCurrentRepresentativeR1(target!.catalogId);
 requireThat(parent.definition.id===target!.definitionId&&parent.definition.definition_sha256===target!.definitionSha256&&parent.definition.definition_version===4
  &&hash([parent.parameters,parent.formulas,parent.resources])===hash([frozen.parameters,frozen.formulas,frozen.resources]),'EXACT_V4_PARENT_COMPUTATION_REQUIRED');
 const result=copy(parent),subject=master32PanelToolSubjectR1(),oldIds=new Set(parent.parameters.map(q=>q.parameter_id));
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
  master32WholeToolProvisionContract:pack.contract,typedCurrentNeedClosuresOnlyWhenExplicitMethodAndFit:2,
  // The passport covers every selectable scope. The old factory-only path
  // still has all24 needs; only the explicit compatible post resolves two.
  unresolvedResourceRowIds:[...pack.coveredNeedIds,...pack.uncoveredNeedIds],
  conditionalToolProvisionScope:{methodParameterId:pack.methodId,methodValue:pack.methodRu,fitParameterId:pack.fitId,fitValue:pack.fitRu,
   condition:complete,resolvedNeedRowIds:pack.coveredNeedIds,remainingNeedRowIds:pack.uncoveredNeedIds,fullTechnicalAcceptance:false},
  independentCompletenessMap:master32PanelToolCompletenessR1(target!.catalogId)};
 result.passport.capability_matrix=result.passport.capability_matrix.map((c:Json)=>c.capability==='FULL_APPLICABLE_SCOPE'?{...c,status:'NEEDS_SOURCE',unresolvedResourceRowIds:[...pack.coveredNeedIds,...pack.uncoveredNeedIds]}:c);
 return result;
}
export function master32PanelToolCompletenessR1(catalogId:string){
 const base=master30FactoryKitCompletenessMapR1(catalogId),id=(key:string)=>pack.prefix+':'+key;
 return{...base,generatedFromCurrentRows:false,sourceKind:'TECHNOLOGY_MAP',fullTechnicalAcceptance:false,physicalResourceCoverageComplete:false,
  entries:[...base.entries,...[{key:'provision-owner',category:'service',unitId:'set',operations:['installation'],titleRu:pack.titleRu},...pack.tools].map(t=>({
   expectedResourceId:'master32:'+t.key,operationId:operationId(t.operations[0]!),requiredOperationIds:t.operations.map(operationId),
   category:t.category,unitId:t.unitId,sourceId:pack.sourceId,condition:pack.methodRu+'; '+pack.fitRu,specification:t.titleRu,
   quantityRule:'ONE_ACTIVE_SEQUENTIAL_POST_ASSET_NOT_PURCHASE_WEAR_OR_HOURS',formulaId:id('formula:'+t.key),
   resolution:t.key==='provision-owner'?{kind:'ROW',rowId:id(t.key)}:{kind:'INCLUDED_COMPONENT_ROW',rowId:id(t.key),parentRowId:pack.ownerRowId}}))],
  openAuthorObligations:pack.notCoveredRu};
}
