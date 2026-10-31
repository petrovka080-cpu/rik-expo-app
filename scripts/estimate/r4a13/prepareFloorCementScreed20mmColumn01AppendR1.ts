// Pure configuration for the existing sole publisher. No PG/CLI or writer on import.
import{strict as assert}from'node:assert';
import{createHash}from'node:crypto';
import{readFileSync}from'node:fs';
import{resolve}from'node:path';
import type{MasterSingleDefinitionSuccessorConfig}from'./prepareMasterSingleDefinitionSuccessorR1';
import type{MasterCapturedScopedNormativeRegistryR1,MasterScopedNormativeRegistryInputR1}from'./masterScopedNormativeRegistryPreimageR1';
import{floorCementScreed20mmPackR1 as pack,floorCementScreed20mmDefinitionR1 as factory,
 floorCementScreed20mmCompletenessMapR1 as completeness,floorCementScreed20mmScenarioFactsR1 as facts,
 floorCementScreed20mmNeedParameterIdsR1 as needIds}from'../../../src/lib/estimate/v4/floorCementScreed20mmKrer11Column01R1';
import{estimateDeterministicHash}from'../../../src/lib/estimate/estimateDeterministicHash';
import{compileCanonicalEstimateCore}from'../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
type Json=Record<string,any>;
export type Screed01101PinR1=Readonly<{path:string;sha256:string}>;
export type Screed01101GovernedEvidenceR1=Readonly<{
 rootDecision:Screed01101PinR1;currentIntake:Screed01101PinR1;currentReadGuard:Screed01101PinR1;
 semanticReview:Screed01101PinR1;current45Headers:Screed01101PinR1;threeBodies:Screed01101PinR1;
 targeted41Acceptance:Screed01101PinR1;fullTypeAcceptance:Screed01101PinR1;scopedRegistryCapture?:Screed01101PinR1;
}>;
export const screed01101AppendIdentityR1={...pack.proposedIdentity,sourceIdentity:'master-work:'+pack.proposedIdentity.workKey,
 locatorKey:'krer11-01-011-01-cement-screed20mm-exact'}as const;
export const screed01101ParentPairR1={definitionReleaseId:'15673048-71a2-514b-8e36-ca356e86401f',searchReleaseId:'3e982465-576e-5f93-92af-d3c829cf1619'}as const;
const sha=(v:string|Buffer)=>createHash('sha256').update(v).digest('hex');
const packPath='data/estimate-benchmarks/source-packs/floor-cement-screed20mm-krer11-011-01-r1.json';
const factoryPath='src/lib/estimate/v4/floorCementScreed20mmKrer11Column01R1.ts';
const selfPath='scripts/estimate/r4a13/prepareFloorCementScreed20mmColumn01AppendR1.ts';
function load(p:Screed01101PinR1):Json{
 assert(p&&typeof p.path==='string'&&p.path.endsWith('.json')&&!p.path.replaceAll('\\','/').split('/').includes('..')&&/^[a-f0-9]{64}$/u.test(p.sha256),'SCREED01101_EXACT_JSON_PIN_REQUIRED');
 const bytes=readFileSync(resolve(p.path));assert.equal(sha(bytes),p.sha256,'SCREED01101_EVIDENCE_CHANGED:'+p.path);return JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/u,''));
}
export function assertScreed01101CurrentBaseR1(read:Json,guard:Json,review:Json):Json{
 assert.equal(read.status,'PASS_READ_ONLY_CURRENT_CEMENT_SCREED_INTAKE_R83');assert.equal(read.databaseWrites,false);assert.equal(read.completeReadSet,true);
 assert.equal(read.error,null);assert.equal(read.allTransactionsRolledBack,true);assert.equal(read.allConnectionsClosed,true);assert.equal(read.publicationAdmitted,false);
 assert.equal(guard.status,'PASS_BOUNDED_READ_ONLY_CURRENT_CEMENT_SCREED_INTAKE_R83');assert.equal(guard.error,null);
 assert.equal(guard.noOwnedProcessStillRunning,true);assert.deepEqual(guard.cleanupErrors,[]);assert.deepEqual(guard.remainingOwnedProcesses,[]);
 assert.equal(review.status,'VERIFIED_CURRENT_BOUNDED_THREE_BODY_SEMANTIC_COMPARISON_NOT_SAME_STANDALONE_01101');assert.equal(review.comparisons.length,3);
 const bases=read.rows.filter((r:Json)=>r.kind==='base');assert.equal(bases.length,1);const b=bases[0].payload;
 assert.equal(b.parent.id,screed01101ParentPairR1.definitionReleaseId);assert.equal(b.parent.status,'prepared');assert.equal(b.parent.activated_at,null);
 assert.equal(b.parentSearch.id,screed01101ParentPairR1.searchReleaseId);assert.equal(b.parentSearch.definition_release_id,b.parent.id);assert.equal(b.parentSearch.status,'draft');
 assert.equal(b.parentSearch.activated_at,null);assert.equal(b.counts.activeCompileJobs,0);
 assert.equal(b.session.db,'rik_r4_runtime_b5_v2');assert.equal(b.session.host,'127.0.0.1');assert.equal(b.session.port,55432);assert.equal(b.session.readOnly,'on');assert.equal(b.session.isolation,'repeatable read');
 assert.deepEqual(Object.keys(b.collisionCounts).sort(),['definitions','exactLocators','groups','identities','membership','ordinal','search','sourceKeys']);
 assert(Object.values(b.collisionCounts).every(v=>v===0),'SCREED01101_CURRENT_COLLISION_REQUIRES_OTHER_ROUTE');
 const i=screed01101AppendIdentityR1;
 assert.deepEqual(b.proposed,{catalog_id:i.catalogId,work_key:i.workKey,source_identity:i.sourceIdentity,group_id:i.groupId,
  source_key:pack.sourceId,locator_key:i.locatorKey,norm_id:pack.normId,artifact_sha256:pack.source.sha256});
 for(const old of review.comparisons){const r=read.rows.find((r:Json)=>r.kind==='comparison'&&r.key===old.catalogId)?.payload;
  assert(r&&r.unchanged===true,'SCREED01101_PREVIOUS_BODY_NOT_PRESERVED');assert.equal(r.actual_definition_id,old.definitionId);assert.equal(r.actual_definition_hash,old.definitionHash);}
 return b;
}
export function prepareFloorCementScreed20mmColumn01AppendR1(e:Screed01101GovernedEvidenceR1):MasterSingleDefinitionSuccessorConfig{
 const decision=load(e.rootDecision);assert.equal(decision.status,'ROOT_REVIEWED_CEMENT_SCREED01101_PARTIAL_APPEND','SCREED01101_ROOT_REVIEW_REQUIRED');
 const review=load(e.semanticReview),base=assertScreed01101CurrentBaseR1(load(e.currentIntake),load(e.currentReadGuard),review);
 const headers=load(e.current45Headers),bodies=load(e.threeBodies),tested=load(e.targeted41Acceptance),types=load(e.fullTypeAcceptance);
 assert.equal(e.semanticReview.sha256,'84fad0f80c9b9c921d9bffd8da3403968ccb71bcc58672dde93f0accbcda812d');
 assert.equal(e.current45Headers.sha256,'26b3c58879c50db53b96a7a683442e950b99c3abff12be38b0766bbf4dd6b452');assert(headers.completeReadSet);
 assert.equal(e.threeBodies.sha256,'36e7b5e6d9e1fc680344efe323cb73d0624a5c75e3e9e3b9fe2db92f33f8e02b');assert(bodies.completeReadSet&&bodies.selectedIds.length===3);
 assert.equal(tested.status,'PASS_ROOT_CANONICAL_MERGED_THREE_SUITES_100_TESTS_R75');assert.equal(tested.suiteCounts['floorCementScreed20mmKrer11Column01R1.test.ts'],41);
 assert.equal(types.status,'PASS_ROOT_R75_CI_EXACT_SOURCE_FULL_TYPESCRIPT_PROGRAM');assert.equal(types.diagnostics,0);assert.equal(types.harnessErrors,0);assert.equal(types.actualProgramFiles,2787);
 assert.equal(decision.currentIntakeSha256,e.currentIntake.sha256);assert.equal(decision.semanticReviewSha256,e.semanticReview.sha256);assert.deepEqual(decision.pair,screed01101ParentPairR1);
 assert.deepEqual(decision.identity,screed01101AppendIdentityR1);assert.equal(decision.boundedSemanticComparison,'45_FLOOR_HEADERS_THREE_DEMOLITION_PREPARATION_BODIES_DISTINCT_FROM_EXACT01101');
 assert.equal(decision.quantityScope,'PARTIAL');assert.equal(decision.fullTechnicalAcceptance,false);assert.equal(decision.machineAndOperatorFinancialAdmission,false);
 assert.equal(decision.acceptedNewCompleteTypes,0);assert.equal(decision.globalPhysicalAbsenceClaimed,false);assert.equal(decision.preserveExistingAdjacentDefinitions,true);
 const capture=e.scopedRegistryCapture?load(e.scopedRegistryCapture)as MasterCapturedScopedNormativeRegistryR1:null;
 if(capture){assert.equal(capture.contract,'master-scoped-normative-registry-preimage/r1');assert.equal(capture.scope.artifactSha256,pack.source.sha256);
  assert.equal(capture.scope.sourceKey,pack.sourceId);assert.equal(capture.scope.normId,pack.normId);assert.deepEqual(capture.scope.generatedLocatorKeys,[screed01101AppendIdentityR1.locatorKey]);
  assert.equal(decision.scopedRegistryCaptureSha256,e.scopedRegistryCapture!.sha256,'SCREED01101_ROOT_DID_NOT_REVIEW_ACTUAL_CAPTURE');}
 const scope={contractVersion:'floor-cement-screed01101-root-scope/r1',parentPair:screed01101ParentPairR1,rootDecisionSha256:e.rootDecision.sha256,
  currentIntakeSha256:e.currentIntake.sha256,semanticReviewSha256:e.semanticReview.sha256,sourceArtifactSha256:pack.source.sha256,
  quantityScope:'PARTIAL',fullTechnicalAcceptance:false,machineAndOperatorFinancialAdmission:false,acceptedNewCompleteTypes:0,existingAdjacentDefinitionsDisposition:'KEEP_CURRENT_IMMUTABLE'};
 const original=factory(),resources:Array<(typeof original.resources)[number]>=original.resources.map(r=>{const{row_sha256:_old,...body}=r;
  const{sourceAdmissionPending:_a,identityAdmissionPending:_i,publicationAllowed:_p,...metadata}=r.source_metadata??{};
  const changed={...body,source_metadata:{...metadata,rootScopeProvenanceR1:scope,full_technical_acceptance:false}};return{...changed,row_sha256:estimateDeterministicHash(changed)};});
 const d={...original,resources},bound=resources.filter(r=>r.source_metadata?.sourceNormQuantityAccepted===true).map(r=>r.row_id),open=resources.filter(r=>r.source_metadata?.sourceRole==='UNRESOLVED_APPLICATION_NORM').map(r=>r.row_id);
 assert.deepEqual([d.parameters.length,d.formulas.length,d.resources.length,bound.length,open.length],[21,36,36,9,5]);
 const explicit=Object.fromEntries(d.parameters.map(p=>[p.parameter_id,needIds.includes(p.parameter_id)?{kind:'UNRESOLVED' as const,sourceIds:[]}:
  p.truth_metadata.value_source_role==='COMPILER_DERIVED_RESOURCE_QUANTITY'?{kind:'DERIVED' as const,sourceIds:[]}:{kind:'KNOWN' as const,sourceIds:[pack.sourceId]}]));
 const identity=screed01101AppendIdentityR1,included=['Подготовка основания, укладка и разравнивание готового цементного раствора М150 слоем20мм, уход за стяжкой.',
  'На100м²: цельный труд39,51ч; справочно труд машинистов1,27ч; подъёмник1,27маш.-ч; поверхностный вибратор9,07маш.-ч; вода3,5м³; готовый раствор2,04м³.',
  'Три подработы имеют одного владельца цельного труда и общей воды. Два материальных баланса сохраняют расход, наличие, резерв, кратность, заказ и остаток.'];
 const excluded=[...pack.exclusionsRu,'Современная оплата обоих механизмов и отдельного оператора не допущена; пять проектных потребностей остаются открытыми.'];
 return{contract:pack.contract,stopCode:'FLOOR_CEMENT_SCREED01101',applicationName:'floor-cement-screed20mm-column01',expectedBranch:'codex/r4-a5-clean-08b18902',
  masterPath:'C:/Users/User/Downloads/GOX_BUILD_TZ_Single_Platform_Core_Sol61_2026-10-19 (3).txt',masterSha256:'cee56e846dce2b6e246f6a519eec81241eba458069b66c161e6b0422938ec517',
  parentReleaseId:screed01101ParentPairR1.definitionReleaseId,parentSearchReleaseId:screed01101ParentPairR1.searchReleaseId,
  currentReleasePath:resolve('data/estimate-benchmarks/r568-local-developer-canonical-release.json'),outputRoot:resolve('.release-runtime/floor-cement-screed01101-r83/publication'),
  sourcePaths:[packPath,factoryPath,selfPath,pack.source.path,'scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts','scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts',
   'scripts/estimate/r4a13/masterScopedNormativeRegistryPreimageR1.ts','scripts/estimate/r4a13/masterSingleDefinitionAppendGuardsR1.ts','scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1.ts',
   ...Object.values(e).filter(Boolean).map(p=>p!.path)],catalogId:identity.catalogId,sourceId:pack.sourceId,normId:pack.normId,...(capture?{capturedScopedNormativeRegistry:capture}:{}),
  sourceMetadata:{source_title:'КРЕР11-2015: цементная стяжка20мм, только11-01-011-01',source_authority:'Министерство строительства Кыргызской Республики',source_kind:'OFFICIAL_NORM_EXACT_SINGLE_COLUMN',
   official_url:pack.source.officialUrl,artifact_sha256:pack.source.sha256,exact_locator:pack.source.locatorRu,use_restriction:pack.selectionRestrictionRu},
  parameterDefinitions:d.parameters,formulaDefinitions:d.formulas,resourceDefinitions:d.resources,shortInput:{[pack.measurement.parameterId]:'125'},acceptanceInput:facts('125'),
  runtimeProfileInput:{},runtimeProfileClassification:{},runtimeProfileSourceIds:{},expectedParentShape:[0,0,0],benchmarkOrdinal:0,
  validationScenario:'EXACT01101_CEMENT20MM_READY_M150_100M2_PARTIAL_5NEEDS_MACHINE_AND_OPERATOR_PAYMENT_PENDING',
  passport:{canonicalRuName:pack.titleRu,workKey:identity.workKey,physicalResultRu:'Чистая площадь цементной стяжки20мм из готового раствораМ150 по проекту полов; самостоятельный новый слой, не демонтаж и не подготовка после ремонта.',
   includedScopeRu:included,excludedScopeRu:excluded,independentCompletenessMap:completeness(),unresolvedApplicableResourceRowIds:open},
  applicability:{primaryMeasureParameterId:pack.measurement.parameterId,exactNorm:pack.normId,...scope,hiddenDefaultProfile:false,oldGenericRowsOrPricesImported:false},
  binding:{rowId:bound[0]!,additionalRowIds:bound.slice(1),applicability:{exactColumn:pack.normId,quantityBasis:'100M2_READY_M150_CEMENT20MM',sourceArtifactSha256:pack.source.sha256}},
  locator:{key:identity.locatorKey,payload:{kind:'EXACT_OFFICIAL_CEMENT_SCREED20MM_SOURCE',exactColumn:pack.normId,sourceArtifact:pack.source.path,
   physicalPrintedPages:[5,16,17],sourceNormativeBindingRowIds:bound,sourceResourceRates:{worker:pack.worker,operator:pack.operator,machines:pack.machines,materials:pack.materials},...scope}},
  search:{primaryUom:'m2',canonicalNameRu:pack.titleRu,aliases:['цементная стяжка20мм готовый М150','стяжка пола11-01-011-01'],shortScopeRu:pack.selectionRestrictionRu,
   keyDistinguishingParameters:[pack.measurement.parameterId,pack.scopeFact.id],clarificationFields:d.parameters.filter(p=>p.truth_metadata.visibility_role==='USER_INPUT').map(p=>p.parameter_id),
   includedBoundaries:included,excludedBoundaries:excluded,extraSearchTermsRu:'полы стяжка цементная20мм готовый растворМ150 КРЕР11-01-011-01',sourceProvenance:{sourcePack:packPath,...scope}},
  catalogAppend:{requireUniqueWorkKey:true,capturedSourcePreimage:{sourceKey:pack.sourceId,expected:null},explicitParameterSources:explicit,
   identity:{namespace:'global',domain:'flooring',sourceIdentity:identity.sourceIdentity,workKey:identity.workKey,titleRu:pack.titleRu,denominatorEligible:true},
   searchPlacement:{groupMode:'create',groupId:identity.groupId,groupNameRu:'Полы: цементная стяжка20мм из готового раствора',domainId:'flooring',systemId:'floor_screeds',subsystemId:identity.groupId,
    assemblyId:identity.groupId,workFamilyId:identity.workKey,breadcrumb:['Полы','Стяжки','Цементная20мм'],membershipOrdinal:0,
    groupOracleDisposition:{contract:pack.contract,disposition:'EXACT_PHYSICAL_WORK_GROUP',rootDecisionSha256:e.rootDecision.sha256},
    independentDisposition:{contract:pack.contract,classification:'CANONICAL_VISIBLE',exactPhysicalIdentity:true,globalPhysicalAbsenceProved:false,fullTechnicalAcceptance:false,appendedWithoutReplacingExistingIdentity:true},
    elementType:'WORK',operationKind:'NEW_INSTALLATION',technologyVariant:'KRER11_01_011_01_CEMENT20MM_READY_M150',constructionState:'NEW',normativeClassifiers:['КРЕР11-01-011-01'],
    applicabilityTags:['FLOOR_SCREED','CEMENT20MM','READY_M150','PARTIAL_COMPOSITION','MACHINE_PRICE_PENDING'],publicationState:'ADMITTED_BACKEND',catalogOrigin:'GLOBAL',adjudicationClass:'EFFECTIVE_WORK',selectable:true}},
  forbiddenAdjacentMatchers:[/floor-underlayer:concrete:|slab-full:|monolithic-stair:|trench:/u],owner:'ROOT_SCREED01101_SINGLE_INTEGRATOR',receiptFileStem:'floor_cement_screed20mm_column01',
  verifyCore:async()=>{assert(capture&&e.scopedRegistryCapture,'SCREED01101_CAPTURE_ONLY_CONFIG_CANNOT_PUBLISH');
   for(const p of Object.values(e).filter(Boolean))load(p!);
   assert.equal(sha(readFileSync(resolve(factoryPath))),'790e6f52bc954955b6265e6e06fd5975c388a7b75e3199508b3e891838729211');
   assert.equal(sha(readFileSync(resolve(packPath))),'99989ee2e6e3cf553b59b03a23c09d2eefa598672c51820f342bdd7ef17818e5');
   assert.equal(sha(readFileSync(resolve(pack.source.path))),pack.source.sha256);assert.deepEqual(d.parameters,factory().parameters);assert.deepEqual(d.formulas,factory().formulas);
   assert(d.parameters.every(p=>p.default_value===null));assert.deepEqual(d.runtimeInput,{});
   const compiled=await compileCanonicalEstimateCore({operation:'recalculate',compilerVersion:pack.contract,catalogId:identity.catalogId,primaryMeasureParameterId:pack.measurement.parameterId,
    parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],submittedParameters:facts('125'),confirmedParameters:{},currencyCode:'KGS',priceItems:[],
    rowOverrides:{[pack.prefix+':surface-vibrator-own']:{unitPrice:'77',provenance:{kind:'manual',reason:'VERIFICATION_FIXTURE_ONLY_NOT_CURRENT_PRICE'}}},maximumResourceRows:36,hashJson:estimateDeterministicHash});
   assert.equal(compiled.preliminaryNeeds.length,5);assert.equal(compiled.totals.amount,'0');assert.equal(compiled.rows.filter(r=>r.included_in_procurement).length,2);
   return{status:'PASS_GOVERNED_EXACT01101_PROJECT_QUANTITY_AND_MACHINE_PAYMENT_BOUNDARY',contract:pack.contract,shape:[21,36,36],quantityScope:'PARTIAL',openNeeds:5,machineAndOperatorFinancialAdmission:false,fullTechnicalAcceptance:false,acceptedNewCompleteTypes:0,
    serializedSha256:estimateDeterministicHash(compiled),
    targeted41ReceiptSha256:e.targeted41Acceptance.sha256,fullTypeReceiptSha256:e.fullTypeAcceptance.sha256};}};
}
/** Literals follow the existing publisher's source/locator seeds exactly; the
 * same writer recomputes and checks them before DML. This helper performs no read. */
export function prepareScreed01101RegistryCaptureInputR1(e:Pick<Screed01101GovernedEvidenceR1,'currentIntake'|'currentReadGuard'|'semanticReview'>):MasterScopedNormativeRegistryInputR1{
 // The existing read-only capture may precede ROOT review. It gets only the
 // narrow registry input, never a publishable config or an admitted definition.
 assert.equal(e.semanticReview.sha256,'84fad0f80c9b9c921d9bffd8da3403968ccb71bcc58672dde93f0accbcda812d');
 assertScreed01101CurrentBaseR1(load(e.currentIntake),load(e.currentReadGuard),load(e.semanticReview));
 const sourceId='e27d9571-6ac9-538c-b3d0-a1b582e01978';
 return{config:{stopCode:'FLOOR_CEMENT_SCREED01101',normId:pack.normId,catalogAppend:{capturedSourcePreimage:{sourceKey:pack.sourceId,expected:null}}},
  newSource:{id:sourceId,source_key:pack.sourceId,title_ru:'КРЕР11-2015: цементная стяжка20мм, только11-01-011-01',authority:'Министерство строительства Кыргызской Республики',
   official_url:pack.source.officialUrl,artifact_sha256:pack.source.sha256,effective_from:null,effective_to:null,
   metadata:{contract:pack.contract,sourceKind:'OFFICIAL_NORM_EXACT_SINGLE_COLUMN',useRestriction:pack.selectionRestrictionRu,universalProductivityClaimed:false,universalConsumptionClaimed:false,activationAllowed:false}},
  newLocators:[{id:'d23b5a6b-7c58-51ca-8ca0-c8c9e1a5a8b3',source_id:sourceId,locator_key:screed01101AppendIdentityR1.locatorKey,
   locator:{kind:'CAPTURE_SCOPE_ONLY_NOT_PUBLICATION_PAYLOAD',exactColumn:pack.normId,sourceArtifactSha256:pack.source.sha256},excerpt_sha256:sha(pack.source.locatorRu)}]};
}
