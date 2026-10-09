import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {ConsumerRepairRequestContent} from '../../src/features/consumerRepair/ConsumerRepairRequestChrome';
import {consumerRepairCanonicalReopenPending} from '../../src/features/consumerRepair/ConsumerRepairRequestScreenView';
import type {ConsumerRepairDraftBundle} from '../../src/lib/consumerRequests';

const mockPanelMount = jest.fn();
const mockPanelUnmount = jest.fn();
jest.mock('@expo/vector-icons',()=>({Ionicons:()=>null}));
jest.mock('../../src/features/catalog/CatalogItemPicker',()=>({CatalogItemPicker:()=>null}));
jest.mock('../../src/features/consumerRepair/ConsumerRepairHistory',()=>({ConsumerRepairHistory:()=>null}));
jest.mock('../../src/features/consumerRepair/ConsumerRepairMarketplaceSend',()=>({ConsumerRepairMarketplaceSend:()=>null}));
jest.mock('../../src/features/consumerRepair/ConsumerRepairMediaButtons',()=>({ConsumerRepairDeliveryFieldsCard:()=>null,ConsumerRepairRequestFormCard:()=>null}));
jest.mock('../../src/features/consumerRepair/ConsumerRepairDraftPanel',()=>({ConsumerRepairDraftPanel:()=>{
  const R=require('react') as typeof React;
  const [buyer,setBuyer]=R.useState(false);
  R.useEffect(()=>{mockPanelMount();return()=>{mockPanelUnmount();};},[]);
  return R.createElement('View',{},R.createElement('Text',{testID:'test-active-estimate-surface'},buyer?'buyer':'positions'),
    R.createElement('Pressable',{testID:'test-open-buyer',onPress:()=>setBuyer(true)}));
}}));
const revisionId='99282f67-e7c4-4855-a132-a6d2d953edbe';
const releaseId='e27ef06e-2723-588c-954e-d88b8b8d95a1';
function bundle(canonical=true):ConsumerRepairDraftBundle{
  return {draft:{id:'stable-ui-draft',consumerUserId:'ui-owner',problemText:'Монтаж трубы',status:'draft',missingData:[]},items:[],media:[],pdfs:[],events:[],
    structuredEstimatePayload:{workTitle:'Монтаж трубы'},
    ...(canonical?{durableHistorySummary:{sourceRevisionId:revisionId,sourceReleaseId:releaseId}}:{}),
  } as unknown as ConsumerRepairDraftBundle;
}
function content(current:ConsumerRepairDraftBundle){
  return React.createElement(ConsumerRepairRequestContent,{
    bundle:current,problemText:'',city:'',addressText:'',preferredTimeText:'',contactPhone:'',selectedWork:null,workSuggestions:[],
    approvedHistoryPage:{items:[]},revisionHistory:[],selectedHistoryId:null,aiAnswerRu:null,statusMessage:null,marketplaceSendErrors:[],
    catalogPickerVisible:false,showPdfAction:false,editingParam:null,
  } as unknown as React.ComponentProps<typeof ConsumerRepairRequestContent>);
}
describe('immutable canonical reopen projection',()=>{
  beforeEach(()=>jest.clearAllMocks());
  it.each([true,false])('keeps the chosen buyer surface when optional payload is compacted (canonical %s)',canonical=>{
    const original=bundle(canonical);let renderer!:TestRenderer.ReactTestRenderer;
    act(()=>{renderer=TestRenderer.create(content(original));});
    act(()=>renderer.root.findByProps({testID:'test-open-buyer'}).props.onPress());
    const compacted={...original,structuredEstimatePayload:null};
    act(()=>renderer.update(content(compacted)));
    expect(renderer.root.findByProps({testID:'test-active-estimate-surface'}).props.children).toBe('buyer');
    expect(mockPanelMount).toHaveBeenCalledTimes(1);expect(mockPanelUnmount).not.toHaveBeenCalled();
    act(()=>renderer.unmount());
  });
  it('withholds a previous revision until the exact requested immutable revision is available',()=>{
    const current=bundle();
    expect(consumerRepairCanonicalReopenPending(current,'907a000e-074e-4699-b0a6-42b4d3e74987')).toBe(true);
    expect(consumerRepairCanonicalReopenPending(null,revisionId)).toBe(true);
    expect(consumerRepairCanonicalReopenPending(current,revisionId.toUpperCase())).toBe(true);
    expect(consumerRepairCanonicalReopenPending(current,revisionId.toUpperCase(),revisionId)).toBe(false);
    expect(consumerRepairCanonicalReopenPending(current,null)).toBe(false);
    expect(current.structuredEstimatePayload?.workTitle).toBe('Монтаж трубы');
  });
  it('keeps accepted child revisions visible and waits again when the requested route changes',()=>{
    const childId='907a000e-074e-4699-b0a6-42b4d3e74987';
    const child={...bundle(),durableHistorySummary:{sourceRevisionId:childId,sourceReleaseId:releaseId}} as ConsumerRepairDraftBundle;
    expect(consumerRepairCanonicalReopenPending(child,revisionId,revisionId)).toBe(false);
    expect(consumerRepairCanonicalReopenPending(child,childId,revisionId)).toBe(true);
    expect(consumerRepairCanonicalReopenPending(child,childId,childId)).toBe(false);
    expect(consumerRepairCanonicalReopenPending(null,revisionId,revisionId)).toBe(true);
  });
});
