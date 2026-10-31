import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import rawCapture from '../../../data/estimate-benchmarks/fixtures/masonry-family-brick-current-parent-r2.json';
import source from '../../../data/estimate-benchmarks/source-packs/masonry-ceramic250-current-card-reuse-r4.json';
import whole from '../../../data/estimate-benchmarks/source-packs/masonry-ceramic250-whole-family-composition-r2.json';
import {masonryM50CycleCapturedRepresentativeR2 as captured} from '../../../src/lib/estimate/v4/masonryReadyM50WholeSupplyCycleR2';
import {buildMasonryCeramic250OrdinaryCurrentCardR4 as build,compileMasonryCeramic250OrdinaryCurrentCardR4 as compile,MASONRY_CERAMIC250_SOURCE_PROFILE_R4 as profile,MASONRY_CERAMIC250_PRIMARY_VOLUME_R4 as primary,MASONRY_CERAMIC250_SIMPLE_GEOMETRY_R4 as geometryIds} from '../../../src/lib/estimate/v4/masonryCeramic250OrdinaryCurrentCardR4';
import {canonicalDefinitionPublicationStableValueR1 as stable} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionPublicationStableValueR1';
import {canonicalScopeRequirementDecisionV1} from '../../../src/lib/estimate/backendPlatform/canonicalScopeRequirementV1';
import {masterRetainedParentCaptureSha256R1,masterRetainParentBindingsOptInR1,prepareMasterRetainedBindingRepresentativeR1,type MasterRetainedBindingGuardInputR1,type MasterRetainedParentCaptureR1 as Capture,type MasterExplicitParameterSourcesR1 as Sources} from './masterSingleDefinitionRetainParentBindingsR1';
import {validateIndependentCompletenessMapReferences,buildMasterPublicationResourceRowsR1,resolveMasterSingleDefinitionBindingRowIds,resolveMasterSingleDefinitionBindingApplicabilityByRowId,resolveMasterSingleDefinitionLocatorExcerptSha256R1,hashMasterSingleDefinitionSuccessorReceiptR1 as receiptHash,type MasterSingleDefinitionSuccessorConfig as Config} from './prepareMasterSingleDefinitionSuccessorR1';

const packPath='data/estimate-benchmarks/source-packs/masonry-ceramic250-current-card-reuse-r4.json';
const sha=(file:string)=>createHash('sha256').update(readFileSync(file)).digest('hex');
const valueSha=(value:unknown)=>createHash('sha256').update(JSON.stringify(stable(JSON.parse(JSON.stringify(value))))).digest('hex');
const record=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value);
function unresolvedResourceIds(value:unknown):string[]{
 assert(Array.isArray(value),'MASONRY_BRICK_R4_UNRESOLVED_RESOURCE_ID_ARRAY');
 assert(value.every((id:unknown):id is string=>typeof id==='string'),'MASONRY_BRICK_R4_UNRESOLVED_RESOURCE_ID_STRING');
 return[...new Set(value)];
}

/** Same ID seeds and UUID layout as the ordinary publisher. These identify
 * the representative source/locator; this does not allocate a release or write DB. */
function checkedSourceUuid(seed:string):string{
 const bytes=Buffer.from(receiptHash(seed).slice(0,32),'hex');
 bytes[6]=(bytes[6]!&0x0f)|0x50;bytes[8]=(bytes[8]!&0x3f)|0x80;
 const hex=bytes.toString('hex');return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

/** Reuse the already exercised ordinary retained representative setup.
 * This is a pure source/capture rehearsal, not a final publication fingerprint,
 * normal/locked PG preflight, DB approval or full technical acceptance.
 * Errors deliberately propagate; no HELD-shaped success is returned. */
export function masonryCeramic250RetainedRepresentativeCheckR4(config:Config,sourceRoot?:string){
 const retained=config.binding.retainParentBindings;assert(retained);
 assert(!Object.hasOwn(retained,'truthAuthorityOnlyV1'));
 assert(!Object.hasOwn(retained,'operationCompositionOnly'));
 assert(!Object.hasOwn(config.binding,'reuseExistingNormativeRegistry'));
 const capture=retained.capturedParent,oldFormulaIds=new Set(capture.formulas.map(formula=>formula.formula_id));
 const parameters=config.parameterDefinitions.map(parameter=>({...parameter}));
 const formulas=config.formulaDefinitions.map(formula=>({...formula,ast_sha256:oldFormulaIds.has(formula.formula_id)?formula.ast_sha256:receiptHash(formula.ast)}));
 const resources=buildMasterPublicationResourceRowsR1(config.resourceDefinitions);
 const sourceId=checkedSourceUuid(`${config.contract}:${config.sourceId}:source`),locatorId=checkedSourceUuid(`${config.contract}:${config.sourceId}:${config.locator.key}:locator`);
 const input:MasterRetainedBindingGuardInputR1={config,newSource:{id:sourceId,source_key:config.sourceId,title_ru:config.sourceMetadata.source_title,authority:config.sourceMetadata.source_authority,official_url:config.sourceMetadata.official_url??null,artifact_sha256:config.sourceMetadata.artifact_sha256??null,effective_from:config.sourceMetadata.effective_from??null,effective_to:null,metadata:{contract:config.contract,sourceKind:config.sourceMetadata.source_kind??'PROJECT_DOCUMENTATION_REQUIRED',useRestriction:config.sourceMetadata.use_restriction,universalProductivityClaimed:false,universalConsumptionClaimed:false,activationAllowed:false}},newLocators:[{id:locatorId,source_id:sourceId,locator_key:config.locator.key,locator:config.locator.payload,excerpt_sha256:resolveMasterSingleDefinitionLocatorExcerptSha256R1(config)}]};
 assert(masterRetainParentBindingsOptInR1(input));
 const locators=[locatorId],applicability=resolveMasterSingleDefinitionBindingApplicabilityByRowId(config,resources,locators);
 const newBindings=resolveMasterSingleDefinitionBindingRowIds(config,resources,locators).map(rowId=>({row_id:rowId,locator_id:locatorId,applicability:applicability[rowId]}));
 const configPath='scripts/estimate/r4a13/prepareMasonryCeramic250CurrentCardR4.ts',file=sourceRoot&&existsSync(join(sourceRoot,configPath))?join(sourceRoot,configPath):configPath;
 const fingerprint=receiptHash({purpose:'ISOLATED_READ_ONLY_REPRESENTATIVE_REHEARSAL_NOT_FINAL_PUBLICATION_IDENTITY',configSha256:sha(file),sourceArtifactSha256:config.sourceMetadata.artifact_sha256,captureSha256:retained.capturedParentSha256});
 const checked=prepareMasterRetainedBindingRepresentativeR1(input,{parameters,formulas,resources,newBindings,successorProvenance:{contract:config.contract,sourceId:config.sourceId,normId:config.normId,parentDefinitionId:capture.definition.id,parentBaselineId:capture.baseline.id,capturedParentSha256:retained.capturedParentSha256,sourceFingerprint:fingerprint},lifecycleMetadata:{contract:config.contract,masterSha256:config.masterSha256,sourceFingerprint:fingerprint}});
 assert.equal(checked.bindings.length,checked.expectedNormativeBindingCount);
 return{scope:'PURE_EXISTING_RETAINED_REPRESENTATIVE_NOT_PUBLISHER_PG_API_ACCEPTANCE',capturedParentSha256:retained.capturedParentSha256,sourceArtifactSha256:config.sourceMetadata.artifact_sha256,rehearsalFingerprint:fingerprint,retainedBindings:capture.bindings.length,newBindings:newBindings.length,finalBindings:checked.bindings.length,truthAuthorityOnlyV1:false,guardAddsPaidOwners:false,full:0};
}

/** Existing ordinary publisher Config only. ROOT must compare the complete
 * brick9 capture with a fresh UTC readback before normal/locked preflight;
 * this factory never queries, rewrites or silently refreshes that parent. */
export function masonryCeramic250CurrentCardConfigR4(context:{releaseId:string;searchReleaseId:string;sourceRoot?:string;outputRoot?:string}):Config{
 const own=(path:string)=>context.sourceRoot&&existsSync(join(context.sourceRoot,path))?join(context.sourceRoot,path):path;
 const capture=rawCapture as Capture,old=captured(),model=build(old),metadata=capture.definition.source_metadata;
 for(const input of source.inputs)assert.equal(sha(own(input.path)),input.sha256,input.path);
 assert.equal(capture.definition.id,source.parent.definitionId);assert.equal(capture.definition.definition_version,9);assert.equal(capture.definition.definition_sha256,source.parent.definitionSha256);
 assert.equal(masterRetainedParentCaptureSha256R1(capture),source.parent.capturedParentSha256);
 assert.equal(valueSha(metadata),source.parent.capturedSourceMetadataSha256);
 assert.equal(valueSha(metadata.retainedParentBindingContinuationV1.successor),source.parent.previousSuccessorSha256);
 const oldIds=new Set(old.resources.map(resource=>resource.row_id)),fresh=model.resources.filter(resource=>!oldIds.has(resource.row_id)),bound=fresh.map(resource=>resource.row_id);
 const added=model.parameters.filter(parameter=>!old.parameters.some(prior=>prior.parameter_id===parameter.parameter_id));
 const newParameterSources:Sources=Object.fromEntries(added.map(parameter=>[parameter.parameter_id,parameter.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM'?{kind:'UNRESOLVED',sourceIds:[]}:String(parameter.truth_metadata.value_source_role).includes('DERIVED')?{kind:'DERIVED',sourceIds:[]}:{kind:'KNOWN',sourceIds:[source.sourceId]}]));
 const runtime={...profile},shortInput={m33_masonry_wall_length_m:'4',m33_masonry_wall_height_m:'3',m33_masonry_openings_area_m2:'0',m33_masonry_nonmasonry_insert_volume_m3:'0',m33_masonry_storey_height_m:'3'};
 const map=model.passport.decision.independentCompletenessMap,unresolved=unresolvedResourceIds(model.passport.decision.unresolvedResourceRowIds??[]);
 const config:Config={contract:source.contract,stopCode:'MASONRY_CERAMIC250_CURRENT_CARD_R4',applicationName:'masonry-ceramic250-current-card-r4',expectedBranch:'codex/r4-a5-clean-08b18902',masterPath:'C:/Users/User/Downloads/GOX_BUILD_MASTER_TZ_2_14_2026-10-23.txt',masterSha256:'e24f52197dab5a1bb4bbca8d139b5b6a5c722efce6c758b3efffd6266f1d78ed',parentReleaseId:context.releaseId,parentSearchReleaseId:context.searchReleaseId,currentReleasePath:'data/estimate-benchmarks/r568-local-developer-canonical-release.json',outputRoot:context.outputRoot??'.release-runtime/r568/masonry-ceramic250-current-card-r4',sourcePaths:[packPath,...source.inputs.map(input=>input.path),'scripts/estimate/r4a13/prepareMasonryCeramic250CurrentCardR4.ts','src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts','src/lib/estimate/backendPlatform/parameterConstraints.ts','src/lib/estimate/backendPlatform/canonicalPrimaryMeasureSelectionV1.ts','src/lib/estimate/backendPlatform/canonicalPreliminaryParameterFormulaV1.ts','src/features/consumerRepair/consumerCanonicalBaselineCompile.ts','src/features/consumerRepair/consumerCanonicalParameterEditor.ts','scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1.ts','scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts'],catalogId:whole.catalogId,sourceId:source.sourceId,normId:'KG08-02-001-07_CERAMIC250_M50_OWN_WHOLE_REUSE',sourceMetadata:{source_title:'Кирпичная кладка с готовым раствором и рабочим комплектом',source_authority:'Exact saved KG2015 rate, complete saved brigade/panel/three-box source components, corrected effective quantity and actual shared operation reader',source_kind:'EXISTING_CURRENT_CARD_WHOLE_REUSE_WITH_SIMPLE_GEOMETRY_NOT_FULL_ACCEPTANCE',artifact_sha256:sha(own(packPath)),exact_locator:'Existing whole source map, exact brick9 and retained single owners; no foreign material rate transfer',use_restriction:'Only ceramic250/M50/storey<=4m. Source selection does not certify actual project/stock/handling/PPE. No validation baseline in customer runtime, no source questionnaire and no automatic country compliance claim.'},parameterDefinitions:model.parameters,formulaDefinitions:model.formulas,resourceDefinitions:model.resources,shortInput,acceptanceInput:{...runtime,...shortInput},runtimeProfileInput:runtime,runtimeProfileClassification:Object.fromEntries(Object.keys(runtime).map(id=>[id,'NORMATIVE'])) as Config['runtimeProfileClassification'],runtimeProfileSourceIds:Object.fromEntries(Object.keys(runtime).map(id=>[id,[source.sourceId]])),expectedParentShape:[114,83,87],benchmarkOrdinal:1,validationScenario:'CURRENT_BRICK_OWN_WHOLE_REUSE_FIVE_GEOMETRY_SOURCE_PROFILE_ONLY',passport:{canonicalRuName:'Кладка кирпичной стены',workKey:whole.catalogId.replace('canonical-work:base:',''),physicalResultRu:'Кирпичная стена250мм на готовомМ50 в точной области исходной нормы; существующие подработы и единственная оплата сохранены.',includedScopeRu:model.passport.included_scope_ru,excludedScopeRu:model.passport.excluded_scope_ru,independentCompletenessMap:map,unresolvedApplicableResourceRowIds:unresolved},applicability:{...model.definition.applicability,fullTechnicalAcceptance:false,newFullTechnologies:0},binding:{rowId:bound[0]!,additionalRowIds:bound.slice(1),applicability:{contract:source.contract,wholeReuse:true,actualObjectFactsNotConfirmedBySelection:true,fullTechnicalAcceptance:false},applicabilityByRowId:Object.fromEntries(bound.map(rowId=>[rowId,{contract:source.contract,rowId,fullTechnicalAcceptance:false}])),retainParentBindings:{capturedParent:capture,capturedParentSha256:source.parent.capturedParentSha256,newParameterSources,capturedSourcePreimage:{sourceKey:source.sourceId,expected:null},successorProvenanceAppendV1:{contract:'master-retained-binding-append/v1',capturedSourceMetadata:structuredClone(metadata),capturedSourceMetadataSha256:source.parent.capturedSourceMetadataSha256,capturedPreviousSuccessorSha256:source.parent.previousSuccessorSha256}}},locator:{key:source.locatorKey,payload:source},search:{primaryUom:'m3',canonicalNameRu:'Кладка кирпичной стены',aliases:['Кладка кирпичной стены'],shortScopeRu:'Точная кирпичная кладка250мм с целым прежним растворно-рабочим циклом; простая геометрия, техническое обеспечение отдельно.',keyDistinguishingParameters:geometryIds,clarificationFields:geometryIds,includedBoundaries:model.passport.included_scope_ru,excludedBoundaries:model.passport.excluded_scope_ru,extraSearchTermsRu:'кирпичная кладка готовый раствор подача подмости контроль уборка',sourceProvenance:{contract:source.contract,fullTechnicalAcceptance:false,sourceChoiceNotProjectConformity:true}},forbiddenAdjacentMatchers:[],owner:'ROOT_SINGLE_WRITER_MASONRY_FAMILY',receiptFileStem:'masonry_ceramic250_current_card_r4',verifyCore:async()=>{
  const retainedAdmission=masonryCeramic250RetainedRepresentativeCheckR4(config,context.sourceRoot);
  assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:model.formulas,resourceDefinitions:model.resources}),[]);
  assert.deepEqual(Object.keys(shortInput),[...geometryIds]);assert.equal(Object.keys(runtime).length,3);assert(!Object.hasOwn(runtime,'measured_net_brick_wall_area_m2'));
  const result=await compile(model,shortInput,{confirmedParameters:runtime});assert.equal(result.derivedParameters[primary],'3');assert(result.preliminaryNeeds.length>0);assert.equal(model.passport.decision.completeTechnicalEstimateAccepted,false);
  assert.equal(result.rows.find(row=>row.row_id==='masonry:wall:krer08-02-001-07:labour')?.quantity,'15.63');assert.equal(result.rows.find(row=>row.row_id==='masonry:wall:krer08-02-001-07:mortar')?.quantity,'0.702');
  assert.equal(result.rows.find(row=>row.row_id==='masonry:ceramic250:whole-family:r2:brick-hammer')?.quantity,'6');assert.equal(result.rows.find(row=>row.row_id==='masonry:ceramic250:whole-family:r2:trowel')?.quantity,'8');const historicalProtection=result.preliminaryNeeds.find(row=>row.row_id==='masonry:ceramic250:whole-family:r2:fall-protection');assert(historicalProtection);assert.equal(historicalProtection.quantity,'8');assert.equal(historicalProtection.need_state,'CONDITION_REQUIRED');assert(historicalProtection.missing_parameter_ids.length>0);assert.equal(historicalProtection.procurement_eligible,false);
  const scope=[...result.rows,...result.preliminaryNeeds].find(row=>row.row_id==='masonry:wall:krer08-02-001-07:need:source-system-fit');assert(scope);const trace=scope.calculation_trace;assert(record(trace));const graph=trace.resourceGraph;assert(record(graph));assert.equal(canonicalScopeRequirementDecisionV1(graph.scopeRequirementDecisionV1)?.status,'OBJECT_FACT_REQUIRED');assert.equal(result.parameters.m33_masonry_approved_masonry_design_reference??null,null);
  assert.deepEqual(model.formulas.slice(0,old.formulas.length),old.formulas);
  return{status:'PASS_CURRENT_BRICK_SIMPLE_GEOMETRY_WHOLE_REUSE_FRAGMENT_NOT_WHOLE_ACCEPTANCE',retainedAdmission,simpleInputs:5,customerTechnicalQuestions:0,newPaidOwners:0,newProcurementOwners:0,newFullTechnologies:0};
 }};
 return config;
}
