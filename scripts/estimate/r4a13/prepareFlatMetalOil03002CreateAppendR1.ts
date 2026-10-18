// Conditional WORK authoring config. Existing Master owns all preflight/locks/source gates/SQL writes.
import {strict as assert} from 'node:assert';
import {createHash} from 'node:crypto';
import {readFileSync,realpathSync,statSync} from 'node:fs';
import {resolve,relative,isAbsolute} from 'node:path';
import {execFileSync} from 'node:child_process';
import evidence from '../../../data/estimate-benchmarks/fixtures/painting03002-accepted-evidence-r1.json';
import {type MasterSingleDefinitionSuccessorConfig,resolveMasterAppendExplicitParameterSourcesR1,
 validateIndependentCompletenessMapReferences} from './prepareMasterSingleDefinitionSuccessorR1';
import {flatMetalOil03002AdmittedDefinitionR1,flatMetalOil03002ExplicitParameterSourcesR1,
 flatMetalOil03002CatalogIdR1 as catalogId,flatMetalOil03002WorkKeyR1 as workKey,
 flatMetalOil03002SourceIdentityR1 as sourceIdentity,flatMetalOil03002GroupIdR1 as groupId,
 flatMetalOil03002TitleRuR1 as titleRu,flatMetalOil03002RootDecisionStatusR1 as decisionStatus,
 flatMetalOil03002ContinuationStatusR1 as continuationStatus,
 flatMetalOil03002RootClassificationShaR1 as classificationSha,type FlatMetalOil03002RootScopeR1} from '../../../src/lib/estimate/v4/flatMetalOil03002AdmittedR1';
import {flatMetalOil03002QuantityPackR1 as pack,flatMetalOil03002PrimaryR1 as primary,
 flatMetalOil03002PrefixR1 as prefix,flatMetalOil03002FactIdsR1 as facts,
 flatMetalOil03002NeedRowIdsR1 as needRows,flatMetalOil03002ScenarioFactsR1 as control,
 flatMetalOil03002IndependentCompletenessMapR1} from '../../../src/lib/estimate/v4/flatMetalOil03002QuantityR1';
import {compileCanonicalEstimateCore} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash} from '../../../src/lib/estimate/estimateDeterministicHash';
type Json=Record<string,any>;
export type Painting03002ExactPinR1=Readonly<{path:string;sha256:string}>;
const R='C:/dev/rik-expo-app-r4a5-dc4f0ce7',pointerPath=resolve(R,'data/estimate-benchmarks/r568-local-developer-canonical-release.json');
const sha=(x:string|Uint8Array)=>createHash('sha256').update(x).digest('hex');
export const painting03002IntegrationPathsR1={
 master:'scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts',
 appendGuards:'scripts/estimate/r4a13/masterSingleDefinitionAppendGuardsR1.ts',
 parameterSourceMap:'scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1.ts',
 publisher:'scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts',
 compiler:'src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts',
 automaticOwner:'src/lib/estimate/v4/automaticConstructionOwnerR1.ts',
 deterministicHash:'src/lib/estimate/estimateDeterministicHash.ts',
 quantityPack:'data/estimate-benchmarks/source-packs/flat-metal-oil-two-coats-krer15-030-02-quantity-r1.json',
 quantityModule:'src/lib/estimate/v4/flatMetalOil03002QuantityR1.ts',quantityTests:'src/lib/estimate/v4/flatMetalOil03002QuantityR1.test.ts',
 admittedWrapper:'src/lib/estimate/v4/flatMetalOil03002AdmittedR1.ts',admittedTests:'src/lib/estimate/v4/flatMetalOil03002AdmittedR1.test.ts',
 factory:'scripts/estimate/r4a13/prepareFlatMetalOil03002CreateAppendR1.ts',factoryTests:'scripts/estimate/r4a13/prepareFlatMetalOil03002CreateAppendR1.test.ts',
 evidence:'data/estimate-benchmarks/fixtures/painting03002-accepted-evidence-r1.json',
} as const;
const canonical=(path:string)=>{const actual=realpathSync.native(resolve(path)),rel=relative(realpathSync.native(R),actual);
 assert(rel!==''&&!rel.startsWith('..')&&!isAbsolute(rel),'PAINTING03002_CANONICAL_PROOF_REQUIRED');return actual;};
function exact(pin:Painting03002ExactPinR1):Json{
 assert(pin&&typeof pin.path==='string'&&/^[a-f0-9]{64}$/u.test(pin.sha256),'PAINTING03002_EXPLICIT_PIN_REQUIRED');
 const path=canonical(pin.path);assert(statSync(path).size<=3*1024*1024,'PAINTING03002_PROOF_3MIB_CAP');
 const b=readFileSync(path);assert.equal(sha(b),pin.sha256,'PAINTING03002_EXACT_PROOF_BYTES_CHANGED');return JSON.parse(b.toString('utf8'));
}
const pair=(x:Json)=>({definitionReleaseId:x.definitionReleaseId,searchReleaseId:x.searchReleaseId});
const uuid=(x:unknown)=>typeof x==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/u.test(x);
function rawRows(read:Json,key:string):Json[]{const set=read.sets[key];assert(set&&Array.isArray(set.rawRows));assert.equal(set.rowCount,set.rawRows.length);
 assert.equal(sha(set.rawRows.join('\n')+(set.rawRows.length?'\n':'')),set.sha256,'PAINTING03002_RAW_SET_DRIFT');return set.rawRows.map((raw:string)=>JSON.parse(raw));}
export function assertPainting03002RootDecisionR1(d:Json):void{
 assert.equal(d.contract,'painting03002-root-source-specific-partial-create-admission/r1');assert.equal(d.status,decisionStatus);
 assert.deepEqual(d,evidence.formalRootDecisionSemantic,'PAINTING03002_EXACT_FORMAL_ROOT_DECISION_9BE99_REQUIRED');
 assert.equal(d.published,false);assert.equal(d.identityAdmittedForFactoryPreparation,true);assert.equal(d.noPublicationAuthorityFromThisFileAlone,true);
 assert.deepEqual(d.identity,{catalogId,workKey,sourceIdentity});assert.equal(d.titleRu,titleRu);assert.deepEqual(d.searchPlacement,{groupMode:'create',groupId,domainId:'carpentry_metal',systemId:'carpentry_metal',membershipOrdinal:0});
}
export function assertPainting03002IntegrationR1(d:Json):void{
 assert.equal(d.contract,'root-painting03002-checked-integration-and-parent-inputs/r1');assert.equal(d.status,'ROOT_CHECKED_PAINTING03002_CREATE_FACTORY_INTEGRATION_R1');assert.equal(d.templateOnly,false);assert.deepEqual(d.pending,[]);
 assert.equal(d.rootDecisionSha256,evidence.formalRootDecisionSha256);assert.equal(d.continuationReadSha256,evidence.knownPins.continuation.sha256);
 assert(/^[a-f0-9]{64}$/u.test(d.rootParentSealSha256));assert(uuid(d.acceptedParent.definitionReleaseId)&&uuid(d.acceptedParent.searchReleaseId));for(const k of ['recordedReleaseSourceCommit','releaseSourceTree'])assert(/^[a-f0-9]{40}$/u.test(d.acceptedParent[k]));
 assert.deepEqual(Object.keys(d.sourcePinsAtIntegration).sort(),Object.keys(painting03002IntegrationPathsR1).sort());for(const [k,path]of Object.entries(painting03002IntegrationPathsR1)){assert.equal(d.sourcePinsAtIntegration[k].path,path);assert(/^[a-f0-9]{64}$/u.test(d.sourcePinsAtIntegration[k].sha256));}
}
/** R8 is evidence only for observed old group/source; this factory always CREATEs the distinct ROOT group. */
export function assertPainting03002ContinuationR1(r:Json):void{
 assert.equal(r.contract,'painting03002-r7-historical-group-plus-current-member-source-continuation/r8');assert.equal(r.status,continuationStatus);
 assert.equal(r.completeReadSet,true);assert.equal(r.error,null);assert.equal(r.transactionRolledBack,true);assert.equal(r.connectionClosed,true);assert.equal(r.databaseWrites,false);assert.equal(r.appJobs,false);
 assert.equal(r.commonSnapshotClaim,false);assert.equal(r.historicalGroupEvidence.status,'NOT_ACCEPTED');
 assert.equal(r.historicalGroupEvidence.resultPin.sha256,evidence.knownPins.historicalR7GroupFailure.sha256);
 assert.equal(r.historicalGroupEvidence.closedGuardPin.sha256,evidence.knownPins.historicalR7ClosedGuard.sha256);
 assert.deepEqual(Object.keys(r.sets).sort(),['currentScalarGroupBusinessHashAndFourMemberCount','exactFourFullCurrentMemberIdentityManifestSearchHeaders','exactPainting03002SourcePreimageAndCurrentConsumers'].sort());
 const scalar=rawRows(r,'currentScalarGroupBusinessHashAndFourMemberCount');assert.equal(scalar.length,1);assert.equal(scalar[0].group_business_exact,true);assert.equal(scalar[0].current_group_business_sha256,scalar[0].captured_group_business_sha256);assert.equal(scalar[0].member_count,4);assert.equal(scalar[0].expected_catalog_count,4);
 const members=rawRows(r,'exactFourFullCurrentMemberIdentityManifestSearchHeaders');assert.equal(members.length,4);
 for(const t of evidence.fenceTargets){const row=members.find(m=>m.membership.catalog_id===t.catalogId);assert(row);assert.equal(row.manifest.release_id,r.executionContext.definitionReleaseId);assert.equal(row.manifest.definition_version_id,t.definitionVersionId);assert.equal(row.manifest.approved_template_baseline_id,t.approvedTemplateBaselineId);assert.equal(row.manifest.definition_hash,t.definitionSha256);assert.equal(row.definition_anchor.release_id,t.immutableDefinitionReleaseId);assert.equal(row.baseline_anchor.accepted_release_id,t.baselineAcceptedReleaseId);assert.equal(row.identity.source_identity,t.sourceIdentity);assert.equal(row.identity.work_key,t.workKey);assert.equal(row.search.group_id,evidence.fenceGroupId);assert.equal(row.search.system_id,'profile_sheet_fence');assert.equal(row.search.definition_release_id,r.executionContext.definitionReleaseId);assert.equal(row.search.definition_version_id,t.definitionVersionId);}
 const sources=rawRows(r,'exactPainting03002SourcePreimageAndCurrentConsumers');assert.deepEqual(sources,[{source_key:pack.sourceKeyProposal,exact_source_count:0,source_preimage:null,current_consumer_count:0,current_consumer_headers:[]}]);
}
export function loadPainting03002RootAdmissionR1(rootDecisionPin:Painting03002ExactPinR1,rootIntegrationPin:Painting03002ExactPinR1){
 assert.equal(rootDecisionPin.sha256,evidence.formalRootDecisionSha256);const decision=exact(rootDecisionPin);assertPainting03002RootDecisionR1(decision);const integration=exact(rootIntegrationPin);assertPainting03002IntegrationR1(integration);
 for(const [key,path]of Object.entries(painting03002IntegrationPathsR1))assert.equal(sha(readFileSync(resolve(R,path))),integration.sourcePinsAtIntegration[key].sha256,'PAINTING03002_CURRENT_SOURCE_CHANGED:'+key);
 const loaded:Json={};for(const [key,pin]of Object.entries(evidence.knownPins) as [string,Painting03002ExactPinR1][]){loaded[key]=exact(pin);}
 for(const key of evidence.knownClosedReadKeys){const read=loaded[key];assert.equal(read.status,(evidence.knownStatuses as Json)[key]);assert.equal(read.completeReadSet,true);assert.equal(read.error,null);assert.equal(read.transactionRolledBack,true);assert.equal(read.connectionClosed,true);for(const [name,p]of Object.entries((evidence.rawSetPins as Json)[key]) as [string,Json][]){assert.equal(rawRows(read,name).length,p.rowCount);assert.equal(read.sets[name].sha256,p.sha256);}}
 for(const key of evidence.knownGuardKeys){const guard=loaded[key];assert.equal(guard.status,(evidence.knownStatuses as Json)[key]);assert.deepEqual(guard.cleanupErrors,[]);assert.deepEqual(guard.remainingOwnedProcesses,[]);assert.equal(guard.noOwnedProcessStillRunning,true);if(key!=='historicalR7ClosedGuard')assert.equal(guard.error,null);}
 assert.equal(loaded.rootClassification.status,evidence.rootClassificationStatus);assert.equal(loaded.rootClassification.newIdentityAdmitted,false);assert.equal(loaded.rootClassification.cumulativeAssessedExistingModels,24);
 assert.equal(loaded.historicalR7GroupFailure.status,'NOT_ACCEPTED');assert.equal(loaded.historicalR7GroupFailure.completeReadSet,false);assert.equal(loaded.historicalR7GroupFailure.transactionRolledBack,true);assert.equal(loaded.historicalR7GroupFailure.connectionClosed,true);
 assertPainting03002ContinuationR1(loaded.continuation);
 const scope:FlatMetalOil03002RootScopeR1={contractVersion:'painting03002-root-scope-provenance/r1',rootDecisionStatus:decisionStatus,
  rootDecisionSha256:evidence.formalRootDecisionSha256 as FlatMetalOil03002RootScopeR1['rootDecisionSha256'],rootClassificationSha256:classificationSha,continuationStatus,
  continuationReadSha256:evidence.knownPins.continuation.sha256 as FlatMetalOil03002RootScopeR1['continuationReadSha256'],sourceArtifactSha256:pack.source.sha256,
  quantityPackSha256:'9cf784f9848df164187529d8aeee2442ccd736e91ea04ae0f729e488f7ee42f7',quantityScope:'PARTIAL',placement:'CREATE_EXACT_ROOT_GROUP'};
 return {decision,integration,scope,evidencePaths:[canonical(rootIntegrationPin.path),...Object.values(evidence.knownPins).map((p:any)=>canonical(p.path))]};
}
/** Parent schema is ROOT-sealed only after ACTUAL publication/readback. No future UUID/schema is inferred. */
export function assertPainting03002ParentSealR1(seal:Json,integration:Json):void{
 assert.equal(seal.contract,'root-painting03002-create-parent-seal/r1');assert.equal(seal.status,'ROOT_SEALED_ACTUAL_CURRENT_PARENT_FOR_PAINTING03002_CREATE_APPEND_R1');assert.equal(seal.templateOnly,false);assert.deepEqual(seal.pending,[]);
 assert.deepEqual(seal.acceptedParent,integration.acceptedParent);assert.equal(seal.rootClassificationSha256,classificationSha);assert.equal(seal.continuationReadSha256,evidence.knownPins.continuation.sha256);
 assert.equal(seal.preservation.existing24DefinitionMappingsUnchanged,true);assert.equal(seal.preservation.unrelatedManifestChanges,0);assert.equal(seal.preservation.sourcePreimageReviewedAtR8,true);assert.equal(seal.allOwnedProcessesClosed,true);
 assert.deepEqual(Object.keys(seal.proofPins).sort(),['apply','closedGuard','independentReadback'].sort());assert.deepEqual(Object.keys(seal.expectedProofStatuses).sort(),Object.keys(seal.proofPins).sort());
}
export function loadPainting03002ActualParentR1(pin:Painting03002ExactPinR1,integration:Json){
 assert.equal(pin.sha256,integration.rootParentSealSha256);const seal=exact(pin);assertPainting03002ParentSealR1(seal,integration);
 const proofs:Json={};for(const key of Object.keys(seal.proofPins)){const value=exact(seal.proofPins[key]);assert(typeof seal.expectedProofStatuses[key]==='string'&&seal.expectedProofStatuses[key].startsWith(key==='apply'?'GREEN_':'PASS_'));assert.equal(value.status,seal.expectedProofStatuses[key]);proofs[key]=value;}
 const apply=proofs.apply;assert.equal(apply.mutationPerformed,true);assert.equal(apply.idempotent,false);assert.equal(apply.audit.unrelatedManifestChanges,0);assert.equal(apply.successor.releaseId,seal.acceptedParent.definitionReleaseId);assert.equal(apply.successor.searchReleaseId,seal.acceptedParent.searchReleaseId);assert.equal(apply.source.head,seal.acceptedParent.recordedReleaseSourceCommit);assert.equal(apply.source.tree,seal.acceptedParent.releaseSourceTree);assert.equal(apply.source.hashedDirtySourceAccepted,false);assert(Number.isSafeInteger(seal.definitionManifestCount)&&seal.definitionManifestCount>0);assert.equal(apply.audit.release.definition_count,seal.definitionManifestCount);
 // Exact actual readback status/raw SHA is sealed by ROOT; future field aliases are deliberately not invented here.
 assert.equal(proofs.independentReadback.error,null);assert.equal(proofs.independentReadback.completeReadSet,true);
 assert.equal(proofs.closedGuard.error,null);assert.deepEqual(proofs.closedGuard.cleanupErrors,[]);assert.deepEqual(proofs.closedGuard.remainingOwnedProcesses,[]);assert.equal(proofs.closedGuard.noOwnedProcessStillRunning,true);
 const context=exact(seal.currentContextPin);assert.deepEqual(Object.keys(context).sort(),['executionContext','pointer','proofPins','releaseSourceTree','status']);assert.equal(context.status,'ROOT_VERIFIED_PAINTING03002_CREATE_APPEND_CURRENT_CONTEXT_R1');
 const current=context.executionContext;assert.deepEqual(Object.keys(current).sort(),['definitionReleaseId','recordedReleaseSourceCommit','searchReleaseId','sourceHead']);assert.deepEqual(pair(current),pair(seal.acceptedParent),'NO_AUTOMATIC_PARENT_REBASE');assert.equal(current.recordedReleaseSourceCommit,seal.acceptedParent.recordedReleaseSourceCommit);assert.equal(context.releaseSourceTree,seal.acceptedParent.releaseSourceTree);
 const git=(...args:string[])=>execFileSync('git',args,{cwd:R,encoding:'utf8',windowsHide:true,maxBuffer:65536}).trim();assert.equal(realpathSync.native(process.cwd()),realpathSync.native(R));assert.equal(git('rev-parse','HEAD'),current.sourceHead);assert.equal(git('rev-parse',current.recordedReleaseSourceCommit+'^{tree}'),context.releaseSourceTree);execFileSync('git',['merge-base','--is-ancestor',current.recordedReleaseSourceCommit,current.sourceHead],{cwd:R,windowsHide:true,maxBuffer:65536});
 const pointer=exact(context.pointer);assert.equal(canonical(context.pointer.path),realpathSync.native(pointerPath));assert.deepEqual(pair(pointer),pair(current));assert.equal(pointer.currentRuntimeDefinitions,seal.definitionManifestCount);assert.equal(pointer.productionAccessed,false);assert.equal(pointer.definitionReleaseStatus,'prepared');assert.equal(pointer.searchReleaseStatus,'draft');assert.equal(pointer.definitionSnapshotSha256,apply.audit.release.source_manifest_sha256);assert.equal(pointer.searchHashChainSha256,apply.audit.search.snapshot_sha256);
 assert(Array.isArray(context.proofPins)&&context.proofPins.length>=1&&context.proofPins.length<=8);for(const p of context.proofPins)exact(p);
 return {seal,context,evidencePaths:[pin.path,seal.currentContextPin.path,...Object.values(seal.proofPins).map((p:any)=>p.path),...context.proofPins.map((p:any)=>p.path)].map(canonical)};
}
export function prepareFlatMetalOil03002CreateAppendR1(input:Readonly<{
 rootDecisionPin:Painting03002ExactPinR1;rootIntegrationPin:Painting03002ExactPinR1;rootParentSealPin:Painting03002ExactPinR1;sourceArtifactPin:Painting03002ExactPinR1;
}>):MasterSingleDefinitionSuccessorConfig{
 const admission=loadPainting03002RootAdmissionR1(input.rootDecisionPin,input.rootIntegrationPin),parent=loadPainting03002ActualParentR1(input.rootParentSealPin,admission.integration);
 assert.equal(input.sourceArtifactPin.sha256,pack.source.sha256);const artifactPath=canonical(input.sourceArtifactPin.path);assert.equal(statSync(artifactPath).size,evidence.primaryArtifactBytes);assert.equal(sha(readFileSync(artifactPath)),pack.source.sha256);
 const d=flatMetalOil03002AdmittedDefinitionR1(admission.scope),completeness=flatMetalOil03002IndependentCompletenessMapR1(),bindingRows=pack.rows.map(r=>prefix+':'+r.suffix),owner=bindingRows[0]!;
 const included=[pack.scopeRu,'Очистка, проолифка и оба слоя входят в целую норму 12,21 чел.-ч на 100 м²; площадь не умножается на два.','Шесть строк исходных ресурсов справочные. Материалы не являются заказом; механизмы и машинисты не имеют отдельного платного владельца.','Десять потребностей полного цикла остаются открытыми; проектная и продуктовая применимость требуют подтверждения.'];
 const excluded=[...pack.excludedRu,'Существующие 24 комплексных профиля и их ручные данные сохраняются. Совместный договорный объём требует точной сверки границы оплаты, без автоматического исключения старого владельца.'];
 const cfg:MasterSingleDefinitionSuccessorConfig={contract:'gox-build.painting03002-flat-interior-metal-ma25-create-append/r1',stopCode:'PAINTING03002_ACTUAL_PAINTED_M2_R1',applicationName:'painting03002-source-specific-partial',
  expectedBranch:'codex/r4-a5-clean-08b18902',masterPath:'C:/Users/User/Downloads/MASTER_TZ_GOX_BUILD_PRODUCTION (11).md',masterSha256:'dfbb757a1562962636259c1c4cffd9127d15882b00cdd49baa8fcd4831bcacf2',
  parentReleaseId:parent.context.executionContext.definitionReleaseId,parentSearchReleaseId:parent.context.executionContext.searchReleaseId,
  currentReleasePath:pointerPath,outputRoot:resolve(R,'.release-runtime/r568/next-wave/painting03002/publication'),
  sourcePaths:[...Object.values(painting03002IntegrationPathsR1),artifactPath,canonical(input.rootDecisionPin.path),...admission.evidencePaths,...parent.evidencePaths],
  catalogId,sourceId:pack.sourceKeyProposal,normId:pack.normId,
  sourceMetadata:{source_title:pack.source.titleRu,source_authority:'Минстрой Кыргызской Республики, КРЕР15-2015',source_kind:'OFFICIAL_NORM_EXACT_SINGLE_COLUMN_PARTIAL',official_url:pack.source.officialUrl,artifact_sha256:pack.source.sha256,exact_locator:pack.source.locatorRu,use_restriction:included.join(' ')+' '+excluded.join(' ')},
  parameterDefinitions:d.parameters,formulaDefinitions:d.formulas,resourceDefinitions:d.resources,shortInput:{[primary]:'100'},acceptanceInput:control(),runtimeProfileInput:{},runtimeProfileClassification:{},runtimeProfileSourceIds:{},expectedParentShape:[0,0,0],benchmarkOrdinal:0,validationScenario:'PAINTING03002_MEASURED100M2_WHOLE12_21_NO_COAT_MULTIPLIER_SIX_INFO_TEN_NEEDS',
  passport:{canonicalRuName:titleRu,workKey,physicalResultRu:pack.scopeRu+' Частичный исходный состав; десять потребностей остаются открытыми.',includedScopeRu:included,excludedScopeRu:excluded,independentCompletenessMap:completeness,unresolvedApplicableResourceRowIds:needRows},
  applicability:{primaryMeasureParameterId:primary,primaryUnitId:'m2',quantityScope:'PARTIAL',exactColumn:'15-04-030-02',sourceQuantityDenominatorPaintedM2:100,wholeLabourPer100M2:'12.21',twoCoatsAlreadyIncluded:true,areaFromLengthOrProjection:false,largeSurfaceNumericThreshold:null,projectClassifiedLargeFlatNonstructuralMetalOnly:true,interiorMa25ExactLightColoursOnly:true,rootDecisionSha256:input.rootDecisionPin.sha256,rootParentSealSha256:input.rootParentSealPin.sha256,existing24Disposition:'KEEP_CURRENT_IMMUTABLE',globalPhysicalAbsenceProved:false,fullTechnicalAcceptance:false,newCompleteTypesAccepted:0,machinePriceAdmission:false,purchaseOrderAdmission:false},
  binding:{rowId:owner,additionalRowIds:bindingRows.slice(1),applicability:{exactColumn:'15-04-030-02',sourceAreaParameterId:primary,sourceQuantityDenominatorPaintedM2:100,twoCoatsAlreadyIncluded:true,wholeLabourOwnerRowId:owner,applicationNeedsBound:false,fullTechnicalAcceptance:false},applicabilityByRowId:Object.fromEntries(pack.rows.map(r=>[prefix+':'+r.suffix,{exactColumn:'15-04-030-02',sourceAreaParameterId:primary,sourceQuantityDenominatorPaintedM2:100,printedResourceCode:r.resourceCode,printedResourceNameRu:r.printedNameRu,printedRatePer100M2:r.ratePer100M2,sourceUnitId:r.unitId,costTreatment:r.costTreatment,resourceInclusionOwnsApplicability:true,twoCoatsAlreadyIncluded:true,sourceArtifactSha256:pack.source.sha256,applicationNeedsBound:false,machinePaymentAdmitted:false,purchaseOrderAdmitted:false,fullTechnicalAcceptance:false}]))},
  locator:{key:'krer15-04-030-02-large-flat-interior-metal-ma25-two-coats-actual-painted-m2-r1',payload:{exactColumn:'15-04-030-02',sourceArtifactSha256:pack.source.sha256,sourceLocatorRu:pack.source.locatorRu,sourceRowsOnly:bindingRows,includedOperations:pack.includedOperations,applicationNeedsUnbound:pack.openNeeds,fullCycle:pack.fullCycle,sourcePrecision:pack.sourceScopePrecision,rootClassificationSha256:classificationSha,actualContinuationReadSha256:evidence.knownPins.continuation.sha256,rootDecisionSha256:input.rootDecisionPin.sha256,globalPhysicalAbsenceProved:false}},
  search:{primaryUom:'м²',canonicalNameRu:titleRu,aliases:['Масляная окраска больших плоских металлических поверхностей, КРЕР15-04-030-02','Готовая внутренняя МА-25: розово-бежевая, светло-бежевая, светло-серая; два слоя','Очистка, проолифка и двухслойная окраска металла по фактической площади'],shortScopeRu:'Точная колонка 030-02: фактическая окрашиваемая большая плоская неструктурная поверхность внутри; МА-25 указанных светлых цветов, два слоя уже включены. Целый труд 12,21 ч на 100 м²; шесть INFO и десять открытых потребностей.',keyDistinguishingParameters:[primary,...facts],clarificationFields:[...facts],includedBoundaries:included,excludedBoundaries:excluded,extraSearchTermsRu:'отделка масляная окраска плоский металл внутри помещения МА25 олифа два слоя фактическая окрашиваемая площадь КРЕР15-04-030-02',sourceProvenance:{rootDecisionSha256:input.rootDecisionPin.sha256,rootClassificationSha256:classificationSha,actualContinuationReadSha256:evidence.knownPins.continuation.sha256,sourceArtifactSha256:pack.source.sha256,quantityScope:'PARTIAL',existing24Disposition:'KEEP_CURRENT_IMMUTABLE',fullTechnicalAcceptance:false,globalPhysicalAbsenceProved:false}},
  catalogAppend:{requireUniqueWorkKey:true,explicitParameterSources:flatMetalOil03002ExplicitParameterSourcesR1(),capturedSourcePreimage:{sourceKey:pack.sourceKeyProposal,expected:null},
   identity:{namespace:'global',domain:'carpentry_metal',sourceIdentity,workKey,titleRu,denominatorEligible:true},
   searchPlacement:{groupMode:'create',groupId,groupNameRu:titleRu,domainId:'carpentry_metal',systemId:'carpentry_metal',subsystemId:groupId,assemblyId:groupId,workFamilyId:groupId,breadcrumb:[titleRu],membershipOrdinal:0,
    groupOracleDisposition:{rootDecisionSha256:input.rootDecisionPin.sha256,rootClassificationSha256:classificationSha,decision:'SOURCE_SPECIFIC_PARTIAL_CREATE',existing24Unchanged:true,freshCreateNullGroupAndOrdinalGateRequired:true},independentDisposition:{classification:'CANONICAL_VISIBLE',rootDecisionSha256:input.rootDecisionPin.sha256,sourceSpecificPhysicalProfile:true,newCompleteTypesAccepted:0,notFenceOnlyScope:true},
    elementType:'WORK',operationKind:'OTHER',technologyVariant:'KRER15_04_030_02_LARGE_FLAT_INTERIOR_NONSTRUCTURAL_METAL_MA25_LIGHT_TWO_COATS',constructionState:'PROJECT_CONFIRMED_SURFACE_AND_PRIOR_COATING_BOUNDARY_REQUIRED',normativeClassifiers:['КРЕР15-04-030-02'],applicabilityTags:['ACTUAL_PAINTED_M2','LARGE_FLAT_NONSTRUCTURAL_METAL','INTERIOR_MA25_LIGHT_COLOURS','TWO_COATS_ALREADY_INCLUDED','WHOLE_LABOUR12_21_PER100','PARTIAL_TEN_OPEN_NEEDS'],publicationState:'ADMITTED_BACKEND',catalogOrigin:'GLOBAL',adjudicationClass:'EFFECTIVE_WORK',selectable:true}},
  forbiddenAdjacentMatchers:[/ct54|pf.?133|thermoplastic|reflex|hydrotest|doka|elecor|road-marking/iu],owner:'ROOT_SINGLE_INTEGRATOR_PAINTING03002',receiptFileStem:'painting03002_actual_painted_m2_r1',
  verifyCore:async()=>{assert.equal(sha(readFileSync(artifactPath)),pack.source.sha256);assert.deepEqual([d.parameters.length,d.formulas.length,d.resources.length],[19,17,17]);assert.deepEqual(d.parameters.map(p=>p.ordinal),Array.from({length:19},(_,i)=>i));assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:completeness,formulaDefinitions:d.formulas,resourceDefinitions:d.resources}),[]);
   const sources=resolveMasterAppendExplicitParameterSourcesR1(cfg,{parameters:d.parameters,formulas:d.formulas,resources:d.resources})!;assert.equal(Object.keys(sources).length,19);for(const p of d.parameters)assert.deepEqual(sources[p.parameter_id],p.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM'?[]:[pack.sourceKeyProposal]);
   const compile=(parameters:Json,rowOverrides:Parameters<typeof compileCanonicalEstimateCore>[0]['rowOverrides']={})=>compileCanonicalEstimateCore({operation:'recalculate',catalogId,compilerVersion:cfg.contract,primaryMeasureParameterId:primary,parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],submittedParameters:parameters,confirmedParameters:{},rowOverrides,priceItems:[],currencyCode:'KGS',maximumResourceRows:17,hashJson:async x=>estimateDeterministicHash(x)});
   const result=await compile(control());assert.deepEqual(result.rows.map(r=>r.quantity),['12.21','0.01','0.01','0.03','0.0277','3.2','0.1']);assert.deepEqual(result.preliminaryNeeds.map(n=>n.row_id).sort(),[...needRows].sort());assert.deepEqual(result.rows.filter(r=>r.included_in_estimate).map(r=>r.row_id),[owner]);assert(result.rows.every(r=>r.unit_price===null&&!r.included_in_procurement));
   const priced=await compile(control(),{[owner]:{unitPrice:'77',titleRu:'Контрольная цена 77, не предложение подрядчика',provenance:{kind:'manual',reason:'TEST_ONLY CONTROL77'}}});assert.equal(priced.totals.amount,'940.17');
   const info=await compile(control(),Object.fromEntries(bindingRows.map(id=>[id,{unitPrice:'77',provenance:{kind:'manual' as const,reason:'TEST_ONLY CONTROL77_REFERENCE'}}])));assert.equal(info.totals.amount,'940.17');assert(info.rows.filter(r=>r.row_id!==owner).every(r=>!r.included_in_estimate&&!r.included_in_procurement));
   return {status:'PASS_PAINTING03002_SOURCE_SPECIFIC_PARTIAL_CORE_ONLY',shape:[19,17,17],normativeBindings:7,baselineSources:{KNOWN:9,UNRESOLVED:10},priceBindings:0,paidOwners:1,informationalRows:6,openNeeds:10,machinePaidOwners:0,purchaseOwners:0,newCompleteTypesAccepted:0,fullTechnicalAcceptance:false,publicationPerformed:false};
  }};
 assert(resolveMasterAppendExplicitParameterSourcesR1(cfg,{parameters:d.parameters,formulas:d.formulas,resources:d.resources}),'PAINTING03002_EXPLICIT_SOURCE_MAP_REQUIRED');
 assert.equal(cfg.catalogAppend!.searchPlacement.groupMode,'create');assert.equal(cfg.catalogAppend!.capturedJoinGroupMembers,undefined);assert(!cfg.sourcePaths.some(p=>resolve(R,p)===pointerPath),'MUTABLE_POINTER_MUST_NOT_ENTER_SOURCE_PATHS');return cfg;
}
