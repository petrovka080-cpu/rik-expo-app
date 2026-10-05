import type { DocumentAsset } from "../documents/pdfDocumentSessions";

export function webBrowserHasPdfViewer(): boolean {
  return typeof navigator === "undefined" || navigator.pdfViewerEnabled !== false;
}

export function needsPdfJsWebFallback(asset: DocumentAsset, uri: string): boolean {
  if (/^data:text\/html[;,]/i.test(uri)) return false;
  return !webBrowserHasPdfViewer() && (
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
let pdf=null,pageNumber=1,renderTask=null,sequence=0,visible=false,closed=false;
function signal(kind){parent.postMessage({type:'pdf-viewer-render',kind,renderInstanceKey:config.renderInstanceKey},config.parentOrigin);}
function fail(){if(closed)return;status.hidden=false;status.textContent='Не удалось отобразить PDF. Вернитесь и повторите открытие.';signal('error');}
async function render(){
 const request=++sequence;previous.disabled=true;next.disabled=true;
 renderTask?.cancel();
 try{
  const page=await pdf.getPage(pageNumber);if(closed||request!==sequence)return;
  const unscaled=page.getViewport({scale:1});
  const viewport=page.getViewport({scale:Math.min(960,Math.max(200,innerWidth-24))/unscaled.width});
  const ratio=Math.min(2,devicePixelRatio||1);
  canvas.width=Math.ceil(viewport.width*ratio);canvas.height=Math.ceil(viewport.height*ratio);
  canvas.style.width=viewport.width+'px';canvas.style.height=viewport.height+'px';
  const context=canvas.getContext('2d');if(!context)throw Error('Canvas unavailable');
  renderTask=page.render({canvas,canvasContext:context,viewport,transform:ratio===1?null:[ratio,0,0,ratio,0,0]});
  await renderTask.promise;if(closed||request!==sequence)return;
  canvas.hidden=false;status.hidden=true;canvas.setAttribute('aria-label','Страница '+pageNumber+' из '+pdf.numPages);
  counter.textContent=pageNumber+' / '+pdf.numPages;previous.disabled=pageNumber<=1;next.disabled=pageNumber>=pdf.numPages;
  page.cleanup();if(!visible){visible=true;signal('ready');}
 }catch(error){if(error?.name!=='RenderingCancelledException'&&request===sequence)fail();}
}
previous.onclick=()=>{if(pageNumber>1){pageNumber--;void render();}};
next.onclick=()=>{if(pageNumber<pdf.numPages){pageNumber++;void render();}};
let resizeFrame=null;
addEventListener('resize',()=>{if(pdf){cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>void render());}});
let loading=null;
void (async()=>{try{
 const {getDocument,GlobalWorkerOptions}=await import(config.parentOrigin+'/pdfjs/pdf.mjs');
 if(closed)return;GlobalWorkerOptions.workerSrc=config.parentOrigin+'/pdfjs/pdf.worker.mjs';
 loading=getDocument({url:config.uri,isEvalSupported:false,useSystemFonts:true,disableAutoFetch:true,
  wasmUrl:config.parentOrigin+'/pdfjs/wasm/',cMapUrl:config.parentOrigin+'/pdfjs/cmaps/',cMapPacked:true,
  standardFontDataUrl:config.parentOrigin+'/pdfjs/standard_fonts/'});
 const document=await loading.promise;if(closed){void document.destroy();return;}pdf=document;void render();
}catch{fail();}})();
addEventListener('pagehide',()=>{closed=true;sequence++;renderTask?.cancel();void loading?.destroy();});
</script></body></html>`;
}
