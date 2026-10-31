import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {roofSourceProfilePackR11 as pack,roofSourceProfileCaptureR11,roofSourceProfileEntryR11,
 buildRoofExistingSourceProfileR11,compileRoofExistingSourceProfileR11} from '../../../src/lib/estimate/v4/roofExistingSourceProfileR11';
import {masterRetainedParentCaptureSha256R1,masterRetainedLineageValueSha256V1 as valueSha,
 prepareMasterRetainedBindingRepresentativeR1,masterRetainedSourceProfileMetadataCompactR1,type MasterRetainParentBindingsR1,type MasterRetainedParentCaptureR1,type MasterExistingSourceConsumerReuseV1} from './masterSingleDefinitionRetainParentBindingsR1';
import type {MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';
import {buildRoofExistingMetalCutTakeoffAuthorityR11} from '../../../src/lib/estimate/v4/roofExistingMetalCutTakeoffAuthorityR11';
import {buildRoofExistingValleyWholeReuseR11} from '../../../src/lib/estimate/v4/roofExistingValleyWholeReuseR11';
import {buildRoofExistingScreed25WholeReuseR11} from '../../../src/lib/estimate/v4/roofExistingScreed25WholeReuseR11';
type Json=Record<string,any>;
const omit=(o:Json,keys:readonly string[])=>Object.fromEntries(Object.entries(o).filter(([k])=>!keys.includes(k)));

/** Exact existing whole-consumer declaration, using the same captured source
 * registry and source-backed profile. No new physical/registry row is created. */
function wholeConsumerReuseR11(captured:MasterRetainedParentCaptureR1,base:Json,next:Json,profileSelectorValue:string):MasterExistingSourceConsumerReuseV1{
 const changed=next.resources.filter((r:Json)=>valueSha(r.inclusion_ast)!==valueSha(captured.resources.find(old=>old.row_id===r.row_id)!.inclusion_ast));
 assert.equal(changed.length,16,'EXACT_SEVEN_PLUS_NINE_CURRENT_CONSUMERS_REQUIRED');
 const additions:Record<string,{kind:'and';operands:Record<string,unknown>[]}>=Object.create(null);
 const resources=Object.fromEntries(changed.map((r:Json)=>{
  const old=captured.resources.find(old=>old.row_id===r.row_id)!;
  assert.equal(valueSha(omit(r,['inclusion_ast'])),valueSha(omit(old,['inclusion_ast'])),'EXACT_RESOURCE_EXCEPT_INCLUSION_REQUIRED');
  assert.equal(r.inclusion_ast.kind,'or');assert.equal(r.inclusion_ast.operands.length,2);
  assert.equal(valueSha(r.inclusion_ast.operands[0]),valueSha(old.inclusion_ast));
  const addition=r.inclusion_ast.operands[1];assert.equal(addition.kind,'and');
  const digest=valueSha(addition);additions[digest]=structuredClone(addition);
  const bindings=captured.bindings.filter(b=>b.resource_spec_id===old.id);assert.equal(bindings.length,1);
  return[r.row_id,{capturedInclusionSha256:valueSha(old.inclusion_ast),afterInclusionSha256:valueSha(r.inclusion_ast),
   additionSha256:digest,existingBindingSha256:valueSha(bindings[0]),existingLocatorId:bindings[0]!.locator_id}];
 }));
 const locatorIds=[...new Set(Object.values(resources).map(r=>r.existingLocatorId))];assert.equal(locatorIds.length,2);
 const groups=Object.fromEntries(locatorIds.map(id=>{
  const locator=captured.normativeLocators.find(l=>l.id===id)!,source=captured.normativeSources.find(s=>s.id===locator.source_id)!;
  const bound=captured.bindings.filter(b=>b.locator_id===id).map(b=>captured.resources.find(r=>r.id===b.resource_spec_id)!.row_id).sort();
  assert.deepEqual(bound,changed.filter((r:Json)=>resources[r.row_id].existingLocatorId===id).map((r:Json)=>r.row_id).sort());
  return[id,{existingSourceId:source.id,capturedSourceSha256:valueSha(source),capturedLocatorSha256:valueSha(locator),capturedBoundRowIds:bound}];
 }));
 const params=next.parameters.filter((p:Json)=>valueSha(p.truth_metadata)!==valueSha(base.parameters.find((b:Json)=>b.parameter_id===p.parameter_id)!.truth_metadata));
 assert.equal(params.length,6,'EXACT_SIX_FINAL_TRUTH_CHANGES_REQUIRED');
 const truths=Object.fromEntries(params.map((p:Json)=>{
  const old=captured.parameters.find(q=>q.parameter_id===p.parameter_id)!;
  const kind=p.value_type==='decimal'?'EXISTING_MEASURED_GEOMETRY_VISIBILITY' as const:'EXISTING_DOCUMENT_AUTHORITY' as const;
  const from=old.truth_metadata.guide.guide_short_ru,to=p.truth_metadata.guide.guide_short_ru;
  return[p.parameter_id,{kind,capturedTruthMetadataSha256:valueSha(old.truth_metadata),afterTruthMetadataSha256:valueSha(p.truth_metadata),
   ...(from===to?{}:{guideShortCorrection:{capturedShortRu:from,afterShortRu:to}})}];
 }));
 return{contract:'master-retained-existing-source-consumer-reuse/v1',profileSelectorValue,additionsBySha256:additions,resourceChanges:resources,
  locatorGroups:groups,truthChanges:truths,resourceChangesSha256:valueSha(resources),additionsSha256:valueSha(additions),truthChangesSha256:valueSha(truths)};
}

/** Candidate for the existing sole publisher, using its explicit bounded
 * metadata-source-profile opt-in. Zero physical additions and no fixture
 * promotion. Shared mode review/intake and runtime proof remain ROOT-owned. */
export function prepareRoofExistingSourceProfileR11(context:Readonly<{
 releaseId:string;searchReleaseId:string;outputRoot:string;sourceRoot?:string;
}>,catalogId:string):MasterSingleDefinitionSuccessorConfig{
 const own=(p:string)=>context.sourceRoot?join(context.sourceRoot,p):p;
 assert.equal(createHash('sha256').update(readFileSync(own(pack.fixturePath))).digest('hex'),pack.fixtureSha256);
 assert.equal(createHash('sha256').update(readFileSync(pack.masterPath)).digest('hex'),pack.masterSha256);
 const captured=roofSourceProfileCaptureR11(catalogId) as MasterRetainedParentCaptureR1&{contentPassport:Json},entry=roofSourceProfileEntryR11(catalogId);
 // Metadata-only continuation retains every existing parameter contract.
 // The draft pack contract remains in the source/search provenance below.
 const parameterContract=captured.parameters[0]?.truth_metadata?.contract;
 assert.equal(typeof parameterContract,'string','CAPTURED_PARAMETER_CONTRACT_REQUIRED');
 assert(parameterContract.trim().length>0,'CAPTURED_PARAMETER_CONTRACT_REQUIRED');
 assert(captured.parameters.length>0&&captured.parameters.every(p=>p.truth_metadata?.contract===parameterContract),
  'CAPTURED_PARAMETER_CONTRACT_MUST_BE_SINGLE_AND_EXACT');
 const sourceProfile=buildRoofExistingSourceProfileR11(captured);
 const next=entry.kind==='flat_torch'?buildRoofExistingScreed25WholeReuseR11(buildRoofExistingValleyWholeReuseR11(sourceProfile))
  :entry.kind==='pitched_metal'?buildRoofExistingMetalCutTakeoffAuthorityR11(sourceProfile):sourceProfile;
 const existingReuse=entry.kind==='flat_torch'?wholeConsumerReuseR11(captured,sourceProfile,next,entry.selectorValue):undefined;
 const source=captured.normativeSources.find((s:Json)=>s.id===entry.registrySourceId)!;
 const locators=captured.normativeLocators.filter((l:Json)=>l.source_id===source.id);
 assert.equal(locators.length,1);const locator=locators[0],metadata=captured.definition.source_metadata;
 assert.equal(createHash('sha256').update(pack.registryLocatorExcerptText).digest('hex'),locator.excerpt_sha256);
 const changed=next.parameters.filter((p:Json)=>valueSha(p.truth_metadata)!==valueSha(captured.parameters.find((old:Json)=>old.parameter_id===p.parameter_id)!.truth_metadata));
 const changes=Object.fromEntries(changed.map((p:Json)=>{
  const old=captured.parameters.find((old:Json)=>old.parameter_id===p.parameter_id)!;
  return[p.parameter_id,{capturedTruthMetadata:structuredClone(old.truth_metadata),capturedTruthMetadataSha256:valueSha(old.truth_metadata),afterTruthMetadataSha256:valueSha(p.truth_metadata)}];
 }));
 // Old project-context authority changes stay in the unchanged R8 map. The
 // source selector and application metadata have their own bounded declaration.
 const selectorChange=changes[pack.selectorId];assert(selectorChange,'EXACT_SELECTOR_CHANGE_REQUIRED');
 delete changes[pack.selectorId];
 // ROOT reviews a separate narrow admission for these existing measured-geometry roles.
 // They are not misdeclared as R8 technical-context authority changes.
 for(const id of Object.keys(entry.geometryRoleChanges??{}))delete changes[id];
 for(const id of Object.keys(entry.initialFormVisibilityChanges??{}))delete changes[id];
 for(const id of Object.keys(existingReuse?.truthChanges??{}))delete changes[id];
 // One declaration per existing parameter, with its FULL final truth object.
 // In particular the primary combines OBJECT_FACT and literal-true visibility.
 const presentationIds=[...new Set([...Object.keys(entry.geometryRoleChanges??{}),
  ...Object.keys(entry.initialFormVisibilityChanges??{})])].filter(id=>!Object.hasOwn(existingReuse?.truthChanges??{},id)).sort();
 assert(presentationIds.every(id=>id!==pack.selectorId&&!Object.hasOwn(changes,id)),
  'INPUT_PRESENTATION_AUTHORITY_AND_SELECTOR_MAPS_MUST_BE_DISJOINT');
 const inputPresentationChanges=Object.fromEntries(presentationIds.map(id=>{
  const old=captured.parameters.find(p=>p.parameter_id===id),after=next.parameters.find((p:Json)=>p.parameter_id===id);
  assert(old&&after,'EXACT_INPUT_PRESENTATION_PARAMETER_REQUIRED');
  assert.notEqual(valueSha(old.truth_metadata),valueSha(after.truth_metadata),'INPUT_PRESENTATION_CHANGE_REQUIRED');
  return[id,{capturedTruthMetadata:structuredClone(old.truth_metadata),capturedTruthMetadataSha256:valueSha(old.truth_metadata),
   afterTruthMetadataSha256:valueSha(after.truth_metadata)}];
 }));
 const legacySelector=captured.parameters.find(p=>p.parameter_id===pack.selectorId)!;
 assert(Array.isArray(legacySelector.constraints_json?.values)&&legacySelector.constraints_json.values.length>0,
  'EXACT_CAPTURED_LEGACY_SELECTOR_DOMAIN_REQUIRED');
 const legacySelectorValue=legacySelector.constraints_json.values[0];
 const authority={contract:'master-retained-truth-authority-only/v1' as const,capturedContentPassport:captured.contentPassport,
  capturedContentPassportSha256:entry.capturedContentPassportSha256,changes,changesSha256:valueSha(changes),
  sourceProfileMetadataOnlyV1:{contract:'master-retained-source-profile-metadata-only/v1' as const,
   capturedApplicabilitySha256:valueSha(captured.definition.applicability),
   sourceProfileSelectionMetadata:next.definition.applicability.sourceProfileSelectionV1,
   sourceProfileSelectionMetadataSha256:valueSha(next.definition.applicability.sourceProfileSelectionV1),selectorChange,
   ...(existingReuse?{existingSourceConsumerReuseV1:existingReuse}:{}),
   inputPresentationOnlyV1:{contract:'master-retained-source-profile-input-presentation-only/v1' as const,
    legacySelectorValue,changes:inputPresentationChanges,changesSha256:valueSha(inputPresentationChanges)}}};
 const retained:MasterRetainParentBindingsR1={capturedParent:captured,capturedParentSha256:masterRetainedParentCaptureSha256R1(captured),newParameterSources:{},
  truthAuthorityOnlyV1:authority,successorProvenanceAppendV1:{contract:'master-retained-binding-append/v1' as const,
   capturedSourceMetadata:structuredClone(metadata),capturedSourceMetadataSha256:valueSha(metadata),
   capturedPreviousSuccessorSha256:valueSha(metadata.retainedParentBindingSuccessorV1)}};
 const proofRow=captured.resources.find((r:Json)=>captured.bindings.some((b:Json)=>b.resource_spec_id===r.id&&b.locator_id===locator.id))!;
 const primary=pack.primaryMeasureId,sourceMetadata={source_title:source.title_ru,source_authority:source.authority,source_kind:source.metadata.sourceKind,
  official_url:source.official_url,artifact_sha256:source.artifact_sha256,exact_locator:pack.registryLocatorExcerptText,use_restriction:source.metadata.useRestriction};
 const config:MasterSingleDefinitionSuccessorConfig={contract:parameterContract,stopCode:'ROOF_EXISTING_SOURCE_PROFILE_R11_'+entry.kind.toUpperCase(),applicationName:'roof-existing-source-profile-r11',
  expectedBranch:'codex/r4-a5-clean-08b18902',masterPath:pack.masterPath,masterSha256:pack.masterSha256,
  parentReleaseId:context.releaseId,parentSearchReleaseId:context.searchReleaseId,currentReleasePath:'data/estimate-benchmarks/r568-local-developer-canonical-release.json',outputRoot:context.outputRoot,
  sourcePaths:[...(entry.kind==='pitched_metal'?['src/lib/estimate/v4/roofExistingMetalCutTakeoffAuthorityR11.ts']:[]),
   ...(entry.kind==='flat_torch'?['src/lib/estimate/v4/roofExistingValleyWholeReuseR11.ts','src/lib/estimate/v4/roofExistingScreed25WholeReuseR11.ts']:[]),
   'src/lib/estimate/v4/roofExistingSourceProfileR11.ts','scripts/estimate/r4a13/prepareRoofExistingSourceProfileR11.ts',pack.fixturePath,
   'data/estimate-benchmarks/source-packs/roof-existing-source-profile-r11.json','src/lib/estimate/backendPlatform/canonicalEstimateProfileInputResolverS2723.ts',
   'src/lib/estimate/backendPlatform/canonicalSourceProfileSelectionV1.ts',
   'src/lib/estimate/backendPlatform/canonicalPrimaryMeasureSelectionV1.ts','src/lib/estimate/backendPlatform/canonicalEstimateApprovedBaseline.ts',
   'src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts','src/lib/estimate/backendPlatform/parameterConstraints.ts',
   'scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1.ts','scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts'],
  catalogId,sourceId:source.source_key,normId:metadata.retainedParentBindingSuccessorV1.normId,sourceMetadata,
  parameterDefinitions:next.parameters,formulaDefinitions:next.formulas,resourceDefinitions:next.resources,
  shortInput:{[primary]:'100'},acceptanceInput:captured.baseline.input_values,
  runtimeProfileInput:{},runtimeProfileClassification:{},runtimeProfileSourceIds:{},expectedParentShape:entry.expectedShape as[number,number,number],
  benchmarkOrdinal:0,validationScenario:'EXISTING_ROOF_SOURCE_PROFILE_GEOMETRY_ONLY_ZERO_FIXTURE_PROMOTION_NOT_PROJECT_APPROVAL',
  passport:{canonicalRuName:captured.definition.passport.canonicalRuName,workKey:captured.definition.passport.workKey,
   physicalResultRu:captured.contentPassport.physical_result_ru,includedScopeRu:captured.contentPassport.included_scope_ru,
   excludedScopeRu:captured.contentPassport.excluded_scope_ru,independentCompletenessMap:captured.contentPassport.decision.independentCompletenessMap,
   unresolvedApplicableResourceRowIds:captured.contentPassport.decision.unresolvedResourceRowIds},
  applicability:next.definition.applicability,binding:{rowId:proofRow.row_id,applicability:{metadataSourceProfileOnly:true,physicalQuantitiesChanged:false},
   retainParentBindings:retained,
   reuseExistingNormativeRegistry:{contract:'master-existing-normative-registry-reuse/r1',locatorExcerptHashKind:'SOURCE_LOCATOR_TEXT_SHA256',source,locators}},
  locator:{key:locator.locator_key,payload:locator.locator},search:{primaryUom:'m2',canonicalNameRu:captured.definition.passport.canonicalRuName,
   aliases:[captured.definition.passport.canonicalRuName],shortScopeRu:entry.selectorValue,keyDistinguishingParameters:[primary],clarificationFields:[primary],
   includedBoundaries:[entry.selectorValue],excludedBoundaries:captured.contentPassport.excluded_scope_ru,extraSearchTermsRu:'кровля измеренная площадь исходная норма',
   sourceProvenance:{contract:pack.contract,selectedSourceKey:entry.sourceKey,allOldNormsAndOwnersRetained:true,newWholeRows:0,baselinePromotions:0,newFullTechnologies:0,
    pendingExactGeometryRoleNormalization:entry.geometryRoleChanges,pendingInitialFormVisibility:entry.initialFormVisibilityChanges}},
  forbiddenAdjacentMatchers:[],owner:'ROOT_SINGLE_INTEGRATOR',receiptFileStem:'roof_existing_source_profile_r11',
  verifyCore:async()=>{
   // A rejected ordinary publisher guard never turns into a truthy BLOCKED
   // report that the publisher could mistake for successful verification.
   validateRoofExistingSourcePublisherR11(config);
   for(const area of ['100','250']){
    const result=await compileRoofExistingSourceProfileR11(next,{[primary]:area});
    assert.equal(String(result.parameters[primary]),area);assert.equal(result.parameters[pack.selectorId],entry.selectorValue);
    assert(result.preliminaryNeeds.length>0,'Actual site/project/source needs must remain visible');
   }
   return{status:'PASS_ORDINARY_SOURCE_PROFILE_CURRENT_ROWS_RETAINED',newParameters:0,newRows:0,newBindings:0,baselinePromotions:0,
    geometryInputs:1,sourceProfileIsNotProjectApproval:true,fullTechnicalAcceptance:false};
  }};
 return config;
}

export function validateRoofExistingSourcePublisherR11(config:MasterSingleDefinitionSuccessorConfig){
 const retained=config.binding.retainParentBindings as unknown as Json,capture=retained.capturedParent,source=config.binding.reuseExistingNormativeRegistry!.source;
 const mode=retained.truthAuthorityOnlyV1;
 return prepareMasterRetainedBindingRepresentativeR1({config,newSource:omit(source,['created_at']),newLocators:config.binding.reuseExistingNormativeRegistry!.locators},{
  parameters:config.parameterDefinitions,formulas:config.formulaDefinitions,resources:config.resourceDefinitions,newBindings:[],
  successorProvenance:{contract:config.contract,sourceId:config.sourceId,normId:config.normId,parentDefinitionId:capture.definition.id,
   parentBaselineId:capture.baseline.id,capturedParentSha256:retained.capturedParentSha256,
   truthAuthorityOnlyV1:{contract:mode.contract,changesSha256:mode.changesSha256,parameterIds:Object.keys(mode.changes).sort(),
    sourceProfileMetadataOnlyV1:masterRetainedSourceProfileMetadataCompactR1(mode)}}});
}
