// WORK authoring only. No PG/CLI/publisher invocation on import.
// Root-admitted explicit profile; source/group capture remains a mandatory guarded precondition before writing.
import {strict as assert} from 'node:assert';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {type MasterSingleDefinitionSuccessorConfig,validateIndependentCompletenessMapReferences} from './prepareMasterSingleDefinitionSuccessorR1';
import {brickPartitionHalfPackR1 as pack,brickPartitionHalfPrefixR1 as prefix,brickPartitionHalfDefinitionR1,
 brickPartitionHalfCompletenessMapR1,brickPartitionCraneModesR1,compileBrickPartitionHalfR1} from '../../../src/lib/estimate/v4/brickPartitionHalfKrer08Column05R1';
import {assertCanonicalMachineHourDefinitionV1,canonicalManualMachineHourPriceCoverageV1,
 resolveCanonicalMachineHourPriceCoverageV1} from '../../../src/lib/estimate/backendPlatform/canonicalMachineHourPriceCoverageV1';

type Json=Record<string,any>;
type Pin=Readonly<{path:string;sha256:string}>;
type Evidence=Readonly<{initialRead:Pin;initialClosedGuard:Pin;additiveRead:Pin;additiveClosedGuard:Pin;
 targetedFiveRead:Pin;targetedFiveClosedGuard:Pin;emittedSourceRead:Pin;emittedSourceClosedGuard:Pin;classification:Pin;cycleDossier:Pin}>;
type Append=NonNullable<MasterSingleDefinitionSuccessorConfig['catalogAppend']>;
type ParentRebaseEvidence=Readonly<{publication:Pin;independentReadback:Pin}>;
const curbPublicationSha='6e84d717214f738ebe8dbc79d39e0c052ab9eb28334f4e58c3ef86b5d67e7935';
const curbReadbackSha='9b5e7c1151060d76c9438ac7d2c6300ab85158096a62d2a055a34b7a2c3eca52';
const curbPair={definitionReleaseId:'63d97ccc-3e50-5320-993b-63915d3a04f6',searchReleaseId:'21206ca4-cec9-57b0-8ed1-58bf97bc2cc7'};
const curbCatalogId='canonical-work:master:granite_kerb_1gp_install_cement_concrete_pavement_standard';
const curbSourceId='KRER27_2015_GRANITE_KERB_1GP_CEMENT_270201003';
const masonryGroupId='wg:master:brick_partition_half_unreinforced_upto4m';
const packPath='data/estimate-benchmarks/source-packs/brick-partition-half-unreinforced-krer08-002-05-r1.json';
const packSha='a03614e223902861b5c358c67a301939356e2e3c806287fd61fa02e005ebaa50';
const pair={definitionReleaseId:'77fb927f-72aa-5981-b243-c0a5e68bc3d9',searchReleaseId:'089161ff-00ab-5d96-9aa1-58f91e6139a2'};
const capturedContext={...pair,sourceHead:'4bddeadf24d23ded2708a285733a6abdcf028d4f',recordedReleaseSourceCommit:'741bf109ebf57bd6aeaaab71ca5cf1d8bd0f2abe'};
const knownFiveIds=['44b3623e-933d-5009-8960-3db46d9bb115','9d443678-a638-5ca5-b08e-d9c3309fd991','f5a0af44-0bbe-5781-818e-1aed6aa47be8','f2283a64-861c-5d4d-bb3b-20f6bcb126dd','3cf09be2-53a3-507d-99e1-ef93dc3e62ed'];
const sha=(value:string|Buffer)=>createHash('sha256').update(value).digest('hex');
const rows=(result:Json,name:string):Json[]=>result.sets[name].rawRows.map((value:string)=>JSON.parse(value));
function load(pin:Pin):Json{
 assert((pin.path.startsWith('data/estimate-benchmarks/')||pin.path.startsWith('.release-runtime/r568/'))
  &&!pin.path.replaceAll('\\','/').split('/').includes('..'),'ROOT_INTEGRATED_REPO_RELATIVE_EVIDENCE_REQUIRED');
 assert(/^[a-f0-9]{64}$/.test(pin.sha256));
 const bytes=readFileSync(resolve(process.cwd(),pin.path));assert.equal(sha(bytes),pin.sha256,'EXACT_EVIDENCE_BYTES:'+pin.path);
 return JSON.parse(bytes.toString('utf8'));
}
function closedRead(result:Json,setCount:number){
 assert(result.completeReadSet&&result.transactionRolledBack&&result.connectionClosed&&result.error===null,'CLOSED_READ_REQUIRED');
 assert.equal(Object.keys(result.sets).length,setCount);assert.deepEqual(result.executionContext,capturedContext);
 assert.equal(result.actualQueryHead,capturedContext.sourceHead);assert.equal(result.globalAbsenceProved,false);
 assert.equal(result.globalResourceJsonRead,false);assert.equal(result.databaseWrites,false);assert.equal(result.appJobs,false);
 for(const group of Object.values(result.sets) as Json[]){
  assert.equal(group.rowCount,group.rawRows.length);
  assert.equal(sha(group.rawRows.join('\n')+(group.rawRows.length?'\n':'')),group.sha256,'EXACT_READSET_BYTES');
 }
}
function closedGuard(guard:Json){
 // The initial root guard was NOT_ACCEPTED due to an independent curb cap;
 // its accepted masonry result is complete. Require ownership closure, not a false overall GREEN.
 assert.equal(guard.noOwnedProcessStillRunning,true);assert.deepEqual(guard.remainingOwnedProcesses,[]);assert.deepEqual(guard.cleanupErrors,[]);
}
function control(area=100):Record<string,unknown>{
 const input:Record<string,unknown>={net_partition_area_m2:area,storey_height_m:4,crane_fulfillment:brickPartitionCraneModesR1.own};
 for(const f of pack.scopeFacts)input[f.id]=f.value;
 for(const id of pack.requiredProjectReferences)input[id]='CONTROL_ONLY approved source-compatible reference; not actual project data';
 const quantum:Record<string,number>={water:0.001,brick:1,timber:0.001,forgings:0.001,mortar:0.001};
 for(const m of pack.materials){input[m.specificationParameterId]='CONTROL_ONLY exact source-compatible supply; not supplier offer';input[m.id+'_stock']=0;input[m.id+'_reserve']=0;input[m.id+'_quantum']=quantum[m.id];}
 return input;
}

/** Pure assertion of historical evidence used by factory/verifyCore tests.
 * Live source absence is enforced by catalogAppend.capturedSourcePreimage in the
 * existing shared preflight and locked reread; group/ordinal use its standard guards. */
export function assertBrickPartition005CapturedAppendPreimageR1(snapshot:Readonly<{source:unknown;group:unknown;ordinalCollisionCount:number}>):void{
 assert.equal(snapshot.source,null,'MASONRY005_CAPTURED_ABSENT_EMITTED_SOURCE_CHANGED');
 assert.equal(snapshot.group,null,'MASONRY005_CAPTURED_NEW_GROUP_CHANGED');
 assert.equal(snapshot.ordinalCollisionCount,0,'MASONRY005_CAPTURED_ORDINAL0_CHANGED');
}

/** Pure semantic check for the one actual, separately pinned curb append.
 * Historical masonry reads retain their original pair/query HEAD; this authorizes
 * only the preserved parent transition, never source/group existence or a write. */
export function resolveBrickPartition005ParentRebaseR1(publication:Json,readback:Json):Readonly<{definitionReleaseId:string;searchReleaseId:string}>{
 assert.equal(publication.status,'GREEN_GRANITE_KERB_CEMENT_COLUMN03_PREPARED_NOT_ACTIVE','EXACT_CURB_APPLY_REQUIRED');
 assert.equal(publication.mutationPerformed,true);assert.equal(publication.idempotent,false);
 assert.equal(publication.source.head,'c6acf562e6c6e0b42a0af37b76a4d3411a9cf9cc');
 assert.equal(publication.source.tree,'fdb588413afafa8aab7dcde95b8a0f4792c18453');
 assert.equal(publication.predecessor.releaseId,pair.definitionReleaseId,'CAPTURED_MASONRY_PARENT_REQUIRED');
 assert.equal(publication.predecessor.searchReleaseId,pair.searchReleaseId,'CAPTURED_MASONRY_SEARCH_PARENT_REQUIRED');
 assert.equal(publication.predecessor.targetAbsentForAppend,true);
 assert.equal(publication.predecessor.catalogId,curbCatalogId);
 assert.equal(publication.successor.releaseId,curbPair.definitionReleaseId,'EXACT_CURB_SUCCESSOR_REQUIRED');
 assert.equal(publication.successor.searchReleaseId,curbPair.searchReleaseId,'EXACT_CURB_SEARCH_SUCCESSOR_REQUIRED');
 assert.equal(publication.audit.release.id,curbPair.definitionReleaseId);
 assert.equal(publication.audit.release.status,'prepared');assert.equal(publication.audit.release.activated_at,null);
 assert.equal(publication.audit.search.definition_release_id,curbPair.definitionReleaseId);
 assert.equal(publication.audit.search.release_status,'draft');
 assert.equal(publication.audit.unrelatedManifestChanges,0,'UNRELATED_MANIFEST_CHANGES_FORBIDDEN');
 assert.equal(publication.audit.manifest.identities,10463);assert.equal(publication.audit.manifest.replaced,1);
 assert.equal(publication.audit.identity.catalog_id,curbCatalogId);
 assert.equal(publication.audit.target.catalog_id,curbCatalogId);assert.equal(publication.audit.search.catalog_id,curbCatalogId);
 assert.notEqual(curbCatalogId,pack.proposedIdentity.catalogId);
 assert.equal(publication.audit.searchPlacement.group_id,'wg:expanded:curbs');
 assert.notEqual(publication.audit.searchPlacement.group_id,masonryGroupId);
 assert(publication.audit.searchPlacement.member_catalog_ids.includes(curbCatalogId));
 assert(!publication.audit.searchPlacement.member_catalog_ids.includes(pack.proposedIdentity.catalogId));
 const declaredSources=publication.audit.target.decision.independentCompletenessMap.entries.map((entry:Json)=>entry.sourceId);
 assert(declaredSources.length>0&&declaredSources.every((id:unknown)=>id===curbSourceId),'CURB_SOURCE_SCOPE_REQUIRED');
 assert.notEqual(curbSourceId,pack.sourceId);
 for(const field of ['productionAccessed','deployPerformed','activationPerformed','releasePerformed','otaPerformed'])assert.equal(publication[field],false);
 assert.equal(readback.contract,'curb03-existing-governed-independent-readback/v1');
 assert.equal(readback.status,'PASS_CURB03_APPLY_INDEPENDENT_PAYLOAD_READBACK','EXACT_INDEPENDENT_READBACK_REQUIRED');
 assert.equal(readback.error,null);assert.equal(readback.publicationResultSha256,curbPublicationSha);
 assert.equal(readback.sourceHead,publication.source.head);
 assert.equal(readback.transactionReadOnly,true);assert.equal(readback.transactionRolledBack,true);
 assert.equal(readback.connectionClosed,true);assert.equal(readback.databaseWritesPerformed,false);
 assert.equal(readback.preservation.unrelatedManifestChanges,0,'INDEPENDENT_PRESERVATION_REQUIRED');
 assert.equal(readback.preservation.parentManifestCount,10462);assert.equal(readback.preservation.successorManifestCount,10463);
 assert.equal(readback.preservation.floor.unchanged,true,'FLOOR_PAYLOAD_PRESERVATION_REQUIRED');
 assert.equal(readback.newState.payloadSha256,publication.publisherPersistedSelfAudit.payloadSha256,'INDEPENDENT_PAYLOAD_MATCH_REQUIRED');
 assert.equal(readback.freshOwnedIdCounts.identity,1);assert.equal(readback.freshOwnedIdCounts.normativeSource,1);
 assert.equal(readback.freshOwnedIdCounts.searchGroup,1);assert.equal(readback.freshOwnedIdCounts.searchMembership,1);
 return {...curbPair};
}

export function brickPartitionHalfKrer08Column05AppendConfigR1(evidence:Evidence,parentRebase?:ParentRebaseEvidence):MasterSingleDefinitionSuccessorConfig{
 assert.equal(evidence.initialRead.sha256,'a4a80bd5a4724f960726735df510f0e1f00013b7ce1638dd49993578e09da49e');
 assert.equal(evidence.classification.sha256,'ef0b085972ca534f9e056b711cd2ad3340bbc6cea3874b1ca17102f18a904aed','EXACT_ROOT_IDENTITY_DECISION');
 assert.equal(evidence.targetedFiveRead.sha256,'3cd4e043d88a85097c328825cea1ad7ca32e42e33422a0c6a18011a59a7a6fdf');
 assert.equal(evidence.targetedFiveClosedGuard.sha256,'85e9c61137df1066920a3efd25799c1d3b366f1de92ec64916f8a03c23be1493');
 assert.equal(evidence.emittedSourceRead.sha256,'3e1eea0e549d668bc906796517faa97df53708a60e8a47168a306f6ffbc1a8c1');
 assert.equal(evidence.emittedSourceClosedGuard.sha256,'4619e224d43afdccbd09bbcd87bf72733acd96aed625a9c4a1bca96778806ad0');
 assert.equal(evidence.initialClosedGuard.sha256,'9d7d0efda6a54f6946753015782329262a409c7479731ff295075d3a29978912');
 assert.equal(evidence.additiveRead.sha256,'d82edaa3e28e432175be3fe35c58fd1fe9a4fbfb27b5c22636a047ec6ccbf26f');
 assert.equal(evidence.additiveClosedGuard.sha256,'bd55ed7c3b8d42221b8a02b3a249c1ed52ebffa4dd09d176a95dd0906174b815');
 assert.equal(evidence.cycleDossier.sha256,'234de49fb2fe6edf01587940d61b2e0b481a7dcf4d75cad92ca94616d1e580c7');
 const initial=load(evidence.initialRead),addon=load(evidence.additiveRead),target=load(evidence.targetedFiveRead),review=load(evidence.classification),cycle=load(evidence.cycleDossier),emitted=load(evidence.emittedSourceRead);
 closedRead(initial,16);closedRead(addon,2);closedRead(target,4);closedRead(emitted,2);
 for(const key of ['initialClosedGuard','additiveClosedGuard','targetedFiveClosedGuard','emittedSourceClosedGuard'] as const)closedGuard(load(evidence[key]));
 assert.equal(target.contract,'masonry005-targeted-lintel-five/v1');
 const actualFive=rows(target,'fiveCurrentDefinitionSourceContentPassports');
 assert.deepEqual(actualFive.map(x=>x.definition_version_id).sort(),[...knownFiveIds].sort());
 assert.equal(review.decision,'ADMIT_DISTINCT_PHYSICAL_PROFILE','ROOT_IDENTITY_DECISION_REQUIRED_FIVE_AMBIGUITIES_NOT_AUTO_IGNORED');
 assert.equal(review.contract,'masonry005-root-physical-profile-classification/v1');
 assert.equal(review.status,'ROOT_ACCEPTED_DISTINCT_PHYSICAL_PROFILE_FOR_PREPARATION_NOT_PUBLICATION');
 assert.deepEqual(review.executionContext,capturedContext);
 for(const p of [evidence.initialRead,evidence.additiveRead,evidence.targetedFiveRead,evidence.emittedSourceRead])
  assert(review.evidence.some((x:Json)=>x.sha256===p.sha256),'ROOT_DECISION_MUST_BIND_ALL_FOUR_ACTUAL_READS');
 assert.equal(review.boundedCandidateScopeSufficientForPhysicalDuplicateReview,true);assert.equal(review.globalAbsenceProved,false);
 assert.equal(review.proposedIdentity.catalogId,pack.proposedIdentity.catalogId);assert.equal(review.proposedIdentity.workKey,pack.proposedIdentity.workKey);
 assert.equal(review.proposedIdentity.persisted,false);assert.equal(review.existingConsumersUnchanged,true);
 assert.equal(review.historicPricesAndManualOwnersTransferred,false);assert.equal(review.fullTechnicalAcceptance,false);
 assert.equal(review.sourceNormRatesChanged,false);assert.equal(review.fullCycleNeeds,8);assert.equal(review.acceptedNewCompleteTypes,0);
 assert.deepEqual([review.preservedConsumers.genericPartitionBranches,review.preservedConsumers.biaBrickWallProfiles,review.preservedConsumers.ambiguousInstallLintelBranches,review.preservedConsumers.otherAliasHeaders],[6,4,5,32]);
 assert.equal(review.preservedConsumers.priceSnapshotsTransferred,0);assert.equal(review.preservedConsumers.unitConversionsOnExistingDefinitions,0);
 const sourceControl=rows(emitted,'exactEmittedSourceAndCurrentConsumerHeaders');assert.equal(sourceControl.length,1);
 assert.deepEqual(sourceControl[0],{exact_source_count:0,source_preimage:null,current_consumer_count:0,current_consumer_headers:[]});
 assert.equal(emitted.emittedSourceKey,pack.sourceId);assert.equal(review.emittedSource.key,pack.sourceId);
 assert.deepEqual(review.emittedSource.exactPreimage,sourceControl[0]);assert.equal(review.emittedSource.preimageMustRemainUnchangedBeforeWrite,true);
 assert.equal(review.emittedSource.wrongUppercaseProbeDoesNotProveEmittedSourceAbsence,true);
 const groups=rows(emitted,'exactProposedGroupAndOrdinalHeaders');
 const newGroup=groups.find(x=>x.group_id==='wg:master:brick_partition_half_unreinforced_upto4m');assert(newGroup);
 assert.equal(newGroup.group_preimage,null);assert.equal(newGroup.actual_member_count,0);assert.equal(newGroup.next_free_tail_ordinal,0);assert.deepEqual(newGroup.member_headers,[]);
 const genericGroup=groups.find(x=>x.group_id==='wg:base:masonry_interior_partition_lay');assert(genericGroup?.group_preimage);
 assert.equal(genericGroup.actual_member_count,6);assert.equal(genericGroup.next_free_tail_ordinal,6);
 assert.equal(genericGroup.group_preimage.group_name_ru,'кладка каменной перегородки для высокой нагрузки');
 assertBrickPartition005CapturedAppendPreimageR1({source:sourceControl[0].source_preimage,group:newGroup.group_preimage,ordinalCollisionCount:0});
 assert.equal(cycle.fullCycle.length,8);assert.equal(cycle.sourceIntakes.length,8);
 assert(pack.sourceNeeds.every(g=>g.ownerRu&&g.nextTaskRu&&g.acceptanceRu));
 // Root's semantic "new" is the existing publisher's typed "create"; no group is renamed.
 const accepted=review.searchPlacement;
 assert.equal(accepted.groupMode,'new');assert.equal(accepted.groupId,newGroup.group_id);assert.equal(accepted.membershipOrdinal,0);
 assert.equal(accepted.existingGenericGroupRenamed,false);assert.equal(accepted.domainId,'masonry');assert.equal(accepted.systemId,'masonry');
 const placement:Append['searchPlacement']={groupMode:'create',groupId:accepted.groupId,groupNameRu:accepted.groupNameRu,
  domainId:accepted.domainId,systemId:accepted.systemId,subsystemId:accepted.subsystemId,assemblyId:accepted.assemblyId,workFamilyId:accepted.workFamilyId,
  breadcrumb:accepted.breadcrumb,membershipOrdinal:0,elementType:'WORK',operationKind:'NEW_INSTALLATION',technologyVariant:'BRICK_HALF_120MM_UNREINFORCED_STOREY_UPTO4M',constructionState:'NEW',
  normativeClassifiers:[pack.normId],applicabilityTags:['CERAMIC_SINGLE_BRICK_250_120_65_M100','HALF_BRICK_120MM','UNREINFORCED','STOREY_UPTO_4M_INCLUSIVE','NET_PARTITION_AREA_OUTSIDE_FRAME_OPENINGS','READY_CEMENT_LIME_M50','PARTIAL_EIGHT_OPEN_NEEDS'],
  publicationState:'ADMITTED_BACKEND',catalogOrigin:'GLOBAL',adjudicationClass:'EFFECTIVE_WORK',selectable:true,
  groupOracleDisposition:{contract:review.contract,decision:review.decision,classificationSha256:evidence.classification.sha256,groupMode:'NEW_DISTINCT_PHYSICAL_PROFILE',existingConsumersUnchanged:true},
  independentDisposition:{contract:review.contract,classification:'CANONICAL_VISIBLE',classificationSha256:evidence.classification.sha256,exactPhysicalIdentity:true,sourceOnlyPartialNotComplete:true}};
 assert(placement.groupNameRu&&placement.breadcrumb.length>0,'ROOT_ADMITTED_GROUP_PLACEMENT_REQUIRED');
 assert.equal(sha(readFileSync(resolve(process.cwd(),packPath))),packSha,'INTEGRATED_SOURCE_PACK_BYTES');
 assert.equal(sha(readFileSync(resolve(process.cwd(),pack.source.artifactPath))),pack.source.sha256,'OFFICIAL_PRIMARY_ARTIFACT_BYTES');
 // The optional transition is pinned independently from the 24 historical readsets.
 let selectedParent:Readonly<{definitionReleaseId:string;searchReleaseId:string}>=pair;
 const parentProofPins:Pin[]=[];
 if(parentRebase!==undefined){
  assert(parentRebase!=null,'EXPLICIT_PARENT_REBASE_EVIDENCE_REQUIRED');
  assert.equal(parentRebase.publication.sha256,curbPublicationSha,'EXACT_CURB_PUBLICATION_BYTES_REQUIRED');
  assert.equal(parentRebase.independentReadback.sha256,curbReadbackSha,'EXACT_CURB_READBACK_BYTES_REQUIRED');
  selectedParent=resolveBrickPartition005ParentRebaseR1(load(parentRebase.publication),load(parentRebase.independentReadback));
  parentProofPins.push(parentRebase.publication,parentRebase.independentReadback);
 }
 const pointerPath='data/estimate-benchmarks/r568-local-developer-canonical-release.json';
 const pointer=JSON.parse(readFileSync(resolve(process.cwd(),pointerPath),'utf8'));
 assert.equal(pointer.productionAccessed,false);
 assert.equal(pointer.definitionReleaseId,selectedParent.definitionReleaseId);assert.equal(pointer.searchReleaseId,selectedParent.searchReleaseId,'PARENT_DRIFT_REQUIRES_EXPLICIT_REBASE_SUCCESSOR');
 const d=brickPartitionHalfDefinitionR1(),completeness=brickPartitionHalfCompletenessMapR1();
 const craneGuide=String((d.parameters.find(p=>p.parameter_id==='crane_fulfillment')!.truth_metadata.guide as Json).guide_short_ru);
 assert(!/price helper|Допуск точных строк|ещё не выполнен/iu.test(craneGuide),'ADOPTED_PRODUCT_GUIDE_SUCCESSOR_REQUIRED');
 assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:completeness,formulaDefinitions:d.formulas,resourceDefinitions:d.resources}),[]);
 const unresolved=pack.sourceNeeds.map(g=>prefix+':'+g.id);
 const bindingIds=['whole-labor','operator-information','crane-consumed',...pack.materials.map(m=>m.id+'-consumed'),'whole-masonry-operation','crane-own','crane-hired'].map(id=>prefix+':'+id);
 assert.equal(bindingIds.length,11);assert(bindingIds.every(id=>d.resources.some(r=>r.row_id===id)));
 return {contract:pack.contract,stopCode:'BRICK_PARTITION_HALF_KRER08_COLUMN05',applicationName:'brick-partition-half-krer08-column05',
  expectedBranch:'codex/r4-a5-clean-08b18902',masterPath:'C:/Users/User/Downloads/MASTER_TZ_GOX_BUILD_PRODUCTION (10).md',masterSha256:'90e84fbfbf17321f1dd935f5e56a090f31619a3336e582bfabe1e66fcdfa48d7',
  parentReleaseId:selectedParent.definitionReleaseId,parentSearchReleaseId:selectedParent.searchReleaseId,currentReleasePath:resolve(pointerPath),outputRoot:resolve('.release-runtime/r568/next-wave/masonry005/publication'),
  sourcePaths:[packPath,'src/lib/estimate/v4/brickPartitionHalfKrer08Column05R1.ts','src/lib/estimate/v4/brickPartitionHalfKrer08Column05R1.test.ts',
   'scripts/estimate/r4a13/prepareBrickPartitionHalfKrer08Column05AppendR1.ts','src/lib/estimate/v4/automaticConstructionOwnerR1.ts','src/lib/estimate/v4/effectivePurchaseBalanceR1.ts',
   'src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts','src/lib/estimate/backendPlatform/canonicalMachineHourPriceCoverageV1.ts',
   'scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts','scripts/estimate/r4a13/masterSingleDefinitionAppendGuardsR1.ts',pack.source.artifactPath,...Object.values(evidence).map(p=>p.path),...parentProofPins.map(p=>p.path)],
  catalogId:pack.proposedIdentity.catalogId,sourceId:pack.sourceId,normId:pack.normId,
  sourceMetadata:{source_title:pack.titleRu,source_authority:'Министерство строительства Кыргызской Республики, КРЕР-2015 сборник08',source_kind:'OFFICIAL_NORM_EXACT_SINGLE_COLUMN_WITH_EXPLICIT_PARTIAL_COMPLETION',official_url:pack.source.officialUrl,artifact_sha256:pack.source.sha256,exact_locator:pack.source.locatorRu+'; PDF8§2.10, PDF7§1.18/1.21',use_restriction:pack.scopeFacts.map(f=>f.value).join('; ')+'; '+pack.excluded.join('; ')},
  parameterDefinitions:d.parameters,formulaDefinitions:d.formulas,resourceDefinitions:d.resources,
  shortInput:{net_partition_area_m2:100},acceptanceInput:control(),runtimeProfileInput:{},runtimeProfileClassification:{},runtimeProfileSourceIds:{},expectedParentShape:[0,0,0],benchmarkOrdinal:0,
  validationScenario:'KRER08_002_05_HALF_BRICK_UNREINFORCED_NET_M2_FIVE_MATERIALS_WHOLE_LABOUR_ONE_CRANE_EIGHT_OPEN_NEEDS',
  passport:{canonicalRuName:pack.titleRu,workKey:pack.proposedIdentity.workKey,physicalResultRu:'Новая неармированная ненесущая перегородка в1/2кирпича250×120×65М100 приэтаже<=4м; чистаяплощадьпо§2.10, М50. Исходнаякладкаколонки005;8дополнительныхпотребностейостаютсяоткрытыми.',includedScopeRu:[...pack.scopeFacts.map(f=>f.value),'143.99ч/100м² всяоперация; переноскакирпичадо5м включена, неразделяется на новые оплачиваемые фазы.','Пять независимых расход/заказ балансов; башенныйкран8т4.11маш.-ч/100м², машинист4.11ч информационно вценекрана.'],excludedScopeRu:pack.excluded,independentCompletenessMap:completeness,unresolvedApplicableResourceRowIds:unresolved},
  applicability:{primaryMeasureParameterId:'net_partition_area_m2',sourceNorm:pack.normId,partitionThickness:'HALF_SINGLE_BRICK_120MM',brickDimensionsMm:[250,120,65],brickMark:100,reinforced:false,storeyHeightMaximumInclusiveM:4,mortar:'READY_CEMENT_LIME_M50_M3',openingDeduction:'OUTSIDE_OUTLINE_OF_FRAMES',quantityScope:'PARTIAL',fullTechnicalAcceptance:false,acceptedNewCompleteTypes:0,unknownPricesRemainUnknown:true,historicBindingsInherited:false},
  binding:{rowId:bindingIds[0],additionalRowIds:bindingIds.slice(1),applicability:{sourceKind:'OFFICIAL_COLUMN005_PRINTED_RESOURCES_INCLUDED_OPERATION_AND_EXCLUSIVE_CRANE_FULFILLMENT',fullTechnicalAcceptance:false,purchaseBalancesAreDerivedNotNewConsumptionNorms:true}},
  locator:{key:'krer08-02-002-05-half-brick-partition-r1',payload:{sourcePack:pack,initialReadSha256:evidence.initialRead.sha256,additiveReadSha256:evidence.additiveRead.sha256,targetedFiveReadSha256:evidence.targetedFiveRead.sha256,classificationSha256:evidence.classification.sha256,fullCycle:cycle.fullCycle,sourceIntakes:cycle.sourceIntakes,independentlyDeclaredBindingRows:bindingIds}},
  search:{primaryUom:'m2',canonicalNameRu:pack.titleRu,aliases:['Кладка неармированной кирпичной перегородки120мм','Перегородка в1/2кирпича до4м — КРЕР08-02-002-05','Неармированная перегородка из одинарного керамического кирпичаМ100'],shortScopeRu:'Точная005: неармированная1/2кирпичная перегородка250×120×65М100, этаждо4м, чистаяплощадьспроёмами, готовыйМ50; исходныйсоставчастичный,8потребностейоткрыты.',keyDistinguishingParameters:['net_partition_area_m2','storey_height_m','partition_profile_confirmation','approved_partition_design_reference'],clarificationFields:d.parameters.filter(p=>p.truth_metadata.visibility_role==='USER_INPUT').map(p=>p.parameter_id),includedBoundaries:pack.scopeFacts.map(f=>f.value),excludedBoundaries:pack.excluded,extraSearchTermsRu:'кладка перегородка кирпич120мм полкирпича пол кирпича halfbrick1/2неармированная М100М50 КРЕР08-02-002-05',sourceProvenance:{sourcePack:packPath,primarySha256:pack.source.sha256,initialReadSha256:evidence.initialRead.sha256,additiveReadSha256:evidence.additiveRead.sha256,targetedFiveReadSha256:evidence.targetedFiveRead.sha256,fullTechnicalAcceptance:false,unresolvedApplicableNeeds:8,globalAbsenceProved:false}},
  catalogAppend:{requireUniqueWorkKey:true,capturedSourcePreimage:{sourceKey:pack.sourceId,expected:null},identity:{namespace:'global',domain:'masonry',sourceIdentity:'master-work:'+pack.proposedIdentity.workKey,workKey:pack.proposedIdentity.workKey,titleRu:pack.titleRu,denominatorEligible:true},searchPlacement:placement},
  forbiddenAdjacentMatchers:[/roof:|road-upper-base:|floor-underlayer:|legrand|elecor|granite-kerb|gypsum_pgp/iu],owner:'ROOT_SINGLE_WRITER_NEXT_WAVE',receiptFileStem:'masonry005_half_brick_partition',
  verifyCore:async()=>{
   assertBrickPartition005CapturedAppendPreimageR1({source:sourceControl[0].source_preimage,group:newGroup.group_preimage,ordinalCollisionCount:0});
   for(const suffix of ['crane-own','crane-hired']){
    const row=d.resources.find(r=>r.row_id===prefix+':'+suffix)!;
    const requirement=assertCanonicalMachineHourDefinitionV1({catalogId:pack.proposedIdentity.catalogId,rowId:row.row_id,unitId:row.unit_id,sourceMetadata:row.source_metadata});
    assert(requirement&&requirement.resourceCode==='02-0005'&&requirement.operator==='OPERATOR','ROOT_EXACT_TWO_CRANE_PRICE_OWNERS_REQUIRED');
    const manual=canonicalManualMachineHourPriceCoverageV1({rowId:row.row_id,unitPrice:'77',currencyCode:'KGS'});
    assert.equal(manual.operationScope,'FULL_SOURCE_OPERATION');
    const input={catalogId:pack.proposedIdentity.catalogId,rowId:row.row_id,unitId:row.unit_id,currencyCode:'KGS',unitPrice:'77',evidence:manual,manual:true,manualProvenanceReason:'consumer_estimate_row_batch_edit'};
    assert.equal(resolveCanonicalMachineHourPriceCoverageV1(input)?.status,'CONFIRMED_MANUAL');
    for(const foreign of ['canonical-work:base:roofing_interior_flat_roof_install_technical_room','canonical-work:base:roofing_interior_flat_roof_install_wet_zone']){
     assert.equal(assertCanonicalMachineHourDefinitionV1({catalogId:foreign,rowId:row.row_id,unitId:row.unit_id,sourceMetadata:row.source_metadata}),null,'NO_LEGACY_ROOF_CATALOG_FALLBACK');
     assert.equal(resolveCanonicalMachineHourPriceCoverageV1({...input,catalogId:foreign}),null);
    }
   }
   for(const [area,labour,crane,brick,mortar] of [[100,'143.99','4.11','5040','2.3'],[35.5,'51.11645','1.45905','1789.2','0.8165']] as const){
    const r=await compileBrickPartitionHalfR1(pack.proposedIdentity.catalogId,control(area));
    assert.equal(r.rows.length,15);assert.equal(r.preliminaryNeeds.length,8);
    assert.deepEqual(r.preliminaryNeeds.map(n=>n.row_id).sort(),[...unresolved].sort());
    for(const [id,value] of [['whole-labor',labour],['operator-information',crane],['crane-consumed',crane],['brick-consumed',brick],['mortar-consumed',mortar]])assert.equal(r.rows.find(row=>row.row_id===prefix+':'+id)?.quantity,value);
    assert.deepEqual(r.rows.filter(row=>row.included_in_estimate&&row.category==='labor').map(row=>row.row_id),[prefix+':whole-labor']);
    assert(r.rows.every(row=>row.unit_price===null));
   }
   assert(d.parameters.every(p=>p.default_value===null));assert.deepEqual(d.runtimeInput,{});
   return {status:'PARTIAL_SOURCE_BOUND_MASONRY005',knownRows:15,openNeeds:8,fullTechnicalAcceptance:false,acceptedNewCompleteTypes:0};
  },
 };
}
