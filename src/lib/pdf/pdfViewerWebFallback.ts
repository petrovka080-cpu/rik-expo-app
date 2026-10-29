import type { DocumentAsset } from "../documents/pdfDocumentSessions";

export function webBrowserHasPdfViewer(): boolean {
  return typeof navigator === "undefined" || navigator.pdfViewerEnabled !== false;
}

export function needsPdfJsWebFallback(asset: DocumentAsset, uri: string): boolean {
  if (/^data:text\/html[;,]/i.test(uri)) return false;
  // Generated estimate PDFs need a positive page-render receipt. Some browser
  // hosts advertise their PDF plugin while displaying only an empty frame.
  const generatedEstimate = typeof window !== "undefined" && asset.documentType === "request" && asset.source === "generated";
  return (generatedEstimate || !webBrowserHasPdfViewer()) && (
    asset.mimeType === "application/pdf" ||
    String(asset.fileName ?? "").toLowerCase().endsWith(".pdf") ||
    /^data:application\/pdf[;,]/i.test(uri)
  );
}

export function buildPdfViewerWebFallbackHtml(uri: string, renderInstanceKey: string, parentOrigin: string): string {
  // Script data must not close the element even when a document URI is untrusted.
  const config = JSON.stringify({ uri, renderInstanceKey, parentOrigin }).replace(/</g, "\\u003c");
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
html,body{margin:0;height:100%;background:#262626;color:white;font:14px system-ui}
nav{position:sticky;top:0;display:flex;align-items:center;justify-content:center;gap:16px;padding:10px;background:#111;z-index:1}
button{padding:8px 14px;border:1px solid #777;border-radius:6px;background:#333;color:white;cursor:pointer}button:disabled{opacity:.4;cursor:default}
main{padding:12px;overflow:auto;text-align:center}canvas{display:block;margin:auto;background:white;max-width:100%;box-shadow:0 2px 10px #000}canvas[hidden]{display:none}#status{padding:16px}
</style></head><body><nav aria-label="Страницы PDF">
<button id="previous" disabled aria-label="Предыдущая страница">Назад</button>
<span id="counter" aria-live="polite">Открывается…</span>
<button id="next" disabled aria-label="Следующая страница">Далее</button></nav>
<main><div id="status" role="status">Открывается PDF…</div><canvas id="page" role="img" hidden></canvas></main>
<script type="module">
const config=${config};
const canvas=document.getElementById('page'),status=document.getElementById('status'),counter=document.getElementById('counter');
const previous=document.getElementById('previous'),next=document.getElementById('next');
let pdf=null,pageNumber=1,renderTask=null,sequence=0,closed=false;
let active=false,visibilityEpoch=0,layoutWidth=0,layoutHeight=0,dirty=true,readyEpoch=0;
let renderFrame=null,readyFrame=null,loading=null,failed=false;
function usable(){return !closed&&active&&layoutWidth>0&&layoutHeight>0&&document.visibilityState==='visible';}
function signal(kind){if(usable())parent.postMessage({type:'pdf-viewer-render',kind,renderInstanceKey:config.renderInstanceKey,visibilityEpoch},config.parentOrigin);}
function requestLayout(){if(!closed)parent.postMessage({type:'pdf-viewer-layout-request',renderInstanceKey:config.renderInstanceKey},config.parentOrigin);}
function invalidate(){
 sequence++;dirty=true;readyEpoch=0;renderTask?.cancel();renderTask=null;
 if(renderFrame!==null)cancelAnimationFrame(renderFrame);
 if(readyFrame!==null)cancelAnimationFrame(readyFrame);
 renderFrame=null;readyFrame=null;previous.disabled=true;next.disabled=true;
}
function fail(){if(closed)return;failed=true;status.hidden=false;status.textContent='Не удалось отобразить PDF. Вернитесь и повторите открытие.';signal('error');}
function scheduleRender(){
 dirty=true;previous.disabled=true;next.disabled=true;
 if(!pdf||!usable()||renderFrame!==null)return;
 renderFrame=requestAnimationFrame(()=>{renderFrame=null;if(usable()&&dirty)void render();});
}
async function render(){
 if(!pdf||!usable())return;
 const request=++sequence,epoch=visibilityEpoch,selectedPage=pageNumber;
 dirty=false;previous.disabled=true;next.disabled=true;renderTask?.cancel();
 const current=()=>usable()&&request===sequence&&epoch===visibilityEpoch;
 try{
  const page=await pdf.getPage(selectedPage);if(!current())return;
  const unscaled=page.getViewport({scale:1});
  const viewport=page.getViewport({scale:Math.min(960,Math.max(200,layoutWidth-24))/unscaled.width});
  const ratio=Math.min(2,devicePixelRatio||1);
  // The first page is rendered into a visible, positive-layout white surface.
  // Parent auth display:none remains authoritative and is never changed here.
  canvas.hidden=false;canvas.style.background='white';
  canvas.width=Math.ceil(viewport.width*ratio);canvas.height=Math.ceil(viewport.height*ratio);
  canvas.style.width=viewport.width+'px';canvas.style.height=viewport.height+'px';
  const context=canvas.getContext('2d');if(!context)throw Error('Canvas unavailable');
  context.save();context.fillStyle='white';context.fillRect(0,0,canvas.width,canvas.height);context.restore();
  renderTask=page.render({canvas,canvasContext:context,viewport,transform:ratio===1?null:[ratio,0,0,ratio,0,0]});
  await renderTask.promise;if(!current())return;
  readyFrame=requestAnimationFrame(()=>{
   readyFrame=null;if(!current())return;
   status.hidden=true;canvas.setAttribute('aria-label','Страница '+selectedPage+' из '+pdf.numPages);
   counter.textContent=selectedPage+' / '+pdf.numPages;previous.disabled=selectedPage<=1;next.disabled=selectedPage>=pdf.numPages;
   page.cleanup();if(readyEpoch!==epoch){readyEpoch=epoch;signal('ready');}
  });
 }catch(error){if(error?.name!=='RenderingCancelledException'&&current())fail();}
}
addEventListener('message',event=>{
 if(closed||event.source!==parent||event.origin!==config.parentOrigin)return;
 const message=event.data;
 if(message?.type!=='pdf-viewer-visibility'||message.renderInstanceKey!==config.renderInstanceKey
  ||!Number.isSafeInteger(message.epoch)||message.epoch<visibilityEpoch||typeof message.active!=='boolean'
  ||!Number.isFinite(message.width)||!Number.isFinite(message.height)
  ||message.width<0||message.height<0||message.width>16384||message.height>16384
  ||message.active&&(message.width<=0||message.height<=0))return;
 // A local visibility interruption may be faster than the parent's sampling.
 // Its same-epoch handshake grants no new authority and may only resume dirty
 // work for the exact geometry/active state that was already accepted.
 if(message.epoch===visibilityEpoch){
  if(message.active===active&&message.width===layoutWidth&&message.height===layoutHeight&&dirty&&usable()){
   if(failed)signal('error');else scheduleRender();
  }
  return;
 }
 invalidate();visibilityEpoch=message.epoch;active=message.active;layoutWidth=message.width;layoutHeight=message.height;
 if(!usable()){canvas.hidden=true;return;}
 if(failed){signal('error');return;}
 scheduleRender();
});
previous.onclick=()=>{if(usable()&&pageNumber>1){pageNumber--;scheduleRender();}};
next.onclick=()=>{if(usable()&&pdf&&pageNumber<pdf.numPages){pageNumber++;scheduleRender();}};
document.addEventListener('visibilitychange',()=>{
 if(document.visibilityState!=='visible'){invalidate();canvas.hidden=true;}
 requestLayout();
});
addEventListener('resize',requestLayout);
requestLayout();
void (async()=>{try{
 const {getDocument,GlobalWorkerOptions}=await import(config.parentOrigin+'/pdfjs/pdf.mjs');
 if(closed)return;GlobalWorkerOptions.workerSrc=config.parentOrigin+'/pdfjs/pdf.worker.mjs';
 loading=getDocument({url:config.uri,isEvalSupported:false,useSystemFonts:true,disableAutoFetch:true,
  wasmUrl:config.parentOrigin+'/pdfjs/wasm/',cMapUrl:config.parentOrigin+'/pdfjs/cmaps/',cMapPacked:true,
  standardFontDataUrl:config.parentOrigin+'/pdfjs/standard_fonts/'});
 const document=await loading.promise;if(closed){void document.destroy();return;}pdf=document;scheduleRender();
}catch{fail();}})();
addEventListener('pagehide',()=>{closed=true;invalidate();void loading?.destroy();});
</script></body></html>`;
}
