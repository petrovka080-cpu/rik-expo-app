// WORK R2. Only ROOT-pinned actual decisions/proofs can produce a config for the existing Master writer.
// Requires separately accepted explicit append source mapper. No PG/CLI/writer/callback launcher.
import {strict as assert} from 'node:assert';
import {createHash} from 'node:crypto';
import {readFileSync,realpathSync,statSync} from 'node:fs';
import {resolve,relative,isAbsolute} from 'node:path';
import {execFileSync} from 'node:child_process';
import {type MasterSingleDefinitionSuccessorConfig,resolveMasterAppendExplicitParameterSourcesR1,
 validateIndependentCompletenessMapReferences} from './prepareMasterSingleDefinitionSuccessorR1';
import {pavingCut70AdmittedDefinitionR2,pavingCut70RootDecisionStatusR2,type PavingCut70RootScopeR2} from '../../../src/lib/estimate/v4/pavingCut70AdmittedR2';
import {pavingCut70AcceptanceInputR1,pavingCut70OpenNeedIdsR1,pavingCut70IndependentCompletenessMapR1,
 pavingCut70CatalogIdProposalR1 as catalogId,pavingCut70WorkKeyProposalR1 as workKey,pavingCut70SourceIdentityProposalR1 as sourceIdentity} from '../../../src/lib/estimate/v4/pavingCut70ConditionalAppendConsumerR1';
import {pavingCutStationary70QuantityPackR1 as pack,pavingCutStationary70PrefixR1 as prefix,pavingCutStationary70PrimaryR1 as primary} from '../../../src/lib/estimate/v4/pavingCutStationary70QuantityR1';
import {compileCanonicalEstimateCore} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash} from '../../../src/lib/estimate/estimateDeterministicHash';
type Json=Record<string,any>;
export type PavingCut70ExactPinR2=Readonly<{path:string;sha256:string}>;
const R='C:/dev/rik-expo-app-r4a5-dc4f0ce7',pointerPath=resolve(R,'data/estimate-benchmarks/r568-local-developer-canonical-release.json');
const groupId='wg:expanded:sidewalks',groupNameRu='Дороги, транспорт и площадки: устройство тротуаров';
const sha=(b:string|Uint8Array)=>createHash('sha256').update(b).digest('hex');
const canonicalFile=(p:string)=>{const actual=realpathSync.native(resolve(p)),rel=relative(realpathSync.native(R),actual);
 assert(rel!==''&&!rel.startsWith('..')&&!isAbsolute(rel),'CUT70_PROOF_MUST_BE_PORTABLE_INSIDE_CANONICAL_ROOT');return actual;};
const exact=(pin:PavingCut70ExactPinR2,proofKind:'ROOT_PROOF'|'COMPLETE_DOKA_READBACK_R3'='ROOT_PROOF'):Json=>{
 assert(pin&&typeof pin.path==='string'&&/^[a-f0-9]{64}$/u.test(pin.sha256),'CUT70_EXPLICIT_FILE_PIN_REQUIRED');
 const p=canonicalFile(pin.path);
 // The only expanded file is the actual, complete, byte-pinned Doka readback.
 // Default ROOT proof JSON remains3MiB; no generic cap option or alias path.
 const completeDokaReadback=proofKind==='COMPLETE_DOKA_READBACK_R3';
 if(completeDokaReadback)assert.equal(pin.sha256,'fff4125ee4e148604663f6347d66cb778a41f1fb050084c95042a044109d711c','CUT70_ACTUAL_FULL_DOKA_READBACK_PIN_REQUIRED');
 assert(statSync(p).size<=(completeDokaReadback?6:3)*1024*1024,'CUT70_PROOF_JSON_CAP');
 const bytes=readFileSync(p);assert.equal(sha(bytes),pin.sha256,'CUT70_EXACT_PROOF_PIN:'+p);return JSON.parse(bytes.toString('utf8'));
};
const pair=(p:Json)=>({definitionReleaseId:p.releaseId,searchReleaseId:p.searchReleaseId});
const actualPair=(p:Json)=>({definitionReleaseId:p.definitionReleaseId,searchReleaseId:p.searchReleaseId});
const readRows=(r:Json,set:string):Json[]=>{const s=r.sets[set];assert(s&&Array.isArray(s.rawRows));assert.equal(s.rowCount,s.rawRows.length);
 assert.equal(sha(s.rawRows.join('\n')+(s.rawRows.length?'\n':'')),s.sha256);return s.rawRows.map((raw:string)=>JSON.parse(raw) as Json);};
const assertClosedRead=(r:Json)=>{assert.equal(r.completeReadSet,true);assert.equal(r.transactionRolledBack,true);assert.equal(r.connectionClosed,true);assert.equal(r.error,null);assert.equal(r.databaseWrites,false);assert.equal(r.appJobs,false);};
/** ROOT supplies this exact literal decision file after its bounded review; no approval boolean. */
export function loadPavingCut70RootAdmissionR2(rootDecisionPin:PavingCut70ExactPinR2){
 const decision=exact(rootDecisionPin);
 assert.equal(decision.contract,'paving-cut70-root-partial-append-decision/r2');
 assert.equal(decision.status,pavingCut70RootDecisionStatusR2);assert.equal(decision.decision,'ADMIT_SOURCE_SPECIFIC_PARTIAL_APPEND');
 assert.deepEqual(decision.identity,{catalogId,workKey,sourceIdentity});
 assert.deepEqual(decision.source,{sourceKey:pack.sourceKeyProposal,normId:pack.normId,artifactSha256:pack.source.sha256,
  primaryMeasureParameterId:primary,primaryUnitId:'m',sourceDenominator:1});
 assert.deepEqual(decision.searchPlacement,{groupMode:'join',groupId,domainId:'transport',systemId:'transport',membershipOrdinal:4});
 assert.deepEqual(decision.sourcePreimage,{sourceKey:pack.sourceKeyProposal,expected:null});
 for(const [key,value] of Object.entries({quantityScope:'PARTIAL',technicalScopeStatus:'NEEDS_SOURCE',fullTechnicalAcceptance:false,
  newCompleteTypesAccepted:0,genericCutOperationAlreadyExists:true,genericWalkBodyFullySurveyed:false,globalPhysicalUniquenessProved:false,
  productionEligible:false,activationAllowed:false}))assert.equal(decision[key],value,'ROOT_EXACT_PARTIAL_SCOPE:'+key);
 assert.deepEqual(decision.paidOwnerRowIds,[prefix+':whole-cutting-labor']);
 assert.deepEqual(decision.informationalSourceRowIds,['operator-information','stationary-machine-consumed','diamond-disc-consumed'].map(x=>prefix+':'+x));
 assert.deepEqual([...decision.applicationNeedRowIds].sort(),[...pavingCut70OpenNeedIdsR1].sort());
 assert.deepEqual(decision.machinePriceMappings,[]);assert.equal(decision.discOrderOwner,null);
 const expected={headers:'2af0dc5dba38ba4f3fa08513a1b69db246e1e67b0eba660f9381dac385d6d88d',
  eight:'a97a72bb16628a7c5ea1748d168e355ba5aaad51d4a0ade329498c5ac0c6bbb6',
  group4:'b0c8f37eda9a1f40662e3b5afc98b107cd6e32eaf1f680ab53d83c9c2e1babeb'} as const;
 assert.deepEqual(Object.keys(decision.readPins).sort(),Object.keys(expected).sort());
 const reads:Record<string,Json>={};for(const [key,hash] of Object.entries(expected)){
  assert.equal(decision.readPins[key].sha256,hash);reads[key]=exact(decision.readPins[key]);assertClosedRead(reads[key]!);
 }
 const sources=readRows(reads.headers!,'exactTwoSourcePreimagesCurrentConsumers').filter(r=>r.source_key===pack.sourceKeyProposal);
 assert.equal(sources.length,1);assert.equal(sources[0]!.exact_source_count,0);assert.equal(sources[0]!.source_preimage,null);assert.equal(sources[0]!.current_consumer_count,0);
 const group=readRows(reads.group4!,'exactCurrentFourSidewalkMemberHeaders');assert.equal(group.length,4);
 const capturedJoinGroupMembers={groupId,members:group.map(h=>({catalogId:h.catalog_id,ordinal:h.ordinal,definitionVersionId:h.definition_version_id,
  approvedTemplateBaselineId:h.approved_template_baseline_id,definitionSha256:h.definition_sha256,sourceIdentity:h.source_identity,workKey:h.work_key,searchGroupId:h.search_group_id}))};
 const scope:PavingCut70RootScopeR2={contractVersion:'paving-cut70-root-scope-provenance/r2',rootDecisionStatus:pavingCut70RootDecisionStatusR2,
  rootDecisionSha256:rootDecisionPin.sha256,groupReadSha256:expected.group4,sourceArtifactSha256:pack.source.sha256,quantityScope:'PARTIAL'};
 return {decision,scope,capturedJoinGroupMembers,evidencePaths:Object.values(decision.readPins).map((p:any)=>canonicalFile(p.path))};
}
/** A ROOT-normalized sealed summary is created ONLY after the actual Doka readback.
 * This function verifies exact raw pins and ROOT's reviewed normalized facts; it
 * validates the now-actual exact raw readback schema as well. No field aliases. */
export function loadPavingCut70ActualDokaParentR2(rootParentSealPin:PavingCut70ExactPinR2){
 const seal=exact(rootParentSealPin);
 assert.equal(seal.contract,'root-sealed-actual-doka-parent-for-paving/r2');
 assert.equal(seal.status,'ROOT_SEALED_ACTUAL_DOKA_APPLY_READBACK_CURRENT_CONTEXT_FOR_PAVING_R2');
 assert.equal(seal.applyPin.sha256,'9fcac20fea0c009c7b8c9426c45447eb37196fb48ab73671a2b72fbc61390bfb','CUT70_ACTUAL_DOKA_APPLY_PIN_REQUIRED');
 const p=exact(seal.applyPin),rawReadback=exact(seal.readbackPin,'COMPLETE_DOKA_READBACK_R3'),context=exact(seal.currentContextPin);
 assert(rawReadback&&typeof rawReadback==='object'&&!Array.isArray(rawReadback),'EXACT_RAW_READBACK_JSON_REQUIRED');
 assert.deepEqual(Object.keys(context).sort(),['executionContext','pointer','proofPins','releaseSourceTree','status']);
 assert(typeof context.status==='string'&&context.status.startsWith('ROOT_VERIFIED_'));
 assert.equal(p.mutationPerformed,true);assert.equal(p.idempotent,false);assert.equal(p.predecessor.targetAbsentForAppend,false);
 assert.equal(p.predecessor.catalogId,'canonical-work:base:concrete_foundation_interior_stairs_concrete_form_standard');
 assert.equal(p.predecessor.definitionId,'f4d62d59-abe5-584a-8ab0-073ce5a713ea');assert.deepEqual(p.predecessor.shape,[188,92,95]);
 assert.deepEqual(pair(p.predecessor),{definitionReleaseId:'d3bc6c1a-e16d-5fcc-b36c-cc584a31c529',searchReleaseId:'c97fa9c9-338e-5c6a-8ce5-216deaa73176'});
 assert.deepEqual(p.successor.shape,[301,137,140]);assert.equal(p.audit.unrelatedManifestChanges,0);
 assert.equal(p.source.hashedDirtySourceAccepted,false);
 for(const field of ['productionAccessed','deployPerformed','activationPerformed','releasePerformed','otaPerformed'])assert.equal(p[field],false);
 const current=context.executionContext;
 assert(current&&typeof current==='object'&&!Array.isArray(current),'ROOT_CURRENT_EXECUTION_CONTEXT_REQUIRED');
 assert.deepEqual(Object.keys(current).sort(),['definitionReleaseId','recordedReleaseSourceCommit','searchReleaseId','sourceHead']);
 for(const key of ['definitionReleaseId','searchReleaseId'])assert(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/u.test(current[key]),'ROOT_ACTUAL_RELEASE_UUID:'+key);
 for(const key of ['sourceHead','recordedReleaseSourceCommit'])assert(/^[a-f0-9]{40}$/u.test(current[key]),'ROOT_ACTUAL_COMMIT:'+key);
 assert(/^[a-f0-9]{40}$/u.test(context.releaseSourceTree),'ROOT_ACTUAL_RELEASE_TREE');
 assert(Array.isArray(context.proofPins)&&context.proofPins.length>=1&&context.proofPins.length<=8,'ROOT_CURRENT_PROOF_PIN_COUNT');
 assert.deepEqual(actualPair(current),pair(p.successor),'SEALED_CURRENT_PAIR_MUST_BE_ACTUAL_DOKA_SUCCESSOR');
 assert.equal(current.recordedReleaseSourceCommit,p.source.head);assert.equal(context.releaseSourceTree,p.source.tree);
 const git=(...args:string[])=>execFileSync('git',args,{cwd:R,encoding:'utf8',windowsHide:true,maxBuffer:65536}).trim();
 assert.equal(realpathSync.native(process.cwd()),realpathSync.native(R));assert.equal(git('rev-parse','HEAD'),current.sourceHead);
 execFileSync('git',['merge-base','--is-ancestor',current.recordedReleaseSourceCommit,current.sourceHead],{cwd:R,windowsHide:true,maxBuffer:65536});
 assert.equal(git('rev-parse',current.recordedReleaseSourceCommit+'^{tree}'),context.releaseSourceTree);
 const pointer=exact(context.pointer);assert.equal(canonicalFile(context.pointer.path),realpathSync.native(pointerPath));
 assert.equal(pointer.productionAccessed,false);assert.equal(pointer.definitionReleaseStatus,'prepared');assert.equal(pointer.searchReleaseStatus,'draft');
 assert.deepEqual(actualPair(pointer),pair(p.successor));
 for(const pin of context.proofPins)exact(pin);
 const n=seal.normalizedReadback;
 assert.equal(n.status,'ROOT_REVIEWED_COMPLETE_CLOSED_DOKA_INDEPENDENT_READBACK_FOR_PAVING_R2');
 assert.equal(n.rawReadbackSha256,seal.readbackPin.sha256);assert.equal(n.publicationResultSha256,seal.applyPin.sha256);
 assert.equal(typeof p.status,'string');assert(p.status.startsWith('GREEN_')&&p.status.endsWith('_PREPARED_NOT_ACTIVE'),'ACTUAL_DOKA_APPLY_STATUS_REQUIRED');
 assert.equal(n.rawApplyStatus,p.status);assert.deepEqual(n.predecessorPair,pair(p.predecessor));assert.deepEqual(n.successorPair,pair(p.successor));
 assert.deepEqual(n.manifestPreservation,{parentCount:10467,successorCount:10467,unrelatedCount:10466,unrelatedChanges:0});
 assert.deepEqual(n.successorDoka,{shape:[301,137,140],retainedNormativeBindings:8,newNormativeBindings:20,totalNormativeBindings:28,unresolvedResourceRows:67,fullTechnicalAcceptance:false});
 for(const [key,value] of Object.entries({completeReadSet:true,transactionReadOnly:true,transactionRolledBack:true,connectionClosed:true,
  databaseWritesPerformed:false,allOwnedProcessesClosed:true,newCompleteTypesAccepted:0}))assert.equal(n[key],value);
 assert.equal(n.error,null);
 // Full actual raw readback -> actual apply -> ROOT sealed normalized facts.
 // Historical readback query HEAD is ad08, not the later ROOT execution HEAD.
 assert.equal(rawReadback.contract,'doka-r3-independent-governed-readback/v2');
 assert.equal(rawReadback.phase,'apply');
 assert.equal(rawReadback.status,'PASS_DOKA_R3_APPLY_INDEPENDENT_PAYLOAD_SOURCES_BASELINE_SAVED_AND10466');
 assert.equal(rawReadback.publicationResultSha256,seal.applyPin.sha256);
 assert.equal(rawReadback.publicationReceiptSha256,p.receiptSha256);
 assert.equal(rawReadback.sourceHead,'ad08e26948f35ab5a3f0d1739644f7705472bb92');
 assert.equal(rawReadback.actualQueryHead,'ad08e26948f35ab5a3f0d1739644f7705472bb92');
 assert.equal(rawReadback.sourceHead,p.source.head);
 assert.equal(rawReadback.databaseWrites,false);assert.equal(rawReadback.appJobs,false);assert.equal(rawReadback.publicationAllowed,false);
 for(const key of ['transactionReadOnly','transactionRolledBack','connectionClosed','completeReadSet']){
  assert.equal(rawReadback[key],true,'CUT70_RAW_CLOSED_DOKA_READBACK:'+key);
  assert.equal(n[key],rawReadback[key],'CUT70_NORMALIZED_RAW_CLOSURE:'+key);
 }
 assert.equal(rawReadback.error,null);assert.equal(n.error,rawReadback.error);
 assert.equal(n.databaseWritesPerformed,rawReadback.databaseWrites);
 assert.deepEqual(rawReadback.actualReceiptSuccessor,p.successor);
 assert.deepEqual(actualPair(rawReadback.actualPublicationContext),pair(p.successor));
 assert.equal(rawReadback.actualPublicationContext.sourceHead,p.source.head);
 assert.equal(rawReadback.actualPublicationContext.sourceTree,p.source.tree);
 assert.deepEqual(rawReadback.newState,{definitionId:p.successor.definitionId,baselineId:p.successor.baselineId,
  shape:[301,137,140],bindings:28,priceBindings:0,staticNeeds:67});
 const preservation=rawReadback.preservation;
 assert.deepEqual({parentCount:preservation.parentCount,successorCount:preservation.successorCount,
  unrelatedCount:preservation.unrelatedCount,unrelatedChanges:preservation.unrelatedChanges},n.manifestPreservation);
 assert.deepEqual(preservation.unrelatedManifestMappings,{parent_count:10467,successor_count:10467,unrelated_count:10466,unrelated_changed:0});
 assert.equal(preservation.retainedBindings,n.successorDoka.retainedNormativeBindings);
 assert.equal(preservation.newBindings,n.successorDoka.newNormativeBindings);
 assert.deepEqual(rawReadback.newState.shape,n.successorDoka.shape);
 assert.equal(rawReadback.newState.bindings,n.successorDoka.totalNormativeBindings);
 assert.equal(rawReadback.newState.staticNeeds,n.successorDoka.unresolvedResourceRows);
 return {pair:pair(p.successor),context,seal,evidencePaths:[rootParentSealPin.path,seal.applyPin.path,seal.readbackPin.path,seal.currentContextPin.path,...context.proofPins.map((p:any)=>p.path)].map(canonicalFile)};
}
export function preparePavingCut70AdmittedMasterAppendR2(input:Readonly<{rootDecisionPin:PavingCut70ExactPinR2;rootParentSealPin:PavingCut70ExactPinR2}>):MasterSingleDefinitionSuccessorConfig{
 const admitted=loadPavingCut70RootAdmissionR2(input.rootDecisionPin),parent=loadPavingCut70ActualDokaParentR2(input.rootParentSealPin);
 const d=pavingCut70AdmittedDefinitionR2(admitted.scope),completeness=pavingCut70IndependentCompletenessMapR1();
 const explicitParameterSources=Object.fromEntries(d.parameters.map(p=>[p.parameter_id,p.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM'
  ?{kind:'UNRESOLVED' as const,sourceIds:[]}:{kind:'KNOWN' as const,sourceIds:[pack.sourceKeyProposal]}]));
 const bound=['whole-cutting-labor','operator-information','stationary-machine-consumed','diamond-disc-consumed'].map(id=>prefix+':'+id);
 const included=['Только фактическая отдельно измеренная длина резов плитки70мм стационарным способом: колонка27-07-005-04.',
  'Цельный труд0,39ч/м — один владелец оплаты; машинист0,16ч/м, станок0,16маш.-ч/м и диск0,014шт/м справочно.',
  'Шесть дополнительных потребностей сохраняются открытыми; исходный состав частичный.'];
 const excluded=[...pack.excludedRu,'Существующие generic terrace-cut и предварительный комплекс тротуаров сохраняются; их возможная общая оплата требует явной сверки при объединении договоров.'];
 const cfg:MasterSingleDefinitionSuccessorConfig={contract:'gox-build.paving-cut70-stationary-actual-linear-m-append/r2',stopCode:'PAVING_STATIONARY_CUT70_R2',applicationName:'paving-cut70-source-specific-partial',
  expectedBranch:'codex/r4-a5-clean-08b18902',masterPath:'C:/Users/User/Downloads/MASTER_TZ_GOX_BUILD_PRODUCTION (11).md',masterSha256:'dfbb757a1562962636259c1c4cffd9127d15882b00cdd49baa8fcd4831bcacf2',
  parentReleaseId:parent.pair.definitionReleaseId,parentSearchReleaseId:parent.pair.searchReleaseId,currentReleasePath:pointerPath,outputRoot:resolve(R,'.release-runtime/r568/next-wave/paving-cut70/publication'),
  sourcePaths:['scripts/estimate/r4a13/preparePavingCut70AdmittedMasterAppendR2.ts','src/lib/estimate/v4/pavingCut70AdmittedR2.ts','src/lib/estimate/v4/pavingCut70AdmittedR2.test.ts',
   'src/lib/estimate/v4/pavingCutStationary70QuantityR1.ts','src/lib/estimate/v4/pavingCut70ConditionalAppendConsumerR1.ts','data/estimate-benchmarks/source-packs/paving-cut-stationary70-quantity-r1.json',
   'scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts','scripts/estimate/r4a13/masterSingleDefinitionAppendGuardsR1.ts','scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1.ts',
   'scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts','src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts',pack.source.localArtifact,
   canonicalFile(input.rootDecisionPin.path),...admitted.evidencePaths,...parent.evidencePaths],
  catalogId,sourceId:pack.sourceKeyProposal,normId:pack.normId,sourceMetadata:{source_title:pack.source.titleRu,source_authority:'Министерство строительства Кыргызской Республики, КРЕР27-2015',source_kind:'OFFICIAL_NORM_EXACT_SINGLE_COLUMN_PARTIAL',official_url:pack.source.officialUrl,artifact_sha256:pack.source.sha256,exact_locator:pack.source.locatorRu,use_restriction:included.join(' ')+' '+excluded.join(' ')},
  parameterDefinitions:d.parameters,formulaDefinitions:d.formulas,resourceDefinitions:d.resources,shortInput:{[primary]:12.5},acceptanceInput:pavingCut70AcceptanceInputR1(),
  runtimeProfileInput:{},runtimeProfileClassification:{},runtimeProfileSourceIds:{},expectedParentShape:[0,0,0],benchmarkOrdinal:0,validationScenario:'STATIONARY_PAVING_CUT70_ACTUAL_LINEAR_M_EXACT04_PARTIAL_FOUR_SOURCE_SIX_NEEDS',
  passport:{canonicalRuName:pack.titleRu,workKey,physicalResultRu:'Плитка70мм отрезана по проектной ведомости; шесть дополнительных потребностей ещё открыты.',includedScopeRu:included,excludedScopeRu:excluded,independentCompletenessMap:completeness,unresolvedApplicableResourceRowIds:pavingCut70OpenNeedIdsR1},
  applicability:{primaryMeasureParameterId:primary,primaryUnitId:'m',quantityScope:'PARTIAL',exactColumn:'27-07-005-04',paverThicknessMM:70,actualCutLengthOnly:true,stationaryMethodOnly:true,
   rootDecisionSha256:input.rootDecisionPin.sha256,parentSealSha256:input.rootParentSealPin.sha256,fullTechnicalAcceptance:false,newCompleteTypesAccepted:0,genericCutOperationAlreadyExists:true,genericWalkBodyFullySurveyed:false,globalPhysicalUniquenessProved:false,machinePriceAdmission:false,discOrderAdmission:false},
  binding:{rowId:bound[0]!,additionalRowIds:bound.slice(1),applicability:{exactColumn:'27-07-005-04',sourceVolumeParameterId:primary,sourceQuantityDenominatorM:1,stationaryOnly:true,paverThicknessMM:70,resourceInclusionOwnsApplicability:true,sourceArtifactSha256:pack.source.sha256,machinePriceAdmission:false,discOrderAdmission:false,applicationNeedsBound:false,fullTechnicalAcceptance:false}},
  locator:{key:'krer27-07-005-04-stationary-paving-cut70-actual-linear-m-r2',payload:{exactColumn:'27-07-005-04',sourceArtifactSha256:pack.source.sha256,sourceRowsOnly:bound,applicationNeedsUnbound:pack.openNeeds,literalMachineResourceCode:'33-0667',literalMachinePrintedName:pack.rows[2]!.printedNameRu,machineNomenclatureConflictUnresolved:true,rootDecisionSha256:input.rootDecisionPin.sha256}},
  search:{primaryUom:'m',canonicalNameRu:pack.titleRu,aliases:['Резка брусчатки70мм на стационарном станке по длине резов','Рез тротуарной плитки70мм — КРЕР27-07-005-04'],shortScopeRu:'Стационарная резка70мм по фактической длине резов; исходный состав частичный, шесть потребностей открыты.',keyDistinguishingParameters:[primary,'paver_thickness_mm','cutting_method','actual_cut_layout_reference'],clarificationFields:d.parameters.filter(p=>p.truth_metadata.visibility_role==='USER_INPUT').map(p=>p.parameter_id),includedBoundaries:included,excludedBoundaries:excluded,extraSearchTermsRu:'благоустройство тротуар плитка брусчатка стационарная резка70мм метр реза',sourceProvenance:{rootDecisionSha256:input.rootDecisionPin.sha256,actualDokaParentSealSha256:input.rootParentSealPin.sha256,quantityScope:'PARTIAL',fullTechnicalAcceptance:false,globalPhysicalUniquenessProved:false}},
  catalogAppend:{requireUniqueWorkKey:true,explicitParameterSources,capturedSourcePreimage:{sourceKey:pack.sourceKeyProposal,expected:null},capturedJoinGroupMembers:admitted.capturedJoinGroupMembers,
   identity:{namespace:'global',domain:'transport',sourceIdentity,workKey,titleRu:pack.titleRu,denominatorEligible:true},searchPlacement:{groupMode:'join',groupId,groupNameRu,domainId:'transport',systemId:'transport',subsystemId:groupId,assemblyId:groupId,workFamilyId:groupId,breadcrumb:[groupNameRu],groupOracleDisposition:{},membershipOrdinal:4,independentDisposition:{contract:'paving-cut70-root-partial-append-decision/r2',rootDecisionSha256:input.rootDecisionPin.sha256,classification:'CANONICAL_VISIBLE',sourceSpecificPhysicalProfile:true,newCompleteTypesAccepted:0},elementType:'WORK',operationKind:'OTHER',technologyVariant:'KRER27_07_005_04_STATIONARY_70MM_ACTUAL_CUT_M',constructionState:'PROJECT_PAVING_TILE_70MM_FOR_STATIONARY_CUT',normativeClassifiers:['КРЕР27-07-005-04'],applicabilityTags:['OUTDOOR_PAVING','STATIONARY_CUT','PAVER_THICKNESS_70MM','ACTUAL_LINEAR_CUT_M','PARTIAL_QUANTITY','MACHINE_PRICE_NOT_ADMITTED','DISC_ORDER_NOT_ADMITTED'],publicationState:'ADMITTED_BACKEND',catalogOrigin:'GLOBAL',adjudicationClass:'EFFECTIVE_WORK',selectable:true}},
  forbiddenAdjacentMatchers:[/cm11|ce40|roof:|elecor|krer18-castiron/iu],owner:'ROOT_SINGLE_INTEGRATOR_PAVING_CUT70',receiptFileStem:'paving_cut70_stationary_actual_m_r2',
  verifyCore:async()=>{
   assert.equal(sha(readFileSync(resolve(R,pack.source.localArtifact))),pack.source.sha256);
   assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:completeness,formulaDefinitions:d.formulas,resourceDefinitions:d.resources}),[]);
   const sources=resolveMasterAppendExplicitParameterSourcesR1(cfg,{parameters:d.parameters,formulas:d.formulas,resources:d.resources})!;
   assert.equal(Object.keys(sources).length,12);for(const p of d.parameters)assert.deepEqual(sources[p.parameter_id],p.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM'?[]:[pack.sourceKeyProposal]);
   const r=await compileCanonicalEstimateCore({operation:'compile',catalogId,compilerVersion:cfg.contract,primaryMeasureParameterId:primary,
    parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],submittedParameters:pavingCut70AcceptanceInputR1(),confirmedParameters:{},rowOverrides:{},priceItems:[],currencyCode:'KGS',maximumResourceRows:10,hashJson:async x=>estimateDeterministicHash(x)});
   assert.deepEqual(r.rows.map(x=>x.quantity),['4.875','2','2','0.175']);assert.equal(r.preliminaryNeeds.length,6);
   assert.deepEqual(r.rows.filter(x=>x.included_in_estimate).map(x=>x.row_id),[prefix+':whole-cutting-labor']);assert(r.rows.every(x=>x.unit_price===null&&!x.included_in_procurement));
   return {status:'PASS_SOURCE_SPECIFIC_PARTIAL_PAVING_CUT70_CORE_ONLY',shape:[12,10,10],sourceRows:4,applicationNeeds:6,baselineSources:{KNOWN:6,UNRESOLVED:6},machinePaidOwners:0,discOrderOwners:0,fullTechnicalAcceptance:false,newCompleteTypesAccepted:0,publicationPerformed:false};
  }};
 const resolved=resolveMasterAppendExplicitParameterSourcesR1(cfg,{parameters:d.parameters,formulas:d.formulas,resources:d.resources});assert(resolved,'EXPLICIT_APPEND_SOURCE_MAPPER_REQUIRED');
 assert(!cfg.sourcePaths.some(p=>resolve(R,p)===pointerPath),'MUTABLE_POINTER_MUST_NOT_ENTER_SOURCE_PATHS');
 return cfg;
}
