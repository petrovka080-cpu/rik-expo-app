import { createHash } from 'node:crypto';
import {buildMaster30FactoryKitSuccessorR1,master30CapturedRepresentativeR1,master30FactoryKitsPackR1} from '../estimate/v4/master30ElectricalPlumbingFactoryKitsR1';
import { consumerEstimateManualQuantityApprovalCandidate as candidate, consumerEstimateManualQuantityApprovalMatches as matches,
  consumerEstimateHasConfirmedManualQuantities,consumerEstimateManualApprovalStatusRu } from './consumerEstimateManualQuantityApproval';
import { interiorWallFinishingProvisionGroupDefinitionR7 as definition, interiorWallFinishingProvisionPackR7 as pack } from '../estimate/v4/interiorWallFinishingProvisionGroupR7';
import { interiorWallFinishingGeometryParameterR3 as parameter, interiorWallFinishingGeometryRowR3 as row,
  interiorWallFinishingGeometryPackR3 as geometry } from '../estimate/v4/interiorWallFinishingGeometryGroupR3';
import { compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreInput } from '../estimate/backendPlatform/canonicalEstimateCompileCore';
import { canonicalEstimateStableJson } from '../estimate/backendPlatform/canonicalEstimateDeterminism';
import { projectCanonicalEstimatePreliminaryNeedTransport } from '../estimate/backendPlatform/canonicalEstimatePreliminaryNeedTransport';
import { canonicalEstimateRevisionRowFromStorage } from '../estimate/backendPlatform/canonicalEstimateRevisionReadMapper';
import { adaptCanonicalRevisionToStructuredEstimate } from '../estimate/backendPlatform/canonicalEstimateForemanAdapter';
import { ESTIMATE_PLATFORM_API_VERSION, type CanonicalEstimateCatalogItem, type CanonicalEstimateRevisionView } from '../estimate/backendPlatform/contracts';
import { buildStructuredEstimateRequestDraft } from '../estimateStructuredPipeline/structuredEstimateRequestBinding';
import { buildConsumerCanonicalParameterSession } from '../../features/consumerRepair/consumerCanonicalParameterEditor';
import { createConsumerRepairRequestDraft, __resetConsumerRepairRequestStoreForTests, getConsumerRepairRequest } from './index';
import { saveConsumerRepairBundle } from './consumerRequestRepository';
import { approveConsumerRepairRequestDraft } from './consumerRequestService';
import { consumerRepairEstimateApprovalParameterErrors, validateConsumerRepairRequestForApprove, validateConsumerRepairRequestForMarketplace } from './consumerRequestValidationService';
import type { ConsumerRepairDraftBundle } from './consumerRequestTypes';
import { appendCanonicalBackendRevisionProjection } from './consumerCanonicalBackendRevisionProjection';
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
    parentRevisionId: null, releaseId: stored.release_id, catalogId, revisionNumber: 1, status: 'ready', currencyCode: 'KGS',
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
  return{base,session};
}
beforeAll(async()=>{({base,session}=await prepareApprovalFixture());});
afterAll(async () => { await flushTransactionalConsumerRepairWrites(); __resetConsumerRepairRequestStoreForTests(); });
beforeEach(() => { saveConsumerRepairBundle(structuredClone(base)); });
afterEach(async () => { await flushTransactionalConsumerRepairWrites(); jest.restoreAllMocks(); });

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
    manualQuantityApproval: ack, canonicalArtifact: { artifactId: 'same-revision-pdf', revisionId: ack.revisionId,
      releaseId: ack.releaseId, status: 'ready', sha256: 'c'.repeat(64) } });
  expect(approved.draft.status).toBe('consumer_approved');
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
    manualQuantityApproval:ack,canonicalArtifact:{artifactId:'durable-manual-pdf',revisionId:ack.revisionId,releaseId:ack.releaseId,status:'ready',sha256:'c'.repeat(64)}});
  const compact=mode==='normal'?compactConsumerRepairBundleForDurableStorage(approved)
    :mode==='summary-only'?compactConsumerRepairApprovedHistorySummaryBundleForDurableStorage(approved)
    :compactConsumerRepairBundleForEmergencyDurableStorage(approved);
  const reloaded=decodeConsumerRepairBundleFromDurableStorage(JSON.parse(JSON.stringify(encodeConsumerRepairBundleForDurableStorage(compact))))!;
  expect(reloaded.structuredEstimatePayload).toBeNull();
  expect(reloaded.durableHistorySummary?.manualQuantityApproval).toEqual(ack);
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
      manualQuantityApproval:ack,canonicalArtifact:{artifactId:'bound-manual-pdf',revisionId:ack.revisionId,releaseId:ack.releaseId,status:'ready',sha256:'c'.repeat(64)}});
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
  const {base,session}=await prepareApprovalFixture(manual);
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
  jest.spyOn(canonicalClient,'buildCanonicalEstimateArtifact').mockResolvedValue({kind:'pdf',status:'ready',artifactId:'cold-approved-pdf',
    revisionId:acknowledgment.revisionId,releaseId:acknowledgment.releaseId,sha256:'c'.repeat(64)} as never);
  jest.spyOn(router,'replace').mockImplementation(()=>undefined);
  await action.approveManualQuantitiesDraft();
  expect(getConsumerRepairRequest(base.draft.id).draft.status).toBe('consumer_approved');
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

test('the controller commits the explicitly confirmed saved manual revision and leaves its quantities and technical level unchanged', async () => {
  const ack = candidate(base)!;
  jest.spyOn(canonicalClient, 'buildCanonicalEstimateArtifact').mockResolvedValue({ kind: 'pdf', status: 'ready',
    artifactId: 'current-manual-archive', revisionId: ack.revisionId, releaseId: ack.releaseId, sha256: 'c'.repeat(64) } as never);
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
  expect(saved.items.map(item => item.quantity)).toEqual(base.items.map(item => item.quantity));
  expect(saved.estimateDraftRevisionState!.revisions.at(-1)!.estimateLevel).toBe('PRELIMINARY_QUANTITY_BOQ');
  expect(action.state.bundle).toBeNull();expect(action.state.statusMessage).toContain('ручными количествами');
  expect(router.replace).toHaveBeenCalledWith('/request');
});

test('new edits made while the approval PDF is prepared remain pending and prevent confirmation of the older manual numbers', async () => {
  const ack=candidate(base)!;let release!: (value: never)=>void;
  const pdf=new Promise<never>(resolve=>{release=resolve;});
  const build=jest.spyOn(canonicalClient,'buildCanonicalEstimateArtifact').mockReturnValue(pdf);
  const controller=new ConsumerRepairRequestScreenController({consumerUserId:base.draft.consumerUserId,
    onPrepareCanonicalEstimate:jest.fn(),onLoadCanonicalRevisionDraft:jest.fn(),onLoadCanonicalParameterSession:jest.fn(async()=>session),
    onRecalculateCanonicalEstimate:jest.fn(),onSelectCanonicalCatalogItem:jest.fn(),onAddCanonicalCatalogItem:jest.fn(),onOpenPhotoForMaterialRecognition:jest.fn()});
  const action=controller as unknown as {state:typeof controller.state;setState:(patch:Partial<typeof controller.state>)=>void;
    ensureInitialCanonicalRevision:()=>Promise<{status:'READY';bundle:typeof base}>;approveManualQuantitiesDraft:()=>Promise<void>};
  action.state={...action.state,bundle:base,problemText:base.draft.problemText!};
  action.setState=patch=>{action.state={...action.state,...patch};};action.ensureInitialCanonicalRevision=async()=>({status:'READY',bundle:base});
  const approving=action.approveManualQuantitiesDraft();
  for(let tick=0;tick<10&&!build.mock.calls.length;tick++)await Promise.resolve();
  expect(build).toHaveBeenCalledTimes(1);action.state={...action.state,pendingCanonicalRowEditCount:1};
  release({kind:'pdf',status:'ready',artifactId:'delayed-current-pdf',revisionId:ack.revisionId,releaseId:ack.releaseId,sha256:'c'.repeat(64)} as never);
  await approving;
  expect(getConsumerRepairRequest(base.draft.id).draft.status).toBe('draft');
  expect(action.state.pendingCanonicalRowEditCount).toBe(1);expect(action.state.statusMessage).toContain('Примените новые правки');
});

test('history identifies manual approval and shows real shared resources without priced calculation counters or duplicate amounts',()=>{
  const ack=candidate(base)!,approved=approveConsumerRepairRequestDraft({requestDraftId:base.draft.id,userId:base.draft.consumerUserId,
    manualQuantityApproval:ack,canonicalArtifact:{artifactId:'readonly-current-pdf',revisionId:ack.revisionId,releaseId:ack.releaseId,status:'ready',sha256:'c'.repeat(64)}});
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
 const{base:b}=await prepareApprovalFixture(false),ack=candidate(b)!;
 expect(ack).toMatchObject({mode:'MANUAL_PRELIMINARY',unresolvedQuantityRowIds:expect.any(Array)});expect(ack.unresolvedQuantityRowIds).toHaveLength(4);
 expect(consumerEstimateUnresolvedQuantityItems(b)).toHaveLength(4);expect(validateConsumerRepairRequestForApprove(b.draft.id,b.draft.consumerUserId).ok).toBe(false);
 const before=JSON.stringify(b.items),level=b.estimateDraftRevisionState!.revisions.at(-1)!.estimateLevel;expect(validateConsumerRepairRequestForApprove(b.draft.id,b.draft.consumerUserId,ack).ok).toBe(true);
 const approved=approveConsumerRepairRequestDraft({requestDraftId:b.draft.id,userId:b.draft.consumerUserId,manualQuantityApproval:ack,canonicalArtifact:{artifactId:'saved-preliminary-pdf',revisionId:ack.revisionId,releaseId:ack.releaseId,status:'ready',sha256:'c'.repeat(64)}});
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
 const{base:b,session:s}=await prepareApprovalFixture(false),ack=candidate(b)!;jest.spyOn(canonicalClient,'buildCanonicalEstimateArtifact').mockResolvedValue({kind:'pdf',status:'ready',artifactId:'preliminary-saved-pdf',revisionId:ack.revisionId,releaseId:ack.releaseId,sha256:'c'.repeat(64)} as never);jest.spyOn(router,'replace').mockImplementation(()=>undefined);
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
