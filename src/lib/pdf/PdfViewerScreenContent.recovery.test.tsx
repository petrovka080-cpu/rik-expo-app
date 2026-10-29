import React from 'react';
import TestRenderer,{act} from 'react-test-renderer';
import {Text} from 'react-native';
import {PdfViewerScreenContent} from './PdfViewerScreenContent';
import {resolvePdfViewerContentModel} from './pdfViewer.readiness';
jest.mock('@expo/vector-icons',()=>({Ionicons:()=>null}));
function propsFor(canRecover:boolean,missingAsset=false):React.ComponentProps<typeof PdfViewerScreenContent>{
 const noop=()=>{},contentModel=resolvePdfViewerContentModel({state:missingAsset?'ready':'empty',errorText:'',asset:null,
  resolvedSource:missingAsset?{kind:'missing-asset'}:{kind:'missing-session'},isReadyToRender:true,hasRenderableSource:false,canRecoverCanonical:canRecover});
 return{title:'PDF',showChrome:true,headerHeight:50,topInset:0,menuOpen:false,asset:null,contentModel,width:700,
  renderInstanceKey:'TEST_ONLY_RENDER',webEmbeddedUri:'',nativeHandoffCompleted:false,nativePdfWebView:null,
  resolvedSource:{kind:'missing-session'},showPageIndicator:false,pageIndicatorText:'',
  onBack:jest.fn(),onToggleMenu:noop,onShare:noop,onDownload:noop,onOpenExternal:noop,onPrint:noop,onRetry:jest.fn(),onToggleChrome:noop,
  onOpenAgain:noop,onWebLoad:noop,onWebError:noop,onNativeLoadStart:noop,onNativeLoadEnd:noop,onNativeError:noop,onNativeHttpError:noop,onNativeRenderProcessGone:noop};
}
function pressLabel(renderer:TestRenderer.ReactTestRenderer,label:string){
 const text=renderer.root.findAllByType(Text).find(node=>node.props.children===label);
 if(!text)throw new Error('TEST_ONLY_VISIBLE_ACTION_MISSING:'+label);
 let action:TestRenderer.ReactTestInstance|null=text;
 while(action&&typeof action.props.onPress!=='function')action=action.parent;
 if(!action)throw new Error('TEST_ONLY_ACTION_HANDLER_MISSING');
 const onPress=action.props.onPress;act(()=>onPress());
}
it.each([false,true])('offers working Russian exact-version reopen and safe return for missingAsset=%s',missingAsset=>{
 const props=propsFor(true,missingAsset);let renderer:TestRenderer.ReactTestRenderer;
 act(()=>{renderer=TestRenderer.create(<PdfViewerScreenContent {...props}/>);});
 try{
  expect(JSON.stringify(renderer!.toJSON())).toContain('Просмотр PDF недоступен');
  pressLabel(renderer!,'Открыть сохранённую версию');expect(props.onRetry).toHaveBeenCalledTimes(1);expect(props.onBack).not.toHaveBeenCalled();
  pressLabel(renderer!,'Вернуться к смете');expect(props.onBack).toHaveBeenCalledTimes(1);
 }finally{act(()=>renderer!.unmount());}
});
it('offers only a working safe return if all canonical target metadata is unavailable',()=>{
 const props=propsFor(false);let renderer:TestRenderer.ReactTestRenderer;
 act(()=>{renderer=TestRenderer.create(<PdfViewerScreenContent {...props}/>);});
 try{
  expect(JSON.stringify(renderer!.toJSON())).not.toContain('Открыть сохранённую версию');
  pressLabel(renderer!,'Вернуться к смете');expect(props.onBack).toHaveBeenCalledTimes(1);expect(props.onRetry).not.toHaveBeenCalled();
 }finally{act(()=>renderer!.unmount());}
});
