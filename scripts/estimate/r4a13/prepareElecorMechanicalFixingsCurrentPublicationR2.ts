// WORK-only pure current-parent successor. No SQL, DB client, CLI, writer or on-import run.
// ROOT owns registry admission, source freeze, migration checks and publication lifecycle.
import assert from'node:assert/strict';import{readFileSync}from'node:fs';import{createHash}from'node:crypto';import{resolve}from'node:path';
import fixture from'../../../data/estimate-benchmarks/fixtures/elecor-mechanical-fixings-current-parent-r2.json';
import pack from'../../../data/estimate-benchmarks/source-packs/elecor-project-mechanical-fixings-completion-r1.json';
import{elecorMechanicalProjectFixingsDefinitionR1,elecorMechanicalProjectFixingsControlInputR1}from'../../../src/lib/estimate/v4/elecorMechanicalProjectFixingsCompletionR1';
import type{AutomaticOwnerDefinition}from'../../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import{canonicalEstimateStableJson}from'../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import{compileCanonicalEstimateCore}from'../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import{buildMasterParameterCalculationConsumers}from'../../../src/lib/estimate/backendPlatform/canonicalDefinitionParameterConsumersR1';
import{canonicalManualPriceMigrationBindings,canonicalManualExclusionMigrationBindings}from'../../../src/lib/estimate/backendPlatform/canonicalManualPriceReleaseMigration';
import{createCanonicalDefinitionClonePlan,canonicalPublisherQuantityScopeIsConsistent}from'./canonicalDefinitionPublisherR1';
import type{PurchaseGroupRepresentative}from'./s2732PurchaseGroupOverlay';
type Json=Record<string,any>;
const contract='rik-expo-app.elecor-current-ppr-fixings-completion.r2';
const masterSha='dfbb757a1562962636259c1c4cffd9127d15882b00cdd49baa8fcd4831bcacf2';
const sourcePackPath='data/estimate-benchmarks/source-packs/elecor-project-mechanical-fixings-completion-r1.json';
const sourcePackSha='4ff75bc9f8374afc6cd268fbf91574b556625a0cb324ee048faa00a4f7388928';
const proposalSha='e8f44f76c77c870cb17b7b64577fa2ab93b43dd76edbd6b316c20a16b804e800';
const parentFixtureSha='3097e5f9497ccde7749f961f3b4a602cfb4d61c1e160c90439b30c3143e8b587';
const hash=(v:unknown)=>createHash('sha256').update(canonicalEstimateStableJson(v)).digest('hex');
const bytesSha=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
const uuid=(v:unknown)=>{const a=hash(v).slice(0,32).split('');a[12]='5';a[16]='8';const s=a.join('');return`${s.slice(0,8)}-${s.slice(8,12)}-${s.slice(12,16)}-${s.slice(16,20)}-${s.slice(20)}`;};
const prefix='electrical:elecor-60x40-single-route:';
const oldPaid=[prefix+'channel-order',prefix+'kms-order'];
const newBound=[prefix+'fixings-consumed',pack.priceOwnerRowId];
export type ElecorFixingsCurrentContextR2=Readonly<{definitionReleaseId:string;searchReleaseId:string;primaryMeasureParameterId:string;primaryUnitId:string;priceRouteBindings:readonly Json[]}>;
export type ElecorFixingsCurrentPlanArgumentsR2=Readonly<{releaseId:string;sourceHead:string;sourceTree:string;masterSha256:string;evidenceSha256:string;
 rootDecisionPin:Readonly<{path:string;sha256:string}>;
 // Optional exact existing registry IDs only after ROOT standard absent-or-byte-exact preflight.
 registryIds?:Readonly<{sourceRegistryId:string;locatorId:string}>}>;

function readPinned(path:string,sha256:string){assert.match(sha256,/^[a-f0-9]{64}$/u);const b=readFileSync(resolve(path));assert.equal(bytesSha(b),sha256,'SOURCE_OR_EVIDENCE_PIN:'+path);return b;}
function verifyRootDecision(pin:ElecorFixingsCurrentPlanArgumentsR2['rootDecisionPin']){
 const d=JSON.parse(readPinned(pin.path,pin.sha256).toString('utf8'));
 assert.equal(d.status,'ROOT_REVIEWED_ELECOR_PPR_FIXINGS_COMPLETION_R1');
 assert.equal(d.catalogId,pack.catalogId);assert.equal(d.proposal?.sha256,proposalSha);
 assert.equal(d.currentRead?.sha256,fixture.sourceReadPin.sha256);
 assert.deepEqual(d.executionContext,fixture.capturedExecutionContext);
 assert.equal(d.master?.sha256,masterSha);assert.equal(d.published,false);assert.equal(d.fullTechnicalAcceptance,false);
 assert.equal(d.newCompleteTypes,0);assert.equal(d.automaticLegacyUnknownNormPriceOrQuantityTransferAllowed,false);
 return d;
}
function sameBindingSemantics(rows:Json[],resourceIdToRowId:Map<string,string>){return rows.map(b=>({row_id:b.row_id??resourceIdToRowId.get(String(b.resource_spec_id)),
 locator_id:b.locator_id,applicability:b.applicability})).sort((a,b)=>String(a.row_id).localeCompare(String(b.row_id))||String(a.locator_id).localeCompare(String(b.locator_id)));}
export function prepareElecorMechanicalFixingsCurrentPublicationR2(parent:PurchaseGroupRepresentative,context:ElecorFixingsCurrentContextR2,input:ElecorFixingsCurrentPlanArgumentsR2){
 // Validate exact accepted raw-derived parent BEFORE resolving rawbinding resource IDs.
 readPinned('data/estimate-benchmarks/fixtures/elecor-mechanical-fixings-current-parent-r2.json',parentFixtureSha);
 readPinned(fixture.sourceReadPin.path,fixture.sourceReadPin.sha256);
 assert.equal(hash(parent),hash(fixture.parent),'EXACT_ACTUAL_COMPLETE_PARENT_PREIMAGE_REQUIRED');
 assert.deepEqual(context,fixture.context,'EXACT_CURRENT_CAPTURED_PAIR_OR_ADDRESSED_REBASE_REQUIRED');
 const before=hash(parent);assert.equal(parent.definition.catalog_id,pack.catalogId);assert.equal(parent.definition.id,'be917bf2-b982-541b-89cc-43ffdc9110fa');
 assert.equal(parent.definition.definition_version,1);assert.equal(parent.definition.definition_sha256,'223f802527b5477eca9174ce0243df06f49f14ecd8ab695076e5ef68aeb3d96e');
 assert.equal(parent.baseline.id,'cf4e464e-a8ce-515e-b524-679cfc448191');
 assert.equal(parent.parameters.length,22);assert.equal(parent.formulas.length,26);assert.equal(parent.resources.length,26);assert.equal(parent.bindings.length,18);
 assert.deepEqual(context.priceRouteBindings,[]);assert.equal(fixture.newPaidOwnerExistingCount,0);
 assert(fixture.savedAmendmentReview.every(x=>x.oldNeedOverride===null&&x.newOwnerOverride===null));
 assert.equal(input.masterSha256,masterSha);for(const x of[input.sourceHead,input.sourceTree])assert.match(x,/^[a-f0-9]{40}$/u);
 assert.match(input.releaseId,/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/u);assert.match(input.evidenceSha256,/^[a-f0-9]{64}$/u);
 verifyRootDecision(input.rootDecisionPin);
 assert.deepEqual(JSON.parse(readPinned(sourcePackPath,sourcePackSha).toString('utf8')),pack,'IMPORTED_SOURCE_PACK_DRIFT');
 for(const p of[pack.officialPassport,pack.fixedProduct.source,pack.exactElecorProductPage])readPinned(p.path,p.sha256);
 const asOwner={parameters:parent.parameters,formulas:parent.formulas,resources:parent.resources,runtimeInput:{},runtimeClassification:{},runtimeSourceIds:{},ordinaryParameterIds:['elecor_route_m']} as unknown as AutomaticOwnerDefinition;
 const extension=elecorMechanicalProjectFixingsDefinitionR1(asOwner),r:PurchaseGroupRepresentative={...structuredClone(parent),
  parameters:structuredClone([...extension.parameters]),formulas:structuredClone([...extension.formulas]),resources:structuredClone([...extension.resources])};
 assert.equal(r.parameters.length,39);assert.equal(r.formulas.length,32);assert.equal(r.resources.length,32);
 const oldParamIds=new Set(parent.parameters.map(p=>p.parameter_id)),oldFormulaIds=new Set(parent.formulas.map(f=>f.formula_id)),oldRowIds=new Set(parent.resources.map(row=>row.row_id));
 r.formulas.sort((a,b)=>Buffer.compare(Buffer.from(String(a.formula_id)),Buffer.from(String(b.formula_id))));
 const consumers=buildMasterParameterCalculationConsumers(r);
 for(const p of r.parameters){
  p.truth_metadata={...p.truth_metadata,formula_consumers:consumers.formulaConsumers[p.parameter_id],resource_branch_consumers:consumers.resourceConsumers[p.parameter_id]};
  r.baseline.formula_consumer_ids[p.parameter_id]=consumers.formulaConsumers[p.parameter_id];r.baseline.resource_consumer_row_ids[p.parameter_id]=consumers.resourceConsumers[p.parameter_id];
  if(!oldParamIds.has(p.parameter_id)){
   p.truth_metadata.featureContract=contract;r.baseline.input_classification[p.parameter_id]='VALIDATION_FIXTURE';r.baseline.uom_by_parameter[p.parameter_id]=p.unit_id;
   r.baseline.normative_source_ids[p.parameter_id]=p.truth_metadata.effective_resource_quantity_v1?[]:[pack.sourceId];
   r.baseline.guide_provenance_ru[p.parameter_id]=p.truth_metadata.guide?.guide_short_ru??'Внутренний выход фактического заказа; исходный норматив не подставляется.';
  }
 }
 for(const p of parent.parameters){
  const after=r.parameters.find(q=>q.parameter_id===p.parameter_id)!;
  const clean=(x:Json)=>{const q=structuredClone(x);delete q.truth_metadata.formula_consumers;delete q.truth_metadata.resource_branch_consumers;return q;};
  assert.equal(hash(clean(after)),hash(clean(p)),'OLD_PARAMETER_SEMANTICS_CHANGED:'+p.parameter_id);
 }
 for(const f of r.formulas)if(!oldFormulaIds.has(f.formula_id))f.ast_sha256=hash(f.ast);
 for(const row of r.resources)if(!oldRowIds.has(row.row_id))row.row_type='material';
 const control=elecorMechanicalProjectFixingsControlInputR1();
 for(const[id,value]of Object.entries(control))if(!oldParamIds.has(id))r.baseline.input_values[id]=value;
 r.baseline.parameter_schema_sha256=hash(r.parameters.map(p=>({parameterId:p.parameter_id,unitId:p.unit_id,valueType:p.value_type,constraints:p.constraints_json,truth:p.truth_metadata})));
 r.baseline.proposal_source_refs=[...(r.baseline.proposal_source_refs??[]),{contract,sourceId:pack.sourceId,
  sourceKind:'MANUFACTURER_METHOD_AND_COMPLETE_PRODUCT_WITH_EXPLICIT_PROJECT_FIXING_SCHEDULE_NOT_LABOUR_NORM',
  sourcePack:'data/estimate-benchmarks/source-packs/elecor-project-mechanical-fixings-completion-r1.json',sourceReadSha256:fixture.sourceReadPin.sha256,rootDecisionSha256:input.rootDecisionPin.sha256}];
 const sourceRegistryId=input.registryIds?.sourceRegistryId??uuid([contract,'source',pack.sourceId]);
 const locatorId=input.registryIds?.locatorId??uuid([contract,'locator','elecor-ed8-project-fixings-535463-r1']);
 for(const id of[sourceRegistryId,locatorId])assert.match(id,/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/u);
 const oldIdToRowId=new Map(parent.resources.map(row=>[String(row.id),String(row.row_id)]));
 r.bindings=parent.bindings.map(b=>({...structuredClone(b),row_id:oldIdToRowId.get(String(b.resource_spec_id))}));
 assert(r.bindings.every(b=>b.row_id));
 const bindingMetadata:Record<string,Json>={
  [newBound[0]]:{sourceKind:'MANUFACTURER_COMPATIBLE_METHOD_WITH_EXACT_PROJECT_QUANTITY',productArticle:'535463',gtin:pack.fixedProduct.gtin,
   quantityParameterId:pack.projectQuantityParameterId,pprReferenceParameterId:'elecor_fixing_ppr_reference',projectQuantityRequired:true,manufacturerConsumptionNormClaimed:false,labourNormAccepted:false},
  [newBound[1]]:{sourceKind:'COMPLETE_PRODUCT_SUPPLY_PLUS_PROJECT_DEMAND_BALANCE',productArticle:'535463',gtin:pack.fixedProduct.gtin,
   paidOwnerRowId:pack.priceOwnerRowId,unitId:'pcs',onePcs:'ONE_COMPLETE_ANCHOR_PLUS_PANHEAD_SCREW_PAIR',factoryBoxCompletePairs:50,
   pprReferenceParameterId:'elecor_fixing_ppr_reference',actualStockReserveAndSupplierMultipleRequired:true,manufacturerConsumptionNormClaimed:false,labourNormAccepted:false}};
 for(const rowId of newBound)r.bindings.push({row_id:rowId,locator_id:locatorId,applicability:bindingMetadata[rowId]});
 const staticNeeds=[...parent.passport.decision.unresolvedResourceRowIds];assert.equal(staticNeeds.length,8);
 const completeness=structuredClone(parent.passport.decision.independentCompletenessMap);
 const legacyEntry=completeness.entries.find((e:Json)=>e.resolution?.rowId===pack.existingNeedRowId);assert(legacyEntry);legacyEntry.condition='FIXING_METHOD_UNRESOLVED_SOURCE_NEED_REMAINS';
 for(const[rowId,id,rule]of[[newBound[0],'mechanical-fixings-project-535463','EXACT_ACCEPTED_PPR_POINT_COUNT_ONE_COMPLETE_PRODUCT_PER_POINT'],
  [newBound[1],'mechanical-fixings-order-535463','FIXED50_PAIR_FACTORY_QUANTUM_PLUS_ACTUAL_STOCK_RESERVE_AND_SUPPLIER_MULTIPLE']])
  completeness.entries.push({expectedResourceId:id,sourceId:pack.sourceId,category:'material',unitId:'pcs',specification:pack.publicOwnerSpecificationRu,
   condition:'EXACT_PPR_CONCRETE_WALL_MECHANICAL535463_BRANCH',operationId:'project-mechanical-fixings',quantityRule:rule,
   formulaId:r.resources.find(row=>row.row_id===rowId)!.formula_id,resolution:{kind:'ROW',rowId}});
 const physical='Материалы прямого участка ELECOR60×40: исходные секции/КМС и условный отдельный заказ fischer535463 по принятой ведомости ППР. Труд и остальные обязательства не нормированы.';
 r.passport.included_scope_ru=[
  'Сохранены исходные секции ELECOR60×40 и КМС по принятой геометрии одного прямого участка и целые заводские упаковки.',
  pack.scopeRu,pack.publicOwnerSpecificationRu,'Только отдельная материальная подработка крепления по ППР; полная технология монтажа, труд и приёмка остаются незакрытыми.'];
 r.definition.passport={...r.definition.passport,physicalResultRu:physical};
 r.definition.applicability={...r.definition.applicability,pprMechanicalFixingsR2:{featureContract:contract,method:pack.method,
  unresolvedMethod:pack.unresolvedMethod,productArticle:'535463',newPaidOwnerRowId:pack.priceOwnerRowId,requiredProjectFactIds:pack.projectFactsRequired,
  noNormHours:true,noAutomaticUnknownNormPriceOrQuantityTransfer:true,newCatalog:false,fullTechnicalAcceptance:false}};
 const decision={...r.passport.decision,status:'GREEN',allowed:true,waveContract:contract,quantityScope:'PARTIAL',technicalScopeStatus:'NEEDS_SOURCE',
  preliminaryCompositionOnly:true,completeTechnicalEstimateAccepted:false,fullTechnicalAcceptance:false,activationAllowed:false,productionEligible:false,
  unresolvedResourceRowIds:staticNeeds,independentCompletenessMap:completeness,
  pprMechanicalFixingsR2:{rootDecisionSha256:input.rootDecisionPin.sha256,capturedCurrentReadSha256:fixture.sourceReadPin.sha256,
   activeUnresolvedNeedsInConfirmedMechanicalBranch:7,staticAcrossBothMethods:8,newPaidOwners:1,newCompleteTypes:0,manualRightsMigrationAdmitted:false}};
 const definitionSha256=hash({contract,parentDefinitionSha256:parent.definition.definition_sha256,parameters:r.parameters,formulas:r.formulas,resources:r.resources});
 r.passport={...r.passport,parameter_count:39,formula_count:32,resource_count:32,physical_result_ru:physical,decision,payload_sha256:hash({definitionSha256,decision})};
 const definitionId=uuid([contract,input.releaseId,pack.catalogId]),baselineId=uuid([definitionId,'baseline']);
 const plan=createCanonicalDefinitionClonePlan({contract,
  definition:{id:definitionId,releaseId:input.releaseId,catalogId:pack.catalogId,definitionVersion:2,passport:r.definition.passport,
   applicability:r.definition.applicability,definitionSha256,sourceMetadata:{...parent.definition.source_metadata,contract,masterSha256:masterSha,
    predecessorDefinitionId:parent.definition.id,parentReadSha256:fixture.sourceReadPin.sha256,rootDecisionSha256:input.rootDecisionPin.sha256,
    preservedNormativeBindingCount:18,newProductProjectBindingCount:2,activationAllowed:false,productionEligible:false}},
  representative:r,parameterTruthMetadata:p=>({...p.truth_metadata}),resourceId:row=>uuid([definitionId,row.row_id]),
  resourceSemanticOwner:row=>String(row.semantic_owner??pack.catalogId+':'+row.row_id),resourceSha256:row=>hash(row),
  baseline:{id:baselineId,key:contract+':'+definitionId,sourceDefinitionVersionId:parent.definition.id,
   validationScenarioRefs:[...(parent.baseline.validation_scenario_refs??[]),{scenario:'CONTROL_ONLY_25M_PPR38POINTS_FIXED535463_ORDER50PAIRS_NOT_REAL_PROJECT',evidenceSha256:input.evidenceSha256}],
   acceptanceEvidenceSha256:input.evidenceSha256,acceptedReleaseId:input.releaseId,supersedesBaselineId:parent.baseline.id},
  passport:{physicalResultRu:physical,excludedScopeRu:parent.passport.excluded_scope_ru,decision,payloadSha256:hash({definitionSha256,decision}),sourceHead:input.sourceHead,sourceTree:input.sourceTree},
  bindingApplicability:b=>b.applicability,expectedNormativeBindingCount:20});
 assert(canonicalPublisherQuantityScopeIsConsistent(plan),'PARTIAL_STATIC_EIGHT_SOURCE_NEEDS_REQUIRED');
 const planIds=new Map(plan.resources.map(row=>[String(row.id),String(row.row_id)]));
 assert.deepEqual(sameBindingSemantics(plan.bindings.filter(b=>b.locator_id!==locatorId),planIds),sameBindingSemantics(parent.bindings,oldIdToRowId),'OLD18_SOURCE_AWARE_BINDINGS_CHANGED');
 assert.equal(plan.bindings.filter(b=>b.locator_id===locatorId).length,2);assert.equal(hash(parent),before,'INPUT_PARENT_MUTATED');
 const fromPrice=canonicalManualPriceMigrationBindings(parent),toPrice=canonicalManualPriceMigrationBindings(r);
 for(const id of oldPaid)assert.equal(fromPrice[id],toPrice[id],'OLD_PAID_OWNER_PRICE_SEMANTICS_CHANGED:'+id);
 assert.notEqual(fromPrice[pack.existingNeedRowId],toPrice[pack.priceOwnerRowId]);
 const locatorPayload={sourcePack:pack,scope:pack.scopeRu,explicitBindingApplicabilityByRowId:bindingMetadata,
  sourceQuantityKind:'PROJECT_DEFINED_NOT_MANUFACTURER_CONSUMPTION_NORM',sourceReadSha256:fixture.sourceReadPin.sha256,rootDecisionSha256:input.rootDecisionPin.sha256};
 return{contract,status:'WORK_EXACT_CURRENT_V1_TO_V2_DRAFT_REQUIRES_ROOT_REGISTRY_AND_MANUAL_RIGHTS_ADMISSION',plan,previewRepresentative:r,
  expectedShape:{parameters:39,formulas:32,resources:32,bindings:20,priceBindings:0},
  registryRequirements:{admission:'EXISTING_SHARED_WRITER_ABSENT_OR_EXACT_AND_LOCKED_REREAD_REQUIRED',globalAbsenceClaimed:false,
   source:{id:sourceRegistryId,source_key:pack.sourceId,title_ru:'IEK ELECOR edition8 + fischer535463: способ/поставка и отдельная ведомость ППР, не трудовая норма',
    authority:'IEK GROUP; fischerwerke; requiredacceptedprojectmethodstatement',official_url:pack.officialPassport.url,artifact_sha256:sourcePackSha,
    metadata:{contract,sourceKind:'MANUFACTURER_METHOD_PRODUCT_AND_PROJECT_QUANTITY_NOT_LABOUR_NORM',sourcePack:pack,labourNormAccepted:false,fullTechnicalAcceptance:false}},
   locator:{id:locatorId,source_id:sourceRegistryId,locator_key:'elecor-ed8-project-fixings-535463-r1',locator:locatorPayload,excerpt_sha256:hash(locatorPayload)}},
  manualRightsEvidence:{fromPriceBindings:fromPrice,toPriceBindings:toPrice,fromExclusionBindings:canonicalManualExclusionMigrationBindings(parent),toExclusionBindings:canonicalManualExclusionMigrationBindings(r),
   unchangedPaidOwners:oldPaid,forbiddenLegacyNeedToNewOwner:{from:pack.existingNeedRowId,to:pack.priceOwnerRowId},automaticMigrationAllowed:false,
   rootCommonMigrationReviewRequired:true,immutableSavedState:fixture.unchangedSavedStateEvidence},
  context,sourcePreimageSha256:hash(parent),sourceReadSha256:fixture.sourceReadPin.sha256,publicationReady:false,runtimeAccepted:false,
  verifyCore:async()=>{
   const compile=(values:Json,rowOverrides?:Json)=>compileCanonicalEstimateCore({operation:rowOverrides?'recalculate':'compile',catalogId:pack.catalogId,compilerVersion:contract,
    primaryMeasureParameterId:'elecor_route_m',parameterDefinitions:plan.parameters,formulaDefinitions:plan.formulas,resourceDefinitions:plan.resources,
    submittedParameters:values,confirmedParameters:{},rowOverrides,currencyCode:'KGS',priceItems:[],maximumResourceRows:plan.resources.length,hashJson:async v=>hash(v)});
   const out=await compile(control);assert.equal(out.rows.length,24);assert.equal(out.preliminaryNeeds.length,7);
   const owner=out.rows.find(x=>x.row_id===pack.priceOwnerRowId)!;assert.equal(owner.quantity,'50');assert.equal(owner.unit_id,'pcs');assert.equal(owner.unit_price,null);
   const unknownInput={...parent.baseline.input_values,elecor_fixing_method:pack.unresolvedMethod};const unresolved=await compile(unknownInput);assert.equal(unresolved.preliminaryNeeds.length,8);
   // A legal manual need quantity is retained without becoming a norm, payment or order.
   // Use the unresolved method for the negative procurement control: its need is active.
   const legacyProvenance={kind:'manual',reason:'CONTROL_ONLY retained legacy need quantity; norm remains unknown'};
   assert.equal(plan.resources.find(row=>row.row_id===pack.existingNeedRowId)?.procurement_eligible,false);
   assert.equal(unresolved.preliminaryNeeds.filter(need=>need.row_id===pack.existingNeedRowId).length,1);
   const definitionBefore=hash({parameters:plan.parameters,formulas:plan.formulas,resources:plan.resources});
   for(const v of[0,1,77]){
    await assert.rejects(()=>compile({...control,[pack.legacyUnresolvedQuantityParameterId]:v}),(e:any)=>e.code==='PARAMETER_VALIDATION_FAILED');
    const overrides={[pack.existingNeedRowId]:{quantity:String(v),unitPrice:'77',provenance:legacyProvenance}};
    const active=await compile(control,overrides);
    assert(![...active.rows,...active.preliminaryNeeds].some(row=>row.row_id===pack.existingNeedRowId));
    assert.deepEqual(active.rows.find(row=>row.row_id===pack.priceOwnerRowId),owner);
    assert.deepEqual(active.totals,out.totals);assert(!Object.hasOwn(active.parameters,pack.legacyUnresolvedQuantityParameterId));
    const legacy=await compile(unknownInput,overrides),needs=legacy.preliminaryNeeds.filter(need=>need.row_id===pack.existingNeedRowId);
    assert(!legacy.rows.some(row=>row.row_id===pack.existingNeedRowId||row.row_id===pack.priceOwnerRowId));
    assert.equal(needs.length,1);const need=needs[0]!;
    assert.equal(need.quantity,String(v));assert.equal(need.unit_price,'77');
    assert(need.missing_parameter_ids.includes(pack.legacyUnresolvedQuantityParameterId));
    assert.equal(need.procurement_eligible,false);assert.deepEqual(legacy.totals,unresolved.totals);
    assert(!Object.hasOwn(legacy.parameters,pack.legacyUnresolvedQuantityParameterId));
    const trace=need.calculation_trace;assert(trace!==null&&typeof trace==='object'&&!Array.isArray(trace));
    assert.equal('preliminaryNeed' in trace&&trace.preliminaryNeed,true);
    assert.equal('manualQuantityOverride' in trace&&trace.manualQuantityOverride,true);
    assert.equal('calculatedQuantityBeforeOverride' in trace?trace.calculatedQuantityBeforeOverride:undefined,null);
    assert.deepEqual('manualAmendment' in trace?trace.manualAmendment:undefined,legacyProvenance);
    await assert.rejects(()=>compile(unknownInput,{[pack.existingNeedRowId]:{...overrides[pack.existingNeedRowId],includedInEstimate:true,includedInProcurement:true}}),
     (error:unknown)=>error!==null&&typeof error==='object'&&'code' in error&&error.code==='ROW_AMENDMENT_INVALID');
   }
   assert.equal(hash({parameters:plan.parameters,formulas:plan.formulas,resources:plan.resources}),definitionBefore);
   const manual=await compile(control,{[pack.priceOwnerRowId]:{quantity:'77',unitPrice:'77',titleRu:'Мой крепёж535463',provenance:{kind:'manual',reason:'CONTROL_ONLY raw77 quantumblock'}}});
   assert.equal(manual.rows.find(x=>x.row_id===pack.priceOwnerRowId)?.quantity,'77');assert.equal(manual.rows.find(x=>x.row_id===pack.priceOwnerRowId)?.amount,null);
   assert.equal(manual.rows.find(x=>x.row_id===pack.priceOwnerRowId)?.included_in_procurement,false);
   assert.equal(hash(parent),before);return{status:'PURE_ACTUAL_PARENT_FACTORY_AND_SHARED_COMPILER_CHECKS_COMPLETED_NOT_DB_ACCEPTANCE',
    shape:[39,32,32],bindings:20,oldBindingsPreserved:18,newBindings:2,staticNeeds:8,activeMechanicalNeeds:7,priceBindings:0,
    noOldUnknownNormPriceOrQuantityCarry:true,legacyManualNeedCases:3,forbiddenActiveLegacyProcurementCases:3,unresolvedNormInputRejections:3,registryAdmissionPending:true,manualRightsMigrationAdmissionPending:true,fullTechnicalAcceptance:false};
  }};
}
