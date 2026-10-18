// WORK proposal. Existing Master owns preflight, locked reread, source/identity gates, writer and append.
import {strict as assert} from 'node:assert';
import {createHash} from 'node:crypto';
import {readFileSync,realpathSync,statSync} from 'node:fs';
import {resolve,relative,isAbsolute} from 'node:path';
import {execFileSync} from 'node:child_process';
import evidence from '../../../data/estimate-benchmarks/fixtures/manual-trench05701-accepted-anchors-r1.json';
import {type MasterSingleDefinitionSuccessorConfig,resolveMasterAppendExplicitParameterSourcesR1,
 validateIndependentCompletenessMapReferences} from './prepareMasterSingleDefinitionSuccessorR1';
import {manualTrench05701AdmittedDefinitionR1,manualTrench05701ExplicitParameterSourcesR1,
 manualTrench05701RootDecisionStatusR1,type ManualTrench05701RootScopeR1,
 manualTrench05701CatalogIdR1 as catalogId,manualTrench05701WorkKeyR1 as workKey,
 manualTrench05701SourceIdentityR1 as sourceIdentity,manualTrench05701GroupIdR1 as groupId} from '../../../src/lib/estimate/v4/manualTrench05701AdmittedR1';
import {manualTrench05701QuantityPackR1 as pack,manualTrench05701PrefixR1 as prefix,
 manualTrench05701PrimaryR1 as primary,manualTrench05701FactIdsR1 as factIds,manualTrench05701NeedRowIdsR1 as needs,
 manualTrench05701ScenarioFactsR1 as facts,manualTrench05701IndependentCompletenessMapR1} from '../../../src/lib/estimate/v4/manualSlopedTrenchGroup1Krer01QuantityR1';
import {compileCanonicalEstimateCore} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash} from '../../../src/lib/estimate/estimateDeterministicHash';
type Json=Record<string,any>;
export type ManualTrench05701ExactPinR1=Readonly<{path:string;sha256:string}>;
const R='C:/dev/rik-expo-app-r4a5-dc4f0ce7';
const pointerPath=resolve(R,'data/estimate-benchmarks/r568-local-developer-canonical-release.json');
const pair=evidence.roadParent.pair;
const groupPin='4c131d2e1a5b21696494b03d3348c6d9f0a25b62a7b93ee633bfe143496816e7';
const bodyPin='7341a49fef8f6dbeb0a77d977205566bc3acab2055d894290c074ab1677c0ef5';
const headersPin='d777ff23a2d0fb2fd86d017ca5098d0e1c79cdfe6b7280c2bbb9a4254b6e7616';
const integrationPaths={
 master:'scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts',
 appendGuards:'scripts/estimate/r4a13/masterSingleDefinitionAppendGuardsR1.ts',
 parameterSourceMap:'scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1.ts',
 publisher:'scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts',
 compiler:'src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts',
 quantityModule:'src/lib/estimate/v4/manualSlopedTrenchGroup1Krer01QuantityR1.ts',
 quantityPack:'data/estimate-benchmarks/source-packs/manual-sloped-trench-g1-krer01-057-01-quantity-r1.json',
 admittedWrapper:'src/lib/estimate/v4/manualTrench05701AdmittedR1.ts',
 factory:'scripts/estimate/r4a13/prepareManualTrench05701AdmittedMasterAppendR1.ts',
 anchorsFixture:'data/estimate-benchmarks/fixtures/manual-trench05701-accepted-anchors-r1.json',
} as const;
const sha=(value:string|Uint8Array)=>createHash('sha256').update(value).digest('hex');
const canonical=(path:string)=>{const actual=realpathSync.native(resolve(path)),rel=relative(realpathSync.native(R),actual);
 assert(rel!==''&&!rel.startsWith('..')&&!isAbsolute(rel),'TRENCH05701_PORTABLE_CANONICAL_PROOF_REQUIRED');return actual;};
function exact(pin:ManualTrench05701ExactPinR1):Json{
 assert(pin&&typeof pin.path==='string'&&/^[a-f0-9]{64}$/u.test(pin.sha256),'TRENCH05701_EXPLICIT_PIN_REQUIRED');
 const path=canonical(pin.path);assert(statSync(path).size<=3*1024*1024,'TRENCH05701_PROOF_3MIB_CAP');
 const bytes=readFileSync(path);assert.equal(sha(bytes),pin.sha256,'TRENCH05701_PROOF_BYTES_CHANGED');return JSON.parse(bytes.toString('utf8'));
}
const pairOf=(x:Json)=>({definitionReleaseId:x.releaseId,searchReleaseId:x.searchReleaseId});
const contextPair=(x:Json)=>({definitionReleaseId:x.definitionReleaseId,searchReleaseId:x.searchReleaseId});
function rows(read:Json,key:string):Json[]{const set=read.sets[key];assert(set&&Array.isArray(set.rawRows));assert.equal(set.rowCount,set.rawRows.length);
 assert.equal(sha(set.rawRows.join('\n')+(set.rawRows.length?'\n':'')),set.sha256,'TRENCH05701_RAW_SET_DRIFT');return set.rawRows.map((raw:string)=>JSON.parse(raw));}
const memberProjection=(x:Json)=>({catalogId:x.catalogId,ordinal:x.ordinal,definitionVersionId:x.definitionVersionId,
 approvedTemplateBaselineId:x.approvedTemplateBaselineId,definitionSha256:x.definitionSha256,sourceIdentity:x.sourceIdentity,workKey:x.workKey,searchGroupId:x.searchGroupId});
/** Pure decision-schema validation only. A TEST_ONLY object does not admit files or publication. */
export function assertManualTrench05701RootDecisionR1(decision:Json):void{
 assert.equal(decision.contract,'manual-trench05701-root-partial-append-decision/r1');
 assert.equal(decision.status,manualTrench05701RootDecisionStatusR1);assert.equal(decision.decision,'ADMIT_SOURCE_SPECIFIC_PARTIAL_APPEND');
 assert.deepEqual(decision.identity,{catalogId,workKey,sourceIdentity});
 assert.deepEqual(decision.source,{sourceKey:pack.sourceKeyProposal,normId:pack.normId,artifactSha256:pack.source.sha256,
  primaryMeasureParameterId:primary,primaryUnitId:'m3',sourceDenominator:100});
 assert.deepEqual(decision.searchPlacement,{groupMode:'join',groupId,domainId:'earthworks',systemId:'earthworks',membershipOrdinal:6,capturedMemberCount:6});
 assert.deepEqual(decision.sourcePreimage,{sourceKey:pack.sourceKeyProposal,expected:null});assert.equal(decision.titleRu,pack.titleRu);
 assert.deepEqual(decision.captureScope,{contract:'master-bounded-join-group-capture/r1',memberCount:6,maxMembers:32,captureSha256:groupPin});
 assert.deepEqual(decision.shape,[18,10,10]);assert.equal(decision.normativeBindings,1);assert.equal(decision.priceBindings,0);
 assert.deepEqual(decision.parameterSources,{known:9,unresolvedEmpty:9,derivedEmpty:0});
 assert.deepEqual(decision.paidOwnerRowIds,[prefix+':whole-manual-excavation-labor']);assert.deepEqual(decision.informationalSourceRowIds,[]);
 assert.deepEqual(decision.includedOperations,pack.includedOperations.map(x=>x.id));assert.deepEqual(decision.applicationNeedRowIds,[...needs]);
 assert.deepEqual(decision.machinePriceMappings,[]);assert.deepEqual(decision.purchaseOwners,[]);
 for(const [key,value] of Object.entries({quantityScope:'PARTIAL',technicalScopeStatus:'NEEDS_SOURCE',fullTechnicalAcceptance:false,
  newCompleteTypesAccepted:0,productionEligible:false,activationAllowed:false,genericExcavationAlreadyExists:true,
  globalPhysicalAbsenceProved:false,existingEightDisposition:'KEEP_CURRENT_IMMUTABLE',
  existingGroupLabelDisposition:'PRESERVE_EXISTING_PRESENTATION_LABEL_NOT_HIGH_LOAD_APPLICABILITY'}))assert.equal(decision[key],value,'TRENCH05701_ROOT_SCOPE:'+key);
 assert.deepEqual(contextPair(decision.acceptedParent),pair,'TRENCH05701_NO_AUTOMATIC_PARENT_REBASE');
 const expectedReadPins={headers:headersPin,bodies:bodyPin,group:groupPin};assert.deepEqual(Object.keys(decision.readPins).sort(),Object.keys(expectedReadPins).sort());
 for(const [key,hash] of Object.entries(expectedReadPins))assert.equal(decision.readPins[key].sha256,hash);
 assert.equal(decision.integrationSourceStatus,'ROOT_CHECKED_EXACT_MASTER_APPEND_BOUNDED6_AND_EXPLICIT_SOURCES_R1');
 assert.deepEqual(Object.keys(decision.sourcePinsAtIntegration).sort(),Object.keys(integrationPaths).sort());
 for(const [key,path] of Object.entries(integrationPaths)){
  const p=decision.sourcePinsAtIntegration[key];assert.equal(p.path,path);assert(/^[a-f0-9]{64}$/u.test(p.sha256),'TRENCH05701_INTEGRATION_SOURCE_PIN_REQUIRED:'+key);
 }
}
/** Correlate the exact captured current group with all6 members; contextual release FKs remain contextual. */
export function assertManualTrench05701GroupCaptureR1(read:Json){
 assert.equal(read.status,'PASS_EXACT_TRENCH05701_BASE_GROUP_SIX_MEMBER_CAPTURE');assert.equal(read.completeReadSet,true);
 assert.equal(read.transactionRolledBack,true);assert.equal(read.connectionClosed,true);assert.equal(read.error,null);
 assert.equal(read.databaseWrites,false);assert.equal(read.appJobs,false);assert.equal(read.globalAbsenceProved,false);
 assert.deepEqual(read.executionContext,evidence.queryContext);assert.equal(read.actualGroupMemberCount,6);assert.equal(read.nextTailOrdinal,6);
 const metadata=rows(read,'exactSingleGroupMetadata');assert.equal(metadata.length,1);const group=metadata[0]!;
 assert.equal(group.search_release_id,pair.searchReleaseId);assert.equal(group.group_id,groupId);assert.equal(group.member_count,6);assert.equal(group.actual_member_count,6);
 const members=rows(read,'exactSingleGroupCurrentAnchors');assert.equal(members.length,6);assert.deepEqual(members.map(m=>m.ordinal),[0,1,2,3,4,5]);
 assert.equal(new Set(members.map(m=>m.catalogId)).size,6);
 for(const m of members){assert.equal(m.searchReleaseId,pair.searchReleaseId);assert.equal(m.membershipGroupId,groupId);assert.equal(m.manifestReleaseId,pair.definitionReleaseId);
  assert.equal(m.actualDefinitionId,m.definitionVersionId);assert.equal(m.definitionCatalogId,m.catalogId);assert.equal(m.actualDefinitionSha256,m.definitionSha256);
  assert.equal(m.actualBaselineId,m.approvedTemplateBaselineId);assert.equal(m.baselineCatalogId,m.catalogId);assert.equal(m.baselineDefinitionVersionId,m.definitionVersionId);
  assert.equal(m.identityCatalogId,m.catalogId);assert.equal(m.identityRetiredAt,null);assert.equal(m.searchCatalogId,m.catalogId);assert.equal(m.searchGroupId,groupId);
  assert.equal(m.searchDefinitionReleaseId,pair.definitionReleaseId);assert.equal(m.searchDefinitionVersionId,m.definitionVersionId);}
 const captured={groupId,members:members.map(memberProjection)};assert.deepEqual(captured,evidence.capturedJoinGroupMembers);assert.deepEqual(read.capturedJoinGroupMembers,captured);
 return {group,capturedJoinGroupMembers:{...captured,captureScope:{contract:'master-bounded-join-group-capture/r1' as const,memberCount:6,maxMembers:32 as const,captureSha256:groupPin}}};
}
export function loadManualTrench05701RootAdmissionR1(rootDecisionPin:ManualTrench05701ExactPinR1){
 const decision=exact(rootDecisionPin);assertManualTrench05701RootDecisionR1(decision);
 for(const [key,path] of Object.entries(integrationPaths))assert.equal(sha(readFileSync(resolve(R,path))),decision.sourcePinsAtIntegration[key].sha256,'TRENCH05701_CURRENT_SOURCE_CHANGED:'+key);
 const expected={headers:headersPin,bodies:bodyPin,group:groupPin};assert.deepEqual(Object.keys(decision.readPins).sort(),Object.keys(expected).sort());
 for(const [key,value] of Object.entries(expected))assert.equal(decision.readPins[key].sha256,value);
 const headers=exact(decision.readPins.headers),bodies=exact(decision.readPins.bodies),groupRead=exact(decision.readPins.group);
 for(const [key,read] of [['headers',headers],['bodies',bodies],['group',groupRead]] as const){
  assert.equal(read.status,evidence.readStatus[key]);assert.equal(read.completeReadSet,true);assert.equal(read.transactionRolledBack,true);assert.equal(read.connectionClosed,true);assert.equal(read.error,null);assert.equal(read.databaseWrites,false);assert.equal(read.appJobs,false);
  assert.deepEqual(read.executionContext,evidence.queryContext);assert.equal(read.actualQueryHead,evidence.queryHead);
  const setPins=evidence.setPins[key] as Json;assert.deepEqual(Object.keys(read.sets).sort(),Object.keys(setPins).sort());
  for(const [name,p] of Object.entries(setPins) as [string,Json][]){const actual=rows(read,name);assert.equal(actual.length,p.rowCount);assert.equal(read.sets[name].sha256,p.sha256);}
 }
 assert.deepEqual(rows(headers,'exactProposedSourcePreimageCurrentConsumers'),[evidence.sourcePreimage]);
 const oldDefinitions=rows(bodies,'exactEightFullDefinitionPreimages');assert.equal(oldDefinitions.length,8);
 for(const old of evidence.existing8){const d=oldDefinitions.find(d=>d.catalog_id===old.catalog_id);assert(d);assert.equal(d.id,old.definition_version_id);assert.equal(d.definition_sha256,old.definition_sha256);}
 const {group,capturedJoinGroupMembers}=assertManualTrench05701GroupCaptureR1(groupRead);
 const scope:ManualTrench05701RootScopeR1={contractVersion:'manual-trench05701-root-scope-provenance/r1',rootDecisionStatus:manualTrench05701RootDecisionStatusR1,
  rootDecisionSha256:rootDecisionPin.sha256,groupSourceCaptureSha256:groupPin,sourceArtifactSha256:pack.source.sha256,bodyReadSha256:bodyPin,quantityScope:'PARTIAL'};
 return {decision,scope,group,capturedJoinGroupMembers,evidencePaths:Object.values(decision.readPins).map((p:any)=>canonical(p.path))};
}
/** Pure correlation checks use actual accepted ROAD receipt/readback schemas, never a guessed successor. */
export function assertManualTrench05701RoadParentProofsR1(p:Json,readback:Json,acceptance:Json){
 assert.equal(p.status,'GREEN_ROAD_MARKING01601_ACTUAL_KM_R1_PREPARED_NOT_ACTIVE');assert.equal(p.mutationPerformed,true);assert.equal(p.idempotent,false);
 assert.deepEqual(pairOf(p.predecessor),{definitionReleaseId:'8b09255d-82a5-501b-9b60-e70587ff5579',searchReleaseId:'c8331c4b-dad5-5402-8c8e-2474df83d4ff'});
 assert.notEqual(p.predecessor.catalogId,catalogId);assert.equal(p.predecessor.targetAbsentForAppend,true);assert.deepEqual(p.successor,evidence.roadParent.successor);
 assert.equal(p.source.head,evidence.roadParent.recordedReleaseSourceCommit);assert.equal(p.source.tree,evidence.roadParent.recordedReleaseSourceTree);assert.equal(p.source.hashedDirtySourceAccepted,false);assert.equal(p.audit.unrelatedManifestChanges,0);
 assert.equal(readback.contract,'root-road-independent-append-readback/r1');assert.equal(readback.status,'PASS_ROOT_ROAD_APPLY_EIGHT_PAYLOAD_SAVED20_AND10468_R1');assert.equal(readback.phase,'apply');
 assert.deepEqual(readback.actualReceiptSuccessor,p.successor);assert.equal(readback.sourceHead,p.source.head);assert.equal(readback.actualPublicationContext.sourceHead,p.source.head);assert.equal(readback.actualPublicationContext.sourceTree,p.source.tree);assert.deepEqual(contextPair(readback.actualPublicationContext),pair);
 assert.equal(readback.completeReadSet,true);assert.equal(readback.error,null);assert.equal(readback.databaseWrites,false);assert.equal(readback.appJobs,false);assert.equal(readback.allConnectionsClosed,true);assert.equal(readback.allTransactionsRolledBack,true);assert.equal(readback.commonSnapshotClaim,false);
 assert.deepEqual(readback.newState,{definitionId:p.successor.definitionId,baselineId:p.successor.baselineId,shape:[17,16,16],bindings:6,priceBindings:0,staticNeeds:10});
 assert.deepEqual(readback.preservation.unrelatedManifestMappings,{parent_count:10468,successor_count:10469,parent_target_count:0,successor_target_count:1,unrelated_count:10468,unrelated_changed:0});
 assert.equal(readback.payloadResultPin.sha256,evidence.roadParent.payload.sha256);assert.equal(readback.payloadResultPin.bytes,evidence.roadParent.payload.bytes);
 assert.equal(acceptance.schemaVersion,'road-marking01601-local-publication-acceptance/v1');assert.equal(acceptance.status,'PASS_ROAD_MARKING01601_LOCAL_PUBLICATION_INDEPENDENT_PAYLOAD_SAVED20_AND10468_PRESERVED');
 assert.deepEqual(acceptance.successor,p.successor);assert.equal(acceptance.allOwnedProcessesClosed,true);assert.equal(acceptance.productionAccessed,false);assert.equal(acceptance.activationPerformed,false);
 assert.equal(acceptance.publication.sha256,evidence.roadParent.apply.sha256);assert.equal(acceptance.independentReadback.sha256,evidence.roadParent.readback.sha256);
}
export function loadManualTrench05701ActualRoadParentR1(rootParentSealPin:ManualTrench05701ExactPinR1){
 const seal=exact(rootParentSealPin);assert.equal(seal.contract,'root-sealed-actual-road-parent-for-manual-trench05701/r1');assert.equal(seal.status,'ROOT_SEALED_ACTUAL_ROAD_APPLY_READBACK_FRESH_CONTEXT_FOR_MANUAL_TRENCH05701_R1');
 for(const [key,hash] of Object.entries({applyPin:evidence.roadParent.apply.sha256,readbackPin:evidence.roadParent.readback.sha256,acceptancePin:evidence.roadParent.localAcceptance.sha256}))assert.equal(seal[key].sha256,hash);
 const p=exact(seal.applyPin),readback=exact(seal.readbackPin),acceptance=exact(seal.acceptancePin),context=exact(seal.currentContextPin);
 assertManualTrench05701RoadParentProofsR1(p,readback,acceptance);
 assert.equal(seal.payloadPin.sha256,evidence.roadParent.payload.sha256);assert.equal(statSync(canonical(seal.payloadPin.path)).size,evidence.roadParent.payload.bytes);exact(seal.payloadPin);
 assert.deepEqual(Object.keys(context).sort(),['executionContext','pointer','proofPins','releaseSourceTree','status']);assert.equal(context.status,'ROOT_VERIFIED_MANUAL_TRENCH05701_APPEND_CURRENT_CONTEXT_R1');
 const current=context.executionContext;assert.deepEqual(Object.keys(current).sort(),['definitionReleaseId','recordedReleaseSourceCommit','searchReleaseId','sourceHead']);
 assert.deepEqual(contextPair(current),pair,'TRENCH05701_NO_AUTOMATIC_PARENT_REBASE');assert.equal(current.recordedReleaseSourceCommit,p.source.head);assert.equal(context.releaseSourceTree,p.source.tree);
 const git=(...args:string[])=>execFileSync('git',args,{cwd:R,encoding:'utf8',windowsHide:true,maxBuffer:65536}).trim();
 assert.equal(realpathSync.native(process.cwd()),realpathSync.native(R));assert.equal(git('rev-parse','HEAD'),current.sourceHead);
 execFileSync('git',['merge-base','--is-ancestor',current.recordedReleaseSourceCommit,current.sourceHead],{cwd:R,windowsHide:true,maxBuffer:65536});assert.equal(git('rev-parse',current.recordedReleaseSourceCommit+'^{tree}'),context.releaseSourceTree);
 const pointer=exact(context.pointer);assert.equal(canonical(context.pointer.path),realpathSync.native(pointerPath));assert.deepEqual(contextPair(pointer),pair);assert.equal(pointer.currentRuntimeDefinitions,10469);assert.equal(pointer.productionAccessed,false);assert.equal(pointer.definitionReleaseStatus,'prepared');assert.equal(pointer.searchReleaseStatus,'draft');
 assert(Array.isArray(context.proofPins)&&context.proofPins.length>=1&&context.proofPins.length<=8);for(const pin of context.proofPins)exact(pin);
 return {pair,context,evidencePaths:[rootParentSealPin.path,seal.applyPin.path,seal.readbackPin.path,seal.acceptancePin.path,seal.payloadPin.path,seal.currentContextPin.path,...context.proofPins.map((pin:any)=>pin.path)].map(canonical)};
}
export function prepareManualTrench05701AdmittedMasterAppendR1(input:Readonly<{rootDecisionPin:ManualTrench05701ExactPinR1;rootParentSealPin:ManualTrench05701ExactPinR1;sourceArtifactPin:ManualTrench05701ExactPinR1}>):MasterSingleDefinitionSuccessorConfig{
 const admission=loadManualTrench05701RootAdmissionR1(input.rootDecisionPin),parent=loadManualTrench05701ActualRoadParentR1(input.rootParentSealPin);
 assert.equal(input.sourceArtifactPin.sha256,pack.source.sha256);const artifactPath=canonical(input.sourceArtifactPin.path);assert.equal(statSync(artifactPath).size,evidence.sourceArtifact.bytes);assert.equal(sha(readFileSync(artifactPath)),pack.source.sha256);
 const d=manualTrench05701AdmittedDefinitionR1(admission.scope),group=admission.group,completeness=manualTrench05701IndependentCompletenessMapR1(),owner=prefix+':whole-manual-excavation-labor';
 const included=[pack.scopeRu,'Разработка с выбросом на бровку, зачистка дна и стенок и откидка грунта от бровки входят в целую норму 118 чел.-ч на 100 м³; повторная отдельная оплата этих операций не предусмотрена.','Девять потребностей полного цикла остаются открытыми; материалы, механизмы, перевозка и инструмент не назначаются автоматически.'];
 const excluded=[...pack.excludedRu,'Все восемь существующих профилей и их ручные данные сохраняются. Совместное использование с агрегатной земляной работой требует явной сверки перекрывающейся оплаты, даже при неизвестной цене.'];
 const cfg:MasterSingleDefinitionSuccessorConfig={contract:'gox-build.manual-trench05701-sloped-soil1-actual-bank-m3-append/r1',stopCode:'MANUAL_TRENCH05701_BANK_M3_R1',applicationName:'manual-trench05701-source-specific-partial',
  expectedBranch:'codex/r4-a5-clean-08b18902',masterPath:'C:/Users/User/Downloads/MASTER_TZ_GOX_BUILD_PRODUCTION (11).md',masterSha256:'dfbb757a1562962636259c1c4cffd9127d15882b00cdd49baa8fcd4831bcacf2',
  parentReleaseId:parent.pair.definitionReleaseId,parentSearchReleaseId:parent.pair.searchReleaseId,currentReleasePath:pointerPath,outputRoot:resolve(R,'.release-runtime/r568/next-wave/manual-trench05701/publication'),
  sourcePaths:[...Object.values(integrationPaths),'src/lib/estimate/v4/manualSlopedTrenchGroup1Krer01QuantityR1.test.ts','src/lib/estimate/v4/manualTrench05701AdmittedR1.test.ts','scripts/estimate/r4a13/prepareManualTrench05701AdmittedMasterAppendR1.test.ts',
   artifactPath,canonical(input.rootDecisionPin.path),...admission.evidencePaths,...parent.evidencePaths],
  catalogId,sourceId:pack.sourceKeyProposal,normId:pack.normId,sourceMetadata:{source_title:pack.source.titleRu,source_authority:'Минстрой Кыргызской Республики, КРЕР01-2015',source_kind:'OFFICIAL_NORM_EXACT_SINGLE_COLUMN_PARTIAL',official_url:pack.source.officialUrl,artifact_sha256:pack.source.sha256,exact_locator:pack.source.locatorRu,use_restriction:included.join(' ')+' '+excluded.join(' ')},
  parameterDefinitions:d.parameters,formulaDefinitions:d.formulas,resourceDefinitions:d.resources,shortInput:{[primary]:'100'},acceptanceInput:facts(),runtimeProfileInput:{},runtimeProfileClassification:{},runtimeProfileSourceIds:{},expectedParentShape:[0,0,0],benchmarkOrdinal:0,validationScenario:'MANUAL_TRENCH05701_SINGLE_BANK_M3_WHOLE118_PER100_NINE_NEEDS',
  passport:{canonicalRuName:admission.decision.titleRu,workKey,physicalResultRu:'Ручная выемка грунта группы 1 в траншее с проектными откосами глубиной до 2 м, без креплений; объём в естественном состоянии. Приёмка и прочие девять частей полного цикла требуют подтверждения.',includedScopeRu:included,excludedScopeRu:excluded,independentCompletenessMap:completeness,unresolvedApplicableResourceRowIds:needs},
  applicability:{primaryMeasureParameterId:primary,primaryUnitId:'m3',quantityScope:'PARTIAL',exactColumn:'01-02-057-01',sourceQuantityDenominatorBankM3:100,soilGroup:1,maximumDepthM:2,manualMethod:true,noSupportDesignedSlopes:true,actualProjectBankVolumeOnly:true,rootDecisionSha256:input.rootDecisionPin.sha256,parentSealSha256:input.rootParentSealPin.sha256,fullTechnicalAcceptance:false,newCompleteTypesAccepted:0,genericExcavationAlreadyExists:true,existingEightDisposition:'KEEP_CURRENT_IMMUTABLE',globalPhysicalAbsenceProved:false,machinePriceAdmission:false,purchaseOrderAdmission:false,existingGroupLabelNotPhysicalApplicability:true},
  binding:{rowId:owner,applicability:{exactColumn:'01-02-057-01',sourceVolumeParameterId:primary,sourceQuantityDenominatorBankM3:100,soilGroup:1,maximumDepthM:2,manualMethod:true,noSupportDesignedSlopes:true,resourceInclusionOwnsApplicability:true,sourceArtifactSha256:pack.source.sha256,applicationNeedsBound:false,fullTechnicalAcceptance:false}},
  locator:{key:'krer01-02-057-01-manual-sloped-trench-soil1-depth2m-bank-m3-r1',payload:{exactColumn:'01-02-057-01',sourceArtifactSha256:pack.source.sha256,sourceRowsOnly:[owner],includedOperations:pack.includedOperations,applicationNeedsUnbound:pack.openNeeds,rootDecisionSha256:input.rootDecisionPin.sha256}},
  search:{primaryUom:'м³',canonicalNameRu:admission.decision.titleRu,aliases:['Ручная выемка грунта группы 1 с откосами без креплений, до 2 м','КРЕР01-02-057-01: объём грунта в естественном состоянии'],shortScopeRu:'Частичный состав ручной разработки в естественном состоянии, м³; целая норма 118 чел.-ч на 100 м³ с зачисткой и откидкой; девять незакрытых потребностей.',keyDistinguishingParameters:[primary,...factIds],clarificationFields:[...factIds],includedBoundaries:included,excludedBoundaries:excluded,extraSearchTermsRu:'земляные работы ручная траншея грунт группа 1 откосы без креплений глубина до 2 м естественный объём',sourceProvenance:{rootDecisionSha256:input.rootDecisionPin.sha256,actualRoadParentSealSha256:input.rootParentSealPin.sha256,quantityScope:'PARTIAL',fullTechnicalAcceptance:false,genericExcavationAlreadyExists:true,globalPhysicalAbsenceProved:false,existingGroupLabelNotHighLoadApplicability:true}},
  catalogAppend:{requireUniqueWorkKey:true,explicitParameterSources:manualTrench05701ExplicitParameterSourcesR1(),capturedSourcePreimage:{sourceKey:pack.sourceKeyProposal,expected:null},capturedJoinGroupMembers:admission.capturedJoinGroupMembers,identity:{namespace:'global',domain:'earthworks',sourceIdentity,workKey,titleRu:admission.decision.titleRu,denominatorEligible:true},
   searchPlacement:{groupMode:'join',groupId,groupNameRu:group.group_name_ru,domainId:group.domain_id,systemId:group.system_id,subsystemId:group.subsystem_id,assemblyId:group.assembly_id,workFamilyId:group.work_family_id,breadcrumb:group.breadcrumb,groupOracleDisposition:group.oracle_disposition,membershipOrdinal:6,
    independentDisposition:{contract:'manual-trench05701-root-partial-append-decision/r1',rootDecisionSha256:input.rootDecisionPin.sha256,classification:'CANONICAL_VISIBLE',sourceSpecificPhysicalProfile:true,newCompleteTypesAccepted:0,existingGroupLabelNotPhysicalApplicability:true},elementType:'WORK',operationKind:'OTHER',technologyVariant:'KRER01_02_057_01_MANUAL_SLOPED_TRENCH_SOIL1_DEPTH2_BANK_M3',constructionState:'PROJECT_CONFIRMED_DRY_NATURAL_SINGLE_SOIL_GROUP1_UNFROZEN_NOT_PRELOOSENED',normativeClassifiers:['КРЕР01-02-057-01'],applicabilityTags:['MANUAL_TRENCH','SOIL_GROUP1','DEPTH_LE2M','DESIGNED_SLOPES_NO_SUPPORT','ACTUAL_BANK_M3','WHOLE_LABOUR118_PER100','PARTIAL_QUANTITY'],publicationState:'ADMITTED_BACKEND',catalogOrigin:'GLOBAL',adjudicationClass:'EFFECTIVE_WORK',selectable:true}},
  forbiddenAdjacentMatchers:[/hydrotest|road-marking|doka|elecor|asphalt/iu],owner:'ROOT_SINGLE_INTEGRATOR_MANUAL_TRENCH05701',receiptFileStem:'manual_trench05701_actual_bank_m3_r1',
  verifyCore:async()=>{assert.equal(sha(readFileSync(artifactPath)),pack.source.sha256);assert.deepEqual(d.parameters.map(p=>p.ordinal),Array.from({length:18},(_,i)=>i));assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:completeness,formulaDefinitions:d.formulas,resourceDefinitions:d.resources}),[]);
   const sources=resolveMasterAppendExplicitParameterSourcesR1(cfg,{parameters:d.parameters,formulas:d.formulas,resources:d.resources})!;assert.equal(Object.keys(sources).length,18);for(const p of d.parameters)assert.deepEqual(sources[p.parameter_id],p.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM'?[]:[pack.sourceKeyProposal]);
   const compile=(submittedParameters:Json,rowOverrides:Parameters<typeof compileCanonicalEstimateCore>[0]['rowOverrides']={})=>compileCanonicalEstimateCore({operation:'recalculate',catalogId,compilerVersion:cfg.contract,primaryMeasureParameterId:primary,parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],submittedParameters,confirmedParameters:{},rowOverrides,priceItems:[],currencyCode:'KGS',maximumResourceRows:10,hashJson:async x=>estimateDeterministicHash(x)});
   const result=await compile(facts());assert.deepEqual(result.rows.map(r=>r.quantity),['118']);assert.deepEqual(result.preliminaryNeeds.map(n=>n.row_id).sort(),[...needs].sort());assert.deepEqual(result.rows.filter(r=>r.included_in_estimate).map(r=>r.row_id),[owner]);assert(result.rows.every(r=>r.unit_price===null&&!r.included_in_procurement));
   const controlled=await compile(facts('12.5'),{[owner]:{unitPrice:'77',titleRu:'CONTROL_ONLY not an actual contractor quote',provenance:{kind:'manual',reason:'TEST_ONLY CONTROL77'}}});assert.equal(controlled.rows[0]!.quantity,'14.75');assert.equal(controlled.totals.amount,'1135.75');assert.equal(controlled.preliminaryNeeds.length,9);
   return {status:'PASS_SOURCE_SPECIFIC_PARTIAL_MANUAL_TRENCH05701_CORE_ONLY',shape:[18,10,10],normativeBindings:1,baselineSources:{KNOWN:9,UNRESOLVED:9},priceBindings:0,machinePaidOwners:0,purchaseOwners:0,fullTechnicalAcceptance:false,newCompleteTypesAccepted:0,publicationPerformed:false};
  }};
 assert(resolveMasterAppendExplicitParameterSourcesR1(cfg,{parameters:d.parameters,formulas:d.formulas,resources:d.resources}),'TRENCH05701_EXPLICIT_MAP_REQUIRED');assert(!cfg.sourcePaths.some(path=>resolve(R,path)===pointerPath),'MUTABLE_POINTER_MUST_NOT_ENTER_SOURCE_PATHS');return cfg;
}
