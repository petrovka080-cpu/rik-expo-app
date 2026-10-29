import React from 'react';
import TestRenderer,{act} from 'react-test-renderer';
import {Platform} from 'react-native';
import PdfViewerScreen from '../../../app/pdf-viewer';
import {createPdfDocumentDescriptor,type CanonicalPdfRecoveryReference} from '../documents/pdfDocument';
import {clearDocumentSessions,getDocumentSessionSnapshot,restoreInMemoryDocumentPreviewSession} from '../documents/pdfDocumentSessions';
import type {recoverCanonicalPdfViewerSession,CanonicalPdfRecoveryResult} from '../documents/pdfCanonicalWebPreviewPersistence';
import type {PdfViewerScreenContent} from './PdfViewerScreenContent';

type PdfViewerScreenContentProps=React.ComponentProps<typeof PdfViewerScreenContent>;

type RecoveryInput=Parameters<typeof recoverCanonicalPdfViewerSession>[0];
const mockRecover=jest.fn(),mockCache=jest.fn(),mockValidate=jest.fn(),mockVisible=jest.fn(),mockBreadcrumb=jest.fn();
let mockParams:Record<string,string>,mockRouteKey='TEST_ONLY_VIEWER_ROUTE',mockContent:PdfViewerScreenContentProps;
let mockContentHistory:Array<{kind:string;assetId:string|null;uri:string|null}>;
const mockNavigation={getCurrentRoute:()=>({key:mockRouteKey}),getRootState:()=>({index:0,routes:[{key:mockRouteKey,name:'pdf-viewer'}]})};
jest.mock('expo-router',()=>{
 const R=jest.requireActual<typeof import('react')>('react');
 return{router:{back:jest.fn(),replace:jest.fn(),canGoBack:()=>true},useLocalSearchParams:()=>mockParams,
  useNavigationContainerRef:()=>mockNavigation,useFocusEffect:(callback:React.EffectCallback)=>R.useEffect(callback,[callback])};
});
jest.mock('@react-navigation/native',()=>({useRoute:()=>({key:mockRouteKey,name:'pdf-viewer'})}));
jest.mock('react-native-safe-area-context',()=>({SafeAreaView:({children}:{children:React.ReactNode})=>children,useSafeAreaInsets:()=>({top:0,right:0,bottom:0,left:0})}));
jest.mock('react-native-webview',()=>({WebView:'TestNativeWebView'}));
jest.mock('@expo/vector-icons',()=>({Ionicons:()=>null}));
jest.mock('../../shared/ui/ScreenErrorBoundary',()=>({withScreenErrorBoundary:(Component:unknown)=>Component}));
jest.mock('../supabaseClient',()=>({getSessionSafe:jest.fn()}));
jest.mock('../documents/pdfCanonicalWebPreviewPersistence',()=>({recoverCanonicalPdfViewerSession:(...args:unknown[])=>mockRecover(...args)}));
jest.mock('../documents/pdfWebPreviewCache',()=>({restoreWebPdfPreviewSessionDetailed:(...args:unknown[])=>mockCache(...args)}));
jest.mock('./pdfViewer.helpers',()=>({
 ...jest.requireActual<typeof import('./pdfViewer.helpers')>('./pdfViewer.helpers'),
 validateEmbeddedPreviewResolution:(...args:unknown[])=>mockValidate(...args),
}));
jest.mock('./pdfCrashBreadcrumbs',()=>({recordPdfCrashBreadcrumb:jest.fn(),recordPdfCrashBreadcrumbAsync:(...args:unknown[])=>mockBreadcrumb(...args),shouldRecordPdfCrashBreadcrumbs:()=>true}));
jest.mock('./pdfOpenFlow',()=>({markPdfOpenVisible:(...args:unknown[])=>mockVisible(...args),markPdfOpenRouteMounted:jest.fn(),failPdfOpenVisible:jest.fn(),cancelPdfOpenVisible:jest.fn()}));
jest.mock('../pdfRunner',()=>({openPdfPreview:jest.fn()}));
jest.mock('../observability/catchDiscipline',()=>({recordCatchDiscipline:jest.fn()}));
jest.mock('./PdfViewerScreenContent',()=>{
 const R=jest.requireActual<typeof import('react')>('react');
 return{PdfViewerScreenContent:(props:PdfViewerScreenContentProps)=>{
  mockContent=props;mockContentHistory.push({kind:props.contentModel.kind,assetId:props.asset?.assetId??null,uri:props.asset?.uri??null});
  return R.createElement('TestPdfContent',props);
 }};
});
function deferred<T>(){let resolve!:(value:T)=>void,reject!:(error:unknown)=>void;const promise=new Promise<T>((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};}

/** Orchestration test: cache/recovery/validation are controlled asynchronous I/O
 * boundaries. The mounted product screen, orchestrator, document registry,
 * descriptor/reference parser, render event and timeout guards are real.
 * Fresh authorization and exact artifact checks remain covered by the separate
 * unmocked recovery suite; this file grants no PDF/source/auth admission. */
describe('mounted canonical PDF bootstrap owns a route/retry, not an asset callback identity',()=>{
 const originalOs=Platform.OS;
 let renderer:TestRenderer.ReactTestRenderer|null;
 let requests:Array<{input:RecoveryInput;remote:ReturnType<typeof deferred<CanonicalPdfRecoveryResult>>}>;
 let info:jest.SpyInstance;
 const reference=(suffix='A'):CanonicalPdfRecoveryReference=>({contractVersion:'canonical-pdf-recovery/v1',revisionId:'TEST_ONLY_REVISION_'+suffix,
  releaseId:'TEST_ONLY_RELEASE',definitionVersionId:'TEST_ONLY_DEFINITION',checksumSha256:'a'.repeat(64),issuancePurpose:'PRELIMINARY_REVIEW',
  documentProfile:'professional_v1',organizationId:'TEST_ONLY_ORGANIZATION'});
 const params=(ref=reference(),sessionId='TEST_ONLY_SESSION_A')=>({sessionId,canonicalRecovery:JSON.stringify(ref),openToken:'TEST_ONLY_OPEN_A',returnTo:'/office/director',originModule:'reports'});
 const descriptor=(ref=reference(),uri='https://example.test/actual-saved-'+ref.revisionId+'.pdf')=>createPdfDocumentDescriptor({uri,title:'TEST_ONLY_SAVED_DOCUMENT',
  fileName:'test-only.pdf',documentType:'request',source:'generated',originModule:'reports',contentIdentity:{revisionId:ref.revisionId,releaseId:ref.releaseId,
   definitionVersionId:ref.definitionVersionId,checksumSha256:ref.checksumSha256,issuancePurpose:ref.issuancePurpose,artifactSha256:'b'.repeat(64),
   rendererVersion:'TEST_ONLY_RENDERER',ownerUserId:'TEST_ONLY_SOURCE_OWNER',viewerUserId:'TEST_ONLY_VIEWER',organizationId:ref.organizationId??undefined,currency:'KGS'}});
 const flush=async()=>{for(let i=0;i<6;i++)await Promise.resolve();};
 const mount=async()=>{await act(async()=>{renderer=TestRenderer.create(<PdfViewerScreen/>);await flush();});};
 const rerender=async()=>{await act(async()=>{renderer!.update(<PdfViewerScreen/>);await flush();});};
 const complete=(index:number,uri?:string)=>{
  const request=requests[index];
  try{request.input.assertCurrent?.();}catch{request.remote.resolve({recovered:false,reason:'AUTHORIZATION_CHANGED'});return false;}
  const ref=request.input.reference as CanonicalPdfRecoveryReference;
  restoreInMemoryDocumentPreviewSession({sessionId:request.input.sessionId,replaceExisting:true,doc:descriptor(ref,uri)});
  request.remote.resolve({recovered:true,via:'FRESH_SAVED_ARTIFACT'});return true;
 };
 const settle=async(index:number,uri?:string)=>{await act(async()=>{expect(complete(index,uri)).toBe(true);await flush();});};
 const loaded=async()=>{await act(async()=>{mockContent.onWebLoad();await flush();});};
 const logCount=(label:string)=>info.mock.calls.filter(call=>call[0]===label).length;
 beforeEach(()=>{
  jest.useFakeTimers();jest.clearAllMocks();renderer=null;requests=[];mockContentHistory=[];mockRouteKey='TEST_ONLY_VIEWER_ROUTE';
  Object.defineProperty(Platform,'OS',{configurable:true,value:'web'});
  mockParams=params();clearDocumentSessions();
  mockCache.mockReset().mockResolvedValue({restored:false,reason:'MISSING_SESSION'});
  mockValidate.mockReset().mockResolvedValue(undefined);mockBreadcrumb.mockReset().mockResolvedValue(undefined);
  mockRecover.mockReset().mockImplementation((input:RecoveryInput)=>{const remote=deferred<CanonicalPdfRecoveryResult>();requests.push({input,remote});return remote.promise;});
  info=jest.spyOn(console,'info').mockImplementation(()=>{});jest.spyOn(console,'error').mockImplementation(()=>{});
 });
 afterEach(()=>{
  if(renderer)act(()=>renderer!.unmount());renderer=null;clearDocumentSessions();jest.clearAllTimers();jest.useRealTimers();
  jest.restoreAllMocks();Object.defineProperty(Platform,'OS',{configurable:true,value:originalOs});
 });

 it.each(['typed-cold','typed-warm','legacy-cache-reference'])('completes one recovery and one render through asset clearing/replacement (%s)',async mode=>{
  if(mode==='typed-warm')restoreInMemoryDocumentPreviewSession({sessionId:mockParams.sessionId,doc:descriptor()});
  if(mode==='legacy-cache-reference'){
   delete mockParams.canonicalRecovery;
   mockCache.mockResolvedValue({restored:false,reason:'CANONICAL_AUTHORIZATION_REQUIRED',canonicalRecovery:reference()});
  }
  await mount();
  expect(mockRecover).toHaveBeenCalledTimes(1);expect(mockContentHistory.some(row=>row.kind==='loading'&&row.assetId===null)).toBe(true);
  expect(logCount('[pdf-viewer] unmount')).toBe(0);
  await settle(0);expect(mockRecover).toHaveBeenCalledTimes(1);expect(mockContent.contentModel.kind).toBe('embedded-web');
  expect(mockContent.asset?.uri).toBe(descriptor().uri);expect(mockContent.webEmbeddedUri).toBe(descriptor().uri);
  await loaded();expect(mockVisible).toHaveBeenCalledTimes(1);
  await act(async()=>{mockContent.onToggleMenu();await flush();});await rerender();
  expect(mockRecover).toHaveBeenCalledTimes(1);expect(logCount('[pdf-viewer] open')).toBe(1);expect(logCount('[pdf-viewer] ready')).toBe(1);
  expect(logCount('[pdf-viewer] unmount')).toBe(0);expect(mockContent.asset?.contentIdentity?.revisionId).toBe(reference().revisionId);
 });
 it('a legacy URL without a locator or cache reaches the real empty state instead of remaining pending',async()=>{
  delete mockParams.canonicalRecovery;await mount();
  expect(mockCache).toHaveBeenCalledTimes(1);expect(mockRecover).not.toHaveBeenCalled();expect(mockContent.contentModel.kind).toBe('empty');
  expect(mockContent.asset).toBeNull();expect(mockVisible).not.toHaveBeenCalled();
 });
 it('an authorization-change result stays empty without rendering or restarting recovery',async()=>{
  await mount();await act(async()=>{requests[0].remote.resolve({recovered:false,reason:'AUTHORIZATION_CHANGED'});await flush();});
  expect(mockContent.contentModel.kind).toBe('empty');expect(mockContent.asset).toBeNull();expect(mockVisible).not.toHaveBeenCalled();
  await rerender();expect(mockRecover).toHaveBeenCalledTimes(1);
 });
 it('unmount invalidates the pending recovery before any registry/render commit',async()=>{
  await mount();act(()=>renderer!.unmount());renderer=null;
  await act(async()=>{expect(complete(0)).toBe(false);await flush();});
  expect(getDocumentSessionSnapshot('TEST_ONLY_SESSION_A').asset).toBeNull();expect(mockVisible).not.toHaveBeenCalled();
 });
 it.each(['exact-reference','open-token','return-target','viewer-route-key'])('a changed semantic %s cancels the previous pending cycle',async change=>{
  await mount();
  if(change==='exact-reference')mockParams=params(reference('B'),'TEST_ONLY_SESSION_B');
  if(change==='open-token')mockParams={...mockParams,openToken:'TEST_ONLY_OPEN_B'};
  if(change==='return-target')mockParams={...mockParams,returnTo:'/office/reports'};
  if(change==='viewer-route-key')mockRouteKey='TEST_ONLY_REPLACEMENT_VIEWER_ROUTE';
  await rerender();expect(mockRecover).toHaveBeenCalledTimes(2);
  await act(async()=>{expect(complete(0)).toBe(false);await flush();});expect(mockVisible).not.toHaveBeenCalled();
  await settle(1);await loaded();expect(mockVisible).toHaveBeenCalledTimes(1);expect(mockRecover).toHaveBeenCalledTimes(2);
  expect(mockContent.asset?.contentIdentity?.revisionId).toBe(change==='exact-reference'?reference('B').revisionId:reference().revisionId);
 });
 it('an explicit retry cancels the old pending attempt without caching an authorization result',async()=>{
  await mount();await act(async()=>{mockContent.onRetry();await flush();});expect(mockRecover).toHaveBeenCalledTimes(2);
  await act(async()=>{expect(complete(0)).toBe(false);await flush();});
  await settle(1);await loaded();expect(mockVisible).toHaveBeenCalledTimes(1);
 });
 it.each(['resolve','reject'])('late embedded validation %s cannot write URI, telemetry or ready into a newer route',async outcome=>{
  const oldValidation=deferred<void>();mockValidate.mockReturnValueOnce(oldValidation.promise);
  await mount();await settle(0,'data:application/pdf;base64,JVBERi0xLjQKJSVFT0YK');
  expect(mockValidate).toHaveBeenCalledTimes(1);expect(mockVisible).not.toHaveBeenCalled();
  mockParams=params(reference('B'),'TEST_ONLY_SESSION_B');await rerender();await settle(1);await loaded();
  const currentUri=mockContent.webEmbeddedUri;
  await act(async()=>{if(outcome==='resolve')oldValidation.resolve(undefined);else oldValidation.reject(new Error('TEST_ONLY_OLD_VALIDATION'));await flush();});
  expect(mockContent.webEmbeddedUri).toBe(currentUri);expect(mockContent.asset?.contentIdentity?.revisionId).toBe(reference('B').revisionId);
  expect(mockContent.contentModel.kind).toBe('embedded-web');expect(mockVisible).toHaveBeenCalledTimes(1);expect(mockRecover).toHaveBeenCalledTimes(2);
  expect(mockBreadcrumb.mock.calls.some(call=>call[0]?.marker==='viewer_validation_success'&&call[0]?.uri?.startsWith('data:'))).toBe(false);
 });
 it('the existing render timeout remains terminal rather than restarting the completed bootstrap',async()=>{
  await mount();await settle(0);
  await act(async()=>{jest.advanceTimersByTime(15_001);await flush();});
  expect(mockContent.contentModel.kind).toBe('error');expect(mockRecover).toHaveBeenCalledTimes(1);expect(mockVisible).not.toHaveBeenCalled();
 });
});
