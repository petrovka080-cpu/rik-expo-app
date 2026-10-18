// WORK proposal only. Formal ROOT decision/current context and exact-count1 common gate are deferred.
// Existing Master owns all preflight, locked reread, SQL, append, baseline and search persistence.
import {strict as assert} from 'node:assert';
import {createHash} from 'node:crypto';
import {readFileSync,realpathSync,statSync} from 'node:fs';
import {resolve,relative,isAbsolute} from 'node:path';
import {execFileSync} from 'node:child_process';
import {type MasterSingleDefinitionSuccessorConfig,resolveMasterAppendExplicitParameterSourcesR1,
 validateIndependentCompletenessMapReferences} from './prepareMasterSingleDefinitionSuccessorR1';
import {roadMarking01601AdmittedDefinitionR1,roadMarking01601ExplicitParameterSourcesR1,
 roadMarking01601RootDecisionStatusR1,type RoadMarking01601RootScopeR1,
 roadMarking01601CatalogIdR1 as catalogId,roadMarking01601WorkKeyR1 as workKey,
 roadMarking01601SourceIdentityR1 as sourceIdentity,roadMarking01601GroupIdR1 as groupId} from '../../../src/lib/estimate/v4/roadMarking01601AdmittedR1';
import {roadMarking01601QuantityPackR1 as pack,roadMarking01601PrefixR1 as prefix,
 roadMarking01601PrimaryR1 as primary,roadMarking01601FactIdsR1 as factIds,roadMarking01601NeedRowIdsR1 as needs,
 roadMarking01601ScenarioFactsR1 as facts,roadMarking01601IndependentCompletenessMapR1} from '../../../src/lib/estimate/v4/roadMarkingContinuous100Pf133QuantityR1';
import {compileCanonicalEstimateCore} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash} from '../../../src/lib/estimate/estimateDeterministicHash';
type Json=Record<string,any>;
export type Road01601ExactPinR1=Readonly<{path:string;sha256:string}>;
const R='C:/dev/rik-expo-app-r4a5-dc4f0ce7';
const pointerPath=resolve(R,'data/estimate-benchmarks/r568-local-developer-canonical-release.json');
const pair={definitionReleaseId:'8b09255d-82a5-501b-9b60-e70587ff5579',searchReleaseId:'c8331c4b-dad5-5402-8c8e-2474df83d4ff'};
const guardPath=resolve(R,'scripts/estimate/r4a13/masterSingleDefinitionAppendGuardsR1.ts');
const groupPin='074ece84478be854a9077e28d1b1639af14505a4f6ed2a71e47798883e8ebbaf';
const bodyPin='deae249b7687926ac82f5f14cdc47e8c3bbe8b5927747fa6d412ffbc88badcaa';
const headersPin='f56aab6a2665922d2fba99c23a001035c67cde121b57cf7e410f4a5e1680cfdc';
const applyPin='83a1a638e6b0e891d1b2a384592462bb5f484a15fafaf56a856cbbf4db136aac';
const readbackPin='fd2bf871d56d7ae021dcf6287d740f519cd24748ff1fb9f8bb7f4bd35a26eb5a';
const sha=(value:string|Uint8Array)=>createHash('sha256').update(value).digest('hex');
const canonical=(path:string)=>{const actual=realpathSync.native(resolve(path)),rel=relative(realpathSync.native(R),actual);
 assert(rel!==''&&!rel.startsWith('..')&&!isAbsolute(rel),'ROAD01601_PORTABLE_CANONICAL_PROOF_REQUIRED');return actual;};
function exact(pin:Road01601ExactPinR1):Json{
 assert(pin&&typeof pin.path==='string'&&/^[a-f0-9]{64}$/u.test(pin.sha256),'ROAD01601_EXPLICIT_PIN_REQUIRED');
 const path=canonical(pin.path);assert(statSync(path).size<=3*1024*1024,'ROAD01601_PROOF_3MIB_CAP');
 const bytes=readFileSync(path);assert.equal(sha(bytes),pin.sha256,'ROAD01601_PROOF_BYTES_CHANGED');return JSON.parse(bytes.toString('utf8'));
}
const pairOf=(x:Json)=>({definitionReleaseId:x.releaseId,searchReleaseId:x.searchReleaseId});
const contextPair=(x:Json)=>({definitionReleaseId:x.definitionReleaseId,searchReleaseId:x.searchReleaseId});
function rows(read:Json,key:string):Json[]{const set=read.sets[key];assert(set&&Array.isArray(set.rawRows));assert.equal(set.rowCount,set.rawRows.length);
 assert.equal(sha(set.rawRows.join('\n')+(set.rawRows.length?'\n':'')),set.sha256);return set.rawRows.map((raw:string)=>JSON.parse(raw));}
const memberProjection=(x:Json)=>({catalogId:x.catalogId,ordinal:x.ordinal,definitionVersionId:x.definitionVersionId,
 approvedTemplateBaselineId:x.approvedTemplateBaselineId,definitionSha256:x.definitionSha256,sourceIdentity:x.sourceIdentity,workKey:x.workKey,searchGroupId:x.searchGroupId});
/** Pure validation of the proposed future ROOT decision schema. Not file admission by itself. */
export function assertRoad01601RootDecisionR1(decision:Json):void{
 assert.equal(decision.contract,'road-marking01601-root-partial-append-decision/r1');
 assert.equal(decision.status,roadMarking01601RootDecisionStatusR1);assert.equal(decision.decision,'ADMIT_SOURCE_SPECIFIC_PARTIAL_APPEND');
 assert.deepEqual(decision.identity,{catalogId,workKey,sourceIdentity});
 assert.deepEqual(decision.source,{sourceKey:pack.sourceKeyProposal,normId:pack.normId,artifactSha256:pack.source.sha256,
  primaryMeasureParameterId:primary,primaryUnitId:'km',sourceDenominator:1});
 assert.deepEqual(decision.searchPlacement,{groupMode:'join',groupId,domainId:'transport',systemId:'transport',membershipOrdinal:1,capturedMemberCount:1});
 assert.deepEqual(decision.sourcePreimage,{sourceKey:pack.sourceKeyProposal,expected:null});
 assert.equal(decision.titleRu,'Нанесение сплошной разметки шириной 100 мм эмалью ПФ-133 тёмно-серой');
 assert.deepEqual(decision.captureScope,{contract:'master-bounded-join-group-capture/r1',memberCount:1,maxMembers:32,captureSha256:groupPin});
 assert.deepEqual(decision.shape,[17,16,16]);assert.equal(decision.normativeBindings,6);assert.equal(decision.priceBindings,0);
 assert.deepEqual(decision.parameterSources,{known:7,unresolvedEmpty:10,derivedEmpty:0});
 assert.deepEqual(decision.paidOwnerRowIds,[prefix+':whole-marking-labor']);
 assert.deepEqual(decision.informationalSourceRowIds,pack.rows.slice(1).map(r=>prefix+':'+r.suffix));
 assert.deepEqual(decision.applicationNeedRowIds,[...needs]);assert.deepEqual(decision.machinePriceMappings,[]);assert.deepEqual(decision.purchaseOwners,[]);
 for(const [key,value] of Object.entries({quantityScope:'PARTIAL',technicalScopeStatus:'NEEDS_SOURCE',fullTechnicalAcceptance:false,
  newCompleteTypesAccepted:0,productionEligible:false,activationAllowed:false,genericRoadMarkingAlreadyExists:true,
  globalPhysicalAbsenceProved:false,otherFourInstallBodies:'HEADER_ONLY_NOT_EXCLUDED',old128RowsDisposition:'KEEP_CURRENT_EXACT'}))assert.equal(decision[key],value,'ROAD01601_ROOT_SCOPE:'+key);
 assert.deepEqual(contextPair(decision.acceptedParent),pair,'ROAD01601_NO_AUTOMATIC_PARENT_REBASE');
 assert.equal(decision.commonGroupGuardStatus,'ROOT_REVIEWED_EXISTING_APPEND_GUARD_EXACT_ROAD_COUNT1_AND_LEGACY4_R2');
 assert(decision.commonGroupGuardPin&&/^[a-f0-9]{64}$/u.test(decision.commonGroupGuardPin.sha256),'ROAD01601_ROOT_ACCEPTED_COUNT1_GUARD_PIN_REQUIRED');
 // The known count4-only preimage cannot authorize this exact1 profile, even if copied into a decision.
 assert.notEqual(decision.commonGroupGuardPin.sha256,'8fe83695ae2e8b2f524359b8ea9b0f30360d1c35d26d01eb27ee0e5ef81648e7','ROAD01601_EXACT_COUNT1_COMMON_GUARD_NOT_ADOPTED');
}
export function loadRoad01601RootAdmissionR1(rootDecisionPin:Road01601ExactPinR1){
 const decision=exact(rootDecisionPin);assertRoad01601RootDecisionR1(decision);
 assert.equal(canonical(decision.commonGroupGuardPin.path),realpathSync.native(guardPath));
 assert.equal(sha(readFileSync(guardPath)),decision.commonGroupGuardPin.sha256,'ROAD01601_CURRENT_COMMON_GUARD_CHANGED');
 const expected={headers:headersPin,bodies:bodyPin,groupSource:groupPin};
 assert.deepEqual(Object.keys(decision.readPins).sort(),Object.keys(expected).sort());
 for(const [key,value] of Object.entries(expected))assert.equal(decision.readPins[key].sha256,value);
 const headers=exact(decision.readPins.headers),bodies=exact(decision.readPins.bodies),read=exact(decision.readPins.groupSource);
 for(const evidence of [headers,bodies,read]){assert.equal(evidence.completeReadSet,true);assert.equal(evidence.transactionRolledBack,true);assert.equal(evidence.connectionClosed,true);assert.equal(evidence.error,null);assert.equal(evidence.appJobs,false);}
 assert.equal(read.status,'PASS_ROAD_MARKING_CURRENT_GROUP_AND_EXACT_SOURCE_IDENTITY_PREIMAGE_V4');assert.equal(read.databaseWritesPerformed,false);
 assert.deepEqual(contextPair(read.executionContext),pair);assert.equal(read.executionContext.sourceHead,'a9be73e0cd12afcdeeda94e24b77f14027279052');
 assert.equal(read.actualGroupMemberCount,1);assert.equal(read.nextTailOrdinal,1);assert.equal(read.globalAbsenceProved,false);
 const header=rows(read,'groupMetadata');assert.equal(header.length,1);const group=header[0]!;
 assert.equal(group.search_release_id,pair.searchReleaseId);assert.equal(group.group_id,groupId);assert.equal(group.member_count,1);assert.equal(group.actual_member_count,1);
 const anchors=rows(read,'fullCurrentGroupAnchors');assert.equal(anchors.length,1);const h=anchors[0]!;
 assert.equal(h.catalogId,'canonical-work:expanded:road_marking');assert.equal(h.ordinal,0);
 assert.equal(h.definitionVersionId,'e7c6bf81-fa1d-50f2-8c17-8d0caeff2295');assert.equal(h.approvedTemplateBaselineId,'97e88f6b-0492-5088-ac94-52158ad7c047');
 assert.equal(h.definitionSha256,'c21a23f286389e1d697f06a6384ea388ac84930792cea48e8947a281d5727616');
 assert.equal(h.actual_definition_id,h.definitionVersionId);assert.equal(h.definition_sha256,h.definitionSha256);assert.equal(h.actual_baseline_id,h.approvedTemplateBaselineId);
 assert.equal(h.baseline_definition_id,h.definitionVersionId);assert.equal(h.baseline_catalog_id,h.catalogId);assert.equal(h.retired_at,null);
 assert.equal(h.search_definition_release_id,pair.definitionReleaseId);assert.equal(h.search_definition_id,h.definitionVersionId);assert.equal(h.searchGroupId,groupId);
 for(const key of ['exactProposedIdentityCollisions','exactProposedNormativeSourcePreimage','exactProposedDefinitionCollisions'])assert.deepEqual(rows(read,key),[]);
 const capturedMembers={groupId,members:anchors.map(memberProjection)};assert.deepEqual(read.capturedJoinGroupMembers,capturedMembers);
 const capturedJoinGroupMembers={...capturedMembers,captureScope:{contract:'master-bounded-join-group-capture/r1' as const,memberCount:1,maxMembers:32 as const,captureSha256:groupPin}};
 const scope:RoadMarking01601RootScopeR1={contractVersion:'road-marking01601-root-scope-provenance/r1',rootDecisionStatus:roadMarking01601RootDecisionStatusR1,
  rootDecisionSha256:rootDecisionPin.sha256,groupSourceCaptureSha256:groupPin,sourceArtifactSha256:pack.source.sha256,bodyReadSha256:bodyPin,quantityScope:'PARTIAL'};
 return {decision,scope,group,capturedJoinGroupMembers,evidencePaths:Object.values(decision.readPins).map((pin:any)=>canonical(pin.path))};
}
/** Proposed ROOT-sealed parent descriptor: actual Paving raw schemas/pins are known; fresh current context remains deferred. */
export function loadRoad01601ActualPavingParentR1(rootParentSealPin:Road01601ExactPinR1){
 const seal=exact(rootParentSealPin);assert.equal(seal.contract,'root-sealed-actual-paving-parent-for-road01601/r1');
 assert.equal(seal.status,'ROOT_SEALED_ACTUAL_PAVING_APPLY_READBACK_CURRENT_CONTEXT_FOR_ROAD01601_R1');
 assert.equal(seal.applyPin.sha256,applyPin);assert.equal(seal.readbackPin.sha256,readbackPin);
 const p=exact(seal.applyPin),readback=exact(seal.readbackPin),context=exact(seal.currentContextPin);
 assert.equal(p.status,'GREEN_PAVING_STATIONARY_CUT70_R2_PREPARED_NOT_ACTIVE');assert.equal(p.mutationPerformed,true);assert.equal(p.idempotent,false);
 assert.equal(p.predecessor.targetAbsentForAppend,true);assert.equal(p.predecessor.catalogId,'canonical-work:master:paving_tile_stationary_cut_70mm_actual_linear_m_krer27_07_005_04');
 assert.deepEqual(pairOf(p.predecessor),{definitionReleaseId:'975c1da2-fa72-5a0d-8941-283f7ad933e6',searchReleaseId:'5701b1c0-667e-5c38-8737-baa655316b05'});
 assert.deepEqual(pairOf(p.successor),pair);assert.deepEqual(p.successor.shape,[12,10,10]);assert.equal(p.audit.unrelatedManifestChanges,0);
 assert.equal(p.source.head,'d537e532a26c6a089f479450db1391b23214c883');assert.equal(p.source.tree,'7a4e14ad4c83582287ece231433b9a436a28b32b');assert.equal(p.source.hashedDirtySourceAccepted,false);
 assert.equal(readback.contract,'paving-independent-append-readback/v4');assert.equal(readback.status,'PASS_PAVING_APPEND_APPLY_EIGHT_PAYLOAD_DOKA_SAVED15_AND10467_V4');
 assert.equal(readback.phase,'apply');assert.equal(readback.publicationResultSha256,applyPin);assert.equal(readback.sourceHead,p.source.head);assert.equal(readback.actualQueryHead,p.source.head);
 assert.deepEqual(readback.actualReceiptSuccessor,p.successor);assert.equal(readback.completeReadSet,true);assert.equal(readback.error,null);
 assert.equal(readback.databaseWrites,false);assert.equal(readback.appJobs,false);assert.equal(readback.publicationAllowed,false);
 assert.equal(readback.allTransactionsRolledBack,true);assert.equal(readback.allConnectionsClosed,true);
 assert.deepEqual(readback.preservation.unrelatedManifestMappings,{parent_count:10467,successor_count:10468,parent_target_count:0,successor_target_count:1,unrelated_count:10467,unrelated_changed:0});
 assert.deepEqual(readback.newState,{definitionId:p.successor.definitionId,baselineId:p.successor.baselineId,shape:[12,10,10],bindings:4,priceBindings:0,staticNeeds:6});
 // Full payload is separately byte-pinned by the accepted non-monolithic readback; no truncation or second snapshot claim.
 assert.equal(readback.payloadResultPin.sha256,'d500525be348ae63e08f5fe7bd334527bd1b4a78b64d2dae790e62f60b6c4e17');
 assert.equal(seal.payloadPin.sha256,readback.payloadResultPin.sha256);assert.equal(statSync(canonical(seal.payloadPin.path)).size,readback.payloadResultPin.bytes);exact(seal.payloadPin);
 assert.deepEqual(Object.keys(context).sort(),['executionContext','pointer','proofPins','releaseSourceTree','status']);
 assert(typeof context.status==='string'&&context.status.startsWith('ROOT_VERIFIED_'));
 const current=context.executionContext;assert.deepEqual(Object.keys(current).sort(),['definitionReleaseId','recordedReleaseSourceCommit','searchReleaseId','sourceHead']);
 assert.deepEqual(contextPair(current),pair,'ROAD01601_PARENT_CHANGED_REQUIRES_EXPLICIT_ROOT_SUCCESSOR');assert.equal(current.recordedReleaseSourceCommit,p.source.head);assert.equal(context.releaseSourceTree,p.source.tree);
 const git=(...args:string[])=>execFileSync('git',args,{cwd:R,encoding:'utf8',windowsHide:true,maxBuffer:65536}).trim();
 assert.equal(realpathSync.native(process.cwd()),realpathSync.native(R));assert.equal(git('rev-parse','HEAD'),current.sourceHead);
 execFileSync('git',['merge-base','--is-ancestor',current.recordedReleaseSourceCommit,current.sourceHead],{cwd:R,windowsHide:true,maxBuffer:65536});
 assert.equal(git('rev-parse',current.recordedReleaseSourceCommit+'^{tree}'),context.releaseSourceTree);
 const pointer=exact(context.pointer);assert.equal(canonical(context.pointer.path),realpathSync.native(pointerPath));
 assert.deepEqual(contextPair(pointer),pair);assert.equal(pointer.currentRuntimeDefinitions,10468);assert.equal(pointer.definitionReleaseStatus,'prepared');assert.equal(pointer.searchReleaseStatus,'draft');assert.equal(pointer.productionAccessed,false);
 assert(Array.isArray(context.proofPins)&&context.proofPins.length>=1&&context.proofPins.length<=8);for(const pin of context.proofPins)exact(pin);
 return {pair,context,evidencePaths:[rootParentSealPin.path,seal.applyPin.path,seal.readbackPin.path,seal.payloadPin.path,seal.currentContextPin.path,...context.proofPins.map((pin:any)=>pin.path)].map(canonical)};
}
export function prepareRoadMarking01601AdmittedMasterAppendR1(input:Readonly<{rootDecisionPin:Road01601ExactPinR1;rootParentSealPin:Road01601ExactPinR1}>):MasterSingleDefinitionSuccessorConfig{
 const admission=loadRoad01601RootAdmissionR1(input.rootDecisionPin),parent=loadRoad01601ActualPavingParentR1(input.rootParentSealPin);
 const d=roadMarking01601AdmittedDefinitionR1(admission.scope),group=admission.group,completeness=roadMarking01601IndependentCompletenessMapR1();
 const bound=pack.rows.map(row=>prefix+':'+row.suffix);
 const included=['Только отдельно измеренная фактическая длина сплошной линии 100 мм в км, буквальная ПФ-133 тёмно-серая, 27-09-016-01.',
  'Очистка от пыли и грязи, отбивка шнуром и нанесение линии входят в цельную норму труда 3,66 чел.-ч/км; труд не дробится.',
  'Машинисты — 2,04 чел.-ч/км, машины — 1,01 и 1,03 маш.-ч/км, эмаль — 0,042 т/км, шнур — 0,0008 т/км: только справочно. Десять потребностей остаются открытыми.'];
 const excluded=[...pack.excludedRu,'В существующих стандартном и расширенном профилях сохраняются все 59 и 69 строк, их цены, исключения, единицы и история. При совместном заказе требуется явная сверка границ общей оплаты, в том числе при неизвестной цене.'];
 const cfg:MasterSingleDefinitionSuccessorConfig={contract:'gox-build.road-marking01601-continuous100-pf133-actual-line-km-append/r1',stopCode:'ROAD_MARKING01601_ACTUAL_KM_R1',applicationName:'road01601-source-specific-partial',
  expectedBranch:'codex/r4-a5-clean-08b18902',masterPath:'C:/Users/User/Downloads/MASTER_TZ_GOX_BUILD_PRODUCTION (11).md',masterSha256:'dfbb757a1562962636259c1c4cffd9127d15882b00cdd49baa8fcd4831bcacf2',
  parentReleaseId:parent.pair.definitionReleaseId,parentSearchReleaseId:parent.pair.searchReleaseId,currentReleasePath:pointerPath,outputRoot:resolve(R,'.release-runtime/r568/next-wave/road-marking01601/publication'),
  sourcePaths:['scripts/estimate/r4a13/prepareRoadMarking01601AdmittedMasterAppendR1.ts','src/lib/estimate/v4/roadMarking01601AdmittedR1.ts','src/lib/estimate/v4/roadMarking01601AdmittedR1.test.ts',
   'src/lib/estimate/v4/roadMarkingContinuous100Pf133QuantityR1.ts','src/lib/estimate/v4/roadMarkingContinuous100Pf133QuantityR1.test.ts','data/estimate-benchmarks/source-packs/road-marking-continuous100-pf133-quantity-r1.json',
   'scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts','scripts/estimate/r4a13/masterSingleDefinitionAppendGuardsR1.ts','scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1.ts',
   'scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts','src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts',pack.source.localArtifact,
   canonical(input.rootDecisionPin.path),...admission.evidencePaths,...parent.evidencePaths],
  catalogId,sourceId:pack.sourceKeyProposal,normId:pack.normId,sourceMetadata:{source_title:pack.source.titleRu,source_authority:'Министерство строительства Кыргызской Республики, КРЕР27-2015',source_kind:'OFFICIAL_NORM_EXACT_SINGLE_COLUMN_PARTIAL',
   official_url:pack.source.officialUrl,artifact_sha256:pack.source.sha256,exact_locator:pack.source.locatorRu,use_restriction:included.join(' ')+' '+excluded.join(' ')},
  parameterDefinitions:d.parameters,formulaDefinitions:d.formulas,resourceDefinitions:d.resources,shortInput:{[primary]:'1'},acceptanceInput:facts(),runtimeProfileInput:{},runtimeProfileClassification:{},runtimeProfileSourceIds:{},
  expectedParentShape:[0,0,0],benchmarkOrdinal:0,validationScenario:'ROAD_MARKING01601_SINGLE_ACTUAL_LINE_KM_PARTIAL_SIX_SOURCE_TEN_NEEDS',
  passport:{canonicalRuName:admission.decision.titleRu,workKey,physicalResultRu:'Сплошная линия 100 мм по фактической ведомости; продукт, условия, закупка и десять частей полного цикла требуют подтверждения.',includedScopeRu:included,excludedScopeRu:excluded,
   independentCompletenessMap:completeness,unresolvedApplicableResourceRowIds:needs},
  applicability:{primaryMeasureParameterId:primary,primaryUnitId:'km',quantityScope:'PARTIAL',exactColumn:'27-09-016-01',lineWidthMm:100,lineType:'CONTINUOUS',literalPaintSystem:'PF133_DARK_GREY_LITERAL',actualPaintedLineKmOnly:true,
   rootDecisionSha256:input.rootDecisionPin.sha256,parentSealSha256:input.rootParentSealPin.sha256,fullTechnicalAcceptance:false,newCompleteTypesAccepted:0,genericRoadMarkingAlreadyExists:true,globalPhysicalAbsenceProved:false,machinePriceAdmission:false,purchaseOrderAdmission:false},
  binding:{rowId:bound[0]!,additionalRowIds:bound.slice(1),applicability:{exactColumn:'27-09-016-01',sourceVolumeParameterId:primary,sourceQuantityDenominatorKm:1,lineWidthMm:100,lineType:'CONTINUOUS',literalPaintSystem:'PF133_DARK_GREY_LITERAL',resourceInclusionOwnsApplicability:true,
   sourceArtifactSha256:pack.source.sha256,machinePriceAdmission:false,purchaseOrderAdmission:false,applicationNeedsBound:false,fullTechnicalAcceptance:false}},
  locator:{key:'krer27-09-016-01-continuous100-pf133-darkgrey-actual-line-km-r1',payload:{exactColumn:'27-09-016-01',sourceArtifactSha256:pack.source.sha256,sourceRowsOnly:bound,applicationNeedsUnbound:pack.openNeeds,cordResourceCode:null,
   literalResourceCodes:pack.rows.map(r=>r.resourceCode),rootDecisionSha256:input.rootDecisionPin.sha256}},
  search:{primaryUom:'км',canonicalNameRu:admission.decision.titleRu,aliases:['Сплошная дорожная разметка 100 мм — буквальная ПФ-133 тёмно-серая','КРЕР27-09-016-01: фактический км линии'],shortScopeRu:'Частичный состав исходной нормы на отдельно измеренный км сплошной линии 100 мм; десять незакрытых потребностей.',
   keyDistinguishingParameters:[primary,...factIds],clarificationFields:[...factIds],includedBoundaries:included,excludedBoundaries:excluded,extraSearchTermsRu:'благоустройство дорожная разметка сплошная линия 100 мм ПФ-133 тёмно-серая фактический км',
   sourceProvenance:{rootDecisionSha256:input.rootDecisionPin.sha256,actualPavingParentSealSha256:input.rootParentSealPin.sha256,quantityScope:'PARTIAL',fullTechnicalAcceptance:false,globalPhysicalAbsenceProved:false}},
  catalogAppend:{requireUniqueWorkKey:true,explicitParameterSources:roadMarking01601ExplicitParameterSourcesR1(),capturedSourcePreimage:{sourceKey:pack.sourceKeyProposal,expected:null},capturedJoinGroupMembers:admission.capturedJoinGroupMembers,
   identity:{namespace:'global',domain:'transport',sourceIdentity,workKey,titleRu:admission.decision.titleRu,denominatorEligible:true},
   searchPlacement:{groupMode:'join',groupId,groupNameRu:group.group_name_ru,domainId:group.domain_id,systemId:group.system_id,subsystemId:group.subsystem_id,assemblyId:group.assembly_id,workFamilyId:group.work_family_id,breadcrumb:group.breadcrumb,
    groupOracleDisposition:group.oracle_disposition,membershipOrdinal:1,independentDisposition:{contract:'road-marking01601-root-partial-append-decision/r1',rootDecisionSha256:input.rootDecisionPin.sha256,classification:'CANONICAL_VISIBLE',sourceSpecificPhysicalProfile:true,newCompleteTypesAccepted:0},
    elementType:'WORK',operationKind:'OTHER',technologyVariant:'KRER27_09_016_01_CONTINUOUS100_PF133_DARKGREY_ACTUAL_LINE_KM',constructionState:'PROJECT_CONFIRMED_PAVEMENT_LITERAL_PF133_DARKGREY',normativeClassifiers:['КРЕР27-09-016-01'],
    applicabilityTags:['ROAD_MARKING','CONTINUOUS_100MM','PF133_DARK_GREY_LITERAL','ACTUAL_PAINTED_LINE_KM','PARTIAL_QUANTITY','MACHINES_INFO_ONLY','MATERIAL_CONSUMPTION_INFO_ONLY'],publicationState:'ADMITTED_BACKEND',catalogOrigin:'GLOBAL',adjudicationClass:'EFFECTIVE_WORK',selectable:true}},
  forbiddenAdjacentMatchers:[/thermoplastic|white-reflective|cm11|ce40|doka|elecor/iu],owner:'ROOT_SINGLE_INTEGRATOR_ROAD_MARKING01601',receiptFileStem:'road_marking01601_continuous100_actual_line_km_r1',
  verifyCore:async()=>{assert.equal(sha(readFileSync(resolve(R,pack.source.localArtifact))),pack.source.sha256);
   assert.deepEqual(d.parameters.map(p=>p.ordinal),Array.from({length:17},(_,i)=>i));assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:completeness,formulaDefinitions:d.formulas,resourceDefinitions:d.resources}),[]);
   const sources=resolveMasterAppendExplicitParameterSourcesR1(cfg,{parameters:d.parameters,formulas:d.formulas,resources:d.resources})!;
   assert.equal(Object.keys(sources).length,17);for(const p of d.parameters)assert.deepEqual(sources[p.parameter_id],p.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM'?[]:[pack.sourceKeyProposal]);
   const result=await compileCanonicalEstimateCore({operation:'compile',catalogId,compilerVersion:cfg.contract,primaryMeasureParameterId:primary,parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],
    submittedParameters:facts(),confirmedParameters:{},rowOverrides:{},priceItems:[],currencyCode:'KGS',maximumResourceRows:16,hashJson:async value=>estimateDeterministicHash(value)});
   assert.deepEqual(result.rows.map(r=>r.quantity),['3.66','2.04','1.01','1.03','0.042','0.0008']);assert.deepEqual(result.preliminaryNeeds.map(n=>n.row_id).sort(),[...needs].sort());
   assert.deepEqual(result.rows.filter(r=>r.included_in_estimate).map(r=>r.row_id),[prefix+':whole-marking-labor']);assert(result.rows.every(r=>r.unit_price===null&&!r.included_in_procurement));
   return {status:'PASS_SOURCE_SPECIFIC_PARTIAL_ROAD_MARKING01601_CORE_ONLY',shape:[17,16,16],normativeBindings:6,baselineSources:{KNOWN:7,UNRESOLVED:10},priceBindings:0,machinePaidOwners:0,purchaseOwners:0,fullTechnicalAcceptance:false,newCompleteTypesAccepted:0,publicationPerformed:false};
  }};
 assert(resolveMasterAppendExplicitParameterSourcesR1(cfg,{parameters:d.parameters,formulas:d.formulas,resources:d.resources}),'ROAD01601_EXPLICIT_MAP_REQUIRED');
 assert(!cfg.sourcePaths.some(path=>resolve(R,path)===pointerPath),'MUTABLE_POINTER_MUST_NOT_ENTER_SOURCE_PATHS');return cfg;
}
