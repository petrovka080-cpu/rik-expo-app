import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {roofBitumenShingleCurrentCaptureR14,buildRoofBitumenShingleExistingR14,
 compileRoofBitumenShingleExistingR14} from '../../../src/lib/estimate/v4/roofBitumenShingleExistingCurrentR14';
import {stringifyCanonicalEstimateJson} from '../../../src/lib/estimate/estimateDeterministicHash';
import {masterRetainedParentCaptureSha256R1,masterRetainedLineageValueSha256V1 as hash,prepareMasterRetainedBindingRepresentativeR1,
 type MasterRetainedParentCaptureR1,type MasterRetainParentBindingsR1} from './masterSingleDefinitionRetainParentBindingsR1';
import type {MasterSingleDefinitionSuccessorConfig,MasterExistingNormativeRegistryReuseR1} from './prepareMasterSingleDefinitionSuccessorR1';

type Json=Record<string,unknown>;
type AuthorityChange=Readonly<{capturedTruthMetadata:Json;capturedTruthMetadataSha256:string;afterTruthMetadataSha256:string}>;
// Existing bounded R8 opt-in wire, without changing its shared guard. Only
// three old project-gate declarations change; no geometry, norm or default does.
type ExistingAuthorityMode=Readonly<{contract:'master-retained-truth-authority-only/v1';capturedContentPassport:Json;
 capturedContentPassportSha256:string;changes:Record<string,AuthorityChange>;changesSha256:string}>;
type RetainedAuthority=MasterRetainParentBindingsR1&{truthAuthorityOnlyV1:ExistingAuthorityMode};
const pack=require('../../../data/estimate-benchmarks/source-packs/roof-bitumen-shingle-existing-current-r14.json') as {
 contract:string;fixturePath:string;fixtureSha256:string;ordinaryGeometryIds:string[];normId:string;wholePrefix:string;technicalGateIds:string[];protectedMortarRowId:string};
const locatorExcerptHash=(v:unknown)=>createHash('sha256').update(stringifyCanonicalEstimateJson(v)).digest('hex');
const object=(v:unknown):Json=>{assert(v!==null&&typeof v==='object'&&!Array.isArray(v));return v as Json;};
const text=(v:unknown):string=>{assert.equal(typeof v,'string');assert(String(v).trim());return String(v);};
const strings=(v:unknown):string[]=>{assert(Array.isArray(v)&&v.every(x=>typeof x==='string'));return v;};
const omitCreated=(v:Readonly<Json>)=>Object.fromEntries(Object.entries(v).filter(([k])=>k!=='created_at'));

/** Ordinary sole-publisher Config for the exact current shingle parent. All129
 * physical rows, formulas, sources, bindings, prices and owners stay unchanged.
 * It remains deliberately HELD until ROOT admits this exact three-project-gate
 * declaration in the existing publisher. verifyCore throws its actual guard;
 * neither a BLOCKED success, fake binding nor fake prior successor is returned. */
export function prepareRoofBitumenShingleExistingCurrentR14(context:Readonly<{
 releaseId:string;searchReleaseId:string;outputRoot:string;sourceRoot?:string;
}>):MasterSingleDefinitionSuccessorConfig{
 const own=(path:string)=>context.sourceRoot?join(context.sourceRoot,path):path;
 assert.equal(createHash('sha256').update(readFileSync(own(pack.fixturePath))).digest('hex'),pack.fixtureSha256);
 const current=roofBitumenShingleCurrentCaptureR14(),next=buildRoofBitumenShingleExistingR14(current),
  capture=current as unknown as MasterRetainedParentCaptureR1;
 const metadata=object(current.definition.source_metadata),passport=object(current.definition.passport),decision=object(current.contentPassport.decision);
 assert.equal(Object.hasOwn(metadata,'retainedParentBindingSuccessorV1'),false,
  'The actual old source envelope has no previous successor: never fabricate append evidence');
 const canonicalName=text(passport.canonicalRuName??passport.titleRu);
 const workKey=text(passport.workKey??current.definition.catalog_id.split(':').at(-1));
 // This successor preserves the existing parameter declarations. Keep their
 // published contract; the linked candidate remains identified in provenance.
 const publicationContract=text(current.parameters[0]?.truth_metadata.contract);
 assert(current.parameters.every(p=>p.truth_metadata.contract===publicationContract),'EXACT_UNIFORM_CAPTURED_PARAMETER_CONTRACT');
 const source=current.normativeSources.find(s=>s.source_key==='rik-expo-app.s27-63.bitumen-tile-soft-roof-six.v1:roof');assert(source);
 assert.equal(source.artifact_sha256,'114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8');
 assert.equal(createHash('sha256').update(readFileSync('.release-runtime/r568/s27-35/g6-roof-source-audit/krer12.pdf')).digest('hex'),source.artifact_sha256);
 const locators=current.normativeLocators.filter(l=>l.source_id===source.id);assert.equal(locators.length,1);const locator=locators[0];
 assert.equal(locatorExcerptHash(locator.locator),locator.excerpt_sha256,'Preserve original S2763 canonical-JSON excerpt policy');
 const proofBinding=current.bindings.find(b=>b.locator_id===locator.id);assert(proofBinding);
 const proofRow=current.resources.find(r=>r.id===proofBinding.resource_spec_id);assert(proofRow);
 const changed=next.parameters.filter(p=>hash(p.truth_metadata)!==hash(current.parameters.find(x=>x.parameter_id===p.parameter_id)!.truth_metadata));
 assert.equal(changed.length,3);
 const changes=Object.fromEntries(changed.map(p=>{const before=current.parameters.find(x=>x.parameter_id===p.parameter_id)!;
  return[p.parameter_id,{capturedTruthMetadata:structuredClone(before.truth_metadata),capturedTruthMetadataSha256:hash(before.truth_metadata),afterTruthMetadataSha256:hash(p.truth_metadata)}];}));
 const retained:RetainedAuthority={capturedParent:capture,capturedParentSha256:masterRetainedParentCaptureSha256R1(capture),newParameterSources:{},
  truthAuthorityOnlyV1:{contract:'master-retained-truth-authority-only/v1',capturedContentPassport:current.contentPassport,
   capturedContentPassportSha256:hash(current.contentPassport),changes,changesSha256:hash(changes)}};
 const reuse:MasterExistingNormativeRegistryReuseR1={contract:'master-existing-normative-registry-reuse/r1',
  locatorExcerptHashKind:'CANONICAL_ESTIMATE_LOCATOR_JSON_SHA256_R1',source,locators};
 const sourceMeta=object(source.metadata),sourceFacts=object(object(locator.locator).facts);
 const config:MasterSingleDefinitionSuccessorConfig={contract:publicationContract,stopCode:'ROOF_BITUMEN_SHINGLE_EXISTING_CURRENT_R14',applicationName:'roof-bitumen-shingle-existing-current-r14',
  expectedBranch:'codex/r4-a5-clean-08b18902',masterPath:'C:/Users/User/Downloads/GOX_BUILD_MASTER_TZ_2_14_2026-10-23.txt',
  masterSha256:'e24f52197dab5a1bb4bbca8d139b5b6a5c722efce6c758b3efffd6266f1d78ed',parentReleaseId:context.releaseId,parentSearchReleaseId:context.searchReleaseId,
  currentReleasePath:'data/estimate-benchmarks/r568-local-developer-canonical-release.json',outputRoot:context.outputRoot,catalogId:current.definition.catalog_id,
  sourceId:text(source.source_key),normId:pack.normId,sourceMetadata:{source_title:text(source.title_ru),source_authority:text(source.authority),
   source_kind:text(sourceMeta.sourceRole),official_url:text(source.official_url),artifact_sha256:text(source.artifact_sha256),
   exact_locator:text(sourceFacts.locators),use_restriction:text(object(locator.locator).scopeRu)},
  parameterDefinitions:next.parameters,formulaDefinitions:next.formulas,resourceDefinitions:next.resources,expectedParentShape:[63,129,129],
  shortInput:{q:'100'},
  acceptanceInput:object(current.baseline.input_values),runtimeProfileInput:{},runtimeProfileClassification:{},runtimeProfileSourceIds:{},benchmarkOrdinal:0,
  validationScenario:'EXISTING_SHINGLE_ACTUAL_AREA_NO_READY_SHEATHING_OR_MORTAR_ASSUMPTION',
  sourcePaths:['src/lib/estimate/v4/roofBitumenShingleExistingCurrentR14.ts','scripts/estimate/r4a13/prepareRoofBitumenShingleExistingCurrentR14.ts',pack.fixturePath,
   'data/estimate-benchmarks/source-packs/roof-bitumen-shingle-existing-current-r14.json','scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1.ts',
   'scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts','src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts',
   'src/lib/estimate/backendPlatform/canonicalEstimateApprovedBaseline.ts','src/lib/estimate/backendPlatform/canonicalEstimateParameterSemantics.ts',
   'src/lib/estimate/backendPlatform/parameterConstraints.ts','src/features/consumerRepair/consumerCanonicalBaselineCompile.ts',
   'src/features/consumerRepair/consumerCanonicalParameterEditor.ts','.release-runtime/r568/s27-35/g6-roof-source-audit/krer12.pdf'],
  passport:{canonicalRuName:canonicalName,workKey,physicalResultRu:text(current.contentPassport.physical_result_ru),
   includedScopeRu:strings(current.contentPassport.included_scope_ru),excludedScopeRu:strings(current.contentPassport.excluded_scope_ru),
   independentCompletenessMap:decision.independentCompletenessMap as MasterSingleDefinitionSuccessorConfig['passport']['independentCompletenessMap'],
   unresolvedApplicableResourceRowIds:strings(decision.unresolvedResourceRowIds)},applicability:next.definition.applicability,
  binding:{rowId:proofRow.row_id,applicability:{metadataAuthorityOnly:true,physicalQuantitiesChanged:false},retainParentBindings:retained,reuseExistingNormativeRegistry:reuse},
  locator:{key:text(locator.locator_key),payload:object(locator.locator)},
  search:{primaryUom:'m2',canonicalNameRu:canonicalName,aliases:[canonicalName],
   shortScopeRu:'Существующий нормативный состав гибкой черепицы по площади; готовность основания и недостающий расход раствора отдельно',
   keyDistinguishingParameters:[...pack.ordinaryGeometryIds],clarificationFields:[...pack.ordinaryGeometryIds],
   includedBoundaries:strings(current.contentPassport.included_scope_ru),excludedBoundaries:strings(current.contentPassport.excluded_scope_ru),
   extraSearchTermsRu:'гибкая черепица кровля площадь скатов',sourceProvenance:{contract:pack.contract,currentParentId:current.definition.id,
    newRows:0,newBindings:0,newSources:0,fixturePromotions:0,automaticSystemApproval:false,physicalQuantitiesChanged:false,
    pendingExactProjectGateTruthIds:Object.keys(changes).sort(),declaredTruthChangesSha256:hash(changes)}},
  forbiddenAdjacentMatchers:[],owner:'ROOT_SINGLE_INTEGRATOR',receiptFileStem:'roof_bitumen_shingle_existing_current_r14',
  verifyCore:async()=>{
   validateRoofBitumenShingleExistingPublisherR14(config); // Real guard first. No success-shaped BLOCKED object.
   const result=await compileRoofBitumenShingleExistingR14(next,config.shortInput);
   const rows=[...result.rows,...result.preliminaryNeeds];
   assert.equal(rows.find(r=>r.row_id===pack.wholePrefix+':workers')?.quantity,'63.5');
   assert(rows.find(r=>r.row_id===pack.protectedMortarRowId)?.quantity==null);
   for(const id of pack.technicalGateIds)assert(result.parameters[id]==null);
   assert(result.preliminaryNeeds.length>0);
   return{status:'PASS_EXISTING_SHINGLE_AREA_ONLY_NO_FIRST_PROFILE',newRows:0,newBindings:0,newSources:0,fixturePromotions:0,automaticSystemApproval:false,mortarQuantity:null,fullAcceptance:false};
  }};
 return config;
}

export function validateRoofBitumenShingleExistingPublisherR14(config:MasterSingleDefinitionSuccessorConfig){
 const retained=config.binding.retainParentBindings as RetainedAuthority,source=config.binding.reuseExistingNormativeRegistry!.source;
 const capture=retained.capturedParent,authority=retained.truthAuthorityOnlyV1;
 return prepareMasterRetainedBindingRepresentativeR1({config,newSource:omitCreated(source),newLocators:config.binding.reuseExistingNormativeRegistry!.locators},{
  parameters:config.parameterDefinitions,formulas:config.formulaDefinitions,resources:config.resourceDefinitions,newBindings:[],
  successorProvenance:{contract:config.contract,sourceId:config.sourceId,normId:config.normId,parentDefinitionId:capture.definition.id,
   parentBaselineId:capture.baseline.id,capturedParentSha256:retained.capturedParentSha256,
   truthAuthorityOnlyV1:{contract:authority.contract,changesSha256:authority.changesSha256,parameterIds:Object.keys(authority.changes).sort()}}});
}
