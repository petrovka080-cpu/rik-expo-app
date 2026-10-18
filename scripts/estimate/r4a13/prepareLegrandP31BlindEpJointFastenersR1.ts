// WORK current-parent successor; physical R2/EP alias preserved. Root classification remains a mandatory gate.
// WORK: pure existing-publisher configuration, no CLI or connection/run on import.
// The draft classification deliberately fails. Root accepts the declared bounded scope separately.
import {strict as assert} from 'node:assert';import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';import {resolve} from 'node:path';
import {type MasterSingleDefinitionSuccessorConfig,validateIndependentCompletenessMapReferences} from './prepareMasterSingleDefinitionSuccessorR1';
import {legrandP31BlindEpJointPackR1 as pack,legrandP31BlindEpJointFastenerDefinitionR1,
 compileLegrandP31BlindEpJointFastenersR1,legrandP31BlindEpJointControlInputR1,p31EpPrefixR1 as prefix}
 from '../../../src/lib/estimate/v4/legrandP31BlindEpJointFastenersR1';
const packPath='data/estimate-benchmarks/source-packs/legrand-p31-blind-ep-joint-fasteners-r1.json';
const packSha256='48a88f5dab61309d95ad589ebd4964004884e6cb2d9c10a74314a7ddda8c8749';
const actualReadSha256='794206da3f79a1cee519bf6dd1d9e541b91e81b5625a1bcdd158201dd7ce0240';
const pair={"definitionReleaseId":"22e0a9f4-5112-55c9-bf15-7ec2f8c68a55","searchReleaseId":"6cbe0213-0537-51a8-b7e6-1ae089b3002e"};
const sha=(v:string|Buffer)=>createHash('sha256').update(v).digest('hex');
type Append=NonNullable<MasterSingleDefinitionSuccessorConfig['catalogAppend']>;
type Evidence=Readonly<{probeResultPath:string;probeResultSha256:string;classificationPath:string;classificationSha256:string;
 cycleDossierPath:string;cycleDossierSha256:string}>;
export function legrandP31BlindEpJointFastenersConfigR1(evidence:Evidence):MasterSingleDefinitionSuccessorConfig{
 for(const path of [evidence.probeResultPath,evidence.classificationPath,evidence.cycleDossierPath])
  assert((path.startsWith('.release-runtime/r568/')||path.startsWith('data/estimate-benchmarks/'))&&!path.replaceAll('\\','/').split('/').includes('..'),
   'ROOT_INTEGRATED_REPO_RELATIVE_EVIDENCE_REQUIRED');
 const load=(path:string,hash:string)=>{assert(/^[a-f0-9]{64}$/.test(hash),'EXACT_EVIDENCE_PIN_REQUIRED');
  const bytes=readFileSync(resolve(process.cwd(),path));assert.equal(sha(bytes),hash,'EVIDENCE_FILE_DRIFT:'+path);return JSON.parse(bytes.toString('utf8'));};
 assert.equal(evidence.probeResultSha256,actualReadSha256,'EXACT_POST_FLOOR_ROOT_V5_P31_READ_REQUIRED');
 const probe=load(evidence.probeResultPath,evidence.probeResultSha256),review=load(evidence.classificationPath,evidence.classificationSha256),
  cycle=load(evidence.cycleDossierPath,evidence.cycleDossierSha256);
 assert.equal(probe.contract,'p31-current-source-owner-scope-header/v5');
 assert.equal(probe.status,'SCOPED_SOURCE_OWNER_HEADER_READ_COMPLETE');
 assert.equal(probe.completeReadSet,true);assert.equal(probe.completeDeclaredReadSet,true);
 assert.equal(probe.globalAbsenceProved,false);assert.equal(probe.payload.resourceJsonRead,false);
 assert.equal(probe.transactionRolledBack,true);assert.equal(probe.dbWrites,false);assert.equal(probe.appJobs,false);assert.equal(probe.connectionClosed,true);
 assert.deepEqual(probe.pair,pair);assert.deepEqual(probe.executionContext,{...pair,
  sourceHead:'893ba8f2e575afcd6529d0dbdeeff4c567fd2c84',recordedReleaseSourceCommit:'24f33000a7a75188035707fe3852b34f92ce18c5'});
 assert.equal(probe.actualQueryHead,probe.executionContext.sourceHead);
 assert.equal(probe.recordedReleaseSourceCommit,probe.executionContext.recordedReleaseSourceCommit);
 assert.equal(probe.ancestryBefore.status,0);assert.equal(probe.ancestryAfter.status,0);
 assert.equal(probe.headerHashesVerified,true);assert.equal(probe.allSixScopedAbsencesProved,true);
 assert.equal(probe.currentPointerSha256,'c9889ca26d621d634151076f79e4dccb4d136c18098b351a72eb1dbfdb2082f4');
 assert.deepEqual(probe.scopeCaps,{"sourceRows":32,"boundResourceRows":64,"titleMatchingRows":64,"searchDocuments":32,"identityRows":32,"candidateDefinitions":32});
 assert.equal(probe.payload.pair.definition.sourceManifestSha256,'723891119b980497aeed42a463581645a1eadfed70b98ae844b4ee99a5c4666b');
 assert.equal(probe.payload.pair.search.snapshotSha256,'b6b6742122a098d36483215a3ff0ae075518e23aca7e355f205a79fbf344b92d');
 assert.equal(pack.currentEvidenceRebase.policy,'EXPLICIT_POST_FLOOR_SCOPED_READ_REBASE_NO_PHYSICAL_SOURCE_CHANGE');
 assert.deepEqual(pack.currentEvidenceRebase.actualContext,probe.executionContext);
 assert.equal(probe.releaseSourceRelation,'RECORDED_EXACT_RELEASE_COMMIT_IS_ANCESTOR_OF_ACTUAL_QUERY_HEAD');
 assert.equal(probe.inputSha256,'8df41863439af5546a17634964aef9e096af99288e15ec3ed1dad2372dfc6b3d');
 assert.equal(probe.sqlSha256,'e799dd34a86fdf17266a48e10f6b58c9c8ea1fd4a6d41c12cfe24637463bf005');
 assert.deepEqual(probe.payload.metrics,{sourceRows:0,identityRows:0,searchDocuments:0,boundResourceRows:0,titleMatchingRows:0,candidateDefinitions:0});
 for(const key of ['sources','boundRows','titleRows','candidates','identities','searchDocuments'])assert.deepEqual(probe.payload[key],[]);
 assert.equal(probe.payload.pair.definition.id,pair.definitionReleaseId);assert.equal(probe.payload.pair.search.id,pair.searchReleaseId);
 assert.equal(probe.payload.pair.search.definitionReleaseId,pair.definitionReleaseId);
 assert.equal(probe.payload.pair.definition.sourceHead,probe.recordedReleaseSourceCommit);
 assert.equal(probe.payload.pair.search.sourceHead,probe.recordedReleaseSourceCommit);
 assert.equal(review.decision,'ADMIT_DISTINCT_PHYSICAL_PROFILE','ROOT_CLASSIFICATION_REQUIRED');
 assert.equal(review.boundedCandidateScopeSufficientForPhysicalDuplicateReview,true,'BOUNDED_SCOPE_REVIEW_REQUIRED');
 assert.equal(review.globalAbsenceProved,false);assert.equal(review.probeResultSha256,actualReadSha256);
 assert.equal(review.sourcePackSha256,packSha256);assert.equal(review.cycleDossierSha256,evidence.cycleDossierSha256);
 assert.deepEqual(review.proposedIdentity,pack.proposedIdentity);
 assert.equal(review.existingConsumersUnchanged,true);assert.equal(review.genericNormTransferForbidden,true);
 assert.equal(review.oneBoltWithNutPaidOwner,true);assert.equal(review.fullTechnicalAcceptance,false);
 assert.equal(review.sourceOnlyPartialNotCompleteEstimate,true);
 assert.equal(review.epOnly,true);assert.equal(review.erDeferred,true);
 assert.deepEqual(pack.couplerChoices,[{sku:'341213',normValue:'EP Coupler LG-341213'}]);
 assert.equal(pack.sourceConflictAddendum.erDeferred,true);assert.equal(pack.sourceConflictAddendum.erZeroBoltNormNotClaimed,true);
 assert.equal(pack.manufacturerArtifacts[2].sha256,'ce874eb3c1be70e384dd97fb7cd73aae7d5fcaa37db995d7e977e08c1f1ac0a9');
 assert.equal(cycle.currentConsumerStatus,'DECLARED_P31_HEADER_SCOPE_COMPLETE_ZERO_MATCHES_PROPOSE_APPEND');
 assert.equal(cycle.actualCurrentRead.resultSha256,actualReadSha256);assert.equal(cycle.fullCycle.length,8);
 assert.deepEqual(cycle.openSourceNeedIds,pack.sourceNeeds.map(g=>g.id));
 assert(pack.sourceNeeds.every(g=>g.nextTaskRu&&g.ownerRu&&g.acceptanceRu),'CONCRETE_FULL_CYCLE_SOURCE_INTAKES_REQUIRED');
 const placement=review.searchPlacement as Append['searchPlacement'];
 assert.equal(placement.groupMode,'create');assert.equal(placement.domainId,'electrical');assert.equal(placement.systemId,'electrical');
 assert.equal(placement.groupId,'wg:master:electrical_legrand_p31_blind_ep_joint_fasteners');
 assert.equal(placement.membershipOrdinal,0);assert.equal(placement.elementType,'WORK');assert.equal(placement.operationKind,'NEW_INSTALLATION');
 assert.equal(placement.publicationState,'ADMITTED_BACKEND');assert.equal(placement.catalogOrigin,'GLOBAL');
 assert.equal(placement.adjudicationClass,'EFFECTIVE_WORK');assert.equal(placement.selectable,true);
 assert.equal(sha(readFileSync(resolve(process.cwd(),packPath))),packSha256,'INTEGRATED_SOURCE_PACK_REQUIRED');
 assert.deepEqual(JSON.parse(readFileSync(resolve(process.cwd(),packPath),'utf8')),pack);
 assert.equal(sha(readFileSync(resolve(process.cwd(),pack.existingNormSourcePack))),pack.existingNormSourcePackSha256,'EXISTING_NORM_PREIMAGE_REQUIRED');
 const current=JSON.parse(readFileSync(resolve(process.cwd(),'data/estimate-benchmarks/r568-local-developer-canonical-release.json'),'utf8'));
 assert.equal(current.definitionReleaseId,pair.definitionReleaseId,'PARENT_CHANGED_REVIEW_BEFORE_REPARENTING');
 assert.equal(current.searchReleaseId,pair.searchReleaseId,'PARENT_SEARCH_CHANGED_REVIEW_BEFORE_REPARENTING');
 assert.equal(sha(readFileSync(resolve(process.cwd(),'data/estimate-benchmarks/r568-local-developer-canonical-release.json'))),'c9889ca26d621d634151076f79e4dccb4d136c18098b351a72eb1dbfdb2082f4','EXACT_POST_FLOOR_POINTER_BYTES_REQUIRED');
 const d=legrandP31BlindEpJointFastenerDefinitionR1(),unresolved=pack.sourceNeeds.map(g=>prefix+':open-'+g.id),known=pack.normativeBindingRowIds;
 assert.deepEqual(known,d.resources.filter(r=>r.resource_graph.professionalPhysicalNormBindingV1!=null).map(r=>r.row_id));
 assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:pack.independentCompletenessMap,formulaDefinitions:d.formulas,resourceDefinitions:d.resources}),[]);
 return{
  contract:pack.contract,stopCode:'LEGRAND_P31_BLIND_EP_JOINT_FASTENERS',applicationName:'legrand-p31-blind-ep-joint-fasteners',
  expectedBranch:'codex/r4-a5-clean-08b18902',
  masterPath:'C:/Users/User/Downloads/MASTER_TZ_GOX_BUILD_PRODUCTION (10).md',masterSha256:'90e84fbfbf17321f1dd935f5e56a090f31619a3336e582bfabe1e66fcdfa48d7',
  parentReleaseId:pair.definitionReleaseId,parentSearchReleaseId:pair.searchReleaseId,
  currentReleasePath:resolve('data/estimate-benchmarks/r568-local-developer-canonical-release.json'),
  outputRoot:resolve('.release-runtime/r568/next-wave/legrand-p31-blind-ep-joint-fasteners'),
  sourcePaths:[packPath,'src/lib/estimate/v4/legrandP31BlindEpJointFastenersR1.ts','src/lib/estimate/v4/legrandP31BlindEpJointFastenersR1.test.ts',
   'scripts/estimate/r4a13/prepareLegrandP31BlindEpJointFastenersR1.ts',pack.existingNormSourcePack,
   'src/lib/estimate/v4/domainFactory/professionalPhysicalNormApplicabilityV1.ts',
   'src/lib/estimate/backendPlatform/canonicalEstimatePhysicalNormProjection.ts','src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts',
   'src/lib/estimate/v4/automaticConstructionOwnerR1.ts','src/lib/estimate/v4/effectivePurchaseBalanceR1.ts',
   'scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts','scripts/estimate/r4a13/masterSingleDefinitionAppendGuardsR1.ts',
   ...pack.manufacturerArtifacts.map(a=>a.path),evidence.probeResultPath,evidence.classificationPath,evidence.cycleDossierPath],
  catalogId:pack.proposedIdentity.catalogId,sourceId:pack.sourceId,normId:pack.existingNormId,
  sourceMetadata:{source_title:pack.titleRu,source_authority:'Legrand manufacturer FT0955-02 plus specificFT1045EN-01 and341895 product passport; existing reviewed electrical norm',
   source_kind:'COMPOSITE_EXISTING_MANUFACTURER_JOINT_NORM_PRODUCT_PASSPORT_AND_APPROVED_SEPARATE_SUPPLY',
   official_url:pack.manufacturerArtifacts[0].officialUrl,artifact_sha256:packSha256,
   exact_locator:pack.manufacturerArtifacts.map(a=>a.locatorRu+' SHA256 '+a.sha256).join(' | '),use_restriction:pack.scopeFactRu+' '+pack.excludedRu.join(' ')},
  parameterDefinitions:d.parameters,formulaDefinitions:d.formulas,resourceDefinitions:d.resources,
  shortInput:{p31_joint_count:3},acceptanceInput:legrandP31BlindEpJointControlInputR1(),
  runtimeProfileInput:{},runtimeProfileClassification:{},runtimeProfileSourceIds:{},expectedParentShape:[0,0,0],benchmarkOrdinal:0,
  validationScenario:'P31_BLIND_75_300_EP_8M6_ONE_WITH_NUT_OWNER_SIX_OPEN_NEEDS',
  passport:{canonicalRuName:pack.titleRu,workKey:pack.proposedIdentity.workKey,
   physicalResultRu:'Расход341895 с гайкой по8на реальный прямой стык blind P31 GS/PG75–300мм и отдельный заказ с балансом. Это частичная подработка; муфты/монтаж/приёмка/услуги остаются незакрытыми.',
   includedScopeRu:[pack.scopeFactRu,pack.supplyScopeFactRu,'Одна сборка341895 с гайкой — одна штука и один платный заказной владелец; без второй гайки.'],
   excludedScopeRu:pack.excludedRu,independentCompletenessMap:pack.independentCompletenessMap,unresolvedApplicableResourceRowIds:unresolved},
  applicability:{primaryMeasureParameterId:'p31_joint_count',manufacturer:'Legrand',traySkus:pack.trayProducts.map(p=>p.sku),
   couplerSkus:pack.couplerChoices.map(p=>p.sku),fastenerSku:'341895',heightMm:60,widthMm:[75,100,150,200,300],finish:'GS/PG',
   epOnly:true,erDeferred:true,fastenersPerActualJoint:8,tighteningTorqueNm:11,existingPhysicalNormId:pack.existingNormId,quantityScope:'PARTIAL',
   fullTechnicalAcceptance:false,acceptedNewCompleteTypes:0,oneBoltWithNutPaidOwner:true,
   explicitSeparateSupplyBoundaryRequired:true,unknownLaborAndServicesRemainOpen:true,noGenericPriceBindingInheritance:true},
  binding:{rowId:known[0],additionalRowIds:known.slice(1),applicability:{sourceKind:'EXISTING_REVIEWED_P31_8M6_NORM_AND_EXACT_341895_WITH_NUT_PRODUCT',
   quantityScope:'PARTIAL',fullTechnicalAcceptance:false,physicalQuantityParity:'consumed8perjoint; order checks source consumption through explicit formula'}},
  locator:{key:'legrand-p31-blind-ep-joint-fasteners-r1',payload:{sourcePack:pack,probeResultSha256:evidence.probeResultSha256,
   classificationReviewSha256:evidence.classificationSha256,cycleDossierSha256:evidence.cycleDossierSha256,
   fullCycle:cycle.fullCycle,sourceNeedIntakes:pack.sourceNeeds,independentlyDeclaredBindingRows:known}},
  search:{primaryUom:'pcs',canonicalNameRu:pack.titleRu,aliases:['Крепёж стыка глухого Legrand P31','P31 EP 8M6 с гайкой','341895'],
   shortScopeRu:'Частичный крепёж прямого стыка blind P31 GS/PG60мм,75–300мм, только EP341213. Монтаж и услуги не нормированы.',
   keyDistinguishingParameters:['p31_joint_count','p31_tray_sku','p31_coupler_sku','p31_supply_scope'],
   clarificationFields:d.parameters.filter(p=>p.truth_metadata.visibility_role==='USER_INPUT').map(p=>p.parameter_id),
   includedBoundaries:[pack.scopeFactRu,pack.supplyScopeFactRu],excludedBoundaries:pack.excludedRu,
   extraSearchTermsRu:'электромонтаж кабельный лоток стык Legrand P31 глухой GS PG 60 75 100 150 200 300 EP341213 M6 34189511Нм частичный крепёж',
   sourceProvenance:{sourcePack:packPath,existingNorm:pack.existingNormId,knownPaidMaterialOwners:1,unresolvedApplicableNeeds:6,
    currentReadSha256:evidence.probeResultSha256,globalAbsenceProved:false,fullTechnicalAcceptance:false}},
  catalogAppend:{requireUniqueWorkKey:true,identity:{namespace:'global',domain:'electrical',sourceIdentity:pack.proposedIdentity.sourceIdentity,
   workKey:pack.proposedIdentity.workKey,titleRu:pack.titleRu,denominatorEligible:true},searchPlacement:placement},
  forbiddenAdjacentMatchers:[/knauf|tarkett|hep2o|heating_hvac|elecor/iu],owner:'ROOT_SINGLE_WRITER_NEXT_WAVE',receiptFileStem:'legrand_p31_blind_joint_fasteners',
  verifyCore:async()=>{
   for(const artifact of pack.manufacturerArtifacts)assert.equal(sha(readFileSync(resolve(process.cwd(),artifact.path))),artifact.sha256,'PRIMARY_SOURCE_DRIFT:'+artifact.path);
   const r=await compileLegrandP31BlindEpJointFastenersR1(pack.proposedIdentity.catalogId,legrandP31BlindEpJointControlInputR1());
   assert.equal(r.rows.length,7);assert.equal(r.preliminaryNeeds.length,6);
   assert.deepEqual(r.preliminaryNeeds.map(n=>n.row_id).sort(),[...unresolved].sort());
   assert.deepEqual(r.rows.filter(x=>x.included_in_estimate).map(x=>x.row_id),[prefix+':fastener-order']);
   assert.deepEqual(r.rows.filter(x=>x.included_in_procurement).map(x=>x.row_id),[prefix+':fastener-order']);
   for(const [suffix,value] of [['joint-count','3'],['fastener-consumed','24'],['fastener-order','24'],['fastener-remaining','0']])
    assert.equal(r.rows.find(x=>x.row_id===prefix+':'+suffix)?.quantity,value);
   assert(d.parameters.every(p=>p.default_value===null));assert.deepEqual(d.runtimeInput,{});
   return{status:'PARTIAL_SOURCE_BOUND_P31_JOINT_FASTENERS',knownRows:7,needs:6,paidMaterialOwners:1,
    fullTechnicalAcceptance:false,acceptedNewCompleteTypes:0};
  },
 };
}
