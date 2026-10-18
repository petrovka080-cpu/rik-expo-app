// WORK thin config proposal. Not a publisher entrypoint and deliberately not a publishable Config return.
// ROOT must resolve the four-member/decision/parent gates; no callback, PG connection, SQL writer or CLI is added.
import {strict as assert} from 'node:assert';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import type {MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';
import {validateIndependentCompletenessMapReferences} from './prepareMasterSingleDefinitionSuccessorR1';
import {pavingCut70ConditionalConsumerDefinitionR1 as definition,pavingCut70OpenNeedIdsR1 as needIds,
 pavingCut70IndependentCompletenessMapR1 as completenessMap,pavingCut70AcceptanceInputR1 as acceptance,
 compilePavingCut70ConditionalProposalR1 as core,pavingCut70CatalogIdProposalR1 as catalogId,
 pavingCut70WorkKeyProposalR1 as workKey,pavingCut70SourceIdentityProposalR1 as sourceIdentity} from '../../../src/lib/estimate/v4/pavingCut70ConditionalAppendConsumerR1';
import {pavingCutStationary70QuantityPackR1 as pack,pavingCutStationary70PrefixR1 as prefix,
 pavingCutStationary70PrimaryR1 as primary} from '../../../src/lib/estimate/v4/pavingCutStationary70QuantityR1';
type Json=Record<string,any>;
const INPUT={"path": "C:/Users/User/Documents/Codex/2026-10-18/files-pasted-by-the-user-andro/work/next-landscape-paving-a/conditional-append-factory-v1/conditional-factory-inputs-v1.json", "sha256": "f47c726d40b9b5e0c493d0d5c521d5532edea5b5fa9bd45a2b74dd57a5d603e7"};
const sha=(b:Uint8Array|string)=>createHash('sha256').update(b).digest('hex');
const exact=(pin:Readonly<{path:string;sha256:string}>):Json=>{
 const b=readFileSync(resolve(pin.path));assert.equal(sha(b),pin.sha256,'CUT70_EXACT_CONDITIONAL_EVIDENCE:'+pin.path);return JSON.parse(b.toString('utf8'));
};
export type PavingCut70ConditionalMasterAppendProposalR1=Readonly<{
 status:'BLOCKED_PENDING_EXACT_FOURTH_MEMBER_AND_ROOT_IDENTITY_ADMISSION';publicationAllowed:false;
 readyToPassToPublisher:false;configDraft:MasterSingleDefinitionSuccessorConfig;
 requiredCapturedGroupGate:Readonly<Json>;blockedBy:readonly string[];
}>;
/** This cannot be passed directly to the publisher. It is the concrete config for review, enclosed in a blocked proposal. */
export function preparePavingCutStationary70ConditionalMasterAppendR1():PavingCut70ConditionalMasterAppendProposalR1{
 const input=exact(INPUT);for(const p of Object.values(input.evidence) as {path:string;sha256:string}[])exact(p);
 assert.equal(input.formalRootDecisionPin,null,'DRAFT_REQUIRES_SEPARATE_REVIEWED_SUCCESSOR_NOT_MUTABLE_INPUT');
 assert.equal(input.actualFourthMemberReadPin,null);assert.equal(input.freshPublicationExecutionPin,null);
 assert.equal(input.proposedIdentity.catalogId,catalogId);assert.equal(input.proposedIdentity.workKey,workKey);assert.equal(input.proposedIdentity.sourceIdentity,sourceIdentity);
 const d=definition(),completeness=completenessMap();
 assert.deepEqual([d.parameters.length,d.formulas.length,d.resources.length],[12,10,10]);
 assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:completeness,formulaDefinitions:d.formulas,resourceDefinitions:d.resources}),[]);
 const bound=['whole-cutting-labor','operator-information','stationary-machine-consumed','diamond-disc-consumed'].map(id=>prefix+':'+id);
 const included=['Только отдельно измеренная фактическая длина резов тротуарной плитки70мм стационарным способом, колонка27-07-005-04.',
  'Цельный труд0,39ч на1мреза;0,16ч машинистов и0,16маш.-ч сохранены справочно без второй оплачиваемой строки.',
  'Исходный дробный расход диска0,014шт/м — справочно; шесть открытых потребностей остаются видимыми.'];
 const excluded=[...pack.excludedRu,'Существующие пять terrace-area-cut и три NO_CUT определения, ручные цены/названия/исключения и история сохраняются; никакого автоматического объединения договоров.'];
 const groupId='wg:expanded:sidewalks',groupNameRu='Дороги, транспорт и площадки: устройство тротуаров';
 const cfg:MasterSingleDefinitionSuccessorConfig={
  contract:pack.contract,stopCode:'PAVING_STATIONARY_CUT70',applicationName:'paving-stationary-cut70-partial',
  expectedBranch:'codex/r4-a5-clean-08b18902',masterPath:input.master.path,masterSha256:input.master.sha256,
  parentReleaseId:input.historicalCurrentPair.definitionReleaseId,parentSearchReleaseId:input.historicalCurrentPair.searchReleaseId,
  currentReleasePath:resolve('data/estimate-benchmarks/r568-local-developer-canonical-release.json'),
  outputRoot:resolve('.release-runtime/r568/next-wave/paving-cut70/publication'),
  // Mutable pointer is pinned separately by ROOT execution proof, never smuggled into immutable sourcePaths.
  sourcePaths:['scripts/estimate/r4a13/preparePavingCutStationary70ConditionalMasterAppendR1.ts',
   'src/lib/estimate/v4/pavingCut70ConditionalAppendConsumerR1.ts','src/lib/estimate/v4/pavingCut70ConditionalAppendConsumerR1.test.ts',
   'src/lib/estimate/v4/pavingCutStationary70QuantityR1.ts','src/lib/estimate/v4/pavingCutStationary70QuantityR1.test.ts',
   'data/estimate-benchmarks/source-packs/paving-cut-stationary70-quantity-r1.json',
   'src/lib/estimate/v4/automaticConstructionOwnerR1.ts','src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts',
   'scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts','scripts/estimate/r4a13/masterSingleDefinitionAppendGuardsR1.ts',
   'scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts',pack.source.localArtifact,INPUT.path,
   ...Object.values(input.evidence).map((p:any)=>p.path)],
  catalogId,sourceId:pack.sourceKeyProposal,normId:pack.normId,
  sourceMetadata:{source_title:pack.source.titleRu,source_authority:'Министерство строительства Кыргызской Республики, КРЕР27-2015',
   source_kind:'OFFICIAL_NORM_EXACT_SINGLE_COLUMN_PARTIAL',official_url:pack.source.officialUrl,artifact_sha256:pack.source.sha256,
   exact_locator:pack.source.locatorRu,use_restriction:included.join(' ')+' '+excluded.join(' ')},
  parameterDefinitions:d.parameters,formulaDefinitions:d.formulas,resourceDefinitions:d.resources,
  shortInput:{[primary]:12.5},acceptanceInput:acceptance(),runtimeProfileInput:{},runtimeProfileClassification:{},runtimeProfileSourceIds:{},
  expectedParentShape:[0,0,0],benchmarkOrdinal:0,validationScenario:'ACTUAL_LINEAR_M_STATIONARY_PAVING_CUT70_EXACT04_FOUR_SOURCE_ROWS_SIX_VISIBLE_NEEDS',
  passport:{canonicalRuName:pack.titleRu,workKey,physicalResultRu:'Отрезанная по проектной ведомости тротуарная плитка70мм; исходный состав частичный, шесть дополнительных потребностей открыты.',
   includedScopeRu:included,excludedScopeRu:excluded,independentCompletenessMap:completeness,unresolvedApplicableResourceRowIds:needIds},
  applicability:{primaryMeasureParameterId:primary,primaryUnitId:'m',quantityScope:'PARTIAL',exactColumn:'27-07-005-04',
   actualCutLengthOnly:true,paverThicknessMM:70,stationaryMethodOnly:true,sourceNormDoesNotDefineProjectFacts:true,
   wholeCuttingLabour:0.39,operatorInformational:0.16,machineInformational:0.16,discConsumptionInformational:0.014,
   machinePriceAdmission:false,machinePriceMappings:[],discOrderOwner:null,discUsefulLife:null,reusableUsedDiscLeftover:null,
   fullTechnicalAcceptance:false,newCompleteTypesAccepted:0,globalAbsenceProved:false,identityAdmissionPending:true,
   historicHeaderQueryHead:'1b450168030def7759c258b77b8a9ad6be8a2334',historicEightQueryHead:'7c8ab0347620ad2174c73df0deb331aa842631f7',
   sourceHeadAtPreparation:input.sourceHeadAtPreparation,actualPublicationParentMustBeExplicitlyReconciled:true},
  binding:{rowId:bound[0]!,additionalRowIds:bound.slice(1),applicability:{exactColumn:'27-07-005-04',
   sourceVolumeParameterId:primary,sourceQuantityDenominatorM:1,stationaryOnly:true,paverThicknessMM:70,
   resourceInclusionOwnsApplicability:true,sourceArtifactSha256:pack.source.sha256,machinePriceAdmission:false,
   discOrderAdmission:false,applicationNeedsBound:false,fullTechnicalAcceptance:false}},
  locator:{key:'krer27-07-005-04-stationary-paving-cut70-actual-linear-m-r1',payload:{
   exactColumn:'27-07-005-04',sourcePack:pack,sourceRowsOnly:bound,applicationNeedsUnbound:pack.openNeeds,
   literalMachineResourceCode:'33-0667',literalMachinePrintedName:pack.rows[2]!.printedNameRu,
   machineNomenclatureConflictUnresolved:true,referenceDossierSha256:input.evidence.sourceFullCycle.sha256,
   comparisonSha256:input.evidence.comparison.sha256,actualEightReadSha256:input.evidence.actualEightRead.sha256}},
  search:{primaryUom:'m',canonicalNameRu:pack.titleRu,
   aliases:['Резка брусчатки70мм на стационарном станке по длине резов','Рез тротуарной плитки70мм — КРЕР27-07-005-04'],
   shortScopeRu:'Стационарная резка плитки70мм; измеритель фактический1мреза, цельный труд и справочный расход; шесть потребностей открыты.',
   keyDistinguishingParameters:[primary,'paver_thickness_mm','cutting_method','actual_cut_layout_reference'],
   clarificationFields:d.parameters.filter(p=>p.truth_metadata.visibility_role==='USER_INPUT').map(p=>p.parameter_id),
   includedBoundaries:included,excludedBoundaries:excluded,extraSearchTermsRu:'благоустройство тротуар плитка брусчатка стационарная резка70мм фактический метр реза',
   sourceProvenance:{sourcePack:'data/estimate-benchmarks/source-packs/paving-cut-stationary70-quantity-r1.json',
    primarySha256:pack.source.sha256,classificationProposalSha256:input.evidence.classificationProposal.sha256,
    fullTechnicalAcceptance:false,newCompleteTypesAccepted:0,applicationNeeds:6,groupAdmissionConditional:true,globalAbsenceProved:false}},
  catalogAppend:{requireUniqueWorkKey:true,capturedSourcePreimage:{sourceKey:pack.sourceKeyProposal,expected:null},
   identity:{namespace:'global',domain:'transport',sourceIdentity,workKey,titleRu:pack.titleRu,denominatorEligible:true},
   searchPlacement:{groupMode:'join',groupId,groupNameRu,domainId:'transport',systemId:'transport',subsystemId:groupId,assemblyId:groupId,workFamilyId:groupId,
    breadcrumb:[groupNameRu],groupOracleDisposition:{contract:'rik-expo-app.s27-54.paving-tile-prepared-base.v1',disposition:'EXACT_PHYSICAL_WORK_GROUP',
     memberCatalogIdsSha256:'d2fe95a74b744c87b6074b6a893e9bd37caa59edd805a5e55fb0c4568387b56d'},
    membershipOrdinal:4,independentDisposition:{contract:pack.contract,classification:'CANONICAL_VISIBLE',exactPhysicalProfile:true,
     genericCutOperationAlreadyExists:true,partialScope:true,newCompleteTypesAccepted:0,rootDecisionPending:true},
    elementType:'WORK',operationKind:'OTHER',technologyVariant:'KRER27_07_005_04_STATIONARY_70MM_ACTUAL_CUT_M',
    constructionState:'PROJECT_PAVING_TILE_70MM_FOR_STATIONARY_CUT',normativeClassifiers:['КРЕР27-07-005-04'],
    applicabilityTags:['OUTDOOR_PAVING','STATIONARY_CUT','PAVER_THICKNESS_70MM','ACTUAL_LINEAR_CUT_M','PARTIAL_QUANTITY','MACHINE_PRICE_NOT_ADMITTED','DISC_ORDER_NOT_ADMITTED'],
    publicationState:'ADMITTED_BACKEND',catalogOrigin:'GLOBAL',adjudicationClass:'EFFECTIVE_WORK',selectable:true}},
  forbiddenAdjacentMatchers:[/cm11|ce40|ct17|terrace_tile_cut|paving_tile_prepared_base|roof:|elecor|krer18-castiron/iu],
  owner:'ROOT_SINGLE_INTEGRATOR_CONDITIONAL_PAVING_CUT70',receiptFileStem:'paving_cut70_stationary_actual_m',
  verifyCore:async()=>{
   assert.equal(sha(readFileSync(resolve(pack.source.localArtifact))),pack.source.sha256,'EXACT_OFFICIAL_KRER27_PDF');
   const r=await core(acceptance());assert.equal(r.rows.length,4);assert.equal(r.preliminaryNeeds.length,6);
   assert.deepEqual(r.rows.map(x=>x.quantity),['4.875','2','2','0.175']);
   assert.deepEqual(r.rows.filter(x=>x.included_in_estimate).map(x=>x.row_id),[prefix+':whole-cutting-labor']);
   assert(r.rows.every(x=>x.unit_price===null&&!x.included_in_procurement));
   return {status:'PASS_CONDITIONAL_SOURCE_QUANTITY_AND_VISIBLE_NEEDS_ONLY',sourceRows:4,applicationNeeds:6,
    machinePaidOwners:0,discOrderOwners:0,fullTechnicalAcceptance:false,identityAdmission:false,publicationPerformed:false};
  },
 };
 // This descriptor is intentionally OUTSIDE Config: current shared publisher has no such opt-in.
 // A boolean flag/callback/synthetic snapshot must not be mistaken for the actual normal+locked DB gate.
 const requiredCapturedGroupGate={status:'ROOT_SHARED_GUARD_DEPENDENCY_NOT_IMPLEMENTED',
  implementationLocation:'existing masterSingleDefinitionAppendGuardsR1 reader+validator, reused before BEGIN and under existing append table/advisory locks',
  exactGroupId:groupId,expectedMemberCount:4,expectedTailOrdinal:4,actualFourMemberPreimage:null,
  compare:'exact accepted catalogId/ordinal/definitionVersionId/definitionSha256/baseline/search anchors for all4, independent of group header cached count',
  reject:'different/missing/additional member, renamed/repointed definition or baseline/search anchor, ordinal collision or group header drift',
  captureRequired:'ROOT micro-reader4 actual result and formal fourth-member/identity decision; then minimal optional shared preimage opt-in, not a new writer'};
 return {status:'BLOCKED_PENDING_EXACT_FOURTH_MEMBER_AND_ROOT_IDENTITY_ADMISSION',publicationAllowed:false,
  readyToPassToPublisher:false,configDraft:cfg,requiredCapturedGroupGate,blockedBy:[...input.blockedBy]};
}
