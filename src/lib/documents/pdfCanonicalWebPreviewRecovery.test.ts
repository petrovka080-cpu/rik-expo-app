import {createHash,webcrypto} from 'node:crypto';
import {Blob as NodeBlob} from 'node:buffer';
import {MessageChannel,receiveMessageOnPort} from 'node:worker_threads';
import {IDBFactory} from 'fake-indexeddb';
import {createPdfDocumentViewerHref} from './pdfDocumentViewerEntry';
import {resolvePdfViewerRouteModel} from '../pdf/pdfViewer.route';
import {Platform} from 'react-native';
import {createPdfDocumentDescriptor,canonicalPdfRecoveryReferenceFromDescriptor,parseCanonicalPdfRecoveryReference,type CanonicalPdfRecoveryReference} from './pdfDocument';
import {clearDocumentSessions,createPreparingDocumentPreviewSession,materializeDocumentPreviewSessionAsset,getDocumentSessionSnapshot,touchDocumentSession} from './pdfDocumentSessions';
import {__resetWebPdfPreviewCacheForTests,restoreWebPdfPreviewSession,restoreWebPdfPreviewSessionDetailed} from './pdfWebPreviewCache';
import {recoverCanonicalPdfViewerSession} from './pdfCanonicalWebPreviewPersistence';
import {buildCanonicalArtifactMetadata,canonicalArtifactPreliminaryNeeds,type CanonicalArtifactRevision} from '../estimate/backendPlatform/canonicalEstimateArtifactContract';
import {canonicalEstimateStableJson} from '../estimate/backendPlatform/canonicalEstimateDeterminism';
import {canonicalProfessionalPdfReviewEligibilityV1,canonicalProfessionalPdfReviewAcknowledgmentV1} from '../estimate/backendPlatform/canonicalEstimateSavedOperationAcceptanceV1';
import {canonicalPublicSavedResourceRowKindV1} from '../estimate/backendPlatform/canonicalPublicResourcePresentationV1';
import {CANONICAL_PROFESSIONAL_PDF_GENERATOR_VERSION as renderer} from '../estimate/backendPlatform/canonicalProfessionalPdf';
import {ESTIMATE_PLATFORM_API_VERSION,CanonicalEstimateApiError,type CanonicalEstimateRevisionView,type CanonicalEstimateArtifactView,type CanonicalProfessionalPdfIssuancePurpose,type CanonicalProfessionalPdfReviewAcknowledgmentV1} from '../estimate/backendPlatform/contracts';
const mockAuth=jest.fn(),mockRevision=jest.fn(),mockArtifact=jest.fn(),mockBuild=jest.fn();
jest.mock('expo-router',()=>({router:{push:jest.fn()}}));
jest.mock('../supabaseClient',()=>({getSessionSafe:(...args:unknown[])=>mockAuth(...args)}));
jest.mock('../estimate/backendPlatform/canonicalEstimateClient',()=>({
 ...jest.requireActual<typeof import('../estimate/backendPlatform/canonicalEstimateClient')>('../estimate/backendPlatform/canonicalEstimateClient'),
 getCanonicalEstimateRevision:(...args:unknown[])=>mockRevision(...args),
 getCanonicalEstimateArtifact:(...args:unknown[])=>mockArtifact(...args),
 buildCanonicalEstimateArtifact:(...args:unknown[])=>mockBuild(...args),
}));

describe('canonical PDF exact saved recovery with real registry, IDB and artifact identity',()=>{
 const original={clone:globalThis.structuredClone,Blob:globalThis.Blob,crypto:globalThis.crypto,os:Platform.OS,
  document:globalThis.document,indexedDB:globalThis.indexedDB,fetch:globalThis.fetch,sessionStorage:globalThis.sessionStorage,
  create:URL.createObjectURL,revoke:URL.revokeObjectURL};
 const storage=new Map<string,string>(),downloads=new Map<string,string>();
 const body='%PDF-1.7\nTEST_ONLY_SAVED_EXACT_BYTES';
 const digest=(bytes:string)=>createHash('sha256').update(bytes).digest('hex');
 let revision:CanonicalEstimateRevisionView,currentArtifact:CanonicalEstimateArtifactView,objectSeq=0;
 function savedRevision():CanonicalEstimateRevisionView{
  const tuple={revisionId:'TEST_ONLY_SELECTED_OLDER_REVISION',releaseId:'TEST_ONLY_RELEASE',definitionVersionId:'TEST_ONLY_DEFINITION',checksumSha256:'a'.repeat(64)};
  return{apiVersion:ESTIMATE_PLATFORM_API_VERSION,...tuple,parentRevisionId:null,organizationId:'TEST_ONLY_COMPANY',catalogId:'TEST_ONLY_CATALOG',
   revisionNumber:1,status:'ready',currencyCode:'KGS',parameters:{},totals:{},rowCount:1,compilerVersion:'TEST_ONLY_COMPILER',
   amendmentContract:{rowOverrides:{},customRows:[],releaseMigration:null},createdAt:'2026-10-29T00:00:00Z',
   professionalPdfReviewEligibilityV1:{contractVersion:'canonical-professional-pdf-review-eligibility/v1',...tuple,eligible:true,status:'ELIGIBLE',
    unknownQuantityCount:3,auditSha256:'d'.repeat(64),reasonRu:'Сохранённый снимок читаем.'}};
 }
 function artifact(r=revision,purpose:CanonicalProfessionalPdfIssuancePurpose='PRELIMINARY_REVIEW',bytes=body):CanonicalEstimateArtifactView{
  const ack:CanonicalProfessionalPdfReviewAcknowledgmentV1={contractVersion:'canonical-professional-pdf-review-ack/v1',issuancePurpose:'PRELIMINARY_REVIEW',
   revisionId:r.revisionId,releaseId:r.releaseId,definitionVersionId:r.definitionVersionId!,checksumSha256:r.checksumSha256,
   acknowledgedPreliminaryReview:true,actorUserId:'TEST_ONLY_VIEWER',acknowledgedAt:'2026-10-30T00:00:00Z',
   unknownQuantityCount:r.professionalPdfReviewEligibilityV1!.unknownQuantityCount,auditSha256:r.professionalPdfReviewEligibilityV1!.auditSha256};
  const hash=digest(bytes),signedUrl='https://example.test/artifact-'+hash+'.pdf';downloads.set(signedUrl,bytes);
  return{apiVersion:ESTIMATE_PLATFORM_API_VERSION,artifactId:'TEST_ONLY_ARTIFACT',revisionId:r.revisionId,releaseId:r.releaseId,kind:'pdf',status:'ready',
   contentType:'application/pdf',byteSize:new NodeBlob([bytes]).size,sha256:hash,
   metadata:buildCanonicalArtifactMetadata({operation:'professional_pdf',renderer,
    revision:{id:r.revisionId,release_id:r.releaseId,catalog_id:r.catalogId,definition_version_id:r.definitionVersionId,
     checksum_sha256:r.checksumSha256,row_count:r.rowCount,owner_user_id:'TEST_ONLY_CREATOR',organization_id:r.organizationId},
    sourceRowCount:r.rowCount,projectedRowCount:1,selectedProcurementRowCount:0,definitionVersionId:r.definitionVersionId,
    pageCount:1,grandTotalStatus:'PARTIAL_NEEDS_PRICE',issuancePurpose:purpose,...(purpose==='PRELIMINARY_REVIEW'?{reviewAcknowledgmentV1:ack}:{})}),
   errorCode:null,createdAt:r.createdAt,updatedAt:r.createdAt,readyAt:r.createdAt,signedUrl,signedUrlExpiresAt:'2030-01-01T00:00:00Z'};
 }
 function reference(purpose:CanonicalProfessionalPdfIssuancePurpose='PRELIMINARY_REVIEW'):CanonicalPdfRecoveryReference{
  return{contractVersion:'canonical-pdf-recovery/v1',revisionId:revision.revisionId,releaseId:revision.releaseId,
   definitionVersionId:revision.definitionVersionId!,checksumSha256:revision.checksumSha256,documentProfile:'professional_v1',
   issuancePurpose:purpose,organizationId:revision.organizationId};
 }
 async function settle(){for(let i=0;i<6;i++)await new Promise<void>(resolve=>setImmediate(resolve));}
 async function seed(options:{rendererVersion?:string;bytes?:string;revisionId?:string;purpose?:CanonicalProfessionalPdfIssuancePurpose}={}){
  const bytes=options.bytes??body,uri='https://example.test/seed-'+(options.revisionId??revision.revisionId)+'-'+digest(bytes)+'.pdf';
  downloads.set(uri,bytes);
  const doc=createPdfDocumentDescriptor({uri,title:'Проверочный сохранённый документ',fileName:'test-only.pdf',documentType:'request',
   source:'generated',originModule:'reports',contentIdentity:{revisionId:options.revisionId??revision.revisionId,releaseId:revision.releaseId,
    definitionVersionId:revision.definitionVersionId!,checksumSha256:revision.checksumSha256,issuancePurpose:options.purpose??'PRELIMINARY_REVIEW',
    ownerUserId:'TEST_ONLY_CREATOR',viewerUserId:'TEST_ONLY_VIEWER',organizationId:revision.organizationId??undefined,
    artifactSha256:digest(bytes),rendererVersion:options.rendererVersion??renderer,currency:revision.currencyCode}});
  const pending=createPreparingDocumentPreviewSession(doc);
  await materializeDocumentPreviewSessionAsset(pending.session.sessionId,doc,pending.session.preparationToken);
  await settle();return{doc,sessionId:pending.session.sessionId};
 }
 beforeEach(()=>{
  Object.defineProperty(globalThis,'Blob',{configurable:true,value:NodeBlob});
  Object.defineProperty(globalThis,'crypto',{configurable:true,value:webcrypto});
  Object.defineProperty(globalThis,'structuredClone',{configurable:true,value:<T,>(value:T):T=>{
   const channel=new MessageChannel();try{channel.port1.postMessage(value);const received=receiveMessageOnPort(channel.port2);
    if(!received)throw new Error('TEST_ONLY_CLONE_NOT_DELIVERED');return received.message as T;
   }finally{channel.port1.close();channel.port2.close();}
  }});
  Object.defineProperty(Platform,'OS',{configurable:true,value:'web'});
  Object.defineProperty(globalThis,'document',{configurable:true,value:{}});
  Object.defineProperty(globalThis,'indexedDB',{configurable:true,value:new IDBFactory()});
  Object.defineProperty(globalThis,'sessionStorage',{configurable:true,value:{getItem:(key:string)=>storage.get(key)??null,setItem:(key:string,value:string)=>storage.set(key,value),removeItem:(key:string)=>storage.delete(key)}});
  Object.defineProperty(URL,'createObjectURL',{configurable:true,value:jest.fn(()=>'blob:test-only-'+(++objectSeq))});
  Object.defineProperty(URL,'revokeObjectURL',{configurable:true,value:jest.fn()});
  Object.defineProperty(globalThis,'fetch',{configurable:true,value:jest.fn(async(uri:unknown)=>{
   const bytes=downloads.get(String(uri));if(bytes===undefined)throw new Error('TEST_ONLY_UNEXPECTED_DOWNLOAD');
   return{ok:true,status:200,blob:async()=>new Blob([bytes],{type:'application/pdf'})};
  })});
  mockAuth.mockReset().mockResolvedValue({degraded:false,session:{user:{id:'TEST_ONLY_VIEWER'}}});
  revision=savedRevision();currentArtifact=artifact();
  mockRevision.mockReset().mockImplementation(async()=>revision);
  mockArtifact.mockReset().mockImplementation(async()=>currentArtifact);
  mockBuild.mockReset().mockImplementation(async()=>currentArtifact);
 });
 afterEach(async()=>{
  jest.useRealTimers();clearDocumentSessions();await __resetWebPdfPreviewCacheForTests();storage.clear();downloads.clear();
  Object.defineProperty(Platform,'OS',{configurable:true,value:original.os});
  Object.defineProperty(globalThis,'structuredClone',{configurable:true,value:original.clone});
  Object.defineProperty(globalThis,'Blob',{configurable:true,value:original.Blob});
  Object.defineProperty(globalThis,'crypto',{configurable:true,value:original.crypto});
  for(const key of ['document','indexedDB','fetch','sessionStorage'] as const)Object.defineProperty(globalThis,key,{configurable:true,value:original[key]});
  Object.defineProperty(URL,'createObjectURL',{configurable:true,value:original.create});
  Object.defineProperty(URL,'revokeObjectURL',{configurable:true,value:original.revoke});jest.restoreAllMocks();
 });
 it('requires fresh server authority before restoring exact cached bytes after memory loss',async()=>{
  const saved=await seed();clearDocumentSessions();
  const untrusted=await restoreWebPdfPreviewSessionDetailed(saved.sessionId);
  expect(untrusted).toMatchObject({restored:false,reason:'CANONICAL_AUTHORIZATION_REQUIRED',canonicalRecovery:reference()});
  expect(await restoreWebPdfPreviewSession(saved.sessionId)).toBe(false);expect(URL.createObjectURL).not.toHaveBeenCalled();
  const href=createPdfDocumentViewerHref(saved.sessionId,undefined,'/request',undefined,canonicalPdfRecoveryReferenceFromDescriptor(saved.doc)).href;
  const query=new URLSearchParams(String(href).split('?')[1]),route=resolvePdfViewerRouteModel({sessionId:query.get('sessionId')??undefined,canonicalRecovery:query.get('canonicalRecovery')??undefined});
  expect(route.openToken).toBe('');
  expect(await recoverCanonicalPdfViewerSession({sessionId:route.sessionId,reference:route.canonicalRecovery}))
   .toEqual({recovered:true,via:'AUTHORIZED_CACHE'});
  expect(mockRevision).toHaveBeenCalledWith(revision.revisionId,{issuancePurpose:'PRELIMINARY_REVIEW'});
  expect(mockArtifact).toHaveBeenCalledWith(expect.objectContaining({revisionId:revision.revisionId,issuancePurpose:'PRELIMINARY_REVIEW'}));
  expect(mockBuild).not.toHaveBeenCalled();expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  expect(getDocumentSessionSnapshot(saved.sessionId).asset?.contentIdentity).toMatchObject({revisionId:revision.revisionId,
   checksumSha256:revision.checksumSha256,rendererVersion:renderer,artifactSha256:currentArtifact.sha256,viewerUserId:'TEST_ONLY_VIEWER',ownerUserId:'TEST_ONLY_CREATOR'});
 });
 it.each([20*60*1000,20*60*1000+1])('keeps exact selected history through the bounded %s ms cache boundary and memory touches',async offset=>{
  const now=Date.parse('2026-10-30T00:00:00Z');
  jest.useFakeTimers({now,doNotFake:['nextTick','setImmediate','clearImmediate','setTimeout','clearTimeout','setInterval','clearInterval','queueMicrotask','performance']});
  const saved=await seed();jest.setSystemTime(now+19*60*1000);touchDocumentSession(saved.sessionId);
  clearDocumentSessions();jest.setSystemTime(now+offset);
  const result=await recoverCanonicalPdfViewerSession({sessionId:saved.sessionId,reference:reference()});
  expect(result).toEqual({recovered:true,via:offset===20*60*1000?'AUTHORIZED_CACHE':'FRESH_SAVED_ARTIFACT'});
  expect(mockRevision.mock.calls.every(call=>call[0]===revision.revisionId)).toBe(true);
  expect(getDocumentSessionSnapshot(saved.sessionId).asset?.contentIdentity?.revisionId).toBe('TEST_ONLY_SELECTED_OLDER_REVISION');
 });
 it('recovers the requested saved version after the existing 40-session pruning policy',async()=>{
  const now=Date.parse('2026-10-30T00:00:00Z');
  jest.useFakeTimers({now,doNotFake:['nextTick','setImmediate','clearImmediate','setTimeout','clearTimeout','setInterval','clearInterval','queueMicrotask','performance']});
  const selected=await seed();
  for(let i=0;i<40;i++){jest.setSystemTime(now+(i+1)*1000);await seed({revisionId:'TEST_ONLY_OTHER_REVISION_'+i});}
  clearDocumentSessions();
  expect(await restoreWebPdfPreviewSessionDetailed(selected.sessionId)).toMatchObject({restored:false,reason:'MISSING_SESSION'});
  expect(await recoverCanonicalPdfViewerSession({sessionId:selected.sessionId,reference:reference()})).toEqual({recovered:true,via:'FRESH_SAVED_ARTIFACT'});
  expect(mockRevision).toHaveBeenCalledTimes(1);expect(mockRevision.mock.calls[0][0]).toBe(revision.revisionId);
 });
 it.each(['renderer','file'])('does not expose cached old %s bytes as current output',async changed=>{
  const saved=await seed({rendererVersion:changed==='renderer'?'TEST_ONLY_OLD_RENDERER':renderer,bytes:'%PDF-1.7 TEST_ONLY_OLD_BYTES'});
  clearDocumentSessions();
  expect(await recoverCanonicalPdfViewerSession({sessionId:saved.sessionId,reference:reference()})).toEqual({recovered:true,via:'FRESH_SAVED_ARTIFACT'});
  expect(URL.createObjectURL).not.toHaveBeenCalled();
  expect(getDocumentSessionSnapshot(saved.sessionId).asset).toMatchObject({uri:currentArtifact.signedUrl,
   contentIdentity:{rendererVersion:renderer,artifactSha256:currentArtifact.sha256}});
 });
 it('restores a genuine six-null raw report with three PROCESS_NOTE rows and three physical unknowns',async()=>{
  const rawNeeds=Array.from({length:6},(_,index)=>{
   const note=index>=3,title=note?'Проверка основания '+index:'Материал основания '+index;
   const basis={row_id:'TEST_ONLY_RAW_NEED_'+index,ordinal:index,resource_spec_id:'TEST_ONLY_SPEC_'+index,
    section:note?'Проверки':'Материалы',category:note?'other':'material',title_ru:title,unit_id:note?'':'m',
    quantity:null,unit_price:null,need_state:'QUANTITY_REQUIRED',missing_parameter_ids:['TEST_ONLY_PARAMETER_'+index],
    selected:false,procurement_eligible:false,formula_id:'TEST_ONLY_FORMULA_'+index,
    calculation_trace:{preliminaryNeed:true,needState:'QUANTITY_REQUIRED',resourceGraph:{
     costTreatment:note?'INFORMATIONAL_SCOPE':'OWN_COST',
     publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:title,nameRu:title,
      brandAndModelRu:null,specificationRu:null,detailsRu:[],...(note?{rowKind:'PROCESS_NOTE'}:{resourceKind:'MATERIAL'})}}}};
   return{...basis,need_sha256:createHash('sha256').update(canonicalEstimateStableJson(basis)).digest('hex')};
  });
  const storage:CanonicalArtifactRevision={id:revision.revisionId,release_id:revision.releaseId,
   definition_version_id:revision.definitionVersionId,catalog_id:revision.catalogId,checksum_sha256:revision.checksumSha256,
   row_count:0,currency_code:revision.currencyCode,definition_withdrawal_reason:null,input_parameters:{},
   amendment_contract:{parameterSources:{preliminaryNeeds:rawNeeds}}};
  const resources=canonicalArtifactPreliminaryNeeds(storage,{issuancePurpose:'PRELIMINARY_REVIEW'});
  const eligibility=canonicalProfessionalPdfReviewEligibilityV1({revision:storage,resources});
  const acknowledgment=canonicalProfessionalPdfReviewAcknowledgmentV1({revision:storage,resources,
   request:{revisionId:revision.revisionId,releaseId:revision.releaseId,definitionVersionId:revision.definitionVersionId,
    checksumSha256:revision.checksumSha256,acknowledgedPreliminaryReview:true},
   actorUserId:'TEST_ONLY_VIEWER',acknowledgedAt:'2026-10-30T00:00:00Z'});
  expect(resources).toHaveLength(6);expect(resources.every(row=>row.quantity===null)).toBe(true);
  expect(resources.filter(row=>canonicalPublicSavedResourceRowKindV1(row)==='PROCESS_NOTE')).toHaveLength(3);
  expect(resources.filter(row=>canonicalPublicSavedResourceRowKindV1(row)==='RESOURCE')).toHaveLength(3);
  expect(eligibility).toMatchObject({eligible:true,status:'ELIGIBLE',unknownQuantityCount:3});
  expect(acknowledgment.unknownQuantityCount).toBe(6);
  expect(acknowledgment.auditSha256).toBe(eligibility.auditSha256);
  revision={...revision,rowCount:0,professionalPdfReviewEligibilityV1:eligibility};
  currentArtifact=artifact();
  currentArtifact={...currentArtifact,metadata:{...currentArtifact.metadata,projectedRowCount:6,reviewAcknowledgmentV1:acknowledgment}};
  const before=JSON.stringify({storage,resources,eligibility,acknowledgment});
  const saved=await seed();clearDocumentSessions();
  expect(await recoverCanonicalPdfViewerSession({sessionId:saved.sessionId,reference:reference()}))
   .toEqual({recovered:true,via:'AUTHORIZED_CACHE'});
  expect(mockRevision).toHaveBeenCalledWith(revision.revisionId,{issuancePurpose:'PRELIMINARY_REVIEW'});
  expect(mockBuild).not.toHaveBeenCalled();
  expect(getDocumentSessionSnapshot(saved.sessionId).asset?.contentIdentity).toMatchObject({
   revisionId:revision.revisionId,checksumSha256:revision.checksumSha256,artifactSha256:currentArtifact.sha256});
  expect(JSON.stringify({storage,resources,eligibility,acknowledgment})).toBe(before);
 });
 it('uses only the existing explicit refresh path and stable fresh diagnostic request key',async()=>{
  const saved=await seed();clearDocumentSessions();
  revision={...revision,professionalPdfReviewEligibilityV1:{...revision.professionalPdfReviewEligibilityV1!,auditSha256:'e'.repeat(64)}};
  currentArtifact=artifact(revision,'PRELIMINARY_REVIEW','%PDF-1.7 TEST_ONLY_NEW_DIAGNOSTIC');
  mockArtifact.mockRejectedValueOnce(new CanonicalEstimateApiError('Обновить представление',{code:'ARTIFACT_PRESENTATION_REFRESH_REQUIRED',httpStatus:409}));
  expect(await recoverCanonicalPdfViewerSession({sessionId:saved.sessionId,reference:reference()})).toEqual({recovered:true,via:'FRESH_SAVED_ARTIFACT'});
  expect(mockBuild).toHaveBeenCalledTimes(1);
  expect(mockBuild.mock.calls[0][0]).toMatchObject({revisionId:revision.revisionId,issuancePurpose:'PRELIMINARY_REVIEW',
   idempotencyKey:'consumer-report-'+renderer+'-'+revision.revisionId+'-'+'e'.repeat(64)});
 });
 it('resumes the same queued report using the existing build/wait surface',async()=>{
  mockArtifact.mockResolvedValueOnce({...currentArtifact,status:'queued',signedUrl:null});
  expect(await recoverCanonicalPdfViewerSession({sessionId:'TEST_ONLY_MISSING_SESSION',reference:reference()})).toEqual({recovered:true,via:'FRESH_SAVED_ARTIFACT'});
  expect(mockBuild).toHaveBeenCalledTimes(1);expect(mockBuild.mock.calls[0][0].revisionId).toBe(revision.revisionId);
 });
 it.each(['revisionId','releaseId','definitionVersionId','checksumSha256','organizationId'] as const)('refuses a fresh %s mismatch without another document',async key=>{
  const ref=reference(),wrong={...revision,[key]:key==='checksumSha256'?'f'.repeat(64):'TEST_ONLY_FOREIGN'};
  mockRevision.mockResolvedValueOnce(wrong);
  expect(await recoverCanonicalPdfViewerSession({sessionId:'TEST_ONLY_MISSING_SESSION',reference:ref})).toEqual({recovered:false,reason:'IDENTITY_MISMATCH'});
  expect(mockArtifact).not.toHaveBeenCalled();expect(mockBuild).not.toHaveBeenCalled();expect(globalThis.fetch).not.toHaveBeenCalled();
 });
 it('rejects a locator conflicting with the actual cached session instead of replacing it',async()=>{
  const saved=await seed();clearDocumentSessions();const ref={...reference(),revisionId:'TEST_ONLY_NEIGHBOR'};
  mockRevision.mockResolvedValueOnce({...revision,revisionId:ref.revisionId,
   professionalPdfReviewEligibilityV1:{...revision.professionalPdfReviewEligibilityV1!,revisionId:ref.revisionId}});
  const foreignRevision={...revision,revisionId:ref.revisionId,professionalPdfReviewEligibilityV1:{...revision.professionalPdfReviewEligibilityV1!,revisionId:ref.revisionId}};
  currentArtifact=artifact(foreignRevision);
  expect(await recoverCanonicalPdfViewerSession({sessionId:saved.sessionId,reference:ref})).toEqual({recovered:false,reason:'IDENTITY_MISMATCH'});
  expect(URL.createObjectURL).not.toHaveBeenCalled();expect(getDocumentSessionSnapshot(saved.sessionId).session).toBeNull();
 });
 it.each(['FORBIDDEN','ARTIFACT_PURPOSE_CONFLICT','NETWORK_FAILURE'])('does not build or fall back after %s',async code=>{
  mockArtifact.mockRejectedValueOnce(new CanonicalEstimateApiError('Нет доступа',{code,httpStatus:code==='FORBIDDEN'?403:409}));
  expect((await recoverCanonicalPdfViewerSession({sessionId:'TEST_ONLY_MISSING_SESSION',reference:reference()})).recovered).toBe(false);
  expect(mockBuild).not.toHaveBeenCalled();expect(globalThis.fetch).not.toHaveBeenCalled();expect(URL.createObjectURL).not.toHaveBeenCalled();
 });
 it.each(['degraded','switch-during-revision','switch-during-artifact','cancel'])('stays closed across %s authorization boundary',async boundary=>{
  let current=true;
  if(boundary==='degraded')mockAuth.mockResolvedValue({degraded:true,session:{user:{id:'TEST_ONLY_VIEWER'}}});
  if(boundary==='switch-during-revision')mockRevision.mockImplementationOnce(async()=>{
   mockAuth.mockResolvedValue({degraded:false,session:{user:{id:'TEST_ONLY_OTHER_VIEWER'}}});return revision;});
  if(boundary==='switch-during-artifact')mockArtifact.mockImplementationOnce(async()=>{
   mockAuth.mockResolvedValue({degraded:false,session:{user:{id:'TEST_ONLY_OTHER_VIEWER'}}});return currentArtifact;});
  if(boundary==='cancel')mockArtifact.mockImplementationOnce(async()=>{current=false;return currentArtifact;});
  const result=await recoverCanonicalPdfViewerSession({sessionId:'TEST_ONLY_MISSING_SESSION',reference:reference(),
   assertCurrent:()=>{if(!current)throw Object.assign(new Error('TEST_ONLY_CANCELLED'),{name:'AbortError'});}});
  expect(result.recovered).toBe(false);expect(getDocumentSessionSnapshot('TEST_ONLY_MISSING_SESSION').session).toBeNull();
  expect(globalThis.fetch).not.toHaveBeenCalled();expect(URL.createObjectURL).not.toHaveBeenCalled();
 });
 it('allows readable withdrawn preliminary reports but grants no STANDARD fallback or approval',async()=>{
  revision={...revision,contentWithdrawalReasonRu:'TEST_ONLY_WITHDRAWN_SOURCE'};currentArtifact=artifact();
  expect(await recoverCanonicalPdfViewerSession({sessionId:'TEST_ONLY_WITHDRAWN_PREVIEW',reference:reference()})).toMatchObject({recovered:true});
  expect(mockArtifact.mock.calls[0][0].issuancePurpose).toBe('PRELIMINARY_REVIEW');expect(mockBuild).not.toHaveBeenCalled();
  const strictRef=reference('STANDARD');mockArtifact.mockRejectedValueOnce(new CanonicalEstimateApiError('Нет документа',{code:'NOT_FOUND',httpStatus:404}));
  mockBuild.mockRejectedValueOnce(new CanonicalEstimateApiError('Строгий допуск остановлен',{code:'REVISION_CONTENT_QUARANTINED',httpStatus:409}));
  expect((await recoverCanonicalPdfViewerSession({sessionId:'TEST_ONLY_STANDARD',reference:strictRef})).recovered).toBe(false);
  expect(mockBuild).toHaveBeenCalledTimes(1);expect(mockBuild.mock.calls[0][0]).toMatchObject({revisionId:revision.revisionId,issuancePurpose:'STANDARD'});
  expect(mockBuild.mock.calls[0][0]).not.toHaveProperty('reviewRequest');expect(mockBuild.mock.calls[0][0].idempotencyKey.length).toBeLessThanOrEqual(200);
 });
 it('rejects a stale READY diagnostic acknowledgement even with the same renderer',async()=>{
  const ack=currentArtifact.metadata.reviewAcknowledgmentV1 as CanonicalProfessionalPdfReviewAcknowledgmentV1;
  currentArtifact={...currentArtifact,metadata:{...currentArtifact.metadata,reviewAcknowledgmentV1:{...ack,auditSha256:'e'.repeat(64)}}};
  expect(await recoverCanonicalPdfViewerSession({sessionId:'TEST_ONLY_STALE_ACK',reference:reference()})).toEqual({recovered:false,reason:'REPRESENTATION_UNAVAILABLE'});
  expect(globalThis.fetch).not.toHaveBeenCalled();expect(mockBuild).not.toHaveBeenCalled();
 });
 it('keeps authorized immediate use and exact fresh recovery possible with restricted storage',async()=>{
  Object.defineProperty(globalThis,'indexedDB',{configurable:true,value:undefined});
  const saved=await seed();expect(getDocumentSessionSnapshot(saved.sessionId).session?.status).toBe('ready');
  clearDocumentSessions();expect(await restoreWebPdfPreviewSessionDetailed(saved.sessionId)).toEqual({restored:false,reason:'STORAGE_UNAVAILABLE'});
  expect(await recoverCanonicalPdfViewerSession({sessionId:saved.sessionId,reference:reference()})).toEqual({recovered:true,via:'FRESH_SAVED_ARTIFACT'});
  expect(getDocumentSessionSnapshot(saved.sessionId).asset?.contentIdentity?.revisionId).toBe(revision.revisionId);
 });
 it('rejects URL/token-bearing recovery data without an API or file read',async()=>{
  const invalid={...reference(),signedUrl:'https://example.test/forbidden.pdf'};
  expect(parseCanonicalPdfRecoveryReference(invalid)).toBeNull();
  expect(await recoverCanonicalPdfViewerSession({sessionId:'TEST_ONLY_BAD_REFERENCE',reference:invalid})).toEqual({recovered:false,reason:'INVALID_REFERENCE'});
  expect(mockAuth).not.toHaveBeenCalled();expect(mockRevision).not.toHaveBeenCalled();expect(globalThis.fetch).not.toHaveBeenCalled();
 });

 it.each(['asset-missing','file-tampered'])('reopens only the saved authorized artifact when cache %s is detected',async variant=>{
  const saved=await seed();clearDocumentSessions();
  const database=await new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open('rik-pdf-preview-cache',2);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
  try{
   const row=await new Promise<Record<string,unknown>>((resolve,reject)=>{const request=database.transaction('sessions','readonly').objectStore('sessions').get(saved.sessionId);request.onsuccess=()=>resolve(request.result as Record<string,unknown>);request.onerror=()=>reject(request.error);});
   const cacheKey=String(row.cacheKey);
   const asset=await new Promise<Record<string,unknown>>((resolve,reject)=>{const request=database.transaction('assets','readonly').objectStore('assets').get(cacheKey);request.onsuccess=()=>resolve(request.result as Record<string,unknown>);request.onerror=()=>reject(request.error);});
   await new Promise<void>((resolve,reject)=>{const transaction=database.transaction('assets','readwrite');
    if(variant==='asset-missing')transaction.objectStore('assets').delete(cacheKey);
    else transaction.objectStore('assets').put({...asset,blob:new Blob(['%PDF-1.7 TEST_ONLY_TAMPERED'],{type:'application/pdf'})});
    transaction.oncomplete=()=>resolve();transaction.onerror=()=>reject(transaction.error);
   });
  }finally{database.close();}
  expect(await recoverCanonicalPdfViewerSession({sessionId:saved.sessionId,reference:reference()})).toEqual({recovered:true,via:'FRESH_SAVED_ARTIFACT'});
  expect(URL.createObjectURL).not.toHaveBeenCalled();
  expect(getDocumentSessionSnapshot(saved.sessionId).asset?.contentIdentity?.artifactSha256).toBe(currentArtifact.sha256);
 });
 it('retains the existing 64 MiB cache budget and recovers the same exact saved version after pruning',async()=>{
  const saved=await seed({bytes:'%PDF-1.7\n'+'x'.repeat(64*1024*1024+1)});clearDocumentSessions();
  expect(await restoreWebPdfPreviewSessionDetailed(saved.sessionId)).toMatchObject({restored:false,reason:'MISSING_SESSION'});
  expect(await recoverCanonicalPdfViewerSession({sessionId:saved.sessionId,reference:reference()})).toEqual({recovered:true,via:'FRESH_SAVED_ARTIFACT'});
  expect(mockRevision).toHaveBeenCalledWith(revision.revisionId,{issuancePurpose:'PRELIMINARY_REVIEW'});
 });

 it.each(['generator','template','file-sha','tenant','purpose'])('refuses an invalid current READY artifact %s without a result fallback',async field=>{
  currentArtifact={...currentArtifact,metadata:{...currentArtifact.metadata}};
  if(field==='generator')currentArtifact.metadata.generatorVersion='TEST_ONLY_OLD_GENERATOR';
  if(field==='template')currentArtifact.metadata.templateVersion='professional-estimate-pdf:1';
  if(field==='file-sha')currentArtifact.sha256='TEST_ONLY_NOT_A_HASH';
  if(field==='tenant')currentArtifact.metadata.sourceOrganizationId='TEST_ONLY_OTHER_COMPANY';
  if(field==='purpose')currentArtifact.metadata.issuancePurpose='STANDARD';
  expect((await recoverCanonicalPdfViewerSession({sessionId:'TEST_ONLY_BAD_READY',reference:reference()})).recovered).toBe(false);
  expect(mockBuild).not.toHaveBeenCalled();expect(globalThis.fetch).not.toHaveBeenCalled();expect(URL.createObjectURL).not.toHaveBeenCalled();
 });
 it('rechecks the real actor after the cached blob hash await and never exposes bytes after a switch',async()=>{
  const saved=await seed();clearDocumentSessions();
  const realDigest=globalThis.crypto.subtle.digest.bind(globalThis.crypto.subtle);
  jest.spyOn(globalThis.crypto.subtle,'digest').mockImplementation(async(...args:Parameters<typeof realDigest>)=>{
   const digest=await realDigest(...args);mockAuth.mockResolvedValue({degraded:false,session:{user:{id:'TEST_ONLY_OTHER_VIEWER'}}});return digest;
  });
  expect(await recoverCanonicalPdfViewerSession({sessionId:saved.sessionId,reference:reference()})).toEqual({recovered:false,reason:'AUTHORIZATION_CHANGED'});
  expect(URL.createObjectURL).not.toHaveBeenCalled();expect(getDocumentSessionSnapshot(saved.sessionId).session).toBeNull();
  expect(globalThis.fetch).toHaveBeenCalledTimes(1);
 });

 it('never substitutes an existing untyped neighbor session for an explicit canonical target',async()=>{
  const generic=createPreparingDocumentPreviewSession(createPdfDocumentDescriptor({uri:'https://example.test/neighbor.pdf',title:'TEST_ONLY_NEIGHBOR',documentType:'request',source:'generated',originModule:'reports'}));
  const doc=createPdfDocumentDescriptor({uri:'https://example.test/neighbor.pdf',title:'TEST_ONLY_NEIGHBOR',documentType:'request',source:'generated',originModule:'reports'});
  await materializeDocumentPreviewSessionAsset(generic.session.sessionId,doc,generic.session.preparationToken);
  expect(await recoverCanonicalPdfViewerSession({sessionId:generic.session.sessionId,reference:reference()})).toEqual({recovered:false,reason:'IDENTITY_MISMATCH'});
  expect(mockRevision).not.toHaveBeenCalled();expect(mockArtifact).not.toHaveBeenCalled();expect(mockBuild).not.toHaveBeenCalled();
  expect(getDocumentSessionSnapshot(generic.session.sessionId).asset?.uri).toBe(doc.uri);
 });
 it('diagnoses the exact recovery lazy-import boundary outside the production catch',async()=>{
  // Keep this last: existing recovery cases retain their original cold loading.
  // Await the same five imports with the same Promise.all shape, not mocked
  // replacements or an eager product import. CI must expose the original error.
  const load=async<T,>(stage:string,read:()=>Promise<T>):Promise<T>=>{
   try{return await read();}catch(error){
    throw new Error('TEST_ONLY_RECOVERY_LAZY_IMPORT:'+stage+'\n'+(error instanceof Error?error.stack??error.message:String(error)));
   }
  };
  const [client,contracts,rendererModule,artifactModule,eligibility]=await Promise.all([
   load('canonicalEstimateClient',()=>import('../estimate/backendPlatform/canonicalEstimateClient')),
   load('contracts',()=>import('../estimate/backendPlatform/contracts')),
   load('canonicalProfessionalPdf',()=>import('../estimate/backendPlatform/canonicalProfessionalPdf')),
   load('canonicalEstimateArtifactContract',()=>import('../estimate/backendPlatform/canonicalEstimateArtifactContract')),
   load('consumerEstimateProfessionalPdfReview',()=>import('../consumerRequests/consumerEstimateProfessionalPdfReview')),
  ]);
  expect(typeof client.assertCanonicalEstimateArtifactIdentity).toBe('function');
  expect(typeof contracts.CanonicalEstimateApiError).toBe('function');
  expect(rendererModule.CANONICAL_PROFESSIONAL_PDF_GENERATOR_VERSION).toBe(renderer);
  expect(artifactModule.CANONICAL_PROFESSIONAL_PDF_TEMPLATE_VERSION).toBe(currentArtifact.metadata.templateVersion);
  expect(eligibility.consumerEstimateProfessionalPdfReviewEligible(revision)).toBe(true);
  expect(()=>client.assertCanonicalEstimateArtifactIdentity({artifact:currentArtifact,revision,expectedKind:'pdf',
   expectedDocumentProfile:'professional_v1',expectedIssuancePurpose:'PRELIMINARY_REVIEW',expectedCatalogId:revision.catalogId,expectedRowCount:revision.rowCount})).not.toThrow();
  expect(mockRevision).not.toHaveBeenCalled();expect(mockArtifact).not.toHaveBeenCalled();expect(mockBuild).not.toHaveBeenCalled();
 });
});
