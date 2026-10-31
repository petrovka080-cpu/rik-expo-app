/** @jest-environment jsdom */
import {createContext,runInContext} from 'node:vm';
import {buildPdfViewerWebFallbackHtml} from './pdfViewerWebFallback';

describe('actual PDF fallback child script visibility epochs',()=>{
 const origin='http://localhost',key='TEST_ONLY_RENDER',uri='blob:TEST_ONLY_SAME_PDF';
 async function settle(){for(let index=0;index<12;index++)await Promise.resolve();}
 function boot(){
  const html=buildPdfViewerWebFallbackHtml(uri,key,origin);
  const doc=new DOMParser().parseFromString(html,'text/html');
  let visibility:DocumentVisibilityState='visible';
  Object.defineProperty(doc,'visibilityState',{configurable:true,get:()=>visibility});
  const canvas=doc.getElementById('page') as HTMLCanvasElement;
  const context={save:jest.fn(),restore:jest.fn(),fillRect:jest.fn(),fillStyle:''};
  jest.spyOn(canvas,'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D);
  const frames=new Map<number,FrameRequestCallback>();let frameSequence=0;
  const listeners=new Map<string,Set<(event:unknown)=>void>>();
  const parent={postMessage:jest.fn()};
  const tasks:{resolve:()=>void;cancel:jest.Mock;promise:Promise<void>}[]=[];
  const render=jest.fn(({canvas:surface}:{canvas:HTMLCanvasElement})=>{
   expect(surface.hidden).toBe(false);expect(surface.style.background).toBe('white');
   expect(context.fillRect).toHaveBeenLastCalledWith(0,0,surface.width,surface.height);
   let resolve!:()=>void;const promise=new Promise<void>(done=>{resolve=done;});
   const task={promise,resolve,cancel:jest.fn()};tasks.push(task);return task;
  });
  const page={getViewport:({scale}:{scale:number})=>({width:100*scale,height:200*scale}),render,cleanup:jest.fn()};
  const pdf={numPages:2,getPage:jest.fn(async(_number:number)=>page),destroy:jest.fn()};
  const loading={promise:Promise.resolve(pdf),destroy:jest.fn()};
  const getDocument=jest.fn((_input:Record<string,unknown>)=>loading);
  const module=jest.fn(async()=>({getDocument,GlobalWorkerOptions:{workerSrc:''}}));
  const code=doc.querySelector('script')!.textContent!;
  const originalImport="await import(config.parentOrigin+'/pdfjs/pdf.mjs')";
  expect(code.split(originalImport)).toHaveLength(2);
  // Execute the actual generated child program. Only its native PDF.js import
  // boundary is replaced; no render/epoch/ready predicate is copied or bypassed.
  runInContext(code.replace(originalImport,'await __PDF_MODULE__()'),createContext({
   document:doc,parent,devicePixelRatio:1,innerWidth:960,__PDF_MODULE__:module,
   requestAnimationFrame:(callback:FrameRequestCallback)=>{const id=++frameSequence;frames.set(id,callback);return id;},
   cancelAnimationFrame:(id:number)=>frames.delete(id),
   addEventListener:(type:string,callback:(event:unknown)=>void)=>{
    const group=listeners.get(type)??new Set();group.add(callback);listeners.set(type,group);
   },
  }),{timeout:1000});
  const emit=(type:string,event:unknown={})=>listeners.get(type)?.forEach(callback=>callback(event));
  const visibilityMessage=(epoch:number,active=true,width=960,height=828,extra:Record<string,unknown>={})=>
   emit('message',{source:parent,origin,data:{type:'pdf-viewer-visibility',renderInstanceKey:key,epoch,active,
    width:active?width:0,height:active?height:0,...extra}});
  const runFrame=()=>{const first=frames.entries().next().value as [number,FrameRequestCallback]|undefined;
   if(!first)throw new Error('TEST_ONLY_EXPECTED_QUEUED_FRAME');frames.delete(first[0]);first[1](0);};
  const receipts=()=>parent.postMessage.mock.calls.filter(([message])=>message.type==='pdf-viewer-render');
  return{doc,canvas,frames,parent,tasks,pdf,loading,module,getDocument,render,emit,visibilityMessage,runFrame,receipts,
   visibility:(value:DocumentVisibilityState)=>{visibility=value;doc.dispatchEvent(new Event('visibilitychange'));}};
 }
 it('waits zero to positive layout and signals READY only after render promise and the next frame',async()=>{
  const f=boot();await settle();f.visibilityMessage(1,false);expect(f.frames.size).toBe(0);
  expect(f.render).not.toHaveBeenCalled();expect(f.receipts()).toHaveLength(0);
  f.visibilityMessage(2);expect(f.frames.size).toBe(1);f.runFrame();await settle();
  expect(f.render).toHaveBeenCalledTimes(1);expect(f.canvas.hidden).toBe(false);expect(f.receipts()).toHaveLength(0);
  f.tasks[0]!.resolve();await settle();expect(f.receipts()).toHaveLength(0);
  f.runFrame();expect(f.receipts()).toEqual([[{type:'pdf-viewer-render',kind:'ready',renderInstanceKey:key,visibilityEpoch:2},origin]]);
  expect(f.getDocument).toHaveBeenCalledTimes(1);expect(f.getDocument.mock.calls[0][0]).toMatchObject({url:uri});
 });
 it('cancels hidden work and coalesces rapid resume into one render of the same selected page',async()=>{
  const f=boot();await settle();f.visibilityMessage(1);f.runFrame();await settle();
  f.tasks[0]!.resolve();await settle();f.runFrame();
  (f.doc.getElementById('next') as HTMLButtonElement).click();f.runFrame();await settle();
  expect(f.pdf.getPage.mock.calls.map(([number])=>number)).toEqual([1,2]);
  f.visibilityMessage(2,false);expect(f.tasks[1]!.cancel).toHaveBeenCalled();
  f.visibilityMessage(3);f.visibilityMessage(4,true,1000,800);f.visibilityMessage(4,true,1000,800);
  expect(f.frames.size).toBe(1);f.tasks[1]!.resolve();await settle();
  expect(f.receipts().map(([message])=>message.visibilityEpoch)).toEqual([1]);
  f.runFrame();await settle();expect(f.pdf.getPage.mock.calls.map(([number])=>number)).toEqual([1,2,2]);
  f.tasks[2]!.resolve();await settle();f.runFrame();
  expect(f.receipts().map(([message])=>message.visibilityEpoch)).toEqual([1,4]);
  expect(f.getDocument).toHaveBeenCalledTimes(1);expect(f.module).toHaveBeenCalledTimes(1);
  expect(f.canvas.getAttribute('aria-label')).toBe('Страница 2 из 2');
 });
 it('never signals visible READY when hidden between render completion and frame commit',async()=>{
  const f=boot();await settle();f.visibilityMessage(1);f.runFrame();await settle();
  f.tasks[0]!.resolve();await settle();expect(f.frames.size).toBe(1);
  f.visibilityMessage(2,false);expect(f.frames.size).toBe(0);expect(f.canvas.hidden).toBe(true);
  expect(f.receipts()).toHaveLength(0);expect(f.getDocument).toHaveBeenCalledTimes(1);
 });
 it.each(['origin','source','key','nonpositive','malformed-epoch'])('rejects %s messages without render or new document load',async field=>{
  const f=boot();await settle();
  const data={type:'pdf-viewer-visibility',renderInstanceKey:key,epoch:1,active:true,width:960,height:828};
  if(field==='key')data.renderInstanceKey='TEST_ONLY_FOREIGN_KEY';
  if(field==='nonpositive')data.width=0;
  if(field==='malformed-epoch')data.epoch=1.5;
  f.emit('message',{source:field==='source'?{}:f.parent,origin:field==='origin'?'https://foreign.test':origin,data});
  expect(f.frames.size).toBe(0);expect(f.render).not.toHaveBeenCalled();expect(f.receipts()).toHaveLength(0);
  expect(f.getDocument).toHaveBeenCalledTimes(1);
 });
 it('invalidates local page visibility before a late parent message and resumes only with a new epoch',async()=>{
  const f=boot();await settle();f.visibilityMessage(1);f.runFrame();await settle();
  f.visibility('hidden');f.tasks[0]!.resolve();await settle();
  expect(f.receipts()).toHaveLength(0);expect(f.canvas.hidden).toBe(true);
  f.visibilityMessage(2,false);f.visibility('visible');
  expect(f.frames.size).toBe(0);
  expect(f.parent.postMessage.mock.calls.at(-1)![0]).toMatchObject({type:'pdf-viewer-layout-request',renderInstanceKey:key});
  f.visibilityMessage(3);f.runFrame();await settle();f.tasks[1]!.resolve();await settle();f.runFrame();
  expect(f.receipts().map(([message])=>message.visibilityEpoch)).toEqual([3]);
 });
 it('resumes local hidden visibility with exact same-epoch authority and one current-page receipt',async()=>{
  const f=boot();await settle();f.visibilityMessage(5);f.runFrame();await settle();
  f.tasks[0]!.resolve();await settle();f.runFrame();
  (f.doc.getElementById('next') as HTMLButtonElement).click();f.runFrame();await settle();
  f.tasks[1]!.resolve();await settle();f.runFrame();
  expect(f.receipts().map(([message])=>message.visibilityEpoch)).toEqual([5]);
  f.visibility('hidden');f.visibility('visible');expect(f.frames.size).toBe(0);
  f.visibilityMessage(5,true,800,600); // A contradictory equal-epoch shape grants nothing.
  expect(f.frames.size).toBe(0);
  f.visibilityMessage(5);f.visibilityMessage(5);f.visibilityMessage(4,false);
  expect(f.frames.size).toBe(1);f.runFrame();await settle();
  expect(f.pdf.getPage.mock.calls.map(([number])=>number)).toEqual([1,2,2]);
  f.tasks[2]!.resolve();await settle();expect(f.receipts()).toHaveLength(1);
  f.runFrame();expect(f.receipts().map(([message])=>message.visibilityEpoch)).toEqual([5,5]);
  expect(f.canvas.getAttribute('aria-label')).toBe('Страница 2 из 2');
  f.visibilityMessage(5);expect(f.frames.size).toBe(0);expect(f.render).toHaveBeenCalledTimes(3);
  expect(f.getDocument).toHaveBeenCalledTimes(1);expect(f.module).toHaveBeenCalledTimes(1);
  expect(f.getDocument.mock.calls[0][0]).toMatchObject({url:uri});
 });
 it('ignores same and older epochs after one usable activation',async()=>{
  const f=boot();await settle();f.visibilityMessage(2);f.visibilityMessage(2);f.visibilityMessage(1,false);
  expect(f.frames.size).toBe(1);f.runFrame();await settle();f.tasks[0]!.resolve();await settle();f.runFrame();
  f.visibilityMessage(2);expect(f.frames.size).toBe(0);expect(f.render).toHaveBeenCalledTimes(1);
  expect(f.getDocument).toHaveBeenCalledTimes(1);expect(f.receipts()).toHaveLength(1);
 });
 it('closes pagehide without accepting a stale render completion or reopening the document',async()=>{
  const f=boot();await settle();f.visibilityMessage(1);f.runFrame();await settle();
  f.emit('pagehide');f.tasks[0]!.resolve();await settle();f.visibilityMessage(2);
  expect(f.tasks[0]!.cancel).toHaveBeenCalled();expect(f.loading.destroy).toHaveBeenCalledTimes(1);
  expect(f.frames.size).toBe(0);expect(f.receipts()).toHaveLength(0);expect(f.getDocument).toHaveBeenCalledTimes(1);
 });
});
