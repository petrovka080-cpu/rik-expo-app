import React from 'react';import {act,create,type ReactTestRenderer} from 'react-test-renderer';
jest.mock('expo-file-system/legacy',()=>({getInfoAsync:jest.fn(),downloadAsync:jest.fn(),copyAsync:jest.fn()}));
jest.mock('../fileSystemPaths',()=>({getFileSystemPaths:()=>({cacheDir:'file:///cache/',documentDir:'file:///documents/',legacyDocumentDirectory:'file:///documents/'})}));
jest.mock('./pdfCrashBreadcrumbs',()=>({recordPdfCrashBreadcrumb:jest.fn()}));
import {clearDocumentSessions,createPreparingDocumentPreviewSession,completeDocumentPreviewSessionAsset,getDocumentSessionSnapshot,failDocumentSession,type DocumentAsset,type DocumentSession} from '../documents/pdfDocumentSessions';
import {resolvePdfViewerContentModel,resolvePdfViewerReadinessModel,type PdfViewerContentModel} from './pdfViewer.readiness';
import {usePdfViewerOrchestrator} from './usePdfViewerOrchestrator';
import {emitCurrentPdfViewerDiagnostic,usePdfViewerDiagnostics,type PdfViewerDiagnosticArgs} from './usePdfViewerDiagnostics';
const asset:DocumentAsset={assetId:'asset',uri:'file:///cache/verified.pdf',fileSource:{kind:'local-file',uri:'file:///cache/verified.pdf'},sourceKind:'local-file',fileName:'verified.pdf',title:'Estimate',mimeType:'application/pdf',documentType:'request',originModule:'reports',source:'generated',createdAt:'2026-10-10T20:00:00Z'};
const ready:DocumentSession={sessionId:'s',assetId:'asset',status:'ready',createdAt:asset.createdAt};
type Snapshot={session:DocumentSession|null;asset:DocumentAsset|null};
let viewer:ReturnType<typeof usePdfViewerOrchestrator>,diagnostic:PdfViewerDiagnosticArgs,model:PdfViewerContentModel,renderer:ReactTestRenderer|undefined;
let latest:Snapshot,activeRoute:string,back:React.MutableRefObject<boolean>,log:jest.Mock,rendered:Snapshot[];
function Harness({initial,bootstrapFirst=false}:{initial:Snapshot;bootstrapFirst?:boolean}){
  const r=resolvePdfViewerReadinessModel({...initial,platform:'android'});
  viewer=usePdfViewerOrchestrator({initialSession:initial.session,initialAsset:initial.asset,initialState:r.initialState,initialErrorText:initial.session?.errorMessage??''});
  React.useEffect(()=>{if(bootstrapFirst)viewer.beginBootstrapCycle();},[bootstrapFirst]);
  const resolution=resolvePdfViewerReadinessModel({session:viewer.session,asset:viewer.asset,platform:'android'}).resolvedSource;
  model=resolvePdfViewerContentModel({state:viewer.state,errorText:viewer.errorText,asset:viewer.asset,resolvedSource:resolution,isReadyToRender:viewer.isReadyToRender,hasRenderableSource:Boolean(viewer.asset)});
  rendered.push({session:viewer.session,asset:viewer.asset});
  diagnostic={contentModel:model,asset:viewer.asset,sessionId:initial.session?.sessionId??'missing',platform:'android',isMountedRef:viewer.isMountedRef,backDispatchedRef:back,viewerCycleRef:viewer.viewerCycleRef,attemptGeneration:viewer.viewerCycleGeneration,viewerRouteKey:'viewer',getCurrentRouteKey:()=>activeRoute,resolveSnapshot:()=>latest,logError:log};
  usePdfViewerDiagnostics(diagnostic);return null;
}
beforeEach(()=>{clearDocumentSessions();activeRoute='viewer';back={current:false};log=jest.fn();rendered=[];});
afterEach(()=>{if(renderer)act(()=>renderer!.unmount());renderer=undefined;});
it('mounts real deferred preparation, commits session/asset together, hands off and returns without invalid-asset diagnostics',async()=>{
  const pending=createPreparingDocumentPreviewSession({fileName:'verified.pdf',documentType:'request',originModule:'reports'});latest=getDocumentSessionSnapshot(pending.session.sessionId);
  act(()=>{renderer=create(React.createElement(Harness,{initial:latest,bootstrapFirst:true}));});expect(model.kind).toBe('loading');
  let finish!:()=>void;const preparation=new Promise<void>(resolve=>{finish=()=>{expect(completeDocumentPreviewSessionAsset(pending.session.sessionId,asset,pending.session.preparationToken)).toBe(true);resolve();};});
  finish();await preparation;latest=getDocumentSessionSnapshot(pending.session.sessionId);
  act(()=>{viewer.commitDocumentSnapshot(latest.session,latest.asset);});
  expect(rendered.some(s=>s.session?.status==='ready'&&!s.asset)).toBe(false);expect(model.kind).toBe('native-handoff');
  act(()=>{viewer.commitNativeHandoffCompleted();viewer.commitReadyState();});expect(viewer.state).toBe('ready');expect(viewer.nativeHandoffCompleted).toBe(true);
  const captured=diagnostic;back.current=true;activeRoute='request';emitCurrentPdfViewerDiagnostic(captured,captured.attemptGeneration);expect(log).not.toHaveBeenCalled();expect(viewer.state).toBe('ready');
});
it.each(['empty','missing','error'] as const)('does not lose terminal %s diagnostics when bootstrap effect runs before the diagnostic effect',kind=>{
  latest=kind==='empty'?{session:null,asset:null}:kind==='missing'?{session:ready,asset:null}:{session:{...ready,status:'error',errorMessage:'real terminal failure'},asset};
  act(()=>{renderer=create(React.createElement(Harness,{initial:latest,bootstrapFirst:true}));});expect(viewer.viewerCycleGeneration).toBe(1);expect(log).toHaveBeenCalledTimes(1);expect(log.mock.calls[0][0]).toBe(kind==='empty'?'[pdf-viewer] viewer_missing_session':'[pdf-viewer] viewer_error_state');
});
it.each(['back','route','unmount','new-attempt'] as const)('rejects a retained failure from %s and preserves an active terminal failure',reason=>{
  latest={session:ready,asset:null};act(()=>{renderer=create(React.createElement(Harness,{initial:latest}));});expect(log).toHaveBeenCalledTimes(1);log.mockClear();const captured=diagnostic,generation=captured.attemptGeneration;
  if(reason==='back')back.current=true;if(reason==='route')activeRoute='request';if(reason==='unmount'){act(()=>renderer!.unmount());renderer=undefined;}if(reason==='new-attempt')act(()=>{viewer.beginBootstrapCycle();});
  // A new active attempt may legitimately diagnose its own terminal state.
  log.mockClear();emitCurrentPdfViewerDiagnostic(captured,generation);expect(log).not.toHaveBeenCalled();
});
it('revalidates a captured invalid asset against newer actual registry preparation/validity',()=>{
  latest={session:ready,asset:null};act(()=>{renderer=create(React.createElement(Harness,{initial:latest}));});const captured=diagnostic;log.mockClear();
  latest={session:{...ready,status:'preparing'},asset:null};emitCurrentPdfViewerDiagnostic(captured,captured.attemptGeneration);expect(log).not.toHaveBeenCalled();latest={session:ready,asset};emitCurrentPdfViewerDiagnostic(captured,captured.attemptGeneration);expect(log).not.toHaveBeenCalled();
});
it('retains true registry failure and compatible functional setters after an atomic pair commit',()=>{
  const pending=createPreparingDocumentPreviewSession({fileName:'verified.pdf',documentType:'request',originModule:'reports'});latest=getDocumentSessionSnapshot(pending.session.sessionId);act(()=>{renderer=create(React.createElement(Harness,{initial:latest}));});
  expect(completeDocumentPreviewSessionAsset(pending.session.sessionId,asset,pending.session.preparationToken)).toBe(true);failDocumentSession(pending.session.sessionId,'actual failure');latest=getDocumentSessionSnapshot(pending.session.sessionId);act(()=>{viewer.commitDocumentSnapshot(latest.session,latest.asset);viewer.commitErrorState('actual failure');});expect(log.mock.calls.some(c=>c[0]==='[pdf-viewer] viewer_error_state')).toBe(true);
  const setSession=viewer.setSession,setAsset=viewer.setAsset,acceptedAsset=viewer.asset;act(()=>{viewer.setSession(p=>p);viewer.setAsset(p=>p);});expect(viewer.setSession).toBe(setSession);expect(viewer.setAsset).toBe(setAsset);expect(viewer.asset).toBe(acceptedAsset);expect(viewer.asset).toEqual(asset);
});
