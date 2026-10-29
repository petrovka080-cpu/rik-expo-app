import {logger} from '../logger';
import {InMemoryEstimateRevisionDurableStore} from '../platform/estimateRevisionDurableStore';
import {consumerEstimateSavedReportBinding} from './consumerEstimateProfessionalPdfReview';
import {assertCanonicalLegacyReviewSnapshotV1,canonicalManualPreliminaryReviewEligibilityV1,canonicalProfessionalPdfReviewEligibilityV1} from '../estimate/backendPlatform/canonicalEstimateSavedOperationAcceptanceV1';
import {loadConsumerRepairCanonicalNamingEvidence} from '../../features/consumerRepair/ConsumerRepairRequestScreenContainer';
import {buildCanonicalArtifactMetadata} from '../estimate/backendPlatform/canonicalEstimateArtifactContract';
import {canonicalProfessionalPdfReviewAcknowledgmentV1} from '../estimate/backendPlatform/canonicalEstimateSavedOperationAcceptanceV1';
import {CANONICAL_PROFESSIONAL_PDF_GENERATOR_VERSION} from '../estimate/backendPlatform/canonicalProfessionalPdf';
import React from 'react';
import TestRenderer,{act} from 'react-test-renderer';
import {router} from 'expo-router';
import {CanonicalEstimateApiError,ESTIMATE_PLATFORM_API_VERSION,type CanonicalEstimateRevisionView,type CanonicalEstimateCatalogItem} from '../estimate/backendPlatform/contracts';
import {canonicalEstimateRevisionRowFromStorage} from '../estimate/backendPlatform/canonicalEstimateRevisionReadMapper';
import {adaptCanonicalRevisionToStructuredEstimate} from '../estimate/backendPlatform/canonicalEstimateForemanAdapter';
import {buildStructuredEstimateRequestDraft} from '../estimateStructuredPipeline/structuredEstimateRequestBinding';
import {appendCanonicalBackendRevisionProjection,bindCanonicalBackendArtifactToCurrentRevisionProjection} from './consumerCanonicalBackendRevisionProjection';
import {consumerEstimateSavedPreliminaryApprovalCandidate as savedCandidate,consumerEstimateManualQuantityApprovalMatches as matches,
 consumerEstimateManualQuantityApprovalRecord,consumerEstimateManualApprovalStatusRu} from './consumerEstimateManualQuantityApproval';
import {createConsumerRepairRequestDraft,__resetConsumerRepairRequestStoreForTests,getConsumerRepairRequest} from './index';
import {saveConsumerRepairBundle} from './consumerRequestRepository';
import * as repository from './consumerRequestRepository';
import {approveConsumerRepairRequestDraft} from './consumerRequestService';
import {validateConsumerRepairRequestForMarketplace} from './consumerRequestValidationService';
import {compactConsumerRepairBundleForDurableStorage,compactConsumerRepairApprovedHistorySummaryBundleForDurableStorage,
 compactConsumerRepairBundleForEmergencyDurableStorage,encodeConsumerRepairBundleForDurableStorage,decodeConsumerRepairBundleFromDurableStorage} from '../platform/compactConsumerRepairDurableState';
import {flushTransactionalConsumerRepairWrites} from '../platform/consumerRepairTransactionalDurableBridge';
import {ConsumerRepairRequestScreenController} from '../../features/consumerRepair/ConsumerRepairRequestScreen';
import {ConsumerRepairRequestStickyActions} from '../../features/consumerRepair/ConsumerRepairRequestChrome';
import * as client from '../estimate/backendPlatform/canonicalEstimateClient';
import * as preview from '../documents/pdfDocumentActions';
import {buildPdfInstantCacheKey} from '../pdf/pdfInstantCache';
import {createPdfDocumentDescriptor} from '../documents/pdfDocument';

jest.mock('@expo/vector-icons',()=>({Ionicons:()=>null}));
const evidence=require('./__fixtures__/savedLegacyCarpet58ReviewV1.json');
function fixture(){
 const r=evidence.revision;
 assertCanonicalLegacyReviewSnapshotV1({revision:r,resources:evidence.resources});
 const revision={apiVersion:ESTIMATE_PLATFORM_API_VERSION,revisionId:r.id,parentRevisionId:null,releaseId:r.release_id,
  catalogId:r.catalog_id,definitionVersionId:r.definition_version_id,revisionNumber:1,status:'ready',currencyCode:'KGS',
  parameters:r.input_parameters,totals:{},rowCount:r.row_count,checksumSha256:r.checksum_sha256,
  compilerOwner:'backend',compilerVersion:'canonical-estimate-local-runtime.r6',createdAt:'2026-10-29T00:00:00Z',
  preliminaryNeeds:[],amendmentContract:r.amendment_contract,operationResourceAcceptanceV1:evidence.acceptance} as CanonicalEstimateRevisionView;
 revision.manualPreliminaryReviewEligibilityV1=canonicalManualPreliminaryReviewEligibilityV1({revision:r,resources:evidence.resources});
 revision.professionalPdfReviewEligibilityV1=canonicalProfessionalPdfReviewEligibilityV1({revision:r,resources:evidence.resources});
 expect(revision.professionalPdfReviewEligibilityV1).toMatchObject({eligible:true,status:'ELIGIBLE',unknownQuantityCount:0});
 expect(revision.manualPreliminaryReviewEligibilityV1).toMatchObject({eligible:true,status:'ELIGIBLE',unknownQuantityCount:0});
 const catalog={catalogId:r.catalog_id,releaseId:r.release_id,namespace:'global',workKey:'flooring_interior_carpet_lay_standard',
  titleRu:'Укладка коврового покрытия',domain:'finishing',definitionVersion:3,applicability:{},professionalMetadata:{},parameterSchema:[]} as unknown as CanonicalEstimateCatalogItem;
 const payload=adaptCanonicalRevisionToStructuredEstimate({catalog,revision,rows:evidence.resources.map((row:Record<string,unknown>)=>canonicalEstimateRevisionRowFromStorage(row,null))});
 let bundle=createConsumerRepairRequestDraft({consumerUserId:'saved-carpet-review-owner',problemText:'Укладка коврового покрытия',aiDraft:buildStructuredEstimateRequestDraft(payload)});
 bundle=appendCanonicalBackendRevisionProjection({previousBundle:null,nextBundle:bundle,payload});
 bundle=saveConsumerRepairBundle({...bundle,canonicalParameterSession:null});
 return{bundle,revision};
}
function pdfReviewIdentityForTest(revision:CanonicalEstimateRevisionView){return{revisionId:revision.revisionId,releaseId:revision.releaseId,
 definitionVersionId:revision.definitionVersionId!,checksumSha256:revision.checksumSha256};}
function controllerFor(bundle:ReturnType<typeof fixture>['bundle'],extra:Partial<React.ComponentProps<typeof ConsumerRepairRequestScreenController>>={}){
 const controller=new ConsumerRepairRequestScreenController({consumerUserId:bundle.draft.consumerUserId,onPrepareCanonicalEstimate:jest.fn(),
  onLoadCanonicalRevisionDraft:jest.fn(),onLoadCanonicalParameterSession:jest.fn(),onRecalculateCanonicalEstimate:jest.fn(),onSelectCanonicalCatalogItem:jest.fn(),
  onAddCanonicalCatalogItem:jest.fn(),onOpenPhotoForMaterialRecognition:jest.fn(),...extra});
 const action=controller as any;
 action.state={...action.state,bundle,problemText:bundle.draft.problemText};
 action.setState=(patch:any,callback?:()=>void)=>{const next=typeof patch==='function'?patch(action.state):patch;if(next)action.state={...action.state,...next};callback?.();};
 action.resolvedDraftBundle=(b:any)=>b;action.ensureDraftBundle=()=>action.state.bundle;
 action.handleCanonicalArtifactOpenError=jest.fn();
 return{controller,action};
}
afterEach(async()=>{await flushTransactionalConsumerRepairWrites();jest.restoreAllMocks();__resetConsumerRepairRequestStoreForTests();});
test('legacy58 58 saved priced rows permit only exact manual preliminary acknowledgment without PDF or engineering admission',()=>{
 const{bundle,revision}=fixture(),before=JSON.stringify(bundle.items),ack=savedCandidate(bundle,revision)!;
 expect(bundle.items).toHaveLength(58);expect(bundle.items.filter(i=>i.unitPrice!=null)).toHaveLength(58);
 expect(ack).toMatchObject({basis:'SAVED_VERSION_REVIEW',mode:'MANUAL_PRELIMINARY',unknownQuantityCount:0,pdfReady:false,full:false,paymentAdmission:false,procurementAdmission:false});
 expect(ack.rowIds).toHaveLength(58);expect(savedCandidate(bundle)).toBeNull();expect(matches(bundle,ack,revision)).toBe(true);
 const approved=approveConsumerRepairRequestDraft({requestDraftId:bundle.draft.id,userId:bundle.draft.consumerUserId,manualQuantityApproval:ack,savedRevisionRead:revision});
 expect(JSON.stringify(approved.items)).toBe(before);
 expect(approved.events.at(-1)).toMatchObject({eventType:'consumer_approved_canonical_preliminary',payload:{pdfArtifactCreated:false,unknownQuantityCount:0,full:false}});
 expect(approved.events.at(-1)?.payload).not.toHaveProperty('artifactId');
 expect(Reflect.get(approved.estimateDraftRevisionState!.revisions.at(-1)!,'pdfArtifactId')).toBeFalsy();
 expect(validateConsumerRepairRequestForMarketplace(bundle.draft.id,bundle.draft.consumerUserId).errors).toEqual(expect.arrayContaining([expect.objectContaining({code:'ESTIMATE_MANUAL_SOURCE_REVIEW_REQUIRED'})]));
});
test.each(['quantity','unit','title','price','rowCode','category','payable','procurement','estimate','owner','unknown','object','safety','supply','withdrawal','checksum','release'] as const)
 ('same tuple and count do not acknowledge changed saved %s',mutation=>{
 const{bundle:b,revision:r}=fixture(),ack=savedCandidate(b,r)!,item=b.items[0],cur=b.estimateDraftRevisionState!.revisions.at(-1)!;
 if(mutation==='quantity')item.quantity=Number(item.quantity)+1;
 if(mutation==='unit')item.unit='m';
 if(mutation==='title')item.titleRu+=' changed';
 if(mutation==='price')item.unitPrice=Number(item.unitPrice)+1;
 if(mutation==='rowCode')item.sourceParameters!.rowCode='foreign-same-count';
 if(mutation==='category')item.category='equipment';
 if(mutation==='payable')item.sourceParameters!.payable=!(item.sourceParameters!.payable===true);
 if(mutation==='procurement')item.sourceParameters!.includedInProcurement=!(item.sourceParameters!.includedInProcurement===true);
 if(mutation==='estimate')item.sourceParameters!.includedInEstimate=!(item.sourceParameters!.includedInEstimate===true);
 if(mutation==='owner')item.sourceParameters!.semanticOwner='foreign-owner';
 if(mutation==='unknown')item.quantity=null;
 if(mutation==='object'||mutation==='safety')cur.missingInputs.push({key:'site',label:'Site',requiredFor:mutation==='safety'?'safety_review':'contract_ready',blocksPreliminaryEstimate:false});
 if(mutation==='supply')item.sourceParameters!.canonicalPurchaseSupplyBlocksV1=[{policy:'blocked'}];
 if(mutation==='withdrawal')r.contentWithdrawalReasonRu='withdrawn';
 if(mutation==='checksum')r.checksumSha256='b'.repeat(64);
 if(mutation==='release')r.releaseId='foreign';
 expect(b.items).toHaveLength(58);expect(savedCandidate(b,r)).toBeNull();expect(matches(b,ack,r)).toBe(false);
});
test('definition identity and explicit acknowledgment flags cannot be substituted',()=>{
 const{bundle,revision}=fixture(),ack=savedCandidate(bundle,revision)!;
 expect(matches(bundle,{...ack,definitionVersionId:'foreign'},revision)).toBe(false);
 expect(matches(bundle,{...ack,checksumSha256:'c'.repeat(64)},revision)).toBe(false);
 expect(matches(bundle,{...ack,unknownQuantityCount:1},revision)).toBe(false);
});
test.each(['normal','summary-only','emergency'] as const)('legacy58 durable %s cold history retains acknowledgment without fake artifact',mode=>{
 const{bundle,revision}=fixture(),ack=savedCandidate(bundle,revision)!;
 const approved=approveConsumerRepairRequestDraft({requestDraftId:bundle.draft.id,manualQuantityApproval:ack,savedRevisionRead:revision});
 const compact=mode==='normal'?compactConsumerRepairBundleForDurableStorage(approved):mode==='summary-only'
  ?compactConsumerRepairApprovedHistorySummaryBundleForDurableStorage(approved):compactConsumerRepairBundleForEmergencyDurableStorage(approved);
 const cold=decodeConsumerRepairBundleFromDurableStorage(JSON.parse(JSON.stringify(encodeConsumerRepairBundleForDurableStorage(compact))))!;
 expect(consumerEstimateManualQuantityApprovalRecord(cold)).toEqual(ack);
 expect(consumerEstimateManualApprovalStatusRu(cold)).toBe('Подтверждена вручную как предварительная');
 expect(cold.durableHistorySummary?.canonicalRevisionChecksumSha256).toBe(revision.checksumSha256);
 expect(cold.durableHistorySummary?.pdfArtifactId).toBeFalsy();
 expect(Reflect.get(cold.estimateDraftRevisionState?.revisions.at(-1)??{},'pdfArtifactId')).toBeFalsy();
});
test('controller cold zero-needs legacy58 recovers only after one fresh exact backend GET, without edits or compilation',async()=>{
 const{bundle,revision}=fixture();
 const cold=decodeConsumerRepairBundleFromDurableStorage(JSON.parse(JSON.stringify(encodeConsumerRepairBundleForDurableStorage(compactConsumerRepairBundleForDurableStorage(bundle)))))!;
 saveConsumerRepairBundle(cold);
 expect(cold.items).toHaveLength(58);expect(cold.items.some(i=>i.sourceParameters?.canonicalPreliminaryNeed===true)).toBe(false);
 expect(cold.structuredEstimatePayload).toBeNull();expect(cold.canonicalBackendApprovalEvidence).toBeFalsy();
 const before=JSON.stringify(cold.items);
 let finishRead!:(value:CanonicalEstimateRevisionView)=>void;
 const fresh=jest.spyOn(client,'getCanonicalEstimateRevision').mockImplementation(()=>new Promise(resolve=>{finishRead=resolve;}));
 const load=jest.fn((revisionId:string,requestDraftId:string)=>loadConsumerRepairCanonicalNamingEvidence({
  revisionId,requestDraftId,consumerUserId:cold.draft.consumerUserId,workspaceGenerationRef:{current:0}}));
 const{controller,action}=controllerFor(cold,{onLoadCanonicalNamingEvidence:load});
 expect(savedCandidate(action.state.bundle,revision)).toBeNull();
 const reading=action.hydrateCurrentCanonicalNamingEvidence();
 expect(load).toHaveBeenCalledTimes(1);expect(load).toHaveBeenCalledWith(revision.revisionId,cold.draft.id);
 expect(fresh).toHaveBeenCalledTimes(1);expect(savedCandidate(action.state.bundle,revision)).toBeNull();
 finishRead(revision);await reading;
 expect(savedCandidate(action.state.bundle,revision)).toMatchObject({mode:'MANUAL_PRELIMINARY',basis:'SAVED_VERSION_REVIEW',rowIds:expect.any(Array)});
 expect(JSON.stringify(action.state.bundle.items)).toBe(before);
 expect(controller.props.onPrepareCanonicalEstimate).not.toHaveBeenCalled();
 expect(controller.props.onRecalculateCanonicalEstimate).not.toHaveBeenCalled();
 const build=jest.spyOn(client,'buildCanonicalEstimateArtifact');expect(build).not.toHaveBeenCalled();
 await action.hydrateCurrentCanonicalNamingEvidence();expect(load).toHaveBeenCalledTimes(1);
 const recold=compactConsumerRepairBundleForDurableStorage(action.state.bundle);
 expect(recold.canonicalBackendApprovalEvidence).toBeNull();expect(savedCandidate(recold,revision)).toBeNull();
});
test('review file cannot bind ordinary READY and cache identity separates purposes',()=>{
 const{bundle,revision}=fixture();
 expect(()=>bindCanonicalBackendArtifactToCurrentRevisionProjection({bundle,artifact:{artifactId:'review',kind:'pdf',issuancePurpose:'PRELIMINARY_REVIEW',revisionId:revision.revisionId,releaseId:revision.releaseId}})).toThrow('CANONICAL_REVIEW_ARTIFACT_CANNOT_BIND_READY');
 const common={uri:'https://example.test/file.pdf',title:'Saved estimate',documentType:'request' as const,source:'generated' as const,originModule:'reports' as const,
  contentIdentity:{revisionId:revision.revisionId,releaseId:revision.releaseId,checksumSha256:revision.checksumSha256}};
 expect(buildPdfInstantCacheKey(createPdfDocumentDescriptor({...common,contentIdentity:{...common.contentIdentity,issuancePurpose:'STANDARD'}})))
  .not.toBe(buildPdfInstantCacheKey(createPdfDocumentDescriptor({...common,contentIdentity:{...common.contentIdentity,issuancePurpose:'PRELIMINARY_REVIEW'}})));
});
test('ordinary saved PDF button opens directly without approval or review confirmation',()=>{
 const open=jest.fn(),legacy=jest.fn();let view!:TestRenderer.ReactTestRenderer;
 act(()=>{view=TestRenderer.create(React.createElement(ConsumerRepairRequestStickyActions,{approved:false,sent:false,hasBundle:true,hasSnapshot:true,
  pdfSavedSnapshotAvailable:true,operationCompositionDiagnostic:{state:'AVAILABLE',acceptance:evidence.acceptance},
  onOpenPreliminaryReviewPdf:legacy,onOpenPdf:jest.fn(),onMakePdf:open,onCreateNew:jest.fn(),onDeleteDraft:jest.fn(),onApproveDraft:jest.fn(),onPrepareDraft:jest.fn()}));});
 const button=view.root.findByProps({testID:'consumer-estimate-make-pdf'});expect(button.props.disabled).toBe(false);
 act(()=>button.props.onPress());expect(open).toHaveBeenCalledTimes(1);expect(legacy).not.toHaveBeenCalled();
 expect(view.root.findAllByProps({testID:'consumer-repair-preliminary-review-confirm'})).toHaveLength(0);act(()=>view.unmount());
});

test.each(['GET','BUILD'] as const)('report %s may resolve after unsaved local edit without saving it or changing approval',async phase=>{
 const{bundle,revision}=fixture(),{action}=controllerFor(bundle),before=JSON.stringify(getConsumerRepairRequest(bundle.draft.id)),
  response=cachedReviewResponse(revision),show=jest.spyOn(preview,'prepareAndPreviewPdfDocument').mockResolvedValue(undefined as never);
 let resolve!:(value:any)=>void;const pending=new Promise<any>(done=>{resolve=done;});
 const read=jest.spyOn(client,'getCanonicalEstimateRevision').mockReturnValue(phase==='GET'?pending:Promise.resolve(revision));
 jest.spyOn(client,'getCanonicalEstimateArtifact').mockRejectedValue(new CanonicalEstimateApiError('not found',{code:'NOT_FOUND',httpStatus:404}));
 const build=jest.spyOn(client,'buildCanonicalEstimateArtifact').mockReturnValue(phase==='BUILD'?pending:Promise.resolve(response as never));
 const opening=action.completePdfOpen();
 for(let i=0;i<20&&!(phase==='GET'?read.mock.calls.length:build.mock.calls.length);i++)await Promise.resolve();
 action.state={...action.state,pendingCanonicalRowEditCount:1,bundle:structuredClone(bundle)};
 action.state.bundle.items[0].titleRu='Unsaved local title';
 resolve(phase==='GET'?revision:response);await opening;
 expect(show).toHaveBeenCalledTimes(1);expect(action.state.pendingCanonicalRowEditCount).toBe(1);
 expect(action.state.bundle.items[0].titleRu).toBe('Unsaved local title');
 expect(JSON.stringify(getConsumerRepairRequest(bundle.draft.id))).toBe(before);
 expect(read).toHaveBeenCalledWith(revision.revisionId,{issuancePurpose:'PRELIMINARY_REVIEW'});
});

test.each(['NOT_FOUND','ARTIFACT_PRESENTATION_REFRESH_REQUIRED'] as const)('history %s builds only the exact saved report without reading current catalog',async code=>{
 const{bundle,revision}=fixture(),{action}=controllerFor(bundle);
 jest.spyOn(client,'getCanonicalEstimateRevision').mockResolvedValue(revision);
 jest.spyOn(client,'getCanonicalEstimateArtifact').mockRejectedValue(new CanonicalEstimateApiError('missing',{code,httpStatus:404}));
 const catalog=jest.spyOn(client,'getCanonicalEstimateCatalogItem');
 const build=jest.spyOn(client,'buildCanonicalEstimateArtifact').mockRejectedValue(new CanonicalEstimateApiError('real structural STOP',{code:'ESTIMATE_OPERATION_RESOURCE_INVALID',httpStatus:409}));
 await action.completeHistoryPdfOpen();expect(action.handleCanonicalArtifactOpenError).toHaveBeenCalledWith(expect.objectContaining({code:'ESTIMATE_OPERATION_RESOURCE_INVALID'}));
 expect(catalog).not.toHaveBeenCalled();expect(build).toHaveBeenCalledWith(expect.objectContaining({revisionId:revision.revisionId,documentProfile:'professional_v1'}));
});
test('report slot conflict stays fail closed without STANDARD fallback or READY binding',async()=>{
 const{bundle,revision}=fixture(),{action}=controllerFor(bundle);
 jest.spyOn(client,'getCanonicalEstimateRevision').mockResolvedValue(revision);
 jest.spyOn(client,'getCanonicalEstimateArtifact').mockRejectedValue(new CanonicalEstimateApiError('purpose conflict',{code:'ARTIFACT_PURPOSE_CONFLICT',httpStatus:409}));
 const build=jest.spyOn(client,'buildCanonicalEstimateArtifact'),show=jest.spyOn(preview,'prepareAndPreviewPdfDocument');
 await action.completeHistoryPdfOpen();expect(action.handleCanonicalArtifactOpenError).toHaveBeenCalledWith(expect.objectContaining({code:'ARTIFACT_PURPOSE_CONFLICT'}));
 expect(build).not.toHaveBeenCalled();expect(show).not.toHaveBeenCalled();expect(Reflect.get(getConsumerRepairRequest(bundle.draft.id).estimateDraftRevisionState!.revisions.at(-1)!,'pdfArtifactId')).toBeFalsy();
});
test('unavailable revision transport does not claim missing object inputs or promise manual eligibility',()=>{
 let view!:TestRenderer.ReactTestRenderer;
 act(()=>{view=TestRenderer.create(React.createElement(ConsumerRepairRequestStickyActions,{approved:false,sent:false,hasBundle:true,hasSnapshot:true,
  operationCompositionDiagnostic:{state:'UNAVAILABLE',errorCode:'RUNTIME_COMPATIBILITY_MISMATCH_sourceSnapshotId'},approvalBlockedByParameters:true,
  onOpenPdf:jest.fn(),onMakePdf:jest.fn(),onCreateNew:jest.fn(),onDeleteDraft:jest.fn(),onApproveDraft:jest.fn(),onPrepareDraft:jest.fn()}));});
 const button=view.root.findByProps({testID:'consumer-repair-approve'});expect(button.props.disabled).toBe(true);
 expect(button.props.accessibilityLabel).toBe('Проверка сохранённой версии недоступна');
 expect(JSON.stringify(view.toJSON())).not.toContain('Вы можете подтвердить их');act(()=>view.unmount());
});
test('manual saved-version controller waits for durable acknowledgment without preparing any PDF',async()=>{
 const{bundle,revision}=fixture(),{action}=controllerFor(bundle);
 action.ensureInitialCanonicalRevision=async()=>({status:'READY',bundle});
 action.loadCanonicalParameterSessionForBundle=async()=>null;
 jest.spyOn(client,'getCanonicalEstimateRevision').mockResolvedValue(revision);
 const build=jest.spyOn(client,'buildCanonicalEstimateArtifact');
 jest.spyOn(router,'replace').mockImplementation(()=>undefined);
 await action.approveManualQuantitiesDraft();
 const saved=getConsumerRepairRequest(bundle.draft.id);
 expect(saved.draft.status).toBe('consumer_approved');expect(build).not.toHaveBeenCalled();
 expect(saved.events.at(-1)?.eventType).toBe('consumer_approved_canonical_preliminary');
 expect(saved.events.at(-1)?.payload).not.toHaveProperty('artifactId');
});
test('ordinary confirmation still requires a ready STANDARD artifact and rejects a review artifact',()=>{
 const{bundle,revision}=fixture();
 expect(()=>approveConsumerRepairRequestDraft({requestDraftId:bundle.draft.id})).toThrow();
 expect(()=>approveConsumerRepairRequestDraft({requestDraftId:bundle.draft.id,canonicalArtifact:{
  artifactId:'review-only',issuancePurpose:'PRELIMINARY_REVIEW',status:'ready',revisionId:revision.revisionId,releaseId:revision.releaseId,sha256:'b'.repeat(64)}})).toThrow();
 expect(getConsumerRepairRequest(bundle.draft.id).draft.status).toBe('draft');
});
test('manual history PDF tap reads exact saved report directly and preserves its durable approval',async()=>{
 const{bundle,revision}=fixture(),ack=savedCandidate(bundle,revision)!;
 const approved=approveConsumerRepairRequestDraft({requestDraftId:bundle.draft.id,manualQuantityApproval:ack,savedRevisionRead:revision}),
  before=JSON.stringify(getConsumerRepairRequest(bundle.draft.id)),{action}=controllerFor(approved);
 action.findKnownHistoryBundle=()=>approved;
 jest.spyOn(client,'getCanonicalEstimateRevision').mockResolvedValue(revision);
 jest.spyOn(client,'getCanonicalEstimateArtifact').mockRejectedValue(new CanonicalEstimateApiError('not found',{code:'NOT_FOUND',httpStatus:404}));
 const build=jest.spyOn(client,'buildCanonicalEstimateArtifact').mockResolvedValue(cachedReviewResponse(revision) as never),
  show=jest.spyOn(preview,'prepareAndPreviewPdfDocument').mockResolvedValue(undefined as never);
 await action.completeHistoryPdfOpen(approved.draft.id);
 expect(build).toHaveBeenCalledWith(expect.objectContaining({issuancePurpose:'PRELIMINARY_REVIEW',reviewRequest:expect.objectContaining({
  revisionId:revision.revisionId,releaseId:revision.releaseId,definitionVersionId:revision.definitionVersionId,checksumSha256:revision.checksumSha256,acknowledgedPreliminaryReview:true})}));
 expect(show).toHaveBeenCalledTimes(1);expect(JSON.stringify(getConsumerRepairRequest(bundle.draft.id))).toBe(before);
 expect(consumerEstimateManualQuantityApprovalRecord(getConsumerRepairRequest(bundle.draft.id))).toEqual(ack);
});

test.each(['missing','blocked-condition','blocked-safety','blocked-unit','blocked-supply','foreign-revision','foreign-release','foreign-definition','foreign-checksum','unknown-count','bad-audit-digest'] as const)
 ('saved legacy acknowledgment requires same-tuple server eligibility: %s',mutation=>{
 const{bundle,revision}=fixture(),ack=savedCandidate(bundle,revision)!;
 if(mutation==='missing')delete revision.manualPreliminaryReviewEligibilityV1;
 else{
  const e={...revision.manualPreliminaryReviewEligibilityV1!};revision.manualPreliminaryReviewEligibilityV1=e;
  if(mutation.startsWith('blocked-')){e.eligible=false;e.status='BLOCKED';e.reasonRu=mutation;}
  if(mutation==='foreign-revision')e.revisionId='foreign';
  if(mutation==='foreign-release')e.releaseId='foreign';
  if(mutation==='foreign-definition')e.definitionVersionId='foreign';
  if(mutation==='foreign-checksum')e.checksumSha256='d'.repeat(64);
  if(mutation==='unknown-count')e.unknownQuantityCount=1;
  if(mutation==='bad-audit-digest')e.auditSha256='invalid';
 }
 expect(savedCandidate(bundle,revision)).toBeNull();expect(matches(bundle,ack,revision)).toBe(false);
});
test.each([null,{},'blocked',1])('malformed supplied purchase marker cannot grant saved manual acknowledgment: %p',marker=>{
 const{bundle,revision}=fixture();bundle.items[0].sourceParameters!.canonicalPurchaseSupplyBlocksV1=marker;
 expect(savedCandidate(bundle,revision)).toBeNull();
});
test.each(['condition','supply-null','graph-null','invalid-unit','invalid-owner','raw-contract-null'] as const)
 ('actual server legacy guard maps raw %s to a blocked manual acknowledgment',mutation=>{
 const{bundle,revision}=fixture(),raw=structuredClone(evidence),row=raw.resources[0];
 if(mutation==='condition')row.calculation_trace.needState='CONDITION_REQUIRED';
 if(mutation==='supply-null')row.calculation_trace.purchaseSupplyBlocksV1=null;
 if(mutation==='graph-null')row.calculation_trace.resourceGraph=null;
 if(mutation==='invalid-unit')row.unit_id='UNSUPPORTED_SAVED_UNIT';
 if(mutation==='invalid-owner')row.semantic_owner='foreign-owner';
 if(mutation==='raw-contract-null')raw.revision.amendment_contract=null;
 revision.manualPreliminaryReviewEligibilityV1=canonicalManualPreliminaryReviewEligibilityV1({revision:raw.revision,resources:raw.resources});
 expect(revision.manualPreliminaryReviewEligibilityV1.eligible).toBe(false);
 expect(savedCandidate(bundle,revision)).toBeNull();
});
test.each(['release','catalog','checksum','revision','needs','owner','generation'] as const)
 ('cold naming loader does not save or attach rejected %s evidence',async mutation=>{
 const{bundle,revision}=fixture();
 const cold=decodeConsumerRepairBundleFromDurableStorage(JSON.parse(JSON.stringify(encodeConsumerRepairBundleForDurableStorage(compactConsumerRepairBundleForDurableStorage(bundle)))))!;
 saveConsumerRepairBundle(cold);
 const before=JSON.stringify(getConsumerRepairRequest(cold.draft.id)),generation={current:0};
 const save=jest.spyOn(repository,'saveConsumerRepairBundle');
 let finish!:(value:CanonicalEstimateRevisionView)=>void;
 const read=jest.spyOn(client,'getCanonicalEstimateRevision').mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
 const loading=loadConsumerRepairCanonicalNamingEvidence({revisionId:revision.revisionId,requestDraftId:cold.draft.id,
  consumerUserId:mutation==='owner'?'foreign-owner':cold.draft.consumerUserId,workspaceGenerationRef:generation});
 if(mutation!=='owner'){
  const returned=structuredClone(revision);
  if(mutation==='release')returned.releaseId='foreign-release';
  if(mutation==='catalog')returned.catalogId='foreign-catalog';
  if(mutation==='checksum')returned.checksumSha256='d'.repeat(64);
  if(mutation==='revision')returned.revisionId='99999999-9999-4999-8999-999999999999';
  if(mutation==='needs')returned.preliminaryNeeds=[{rowId:'foreign-preliminary-row',titleRu:'Посторонний ресурс',quantity:null,unitId:'m2',missingParameterIds:[]}] as never;
  if(mutation==='generation')generation.current++;
  finish(returned);
 }
 expect(await loading).toBeNull();expect(save).not.toHaveBeenCalled();
 expect(read).toHaveBeenCalledTimes(mutation==='owner'?0:1);
 expect(JSON.stringify(getConsumerRepairRequest(cold.draft.id))).toBe(before);
});
test.each(['release','catalog','checksum','needs','owner','generation'] as const)
 ('controller independently refuses transient %s evidence without changing saved rows or history',async mutation=>{
 const{bundle,revision}=fixture();
 const cold=decodeConsumerRepairBundleFromDurableStorage(JSON.parse(JSON.stringify(encodeConsumerRepairBundleForDurableStorage(compactConsumerRepairBundleForDurableStorage(bundle)))))!;
 saveConsumerRepairBundle(cold);
 const before=JSON.stringify(cold),evidence={...bundle.structuredEstimatePayload!.canonicalBackend!};
 if(mutation==='release')evidence.releaseId='foreign-release';
 if(mutation==='catalog')evidence.catalogId='foreign-catalog';
 if(mutation==='checksum')evidence.checksumSha256='d'.repeat(64);
 if(mutation==='needs')evidence.preliminaryNeeds=[{rowId:'foreign-preliminary-row',titleRu:'Посторонний ресурс',quantity:null,unitId:'m2',missingParameterIds:[]}] as never;
 let finish!:(value:typeof evidence)=>void;
 const load=jest.fn(()=>new Promise<typeof evidence>(resolve=>{finish=resolve;}));
 const{action}=controllerFor(cold,{onLoadCanonicalNamingEvidence:load,...(mutation==='owner'?{consumerUserId:'foreign-owner'}:{})});
 const loading=action.hydrateCurrentCanonicalNamingEvidence();
 if(mutation!=='owner'){
  if(mutation==='generation')action.canonicalNamingEvidenceGeneration++;
  finish(evidence);
 }
 await loading;
 expect(load).toHaveBeenCalledTimes(mutation==='owner'?0:1);
 expect(JSON.stringify(action.state.bundle)).toBe(before);expect(action.state.bundle.canonicalBackendApprovalEvidence).toBeFalsy();
 expect(savedCandidate(action.state.bundle,revision)).toBeNull();
});
test('cold naming evidence retains live withdrawal and cannot enable manual acknowledgment',async()=>{
 const{bundle,revision}=fixture();
 const cold=decodeConsumerRepairBundleFromDurableStorage(JSON.parse(JSON.stringify(encodeConsumerRepairBundleForDurableStorage(compactConsumerRepairBundleForDurableStorage(bundle)))))!;
 saveConsumerRepairBundle(cold);
 const withdrawn={...revision,contentWithdrawalReasonRu:'Источник этой сохранённой версии отозван'};
 jest.spyOn(client,'getCanonicalEstimateRevision').mockResolvedValue(withdrawn);
 const load=jest.fn((revisionId:string,requestDraftId:string)=>loadConsumerRepairCanonicalNamingEvidence({
  revisionId,requestDraftId,consumerUserId:cold.draft.consumerUserId,workspaceGenerationRef:{current:0}}));
 const{action}=controllerFor(cold,{onLoadCanonicalNamingEvidence:load});
 await action.hydrateCurrentCanonicalNamingEvidence();
 expect(load).toHaveBeenCalledTimes(1);
 expect(action.state.bundle.canonicalBackendApprovalEvidence?.contentWithdrawalReasonRu).toBe(withdrawn.contentWithdrawalReasonRu);
 expect(savedCandidate(action.state.bundle,withdrawn)).toBeNull();
 expect(action.state.bundle.items.map((i:any)=>[i.quantity,i.unitPrice])).toEqual(cold.items.map(i=>[i.quantity,i.unitPrice]));
});
function cachedReviewResponse(revision:CanonicalEstimateRevisionView){
 const request={revisionId:revision.revisionId,releaseId:revision.releaseId,definitionVersionId:revision.definitionVersionId!,
  checksumSha256:revision.checksumSha256,acknowledgedPreliminaryReview:true as const};
 const acknowledgment=canonicalProfessionalPdfReviewAcknowledgmentV1({revision:evidence.revision,resources:evidence.resources,
  request,actorUserId:'synthetic-review-owner',acknowledgedAt:'2026-10-29T00:00:00Z'});
 const metadata={...buildCanonicalArtifactMetadata({operation:'professional_pdf',renderer:CANONICAL_PROFESSIONAL_PDF_GENERATOR_VERSION,
  revision:{...evidence.revision,owner_user_id:'synthetic-review-owner'},sourceRowCount:58,projectedRowCount:58,selectedProcurementRowCount:0,
  definitionVersionId:revision.definitionVersionId,pageCount:1,issuancePurpose:'PRELIMINARY_REVIEW',reviewAcknowledgmentV1:acknowledgment,
  operationResourceAcceptanceV1:revision.operationResourceAcceptanceV1,grandTotalStatus:'PARTIAL_NEEDS_PRICE'}),documentProfile:'professional_v1'};
 return{artifactId:'synthetic-cached-review',revisionId:revision.revisionId,releaseId:revision.releaseId,kind:'pdf' as const,
  status:'ready' as const,sha256:'f'.repeat(64),metadata,signedUrl:'https://example.test/exact-review.pdf',byteSize:128};
}
function reviewSurface(surface:'current'|'history'){
 const{bundle,revision}=fixture();let target=bundle;
 if(surface==='history')target=approveConsumerRepairRequestDraft({requestDraftId:bundle.draft.id,manualQuantityApproval:savedCandidate(bundle,revision)!,savedRevisionRead:revision});
 const{action}=controllerFor(target);action.findKnownHistoryBundle=()=>target;
 return{action,revision,target,open:()=>surface==='current'?action.completePreliminaryReviewPdfOpen(pdfReviewIdentityForTest(revision))
  :action.completeHistoryPdfOpen(target.draft.id)};
}
test.each(['current','history'] as const)('explicit %s review reads exact Ready cache without POST or ordinary Ready binding',async surface=>{
 const{action,revision,target,open}=reviewSurface(surface),response=cachedReviewResponse(revision);
 jest.spyOn(client,'getCanonicalEstimateRevision').mockResolvedValue(revision);
 const get=jest.spyOn(client,'getCanonicalEstimateArtifact').mockResolvedValue(response as never),
  build=jest.spyOn(client,'buildCanonicalEstimateArtifact').mockImplementation(()=>{throw new Error('CACHE_HIT_MUST_NOT_POST');}),
  show=jest.spyOn(preview,'prepareAndPreviewPdfDocument').mockResolvedValue(undefined as never);
 await open();
 expect(get).toHaveBeenCalledWith(expect.objectContaining({revisionId:revision.revisionId,issuancePurpose:'PRELIMINARY_REVIEW'}));
 expect(build).not.toHaveBeenCalled();expect(show).toHaveBeenCalledTimes(1);expect(action.handleCanonicalArtifactOpenError).not.toHaveBeenCalled();
 expect(Reflect.get(getConsumerRepairRequest(target.draft.id).estimateDraftRevisionState!.revisions.at(-1)!,'pdfArtifactId')).toBeFalsy();
});
for(const surface of ['current','history'] as const)test.each(['NOT_FOUND','ARTIFACT_PRESENTATION_REFRESH_REQUIRED'] as const)
 ('explicit '+surface+' review creates only after %s',async code=>{
 const{revision,open}=reviewSurface(surface);
 jest.spyOn(client,'getCanonicalEstimateRevision').mockResolvedValue(revision);
 jest.spyOn(client,'getCanonicalEstimateArtifact').mockRejectedValue(new CanonicalEstimateApiError('cache unavailable',{code,httpStatus:404}));
 const build=jest.spyOn(client,'buildCanonicalEstimateArtifact').mockResolvedValue(cachedReviewResponse(revision) as never),
  show=jest.spyOn(preview,'prepareAndPreviewPdfDocument').mockResolvedValue(undefined as never);
 await open();expect(build).toHaveBeenCalledTimes(1);
 expect(build).toHaveBeenCalledWith(expect.objectContaining({revisionId:revision.revisionId,issuancePurpose:'PRELIMINARY_REVIEW',
  reviewRequest:expect.objectContaining({checksumSha256:revision.checksumSha256,acknowledgedPreliminaryReview:true})}));
 expect(show).toHaveBeenCalledTimes(1);
});
for(const surface of ['current','history'] as const)test.each(['REVISION_CONTENT_QUARANTINED','AUTH_REQUIRED','FORBIDDEN','NETWORK_ERROR','ARTIFACT_PURPOSE_CONFLICT','FETCH_TYPEERROR'] as const)
 ('explicit '+surface+' review does not POST after %s',async code=>{
 const{action,revision,open}=reviewSurface(surface);
 jest.spyOn(client,'getCanonicalEstimateRevision').mockResolvedValue(revision);
 jest.spyOn(client,'getCanonicalEstimateArtifact').mockRejectedValue(code==='FETCH_TYPEERROR'?new TypeError('network failure')
  :new CanonicalEstimateApiError('real read denial',{code,httpStatus:code==='NETWORK_ERROR'?503:403,retryable:code==='NETWORK_ERROR'}));
 const build=jest.spyOn(client,'buildCanonicalEstimateArtifact'),show=jest.spyOn(preview,'prepareAndPreviewPdfDocument');
 await open();expect(build).not.toHaveBeenCalled();expect(show).not.toHaveBeenCalled();expect(action.handleCanonicalArtifactOpenError).toHaveBeenCalledTimes(1);
});
for(const surface of ['current','history'] as const)test.each(['revision','checksum','purpose','renderer'] as const)
 ('explicit '+surface+' review does not POST or display mismatched cached %s',async mutation=>{
 const{action,revision,open}=reviewSurface(surface),response=cachedReviewResponse(revision);
 if(mutation==='revision')response.revisionId='foreign-revision';
 if(mutation==='checksum')response.metadata.sourceRevisionChecksumSha256='e'.repeat(64);
 if(mutation==='purpose')(response.metadata as Record<string,unknown>).issuancePurpose='STANDARD';
 if(mutation==='renderer')(response.metadata as Record<string,unknown>).templateVersion='professional-estimate-pdf:1';
 jest.spyOn(client,'getCanonicalEstimateRevision').mockResolvedValue(revision);
 jest.spyOn(client,'getCanonicalEstimateArtifact').mockResolvedValue(response as never);
 const build=jest.spyOn(client,'buildCanonicalEstimateArtifact'),show=jest.spyOn(preview,'prepareAndPreviewPdfDocument');
 await open();expect(build).not.toHaveBeenCalled();expect(show).not.toHaveBeenCalled();expect(action.handleCanonicalArtifactOpenError).toHaveBeenCalledTimes(1);
});
test('saved history review opens exact cached PDF without durable manual approval or ordinary Ready artifact',async()=>{
 const{bundle,revision}=fixture(),{action}=controllerFor(bundle),before=JSON.stringify(bundle.items);
 action.findKnownHistoryBundle=()=>bundle;
 jest.spyOn(client,'getCanonicalEstimateRevision').mockResolvedValue(revision);
 const get=jest.spyOn(client,'getCanonicalEstimateArtifact').mockResolvedValue(cachedReviewResponse(revision) as never),
  build=jest.spyOn(client,'buildCanonicalEstimateArtifact'),show=jest.spyOn(preview,'prepareAndPreviewPdfDocument').mockResolvedValue(undefined as never);
 expect(consumerEstimateManualQuantityApprovalRecord(bundle)).toBeNull();
 await action.completeHistoryPdfOpen(bundle.draft.id);
 expect(get).toHaveBeenCalledWith(expect.objectContaining({revisionId:revision.revisionId,issuancePurpose:'PRELIMINARY_REVIEW'}));
 expect(build).not.toHaveBeenCalled();expect(show).toHaveBeenCalledTimes(1);
 expect(getConsumerRepairRequest(bundle.draft.id).draft.status).toBe('draft');
 expect(consumerEstimateManualQuantityApprovalRecord(getConsumerRepairRequest(bundle.draft.id))).toBeNull();
 expect(JSON.stringify(getConsumerRepairRequest(bundle.draft.id).items)).toBe(before);
 expect(Reflect.get(getConsumerRepairRequest(bundle.draft.id).estimateDraftRevisionState!.revisions.at(-1)!,'pdfArtifactId')).toBeFalsy();
});
test('cold saved PDF review uses fresh read eligibility without quantity edits, recompile or approval',async()=>{
 const{bundle,revision}=fixture(),cold=decodeConsumerRepairBundleFromDurableStorage(JSON.parse(JSON.stringify(
  encodeConsumerRepairBundleForDurableStorage(compactConsumerRepairBundleForDurableStorage(bundle)))))!;
 saveConsumerRepairBundle(cold);
 jest.spyOn(client,'getCanonicalEstimateRevision').mockResolvedValue(revision);
 const load=jest.fn((revisionId:string,requestDraftId:string)=>loadConsumerRepairCanonicalNamingEvidence({
  revisionId,requestDraftId,consumerUserId:cold.draft.consumerUserId,workspaceGenerationRef:{current:0}}));
 const{action,controller}=controllerFor(cold,{onLoadCanonicalNamingEvidence:load});
 await action.hydrateCurrentCanonicalNamingEvidence();
 const get=jest.spyOn(client,'getCanonicalEstimateArtifact').mockResolvedValue(cachedReviewResponse(revision) as never),
  build=jest.spyOn(client,'buildCanonicalEstimateArtifact'),show=jest.spyOn(preview,'prepareAndPreviewPdfDocument').mockResolvedValue(undefined as never);
 await action.completePreliminaryReviewPdfOpen(pdfReviewIdentityForTest(revision));
 expect(get).toHaveBeenCalledWith(expect.objectContaining({issuancePurpose:'PRELIMINARY_REVIEW'}));
 expect(build).not.toHaveBeenCalled();expect(show).toHaveBeenCalledTimes(1);
 expect(action.handleCanonicalArtifactOpenError).not.toHaveBeenCalled();
 expect(controller.props.onPrepareCanonicalEstimate).not.toHaveBeenCalled();expect(controller.props.onRecalculateCanonicalEstimate).not.toHaveBeenCalled();
 expect(consumerEstimateManualQuantityApprovalRecord(getConsumerRepairRequest(cold.draft.id))).toBeNull();
 expect(getConsumerRepairRequest(cold.draft.id).items.map(item=>[item.quantity,item.unitPrice])).toEqual(bundle.items.map(item=>[item.quantity,item.unitPrice]));
});
test('sticky PDF remains available for saved all-unknown data without borrowing manual approval',()=>{
 const open=jest.fn();let view!:TestRenderer.ReactTestRenderer;
 act(()=>{view=TestRenderer.create(React.createElement(ConsumerRepairRequestStickyActions,{approved:false,sent:false,hasBundle:true,hasSnapshot:false,
  pdfSavedSnapshotAvailable:true,operationCompositionDiagnostic:{state:'AVAILABLE',acceptance:evidence.acceptance},
  manualQuantityApprovalAvailable:false,approvalManualUnresolvedRowCount:99,onOpenPdf:jest.fn(),onMakePdf:open,
  onCreateNew:jest.fn(),onDeleteDraft:jest.fn(),onApproveDraft:jest.fn(),onPrepareDraft:jest.fn()}));});
 const button=view.root.findByProps({testID:'consumer-estimate-make-pdf'});expect(button.props.disabled).toBe(false);
 act(()=>button.props.onPress());expect(open).toHaveBeenCalledTimes(1);
 expect(view.root.findAllByProps({testID:'consumer-repair-preliminary-review-confirm'})).toHaveLength(0);act(()=>view.unmount());
});


test.each(['GET','BUILD']as const)('report %s prevents viewer after authoritative target or actor change',async phase=>{
 for(const change of ['revision','user','current-draft','unmount']as const){
  const{bundle,revision}=fixture(),{action}=controllerFor(bundle),response=cachedReviewResponse(revision);
  let finish!:(value:any)=>void;const pending=new Promise<any>(resolve=>{finish=resolve;});
  jest.spyOn(client,'getCanonicalEstimateRevision').mockReturnValue(phase==='GET'?pending:Promise.resolve(revision));
  jest.spyOn(client,'getCanonicalEstimateArtifact').mockRejectedValue(new CanonicalEstimateApiError('missing',{code:'NOT_FOUND',httpStatus:404}));
  const build=jest.spyOn(client,'buildCanonicalEstimateArtifact').mockReturnValue(phase==='BUILD'?pending:Promise.resolve(response as never)),
   show=jest.spyOn(preview,'prepareAndPreviewPdfDocument').mockResolvedValue(undefined as never);
  const opening=action.completePdfOpen();
  for(let n=0;n<20&&phase==='BUILD'&&!build.mock.calls.length;n++)await Promise.resolve();
  if(change==='revision'){
   action.state.bundle=structuredClone(bundle);
   action.state.bundle.structuredEstimatePayload.canonicalBackend.revisionId='new-authoritative-revision';
  }
  if(change==='user')action.props={...action.props,consumerUserId:'another-authenticated-user'};
  if(change==='unmount')action.componentWillUnmount();
  if(change==='current-draft')action.state.bundle={...bundle,draft:{...bundle.draft,id:'another-current-draft'}};
  finish(phase==='GET'?revision:response);await opening;
  expect(show).not.toHaveBeenCalled();expect(action.handleCanonicalArtifactOpenError).toHaveBeenCalledTimes(change==='unmount'?0:1);
  if(phase==='GET')expect(build).not.toHaveBeenCalled();
  jest.restoreAllMocks();
 }
});
test('report descriptor separates authorized viewer from creator and pins actual artifact bytes',async()=>{
 const{bundle,revision}=fixture(),{action}=controllerFor(bundle),response=cachedReviewResponse(revision),
  before=JSON.stringify(getConsumerRepairRequest(bundle.draft.id));
 jest.spyOn(client,'getCanonicalEstimateRevision').mockResolvedValue({...revision,organizationId:'synthetic-organization'});
 jest.spyOn(client,'getCanonicalEstimateArtifact').mockResolvedValue(response as never);
 const save=jest.spyOn(repository,'saveConsumerRepairBundle'),
  show=jest.spyOn(preview,'prepareAndPreviewPdfDocument').mockResolvedValue(undefined as never);
 await action.completePdfOpen();
 expect(show).toHaveBeenCalledWith(expect.objectContaining({descriptor:expect.objectContaining({contentIdentity:expect.objectContaining({
  revisionId:revision.revisionId,releaseId:revision.releaseId,definitionVersionId:revision.definitionVersionId,
  checksumSha256:revision.checksumSha256,issuancePurpose:'PRELIMINARY_REVIEW',artifactSha256:response.sha256,
  ownerUserId:'synthetic-review-owner',viewerUserId:bundle.draft.consumerUserId,organizationId:'synthetic-organization',currency:'KGS',
 })})}));
 expect(save).not.toHaveBeenCalled();expect(JSON.stringify(getConsumerRepairRequest(bundle.draft.id))).toBe(before);
});
test('same revision with a new server diagnostic digest receives a distinct stable report request key',async()=>{
 const{bundle,revision}=fixture(),{action}=controllerFor(bundle);
 jest.spyOn(client,'getCanonicalEstimateRevision').mockResolvedValue(revision);
 jest.spyOn(client,'getCanonicalEstimateArtifact').mockRejectedValue(new CanonicalEstimateApiError('refresh',{code:'ARTIFACT_PRESENTATION_REFRESH_REQUIRED',httpStatus:409}));
 const build=jest.spyOn(client,'buildCanonicalEstimateArtifact').mockRejectedValue(new CanonicalEstimateApiError('stop after key',{code:'FORBIDDEN',httpStatus:403}));
 await action.completePdfOpen();
 const first=build.mock.calls[0][0].idempotencyKey;
 const next:CanonicalEstimateRevisionView={...structuredClone(revision),
  professionalPdfReviewEligibilityV1:{...revision.professionalPdfReviewEligibilityV1!,auditSha256:'9'.repeat(64)}};
 jest.mocked(client.getCanonicalEstimateRevision).mockResolvedValue(next);
 await action.completePdfOpen();await action.completePdfOpen();
 const second=build.mock.calls[1][0].idempotencyKey;
 expect(second).not.toBe(first);expect(second).toBe(build.mock.calls[2][0].idempotencyKey);
 for(const key of [first,second])expect(key!.length).toBeLessThanOrEqual(200);
 expect(build.mock.calls.every(([request])=>request.issuancePurpose==='PRELIMINARY_REVIEW')).toBe(true);
});
test.each(['withdrawn','malformed-composition','condition-unresolved']as const)('authorized readable %s snapshot is reported without granting manual approval',async reason=>{
 const{bundle,revision}=fixture(),{action}=controllerFor(bundle),response=cachedReviewResponse(revision),
  before=JSON.stringify(getConsumerRepairRequest(bundle.draft.id));
 const read=structuredClone(revision);
 if(reason==='withdrawn')read.contentWithdrawalReasonRu='Source withdrawn';
 if(reason==='malformed-composition')read.operationResourceAcceptanceV1={...read.operationResourceAcceptanceV1!,status:'STRUCTURE_INVALID',pdfAllowed:false};
 if(reason==='condition-unresolved')read.manualPreliminaryReviewEligibilityV1={...read.manualPreliminaryReviewEligibilityV1!,eligible:false,status:'BLOCKED',reasonRu:'Condition unresolved'};
 jest.spyOn(client,'getCanonicalEstimateRevision').mockResolvedValue(read);
 jest.spyOn(client,'getCanonicalEstimateArtifact').mockResolvedValue(response as never);
 const show=jest.spyOn(preview,'prepareAndPreviewPdfDocument').mockResolvedValue(undefined as never);
 await action.completePdfOpen();
 expect(show).toHaveBeenCalledTimes(1);expect(JSON.stringify(getConsumerRepairRequest(bundle.draft.id))).toBe(before);
 expect(consumerEstimateManualQuantityApprovalRecord(getConsumerRepairRequest(bundle.draft.id))).toBeNull();
});
test('explicit history target remains exact while another current draft is edited',async()=>{
 const{bundle,revision}=fixture(),{action}=controllerFor(bundle),response=cachedReviewResponse(revision),
  current={...structuredClone(bundle),draft:{...bundle.draft,id:'other-current-draft'}};
 action.state.bundle=current;action.findKnownHistoryBundle=(id:string)=>id===bundle.draft.id?bundle:null;
 jest.spyOn(client,'getCanonicalEstimateRevision').mockResolvedValue(revision);
 jest.spyOn(client,'getCanonicalEstimateArtifact').mockResolvedValue(response as never);
 const show=jest.spyOn(preview,'prepareAndPreviewPdfDocument').mockResolvedValue(undefined as never);
 await action.completeHistoryPdfOpen(bundle.draft.id);
 expect(show).toHaveBeenCalledWith(expect.objectContaining({descriptor:expect.objectContaining({entityId:bundle.draft.id})}));
 expect(action.state.bundle).toBe(current);expect(getConsumerRepairRequest(bundle.draft.id).draft.status).toBe('draft');
});

for(const surface of ['current','history']as const)test.each(['queued','building']as const)
 ('saved '+surface+' report resumes a %s job through the existing wait helper',async status=>{
 const{action,revision,open}=reviewSurface(surface),ready=cachedReviewResponse(revision);
 jest.spyOn(client,'getCanonicalEstimateRevision').mockResolvedValue(revision);
 jest.spyOn(client,'getCanonicalEstimateArtifact').mockResolvedValue({...ready,status,signedUrl:null}as never);
 const build=jest.spyOn(client,'buildCanonicalEstimateArtifact').mockResolvedValue(ready as never),
  show=jest.spyOn(preview,'prepareAndPreviewPdfDocument').mockResolvedValue(undefined as never);
 await open();
 expect(build).toHaveBeenCalledTimes(1);expect(build).toHaveBeenCalledWith(expect.objectContaining({
  revisionId:revision.revisionId,issuancePurpose:'PRELIMINARY_REVIEW',
  idempotencyKey:expect.stringContaining(revision.professionalPdfReviewEligibilityV1!.auditSha256),
 }));
 expect(show).toHaveBeenCalledTimes(1);expect(action.handleCanonicalArtifactOpenError).not.toHaveBeenCalled();
});
test('failed report job is not retried as new, shown as ready, or replaced by STANDARD',async()=>{
 const{action,revision,open}=reviewSurface('current');
 jest.spyOn(client,'getCanonicalEstimateRevision').mockResolvedValue(revision);
 jest.spyOn(client,'getCanonicalEstimateArtifact').mockResolvedValue({...cachedReviewResponse(revision),status:'failed',signedUrl:null}as never);
 const build=jest.spyOn(client,'buildCanonicalEstimateArtifact'),show=jest.spyOn(preview,'prepareAndPreviewPdfDocument');
 await open();expect(build).not.toHaveBeenCalled();expect(show).not.toHaveBeenCalled();
 expect(action.handleCanonicalArtifactOpenError).toHaveBeenCalledTimes(1);
});
test('durable history record without a local row projection reads its own authorized report target',async()=>{
 const{bundle,revision}=fixture(),{action}=controllerFor(bundle),targetId='durable-history-only';
 action.findKnownHistoryBundle=()=>null;
 action.findKnownHistoryRecord=(id:string)=>id===targetId?{sourceRevisionId:revision.revisionId,sourceReleaseId:revision.releaseId}:null;
 const read=jest.spyOn(client,'getCanonicalEstimateRevision').mockResolvedValue(revision);
 jest.spyOn(client,'getCanonicalEstimateArtifact').mockResolvedValue(cachedReviewResponse(revision)as never);
 const show=jest.spyOn(preview,'prepareAndPreviewPdfDocument').mockResolvedValue(undefined as never);
 await action.completeHistoryPdfOpen(targetId);
 expect(read).toHaveBeenCalledWith(revision.revisionId,{issuancePurpose:'PRELIMINARY_REVIEW'});
 expect(show).toHaveBeenCalledWith(expect.objectContaining({descriptor:expect.objectContaining({entityId:targetId})}));
 expect(action.state.bundle).toBe(bundle);expect(consumerEstimateManualQuantityApprovalRecord(bundle)).toBeNull();
});
test.each(['revision','release','definition','checksum','blocked-read']as const)
 ('report fresh server %s mismatch never reaches artifact creation',async mutation=>{
 const{bundle,revision}=fixture(),{action}=controllerFor(bundle),read=structuredClone(revision);
 if(mutation==='revision')read.revisionId='foreign';
 if(mutation==='release')read.releaseId='foreign';
 if(mutation==='definition')read.definitionVersionId='foreign';
 if(mutation==='checksum')read.checksumSha256='1'.repeat(64);
 if(mutation==='blocked-read')read.professionalPdfReviewEligibilityV1={...read.professionalPdfReviewEligibilityV1!,eligible:false,status:'BLOCKED'};
 jest.spyOn(client,'getCanonicalEstimateRevision').mockResolvedValue(read);
 const get=jest.spyOn(client,'getCanonicalEstimateArtifact'),build=jest.spyOn(client,'buildCanonicalEstimateArtifact'),
  show=jest.spyOn(preview,'prepareAndPreviewPdfDocument');
 await action.completePdfOpen();
 expect(get).not.toHaveBeenCalled();expect(build).not.toHaveBeenCalled();expect(show).not.toHaveBeenCalled();
 expect(action.handleCanonicalArtifactOpenError).toHaveBeenCalledTimes(1);
});

test('target change while artifact GET is pending prevents refresh POST and viewer',async()=>{
 const{bundle,revision}=fixture(),{action}=controllerFor(bundle);
 jest.spyOn(client,'getCanonicalEstimateRevision').mockResolvedValue(revision);
 let deny!:(error:unknown)=>void;
 const get=jest.spyOn(client,'getCanonicalEstimateArtifact').mockImplementation(()=>new Promise((_resolve,reject)=>{deny=reject;})),
  build=jest.spyOn(client,'buildCanonicalEstimateArtifact'),show=jest.spyOn(preview,'prepareAndPreviewPdfDocument');
 const reading=action.completePdfOpen();
 for(let n=0;n<20&&!get.mock.calls.length;n++)await Promise.resolve();
 action.state.bundle=structuredClone(bundle);action.state.bundle.structuredEstimatePayload.canonicalBackend.revisionId='another-saved-revision';
 deny(new CanonicalEstimateApiError('refresh',{code:'ARTIFACT_PRESENTATION_REFRESH_REQUIRED',httpStatus:409}));await reading;
 expect(build).not.toHaveBeenCalled();expect(show).not.toHaveBeenCalled();expect(action.handleCanonicalArtifactOpenError).toHaveBeenCalledTimes(1);
});


test.each(['canonical','generic-local-model','missing-source-bindings']as const)
 ('saved report %s survives real durable compaction and repository reload before naming hydration',async shape=>{
 const{bundle,revision}=fixture();await flushTransactionalConsumerRepairWrites();
 const input=structuredClone(bundle),state=input.estimateDraftRevisionState!,current=state.revisions.find(r=>r.revisionId===state.currentRevisionId)!;
 if(shape!=='canonical'){
  const localRevisionId='local-calculation-revision';state.currentRevisionId=localRevisionId;current.revisionId=localRevisionId;
  current.resolvedIdentity!.canonicalModelId='local-calculation-model';
  current.resolvedIdentity!.calculationStrategyId='local-calculation';
  current.resolvedIdentity!.canonicalModelVersion='local-model-version';
 }
 if(shape==='missing-source-bindings')delete(current.resolvedIdentity as any).sourceBindingVersions;
 const compact=compactConsumerRepairBundleForDurableStorage(input),
  cold=decodeConsumerRepairBundleFromDurableStorage(JSON.parse(JSON.stringify(encodeConsumerRepairBundleForDurableStorage(compact))))!;
 expect(cold.structuredEstimatePayload).toBeNull();expect(cold.canonicalBackendApprovalEvidence).toBeFalsy();
 const durable=new InMemoryEstimateRevisionDurableStore();
 expect((await durable.writeBundleAtomically(cold.draft.id,null,cold)).status).toBe('WRITTEN');
 repository.setConsumerRepairTransactionalDurableStoreForTests(durable);
 repository.simulateConsumerRepairRequestStoreReloadForTests();
 await repository.hydrateTransactionalConsumerRepairRequestStore(cold.draft.id);
 const hydrated=repository.getConsumerRepairBundle(cold.draft.id),before=JSON.stringify(hydrated),{action}=controllerFor(hydrated);
 expect(consumerEstimateSavedReportBinding(hydrated)).toMatchObject({revisionId:revision.revisionId,releaseId:revision.releaseId});
 const read=jest.spyOn(client,'getCanonicalEstimateRevision').mockResolvedValue(revision),
  save=jest.spyOn(repository,'saveConsumerRepairBundle'),
  naming=jest.spyOn(action,'hydrateCurrentCanonicalNamingEvidence'),
  show=jest.spyOn(preview,'prepareAndPreviewPdfDocument').mockResolvedValue(undefined as never);
 jest.spyOn(client,'getCanonicalEstimateArtifact').mockResolvedValue(cachedReviewResponse(revision)as never);
 await action.completePdfOpen();
 expect(read).toHaveBeenCalledWith(revision.revisionId,{issuancePurpose:'PRELIMINARY_REVIEW'});
 expect(naming).not.toHaveBeenCalled();expect(save).not.toHaveBeenCalled();expect(show).toHaveBeenCalledTimes(1);
 expect(action.handleCanonicalArtifactOpenError).not.toHaveBeenCalled();
 expect(JSON.stringify(repository.getConsumerRepairBundle(cold.draft.id))).toBe(before);
});

test.each(['conflicting-row-tuples','conflicting-canonical-projection']as const)
 ('saved report rejects %s after cold compaction without selecting the first source',async conflict=>{
 const{bundle}=fixture(),cold=compactConsumerRepairBundleForDurableStorage(bundle);
 if(conflict==='conflicting-row-tuples')cold.items[1]!.sourceParameters!.canonicalBackendRevisionId='different-saved-revision';
 else cold.estimateDraftRevisionState!.revisions.at(-1)!.resolvedIdentity!.canonicalModelVersion='different-saved-release';
 expect(consumerEstimateSavedReportBinding(cold)).toBeNull();
 const{action}=controllerFor(cold),read=jest.spyOn(client,'getCanonicalEstimateRevision'),
  show=jest.spyOn(preview,'prepareAndPreviewPdfDocument');
 await action.completePdfOpen();expect(read).not.toHaveBeenCalled();expect(show).not.toHaveBeenCalled();
 expect(action.handleCanonicalArtifactOpenError).toHaveBeenCalledTimes(1);
});


test('caught saved report failure emits release-safe stage codes without error content or saved identities',async()=>{
 const{bundle}=fixture(),{action}=controllerFor(bundle),
  report=jest.spyOn(logger,'releaseEvidence').mockImplementation(()=>undefined),
  privateMessage='TEST_ONLY_PRIVATE_ERROR_MESSAGE_DO_NOT_EMIT';
 jest.spyOn(client,'getCanonicalEstimateRevision').mockRejectedValue(new TypeError(privateMessage));
 await action.completePdfOpen();
 const events=report.mock.calls.filter(([tag])=>tag==='RikEstimatePdfOpen');
 expect(events).toEqual([['RikEstimatePdfOpen','SAVED_REPORT_OPEN_FAILED',{
  stage:'revision_read',errorType:'type_error',code:'SAVED_REPORT_OPEN_FAILED',
 }]]);
 expect(JSON.stringify(events)).not.toContain(privateMessage);expect(JSON.stringify(events)).not.toContain(bundle.draft.id);
 expect(JSON.stringify(events)).not.toContain(bundle.draft.consumerUserId);
 expect(action.handleCanonicalArtifactOpenError).toHaveBeenCalledTimes(1);
});


test('malformed optional local calculation entry cannot hide coherent saved backend rows',()=>{
 const{bundle,revision}=fixture(),cold=compactConsumerRepairBundleForDurableStorage(bundle);
 (cold.estimateDraftRevisionState!.revisions as any[]).unshift(null);
 const before=JSON.stringify(cold);
 expect(consumerEstimateSavedReportBinding(cold)).toMatchObject({revisionId:revision.revisionId,releaseId:revision.releaseId});
 expect(JSON.stringify(cold)).toBe(before);
});
