/** @jest-environment jsdom */
import {observePdfViewerFallbackVisibility} from './PdfViewerWebShell';
jest.mock('react-native',()=>({View:'div',Platform:{OS:'web'}}));
jest.mock('./pdfViewer.styles',()=>({styles:{}}));

describe('PDF fallback actual iframe layout and visibility protocol',()=>{
 let notify:()=>void,visibility:DocumentVisibilityState,cleanup:(()=>void)[]=[];
 const resizeDescriptor=Object.getOwnPropertyDescriptor(globalThis,'ResizeObserver');
 const visibilityDescriptor=Object.getOwnPropertyDescriptor(document,'visibilityState');
 beforeEach(()=>{
  visibility='visible';Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>visibility});
  class TestResizeObserver implements ResizeObserver{
   constructor(callback:ResizeObserverCallback){notify=()=>callback([],this);}
   observe=jest.fn();unobserve=jest.fn();disconnect=jest.fn();
  }
  Object.defineProperty(globalThis,'ResizeObserver',{configurable:true,value:TestResizeObserver});
 });
 afterEach(()=>{
  cleanup.forEach(stop=>stop());cleanup=[];document.body.replaceChildren();jest.restoreAllMocks();
  if(resizeDescriptor)Object.defineProperty(globalThis,'ResizeObserver',resizeDescriptor);
  else delete (globalThis as unknown as Record<string,unknown>).ResizeObserver;
  if(visibilityDescriptor)Object.defineProperty(document,'visibilityState',visibilityDescriptor);
  else delete (document as unknown as Record<string,unknown>).visibilityState;
 });
 function setup(width=0,height=0){
  const iframe=document.createElement('iframe');document.body.append(iframe);
  let size={width,height};
  jest.spyOn(iframe,'getBoundingClientRect').mockImplementation(()=>({...size,x:0,y:0,top:0,left:0,
   right:size.width,bottom:size.height,toJSON:()=>size} as DOMRect));
  const post=jest.spyOn(iframe.contentWindow!,'postMessage').mockImplementation(()=>undefined);
  const onLoad=jest.fn(),onError=jest.fn();
  const stop=observePdfViewerFallbackVisibility({iframe,renderInstanceKey:'TEST_ONLY_RENDER',onLoad,onError});cleanup.push(stop);
  const emit=(data:Record<string,unknown>,origin=window.location.origin,source:MessageEventSource|null=iframe.contentWindow)=>
   window.dispatchEvent(new MessageEvent('message',{data:{renderInstanceKey:'TEST_ONLY_RENDER',...data},origin,source}));
  return{iframe,post,onLoad,onError,stop,emit,size:(width:number,height:number)=>{size={width,height};}};
 }
 it('publishes zero to positive geometry once and keeps handshake resend in the same epoch',()=>{
  const f=setup();
  expect(f.post.mock.calls[0]).toEqual([{type:'pdf-viewer-visibility',renderInstanceKey:'TEST_ONLY_RENDER',active:false,width:0,height:0,epoch:1},window.location.origin]);
  f.size(960,828);notify();notify();
  expect(f.post).toHaveBeenCalledTimes(2);
  expect(f.post.mock.calls[1][0]).toMatchObject({active:true,width:960,height:828,epoch:2});
  f.emit({type:'pdf-viewer-layout-request'});
  expect(f.post).toHaveBeenCalledTimes(3);expect(f.post.mock.calls[2][0]).toMatchObject({epoch:2});
  f.emit({type:'pdf-viewer-render',kind:'ready',visibilityEpoch:1});expect(f.onLoad).not.toHaveBeenCalled();
  f.emit({type:'pdf-viewer-render',kind:'ready',visibilityEpoch:2});expect(f.onLoad).toHaveBeenCalledTimes(1);
 });
 it('checks current geometry again before accepting an old visible receipt',()=>{
  const f=setup(960,828);
  f.size(0,0); // ResizeObserver delivery is intentionally still queued.
  f.emit({type:'pdf-viewer-render',kind:'ready',visibilityEpoch:1});
  expect(f.onLoad).not.toHaveBeenCalled();
  expect(f.post.mock.calls.at(-1)![0]).toMatchObject({active:false,epoch:2});
  f.size(960,828);notify();
  f.emit({type:'pdf-viewer-render',kind:'ready',visibilityEpoch:1});
  f.emit({type:'pdf-viewer-render',kind:'ready',visibilityEpoch:3});expect(f.onLoad).toHaveBeenCalledTimes(1);
 });
 it('requires document visibility and rejects foreign source origin key and stale epochs',()=>{
  const f=setup(960,828);
  visibility='hidden';document.dispatchEvent(new Event('visibilitychange'));
  f.emit({type:'pdf-viewer-render',kind:'ready',visibilityEpoch:2});expect(f.onLoad).not.toHaveBeenCalled();
  visibility='visible';document.dispatchEvent(new Event('visibilitychange'));
  const ready={type:'pdf-viewer-render',kind:'ready',visibilityEpoch:3};
  f.emit(ready,'https://foreign.test');
  f.emit(ready,window.location.origin,window);
  f.emit({...ready,renderInstanceKey:'TEST_ONLY_OLD_RENDER'});
  expect(f.onLoad).not.toHaveBeenCalled();
  f.emit(ready);expect(f.onLoad).toHaveBeenCalledTimes(1);
  f.emit({...ready,kind:'error'});expect(f.onError).toHaveBeenCalledTimes(1);
 });
 it('stops observers and event messages on disposal without changing ancestor security styles',()=>{
  const f=setup(960,828);const parent=document.createElement('div');parent.style.display='none';
  document.body.append(parent);parent.append(f.iframe);const before=parent.getAttribute('style');
  f.stop();const count=f.post.mock.calls.length;f.size(1000,800);notify();
  f.emit({type:'pdf-viewer-layout-request'});document.dispatchEvent(new Event('visibilitychange'));
  expect(f.post).toHaveBeenCalledTimes(count);expect(parent.getAttribute('style')).toBe(before);
  expect(f.onLoad).not.toHaveBeenCalled();
 });
});
