import { MessageChannel, receiveMessageOnPort } from 'node:worker_threads';
import { Blob as NodeBlob } from 'node:buffer';
import { Platform } from 'react-native';
import { IDBFactory } from 'fake-indexeddb';
import { createPdfDocumentDescriptor } from './pdfDocument';
import { clearDocumentSessions, createPreparingDocumentPreviewSession, materializeDocumentPreviewSessionAsset, getDocumentSessionSnapshot } from './pdfDocumentSessions';
import { __resetWebPdfPreviewCacheForTests, restoreWebPdfPreviewSession, persistWebPdfPreviewSession } from './pdfWebPreviewCache';
import { persistCanonicalWebPdfPreview } from './pdfCanonicalWebPreviewPersistence';
const mockSessionSafe = jest.fn();
jest.mock('../supabaseClient', () => ({ getSessionSafe: (...args: unknown[]) => mockSessionSafe(...args) }));

describe('canonical PDF reload recovery through the real common materialization path', () => {
 const original = { clone: globalThis.structuredClone, blob: globalThis.Blob, os: Platform.OS, document: globalThis.document, indexedDB: globalThis.indexedDB,
   fetch: globalThis.fetch, sessionStorage: globalThis.sessionStorage, create: URL.createObjectURL, revoke: URL.revokeObjectURL };
 const storage = new Map<string,string>();
 const identity = { ownerUserId:'user-1',viewerUserId:'user-1',organizationId:'company-1',currency:'KGS',revisionId:'revision-1',
   releaseId:'release-1',definitionVersionId:'definition-1',checksumSha256:'a'.repeat(64),artifactSha256:'b'.repeat(64),rendererVersion:'renderer-1',issuancePurpose:'PRELIMINARY_REVIEW' as const };
 const descriptor=()=>createPdfDocumentDescriptor({uri:'https://example.test/exact-saved.pdf',fileName:'exact.pdf',
   title:'Saved estimate',documentType:'request',source:'generated',originModule:'reports',entityId:'draft-1',contentIdentity:identity});
 beforeEach(()=>{
  Object.defineProperty(globalThis,'Blob',{configurable:true,value:NodeBlob});
  Object.defineProperty(globalThis,'structuredClone',{configurable:true,value:<T,>(value:T):T=>{
    const channel=new MessageChannel();
    try { channel.port1.postMessage(value); const received=receiveMessageOnPort(channel.port2);
      if(!received)throw new Error('Native structured clone did not deliver a value');return received.message as T;
    } finally { channel.port1.close();channel.port2.close(); }
  }});
  Object.defineProperty(Platform,'OS',{configurable:true,value:'web'});
  Object.defineProperty(globalThis,'document',{configurable:true,value:{}});
  Object.defineProperty(globalThis,'indexedDB',{configurable:true,value:new IDBFactory()});
  Object.defineProperty(globalThis,'sessionStorage',{configurable:true,value:{getItem:(k:string)=>storage.get(k)??null,setItem:(k:string,v:string)=>storage.set(k,v),removeItem:(k:string)=>storage.delete(k)}});
  Object.defineProperty(URL,'createObjectURL',{configurable:true,value:jest.fn(()=>'blob:recovered-exact-pdf')});
  Object.defineProperty(URL,'revokeObjectURL',{configurable:true,value:jest.fn()});
  Object.defineProperty(globalThis,'fetch',{configurable:true,value:jest.fn(async()=>({ok:true,status:200,blob:async()=>new Blob(['%PDF-1.7\nexact revision bytes'],{type:'application/pdf'})}))});
  mockSessionSafe.mockReset().mockResolvedValue({session:{user:{id:'user-1'}},degraded:false});
 });
 afterEach(async()=>{
  clearDocumentSessions();await __resetWebPdfPreviewCacheForTests();storage.clear();
  Object.defineProperty(Platform,'OS',{configurable:true,value:original.os});
  Object.defineProperty(globalThis,'Blob',{configurable:true,value:original.blob});
  Object.defineProperty(globalThis,'structuredClone',{configurable:true,value:original.clone});
  for(const k of ['document','indexedDB','fetch','sessionStorage'] as const)Object.defineProperty(globalThis,k,{configurable:true,value:original[k]});
  Object.defineProperty(URL,'createObjectURL',{configurable:true,value:original.create});
  Object.defineProperty(URL,'revokeObjectURL',{configurable:true,value:original.revoke});
 });
 it('persists actual canonical bytes before a ready session, then restores the same short route after memory loss',async()=>{
  const doc=descriptor(),pending=createPreparingDocumentPreviewSession(doc);
  const asset=await materializeDocumentPreviewSessionAsset(pending.session.sessionId,doc,pending.session.preparationToken);
  expect(getDocumentSessionSnapshot(pending.session.sessionId).session?.status).toBe('ready');
  expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  clearDocumentSessions();
  expect(await restoreWebPdfPreviewSession(pending.session.sessionId)).toBe(true);
  const restored=getDocumentSessionSnapshot(pending.session.sessionId);
  expect(restored.session?.sessionId).toBe(pending.session.sessionId);
  expect(restored.asset).toMatchObject({uri:'blob:recovered-exact-pdf',fileName:asset.fileName,title:asset.title,entityId:'draft-1'});
  expect(globalThis.fetch).toHaveBeenCalledTimes(1);
 });
 it('allows an authorized coworker to cache a source owner snapshot under the viewing actor principal',async()=>{
  mockSessionSafe.mockResolvedValue({session:{user:{id:'user-2'}},degraded:false});
  const doc=descriptor();doc.contentIdentity={...identity,viewerUserId:'user-2'};
  const pending=createPreparingDocumentPreviewSession(doc);
  await materializeDocumentPreviewSessionAsset(pending.session.sessionId,doc,pending.session.preparationToken);
  clearDocumentSessions();
  expect(await restoreWebPdfPreviewSession(pending.session.sessionId)).toBe(true);
 });
 it('stores new file bytes when live report diagnostics refresh under the same revision and renderer',async()=>{
  (globalThis.fetch as jest.Mock)
   .mockResolvedValueOnce({ok:true,status:200,blob:async()=>new Blob(['%PDF-1.7 first'],{type:'application/pdf'})})
   .mockResolvedValueOnce({ok:true,status:200,blob:async()=>new Blob(['%PDF-1.7 refreshed'],{type:'application/pdf'})});
  const doc=descriptor(),first=createPreparingDocumentPreviewSession(doc);
  await materializeDocumentPreviewSessionAsset(first.session.sessionId,doc,first.session.preparationToken);
  const refreshed={...doc,contentIdentity:{...identity,artifactSha256:'c'.repeat(64)}};
  const second=createPreparingDocumentPreviewSession(refreshed);
  await materializeDocumentPreviewSessionAsset(second.session.sessionId,refreshed,second.session.preparationToken);
  expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  clearDocumentSessions();
  expect(await restoreWebPdfPreviewSession(first.session.sessionId)).toBe(true);
  expect(await restoreWebPdfPreviewSession(second.session.sessionId)).toBe(true);
  const restoredBlobs=(URL.createObjectURL as jest.Mock).mock.calls.map(call=>call[0] as Blob);
  expect(await Promise.all(restoredBlobs.map(blob=>blob.text()))).toEqual(['%PDF-1.7 first','%PDF-1.7 refreshed']);
 });
 it('rejects owner switching before bytes can be persisted or exposed as ready',async()=>{
  mockSessionSafe.mockResolvedValue({session:{user:{id:'user-2'}},degraded:false});
  const doc=descriptor(),pending=createPreparingDocumentPreviewSession(doc);
  await expect(materializeDocumentPreviewSessionAsset(pending.session.sessionId,doc,pending.session.preparationToken)).rejects.toMatchObject({name:'AbortError'});
  expect(globalThis.fetch).not.toHaveBeenCalled();
  expect(getDocumentSessionSnapshot(pending.session.sessionId).session?.status).toBe('error');
 });
 it('does not expose or persist a ready document if the account switches while PDF bytes are fetched',async()=>{
  (globalThis.fetch as jest.Mock).mockImplementation(async()=>{
   mockSessionSafe.mockResolvedValue({session:{user:{id:'user-2'}},degraded:false});
   return {ok:true,status:200,blob:async()=>new Blob(['%PDF-1.7\nexact'],{type:'application/pdf'})};
  });
  const doc=descriptor(),pending=createPreparingDocumentPreviewSession(doc);
  await expect(materializeDocumentPreviewSessionAsset(pending.session.sessionId,doc,pending.session.preparationToken)).rejects.toMatchObject({name:'AbortError'});
  expect(getDocumentSessionSnapshot(pending.session.sessionId).session?.status).toBe('error');
  clearDocumentSessions();
  expect(await restoreWebPdfPreviewSession(pending.session.sessionId)).toBe(false);
 });
 it('migrates a disposable legacy preview namespace by purging cache, without blocking the verified canonical owner',async()=>{
  const doc=descriptor(),first=createPreparingDocumentPreviewSession({...doc,contentIdentity:undefined});
  const asset=await materializeDocumentPreviewSessionAsset(first.session.sessionId,{...doc,contentIdentity:undefined},first.session.preparationToken);
  await persistWebPdfPreviewSession({session:first.session,asset,namespace:'old-generated-preview',identity:{
   tenantId:'consumer-repair',companyId:'company-1',userId:'user-1',sessionBoundaryId:'user-1:draft-1',
   revisionId:'old-revision',snapshotHash:'old-snapshot',rendererVersion:'old-renderer',locale:'ru-KG',currency:'KGS'}});
  const pending=createPreparingDocumentPreviewSession(doc);
  await materializeDocumentPreviewSessionAsset(pending.session.sessionId,doc,pending.session.preparationToken);
  clearDocumentSessions();
  expect(await restoreWebPdfPreviewSession(pending.session.sessionId)).toBe(true);
  expect(await restoreWebPdfPreviewSession(first.session.sessionId)).toBe(false);
 });
 it('purges persisted canonical sessions on the existing authentication boundary',async()=>{
  const doc=descriptor(),pending=createPreparingDocumentPreviewSession(doc);
  await materializeDocumentPreviewSessionAsset(pending.session.sessionId,doc,pending.session.preparationToken);
  clearDocumentSessions();await __resetWebPdfPreviewCacheForTests();
  expect(await restoreWebPdfPreviewSession(pending.session.sessionId)).toBe(false);
 });
 it('keeps an authorized immediate PDF readable when persistent browser storage is unavailable',async()=>{
  Object.defineProperty(globalThis,'indexedDB',{configurable:true,value:undefined});
  const doc=descriptor(),pending=createPreparingDocumentPreviewSession(doc);
  await materializeDocumentPreviewSessionAsset(pending.session.sessionId,doc,pending.session.preparationToken);
  expect(getDocumentSessionSnapshot(pending.session.sessionId).session?.status).toBe('ready');
 });
 it.each(['checksumSha256','artifactSha256','releaseId','definitionVersionId','rendererVersion','currency'] as const)('does not seed a cache with incomplete %s identity',async field=>{
  const doc=descriptor();doc.contentIdentity={...identity,[field]:''};
  const pending=createPreparingDocumentPreviewSession(doc);
  expect(await persistCanonicalWebPdfPreview({doc,session:pending.session,asset:{assetId:'asset',uri:doc.uri,fileSource:doc.fileSource,sourceKind:doc.fileSource.kind,
    fileName:doc.fileName,title:doc.title,mimeType:'application/pdf',documentType:'request',originModule:'reports',source:'generated',createdAt:new Date().toISOString()}})).toBe(false);
  expect(globalThis.fetch).not.toHaveBeenCalled();
 });
});
