// V2 exact actual-v4 readback + MASTER10. Draft classification is intentionally rejected.
// WORK candidate. Pure existing-publisher configuration; no CLI, connection or run on import.
// Construct only after the root-owned exact current-profile probe and independent classification.
import {strict as assert} from 'node:assert';import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';import {resolve} from 'node:path';
import {validateIndependentCompletenessMapReferences,type MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';
import {elecorSingleRoutePackR1 as pack,elecorSingleRouteMaterialDefinitionR1,
 compileElecorSingleRouteMaterialR1,elecorSingleRouteControlInputR1,prefix} from '../../../src/lib/estimate/v4/elecorSingleRouteMaterialR1';
const pair={definitionReleaseId:'039c5354-6791-52b5-8a47-ffacebb04d5c',searchReleaseId:'756fad32-723d-553c-8215-1e6271c05ec7'};
const packPath='data/estimate-benchmarks/source-packs/elecor-60x40-single-route-materials-r1.json';
const packSha256='e3dc50af4ef1f47a6866587403e5ae2b13f6ab10e4f18968b6136687174f9657';
const probeInputSha256='cc0e5c687cf79157acbb3799845cc52784ac6ccda5697a758862ecd9716d405a';
const probeSqlSha256={header:'d9e87de1f898b643ea0fb22675131605720bc53d07833148bc5e52f936475c8f',deep:'a4158f91d1da75fb2893a1e01ba4e16cbf36f0a310683c45821e684cba47ca83'};
const actualProbeResultSha256='ef7ff3f0f8b855c7d605b163ffe58b387723161b5046b23d41359c68782b2881';
const actualProbePayloadSha256='90251598dd60c25aaa57703479c86c73f34efd3886ff246c7de9487befde6abe';
const fullCyclePlanSha256='683fef164bd9ee8c2d37c41b8410b7b18cb244a4149bb9995aeada89c612d85a';
const sha=(v:string|Buffer)=>createHash('sha256').update(v).digest('hex');
const stable=(v:unknown):unknown=>Array.isArray(v)?v.map(stable):v!==null&&typeof v==='object'?
 Object.fromEntries(Object.entries(v).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,x])=>[k,stable(x)])):v;
type Append=NonNullable<MasterSingleDefinitionSuccessorConfig['catalogAppend']>;
type Evidence=Readonly<{probeResultPath:string;probeResultSha256:string;classificationPath:string;classificationSha256:string;cycleDossierPath:string;cycleDossierSha256:string}>;

/** Classification file is an explicit root/reviewer decision, not a generated PASS:
 * {decision:'ADMIT_DISTINCT_PHYSICAL_PROFILE',probeResultSha256,sourcePackSha256,
 *  proposedIdentity:{...exact pack.proposedIdentity},distinctProductSku,distinctKmsSku,
 *  standard40x25NotReplayed:true,pointConsumersUnchanged:true,
 *  fullTechnicalAcceptance:false,searchPlacement:<existing typed append placement>}
 * groupId/domain/etc must be reviewed from actual search placement; no guessed IDs here.
 */
export function elecor60x40SingleRouteMaterialsConfigR1(evidence:Evidence):MasterSingleDefinitionSuccessorConfig{
 // Shared publisher records git state for sourcePaths. Reviewed evidence must
 // first be integrated by root at exact repository-relative artifact paths.
 for(const path of [evidence.probeResultPath,evidence.classificationPath,evidence.cycleDossierPath])
  assert((path.startsWith('.release-runtime/r568/')||path.startsWith('data/estimate-benchmarks/'))
   &&!path.replaceAll('\\','/').split('/').includes('..'),'ROOT_INTEGRATED_REPO_RELATIVE_EVIDENCE_REQUIRED');
 const probeBytes=readFileSync(resolve(evidence.probeResultPath)),classificationBytes=readFileSync(resolve(evidence.classificationPath));
 assert(/^[a-f0-9]{64}$/.test(evidence.probeResultSha256)&&/^[a-f0-9]{64}$/.test(evidence.classificationSha256),'EXACT_REVIEWED_EVIDENCE_PINS_REQUIRED');
 assert.equal(sha(probeBytes),evidence.probeResultSha256,'ACTUAL_PROBE_RESULT_FILE_DRIFT');
 assert.equal(sha(classificationBytes),evidence.classificationSha256,'CLASSIFICATION_REVIEW_FILE_DRIFT');
 assert.equal(evidence.probeResultSha256,actualProbeResultSha256,'EXACT_ACTUAL_V4_SNAPSHOT_REQUIRED');
 const cycleBytes=readFileSync(resolve(evidence.cycleDossierPath));
 assert.equal(sha(cycleBytes),evidence.cycleDossierSha256,'FULL_CYCLE_DOSSIER_FILE_DRIFT');
 const cycleDossier=JSON.parse(cycleBytes.toString('utf8'));
 assert.equal(sha(JSON.stringify(stable(cycleDossier.fullCyclePlan))),fullCyclePlanSha256,'REVIEWED_FULL_CYCLE_PLAN_REQUIRED');
 const probe=JSON.parse(probeBytes.toString('utf8')),review=JSON.parse(classificationBytes.toString('utf8'));
 assert.equal(probe.contract,'elecor-60x40-current-bounded-physical-dedup-probe/v2');
 assert.equal(probe.status,'PASS_ELECOR60X40_CURRENT_PHYSICAL_DEDUP_READ');
 assert.equal(probe.completeReadSet,true);assert.equal(probe.completeDeclaredReadSet,true);
 assert.equal(probe.globalDeepAbsenceProved,false);assert.equal(probe.error,null);
 assert.equal(probe.payloadSha256,actualProbePayloadSha256);
 assert.deepEqual(probe.pair,pair,'EXACT_CURRENT_PARENT_PAIR_REQUIRED');
 assert.equal(probe.sourceHead,'b56e311d5a34094d19cd2a38b8cecbb386aef304');
 assert.equal(probe.inputSha256,probeInputSha256);assert.deepEqual(probe.sqlSha256,probeSqlSha256);
 assert.equal(probe.transactionRolledBack,true);assert.equal(probe.dbWrites,false);assert.equal(probe.appJobs,false);
 assert.equal(probe.decision,'NO_MATCH_IN_DECLARED_CABLE_CHANNEL_SCOPE_CLASSIFICATION_REQUIRED','EXISTING_PHYSICAL_MATCH_NO_APPEND_OR_REPLAY');
 assert.equal(sha(JSON.stringify(stable(probe.payload))),probe.payloadSha256,'ACTUAL_PROBE_PAYLOAD_DRIFT');
 const h=probe.payload.header,deep=probe.payload.deep;
 assert.equal(h.scopeMetrics.candidateDefinitions,48);assert.equal(h.scopeMetrics.candidateResourceRows,2998);
 assert.equal(h.scopeMetrics.identityClassifiedRowsIncludingNoncurrent,142);
 assert.equal(h.scopeMetrics.globalTitleMatchingResourceRows,0);assert.equal(h.scopeMetrics.globalResourceJsonFieldsRead,false);
 assert.deepEqual(deep.scopeMetrics,{deepNotGlobal:true,resourceRowsRead:2998,matchingResourceRows:0,requestedDefinitions:48,resourceJsonLogicalBytes:7417661,definitionsWithResourceRows:48});
 assert.equal(probe.directIdentityMatches.length,0);assert.equal(probe.directSearchMatches.length,0);
 const expectedProposed={...pack.proposedIdentity,channelSku:pack.product.channelSku,kmsSku:pack.product.kmsSku};
 assert.deepEqual(h.proposedIdentity,expectedProposed,'EXACT_PHYSICAL_PROFILE_REQUIRED');
 const ref=h.candidates.find((c:Record<string,unknown>)=>c.catalog_id==='canonical-work:base:electrical_interior_cable_channel_install_standard');
 assert.equal(ref?.definition_version_id,'72e33bb1-a323-519d-b68a-c9d44eb00a10');
 assert.equal(ref?.definition_sha256,'e5a3ddb236f5a9fc0e0c10804d1daa18284201fd981c5c63db8157bb9401e1cd');
 assert.equal(review.decision,'ADMIT_DISTINCT_PHYSICAL_PROFILE','INDEPENDENT_PHYSICAL_CLASSIFICATION_REQUIRED');
 assert.equal(review.boundedCandidateScopeSufficientForPhysicalDuplicateReview,true,'BOUNDED_SCOPE_CLASSIFICATION_REVIEW_REQUIRED');
 assert.equal(review.globalDeepAbsenceProved,false);assert.equal(review.fullCyclePlanSha256,fullCyclePlanSha256);
 assert.equal(review.probeResultSha256,evidence.probeResultSha256);assert.equal(review.sourcePackSha256,packSha256);
 assert.deepEqual(review.proposedIdentity,pack.proposedIdentity);assert.equal(review.distinctProductSku,pack.product.channelSku);
 assert.equal(review.distinctKmsSku,pack.product.kmsSku);assert.equal(review.standard40x25NotReplayed,true);
 assert.equal(review.pointConsumersUnchanged,true);assert.equal(review.fullTechnicalAcceptance,false);
 const placement=review.searchPlacement as Append['searchPlacement'];
 assert(placement&&['create','join'].includes(placement.groupMode),'REVIEWED_SEARCH_PLACEMENT_REQUIRED');
 assert.equal(placement.domainId,h.standard40x25SearchReference.search.domain_id,'EXISTING_ELECTRICAL_DOMAIN_REQUIRED');
 assert.equal(placement.elementType,'WORK');assert.equal(placement.operationKind,'NEW_INSTALLATION');
 assert.equal(placement.publicationState,'ADMITTED_BACKEND');assert.equal(placement.catalogOrigin,'GLOBAL');
 assert.equal(placement.adjudicationClass,'EFFECTIVE_WORK');assert.equal(placement.selectable,true);
 assert.equal(sha(readFileSync(resolve(process.cwd(),packPath))),packSha256,'INTEGRATED_PACK_PREIMAGE_REQUIRED');
 assert.deepEqual(JSON.parse(readFileSync(resolve(process.cwd(),packPath),'utf8')),pack,'IMPORTED_PACK_DRIFT');
 const d=elecorSingleRouteMaterialDefinitionR1(),unresolved=pack.sourceNeeds.map(g=>prefix+':open-'+g.id);
 const known=pack.normativeBindingRowIds;
 assert.deepEqual(known,d.resources.filter(r=>!unresolved.includes(r.row_id)).map(r=>r.row_id),'INDEPENDENT18_BINDINGS_REQUIRED');
 assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:pack.independentCompletenessMap,
  formulaDefinitions:d.formulas,resourceDefinitions:d.resources}),[]);
 return {
  contract:pack.contract,stopCode:'ELECOR60X40_SINGLE_ROUTE_MATERIALS',applicationName:'elecor60x40-single-route-materials',
  expectedBranch:'codex/r4-a5-clean-08b18902',
  masterPath:'C:/Users/User/Downloads/MASTER_TZ_GOX_BUILD_PRODUCTION (10).md',
  masterSha256:'90e84fbfbf17321f1dd935f5e56a090f31619a3336e582bfabe1e66fcdfa48d7',
  parentReleaseId:pair.definitionReleaseId,parentSearchReleaseId:pair.searchReleaseId,
  currentReleasePath:resolve('data/estimate-benchmarks/r568-local-developer-canonical-release.json'),
  outputRoot:resolve('.release-runtime/r568/next-wave/elecor60x40-single-route-materials'),
  sourcePaths:[packPath,'scripts/estimate/r4a13/prepareElecor60x40SingleRouteMaterialsR1.ts',
   'src/lib/estimate/v4/elecorSingleRouteMaterialR1.ts','src/lib/estimate/v4/elecorSingleRouteMaterialR1.test.ts',
   'scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts','scripts/estimate/r4a13/masterSingleDefinitionAppendGuardsR1.ts',
   'scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts','src/lib/estimate/v4/automaticConstructionOwnerR1.ts',
   'src/lib/estimate/v4/effectivePurchaseBalanceR1.ts','src/lib/estimate/v4/electricalElecorCableChannelStandardS2723.ts',
   ...pack.sourceEvidence.map(s=>s.path),evidence.probeResultPath,evidence.classificationPath,evidence.cycleDossierPath],
  catalogId:pack.proposedIdentity.catalogId,sourceId:pack.sourceId,normId:pack.normId,
  sourceMetadata:{source_title:pack.titleRu,source_authority:'IEK GROUP; confirmed project layout for2material supplies',
   source_kind:'COMPOSITE_MANUFACTURER_PRODUCT_AND_PROJECT_GEOMETRY_NOT_APPLICATION_LABOR_NORM',
   official_url:pack.sourceEvidence[0].officialUrl,artifact_sha256:packSha256,
   exact_locator:pack.sourceEvidence.map(s=>s.locatorRu+' SHA256 '+s.sha256).join(' | '),
   use_restriction:pack.scopeRu+' '+pack.excludedRu.join(' ')},
  parameterDefinitions:d.parameters,formulaDefinitions:d.formulas,resourceDefinitions:d.resources,
  shortInput:{elecor_route_m:25},acceptanceInput:elecorSingleRouteControlInputR1(),
  runtimeProfileInput:{},runtimeProfileClassification:{},runtimeProfileSourceIds:{},expectedParentShape:[0,0,0],benchmarkOrdinal:0,
  validationScenario:'ELECOR60X40_18M_FACTORY_PACK_TWO_PAID_OWNERS_EIGHT_OPEN_NEEDS',
  passport:{canonicalRuName:pack.titleRu,workKey:pack.proposedIdentity.workKey,
   physicalResultRu:'Частичный материальный состав нового прямого участка ELECOR60×40: секции и КМС по принятой карте, отдельно целые упаковки к заказу. Монтаж и завершение не нормированы.',
   includedScopeRu:[pack.scopeRu,'Два самостоятельных заказных владельца exact SKU; расходы секций/КМС и остатки справочные.'],
   excludedScopeRu:pack.excludedRu,independentCompletenessMap:pack.independentCompletenessMap,unresolvedApplicableResourceRowIds:unresolved},
  applicability:{primaryMeasureParameterId:'elecor_route_m',manufacturer:'IEK',channelSku:pack.product.channelSku,kmsSku:pack.product.kmsSku,
   channelSectionM:2,channelFactoryPackM:18,channelSectionsPerPack:9,kmsFactorySetPcs:4,
   requiredObjectFactIds:['elecor_route_scope','elecor_route_layout','elecor_route_document_reference'],
   stockEvidenceRequiredOnlyWhenPositive:['elecor_channel_stock_reference','elecor_kms_stock_reference'],
   inheritedGroupTitleDoesNotProveHighLoadApplicability:true,fullCycleOpenNeedsVisible:true,
   quantityScope:'PARTIAL',normalDryIndoorResidentialOrOfficeOnly:true,measuredSingleNewStraightRouteOnly:true,
   noPartialPackageOrOffcutStock:true,cableFillAndEnvironmentProjectAccepted:true,
   confirmedLaborNorm:false,fullTechnicalAcceptance:false,acceptedNewCompleteTypes:0,
   standard40x25NotReplayed:true,legacyPointConsumersUnchanged:true,noGenericPriceBindingInheritance:true},
  binding:{rowId:known[0],additionalRowIds:known.slice(1),applicability:{sourceKind:'EXACT_MANUFACTURER_PRODUCT_AND_CONFIRMED_PROJECT_GEOMETRY_AND_PACK_BALANCE',
   manufacturerConsumptionNormNotClaimed:true,quantityScope:'PARTIAL',fullTechnicalAcceptance:false}},
  locator:{key:'elecor60x40-single-route-materials-r1',payload:{sourcePack:pack,probeResultSha256:evidence.probeResultSha256,
   classificationReviewSha256:evidence.classificationSha256,fullCyclePlan:cycleDossier.fullCyclePlan,fullCyclePlanSha256,independentlyDeclaredBindingRows:known,openApplicationNormRows:unresolved}},
  search:{primaryUom:'m',canonicalNameRu:pack.titleRu,aliases:['IEK ELECOR60×40 белый — материалы прямого участка',pack.product.channelSku,pack.product.kmsSku],
   shortScopeRu:pack.scopeRu,keyDistinguishingParameters:['elecor_route_m','elecor_route_scope','elecor_route_layout'],
   clarificationFields:d.parameters.filter(p=>p.truth_metadata.visibility_role==='USER_INPUT').map(p=>p.parameter_id),
   includedBoundaries:[pack.scopeRu],excludedBoundaries:pack.excludedRu,
   extraSearchTermsRu:'электромонтаж кабельный канал ELECOR 60x40 белый CKK10-060-040-1-K01-018 КМС CKMP10D-S-060-040-K01 18 м 4 шт. частичные материалы',
   sourceProvenance:{sourcePack:packPath,primaryMeasureParameterId:'elecor_route_m',fullTechnicalAcceptance:false,
    knownMaterialOwners:2,unresolvedApplicableNeeds:8,currentDedupeResultSha256:evidence.probeResultSha256,classificationReviewSha256:evidence.classificationSha256}},
  catalogAppend:{requireUniqueWorkKey:true,identity:{namespace:'global',domain:placement.domainId,sourceIdentity:pack.proposedIdentity.sourceIdentity,
   workKey:pack.proposedIdentity.workKey,titleRu:pack.titleRu,denominatorEligible:true},searchPlacement:placement},
  forbiddenAdjacentMatchers:[/hep2o|knauf|tarkett|heating_hvac/iu],owner:'ROOT_SINGLE_WRITER_NEXT_WAVE',receiptFileStem:'elecor60x40_single_route_materials',
  verifyCore:async()=>{
   for(const source of pack.sourceEvidence)assert.equal(sha(readFileSync(resolve(source.path))),source.sha256,'PRIMARY_SOURCE_PIN:'+source.path);
   const result=await compileElecorSingleRouteMaterialR1(elecorSingleRouteControlInputR1());
   assert.equal(result.rows.length,18);assert.equal(result.preliminaryNeeds.length,8);
   assert.deepEqual(result.preliminaryNeeds.map(n=>n.row_id).sort(),[...unresolved].sort());
   assert.deepEqual(result.rows.filter(r=>r.included_in_estimate).map(r=>r.row_id).sort(),[prefix+':channel-order',prefix+':kms-order'].sort());
   for(const [key,value] of [['installed-sections','13'],['internal-joints','12'],['channel-order','2'],['kms-order','3'],['tail-length','1']])
    assert.equal(result.rows.find(r=>r.row_id===prefix+':'+key)?.quantity,value,key);
   assert(d.parameters.every(p=>p.default_value===null));assert.deepEqual(d.runtimeInput,{});
   return {status:'PARTIAL_EXACT_60X40_MATERIAL_GEOMETRY_CHECKED',knownRows:18,needs:8,paidMaterialOwners:2,
    channelFactoryPackM:18,kmsFactorySetPcs:4,fullTechnicalAcceptance:false,acceptedNewCompleteTypes:0};
  },
 };
}
