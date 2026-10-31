import React from 'react';
import TestRenderer,{act} from 'react-test-renderer';
import {Alert,Modal} from 'react-native';
import {ConsumerRepairRequestScreenView} from './ConsumerRepairRequestScreenView';
import {ConsumerRepairRequestContent,ConsumerRepairRequestStickyActions} from './ConsumerRepairRequestChrome';
import {useCanonicalOperationCompositionDiagnostic} from './useCanonicalOperationCompositionDiagnostic';

jest.mock('./useCanonicalOperationCompositionDiagnostic',()=>({useCanonicalOperationCompositionDiagnostic:jest.fn()}));
jest.mock('./ConsumerRepairRequestChrome',()=>({
 ConsumerRepairRequestContent:()=>null,ConsumerRepairRequestHeaderMarketButton:()=>null,
 ConsumerRepairRequestStickyActions:()=>null,consumerRepairNeedsFreshApproval:()=>false,
}));
jest.mock('../../components/layout/AppScreen',()=>({AppScreen:({children}:any)=>children}));
jest.mock('../../components/layout/AppScreenHeader',()=>({AppScreenHeader:()=>null}));
jest.mock('../../components/layout/AppScreenScroll',()=>({AppScreenScroll:({children}:any)=>children}));
jest.mock('../../lib/consumerRequests/consumerEstimateManualQuantityApproval',()=>({
 ...jest.requireActual('../../lib/consumerRequests/consumerEstimateManualQuantityApproval'),
 consumerEstimateManualQuantityApprovalCandidate:jest.fn(()=>null),consumerEstimateSavedPreliminaryApprovalCandidate:jest.fn(()=>null),
}));
jest.mock('../../lib/consumerRequests/consumerRequestExactRoadworksCalculationStateMigration',()=>({getConsumerRepairCalculationStateForReadOnlyDisplay:()=>null}));
jest.mock('../../lib/consumerRequests/consumerRequestValidationService',()=>({consumerRepairEstimateApprovalParameterErrors:()=>[],consumerRepairExactAsphaltApprovalErrors:()=>[]}));
const views:TestRenderer.ReactTestRenderer[]=[];
function fixture(){
 return{draft:{id:'saved-draft',status:'draft',consumerUserId:'owner'},items:[],
  structuredEstimatePayload:{canonicalBackend:{revisionId:'revision-a',releaseId:'release-a',checksumSha256:'a'.repeat(64)}}};
}
function render(bundle:any=fixture(),patch:Record<string,unknown>={}){
 const onOpenProcurement=jest.fn(),onMakePdf=jest.fn(),onOpenPdf=jest.fn(),onOpenPreliminaryReviewPdf=jest.fn();
 const props={state:{problemText:'',bundle,history:[],...patch},renderModel:{bundle,canonicalWorkSearch:{},workSuggestions:[],
  marketplaceSendErrors:[],approved:false,sent:false},problemInputRef:{current:null},
  onOpenProcurement,onMakePdf,onOpenPdf,onOpenPreliminaryReviewPdf}as unknown as React.ComponentProps<typeof ConsumerRepairRequestScreenView>;
 let view!:TestRenderer.ReactTestRenderer;
 act(()=>{view=TestRenderer.create(React.createElement(ConsumerRepairRequestScreenView,props));});views.push(view);
 return{view,props,get content(){return view.root.findByType(ConsumerRepairRequestContent).props;},
  onOpenProcurement,onMakePdf,onOpenPdf,onOpenPreliminaryReviewPdf};
}
afterEach(()=>{for(const view of views.splice(0))act(()=>view.unmount());jest.restoreAllMocks();});

test.each([false,true,null])('procurement keeps its own composition gate while PDF reads saved data: %s',pdfAllowed=>{
 jest.mocked(useCanonicalOperationCompositionDiagnostic).mockReturnValue(pdfAllowed===null?null:{
  state:'AVAILABLE',acceptance:{status:'COMPOSITION_UNVERIFIED',pdfAllowed}}as never);
 const alert=jest.spyOn(Alert,'alert').mockImplementation(()=>{}),h=render();
 act(()=>{expect(h.content.onOpenProcurement()).toBe(pdfAllowed!==false);h.content.onMakePdf();});
 expect(h.onOpenProcurement).toHaveBeenCalledTimes(pdfAllowed===false?0:1);
 expect(h.onMakePdf).toHaveBeenCalledTimes(1);
 expect(alert).toHaveBeenCalledTimes(pdfAllowed===false?1:0);
 expect(h.onOpenPreliminaryReviewPdf).not.toHaveBeenCalled();
});
test.each(['AVAILABLE','PENDING','UNAVAILABLE']as const)('PDF does not borrow ordinary diagnostic authority: %s',state=>{
 jest.mocked(useCanonicalOperationCompositionDiagnostic).mockReturnValue({state,
  acceptance:{status:'STRUCTURE_INVALID',pdfAllowed:false},revision:{contentWithdrawalReasonRu:'Withdrawn'}}as never);
 const h=render(),before=JSON.stringify(h.props.state.bundle);
 act(()=>h.content.onMakePdf());
 expect(h.onMakePdf).toHaveBeenCalledTimes(1);expect(h.view.root.findAllByType(Modal)).toHaveLength(0);
 expect(h.onOpenPreliminaryReviewPdf).not.toHaveBeenCalled();expect(JSON.stringify(h.props.state.bundle)).toBe(before);
});
test.each(['pending-edit','parameter-mutation','local-mismatch','withdrawal','unknown-quantities','unknown-prices','zero-known-rows']as const)
 ('saved report remains readable with %s and does not approve or save',reason=>{
 jest.mocked(useCanonicalOperationCompositionDiagnostic).mockReturnValue({state:'AVAILABLE',acceptance:{status:'STRUCTURE_INVALID',pdfAllowed:false}}as never);
 const b:any=fixture(),patch:Record<string,unknown>={};
 if(reason==='pending-edit')patch.pendingCanonicalRowEditCount=1;
 if(reason==='parameter-mutation')patch.canonicalParameterMutationBusy=true;
 if(reason==='local-mismatch')b.items=[{titleRu:'Unsaved edit',quantity:1000}];
 if(reason==='withdrawal')b.structuredEstimatePayload.canonicalBackend.contentWithdrawalReasonRu='Withdrawn';
 if(reason==='unknown-quantities')b.items=[{quantity:null}];
 if(reason==='unknown-prices')b.items=[{quantity:2,unitPrice:null}];
 const h=render(b,patch),before=JSON.stringify(b);
 act(()=>{h.content.onMakePdf();h.content.onOpenPdf();});
 expect(h.onMakePdf).toHaveBeenCalledTimes(1);expect(h.onOpenPdf).toHaveBeenCalledTimes(1);
 expect(h.view.root.findAllByType(Modal)).toHaveLength(0);expect(JSON.stringify(b)).toBe(before);
 expect(h.view.root.findByType(ConsumerRepairRequestStickyActions).props.pdfSavedSnapshotAvailable).toBe(true);
 expect(JSON.stringify(h.view.toJSON())).toContain('Несохранённые правки');
});
test('history PDF forwards its chosen saved draft and ignores current composition decision',()=>{
 jest.mocked(useCanonicalOperationCompositionDiagnostic).mockReturnValue({state:'AVAILABLE',acceptance:{status:'STRUCTURE_INVALID',pdfAllowed:false}}as never);
 const h=render();
 act(()=>h.content.onOpenPdf('explicit-history-draft'));
 expect(h.onOpenPdf).toHaveBeenCalledWith('explicit-history-draft');expect(h.onMakePdf).not.toHaveBeenCalled();
 expect(h.onOpenPreliminaryReviewPdf).not.toHaveBeenCalled();expect(h.view.root.findAllByType(Modal)).toHaveLength(0);
});
test('a local unsaved estimate does not claim a saved report target',()=>{
 jest.mocked(useCanonicalOperationCompositionDiagnostic).mockReturnValue(null);
 const h=render({draft:{id:'local-draft',status:'draft'},items:[]});
 expect(h.view.root.findByType(ConsumerRepairRequestStickyActions).props.pdfSavedSnapshotAvailable).toBe(false);
});
test('even accepted composition uses the same saved report read action rather than a confirmation flow',()=>{
 jest.mocked(useCanonicalOperationCompositionDiagnostic).mockReturnValue({state:'AVAILABLE',acceptance:{status:'ACCEPTED',pdfAllowed:true}}as never);
 const h=render();
 act(()=>h.content.onMakePdf());
 expect(h.onMakePdf).toHaveBeenCalledTimes(1);expect(h.onOpenPreliminaryReviewPdf).not.toHaveBeenCalled();
 expect(h.view.root.findAllByType(Modal)).toHaveLength(0);
});
