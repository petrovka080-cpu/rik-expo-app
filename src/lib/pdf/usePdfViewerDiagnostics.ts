import React from 'react';
import type {DocumentAsset,DocumentSession} from '../documents/pdfDocumentSessions';
import type {PdfViewerPlatform} from './pdfViewerContract';
import {resolvePdfViewerReadinessModel,type PdfViewerContentModel} from './pdfViewer.readiness';
import {redactSensitiveText} from '../security/redaction';

type Ref<T>=Readonly<{current:T}>;
type Snapshot={session:DocumentSession|null;asset:DocumentAsset|null};
export type PdfViewerDiagnosticArgs={
  contentModel:PdfViewerContentModel;asset:DocumentAsset|null;sessionId:string;platform:PdfViewerPlatform;
  isMountedRef:Ref<boolean>;backDispatchedRef:Ref<boolean>;viewerCycleRef:Ref<number>;attemptGeneration:number;viewerRouteKey:string;
  getCurrentRouteKey:()=>string|undefined;resolveSnapshot:()=>Snapshot;
  logError:(label:string,payload:Record<string,unknown>)=>void;
};

/** A diagnostic captured during preparation must still describe the current
 * route, attempt and registry snapshot when the effect actually runs. */
export function emitCurrentPdfViewerDiagnostic(args:PdfViewerDiagnosticArgs,attemptAtRender:number):void{
  if(!args.isMountedRef.current||args.backDispatchedRef.current||args.getCurrentRouteKey()!==args.viewerRouteKey||args.viewerCycleRef.current!==attemptAtRender)return;
  const kind=args.contentModel.kind;
  if(kind!=='empty'&&kind!=='error'&&kind!=='missing-asset')return;
  const latest=args.resolveSnapshot();
  if(latest.session&&latest.session.sessionId!==args.sessionId)return;
  const readiness=resolvePdfViewerReadinessModel({...latest,platform:args.platform});
  if(kind==='empty'){
    if(latest.session)return;
    args.logError('[pdf-viewer] viewer_missing_session',{platform:args.platform,sessionId:args.sessionId});return;
  }
  // A newer preparing or valid snapshot invalidates a captured failure. Real
  // render/session failures persist in the registry and still log as errors.
  if(readiness.initialState!=='error')return;
  if(args.asset?.assetId!==latest.asset?.assetId||args.asset?.uri!==latest.asset?.uri)return;
  if(kind==='error'){
    const model=args.contentModel as Extract<PdfViewerContentModel,{kind:'error'}>;
    const latestError=latest.session?.errorMessage;
    if(latestError&&latestError!==model.subtitle)return;
    args.logError('[pdf-viewer] viewer_error_state',{platform:args.platform,sessionId:args.sessionId,errorText:redactSensitiveText(model.subtitle),uri:latest.asset?.uri??null,scheme:latest.asset?.uri?.split(':')[0]??'unknown'});return;
  }
  if(readiness.resolvedSource.kind!=='missing-asset')return;
  args.logError('[pdf-viewer] viewer_invalid_asset',{platform:args.platform,sessionId:args.sessionId,hasAsset:Boolean(latest.asset),uri:latest.asset?.uri??null});
}
export function usePdfViewerDiagnostics(args:PdfViewerDiagnosticArgs):void{
  const attemptAtRender=args.attemptGeneration;
  React.useEffect(()=>emitCurrentPdfViewerDiagnostic(args,attemptAtRender),[
    args.asset,args.contentModel,args.sessionId,args.platform,args.isMountedRef,args.backDispatchedRef,args.viewerCycleRef,args.viewerRouteKey,args.getCurrentRouteKey,args.resolveSnapshot,args.logError,attemptAtRender,
  ]);
}
