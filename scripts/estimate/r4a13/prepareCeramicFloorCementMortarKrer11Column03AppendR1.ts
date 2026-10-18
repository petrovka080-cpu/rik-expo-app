// Authoring config for the EXISTING governed publisher. No PG/CLI/write on import.
import {strict as assert} from 'node:assert';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {type MasterSingleDefinitionSuccessorConfig,validateIndependentCompletenessMapReferences} from './prepareMasterSingleDefinitionSuccessorR1';
import {ceramicFloor02703PackR1 as pack,ceramicFloor02703PrefixR1 as prefix,
 ceramicFloor02703DefinitionR1,ceramicFloor02703CompletenessMapR1,compileCeramicFloor02703R1} from '../../../src/lib/estimate/v4/ceramicFloorCementMortarKrer11Column03R1';
import {assertCanonicalMachineHourDefinitionV1,canonicalManualMachineHourPriceCoverageV1,
 resolveCanonicalMachineHourPriceCoverageV1} from '../../../src/lib/estimate/backendPlatform/canonicalMachineHourPriceCoverageV1';
import {resolveSingleDefinitionAppendParentBridgeR1,type AppendParentPairR1} from './masterSingleDefinitionAppendParentBridgeR1';
import {hydrotestSteelDefinitionR1,hydrotestSteelPackR1} from '../../../src/lib/estimate/v4/hydrotestInternalSteelDn50Krer16R1';

type Json=Record<string,any>;
type Pin=Readonly<{path:string;sha256:string}>;
export type CeramicFloor02703AppendEvidenceR1=Readonly<{
 initialRead:Pin;initialClosedGuard:Pin;supplementRead:Pin;supplementClosedGuard:Pin;
 sixFloorLayRead:Pin;sixFloorLayClosedGuard:Pin;classificationProposal:Pin;
 classificationDecision:Pin;cycleDossier:Pin;rootReaderContext:Pin;
}>;
export type CeramicFloor02703ParentBridgeR1=Readonly<{
 publication:Pin;readback:Pin;rootContext:Pin;
 expectedSource:Readonly<{head:string;tree:string}>;expectedSuccessor:AppendParentPairR1;
}>;
type Append=NonNullable<MasterSingleDefinitionSuccessorConfig['catalogAppend']>;
const packPath='data/estimate-benchmarks/source-packs/ceramic-floor-cement-mortar-krer11-027-03-r1.json';
const packSha='b0e690d234f5e8522ff808e0d560b4b2ed42bbd84c39146765378c802eb6bc12';
const capturedContext={definitionReleaseId:'aca4fa71-60c2-57db-83c8-5c8be93175a7',searchReleaseId:'0c4a0ed7-a579-57ae-9104-4e088dd09963',
 sourceHead:'d5bdb3e7722a020b0e4f81770847a7fcd6b01a12',recordedReleaseSourceCommit:'9bab72d75ed0b0aff9323d8cab5644563fbfa6b6'};
const expectedEvidence={
 initialRead:'b8c54af382b67a1871e3c7835fcd22b5034bd116f6d6a7b6ea3c04a986345a4f',
 initialClosedGuard:'9ef51cb50880bfda97effc6d119317bc1ca7b85590bef719c35b9fac6ef2a300',
 supplementRead:'6e6f16a6ff89b31cfa028d6c87d148dfd671d9cf2270643934f3a0c702234812',
 supplementClosedGuard:'92eca895879f22673a57166d9425d801b4fd37d65386270a542edecf7c1dfaf9',
 sixFloorLayRead:'bf15a38b85c9c2eae2c2f233d58fd6de37d09ca15bec551a6db35118c00180c6',
 sixFloorLayClosedGuard:'9a305456e9770a90c50623ab88199c816da33b71c343ccdf73c3f72ec7d65e5c',
 classificationProposal:'2222f83406d71259fe3efda03b9b7ee210d4f34400d007b7672dbe2931c28b39',
 classificationDecision:'f59b3d474f0a70ab877e7a7c6e5777f7c5b1bca5ac22b6f5dfd53f90dc091814',
 cycleDossier:'1696e6f6d24319bce41ff06a6eaa28b1118fb87daa1b335ca2a79d8f9c103fed',
 rootReaderContext:'c856e403e312efaf23821649d48979bb828a077dfe68aea7faa4c17f3e37dc0b',
} as const;
const sha=(value:string|Buffer)=>createHash('sha256').update(value).digest('hex');
const rows=(result:Json,name:string):Json[]=>result.sets[name].rawRows.map((raw:string)=>JSON.parse(raw));
function load(pin:Pin):Json{
 const normalized=pin.path.replaceAll('\\','/');
 assert((normalized.startsWith('data/estimate-benchmarks/')||normalized.startsWith('.release-runtime/r568/'))&&!normalized.split('/').includes('..'),'ROOT_INTEGRATED_REPO_RELATIVE_EVIDENCE_REQUIRED');
 assert(/^[a-f0-9]{64}$/.test(pin.sha256));
 const bytes=readFileSync(resolve(process.cwd(),pin.path));assert.equal(sha(bytes),pin.sha256,'EXACT_EVIDENCE_BYTES:'+pin.path);
 return JSON.parse(bytes.toString('utf8'));
}
function closedRead(result:Json,count:number){
 assert(result.completeReadSet&&result.transactionRolledBack&&result.connectionClosed&&result.error===null,'CLOSED_READ_REQUIRED');
 assert.deepEqual(result.executionContext,capturedContext);assert.equal(result.actualQueryHead,capturedContext.sourceHead);
 assert.equal(result.globalResourceJsonRead,false);assert.equal(result.globalAbsenceProved,false);
 assert.equal(result.databaseWrites,false);assert.equal(result.appJobs,false);assert.equal(Object.keys(result.sets).length,count);
 for(const s of Object.values(result.sets) as Json[]){assert.equal(s.rowCount,s.rawRows.length);assert.equal(sha(s.rawRows.join('\n')+(s.rawRows.length?'\n':'')),s.sha256,'EXACT_READSET_BYTES');}
}
function closedGuard(guard:Json){
 // Initial combined guard failed only the separate water cap. Tile5 is independently complete.
 assert.equal(guard.noOwnedProcessStillRunning,true);assert.deepEqual(guard.remainingOwnedProcesses,[]);assert.deepEqual(guard.cleanupErrors,[]);
}
function reviewedHydrotestParent(bridge:CeramicFloor02703ParentBridgeR1,pointerBytes:Buffer):AppendParentPairR1{
 const p=load(bridge.publication),r=load(bridge.readback),context=load(bridge.rootContext);
 assert.equal(context.status,'ROOT_VERIFIED_CLOSED_HYDROTEST_APPEND_FOR_CERAMIC02703_PARENT_R1');
 assert.deepEqual(context.capturedContext,capturedContext,'HISTORICAL_READER_CONTEXT_MUST_REMAIN_IMMUTABLE');
 assert.deepEqual(context.source,bridge.expectedSource);assert.deepEqual(context.successor,bridge.expectedSuccessor);
 assert.deepEqual(context.proofPins,{publication:bridge.publication,readback:bridge.readback});
 assert.equal(context.pointerPath,'data/estimate-benchmarks/r568-local-developer-canonical-release.json');
 assert.equal(context.pointerSha256,sha(pointerBytes),'BRIDGE_LIVE_POINTER_BYTES_CHANGED');
 assert.equal(context.rootCheckedCurrentGitSourceAndPointer,true);assert.equal(context.noOwnedProcessStillRunning,true);
 const water=hydrotestSteelDefinitionR1(),wp=hydrotestSteelPackR1;
 const parent=resolveSingleDefinitionAppendParentBridgeR1({publication:p,readback:r,currentSource:context.source,
  expected:{applyStatus:'GREEN_INTERNAL_STEEL_HYDROTEST_005_01_PREPARED_NOT_ACTIVE',
   readbackContract:'hydrotest005-existing-governed-independent-readback/v1',readbackStatus:'PASS_HYDROTEST005_APPLY_INDEPENDENT_PAYLOAD_READBACK',
   publicationResultSha256:bridge.publication.sha256,source:bridge.expectedSource,
   parent:{definitionReleaseId:capturedContext.definitionReleaseId,searchReleaseId:capturedContext.searchReleaseId},
   successor:bridge.expectedSuccessor,parentManifestCount:10464,catalogId:wp.proposedIdentity.catalogId,sourceId:wp.sourceId,
   groupId:'wg:master:internal_steel_water_hydraulic_test_krer16_07_005_01',
   shape:[water.parameters.length,water.formulas.length,water.resources.length],normativeBindings:18,priceBindings:0,unresolvedNeeds:6}});
 // The explicit bridge admits only the reviewed water append, never a general rebase.
 assert.deepEqual(r.newState.unresolvedRowIds.slice().sort(),wp.gaps.map(g=>wp.prefix+':open:'+g.id).sort());
 assert.deepEqual(r.newState.waterMachineScope,{rowId:wp.prefix+':hydraulic-plant-consumed',resourceCode:'04-0440',
  costTreatment:'INFORMATIONAL_SCOPE',procurementEligible:false,machinePriceScopeStatus:'MACHINE_PRICE_SCOPE_PENDING',
  machinePriceOwnerAdmitted:false,paidMachineOwnerCount:0});
 assert.deepEqual(r.preservation.masonry,{catalogId:'canonical-work:master:brick_partition_half_unreinforced_upto4m_krer08_02_002_05',
  definitionId:'28eeeab4-7cec-55fb-994d-96ee963282fb',baselineId:'82d682d2-4495-584d-b58e-a22993dcb05a',
  payloadSha256:'14e522e987285a09faf06d18cb0b05653a1549a07daf734ce82256f533ab5c2a',unchanged:true});
 for(const [path,hash] of [
  ['data/estimate-benchmarks/source-packs/hydrotest-internal-steel-dn50-krer16-005-01-r1.json','fefa545bd90c18f8d9f5f593f13a39cfa8e05608bd29d68994cbe62e05b0d635'],
  ['src/lib/estimate/v4/hydrotestInternalSteelDn50Krer16R1.ts','685c6add400850fec4653cdd0bdcfa846cfaaa7b8c6da733e38de35bb9622430'],
  ['scripts/estimate/r4a13/prepareHydrotestInternalSteelDn50Column01AppendR1.ts','cbbf7a350a9a190424e145ee134176880d53ced554596c1bea3378887640c9af']]){
  const source=p.source.sourceHashes.filter((x:Json)=>x.path===path);
  assert.equal(source.length,1);assert.equal(source[0].sha256,hash);assert.equal(source[0].trackedState,'CLEAN_AT_HEAD');
 }
 return parent;
}
function control(area=100):Record<string,unknown>{
 const p:Record<string,unknown>={net_ceramic_floor_area_m2:area};
 for(const f of pack.scopeFacts)p[f.id]=f.value;
 for(const id of pack.requiredProjectReferences)p[id]='CONTROL_ONLY approved source-compatible reference; not actual project data';
 for(const m of pack.machines)p[m.parameterId]=m.ownValue;
 const quantum:Record<string,number>={water:0.001,'ceramic-tile':0.01,sawdust:0.001,'ready-mortar-m150':0.001};
 for(const m of pack.materials){p[m.specificationId]='CONTROL_ONLY exact source-compatible supply; not a supplier offer';p[m.parameterPrefix+'_stock']=0;p[m.parameterPrefix+'_reserve']=0;p[m.parameterPrefix+'_quantum']=quantum[m.id];}
 return p;
}

/** Historical evidence is immutable. A changed live parent requires a separately
 * reviewed successor; this factory never rewrites the captured query context. */
export function ceramicFloorCementMortarKrer11Column03AppendConfigR1(evidence:CeramicFloor02703AppendEvidenceR1,parentBridge?:CeramicFloor02703ParentBridgeR1):MasterSingleDefinitionSuccessorConfig{
 assert.deepEqual(Object.keys(evidence).sort(),Object.keys(expectedEvidence).sort(),'EXACT_EVIDENCE_FIELDS_REQUIRED');
 for(const key of Object.keys(expectedEvidence) as (keyof typeof expectedEvidence)[])assert.equal(evidence[key].sha256,expectedEvidence[key],'EXACT_PIN:'+key);
 const initial=load(evidence.initialRead),supplement=load(evidence.supplementRead),six=load(evidence.sixFloorLayRead);
 closedRead(initial,5);closedRead(supplement,6);closedRead(six,4);
 for(const key of ['initialClosedGuard','supplementClosedGuard','sixFloorLayClosedGuard'] as const)closedGuard(load(evidence[key]));
 const proposal=load(evidence.classificationProposal),review=load(evidence.classificationDecision),cycle=load(evidence.cycleDossier),context=load(evidence.rootReaderContext);
 assert.equal(context.status,'ROOT_VERIFIED_POST_MASONRY_READER_CONTEXT');assert.deepEqual(context.executionContext,capturedContext);
 assert.equal(review.status,'ROOT_REVIEWED_SOURCE_SPECIFIC_PARTIAL_CERAMIC02703_APPEND_R3');
 assert.equal(review.decision,'ADMIT_SOURCE_SPECIFIC_PARTIAL_APPEND');assert.equal(review.proposalSha256,evidence.classificationProposal.sha256);
 assert.deepEqual(review.executionContext,capturedContext);assert.equal(review.published,false);
 assert.equal(review.rootVerifiedRawHeaderHashes,184);assert.equal(review.rootVerifiedCompositionDecisions,17);
 assert.equal(review.rootVerifiedResourceAndFormulaWitnesses,70);assert.equal(review.existing184Unchanged,true);
 assert.equal(review.sourceNormRatesChanged,false);assert.equal(review.globalAbsenceProved,false);
 assert.equal(review.fullTechnicalAcceptance,false);assert.equal(review.newCompleteTypesAccepted,0);
 assert.equal(review.sourcePriceBindingTransferAllowed,false);assert.equal(review.parentRebindAutomaticAllowed,false);
 assert.equal(review.sixMachineMappingsApprovedForRootMerge,true);assert.equal(review.aggregateOperator2_66InformationalOnly,true);
 assert.equal(review.extraTruckDriver0_28HoursAllowed,false);assert.equal(review.wholeWorker119_78Unsplit,true);
 assert.equal(review.newGroupAbsenceCaptured,false);assert.equal(review.mandatoryCreatePreflightAndLockedNullGroupCheck,true);
 for(const p of [evidence.initialRead,evidence.supplementRead,evidence.sixFloorLayRead])assert(review.actualReadPins.some((x:Json)=>x.sha256===p.sha256));
 assert.deepEqual(review.sixOpenNeeds,pack.gaps.map(g=>g.id));
 assert.equal(review.catalogId,pack.catalogId);assert.equal(review.sourceId,pack.sourceId);assert.deepEqual(review.identity,proposal.proposedIdentity);
 assert.equal(review.identity.titleRu,pack.titleRu);
 assert.equal(proposal.all184CurrentHeaders.length,184);assert.equal(proposal.seventeenCompositionDecisions.length,17);
 assert.equal(proposal.boundedScope.unresolvedPlausibleHeaderCount,0);assert.equal(proposal.globalAbsenceProved??proposal.boundedScope.globalAbsenceProved,false);
 const rawHeaders=[...initial.sets.currentCheapIdentitySearchHeaders.rawRows,...supplement.sets.additionalCurrentFloorAliasHeaders.rawRows];
 const capturedHeaderHashes=new Map<string,string>(rawHeaders.map((raw:string):[string,string]=>[JSON.parse(raw).catalog_id,sha(raw)]));
 for(const h of proposal.all184CurrentHeaders)assert.equal(h.capturedHeaderRawSha256,capturedHeaderHashes.get(h.catalog_id),'EXACT_CURRENT_HEADER_WITNESS');
 const rawWitnesses=new Set<string>();
 for(const result of [supplement,six])for(const s of Object.values(result.sets) as Json[])for(const raw of s.rawRows)rawWitnesses.add(sha(raw));
 let witnessCount=0;
 for(const item of proposal.seventeenCompositionDecisions)for(const witness of item.exactWitnesses){
  assert(rawWitnesses.has(witness.resourceRawSha256));assert(rawWitnesses.has(witness.formulaRawSha256));witnessCount+=2;
 }
 assert.equal(witnessCount,70);
 const source=rows(initial,'exactEmittedSourceAndCurrentConsumers');assert.equal(source.length,1);
 assert.deepEqual(source[0],{exact_source_count:0,source_preimage:null,current_consumer_count:0,current_consumer_headers:[]});
 assert.equal(review.capturedSourcePreimage.sourceKey,pack.sourceId);assert.equal(review.capturedSourcePreimage.expected,null);
 assert.equal(proposal.groupPreimage.actualAbsenceClaim,false,'NO_FALSE_CAPTURED_GROUP_ABSENCE');
 assert.equal(cycle.fullCycle.length,8);assert.equal(cycle.concreteSourceIntakes.length,6);
 assert(pack.gaps.every(g=>g.ownerRu&&g.nextTaskRu&&g.acceptanceRu));
 const accepted=review.searchPlacement;
 assert.equal(accepted.groupMode,'create');assert.equal(accepted.groupId,'wg:master:ceramic_floor_cement_mortar_m150');
 assert.equal(accepted.membershipOrdinal,0);assert.equal(accepted.domainId,'tile_stone');assert.equal(accepted.systemId,'tile_stone');
 const placement:Append['searchPlacement']={groupMode:'create',groupId:accepted.groupId,groupNameRu:accepted.groupNameRu,
  domainId:accepted.domainId,systemId:accepted.systemId,subsystemId:accepted.subsystemId,assemblyId:accepted.assemblyId,workFamilyId:accepted.workFamilyId,
  membershipOrdinal:0,breadcrumb:[accepted.groupNameRu],elementType:'WORK',operationKind:'NEW_INSTALLATION',
  technologyVariant:'SMOOTH_UNGLAZED_SINGLE_COLOUR_CERAMIC_READY_CEMENT_M150',constructionState:'NEW',
  normativeClassifiers:[pack.normId],applicabilityTags:['FLOOR','UNGLAZED_SINGLE_COLOUR_WITH_COLOURANT','READY_CEMENT_MASONRY_M150','CEMENT_JOINTS','NET_AREA_KRER11_2_2','PARTIAL_SIX_OPEN_NEEDS'],
  publicationState:'ADMITTED_BACKEND',catalogOrigin:'GLOBAL',adjudicationClass:'EFFECTIVE_WORK',selectable:true,
  groupOracleDisposition:{classificationSha256:evidence.classificationDecision.sha256,decision:review.decision,existing184Unchanged:true,freshCreateNullGroupAndOrdinalCheckRequired:true},
  independentDisposition:{classification:'CANONICAL_VISIBLE',classificationSha256:evidence.classificationDecision.sha256,sourceOnlyPartialNotComplete:true}};
 assert.equal(sha(readFileSync(resolve(process.cwd(),packPath))),packSha,'INTEGRATED_SOURCE_PACK_BYTES');
 assert.equal(sha(readFileSync(resolve(process.cwd(),pack.source.path))),pack.source.sha256,'OFFICIAL_PRIMARY_ARTIFACT_BYTES');
 const pointerPath='data/estimate-benchmarks/r568-local-developer-canonical-release.json';
 const pointerBytes=readFileSync(resolve(process.cwd(),pointerPath)),pointer=JSON.parse(pointerBytes.toString('utf8'));
 const parent=parentBridge?reviewedHydrotestParent(parentBridge,pointerBytes):capturedContext;
 assert.equal(pointer.productionAccessed,false);assert.equal(pointer.definitionReleaseId,parent.definitionReleaseId,'PARENT_DRIFT_REQUIRES_EXPLICIT_REBASE_SUCCESSOR');
 assert.equal(pointer.searchReleaseId,parent.searchReleaseId,'SEARCH_PARENT_DRIFT_REQUIRES_EXPLICIT_REBASE_SUCCESSOR');
 const d=ceramicFloor02703DefinitionR1(),completeness=ceramicFloor02703CompletenessMapR1(),unresolved=pack.gaps.map(g=>prefix+':'+g.id);
 assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:completeness,formulaDefinitions:d.formulas,resourceDefinitions:d.resources}),[]);
 assert.deepEqual(completeness.entries.map(e=>e.resolution.rowId).sort(),d.resources.map(r=>r.row_id).sort());
 // Independently declared printed resources + included operations + exclusive physical fulfillment.
 // Purchase balances are derived and six unknown needs are not falsely bound as printed norms.
 const bindingIds=['whole-labor','operator-information','forklift5t-consumed','hoist500kg45m-consumed','truck5t-consumed',
  'water-consumed','ceramic-tile-consumed','sawdust-consumed','ready-mortar-m150-consumed',
  'included-base-preparation','included-tiles-bedding-joints','included-curing','included-cleaning-washing',
  'forklift5t-own','forklift5t-hired','hoist500kg45m-own','hoist500kg45m-hired','truck5t-own','truck5t-hired'].map(id=>prefix+':'+id);
 assert.equal(bindingIds.length,19);assert(bindingIds.every(id=>d.resources.some(r=>r.row_id===id)));
 return {
  contract:pack.contract,stopCode:'CERAMIC_FLOOR_CEMENT_MORTAR_KRER11_COLUMN03',applicationName:'ceramic-floor-cement-mortar-krer11-column03',
  expectedBranch:'codex/r4-a5-clean-08b18902',masterPath:'C:/Users/User/Downloads/MASTER_TZ_GOX_BUILD_PRODUCTION (10).md',masterSha256:'90e84fbfbf17321f1dd935f5e56a090f31619a3336e582bfabe1e66fcdfa48d7',
  parentReleaseId:parent.definitionReleaseId,parentSearchReleaseId:parent.searchReleaseId,currentReleasePath:resolve(pointerPath),outputRoot:resolve('.release-runtime/r568/next-wave/ceramic02703/publication'),
  sourcePaths:[packPath,'src/lib/estimate/v4/ceramicFloorCementMortarKrer11Column03R1.ts','src/lib/estimate/v4/ceramicFloorCementMortarKrer11Column03R1.test.ts',
   'scripts/estimate/r4a13/prepareCeramicFloorCementMortarKrer11Column03AppendR1.ts','scripts/estimate/r4a13/prepareCeramicFloorCementMortarKrer11Column03AppendR1.test.ts',
   'src/lib/estimate/v4/automaticConstructionOwnerR1.ts','src/lib/estimate/v4/effectivePurchaseBalanceR1.ts','src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts',
   'src/lib/estimate/backendPlatform/canonicalMachineHourPriceCoverageV1.ts','scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts','scripts/estimate/r4a13/masterSingleDefinitionAppendGuardsR1.ts',
   'scripts/estimate/r4a13/masterSingleDefinitionAppendParentBridgeR1.ts','scripts/estimate/r4a13/masterSingleDefinitionAppendParentBridgeR1.test.ts',
   'src/lib/estimate/v4/hydrotestInternalSteelDn50Krer16R1.ts','data/estimate-benchmarks/source-packs/hydrotest-internal-steel-dn50-krer16-005-01-r1.json',
   pack.source.path,...Object.values(evidence).map(p=>p.path),...(parentBridge?[parentBridge.publication.path,parentBridge.readback.path,parentBridge.rootContext.path]:[])],
  catalogId:pack.catalogId,sourceId:pack.sourceId,normId:pack.normId,
  sourceMetadata:{source_title:pack.titleRu,source_authority:'Министерство строительства Кыргызской Республики, КРЕР11-2015 Полы',source_kind:'OFFICIAL_NORM_EXACT_SINGLE_COLUMN_WITH_EXPLICIT_PARTIAL_COMPLETION',official_url:pack.source.officialUrl,artifact_sha256:pack.source.sha256,effective_from:'2016-01-01',exact_locator:pack.source.locatorRu,use_restriction:pack.scopeRu+'; '+pack.excludedRu.join('; ')},
  parameterDefinitions:d.parameters,formulaDefinitions:d.formulas,resourceDefinitions:d.resources,
  shortInput:{net_ceramic_floor_area_m2:100},acceptanceInput:control(),runtimeProfileInput:{},runtimeProfileClassification:{},runtimeProfileSourceIds:{},expectedParentShape:[0,0,0],benchmarkOrdinal:0,
  validationScenario:'KRER11_027_03_UNGLAZED_CERAMIC_FLOOR_M150_WHOLE119_78_FOUR_PURCHASES_THREE_EXCLUSIVE_MACHINES_SIX_OPEN_NEEDS',
  passport:{canonicalRuName:pack.titleRu,workKey:pack.proposedIdentity.workKey,physicalResultRu:pack.scopeRu+' Исходный состав частичный; шесть дополнительных потребностей остаются открытыми.',
   includedScopeRu:['Подготовка основания, подбор и сортировка плитки, настилка на готовом М150 и цементная заделка швов, уход, очистка и промывка.','Весь труд119.78ч на100м² без разделения по стадиям.','Четыре материальных баланса расход/заказ. Три исходные машины с одним выбранным own/hired владельцем;2.66ч машинистов справочно без отдельной оплаты.'],
   excludedScopeRu:pack.excludedRu,independentCompletenessMap:completeness,unresolvedApplicableResourceRowIds:unresolved},
  applicability:{primaryMeasureParameterId:pack.primaryMeasureParameterId,sourceNorm:pack.normId,profile:'SMOOTH_UNGLAZED_SINGLE_COLOUR_WITH_COLOURANT',mortar:'READY_CEMENT_MASONRY_M150',jointMethod:'SOURCE_CEMENT_JOINTS_INCLUDED',areaRule:'KRER11_2_2',quantityScope:'PARTIAL',fullTechnicalAcceptance:false,acceptedNewCompleteTypes:0,unknownPricesRemainUnknown:true,historicBindingsInherited:false},
  binding:{rowId:bindingIds[0],additionalRowIds:bindingIds.slice(1),applicability:{sourceKind:'OFFICIAL_027_03_PRINTED_RESOURCES_INCLUDED_OPERATION_AND_EXCLUSIVE_MACHINE_FULFILLMENT',purchaseBalancesAreDerivedNotNewConsumptionNorms:true,fullTechnicalAcceptance:false}},
  locator:{key:'krer11-01-027-03-ceramic-floor-m150-r1',payload:{sourcePack:pack,classificationSha256:evidence.classificationDecision.sha256,classificationProposalSha256:evidence.classificationProposal.sha256,actualReadSha256:[evidence.initialRead.sha256,evidence.supplementRead.sha256,evidence.sixFloorLayRead.sha256],fullCycle:cycle.fullCycle,sourceIntakes:cycle.concreteSourceIntakes,independentlyDeclaredBindingRows:bindingIds,historicalReaderContext:capturedContext,explicitParentBridge:parentBridge??null}},
  search:{primaryUom:'m2',canonicalNameRu:pack.titleRu,aliases:['Неглазурованная одноцветная керамическая плитка на М150','Керамический пол на готовом цементном растворе — КРЕР11-01-027-03','Керамические полы с цементной заделкой швов, колонка03'],
   shortScopeRu:'Точная027-03: гладкая неглазурованная одноцветная керамика с красителем на готовом М150, чистая площадь§2.2; цельный труд, четыре материала, три машины; шесть потребностей открыты.',
   keyDistinguishingParameters:[pack.primaryMeasureParameterId,'ceramic_floor_profile','cement_mortar_system','approved_floor_specification_reference'],clarificationFields:d.parameters.filter(p=>p.truth_metadata.visibility_role==='USER_INPUT').map(p=>p.parameter_id),
   includedBoundaries:['Исходная подготовка, настилка, цементные швы, уход и промывка в одном труде.','Готовый кладочный раствор М150; четыре отдельных баланса заказа.'],excludedBoundaries:pack.excludedRu,
   extraSearchTermsRu:'полы плитка керамическая неглазурованная одноцветная цементный раствор М150 КРЕР11-01-027-03',
   sourceProvenance:{sourcePack:packPath,primarySha256:pack.source.sha256,classificationSha256:evidence.classificationDecision.sha256,fullTechnicalAcceptance:false,unresolvedApplicableNeeds:6,globalAbsenceProved:false,explicitParentBridge:parentBridge??null}},
  catalogAppend:{requireUniqueWorkKey:true,capturedSourcePreimage:{sourceKey:pack.sourceId,expected:null},identity:{namespace:'global',domain:'tile_stone',sourceIdentity:pack.proposedIdentity.sourceIdentityId,workKey:pack.proposedIdentity.workKey,titleRu:pack.titleRu,denominatorEligible:true},searchPlacement:placement},
  forbiddenAdjacentMatchers:[/roof:|road-upper-base:|floor-underlayer:|legrand|elecor|granite-kerb|masonry:brick-partition:|cm11|ce40|ct17|cs25/iu],owner:'ROOT_SINGLE_WRITER_NEXT_WAVE',receiptFileStem:'ceramic02703_cement_mortar_floor',
  verifyCore:async()=>{
   for(const m of pack.machines)for(const mode of ['own','hired']){
    const row=d.resources.find(r=>r.row_id===prefix+':'+m.id+'-'+mode)!;
    const requirement=assertCanonicalMachineHourDefinitionV1({catalogId:pack.catalogId,rowId:row.row_id,unitId:row.unit_id,sourceMetadata:row.source_metadata});
    assert(requirement&&requirement.resourceCode===m.resourceCode&&requirement.operator===m.operator&&requirement.operationScope==='FULL_SOURCE_OPERATION','EXACT_SIX_MACHINE_OWNERS_REQUIRED');
    const manual=canonicalManualMachineHourPriceCoverageV1({rowId:row.row_id,unitPrice:'77',currencyCode:'KGS'});
    const input={catalogId:pack.catalogId,rowId:row.row_id,unitId:row.unit_id,currencyCode:'KGS',unitPrice:'77',evidence:manual,manual:true,manualProvenanceReason:'consumer_estimate_row_batch_edit'};
    assert.equal(resolveCanonicalMachineHourPriceCoverageV1(input)?.status,'CONFIRMED_MANUAL');
    const snapshotId='00000000-0000-4000-8000-000000000001',priceKey='CONTROL_ONLY:'+row.row_id;
    assert.equal(resolveCanonicalMachineHourPriceCoverageV1({...input,manual:false,snapshotId,priceKey,evidence:{...manual,source:{kind:'SNAPSHOT',snapshotId,priceKey}}})?.status,'CONFIRMED_SOURCE');
    for(const foreign of ['canonical-work:base:roofing_interior_flat_roof_install_technical_room','canonical-work:base:roofing_interior_flat_roof_install_wet_zone']){
     assert.equal(assertCanonicalMachineHourDefinitionV1({catalogId:foreign,rowId:row.row_id,unitId:row.unit_id,sourceMetadata:row.source_metadata}),null);
     assert.equal(resolveCanonicalMachineHourPriceCoverageV1({...input,catalogId:foreign}),null);
    }
   }
   for(const [area,quantities] of [[100,['119.78','2.66','0.36','2.3','0.28','3.85','102','3.06','1.3']],[35.5,['42.5219','0.9443','0.1278','0.8165','0.0994','1.36675','36.21','1.0863','0.4615']]] as const){
    const r=await compileCeramicFloor02703R1(control(area));assert.equal(r.rows.length,20);assert.equal(r.preliminaryNeeds.length,6);
    const ids=['whole-labor','operator-information','forklift5t-consumed','hoist500kg45m-consumed','truck5t-consumed','water-consumed','ceramic-tile-consumed','sawdust-consumed','ready-mortar-m150-consumed'];
    ids.forEach((id,i)=>assert.equal(r.rows.find(row=>row.row_id===prefix+':'+id)?.quantity,quantities[i]));
    assert.deepEqual(r.preliminaryNeeds.map(n=>n.row_id).sort(),[...unresolved].sort());
    assert.deepEqual(r.rows.filter(row=>row.included_in_estimate&&row.category==='labor').map(row=>row.row_id),[prefix+':whole-labor']);
    assert(r.rows.every(row=>row.unit_price===null));
   }
   assert(d.parameters.every(p=>p.default_value===null));assert.deepEqual(d.runtimeInput,{});
   return {status:'PARTIAL_SOURCE_BOUND_CERAMIC02703',knownRows:20,resourceDefinitions:29,compositeBindings:19,openNeeds:6,fullTechnicalAcceptance:false,acceptedNewCompleteTypes:0};
  },
 };
}
