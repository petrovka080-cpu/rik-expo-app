import React from 'react';
import TestRenderer, {act, type ReactTestRenderer} from 'react-test-renderer';
import {ConsumerRepairItemRow} from './ConsumerRepairItemRow';
import {ConsumerRepairRequestStickyActions} from './ConsumerRepairRequestChrome';
import {RequestEstimateSummaryCard} from './RequestEstimateSummaryCard';
import {RequestEstimateItemsEditor} from './RequestEstimateItemsEditor';
import {consumerRepairCanonicalMissingObjectParameterCount,consumerRepairCanonicalEstimateBlocksApproval} from './consumerRepairCanonicalEstimateReadiness';
import type {CanonicalParameterSession} from '../../lib/estimate/canonicalParameters';
import {registerConsumerRepairRowVerifiedPresentation} from './consumerRepairRowMetadata';
import {consumerEstimateManualPreliminaryItems} from '../../lib/consumerRequests/consumerEstimateReadiness';

jest.mock('@expo/vector-icons',()=>({Ionicons:()=>null}));
const noop=()=>{};
const norm={parameterId:'fastener_norm',titleRu:'Расход крепежа',sourceConfirmationRequired:true,
 valueSourceRole:'UNRESOLVED_APPLICATION_NORM',visibilityRole:'INTERNAL_ONLY'};
const item:React.ComponentProps<typeof ConsumerRepairItemRow>['item']={id:'pending-fastener',requestDraftId:'draft',
 itemType:'material',titleRu:'Требует проверки в проекте — крепеж для плоской кровли',quantity:null,unit:'piece',
 currency:'KGS',source:'custom',editableByConsumer:true,createdAt:'2026-10-13T06:00:00Z',sourceParameters:{
 canonicalPreliminaryNeed:true,payable:false,canonicalCostTreatment:'INFORMATIONAL_SCOPE',missingParameterRequirements:[norm]}};
function render(element:React.ReactElement){let renderer!:ReactTestRenderer;act(()=>{renderer=TestRenderer.create(element);});return renderer;}

test('a missing application norm keeps a normal name, optional row inputs and collapsed source information',()=>{
 const before=JSON.stringify(item),remove=jest.fn();
 const r=render(<ConsumerRepairItemRow item={item} onDecrease={noop} onIncrease={noop} onQuantityChange={noop} onUnitPriceChange={noop} onRemove={remove}/>);
 expect(r.root.findAllByProps({testID:'consumer-repair-item-unresolved-notice-pending-fastener'})).toHaveLength(0);
 expect(r.root.findByProps({testID:'consumer-repair-item-quantity-input-pending-fastener'}).props.value).toBe('');
 expect(r.root.findByProps({testID:'consumer-repair-item-unit-price-input-pending-fastener'}).props.placeholder).toBe('');
 expect(r.root.findByProps({testID:'consumer-repair-item-title-pending-fastener'}).props.children).toBe('Крепеж для плоской кровли');
 expect(r.root.findByProps({testID:'consumer-repair-item-info-pending-fastener'}).props.accessibilityState.expanded).toBe(false);
 expect(JSON.stringify(item)).toBe(before);act(()=>r.unmount());
});

test('an unresolved payable resource accepts quantity and price without making its cost payable',()=>{
 const priced={...item,sourceParameters:{...item.sourceParameters,canonicalCostTreatment:'OWN_COST'}};
 const before=JSON.stringify(priced),onPrice=jest.fn(),onQuantity=jest.fn();
 const r=render(<ConsumerRepairItemRow item={priced} onDecrease={noop} onIncrease={noop} onQuantityChange={onQuantity} onUnitPriceChange={onPrice} onRemove={noop}/>);
 const id='consumer-repair-item-unit-price-input-pending-fastener';
 act(()=>r.root.findByProps({testID:id}).props.onChangeText('12,5'));
 act(()=>r.root.findByProps({testID:id}).props.onBlur());
 expect(onPrice).toHaveBeenCalledWith('pending-fastener','12,5');
 const qty='consumer-repair-item-quantity-input-pending-fastener';
 act(()=>r.root.findByProps({testID:qty}).props.onFocus());
 act(()=>r.root.findByProps({testID:qty}).props.onChangeText('3,5'));
 act(()=>r.root.findByProps({testID:qty}).props.onBlur());
 expect(onQuantity.mock.calls[0].slice(0,2)).toEqual(['pending-fastener','3,5']);
 expect(r.root.findByProps({testID:'consumer-repair-item-total-pending-fastener'}).props.children).toBe('');
 expect(JSON.stringify(priced)).toBe(before);act(()=>r.unmount());
});

test.each(['INFORMATIONAL_SCOPE','INCLUDED_IN_RESOURCE_ROWS','CONTROL_OR_DOCUMENT'])('pending %s rows accept reference prices without another payable owner',treatment=>{
 const protectedRow={...item,sourceParameters:{...item.sourceParameters,canonicalCostTreatment:treatment}};
 const r=render(<ConsumerRepairItemRow item={protectedRow} onDecrease={noop} onIncrease={noop} onQuantityChange={noop} onUnitPriceChange={noop} onRemove={noop}/>);
 expect(r.root.findByProps({testID:'consumer-repair-item-unit-price-input-pending-fastener'}).props.value).toBe('');
 expect(r.root.findByProps({testID:'consumer-repair-item-total-pending-fastener'}).props.children).toBe('');act(()=>r.unmount());
});

test('a pending covered resource permits a reference price while retaining coverage',()=>{
 const covered={...item,sourceParameters:{...item.sourceParameters,canonicalCostTreatment:'OWN_COST',
  canonicalCommercialCostCoverageDecisionV1:{ownerRowId:'whole-work',active:true}}};
 const r=render(<ConsumerRepairItemRow item={covered} onDecrease={noop} onIncrease={noop} onQuantityChange={noop} onUnitPriceChange={noop} onRemove={noop}/>);
 expect(r.root.findByProps({testID:'consumer-repair-item-unit-price-input-pending-fastener'}).props.value).toBe('');
 expect(covered.sourceParameters.canonicalCommercialCostCoverageDecisionV1.ownerRowId).toBe('whole-work');act(()=>r.unmount());
});

test('a pending floor service keeps its name and unknown quantity without inline notes or a norm input',()=>{
 const sourceTitleRu='Фактическая внешняя доставка песка и воды и отдельная разгрузка вне включённой операции автопогрузчика';
 const floor={...item,id:'floor-delivery',titleRu:'Доставка и разгрузка песка и воды',sourceParameters:{...item.sourceParameters,
  rowCode:'floor-underlayer:sand:krer11-01-002-01:open:external-delivery-unloading'}};
 registerConsumerRepairRowVerifiedPresentation(floor,{contractVersion:'canonical-public-resource-presentation/v1',
  sourceTitleRu,nameRu:floor.titleRu,brandAndModelRu:null,specificationRu:null,detailsRu:[]});
 const r=render(<ConsumerRepairItemRow item={floor} onDecrease={noop} onIncrease={noop} onQuantityChange={noop} onUnitPriceChange={noop} onRemove={noop}/>);
 expect(r.root.findAllByProps({testID:'consumer-repair-item-pending-guide-floor-delivery'})).toHaveLength(0);
 act(()=>r.root.findByProps({testID:'consumer-repair-item-info-floor-delivery'}).props.onPress());
 expect(r.root.findAllByProps({testID:'consumer-repair-item-pending-guide-floor-delivery'})).toHaveLength(0);
 expect(r.root.findByProps({testID:'consumer-repair-item-title-floor-delivery'}).props.children).toBe(floor.titleRu);
 expect(r.root.findByProps({testID:'consumer-repair-item-quantity-input-floor-delivery'}).props.value).toBe('');
 act(()=>r.unmount());
 const manual={...floor,sourceParameters:{...floor.sourceParameters,canonicalManualTitleOverride:true}};
 const m=render(<ConsumerRepairItemRow item={manual} onDecrease={noop} onIncrease={noop} onQuantityChange={noop} onUnitPriceChange={noop} onRemove={noop}/>);
 expect(m.root.findAllByProps({testID:'consumer-repair-item-pending-guide-floor-delivery'})).toHaveLength(0);act(()=>m.unmount());
});

test('a real missing object fact remains a question even when the same row also lacks a norm',()=>{
 const mixed={...item,sourceParameters:{...item.sourceParameters,missingParameterRequirements:[norm,
   {parameterId:'fastener_base',titleRu:'Основание крепления',sourceConfirmationRequired:false}]}};
 const r=render(<ConsumerRepairItemRow item={mixed} onDecrease={noop} onIncrease={noop} onQuantityChange={noop} onUnitPriceChange={noop} onRemove={noop}/>);
 expect(r.root.findAllByProps({testID:'consumer-repair-item-unresolved-notice-pending-fastener'})).toHaveLength(0);
 act(()=>r.root.findByProps({testID:'consumer-repair-item-info-pending-fastener'}).props.onPress());
 expect(JSON.stringify(r.toJSON())).toContain('Заполните в исходных данных: Основание крепления.');
 expect(r.root.findByProps({testID:'consumer-repair-item-quantity-input-pending-fastener'}).props.value).toBe('');
 act(()=>r.root.findByProps({testID:'consumer-repair-item-info-pending-fastener'}).props.onPress());
 expect(r.root.findAllByProps({testID:'consumer-repair-item-unresolved-notice-pending-fastener'})).toHaveLength(0);
 act(()=>r.unmount());
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
 consumerQuestionCount:0,sourceGates:[{parameterId:'fastener_norm'}],trustLevelLabel:'Готовность: нужны уточнения'} as unknown as React.ComponentProps<typeof RequestEstimateSummaryCard>['viewModel'];
 const r=render(<RequestEstimateSummaryCard viewModel={vm} missingParameterCount={0}/>),text=JSON.stringify(r.toJSON());
 expect(text).toContain('Данные объекта заполнены');expect(text).not.toContain('требуют подтверждённого источника');
 expect(text).not.toContain('требующих уточнения');expect(text).not.toContain('Готовность: нужны уточнения');expect(text).toContain('Пока не рассчитано: 59');act(()=>r.unmount());
});

test('saved manual quantities remain visible as saved while a source check blocks approval with zero unknown quantity rows',()=>{
 const items=[{...item,quantity:10,sourceParameters:{...item.sourceParameters,manualQuantityOverride:true}},
  {...item,id:'normal',quantity:2,sourceParameters:{manualQuantityOverride:true}},
  {...item,id:'unknown',quantity:null,sourceParameters:{...item.sourceParameters,manualQuantityOverride:true}},
  {...item,id:'invalid',quantity:NaN,sourceParameters:{...item.sourceParameters,manualQuantityOverride:true}}];
 const bundle={items} as unknown as Parameters<typeof consumerEstimateManualPreliminaryItems>[0];
 expect(consumerEstimateManualPreliminaryItems(bundle).map(row=>row.id)).toEqual(['pending-fastener']);
 const approve=jest.fn(),r=render(<ConsumerRepairRequestStickyActions approved={false} sent={false} hasBundle hasSnapshot
  approvalBlockedByEstimate approvalBlockedByParameters approvalMissingObjectParameterCount={0} approvalUnresolvedRowCount={0}
  approvalManualQuantityCount={1} onOpenPdf={noop} onMakePdf={noop} onCreateNew={noop} onDeleteDraft={noop} onApproveDraft={approve} onPrepareDraft={noop}/>);
 const text=JSON.stringify(r.toJSON());
 expect(text).toContain('Введённые количества сохранены.');expect(text).toContain('Повторный ввод не требуется.');
 expect(text).toContain('Приложение ещё не завершило расчёт');expect(text).not.toContain('Сначала рассчитайте смету');
 expect(r.root.findByProps({testID:'consumer-repair-approve'}).props.disabled).toBe(true);
 expect(approve).not.toHaveBeenCalled();expect(items[0]!.quantity).toBe(10);act(()=>r.unmount());
});

test('manual quantity confirmation requires a separate explicit click and does not invoke normal full approval',()=>{
 const normal=jest.fn(),manual=jest.fn(),r=render(<ConsumerRepairRequestStickyActions approved={false} sent={false}
   hasBundle hasSnapshot manualQuantityApprovalAvailable approvalManualQuantityCount={4}
   onOpenPdf={noop} onMakePdf={noop} onCreateNew={noop} onDeleteDraft={noop} onApproveDraft={normal}
   onApproveManualQuantities={manual} onPrepareDraft={noop}/>);
 const button=r.root.findByProps({testID:'consumer-repair-approve'});
 expect(button.props.disabled).toBe(false);expect(button.props.accessibilityLabel).toBe('Подтвердить вручную');
 act(()=>button.props.onPress());expect(manual).not.toHaveBeenCalled();expect(normal).not.toHaveBeenCalled();
 expect(JSON.stringify(r.toJSON())).toContain('эти позиции не добавятся автоматически в оплату или закупку');
 act(()=>r.root.findByProps({testID:'consumer-repair-manual-quantity-confirm'}).props.onPress());
 expect(manual).toHaveBeenCalledTimes(1);expect(normal).not.toHaveBeenCalled();act(()=>r.unmount());
});

test('a paid operation with a base fact can be excluded as an operation; its factual check is not removed as a row',()=>{
 const operation={contractVersion:'canonical-operation-resource/v1',groupId:'screed',operationId:'screed:installation',groupTitleRu:'Стяжка',operationTitleRu:'Стяжка25мм',completionCriterionRu:'Устроена стяжка'};
 const resource={...item,id:'paid-mortar',quantity:0.51,isOptional:false,sourceParameters:{rowCode:'paid-mortar',canonicalOperationComposition:operation}};
 const scope={groupId:'screed',rowIds:['base-check'],kinds:['OBJECT_SCOPE'],statuses:['EXACT_SCOPE'],titlesRu:['Основание'],sourceCheckRestoration:null};
 const vm={sections:[{id:'professional_screed',title:'Стяжка',items:[resource],operation,scopeRequirements:[scope]}],rawItemCount:1,calculatedItemCount:1,preliminaryNeedCount:0} as unknown as React.ComponentProps<typeof RequestEstimateItemsEditor>['viewModel'];
 const onChange=jest.fn();const r=render(<RequestEstimateItemsEditor viewModel={vm} onCompositionRowsChange={onChange} onDecrease={noop} onIncrease={noop} onQuantityChange={noop} onUnitPriceChange={noop} onSpecificationChange={noop} onOptionalChange={noop} onRemove={noop} onAddManual={noop} onOpenCatalog={noop} onOpenPhoto={noop} showPhotoButtons={false}/>);
 const button=r.root.findAll(n=>typeof n.type==='string'&&n.props.accessibilityRole==='button'&&n.findAll(child=>typeof child.type==='string'&&child.props.children==='Исключить подработу и пересчитать ресурсы').length>0);
 expect(button).toHaveLength(1);let handler=button[0];while(handler&&typeof handler.props.onPress!=='function')handler=handler.parent!;
 expect(typeof handler.props.onPress).toBe('function');act(()=>handler.props.onPress());expect(onChange).toHaveBeenCalledWith([],true,JSON.stringify(['screed','screed:installation']));act(()=>r.unmount());
});

test('the actual estimate editor omits a process note while preserving an unresolved physical resource and saved evidence',()=>{
 const operation={contractVersion:'canonical-operation-resource/v1',groupId:'finish',operationId:'finish:application',
  groupTitleRu:'Отделка',operationTitleRu:'Нанесение',completionCriterionRu:'Покрытие нанесено'},
  note:typeof item={...item,id:'process-prose',itemType:'work',titleRu:'Описание этапа',quantity:1,
   sourceParameters:{rowCode:'process-prose',payable:false,canonicalCostTreatment:'INCLUDED_IN_RESOURCE_ROWS',canonicalOperationComposition:operation}},
  resource={...item,sourceParameters:{...item.sourceParameters,canonicalOperationComposition:operation}};
 registerConsumerRepairRowVerifiedPresentation(note,{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:note.titleRu,
  nameRu:note.titleRu,brandAndModelRu:null,specificationRu:null,detailsRu:['СЛУЖЕБНАЯ_ПРОЗА_НЕ_В_СМЕТЕ'],rowKind:'PROCESS_NOTE'});
 const snapshot=JSON.stringify([note,resource]),vm={sections:[{id:'finish',title:'Отделка',items:[note,resource],operation}],
  rawItemCount:2,calculatedItemCount:0,preliminaryNeedCount:1} as unknown as React.ComponentProps<typeof RequestEstimateItemsEditor>['viewModel'];
 const renderer=render(<RequestEstimateItemsEditor viewModel={vm} onDecrease={noop} onIncrease={noop}
  onQuantityChange={noop} onUnitPriceChange={noop} onRemove={noop} onAddManual={noop}/>);
 expect(JSON.stringify(renderer.toJSON())).not.toContain('СЛУЖЕБНАЯ_ПРОЗА_НЕ_В_СМЕТЕ');
 expect(renderer.root.findAllByProps({testID:'request-estimate-process-note-process-prose'})).toHaveLength(0);
 expect(renderer.root.findByProps({testID:'consumer-repair-item-quantity-input-pending-fastener'}).props.value).toBe('');
 expect(JSON.stringify([note,resource])).toBe(snapshot);act(()=>renderer.unmount());
});

test.each([1,null])('shared resource with quantity %s opens the same editable position in its using operation without a duplicate editor',quantity=>{
 const owner={contractVersion:'canonical-operation-resource/v1' as const,groupId:'finish',operationId:'prepare',
  groupTitleRu:'Отделка',operationTitleRu:'Подготовка',completionCriterionRu:'Готово'};
 const using={...owner,operationId:'prime',operationTitleRu:'Грунтование'};
 const resource={...item,id:'shared-brush',titleRu:'Кисть',quantity,unitPrice:120.5,sourceParameters:{...item.sourceParameters,
  rowCode:'brush',canonicalCostTreatment:'INCLUDED_IN_RESOURCE_ROWS',canonicalOperationComposition:owner}};
 registerConsumerRepairRowVerifiedPresentation(resource,{contractVersion:'canonical-public-resource-presentation/v1',
  sourceTitleRu:resource.titleRu,nameRu:resource.titleRu,brandAndModelRu:null,specificationRu:null,detailsRu:[],resourceKind:'TOOL'});
 const vm={sections:[{id:'prepare',title:'Подготовка',operation:owner,items:[resource]},
  {id:'prime',title:'Грунтование',operation:using,items:[],sharedResources:[{rowId:resource.id,titleRu:'Кисть',
   quantityLabel:quantity==null?'Не рассчитано':'1 шт.',ownerOperationTitleRu:'Подготовка'}]}],rawItemCount:1,
  calculatedItemCount:quantity==null?0:1,preliminaryNeedCount:quantity==null?1:0} as unknown as React.ComponentProps<typeof RequestEstimateItemsEditor>['viewModel'];
 const before=JSON.stringify(vm),onQuantity=jest.fn(),onPrice=jest.fn(),onTitle=jest.fn();
 const r=render(<RequestEstimateItemsEditor viewModel={vm} onDecrease={noop} onIncrease={noop}
  onQuantityChange={onQuantity} onUnitPriceChange={onPrice} onSpecificationChange={onTitle} onRemove={noop} onAddManual={noop}/>);
 // A using-only operation can be collapsed initially and has no own row.
 act(()=>r.root.findByProps({testID:'request-estimate-operation-toggle-prime'}).props.onPress());
 const editId='request-estimate-shared-edit-prime-shared-brush';
 expect(r.root.findByProps({testID:'request-estimate-shared-resource-shared-brush'}).props.children)
  .toBe('Кисть');
 expect(r.root.findByProps({testID:'request-estimate-shared-kind-shared-brush'}).props.children).toBe('Инструмент');
 expect(r.root.findByProps({testID:'request-estimate-shared-unit-shared-brush'}).props.children).toBe('шт.');
 expect(r.root.findByProps({testID:'request-estimate-shared-quantity-shared-brush'}).props.children).toBe(quantity==null?'Не рассчитано':'1');
 expect(r.root.findByProps({testID:'request-estimate-shared-price-shared-brush'}).props.children).toBe('120,5 сом');
 expect(r.root.findByProps({testID:'request-estimate-shared-amount-shared-brush'}).props.children).toBe('');
 expect(JSON.stringify(r.toJSON())).toContain('Подработы и ресурсы');
 expect(r.root.findByProps({testID:editId}).props.accessibilityLabel).toBe('Изменить количество, цену и наименование Кисть');
 act(()=>r.root.findByProps({testID:editId}).props.onPress());
 const section=r.root.findByProps({testID:'request-estimate-operation-prime'});
 expect(r.root.findByProps({testID:'consumer-repair-item-resource-kind-shared-brush'}).props.children).toBe('Инструмент');
 expect(section.findByProps({testID:'consumer-repair-item-quantity-input-shared-brush'}).props.value).toBe(quantity==null?'':'1');
 expect(r.root.findAll(n=>typeof n.type==='string'&&n.props.testID==='consumer-repair-item-quantity-input-shared-brush')).toHaveLength(1);
 const qty='consumer-repair-item-quantity-input-shared-brush',price='consumer-repair-item-unit-price-input-shared-brush';
 act(()=>r.root.findByProps({testID:qty}).props.onChangeText('2,5'));
 act(()=>r.root.findByProps({testID:qty}).props.onBlur());
 act(()=>r.root.findByProps({testID:price}).props.onChangeText('120,5'));
 act(()=>r.root.findByProps({testID:price}).props.onBlur());
 expect(onQuantity.mock.calls[0].slice(0,2)).toEqual(['shared-brush','2,5']);
 expect(onPrice).toHaveBeenCalledWith('shared-brush','120,5');
 expect(section.findByProps({testID:'consumer-repair-item-total-shared-brush'}).props.children).toBe('');
 expect(section.findByProps({testID:'consumer-repair-item-unit-shared-brush'}).props.children).toBe('шт.');
 act(()=>r.root.findByProps({testID:'consumer-repair-item-specification-edit-shared-brush'}).props.onPress());
 act(()=>r.root.findByProps({testID:'consumer-repair-item-specification-input-shared-brush'}).props.onChangeText('Кисть 100 мм'));
 act(()=>r.root.findByProps({testID:'consumer-repair-item-specification-save-shared-brush'}).props.onPress());
 expect(onTitle).toHaveBeenCalledWith('shared-brush','Кисть 100 мм');
 expect(JSON.stringify(vm)).toBe(before);
 act(()=>r.root.findByProps({testID:editId}).props.onPress());
 expect(r.root.findByProps({testID:'request-estimate-operation-prepare'}).findAll(n=>typeof n.type==='string'&&n.props.testID===qty)).toHaveLength(1);
 act(()=>r.unmount());
});

test('manual preliminary confirmation names unknown quantities and requires an explicit click without normal automatic approval',()=>{
 const normal=jest.fn(),manual=jest.fn(),r=render(<ConsumerRepairRequestStickyActions approved={false} sent={false} hasBundle hasSnapshot manualQuantityApprovalAvailable approvalManualUnresolvedRowCount={4} approvalUnresolvedRowCount={4} approvalBlockedByEstimate={false} onOpenPdf={noop} onMakePdf={noop} onCreateNew={noop} onDeleteDraft={noop} onApproveDraft={normal} onApproveManualQuantities={manual} onPrepareDraft={noop}/>);
 const button=r.root.findByProps({testID:'consumer-repair-approve'});expect(button.props.disabled).toBe(false);expect(button.props.accessibilityLabel).toBe('Подтвердить вручную');act(()=>button.props.onPress());const text=JSON.stringify(r.toJSON());expect(text).toContain('Не рассчитаны количества в 4 поз.');expect(text).toContain('не войдут в итог, оплату или закупку');expect(text).toContain('предварительную версию вручную');expect(manual).not.toHaveBeenCalled();expect(normal).not.toHaveBeenCalled();act(()=>r.root.findByProps({testID:'consumer-repair-manual-quantity-confirm'}).props.onPress());expect(manual).toHaveBeenCalledTimes(1);expect(normal).not.toHaveBeenCalled();act(()=>r.unmount());
});

test('public row taxonomy uses only verified presentation even when public name differs from bound source title',()=>{
 const kinds=['MATERIAL','CONSUMABLE','TOOL','ACCESSORY','EQUIPMENT','MECHANISM','LABOR','SERVICE','TRANSPORT','PPE'] as const;
 const labels=['Материалы','Расходники','Инструмент','Оснастка','Оборудование','Механизмы','Труд','Услуги','Доставка','Средства защиты'];
 kinds.forEach((resourceKind,index)=>{
  const resource={...item,id:'kind-'+index,titleRu:'Открытое название',category:'equipment'};
  registerConsumerRepairRowVerifiedPresentation(resource,{contractVersion:'canonical-public-resource-presentation/v1',
    sourceTitleRu:'Точное исходное имя '+index,nameRu:resource.titleRu,brandAndModelRu:null,specificationRu:null,detailsRu:[],resourceKind});
  const before=JSON.stringify(resource),r=render(<ConsumerRepairItemRow item={resource} onDecrease={noop} onIncrease={noop}
    onQuantityChange={noop} onUnitPriceChange={noop} onRemove={noop}/>);
  expect(r.root.findByProps({testID:'consumer-repair-item-resource-kind-'+resource.id}).props.children).toBe(labels[index]);
  expect(JSON.stringify(resource)).toBe(before);act(()=>r.unmount());
 });
 const unverified={...item,id:'unverified-kind',category:'equipment',sourceParameters:{...item.sourceParameters,
  publicResourcePresentationV1:{resourceKind:'TOOL'}}};
 const r=render(<ConsumerRepairItemRow item={unverified} onDecrease={noop} onIncrease={noop}
  onQuantityChange={noop} onUnitPriceChange={noop} onRemove={noop}/>);
 expect(r.root.findByProps({testID:'consumer-repair-item-resource-kind-unverified-kind'}).props.children).toBe('Оборудование');
 act(()=>r.unmount());
});