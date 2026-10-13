import React from 'react';
import TestRenderer, {act, type ReactTestRenderer} from 'react-test-renderer';
import {ConsumerRepairItemRow} from './ConsumerRepairItemRow';
import {ConsumerRepairRequestStickyActions} from './ConsumerRepairRequestChrome';
import {RequestEstimateSummaryCard} from './RequestEstimateSummaryCard';
import {consumerRepairCanonicalMissingObjectParameterCount,consumerRepairCanonicalEstimateBlocksApproval} from './consumerRepairCanonicalEstimateReadiness';
import type {CanonicalParameterSession} from '../../lib/estimate/canonicalParameters';

jest.mock('@expo/vector-icons',()=>({Ionicons:()=>null}));
const noop=()=>{};
const norm={parameterId:'fastener_norm',titleRu:'Расход крепежа',sourceConfirmationRequired:true,
 valueSourceRole:'UNRESOLVED_APPLICATION_NORM',visibilityRole:'INTERNAL_ONLY'};
const item:React.ComponentProps<typeof ConsumerRepairItemRow>['item']={id:'pending-fastener',requestDraftId:'draft',
 itemType:'material',titleRu:'Требует проверки в проекте — крепеж для плоской кровли',quantity:null,unit:'piece',
 currency:'KGS',source:'custom',editableByConsumer:true,createdAt:'2026-10-13T06:00:00Z',sourceParameters:{
 canonicalPreliminaryNeed:true,payable:false,canonicalCostTreatment:'INFORMATIONAL_SCOPE',missingParameterRequirements:[norm]}};
function render(element:React.ReactElement){let renderer!:ReactTestRenderer;act(()=>{renderer=TestRenderer.create(element);});return renderer;}

test('a missing application norm has a normal name and no customer confirmation or manual quantity question',()=>{
 const before=JSON.stringify(item),remove=jest.fn();
 const r=render(<ConsumerRepairItemRow item={item} onDecrease={noop} onIncrease={noop} onQuantityChange={noop} onUnitPriceChange={noop} onRemove={remove}/>);
 expect(r.root.findAllByProps({testID:'consumer-repair-item-unresolved-notice-pending-fastener'})).toHaveLength(0);
 expect(r.root.findAllByProps({testID:'consumer-repair-item-quantity-input-pending-fastener'})).toHaveLength(0);
 expect(r.root.findByProps({testID:'consumer-repair-item-title-pending-fastener'}).props.children).toBe('Крепеж для плоской кровли');
 expect(r.root.findAll(node=>typeof node.type==='string' && node.props.testID==='consumer-repair-item-application-pending-pending-fastener')).toHaveLength(1);
 expect(JSON.stringify(item)).toBe(before);act(()=>r.unmount());
});

test('a real missing object fact remains a question even when the same row also lacks a norm',()=>{
 const mixed={...item,sourceParameters:{...item.sourceParameters,missingParameterRequirements:[norm,
   {parameterId:'fastener_base',titleRu:'Основание крепления',sourceConfirmationRequired:false}]}};
 const r=render(<ConsumerRepairItemRow item={mixed} onDecrease={noop} onIncrease={noop} onQuantityChange={noop} onUnitPriceChange={noop} onRemove={noop}/>);
 expect(r.root.findAll(node=>typeof node.type==='string' && node.props.testID==='consumer-repair-item-unresolved-notice-pending-fastener')).toHaveLength(1);
 expect(JSON.stringify(r.toJSON())).toContain('Заполните в исходных данных: Основание крепления.');act(()=>r.unmount());
});

test('source gaps are absent from the customer question count without admitting an incomplete estimate',()=>{
 const session={parameters:[],blockingMissingParameterIds:['fastener_norm','q'],contractMissingParameterIds:[],invalidParameterIds:[],status:'BLOCKING_REQUIRED'} as unknown as CanonicalParameterSession;
 expect(consumerRepairCanonicalMissingObjectParameterCount(session,['fastener_norm'])).toBe(1);
 const sourcesOnly={...session,blockingMissingParameterIds:['fastener_norm']};
 expect(consumerRepairCanonicalMissingObjectParameterCount(sourcesOnly,['fastener_norm'])).toBe(0);
 expect(consumerRepairCanonicalEstimateBlocksApproval(sourcesOnly)).toBe(true);
 const r=render(<ConsumerRepairRequestStickyActions approved={false} sent={false} hasBundle hasSnapshot
   approvalBlockedByEstimate approvalBlockedByParameters approvalMissingObjectParameterCount={0} approvalUnresolvedRowCount={59}
   onOpenPdf={noop} onMakePdf={noop} onCreateNew={noop} onDeleteDraft={noop} onApproveDraft={noop} onPrepareDraft={noop}/>);
 const text=JSON.stringify(r.toJSON());expect(text).not.toContain('Укажите необходимые данные объекта');
 expect(text).toContain('Приложение ещё не рассчитало весь состав');expect(r.root.findByProps({testID:'consumer-repair-approve'}).props.disabled).toBe(true);act(()=>r.unmount());
});

test('the summary describes unfinished calculation rather than assigning source checks to the customer',()=>{
 const vm={title:'Стяжка25мм',summary:'',visibleLines:[],preliminaryNeedCount:59,calculatedItemCount:8,
 consumerQuestionCount:0,sourceGates:[{parameterId:'fastener_norm'}]} as unknown as React.ComponentProps<typeof RequestEstimateSummaryCard>['viewModel'];
 const r=render(<RequestEstimateSummaryCard viewModel={vm} missingParameterCount={0}/>),text=JSON.stringify(r.toJSON());
 expect(text).toContain('Данные объекта заполнены');expect(text).not.toContain('требуют подтверждённого источника');
 expect(text).not.toContain('требующих уточнения');expect(text).toContain('Пока не рассчитано: 59');act(()=>r.unmount());
});
