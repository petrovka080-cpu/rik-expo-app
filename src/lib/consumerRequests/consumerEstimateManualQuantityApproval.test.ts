import {consumerEstimateProfessionalPdfReviewEligible as professionalEligible,consumerEstimateProfessionalPdfReviewCandidate as professionalCandidate,consumerEstimateProfessionalPdfReviewRequired as professionalRequired,consumerEstimateProfessionalPdfSavedProjectionMatches as professionalProjectionMatches} from './consumerEstimateProfessionalPdfReview';
import * as manualApprovalModule from './consumerEstimateManualQuantityApproval';
import {consumerEstimateScopeDecision} from './consumerEstimateReadiness';
import { createHash } from 'node:crypto';
import {buildMaster30FactoryKitSuccessorR1,master30CapturedRepresentativeR1,master30FactoryKitsPackR1} from '../estimate/v4/master30ElectricalPlumbingFactoryKitsR1';
import { consumerEstimateManualQuantityApprovalCandidate as candidate, consumerEstimateManualQuantityApprovalMatches as matches,
  consumerEstimateHasConfirmedManualQuantities,consumerEstimateManualApprovalStatusRu,consumerEstimateManualSavedProjectionParity,consumerEstimateManualQuantityApprovalRecord } from './consumerEstimateManualQuantityApproval';
import { interiorWallFinishingProvisionGroupDefinitionR7 as definition, interiorWallFinishingProvisionPackR7 as pack } from '../estimate/v4/interiorWallFinishingProvisionGroupR7';
import { interiorWallFinishingGeometryParameterR3 as parameter, interiorWallFinishingGeometryRowR3 as row,
  interiorWallFinishingGeometryPackR3 as geometry } from '../estimate/v4/interiorWallFinishingGeometryGroupR3';
import { compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreInput } from '../estimate/backendPlatform/canonicalEstimateCompileCore';
import { canonicalEstimateStableJson } from '../estimate/backendPlatform/canonicalEstimateDeterminism';
import { projectCanonicalEstimatePreliminaryNeedTransport } from '../estimate/backendPlatform/canonicalEstimatePreliminaryNeedTransport';
import { canonicalEstimateRevisionRowFromStorage } from '../estimate/backendPlatform/canonicalEstimateRevisionReadMapper';
import { adaptCanonicalRevisionToStructuredEstimate } from '../estimate/backendPlatform/canonicalEstimateForemanAdapter';
import { ESTIMATE_PLATFORM_API_VERSION, CanonicalEstimateApiError,type CanonicalEstimateCatalogItem, type CanonicalEstimateRevisionView } from '../estimate/backendPlatform/contracts';
import { buildStructuredEstimateRequestDraft } from '../estimateStructuredPipeline/structuredEstimateRequestBinding';
import { buildConsumerCanonicalParameterSession } from '../../features/consumerRepair/consumerCanonicalParameterEditor';
import { createConsumerRepairRequestDraft, __resetConsumerRepairRequestStoreForTests, getConsumerRepairRequest } from './index';
import { saveConsumerRepairBundle } from './consumerRequestRepository';
import { approveConsumerRepairRequestDraft } from './consumerRequestService';
import { consumerRepairEstimateApprovalParameterErrors, validateConsumerRepairRequestForApprove, validateConsumerRepairRequestForMarketplace } from './consumerRequestValidationService';
import type { ConsumerRepairDraftBundle } from './consumerRequestTypes';
import { appendCanonicalBackendRevisionProjection } from './consumerCanonicalBackendRevisionProjection';
import {loadConsumerRepairCanonicalNamingEvidence} from '../../features/consumerRepair/ConsumerRepairRequestScreenContainer';
import {consumerCanonicalMissingRequirements} from './consumerCanonicalParameterRequirements';
import { consumerEstimateManualPreliminaryItems, consumerEstimateUnresolvedQuantityItems, consumerEstimateOpenScopeGroups } from './consumerEstimateReadiness';
import * as canonicalClient from '../estimate/backendPlatform/canonicalEstimateClient';
import { ConsumerRepairRequestScreenController } from '../../features/consumerRepair/ConsumerRepairRequestScreen';
import { router } from 'expo-router';
import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {ApprovedHistorySnapshot} from '../../features/consumerRepair/ConsumerRepairHistory';
import {ConsumerRepairPdfRow} from '../../features/consumerRepair/ConsumerRepairPdfRow';
import {compactConsumerRepairBundleForDurableStorage, compactConsumerRepairApprovedHistorySummaryBundleForDurableStorage,
  compactConsumerRepairBundleForEmergencyDurableStorage, encodeConsumerRepairBundleForDurableStorage,
  decodeConsumerRepairBundleFromDurableStorage} from '../platform/compactConsumerRepairDurableState';
import {flushTransactionalConsumerRepairWrites} from '../platform/consumerRepairTransactionalDurableBridge';
jest.mock('@expo/vector-icons',()=>({Ionicons:()=>null}));

let base: ConsumerRepairDraftBundle;
let freshRevision:CanonicalEstimateRevisionView;
let session: NonNullable<ConsumerRepairDraftBundle['canonicalParameterSession']>;
async function prepareApprovalFixture(manual=true,unknownUnitProfile=false,zeroFirst=false) {
  let base:ConsumerRepairDraftBundle;let session:NonNullable<ConsumerRepairDraftBundle['canonicalParameterSession']>;
  const kitProfile=master30FactoryKitsPackR1.profiles.find(p=>p.key==='electrical')!;
  const catalogId=unknownUnitProfile?master30FactoryKitsPackR1.targets.find(t=>t.profileKey==='electrical')!.catalogId:'canonical-work:base:plaster_paint_interior_paint_wall_paint_standard';
  const d=unknownUnitProfile?buildMaster30FactoryKitSuccessorR1(master30CapturedRepresentativeR1(catalogId)):definition();
  const result = await compileCanonicalEstimateCore({ operation: 'recalculate', compilerVersion: pack.contract, catalogId,
    primaryMeasureParameterId: unknownUnitProfile?kitProfile.countId:parameter(geometry.areaId), parameterDefinitions: [...d.parameters] as unknown as CanonicalEstimateCompileCoreInput['parameterDefinitions'], formulaDefinitions: [...d.formulas] as unknown as CanonicalEstimateCompileCoreInput['formulaDefinitions'],
    resourceDefinitions: [...d.resources] as unknown as CanonicalEstimateCompileCoreInput['resourceDefinitions'], submittedParameters: unknownUnitProfile?{[master30FactoryKitsPackR1.selectorId]:kitProfile.choiceRu,[kitProfile.countId]:'3'}:{ [parameter(geometry.areaId)]: '20.1' }, confirmedParameters: {},
    rowOverrides: manual ? Object.fromEntries(pack.requiredNeeds.map(need => [row('open-'+need.id),
      { quantity: '10', provenance: { kind: 'manual', reason: 'EXPLICIT_MANUAL_APPROVAL_DIAGNOSTIC_ONLY' } }])) : zeroFirst?{[row('open-'+pack.requiredNeeds[0]!.id)]:{quantity:'0',provenance:{kind:'manual',reason:'EXACT_SAVED_ZERO_NO_PAYMENT_DIAGNOSTIC'}}}:{},
    priceItems: [], currencyCode: 'KGS', maximumResourceRows: d.resources.length,
    hashJson: value => createHash('sha256').update(canonicalEstimateStableJson(value)).digest('hex') });
  const stored = { id: '11111111-1111-4111-8111-111111111111', release_id: '22222222-2222-4222-8222-222222222222',
    catalog_id: catalogId, definition_version_id: '33333333-3333-4333-8333-333333333333', checksum_sha256: manual ? 'a'.repeat(64) : createHash('sha256').update(canonicalEstimateStableJson(result)).digest('hex'),
    row_count: result.rows.length, input_parameters: result.parameters, totals: result.totals, currency_code: 'KGS',
    amendment_contract: { parameterSources: { preliminaryNeeds: result.preliminaryNeeds } } };
  const transport = projectCanonicalEstimatePreliminaryNeedTransport(stored);
  const catalog = { catalogId, releaseId: stored.release_id, namespace: 'global', workKey: 'vgt', titleRu: unknownUnitProfile?kitProfile.publicNameRu:'Отделка стен VGT',
    domain: unknownUnitProfile?'electrical':'finishing', definitionVersion: 7, applicability: {}, professionalMetadata: {},
    parameterSchema: d.parameters.map(p => ({ parameterId: p.parameter_id, titleRu: p.title_ru, ordinal: p.ordinal,
      valueType: p.value_type, unitId: p.unit_id, required: p.required, defaultValue: p.default_value,
      constraints: p.constraints_json, visibilityRole: p.truth_metadata.visibility_role, valueSourceRole: p.truth_metadata.value_source_role,
      preliminaryCompilationAllowed: p.truth_metadata.preliminary_compilation_allowed, formulaConsumers: p.truth_metadata.formula_consumers,
      resourceBranchConsumers: p.truth_metadata.resource_branch_consumers, provenance: p.truth_metadata.provenance })) } as CanonicalEstimateCatalogItem;
  const revision: CanonicalEstimateRevisionView = { apiVersion: ESTIMATE_PLATFORM_API_VERSION, revisionId: stored.id,
    parentRevisionId: null, releaseId: stored.release_id, catalogId, definitionVersionId:stored.definition_version_id,compilerOwner:'backend',revisionNumber: 1, status: 'ready', currencyCode: 'KGS',
    parameters: result.parameters, totals: result.totals, rowCount: result.rows.length, checksumSha256: stored.checksum_sha256,
    compilerVersion: pack.contract, createdAt: '2026-10-21T00:00:00Z', preliminaryNeeds: transport.preliminaryNeeds,
    amendmentContract: { rowOverrides: {}, customRows: [], releaseMigration: null, ...transport.amendmentContract } };
  const payload = adaptCanonicalRevisionToStructuredEstimate({ catalog, revision,
    rows: result.rows.map(r => canonicalEstimateRevisionRowFromStorage(r, null)) });
  base = createConsumerRepairRequestDraft({ consumerUserId: 'manual-proof-owner',
    problemText: 'Улучшенная отделка стен VGT, площадь20,1м² по готовой ровной штукатурке',
    aiDraft: buildStructuredEstimateRequestDraft(payload) });
  base = appendCanonicalBackendRevisionProjection({ previousBundle: null, nextBundle: base, payload });
  session = buildConsumerCanonicalParameterSession({ catalog, revision, draftId: base.draft.id });
  base = saveConsumerRepairBundle({ ...base, canonicalParameterSession: session });
  return{base,session,revision};
}
beforeAll(async()=>{({base,session,revision:freshRevision}=await prepareApprovalFixture());});
afterAll(async () => { await flushTransactionalConsumerRepairWrites(); __resetConsumerRepairRequestStoreForTests(); });
beforeEach(() => { saveConsumerRepairBundle(structuredClone(base));jest.spyOn(canonicalClient,'getCanonicalEstimateRevision').mockResolvedValue(freshRevision); });
afterEach(async () => { await flushTransactionalConsumerRepairWrites(); __resetConsumerRepairRequestStoreForTests(); jest.restoreAllMocks(); });

test('explicit human acknowledgment binds all saved manual numbers while the automatic estimate remains preliminary', () => {
  expect(consumerEstimateManualPreliminaryItems(base)).toHaveLength(4);
  expect(consumerEstimateUnresolvedQuantityItems(base)).toEqual([]);expect(consumerEstimateOpenScopeGroups(base)).toEqual([]);
  const ack = candidate(base);
  expect(ack).toMatchObject({ mode: 'MANUAL_QUANTITIES', revisionId: '11111111-1111-4111-8111-111111111111',
    checksumSha256: 'a'.repeat(64) });
  expect(ack?.rowIds).toHaveLength(4); expect(ack?.sourceParameterIds).toHaveLength(4);
  expect(consumerRepairEstimateApprovalParameterErrors(base)).toHaveLength(1);
  expect(consumerRepairEstimateApprovalParameterErrors(base, ack)).toEqual([]);
  expect(base.estimateDraftRevisionState?.revisions.at(-1)?.estimateLevel).toBe('PRELIMINARY_QUANTITY_BOQ');
  expect(base.items.filter(item => ack?.rowIds.includes(String(item.sourceParameters?.rowCode)))
    .every(item => item.quantity === 10 && item.sourceParameters?.includedInEstimate === false
      && item.sourceParameters?.includedInProcurement === false)).toBe(true);
});

test.each(['unknown-number','not-manual','stale-number','foreign-row','safety','object','invalid','withdrawn','wrong-table','supply-block','foreign-calculated-row'])
  ('manual acknowledgment cannot clear %s', mutation => {
    const b = structuredClone(base), state = b.estimateDraftRevisionState!, current = state.revisions.at(-1)!;
    const item = b.items.find(item => item.sourceParameters?.canonicalPreliminaryNeed === true && item.quantity === 10)!;
    if (mutation === 'unknown-number') item.quantity = null;
    if (mutation === 'not-manual') item.sourceParameters!.manualQuantityOverride = false;
    if (mutation === 'stale-number') item.quantity = 11;
    if (mutation === 'foreign-row') item.sourceParameters!.canonicalBackendRevisionId = 'foreign';
    if (mutation === 'safety') current.missingInputs[0].requiredFor = 'safety_review';
    if (mutation === 'object') current.missingInputs.push({ key: 'object_acceptance', label: 'Основание', requiredFor: 'contract_ready', blocksPreliminaryEstimate: false });
    if (mutation === 'invalid') b.canonicalParameterSession = { ...session, invalidParameterIds: ['object_dimension'] };
    if (mutation === 'withdrawn') b.canonicalParameterSession = { ...session, contentWithdrawalReasonRu: 'Источник отозван' };
    if (mutation === 'wrong-table') b.canonicalParameterRequirementTables![state.currentRevisionId].releaseId = 'foreign';
    if (mutation === 'supply-block') item.sourceParameters!.canonicalPurchaseSupplyBlocksV1 = [{
      version: 'canonical-manual-purchase-supply-block/v1', policy: 'retain-raw-and-block-quantum',
      ownerRowId: String(item.sourceParameters!.rowCode), unitId: item.unit, rawManualQuantity: '10',
      manualProvenance: { kind: 'manual' }, reasonCode: 'ORDER_QUANTUM_VIOLATION', quantum: '75',
      procurementReady: false, physicalBalanceReady: false, derivedQuantityPublishable: false }];
    if (mutation === 'foreign-calculated-row') { const paid = b.items.find(item => item.sourceParameters?.includedInEstimate !== false)!;
      paid.sourceParameters!.canonicalBackendReleaseId = 'foreign'; }
    expect(candidate(b)).toBeNull();
    expect(matches(b, candidate(base))).toBe(false);
  });

test('confirmation is opt-in, exact-revision-bound, stored in the existing approval event and preserves every row', () => {
  const ack = candidate(base)!;
  expect(validateConsumerRepairRequestForApprove(base.draft.id, base.draft.consumerUserId).ok).toBe(false);
  expect(matches(base, { ...ack, checksumSha256: 'b'.repeat(64) })).toBe(false);
  expect(matches(base, { ...ack, rowIds: ack.rowIds.slice(1) })).toBe(false);
  const before = JSON.stringify(base.items), beforeLevel = base.estimateDraftRevisionState!.revisions.at(-1)!.estimateLevel;
  const approved = approveConsumerRepairRequestDraft({ requestDraftId: base.draft.id, userId: base.draft.consumerUserId,
    manualQuantityApproval: ack,savedRevisionRead:freshRevision });
  expect(approved.draft.status).toBe('consumer_approved');
  expect(approved.events.at(-1)).toMatchObject({eventType:'consumer_approved_canonical_manual_quantities',payload:{pdfArtifactCreated:false,sourceAdmission:false,paymentAdmission:false,procurementAdmission:false,full:false}});
  expect(approved.events.at(-1)?.payload).not.toHaveProperty('artifactId');
  expect(JSON.stringify(approved.items)).toBe(before);
  expect(approved.estimateDraftRevisionState!.revisions.at(-1)!.estimateLevel).toBe(beforeLevel);
  expect(approved.events.at(-1)?.payload.manualQuantityApproval).toEqual(ack);
  expect(consumerEstimateHasConfirmedManualQuantities(getConsumerRepairRequest(base.draft.id))).toBe(true);
  expect(validateConsumerRepairRequestForMarketplace(base.draft.id, base.draft.consumerUserId).errors)
    .toEqual(expect.arrayContaining([expect.objectContaining({ code: 'ESTIMATE_MANUAL_SOURCE_REVIEW_REQUIRED' })]));
});

test.each(['normal','summary-only','emergency'] as const)('manual confirmation survives real %s compaction, JSON encoding and cold decoding',mode=>{
  const ack=candidate(base)!;
  const approved=approveConsumerRepairRequestDraft({requestDraftId:base.draft.id,userId:base.draft.consumerUserId,
    manualQuantityApproval:ack,savedRevisionRead:freshRevision});
  const compact=mode==='normal'?compactConsumerRepairBundleForDurableStorage(approved)
    :mode==='summary-only'?compactConsumerRepairApprovedHistorySummaryBundleForDurableStorage(approved)
    :compactConsumerRepairBundleForEmergencyDurableStorage(approved);
  const reloaded=decodeConsumerRepairBundleFromDurableStorage(JSON.parse(JSON.stringify(encodeConsumerRepairBundleForDurableStorage(compact))))!;
  expect(reloaded.structuredEstimatePayload).toBeNull();
  expect(reloaded.durableHistorySummary?.manualQuantityApproval).toEqual(ack);
  expect(reloaded.durableHistorySummary?.pdfArtifactId).toBeFalsy();
  expect(reloaded.estimateDraftRevisionState?.revisions.at(-1)?.pdfArtifactId).toBeFalsy();
  expect(reloaded.durableHistorySummary?.canonicalRevisionChecksumSha256).toBe(ack.checksumSha256);
  expect(consumerEstimateHasConfirmedManualQuantities(reloaded)).toBe(true);
  expect(compactConsumerRepairBundleForDurableStorage(reloaded).durableHistorySummary?.manualQuantityApproval).toEqual(ack);
  if(mode==='summary-only')expect(reloaded.items).toEqual([]);
  else expect(reloaded.items.map(item=>item.quantity)).toEqual(approved.items.map(item=>item.quantity));
  saveConsumerRepairBundle(reloaded);
  expect(validateConsumerRepairRequestForMarketplace(base.draft.id,base.draft.consumerUserId).errors)
    .toEqual(expect.arrayContaining([expect.objectContaining({code:'ESTIMATE_MANUAL_SOURCE_REVIEW_REQUIRED'})]));
  const fork=structuredClone(reloaded);fork.draft.status='draft';
  expect(consumerEstimateHasConfirmedManualQuantities(fork)).toBe(false);
  expect(compactConsumerRepairApprovedHistorySummaryBundleForDurableStorage(fork).durableHistorySummary?.manualQuantityApproval).toBeNull();
  const foreign=structuredClone(reloaded);
  foreign.durableHistorySummary!.manualQuantityApproval={...ack,revisionId:'foreign'};
  foreign.events=[];
  expect(consumerEstimateHasConfirmedManualQuantities(foreign)).toBe(false);
  const wrongChecksum=structuredClone(reloaded);wrongChecksum.events=[];
  wrongChecksum.durableHistorySummary!.manualQuantityApproval={...ack,checksumSha256:'b'.repeat(64)};
  expect(consumerEstimateHasConfirmedManualQuantities(wrongChecksum)).toBe(false);
});

test.each(['revision','release','checksum','projection-checksum','duplicate-row','empty-source'] as const)
  ('manual history acknowledgment rejects a mismatched %s',mutation=>{
    const ack=candidate(base)!;
    const approved=approveConsumerRepairRequestDraft({requestDraftId:base.draft.id,userId:base.draft.consumerUserId,
      manualQuantityApproval:ack,savedRevisionRead:freshRevision});
    const reloaded=compactConsumerRepairBundleForDurableStorage(approved);reloaded.events=[];
    const record={...ack,rowIds:[...ack.rowIds],sourceParameterIds:[...ack.sourceParameterIds]};
    if(mutation==='revision')record.revisionId='foreign';
    if(mutation==='release')record.releaseId='foreign';
    if(mutation==='checksum')record.checksumSha256='b'.repeat(64);
    if(mutation==='projection-checksum')reloaded.estimateDraftRevisionState!.revisions.at(-1)!.resolvedIdentity!.sourceBindingVersions[0].version='b'.repeat(64);
    if(mutation==='duplicate-row')record.rowIds.push(record.rowIds[0]);
    if(mutation==='empty-source')record.sourceParameterIds=[];
    reloaded.durableHistorySummary!.manualQuantityApproval=record;
    expect(consumerEstimateHasConfirmedManualQuantities(reloaded)).toBe(false);
  });

test.each([true,false])('a cold draft recovers manual confirmation only from a fresh read of its exact backend revision, without recompiling or changing saved numbers: manual=%s',async manual=>{
  const {base,session,revision:r}=await prepareApprovalFixture(manual);jest.mocked(canonicalClient.getCanonicalEstimateRevision).mockResolvedValue(r);
  const acknowledgment=candidate(base)!,evidence=base.structuredEstimatePayload!.canonicalBackend!;
  const cold=decodeConsumerRepairBundleFromDurableStorage(JSON.parse(JSON.stringify(encodeConsumerRepairBundleForDurableStorage(
    compactConsumerRepairBundleForDurableStorage(base)))))!;
  expect(cold.structuredEstimatePayload).toBeNull();expect(candidate(cold)).toBeNull();
  saveConsumerRepairBundle(cold);
  let finishRead!:(value:typeof evidence)=>void;
  const load=jest.fn(()=>new Promise<typeof evidence>(resolve=>{finishRead=resolve;}));
  const controller=new ConsumerRepairRequestScreenController({consumerUserId:cold.draft.consumerUserId,
    onPrepareCanonicalEstimate:jest.fn(),onLoadCanonicalRevisionDraft:jest.fn(),onLoadCanonicalNamingEvidence:load,
    onLoadCanonicalParameterSession:jest.fn(async()=>session),onRecalculateCanonicalEstimate:jest.fn(),onSelectCanonicalCatalogItem:jest.fn(),
    onAddCanonicalCatalogItem:jest.fn(),onOpenPhotoForMaterialRecognition:jest.fn()});
  const action=controller as unknown as {state:typeof controller.state;setState:(patch:Partial<typeof controller.state>|((previous:typeof controller.state)=>Partial<typeof controller.state>|null))=>void;
    hydrateCurrentCanonicalNamingEvidence:()=>Promise<void>;ensureInitialCanonicalRevision:()=>Promise<{status:'READY';bundle:typeof base}>;approveManualQuantitiesDraft:()=>Promise<void>};
  action.state={...action.state,bundle:cold,problemText:cold.draft.problemText!};
  action.setState=patch=>{const next=typeof patch==='function'?patch(action.state):patch;if(next)action.state={...action.state,...next};};
  const pending=action.hydrateCurrentCanonicalNamingEvidence();expect(load).toHaveBeenCalledTimes(1);
  expect(load).toHaveBeenCalledWith(acknowledgment.revisionId,cold.draft.id);
  expect(candidate(action.state.bundle)).toBeNull();
  finishRead(evidence);await pending;
  const warm=action.state.bundle!;expect(candidate(warm)).toEqual(acknowledgment);
  expect(warm.items.map(item=>item.quantity)).toEqual(cold.items.map(item=>item.quantity));
  expect(candidate({...warm,canonicalBackendApprovalEvidence:{...evidence,checksumSha256:'b'.repeat(64)}})).toBeNull();
  const changed=structuredClone(warm);changed.items.find(item=>acknowledgment.rowIds.includes(String(item.sourceParameters?.rowCode)))!.quantity=11;
  expect(candidate(changed)).toBeNull();
  const durable=compactConsumerRepairBundleForDurableStorage(warm);expect(durable.canonicalBackendApprovalEvidence).toBeNull();expect(candidate(durable)).toBeNull();
  saveConsumerRepairBundle(warm);action.ensureInitialCanonicalRevision=async()=>({status:'READY',bundle:warm});
  jest.spyOn(canonicalClient,'buildCanonicalEstimateArtifact').mockImplementation(()=>{throw new Error('MANUAL_ACK_MUST_NOT_PREPARE_PDF');});
  jest.spyOn(router,'replace').mockImplementation(()=>undefined);
  await action.approveManualQuantitiesDraft();
  expect(getConsumerRepairRequest(base.draft.id).draft.status).toBe('consumer_approved');
  expect(canonicalClient.buildCanonicalEstimateArtifact).not.toHaveBeenCalled();
  expect(getConsumerRepairRequest(base.draft.id).items.map(item=>item.quantity)).toEqual(base.items.map(item=>item.quantity));
  expect(controller.props.onPrepareCanonicalEstimate).not.toHaveBeenCalled();expect(controller.props.onRecalculateCanonicalEstimate).not.toHaveBeenCalled();
});

test('a cold null-quantity draft stays unconfirmed for another owner, a denied read or foreign revision evidence',async()=>{
  const {base,session}=await prepareApprovalFixture(false),evidence=base.structuredEstimatePayload!.canonicalBackend!;
  const cold=decodeConsumerRepairBundleFromDurableStorage(JSON.parse(JSON.stringify(encodeConsumerRepairBundleForDurableStorage(
    compactConsumerRepairBundleForDurableStorage(base)))))!;
  const before=JSON.stringify(cold.items);
  for(const mode of ['other-owner','denied-read','foreign-revision']){
    const load=mode==='denied-read'?jest.fn().mockRejectedValue(new Error('CANONICAL_REVISION_ACCESS_DENIED'))
      :jest.fn().mockResolvedValue({...evidence,...(mode==='foreign-revision'?{revisionId:'99999999-9999-4999-8999-999999999999'}:{})});
    const controller=new ConsumerRepairRequestScreenController({consumerUserId:mode==='other-owner'?'another-owner':cold.draft.consumerUserId,
      onPrepareCanonicalEstimate:jest.fn(),onLoadCanonicalRevisionDraft:jest.fn(),onLoadCanonicalNamingEvidence:load,
      onLoadCanonicalParameterSession:jest.fn(async()=>session),onRecalculateCanonicalEstimate:jest.fn(),onSelectCanonicalCatalogItem:jest.fn(),
      onAddCanonicalCatalogItem:jest.fn(),onOpenPhotoForMaterialRecognition:jest.fn()});
    const action=controller as unknown as {state:typeof controller.state;setState:(update:Partial<typeof controller.state>|((previous:typeof controller.state)=>Partial<typeof controller.state>|null))=>void;hydrateCurrentCanonicalNamingEvidence:()=>Promise<void>};
    action.state={...action.state,bundle:cold};
    action.setState=update=>{const next=typeof update==='function'?update(action.state):update;if(next)action.state={...action.state,...next};};
    await action.hydrateCurrentCanonicalNamingEvidence();
    expect(load).toHaveBeenCalledTimes(mode==='other-owner'?0:1);
    expect(candidate(action.state.bundle)).toBeNull();expect(JSON.stringify(action.state.bundle!.items)).toBe(before);
    expect(controller.props.onPrepareCanonicalEstimate).not.toHaveBeenCalled();expect(controller.props.onRecalculateCanonicalEstimate).not.toHaveBeenCalled();
  }
});

test('MANUAL_QUANTITIES controller commits durable known quantities without preparing PDF or promoting technical level', async () => {
  jest.spyOn(canonicalClient, 'buildCanonicalEstimateArtifact').mockImplementation(()=>{throw new Error('MANUAL_ACK_MUST_NOT_PREPARE_PDF');});
  jest.spyOn(router, 'replace').mockImplementation(() => undefined);
  const controller = new ConsumerRepairRequestScreenController({ consumerUserId: base.draft.consumerUserId,
    onPrepareCanonicalEstimate: jest.fn(), onLoadCanonicalRevisionDraft: jest.fn(), onLoadCanonicalParameterSession: jest.fn(async () => session),
    onRecalculateCanonicalEstimate: jest.fn(), onSelectCanonicalCatalogItem: jest.fn(), onAddCanonicalCatalogItem: jest.fn(), onOpenPhotoForMaterialRecognition: jest.fn() });
  const action = controller as unknown as { state: typeof controller.state; setState: (patch: Partial<typeof controller.state>, callback?: () => void) => void;
    ensureInitialCanonicalRevision: () => Promise<{ status: 'READY'; bundle: typeof base }>; approveManualQuantitiesDraft: () => Promise<void> };
  action.state = { ...action.state, bundle: base, problemText: base.draft.problemText! };
  action.setState = (patch, callback) => { action.state = { ...action.state, ...patch }; callback?.(); };
  action.ensureInitialCanonicalRevision = async () => ({ status: 'READY', bundle: base });
  await action.approveManualQuantitiesDraft();
  const saved = getConsumerRepairRequest(base.draft.id);
  expect(saved.draft.status).toBe('consumer_approved');expect(consumerEstimateHasConfirmedManualQuantities(saved)).toBe(true);
  expect(canonicalClient.buildCanonicalEstimateArtifact).not.toHaveBeenCalled();
  expect(saved.events.at(-1)?.eventType).toBe('consumer_approved_canonical_manual_quantities');
  expect(saved.events.at(-1)?.payload).not.toHaveProperty('artifactId');
  expect(saved.items.map(item => item.quantity)).toEqual(base.items.map(item => item.quantity));
  expect(saved.estimateDraftRevisionState!.revisions.at(-1)!.estimateLevel).toBe('PRELIMINARY_QUANTITY_BOQ');
  expect(action.state.bundle).toBeNull();expect(action.state.statusMessage).toContain('ручными количествами');
  expect(router.replace).toHaveBeenCalledWith('/request');
});

test('new edits during the saved parameter read remain pending and prevent manual confirmation without requesting PDF', async () => {
  let release!:(value:typeof session)=>void;
  const pending=new Promise<typeof session>(resolve=>{release=resolve;});
  const load=jest.fn(()=>pending);
  const build=jest.spyOn(canonicalClient,'buildCanonicalEstimateArtifact').mockImplementation(()=>{throw new Error('MANUAL_ACK_MUST_NOT_PREPARE_PDF');});
  const controller=new ConsumerRepairRequestScreenController({consumerUserId:base.draft.consumerUserId,
    onPrepareCanonicalEstimate:jest.fn(),onLoadCanonicalRevisionDraft:jest.fn(),onLoadCanonicalParameterSession:load,
    onRecalculateCanonicalEstimate:jest.fn(),onSelectCanonicalCatalogItem:jest.fn(),onAddCanonicalCatalogItem:jest.fn(),onOpenPhotoForMaterialRecognition:jest.fn()});
  const action=controller as unknown as {state:typeof controller.state;setState:(patch:Partial<typeof controller.state>)=>void;
    ensureInitialCanonicalRevision:()=>Promise<{status:'READY';bundle:typeof base}>;approveManualQuantitiesDraft:()=>Promise<void>};
  action.state={...action.state,bundle:base,problemText:base.draft.problemText!};
  action.setState=patch=>{action.state={...action.state,...patch};};action.ensureInitialCanonicalRevision=async()=>({status:'READY',bundle:base});
  const approving=action.approveManualQuantitiesDraft();
  for(let tick=0;tick<10&&!load.mock.calls.length;tick++)await Promise.resolve();
  expect(load).toHaveBeenCalledTimes(1);action.state={...action.state,pendingCanonicalRowEditCount:1};
  release(session);await approving;
  expect(build).not.toHaveBeenCalled();expect(getConsumerRepairRequest(base.draft.id).draft.status).toBe('draft');
  expect(action.state.pendingCanonicalRowEditCount).toBe(1);expect(action.state.statusMessage).toContain('Примените новые правки');
});
test('history identifies manual approval and shows real shared resources without priced calculation counters or duplicate amounts',()=>{
  const ack=candidate(base)!,approved=approveConsumerRepairRequestDraft({requestDraftId:base.draft.id,userId:base.draft.consumerUserId,
    manualQuantityApproval:ack,savedRevisionRead:freshRevision});
  const snapshot=structuredClone(approved),counter=snapshot.items.find(item=>String(item.sourceParameters?.rowCode).endsWith(':open-hand-cleanser'))!;
  counter.unitPrice=50;counter.totalPrice=0.385;
  const before=JSON.stringify(snapshot),noop=jest.fn();let renderer!:TestRenderer.ReactTestRenderer;
  act(()=>{renderer=TestRenderer.create(React.createElement(ApprovedHistorySnapshot,{bundle:snapshot,onOpenPdf:noop,onEditHistoryDraft:noop,onSendHistoryToMarket:noop}));});
  const text=JSON.stringify(renderer.toJSON());
  expect(text).toContain('Подтверждена с ручными количествами');
  expect(text).toContain('Средство для очищения рук, картридж 1 л');expect(text).not.toContain('SCJP CLEAR FOAM PURE');expect(text).toContain('Вода для промывки инструмента и мытья рук');
  expect(text).not.toContain('Расход средства для подготовки рук перед защитой кожи');expect(text).not.toContain('Всего труда: исходная отделка');
  expect(renderer.root.findAllByProps({testID:'consumer-repair-history-readonly-shared-item'}).length).toBeGreaterThan(0);
  expect(JSON.stringify(snapshot)).toBe(before);expect(noop).not.toHaveBeenCalled();act(()=>renderer.unmount());
  act(()=>{renderer=TestRenderer.create(React.createElement(ConsumerRepairPdfRow,{bundle:approved,selected:false,onOpenPdf:noop,onOpenDraft:noop,onToggleHistorySnapshot:noop}));});
  expect(JSON.stringify(renderer.toJSON())).toContain('подтверждена с ручными количествами');act(()=>renderer.unmount());
});

// Direct user policy: a saved preliminary version can be acknowledged while
// application-owned quantities remain null. Automatic acceptance stays strict.
test('saved null quantities support explicit manual preliminary approval without changing rows, totals or technical level',async()=>{
 const{base:b,revision:r}=await prepareApprovalFixture(false),ack=candidate(b)!;
 expect(ack).toMatchObject({mode:'MANUAL_PRELIMINARY',unresolvedQuantityRowIds:expect.any(Array)});expect(ack.unresolvedQuantityRowIds).toHaveLength(4);
 expect(consumerEstimateUnresolvedQuantityItems(b)).toHaveLength(4);expect(validateConsumerRepairRequestForApprove(b.draft.id,b.draft.consumerUserId).ok).toBe(false);
 const before=JSON.stringify(b.items),level=b.estimateDraftRevisionState!.revisions.at(-1)!.estimateLevel;expect(validateConsumerRepairRequestForApprove(b.draft.id,b.draft.consumerUserId,ack).ok).toBe(true);
 const approved=approveConsumerRepairRequestDraft({requestDraftId:b.draft.id,userId:b.draft.consumerUserId,manualQuantityApproval:ack,savedRevisionRead:r});
 expect(JSON.stringify(approved.items)).toBe(before);expect(approved.estimateDraftRevisionState!.revisions.at(-1)!.estimateLevel).toBe(level);expect(consumerEstimateUnresolvedQuantityItems(approved)).toHaveLength(4);expect(consumerEstimateManualApprovalStatusRu(approved)).toBe('Подтверждена вручную как предварительная');
 const needs=approved.items.filter(item=>ack.rowIds.includes(String(item.sourceParameters?.rowCode)));expect(needs.every(item=>item.quantity===null&&item.sourceParameters?.payable===false&&item.sourceParameters?.includedInEstimate===false&&item.sourceParameters?.includedInProcurement===false)).toBe(true);
 const durable=compactConsumerRepairBundleForDurableStorage(approved),reloaded=decodeConsumerRepairBundleFromDurableStorage(encodeConsumerRepairBundleForDurableStorage(durable));expect(reloaded).not.toBeNull();expect(consumerEstimateManualApprovalStatusRu(reloaded)).toBe('Подтверждена вручную как предварительная');expect(reloaded!.durableHistorySummary?.manualQuantityApproval).toEqual(ack);
 expect(validateConsumerRepairRequestForMarketplace(b.draft.id,b.draft.consumerUserId).errors.some(error=>error.code==='ESTIMATE_MANUAL_SOURCE_REVIEW_REQUIRED')).toBe(true);
});
for(const mutation of ['stale-null','wrong-checksum','unsafe','object','invalid','wrong-table','supply','payable-flag','included-estimate','included-procurement','applicability'])test('preliminary manual receipt preserves '+mutation+' gate',async()=>{
 const{base:b,session:s}=await prepareApprovalFixture(false),ack=candidate(b)!;expect(ack).not.toBeNull();const item=b.items.find(item=>ack.rowIds.includes(String(item.sourceParameters?.rowCode)))!,current=b.estimateDraftRevisionState!.revisions.at(-1)!;
 if(mutation==='stale-null')item.quantity=1;
 if(mutation==='wrong-checksum')b.structuredEstimatePayload!.canonicalBackend!.checksumSha256='d'.repeat(64);
 if(mutation==='unsafe')current.missingInputs[0]!.requiredFor='safety_review';
 if(mutation==='object')current.missingInputs.push({key:'new_object_fact',label:'Условия объекта',requiredFor:'contract_ready',blocksPreliminaryEstimate:false});
 if(mutation==='invalid')b.canonicalParameterSession={...s,invalidParameterIds:['invalid_object']};
 if(mutation==='wrong-table')b.canonicalParameterRequirementTables![ack.revisionId]!.releaseId='foreign';
 if(mutation==='supply')item.sourceParameters!.canonicalPurchaseSupplyBlocksV1=[{version:'canonical-manual-purchase-supply-block/v1'}];
 if(mutation==='payable-flag')item.sourceParameters!.payable=true;
 if(mutation==='included-estimate')item.sourceParameters!.includedInEstimate=true;
 if(mutation==='included-procurement')item.sourceParameters!.includedInProcurement=true;
 if(mutation==='applicability')item.sourceParameters!.canonicalScopeRequirementDecisionV1={contractVersion:'canonical-scope-requirement-decision/v1',rowId:item.sourceParameters!.rowCode,groupId:'actual-site',groupTitleRu:'Применимость',titleRu:'Применимость комплекта',reasonRu:'Не принято основание',kind:'OBJECT_SCOPE',status:'OBJECT_FACT_REQUIRED',coveringRowIds:[],originalRowIds:[],missingObjectFactParameterIds:['site'],numericNormAccepted:false,separatePaymentAccepted:false};
 expect(candidate(b)).toBeNull();expect(matches(b,ack)).toBe(false);
});
test('controller saves the explicitly confirmed null-quantity revision while ordinary automatic approval stays blocked',async()=>{
 const{base:b,session:s,revision:r}=await prepareApprovalFixture(false);jest.mocked(canonicalClient.getCanonicalEstimateRevision).mockResolvedValue(r);jest.spyOn(canonicalClient,'buildCanonicalEstimateArtifact').mockImplementation(()=>{throw new Error('MANUAL_ACK_MUST_NOT_PREPARE_PDF');});jest.spyOn(router,'replace').mockImplementation(()=>undefined);
 const controller=new ConsumerRepairRequestScreenController({consumerUserId:b.draft.consumerUserId,onPrepareCanonicalEstimate:jest.fn(),onLoadCanonicalRevisionDraft:jest.fn(),onLoadCanonicalParameterSession:jest.fn(async()=>s),onRecalculateCanonicalEstimate:jest.fn(),onSelectCanonicalCatalogItem:jest.fn(),onAddCanonicalCatalogItem:jest.fn(),onOpenPhotoForMaterialRecognition:jest.fn()});
 const action=controller as unknown as {state:typeof controller.state;setState:(patch:Partial<typeof controller.state>,callback?:()=>void)=>void;ensureInitialCanonicalRevision:()=>Promise<{status:'READY';bundle:typeof b}>;approveDraft:()=>Promise<void>;approveManualQuantitiesDraft:()=>Promise<void>};
 action.state={...action.state,bundle:b,problemText:b.draft.problemText!};action.setState=(patch,callback)=>{action.state={...action.state,...patch};callback?.();};action.ensureInitialCanonicalRevision=async()=>({status:'READY',bundle:b});
 await action.approveDraft();expect(getConsumerRepairRequest(b.draft.id).draft.status).not.toBe('consumer_approved');expect(canonicalClient.buildCanonicalEstimateArtifact).not.toHaveBeenCalled();await action.approveManualQuantitiesDraft();expect(getConsumerRepairRequest(b.draft.id).draft.status).toBe('consumer_approved');expect(consumerEstimateUnresolvedQuantityItems(getConsumerRepairRequest(b.draft.id))).toHaveLength(4);expect(action.state.statusMessage).toContain('Предварительная смета подтверждена вручную');expect(controller.props.onRecalculateCanonicalEstimate).not.toHaveBeenCalled();
});

test('actual M30 producer preserves its blank unknown unit and null representation without inventing a unit',async()=>{
 const{base:b}=await prepareApprovalFixture(false,true),ack=candidate(b)!;expect(ack.mode).toBe('MANUAL_PRELIMINARY');expect(ack.unresolvedQuantityRowIds).toHaveLength(24);
 const need=b.structuredEstimatePayload!.canonicalBackend!.preliminaryNeeds!.find(n=>ack.unresolvedQuantityRowIds!.includes(n.rowId))!,item=b.items.find(i=>i.sourceParameters?.rowCode===need.rowId)!;
 expect(need.unitId).toBe('');expect(item.unit).toBe('');const refs=consumerCanonicalMissingRequirements(item,b.canonicalParameterRequirementTables);expect(refs.every(r=>r.unitId==null)).toBe(true);
 // Older read models may represent the same unconfirmed unit as null.
 (need as unknown as {unitId:null}).unitId=null;expect(candidate(b)).toEqual(ack);expect(item.unit).toBe('');expect(item.quantity).toBeNull();
});
test('an exact saved manual zero alongside unknown rows stays zero and never becomes payment or procurement',async()=>{
 const{base:b}=await prepareApprovalFixture(false,false,true),ack=candidate(b)!;expect(ack.mode).toBe('MANUAL_PRELIMINARY');expect(ack.unresolvedQuantityRowIds).toHaveLength(3);
 const item=b.items.find(i=>i.sourceParameters?.canonicalPreliminaryNeed===true&&i.quantity===0)!;expect(item).toBeDefined();expect(item.sourceParameters).toMatchObject({payable:false,includedInEstimate:false,includedInProcurement:false});const before=JSON.stringify(item);expect(matches(b,ack)).toBe(true);expect(JSON.stringify(item)).toBe(before);item.quantity=null;expect(candidate(b)).toBeNull();
});

test.each(['item-quantity','item-title','item-unit','item-price','item-payable','item-owner','item-tuple','item-trace','item-row-sha',
 'projection-quantity','projection-title','projection-unit','projection-price','projection-payable','projection-owner','projection-tuple','projection-row-tuple'] as const)
 ('manual acknowledgment refuses full saved calculated-row corruption: %s',mutation=>{
 const b=structuredClone(base),current=b.estimateDraftRevisionState!.revisions.at(-1)!,
  item=b.items.find(i=>i.sourceParameters?.canonicalPreliminaryNeed!==true)!,row=current.boq.rows.find(r=>r.rowId===item.sourceParameters?.rowCode)!;
 if(mutation==='item-quantity')item.quantity=Number(item.quantity)+1;
 if(mutation==='item-title')item.titleRu+=' changed';
 if(mutation==='item-unit')item.unit='foreign-unit';
 if(mutation==='item-price')item.unitPrice=Number(item.unitPrice??0)+1;
 if(mutation==='item-payable')item.sourceParameters!.payable=!(item.sourceParameters!.payable===true);
 if(mutation==='item-owner')item.sourceParameters!.semanticOwner='foreign-owner';
 if(mutation==='item-tuple')item.sourceParameters!.canonicalBackendReleaseId='foreign';
 if(mutation==='item-trace')item.calculationTrace='{"changedProvenance":true}';
 if(mutation==='item-row-sha')item.sourceParameters!.rowSha256='e'.repeat(64);
 if(mutation==='projection-quantity')row.quantity+=1;
 if(mutation==='projection-title')row.titleRu+=' changed';
 if(mutation==='projection-unit')row.unit='foreign-unit';
 if(mutation==='projection-price')row.unitPrice=Number(row.unitPrice??0)+1;
 if(mutation==='projection-payable')row.payable=!(row.payable===true);
 if(mutation==='projection-owner')row.sourceParameters!.semanticOwner='foreign-owner';
 if(mutation==='projection-tuple')current.resolvedIdentity!.canonicalModelVersion='foreign';
 if(mutation==='projection-row-tuple')row.sourceParameters!.canonicalBackendReleaseId='foreign';
 expect(consumerEstimateManualSavedProjectionParity(b)).toBe(false);expect(candidate(b)).toBeNull();
 expect(matches(b,candidate(base),freshRevision)).toBe(false);
});
test.each(['missing','withdrawn','revision','release','catalog','checksum','definition','compiler-owner'] as const)
 ('a manual commit requires a fresh same-tuple live read: %s',mutation=>{
 const ack=candidate(base)!,r=structuredClone(freshRevision);
 if(mutation==='withdrawn')r.contentWithdrawalReasonRu='Источник отозван';
 if(mutation==='revision')r.revisionId='foreign';
 if(mutation==='release')r.releaseId='foreign';
 if(mutation==='catalog')r.catalogId='foreign';
 if(mutation==='checksum')r.checksumSha256='e'.repeat(64);
 if(mutation==='definition')r.definitionVersionId=null;
 if(mutation==='compiler-owner')(r as unknown as {compilerOwner:string}).compilerOwner='frontend';
 const before=JSON.stringify(getConsumerRepairRequest(base.draft.id));
 expect(()=>approveConsumerRepairRequestDraft({requestDraftId:base.draft.id,manualQuantityApproval:ack,
  ...(mutation==='missing'?{}:{savedRevisionRead:r})})).toThrow();
 expect(JSON.stringify(getConsumerRepairRequest(base.draft.id))).toBe(before);
});
test('modern manual preliminary cold history reads PRELIMINARY_REVIEW without altering manual status',async()=>{
 const{base:b,revision:r}=await prepareApprovalFixture(false),ack=candidate(b)!;
 const approved=approveConsumerRepairRequestDraft({requestDraftId:b.draft.id,manualQuantityApproval:ack,savedRevisionRead:r});
 const cold=decodeConsumerRepairBundleFromDurableStorage(JSON.parse(JSON.stringify(encodeConsumerRepairBundleForDurableStorage(compactConsumerRepairBundleForDurableStorage(approved)))))!;
 saveConsumerRepairBundle(cold);
 expect(consumerEstimateManualApprovalStatusRu(cold)).toBe('Подтверждена вручную как предварительная');
 const before=JSON.stringify(getConsumerRepairRequest(cold.draft.id)),read=professionalUiReadForTest(r);
 jest.mocked(canonicalClient.getCanonicalEstimateRevision).mockResolvedValue(read);
 const get=jest.spyOn(canonicalClient,'getCanonicalEstimateArtifact').mockRejectedValue(new CanonicalEstimateApiError('refresh',{code:'ARTIFACT_PRESENTATION_REFRESH_REQUIRED',httpStatus:409}));
 const build=jest.spyOn(canonicalClient,'buildCanonicalEstimateArtifact').mockRejectedValue(new Error('STOP_AFTER_REPORT_REQUEST'));
 const{action}=modernPdfControllerForTest(cold);
 await action.completeHistoryPdfOpen(cold.draft.id);
 expect(get).toHaveBeenCalledWith(expect.objectContaining({revisionId:r.revisionId,issuancePurpose:'PRELIMINARY_REVIEW'}));
 expect(build).toHaveBeenCalledWith(expect.objectContaining({revisionId:r.revisionId,issuancePurpose:'PRELIMINARY_REVIEW',reviewRequest:expect.objectContaining({checksumSha256:r.checksumSha256})}));
 expect(JSON.stringify(getConsumerRepairRequest(cold.draft.id))).toBe(before);
});

test('real compiled manual acknowledgment retains three verified closed derived questions without completing automatic state',()=>{
 const current=base.estimateDraftRevisionState!.revisions.at(-1)!,closed=base.items.filter(i=>consumerEstimateScopeDecision(i)!=null),
  before=JSON.stringify({items:base.items,missing:current.missingInputs,level:current.estimateLevel}),ack=candidate(base)!;
 expect(closed).toHaveLength(3);expect(current.missingInputs).toHaveLength(7);
 expect(ack).toMatchObject({mode:'MANUAL_QUANTITIES'});expect(ack.rowIds).toHaveLength(4);expect(ack.sourceParameterIds).toHaveLength(4);
 const approved=approveConsumerRepairRequestDraft({requestDraftId:base.draft.id,manualQuantityApproval:ack,savedRevisionRead:freshRevision});
 const saved=approved.estimateDraftRevisionState!.revisions.at(-1)!;
 expect(JSON.stringify({items:approved.items,missing:saved.missingInputs,level:saved.estimateLevel})).toBe(before);
 expect(approved.events.at(-1)?.payload).toMatchObject({full:false,sourceAdmission:false,paymentAdmission:false,procurementAdmission:false});
});
test.each(['open','forged-item','additional','row-hash','wrong-role','unit','blocks-preliminary','safety'] as const)
 ('closed derived question does not waive %s integrity or object gates',mutation=>{
 const b=structuredClone(base),item=b.items.find(i=>consumerEstimateScopeDecision(i)!=null)!,
  decision=consumerEstimateScopeDecision(item)!,id=String(item.sourceParameters!.rowCode),need=b.structuredEstimatePayload!.canonicalBackend!.preliminaryNeeds!.find(n=>n.rowId===id)!;
 if(mutation==='open')item.sourceParameters!.canonicalScopeRequirementDecisionV1={...decision,status:'PROJECT_SCOPE_OPEN',kind:'PROJECT_SCOPE'};
 if(mutation==='forged-item')item.sourceParameters!.canonicalScopeRequirementDecisionV1={...decision,reasonRu:decision.reasonRu+' forged'};
 if(mutation==='additional')item.sourceParameters!.canonicalScopeRequirementDecisionV1={...decision,additionalObligationsV1:[]};
 if(mutation==='row-hash')item.sourceParameters!.rowSha256='e'.repeat(64);
 const key=need.missingParameterIds[0]!,req=b.canonicalParameterRequirementTables![freshRevision.revisionId]!.requirementsById[key]!;
 if(mutation==='wrong-role')req.valueSourceRole='USER_MEASURED';
 if(mutation==='unit')req.unitId='m2';
 const missing=b.estimateDraftRevisionState!.revisions.at(-1)!.missingInputs.find(r=>r.key===key)!;
 if(mutation==='blocks-preliminary')missing.blocksPreliminaryEstimate=true;
 if(mutation==='safety')missing.requiredFor='safety_review';
 expect(candidate(b)).toBeNull();expect(matches(b,candidate(base),freshRevision)).toBe(false);
});
test('a cached forged closed decision cannot pass the fresh same-revision commit',()=>{
 const b=structuredClone(base),item=b.items.find(i=>consumerEstimateScopeDecision(i)!=null)!,decision=consumerEstimateScopeDecision(item)!,
  need=b.structuredEstimatePayload!.canonicalBackend!.preliminaryNeeds!.find(n=>n.rowId===item.sourceParameters!.rowCode)!;
 const forged={...decision,reasonRu:decision.reasonRu+' forged'};
 item.sourceParameters!.canonicalScopeRequirementDecisionV1=forged;need.scopeRequirementDecision=forged;
 saveConsumerRepairBundle(b);const ack=candidate(b)!;
 expect(ack).not.toBeNull();const before=JSON.stringify(getConsumerRepairRequest(b.draft.id));
 expect(()=>approveConsumerRepairRequestDraft({requestDraftId:b.draft.id,manualQuantityApproval:ack,savedRevisionRead:freshRevision})).toThrow();
 expect(()=>approveConsumerRepairRequestDraft({requestDraftId:b.draft.id,manualQuantityApproval:ack,savedRevisionRead:{...freshRevision,preliminaryNeeds:undefined}})).toThrow();
 expect(JSON.stringify(getConsumerRepairRequest(b.draft.id))).toBe(before);
});
/** Synthetic UI transport contract, not a backend admission result or fixture
 * for engineering acceptance. Backend snapshot eligibility has its own tests. */
function professionalUiReadForTest(r:CanonicalEstimateRevisionView,unknownCount=4):CanonicalEstimateRevisionView{
 return {...r,operationResourceAcceptanceV1:{contractVersion:'canonical-operation-resource-acceptance/v1',status:'COMPOSITION_UNVERIFIED',
  pdfAllowed:false,definitionAdmissionAllowed:false,completeClaimAllowed:false,issues:[{code:'QUANTITY_UNKNOWN'}]},
  professionalPdfReviewEligibilityV1:{contractVersion:'canonical-professional-pdf-review-eligibility/v1',
   revisionId:r.revisionId,releaseId:r.releaseId,definitionVersionId:r.definitionVersionId!,checksumSha256:r.checksumSha256,
   eligible:true,status:'ELIGIBLE',unknownQuantityCount:unknownCount,auditSha256:'e'.repeat(64),reasonRu:'TEST_ONLY UI read contract'}};
}
function modernPdfControllerForTest(b:ConsumerRepairDraftBundle){
 const controller=new ConsumerRepairRequestScreenController({consumerUserId:b.draft.consumerUserId,onPrepareCanonicalEstimate:jest.fn(),
  onLoadCanonicalRevisionDraft:jest.fn(),onLoadCanonicalParameterSession:jest.fn(),onRecalculateCanonicalEstimate:jest.fn(),
  onSelectCanonicalCatalogItem:jest.fn(),onAddCanonicalCatalogItem:jest.fn(),onOpenPhotoForMaterialRecognition:jest.fn()});
 const action=controller as any;action.state={...action.state,bundle:b};
 action.setState=(patch:any,callback?:()=>void)=>{const next=typeof patch==='function'?patch(action.state):patch;if(next)action.state={...action.state,...next};callback?.();};
 action.ensureDraftBundle=()=>action.state.bundle;action.resolvedDraftBundle=(bundle:any)=>bundle;
 action.findKnownHistoryBundle=()=>action.state.bundle;action.handleCanonicalArtifactOpenError=jest.fn();
 return{controller,action};
}
test('professional PDF helper uses its own exact DTO and server physical count while manual authority remains separate',async()=>{
 const{base:b,revision:r}=await prepareApprovalFixture(false),read=professionalUiReadForTest(r,4);
 expect(professionalEligible(read)).toBe(true);
 expect(professionalCandidate(b,read)).toMatchObject({revisionId:r.revisionId,checksumSha256:r.checksumSha256,unknownQuantityCount:4});
 expect(professionalRequired(read)).toBe(true);
 expect(consumerEstimateManualQuantityApprovalRecord(b)).toBeNull();
 const legacyOnly={...read,professionalPdfReviewEligibilityV1:undefined,
  manualPreliminaryReviewEligibilityV1:{contractVersion:'canonical-manual-preliminary-review-eligibility/v1',
   revisionId:r.revisionId,releaseId:r.releaseId,definitionVersionId:r.definitionVersionId!,checksumSha256:r.checksumSha256,
   eligible:true,status:'ELIGIBLE',unknownQuantityCount:0,auditSha256:'e'.repeat(64),reasonRu:'TEST_ONLY legacy'}} as CanonicalEstimateRevisionView;
 expect(professionalEligible(legacyOnly)).toBe(false);expect(professionalCandidate(b,legacyOnly)).toBeNull();
 for(const mutation of ['checksum','release','definition','blocked','count','digest']as const){
  const bad=structuredClone(read),e={...bad.professionalPdfReviewEligibilityV1!};bad.professionalPdfReviewEligibilityV1=e;
  if(mutation==='checksum')e.checksumSha256='f'.repeat(64);
  if(mutation==='release')e.releaseId='foreign';
  if(mutation==='definition')e.definitionVersionId='foreign';
  if(mutation==='blocked'){e.eligible=false;e.status='BLOCKED';}
  if(mutation==='count')e.unknownQuantityCount=-1;
  if(mutation==='digest')e.auditSha256='invalid';
  expect(professionalEligible(bad)).toBe(false);expect(professionalCandidate(b,bad)).toBeNull();
 }
});
test('professional PDF projection may retain a corresponding null ordinary quantity without weakening manual projection parity',()=>{
 const b=structuredClone(base),item=b.items.find(item=>item.sourceParameters?.canonicalPreliminaryNeed!==true)!,
  current=b.estimateDraftRevisionState!.revisions.at(-1)!,
  saved=current.boq.rows.find(row=>row.rowId===item.sourceParameters!.rowCode)!;
 (item as any).quantity=null;(saved as any).quantity=null;
 const read=professionalUiReadForTest(freshRevision,1);
 expect(consumerEstimateManualSavedProjectionParity(b)).toBe(false);
 expect(candidate(b)).toBeNull();expect(professionalCandidate(b,read)).not.toBeNull();
 item.titleRu+=' changed';
 expect(professionalProjectionMatches(b,read)).toBe(false);expect(professionalCandidate(b,read)).not.toBeNull();
});
test.each(['quantity','price','supply-null','supply-nonempty','withdrawal']as const)
 ('saved report identity is independent from unsaved local %s while manual guards remain strict',mutation=>{
 const b=structuredClone(base),read=professionalUiReadForTest(freshRevision),item=b.items.find(item=>item.sourceParameters?.canonicalPreliminaryNeed!==true)!;
 if(mutation==='quantity')item.quantity=Number(item.quantity)+1;
 if(mutation==='price')item.unitPrice=123;
 if(mutation==='supply-null')item.sourceParameters!.canonicalPurchaseSupplyBlocksV1=null as never;
 if(mutation==='supply-nonempty')item.sourceParameters!.canonicalPurchaseSupplyBlocksV1=[{reason:'TEST_ONLY unresolved supply'}]as never;
 if(mutation==='withdrawal')read.contentWithdrawalReasonRu='TEST_ONLY withdrawn';
 expect(professionalCandidate(b,read)).not.toBeNull();if(mutation!=='withdrawal')expect(candidate(b)).toBeNull();else expect(()=>approveConsumerRepairRequestDraft({requestDraftId:b.draft.id,manualQuantityApproval:candidate(b)!,savedRevisionRead:read})).toThrow();
});
test('modern unknown saved PDF current action reaches PRELIMINARY_REVIEW without a manual approval candidate or mutation',async()=>{
 const{base:b,revision:r}=await prepareApprovalFixture(false),read=professionalUiReadForTest(r),before=JSON.stringify(b.items),{controller,action}=modernPdfControllerForTest(b);
 jest.mocked(canonicalClient.getCanonicalEstimateRevision).mockResolvedValue(read);
 jest.spyOn(manualApprovalModule,'consumerEstimateManualQuantityApprovalCandidate').mockImplementation(()=>{throw Error('PDF_MUST_NOT_REQUIRE_MANUAL_APPROVAL');});
 jest.spyOn(manualApprovalModule,'consumerEstimateSavedPreliminaryApprovalCandidate').mockImplementation(()=>{throw Error('PDF_MUST_NOT_REQUIRE_LEGACY_APPROVAL');});
 const get=jest.spyOn(canonicalClient,'getCanonicalEstimateArtifact').mockRejectedValue(new CanonicalEstimateApiError('TEST_ONLY stop after mode selection',{code:'FORBIDDEN',httpStatus:403})),
  build=jest.spyOn(canonicalClient,'buildCanonicalEstimateArtifact');
 await action.completePreliminaryReviewPdfOpen({revisionId:read.revisionId,releaseId:read.releaseId,definitionVersionId:read.definitionVersionId!,checksumSha256:read.checksumSha256});
 expect(get).toHaveBeenCalledWith(expect.objectContaining({revisionId:r.revisionId,issuancePurpose:'PRELIMINARY_REVIEW'}));
 expect(build).not.toHaveBeenCalled();expect(JSON.stringify(getConsumerRepairRequest(b.draft.id).items)).toBe(before);
 expect(getConsumerRepairRequest(b.draft.id).draft.status).toBe('draft');expect(consumerEstimateManualQuantityApprovalRecord(getConsumerRepairRequest(b.draft.id))).toBeNull();
 expect(controller.props.onPrepareCanonicalEstimate).not.toHaveBeenCalled();expect(controller.props.onRecalculateCanonicalEstimate).not.toHaveBeenCalled();
});
test('modern saved history PDF tap directly reads the saved report without manual acknowledgment',async()=>{
 const{base:b,revision:r}=await prepareApprovalFixture(false),read=professionalUiReadForTest(r),{action}=modernPdfControllerForTest(b);
 jest.mocked(canonicalClient.getCanonicalEstimateRevision).mockResolvedValue(read);
 const get=jest.spyOn(canonicalClient,'getCanonicalEstimateArtifact').mockRejectedValue(new CanonicalEstimateApiError('read denied',{code:'FORBIDDEN',httpStatus:403})),
  build=jest.spyOn(canonicalClient,'buildCanonicalEstimateArtifact');
 await action.completeHistoryPdfOpen(b.draft.id);
 expect(get).toHaveBeenCalledWith(expect.objectContaining({revisionId:r.revisionId,issuancePurpose:'PRELIMINARY_REVIEW'}));
 expect(build).not.toHaveBeenCalled();expect(consumerEstimateManualQuantityApprovalRecord(b)).toBeNull();
});
test('pending local row edit does not block reading the authoritative saved report or become saved data',async()=>{
 const{base:b,revision:r}=await prepareApprovalFixture(false),read=professionalUiReadForTest(r),{action}=modernPdfControllerForTest(b),
  before=JSON.stringify(getConsumerRepairRequest(b.draft.id));
 let resolveRead!:(revision:CanonicalEstimateRevisionView)=>void;
 jest.mocked(canonicalClient.getCanonicalEstimateRevision).mockReturnValue(new Promise(resolve=>{resolveRead=resolve;}));
 const get=jest.spyOn(canonicalClient,'getCanonicalEstimateArtifact').mockRejectedValue(new CanonicalEstimateApiError('bounded transport stop',{code:'FORBIDDEN',httpStatus:403})),
  build=jest.spyOn(canonicalClient,'buildCanonicalEstimateArtifact');
 const pending=action.completePdfOpen();action.state.pendingCanonicalRowEditCount=1;resolveRead(read);await pending;
 expect(get).toHaveBeenCalledWith(expect.objectContaining({revisionId:r.revisionId,issuancePurpose:'PRELIMINARY_REVIEW'}));expect(build).not.toHaveBeenCalled();
 expect(JSON.stringify(getConsumerRepairRequest(b.draft.id))).toBe(before);
 expect(consumerEstimateManualQuantityApprovalRecord(getConsumerRepairRequest(b.draft.id))).toBeNull();
});

test('explicit stale report identity cannot start a request for a newly current saved revision',async()=>{
 const{base:b,revision:r}=await prepareApprovalFixture(false),read=professionalUiReadForTest(r),{action}=modernPdfControllerForTest(b),
  expected={revisionId:read.revisionId,releaseId:read.releaseId,definitionVersionId:read.definitionVersionId!,checksumSha256:read.checksumSha256},
  newer=structuredClone(b),backend=newer.structuredEstimatePayload!.canonicalBackend!;
 backend.revisionId='44444444-4444-4444-8444-444444444444';
 for(const item of newer.items)item.sourceParameters!.canonicalBackendRevisionId=backend.revisionId;
 action.state.bundle=newer;
 const readSpy=jest.mocked(canonicalClient.getCanonicalEstimateRevision),get=jest.spyOn(canonicalClient,'getCanonicalEstimateArtifact'),
  build=jest.spyOn(canonicalClient,'buildCanonicalEstimateArtifact');
 readSpy.mockClear();
 await action.completePreliminaryReviewPdfOpen(expected);
 expect(readSpy).not.toHaveBeenCalled();expect(get).not.toHaveBeenCalled();expect(build).not.toHaveBeenCalled();
 expect(action.handleCanonicalArtifactOpenError).toHaveBeenCalledWith(expect.objectContaining({message:expect.stringContaining('Выбранная сохранённая версия PDF не совпала')}));
 expect(consumerEstimateManualQuantityApprovalRecord(getConsumerRepairRequest(b.draft.id))).toBeNull();
});
/** Synthetic saved transport contract, rebuilt through the production request
 * adapter. This is not a backend composition/source eligibility assertion. */
function selectedNeedPdfProjectionForTest(procurementEligible=true,covered=false,condition=false,graphOnly=false){
 const payload=structuredClone(base.structuredEstimatePayload!),metadata=payload.canonicalBackend!,
  need=metadata.preliminaryNeeds!.find(n=>n.needState==='QUANTITY_REQUIRED')!;
 // The base has already crossed the shared-table adapter. Restore its exact
 // original schema before constructing a distinct synthetic saved transport.
 const table=base.canonicalParameterRequirementTables![metadata.revisionId]!;
 expect(table).toMatchObject({contractVersion:'canonical-parameter-requirements/v1',revisionId:metadata.revisionId,
  releaseId:metadata.releaseId,parameterSchemaHash:metadata.parameterSchemaHash??null});
 expect(Object.keys(table.requirementsById).length).toBeGreaterThan(0);
 metadata.parameterRequirements=structuredClone(Object.values(table.requirementsById));
 delete metadata.parameterRequirementsStorage;
 need.quantity=null;need.unitPrice=null;need.selected=true;need.procurementEligible=procurementEligible;
 need.manualQuantityOverride=false;need.calculatedQuantityBeforeOverride=null;need.costTreatment='OWN_COST';
 need.needState=condition?'CONDITION_REQUIRED':'QUANTITY_REQUIRED';
 if(covered)need.commercialCostCoverageDecision={contractVersion:'canonical-commercial-cost-coverage/v1',scopeId:'TEST_ONLY:rate',
  scopeRu:'TEST_ONLY rate scope',ownerRowId:'TEST_ONLY:owner',ownerTitleRu:'TEST_ONLY owner',priceScope:'LABOR_AND_LISTED_RESOURCES',supplyParty:'RATE_PROVIDER'};
 if(graphOnly){
  need.calculationTrace={resourceGraph:{costTreatment:need.costTreatment,...(need.commercialCostCoverageDecision
   ?{commercialCostCoverageDecisionV1:need.commercialCostCoverageDecision}:{})}};
  delete need.costTreatment;delete need.commercialCostCoverageDecision;
 }
 const{needSha256:_oldHash,...basis}=need;
 need.needSha256=createHash('sha256').update(canonicalEstimateStableJson(basis)).digest('hex');
 metadata.checksumSha256=createHash('sha256').update(canonicalEstimateStableJson({rows:payload.rows,needs:metadata.preliminaryNeeds})).digest('hex');
 const created=createConsumerRepairRequestDraft({consumerUserId:'manual-proof-owner',problemText:'TEST_ONLY selected saved need',aiDraft:buildStructuredEstimateRequestDraft(payload)}),
  bundle=appendCanonicalBackendRevisionProjection({previousBundle:null,nextBundle:created,payload}),
  read=professionalUiReadForTest({...freshRevision,checksumSha256:metadata.checksumSha256,preliminaryNeeds:structuredClone(metadata.preliminaryNeeds)},1),
  item=bundle.items.find(i=>i.sourceParameters?.rowCode===need.rowId)!;
 return{bundle,read,item,need:bundle.structuredEstimatePayload!.canonicalBackend!.preliminaryNeeds!.find(n=>n.rowId===need.rowId)!};
}
test.each([[true,false],[false,false],[true,true]] as const)
 ('PDF parity preserves fresh selected need procurement=%s coverage=%s without manual or financial admission',(procurementEligible,covered)=>{
 const{bundle,read,item}=selectedNeedPdfProjectionForTest(procurementEligible,covered),before=JSON.stringify(bundle);
 expect(item.sourceParameters).toMatchObject({includedInEstimate:true,includedInProcurement:procurementEligible&&!covered,payable:false});
 expect(professionalProjectionMatches(bundle,read)).toBe(true);expect(professionalCandidate(bundle,read)).not.toBeNull();
 expect(consumerEstimateManualSavedProjectionParity(bundle)).toBe(false);expect(candidate(bundle)).toBeNull();
 expect(JSON.stringify(bundle)).toBe(before);
});
test.each(['selection','procurement','eligibility','payable','owner','treatment','price','hash','trace','local-trace-pair','local-selection-pair'] as const)
 ('strict saved projection detects %s tampering while report reads its immutable target',mutation=>{
 const{bundle,read,item,need}=selectedNeedPdfProjectionForTest();
 expect(need).toBe(bundle.structuredEstimatePayload!.canonicalBackend!.preliminaryNeeds!.find(n=>n.rowId===item.sourceParameters!.rowCode));
 if(mutation==='selection')item.sourceParameters!.includedInEstimate=false;
 if(mutation==='procurement')item.sourceParameters!.includedInProcurement=false;
 if(mutation==='eligibility')item.sourceParameters!.procurementEligible=false;
 if(mutation==='payable')item.sourceParameters!.payable=true;
 if(mutation==='owner')item.sourceParameters!.canonicalCommercialCostCoverageDecisionV1={ownerRowId:'TEST_ONLY:foreign-owner'};
 if(mutation==='treatment')item.sourceParameters!.canonicalCostTreatment='INFORMATIONAL_SCOPE';
 if(mutation==='price')item.unitPrice=42;
 if(mutation==='hash')item.sourceParameters!.rowSha256='0'.repeat(64);
 if(mutation==='trace')item.calculationTrace='{"TEST_ONLY":"foreign-trace"}';
 if(mutation==='local-trace-pair'){need.calculationTrace={resourceGraph:{costTreatment:'TEST_ONLY:forged'}};item.calculationTrace=JSON.stringify(need.calculationTrace);}
 if(mutation==='local-selection-pair'){need.selected=false;item.sourceParameters!.includedInEstimate=false;item.sourceParameters!.includedInProcurement=false;}
 expect(professionalProjectionMatches(bundle,read)).toBe(false);expect(professionalCandidate(bundle,read)).not.toBeNull();
});
test('unchanged selected condition need has projection parity but a blocked fresh DTO grants no PDF candidate',()=>{
 const{bundle,read}=selectedNeedPdfProjectionForTest(true,false,true);
 read.professionalPdfReviewEligibilityV1={...read.professionalPdfReviewEligibilityV1!,eligible:false,status:'BLOCKED',reasonRu:'TEST_ONLY genuine object condition'};
 expect(professionalProjectionMatches(bundle,read)).toBe(true);expect(professionalEligible(read)).toBe(false);
 expect(professionalCandidate(bundle,read)).toBeNull();expect(candidate(bundle)).toBeNull();
});
test.each(['wrong-checksum','missing-needs','duplicate-needs','fresh-supply-null','fresh-supply-nonempty'] as const)
 ('selected saved PDF parity fails closed for %s fresh authority',mutation=>{
 const{bundle,read}=selectedNeedPdfProjectionForTest();
 if(mutation==='wrong-checksum')read.checksumSha256='f'.repeat(64);
 if(mutation==='missing-needs')read.preliminaryNeeds=[];
 if(mutation==='duplicate-needs')read.preliminaryNeeds!.push(structuredClone(read.preliminaryNeeds![0]!));
 if(mutation==='fresh-supply-null')read.preliminaryNeeds![0]!.purchaseSupplyBlocks=null as never;
 if(mutation==='fresh-supply-nonempty')read.preliminaryNeeds![0]!.purchaseSupplyBlocks=[{reason:'TEST_ONLY unresolved supply'}] as never;
 expect(professionalProjectionMatches(bundle,read)).toBe(false);
});
test('selected saved need cold restore uses the existing exact authenticated naming read and preserves flags',async()=>{
 const{bundle,read,item}=selectedNeedPdfProjectionForTest(),before=JSON.stringify(item);
 const cold=decodeConsumerRepairBundleFromDurableStorage(JSON.parse(JSON.stringify(encodeConsumerRepairBundleForDurableStorage(compactConsumerRepairBundleForDurableStorage(bundle)))))!;
 expect(cold.structuredEstimatePayload).toBeNull();expect(professionalProjectionMatches(cold,read)).toBe(false);
 saveConsumerRepairBundle(cold);jest.spyOn(canonicalClient,'getCanonicalEstimateRevision').mockResolvedValue(read);
 const evidence=await loadConsumerRepairCanonicalNamingEvidence({revisionId:read.revisionId,requestDraftId:cold.draft.id,
  consumerUserId:cold.draft.consumerUserId,workspaceGenerationRef:{current:0}}),restored=getConsumerRepairRequest(cold.draft.id)!;
 expect(evidence).not.toBeNull();expect(professionalProjectionMatches(restored,read)).toBe(true);
 expect(restored.items.find(i=>i.id===item.id)?.sourceParameters).toMatchObject({includedInEstimate:true,includedInProcurement:true,payable:false});
 expect(JSON.stringify(item)).toBe(before);expect(consumerEstimateManualSavedProjectionParity(restored)).toBe(false);
});
test('selected PDF need uses exact fresh graph-only treatment and coverage just as the request adapter',()=>{
 const{bundle,read,item}=selectedNeedPdfProjectionForTest(true,true,false,true);
 expect(read.preliminaryNeeds!.find(n=>n.rowId===item.sourceParameters!.rowCode)!.costTreatment).toBeUndefined();
 expect(item.sourceParameters).toMatchObject({includedInEstimate:true,includedInProcurement:false,payable:false,canonicalCostTreatment:'OWN_COST',
  canonicalCommercialCostCoverageDecisionV1:{ownerRowId:'TEST_ONLY:owner'}});
 expect(professionalProjectionMatches(bundle,read)).toBe(true);expect(consumerEstimateManualSavedProjectionParity(bundle)).toBe(false);
});