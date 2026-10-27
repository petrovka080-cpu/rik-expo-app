import React from "react";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import { Alert, Platform } from "react-native";

import { ConsumerRepairItemRow } from "../../src/features/consumerRepair/ConsumerRepairItemRow";
import { ConsumerRepairRequestScreenController } from "../../src/features/consumerRepair/ConsumerRepairRequestScreen";
import { RequestEstimateItemsEditor } from "../../src/features/consumerRepair/RequestEstimateItemsEditor";
import type { RequestEstimateViewModel } from "../../src/features/consumerRepair/requestEstimateViewModel";
import { consumerRepairRowCalculatedQuantity } from "../../src/features/consumerRepair/consumerRepairRowMetadata";
import * as quantityTrace from "../../src/features/consumerRepair/consumerRepairQuantityEditTrace";
import type { ConsumerRepairDraftBundle, ConsumerRepairRequestItem } from "../../src/lib/consumerRequests/consumerRequestTypes";

jest.mock("@expo/vector-icons", () => ({ Ionicons: () => null }));

function stagedEditor(patch: Partial<ConsumerRepairRequestItem> = {}) {
  const item: ConsumerRepairRequestItem = {
    id: "test-owned-row", requestDraftId: "test-owned-draft", itemType: "material",
    titleRu: "Песок для основания", quantity: 14.25, unit: "m3", unitLabel: "м³",
    unitPrice: null, totalPrice: null, currency: "KGS", source: "ai_suggested",
    formulaId: "test-formula", quantityFormula: "length * width * depth",
    sourceParameters: {
      canonicalBackendRevisionId: "test-parent", canonicalBackendReleaseId: "test-release",
      rowCode: "test:bedding",
    },
    editableByConsumer: true, createdAt: "2026-10-02T00:00:00.000Z", ...patch,
  };
  const recalculate = jest.fn();
  const controller = new ConsumerRepairRequestScreenController({
    consumerUserId: "test-consumer", onPrepareCanonicalEstimate: jest.fn(),
    onLoadCanonicalRevisionDraft: jest.fn(), onLoadCanonicalParameterSession: jest.fn(),
    onRecalculateCanonicalEstimate: recalculate, onSelectCanonicalCatalogItem: jest.fn(),
    onAddCanonicalCatalogItem: jest.fn(), onOpenPhotoForMaterialRecognition: jest.fn(),
  });
  const mutable = controller as never as {
    state: { bundle: ConsumerRepairDraftBundle; pendingCanonicalRowEditCount?: number; statusMessage?: string };
    setState: (update: unknown, callback?: () => void) => void;
    changeItemQuantity: (id: string, value: string) => Promise<void>;
    changeItemUnitPrice: (id: string, value: string, phase?: "input") => Promise<void>;
    applyPendingCanonicalRowEdits: () => Promise<boolean>;
    cancelPendingCanonicalRowEdits: () => void;
    canonicalRowEditorResetKeys: Readonly<Record<string, number>>;
  };
  mutable.state = {
    ...mutable.state,
    bundle: { draft: { id: item.requestDraftId, title: "Test", status: "draft" }, items: [item] } as never,
  };
  mutable.setState = (update, callback) => {
    const next = typeof update === "function"
      ? (update as (state: typeof mutable.state) => Partial<typeof mutable.state>)(mutable.state)
      : update as Partial<typeof mutable.state>;
    mutable.state = { ...mutable.state, ...next };
    callback?.();
  };
  return { mutable, original: item, recalculate, current: () => mutable.state.bundle.items[0]! };
}

function expectMode(item: ConsumerRepairRequestItem, expected: string) {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(<ConsumerRepairItemRow item={item}
      onDecrease={jest.fn()} onIncrease={jest.fn()} onQuantityChange={jest.fn()}
      onUnitPriceChange={jest.fn()} onRemove={jest.fn()} />);
  });
  expect(renderer.root.findAllByProps({ testID: `consumer-repair-item-quantity-mode-${item.id}` })).toHaveLength(0);
  act(() => renderer.root.findByProps({ testID: `consumer-repair-item-professional-proof-${item.id}` }).props.onPress());
  expect(renderer.root.findByProps({ testID: `consumer-repair-item-quantity-mode-${item.id}` }).props.children).toBe(expected);
  expect(renderer.root.findByProps({ testID: `consumer-repair-item-quantity-input-${item.id}` }).props.value).toBe(String(item.quantity ?? ""));
  act(() => renderer.unmount());
}

describe("canonical pending row quantity provenance", () => {
  it.each(['android','ios']as const)('lets the %s native input own its caret while rapid numeric prefixes and focused Apply retain every digit',async os=>{
    const descriptor=Object.getOwnPropertyDescriptor(Platform,'OS')!;
    Object.defineProperty(Platform,'OS',{configurable:true,value:os});
    try{for(const field of ['price','quantity']as const){
      const editor=stagedEditor({unitPrice:1270.5}),noop=jest.fn();let renderer!:ReactTestRenderer;
      const view=()=> <ConsumerRepairItemRow item={editor.current()} onDecrease={noop} onIncrease={noop}
        onQuantityChange={editor.mutable.changeItemQuantity} onUnitPriceChange={editor.mutable.changeItemUnitPrice} onRemove={noop}/>;
      try{
        act(()=>{renderer=TestRenderer.create(view());});
        const id=`consumer-repair-item-${field==='price'?'unit-price':'quantity'}-input-test-owned-row`;
        act(()=>renderer.root.findByProps({testID:id}).props.onFocus());
        for(const text of ['', '1','12','128','1280','1280.','1280.7','1280.75']){
          act(()=>renderer.root.findByProps({testID:id}).props.onChangeText(text));
          act(()=>renderer.update(view()));
          const input=renderer.root.findByProps({testID:id});
          expect(input.props.value).toBe(text);
          expect(input.props.selectTextOnFocus).toBe(true);
          // Feeding delayed selection events back into a controlled selection
          // range replaced each new native keystroke;1280.75 became5 on Android.
          expect(input.props.selection).toBeUndefined();
          expect(input.props.onSelectionChange).toBeUndefined();
        }
        expect(editor.recalculate).not.toHaveBeenCalled();
        editor.recalculate.mockRejectedValueOnce(new Error('TEST_BACKEND_STOP'));
        await editor.mutable.applyPendingCanonicalRowEdits();
        expect(editor.recalculate).toHaveBeenCalledTimes(1);
        expect(editor.recalculate.mock.calls[0][0].rowOverrides['test:bedding'][field==='price'?'unitPrice':'quantity']).toBe(1280.75);
      }finally{act(()=>renderer?.unmount());}
    }}finally{Object.defineProperty(Platform,'OS',descriptor);}
  });
  it.each(['price','quantity'] as const)('includes the focused %s buffer in Apply without requiring blur',async field=>{
    const editor=stagedEditor(),noop=jest.fn();let renderer!:ReactTestRenderer;
    const view=()=> <ConsumerRepairItemRow item={editor.current()} onDecrease={noop} onIncrease={noop}
      onQuantityChange={editor.mutable.changeItemQuantity} onUnitPriceChange={editor.mutable.changeItemUnitPrice} onRemove={noop}/>;
    act(()=>{renderer=TestRenderer.create(view());});
    const id=`consumer-repair-item-${field==='price'?'unit-price':'quantity'}-input-test-owned-row`,text=field==='price'?'1300,75':'16,5';
    act(()=>renderer.root.findByProps({testID:id}).props.onFocus());
    act(()=>renderer.root.findByProps({testID:id}).props.onChangeText(text));
    act(()=>renderer.update(view()));
    expect(renderer.root.findByProps({testID:id}).props.value).toBe(text);
    expect(editor.mutable.state.pendingCanonicalRowEditCount).toBe(1);
    expect(editor.recalculate).not.toHaveBeenCalled();
    editor.recalculate.mockRejectedValueOnce(new Error('TEST_BACKEND_STOP'));
    await editor.mutable.applyPendingCanonicalRowEdits();
    expect(editor.recalculate).toHaveBeenCalledTimes(1);
    expect(editor.recalculate.mock.calls[0][0].rowOverrides['test:bedding'][field==='price'?'unitPrice':'quantity']).toBe(field==='price'?1300.75:16.5);
    act(()=>renderer.unmount());
  });
  it('blocks Apply of the previous good value while the focused input contains an incomplete number',async()=>{
    const editor=stagedEditor(),noop=jest.fn();let renderer!:ReactTestRenderer;
    act(()=>{renderer=TestRenderer.create(<ConsumerRepairItemRow item={editor.current()} onDecrease={noop} onIncrease={noop}
      onQuantityChange={editor.mutable.changeItemQuantity} onUnitPriceChange={editor.mutable.changeItemUnitPrice} onRemove={noop}/>);});
    const id='consumer-repair-item-unit-price-input-test-owned-row';
    act(()=>renderer.root.findByProps({testID:id}).props.onFocus());
    act(()=>renderer.root.findByProps({testID:id}).props.onChangeText('13'));
    act(()=>renderer.root.findByProps({testID:id}).props.onChangeText('13..'));
    expect(await editor.mutable.applyPendingCanonicalRowEdits()).toBe(false);
    expect(editor.recalculate).not.toHaveBeenCalled();
    act(()=>renderer.root.findByProps({testID:id}).props.onChangeText('1300.75'));
    editor.recalculate.mockRejectedValueOnce(new Error('TEST_BACKEND_STOP'));
    await editor.mutable.applyPendingCanonicalRowEdits();
    expect(editor.recalculate.mock.calls[0][0].rowOverrides['test:bedding'].unitPrice).toBe(1300.75);
    act(()=>renderer.unmount());
  });
  it('cancels an incomplete first price input without saving a number or losing the saved row',async()=>{
    const editor=stagedEditor(),alert=jest.spyOn(Alert,'alert').mockImplementation(()=>{});
    try{
      await editor.mutable.changeItemUnitPrice('test-owned-row','.', 'input');
      expect(editor.mutable.state.pendingCanonicalRowEditCount).toBe(1);
      expect(editor.current().unitPrice).toBeNull();
      editor.mutable.cancelPendingCanonicalRowEdits();
      expect(alert).toHaveBeenCalledTimes(1);
      expect(alert.mock.calls[0][1]).toContain('незавершённый ввод');
      alert.mock.calls[0][2]![1].onPress!();
      expect(editor.mutable.state.pendingCanonicalRowEditCount).toBe(0);
      expect(editor.current().unitPrice).toBeNull();
      expect(await editor.mutable.applyPendingCanonicalRowEdits()).toBe(false);
      expect(editor.recalculate).not.toHaveBeenCalled();
    }finally{alert.mockRestore();}
  });
  it.each([null,2])("allows editing quantity %s while retaining the unresolved application source", quantity => {
    const item=stagedEditor({quantity,unit:'',unitLabel:'',sourceParameters:{canonicalPreliminaryNeed:true,
      missingParameterRequirements:[{parameterId:'norm_qty',titleRu:'Норма инструмента',valueSourceRole:'UNRESOLVED_APPLICATION_NORM',sourceConfirmationRequired:false}]}}).current();
    const onQuantityChange=jest.fn();let renderer!:ReactTestRenderer;
    act(()=>{renderer=TestRenderer.create(<ConsumerRepairItemRow item={item} onDecrease={jest.fn()} onIncrease={jest.fn()}
      onQuantityChange={onQuantityChange} onUnitPriceChange={jest.fn()} onRemove={jest.fn()}/>);});
    const id=`consumer-repair-item-quantity-input-${item.id}`;
    expect(renderer.root.findByProps({testID:id}).props.value).toBe(String(quantity??''));
    act(()=>renderer.root.findByProps({testID:id}).props.onFocus());
    act(()=>renderer.root.findByProps({testID:id}).props.onChangeText('4,5'));
    act(()=>renderer.root.findByProps({testID:id}).props.onBlur());
    expect(onQuantityChange.mock.calls[0].slice(0,2)).toEqual([item.id,'4,5']);
    expect(item.quantity).toBe(quantity);
    expect(item.sourceParameters?.missingParameterRequirements).toHaveLength(1);
    act(()=>renderer.unmount());
  });
  it.each(['exact','missing','wrong-release'])('permits manual row editing independently of the %s requirements table',mode=>{
    const item=stagedEditor().current(),onQuantityChange=jest.fn();
    const view=(current:ConsumerRepairRequestItem,tables?:React.ComponentProps<typeof ConsumerRepairItemRow>['parameterRequirementTables'])=>(
      <ConsumerRepairItemRow item={current} parameterRequirementTables={tables} onDecrease={jest.fn()} onIncrease={jest.fn()}
        onQuantityChange={onQuantityChange} onUnitPriceChange={jest.fn()} onRemove={jest.fn()}/>);
    let renderer!:ReactTestRenderer;act(()=>{renderer=TestRenderer.create(view(item));});
    const reference={contractVersion:'canonical-parameter-requirements/v1' as const,revisionId:'test-parent',releaseId:'test-release',parameterSchemaHash:'schema'};
    const blocked={...item,quantity:null,sourceParameters:{...item.sourceParameters,canonicalPreliminaryNeed:true,missingParameterIds:['tool_norm'],
      sourceManagedMissingParameterIds:[],canonicalParameterRequirementReference:reference}};
    const tables=mode==='missing'?undefined:{'test-parent':{...reference,releaseId:mode==='exact'?'test-release':'foreign-release',
      requirementsById:{tool_norm:{parameterId:'tool_norm',titleRu:'Норма инструмента',unitId:null,guideShortRu:null,
        sourceConfirmationRequired:false,valueSourceRole:'UNRESOLVED_APPLICATION_NORM' as const}}}};
    act(()=>renderer.update(view(blocked,tables)));
    const id=`consumer-repair-item-quantity-input-${item.id}`;
    act(()=>renderer.root.findByProps({testID:id}).props.onFocus());
    act(()=>renderer.root.findByProps({testID:id}).props.onChangeText('999'));
    act(()=>renderer.root.findByProps({testID:id}).props.onBlur());
    expect(onQuantityChange.mock.calls[0].slice(0,2)).toEqual([item.id,'999']);
    expect(blocked.quantity).toBeNull();
    expect(blocked.sourceParameters.canonicalParameterRequirementReference).toEqual(reference);
    act(()=>renderer.unmount());
  });
  it('allows explicitly clearing a saved manual override while leaving source-owned quantity unconfirmed',()=>{
    const item=stagedEditor({quantity:2,sourceParameters:{canonicalPreliminaryNeed:true,manualQuantityOverride:true,calculatedQuantityBeforeOverride:1,
      missingParameterRequirements:[{parameterId:'norm_qty',titleRu:'Норма',valueSourceRole:'UNRESOLVED_APPLICATION_NORM'}]}}).current();
    const onQuantityChange=jest.fn();let renderer!:ReactTestRenderer;
    act(()=>{renderer=TestRenderer.create(<ConsumerRepairItemRow item={item} onDecrease={jest.fn()} onIncrease={jest.fn()}
      onQuantityChange={onQuantityChange} onUnitPriceChange={jest.fn()} onRemove={jest.fn()}/>);});
    act(()=>renderer.root.findByProps({testID:`consumer-repair-item-restore-calculated-${item.id}`}).props.onPress());
    expect(onQuantityChange.mock.calls[0].slice(0,2)).toEqual([item.id,'']);
    expect(renderer.root.findByProps({testID:`consumer-repair-item-quantity-input-${item.id}`}).props.value).toBe('1');
    expect(item.quantity).toBe(2);
    act(()=>renderer.unmount());
  });
  it("shows a saved known consumption while retaining an empty order and no payable cost", () => {
    const item = stagedEditor({ quantity: null, totalPrice: null, unit: "m2", unitLabel: "м²", sourceParameters: {
      canonicalBackendRevisionId: "test-parent", rowCode: "test:bedding", canonicalPreliminaryNeed: true,
      canonicalPurchaseRequirement: { version: "canonical-purchase-requirement:v1", ownerRowId: "test:bedding", unitId: "m2",
        consumed: "86.25", plannedConsumption: null, conditional: false },
    } }).current();
    let renderer!: ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(<ConsumerRepairItemRow item={item}
      onDecrease={jest.fn()} onIncrease={jest.fn()} onQuantityChange={jest.fn()}
      onUnitPriceChange={jest.fn()} onRemove={jest.fn()} />); });
    expect(renderer.root.findByProps({ testID: `consumer-repair-item-known-consumption-${item.id}` }).props.children.join(""))
      .toBe("Расход по расчёту: 86,25 м². Точный заказ ещё не подтверждён.");
    expect(renderer.root.findByProps({ testID: `consumer-repair-item-quantity-input-${item.id}` }).props.value).toBe("");
    expect(item).toMatchObject({ quantity: null, unitPrice: null, totalPrice: null });
    act(() => renderer.unmount());
  });
  it("cancels an unsaved manual edit back to the saved automatic mode without queuing a redundant Apply or revision", async () => {
    const editor = stagedEditor();
    await editor.mutable.changeItemQuantity("test-owned-row", "16");
    await editor.mutable.changeItemQuantity("test-owned-row", "");
    expect(editor.mutable.state.pendingCanonicalRowEditCount).toBe(0);
    expect(editor.mutable.state.statusMessage).toBe("");
    expectMode(editor.current(), "Рассчитано автоматически: 14.25 м³. Поле можно изменить.");
    expect(await editor.mutable.applyPendingCanonicalRowEdits()).toBe(false);
    expect(editor.recalculate).not.toHaveBeenCalled();
    expect(editor.original.quantity).toBe(14.25);
    expect(editor.original.sourceParameters).not.toHaveProperty("manualQuantityOverride");
  });

  it("returns a new price to an originally unpriced row without trapping a composition update or writing a revision", async () => {
    const editor = stagedEditor();
    await editor.mutable.changeItemUnitPrice("test-owned-row", "111.11");
    expect(editor.current()).toMatchObject({ priceStatus: "USER_ENTERED_PRICE", priceSource: "user",
      priceSourceId: null, priceSourceLabel: "Цена введена пользователем", priceEditedByConsumer: true });
    expect(editor.mutable.state.pendingCanonicalRowEditCount).toBe(1);
    await editor.mutable.changeItemUnitPrice("test-owned-row", "");
    expect(editor.mutable.state.pendingCanonicalRowEditCount).toBe(0);
    expect(editor.current().unitPrice).toBeNull();
    expect(editor.current()).toMatchObject({ priceStatus: "PRICE_MISSING", priceSource: "missing",
      priceSourceId: null, priceSourceLabel: null, priceEditedByConsumer: false });
    expect(await editor.mutable.applyPendingCanonicalRowEdits()).toBe(false);
    expect(editor.recalculate).not.toHaveBeenCalled();
  });

  it("clears only a new price while retaining a separate pending quantity", async () => {
    const editor = stagedEditor();
    await editor.mutable.changeItemUnitPrice("test-owned-row", "111.11");
    await editor.mutable.changeItemQuantity("test-owned-row", "16");
    await editor.mutable.changeItemUnitPrice("test-owned-row", "");
    expect(editor.mutable.state.pendingCanonicalRowEditCount).toBe(1);
    editor.recalculate.mockRejectedValueOnce(new Error("TEST_STOP"));
    await editor.mutable.applyPendingCanonicalRowEdits();
    expect(editor.recalculate.mock.calls[0][0].rowOverrides["test:bedding"]).toMatchObject({ quantity: 16 });
    expect(editor.recalculate.mock.calls[0][0].rowOverrides["test:bedding"]).not.toHaveProperty("unitPrice");
  });

  it("keeps an explicit numeric price pin when the original price mode is unknown", async () => {
    const editor = stagedEditor({ unitPrice: 10, totalPrice: 142.5 });
    await editor.mutable.changeItemUnitPrice("test-owned-row", "11");
    await editor.mutable.changeItemUnitPrice("test-owned-row", "10");
    expect(editor.mutable.state.pendingCanonicalRowEditCount).toBe(1);
    editor.recalculate.mockRejectedValueOnce(new Error("TEST_STOP"));
    await editor.mutable.applyPendingCanonicalRowEdits();
    expect(editor.recalculate.mock.calls[0][0].rowOverrides["test:bedding"].unitPrice).toBe(10);
  });

  it("requires explicit consent to discard new edits and restores saved values while retaining unrelated row data", async () => {
    const editor = stagedEditor({ quantity: 20, unitPrice: 10, totalPrice: 200, quantityEditedByConsumer: true,
      priceStatus: "CATALOG_PRICE_VERIFIED", priceSource: "catalog_item", priceSourceId: "saved-price-id",
      priceSourceLabel: "Saved offer", priceEditedByConsumer: false,
      sourceParameters: { canonicalBackendRevisionId: "test-parent", canonicalBackendReleaseId: "test-release",
        rowCode: "test:bedding", manualQuantityOverride: true, calculatedQuantityBeforeOverride: 14.25 } });
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    try {
      await editor.mutable.changeItemQuantity("test-owned-row", "25");
      await editor.mutable.changeItemUnitPrice("test-owned-row", "12");
      editor.mutable.cancelPendingCanonicalRowEdits();
      expect(alert).toHaveBeenCalledTimes(1);
      expect(alert.mock.calls[0][1]).toContain("количество 25 → 20; цена 12 → 10");
      expect(editor.current()).toMatchObject({ quantity: 25, unitPrice: 12 });
      const buttons = alert.mock.calls[0][2]!;
      expect(buttons[0].style).toBe("cancel");
      editor.mutable.state.bundle.items[0] = { ...editor.current(), titleRu: "Уточнённое название",
        sourceParameters: { ...editor.current().sourceParameters, unrelatedPhoto: "retained" } };
      buttons[1].onPress!();
      expect(editor.current()).toMatchObject({ quantity: 20, unitPrice: 10, totalPrice: 200,
        priceStatus: "CATALOG_PRICE_VERIFIED", priceSource: "catalog_item", priceSourceId: "saved-price-id",
        priceSourceLabel: "Saved offer", priceEditedByConsumer: false,
        quantityEditedByConsumer: true, titleRu: "Уточнённое название", sourceParameters: {
          manualQuantityOverride: true, calculatedQuantityBeforeOverride: 14.25, unrelatedPhoto: "retained" } });
      expect(editor.mutable.state.pendingCanonicalRowEditCount).toBe(0);
      expect(editor.recalculate).not.toHaveBeenCalled();
      expect(editor.original).toMatchObject({ quantity: 20, unitPrice: 10 });
    } finally { alert.mockRestore(); }
  });

  it("does not let an old cancellation confirmation affect a new revision or newer pending input", async () => {
    const editor = stagedEditor();
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    try {
      await editor.mutable.changeItemUnitPrice("test-owned-row", "111.11");
      editor.mutable.cancelPendingCanonicalRowEdits();
      const confirmOldInput = alert.mock.calls[0][2]![1].onPress!;
      await editor.mutable.changeItemUnitPrice("test-owned-row", "222.22");
      confirmOldInput();
      expect(editor.current().unitPrice).toBe(222.22);
      expect(editor.mutable.state.pendingCanonicalRowEditCount).toBe(1);
      editor.mutable.cancelPendingCanonicalRowEdits();
      const confirmOldRevision = alert.mock.calls[1][2]![1].onPress!;
      editor.mutable.state.bundle.items[0] = { ...editor.current(),
        sourceParameters: { ...editor.current().sourceParameters, canonicalBackendRevisionId: "another-revision" } };
      confirmOldRevision();
      expect(editor.current().unitPrice).toBe(222.22);
      expect(editor.mutable.state.pendingCanonicalRowEditCount).toBe(1);
      expect(editor.recalculate).not.toHaveBeenCalled();
    } finally { alert.mockRestore(); }
  });

  it.each(["price", "quantity"] as const)("clears a focused %s buffer after confirmed cancellation and ignores its late events while preserving specification input and another row", async field => {
    const editor = stagedEditor();
    const unrelated = { ...editor.original, id: "unrelated-row", titleRu: "Другая позиция",
      sourceParameters: { ...editor.original.sourceParameters, rowCode: "test:unrelated" } };
    editor.mutable.state.bundle.items.push(unrelated);
    if (field === "price") await editor.mutable.changeItemUnitPrice("test-owned-row", "111.11");
    else await editor.mutable.changeItemQuantity("test-owned-row", "16");
    const onQuantity = jest.fn(), onPrice = jest.fn(), onSpecification = jest.fn(), noop = jest.fn();
    const model = (): RequestEstimateViewModel => ({ title: "Смета", summary: "", totalLabel: "", priceStatusLabel: "",
      sourceConfidenceLabel: "", sourceLabels: [], taxLabel: "", trustLevelLabel: "", commercialEstimateLevelLabel: "",
      sourceQualityLabel: "", expertReviewStatusLabel: "", fullTotalStatusLabel: "", visibleLines: [], assumptionRows: [],
      sections: [{ id: "professional_test", title: "Материалы", items: editor.mutable.state.bundle.items }],
      professionalPreview: true, previewSections: [], calculationPreviewLines: [], normSourcePreviewLines: [],
      rawItemCount: 2, sourceGates: [], manualCatalogItems: [] });
    const view = () => <RequestEstimateItemsEditor viewModel={model()}
      pendingCanonicalRowEditCount={editor.mutable.state.pendingCanonicalRowEditCount}
      canonicalRowEditorResetKeys={editor.mutable.canonicalRowEditorResetKeys}
      onApplyCanonicalRowEdits={noop} onCancelCanonicalRowEdits={editor.mutable.cancelPendingCanonicalRowEdits}
      onDecrease={noop} onIncrease={noop} onQuantityChange={onQuantity} onUnitPriceChange={onPrice}
      onSpecificationChange={onSpecification}
      onRemove={noop} onAddManual={noop} />;
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    let renderer!: ReactTestRenderer;
    try {
      act(() => { renderer = TestRenderer.create(view()); });
      const inputId = `consumer-repair-item-${field === "price" ? "unit-price" : "quantity"}-input-test-owned-row`;
      act(() => renderer.root.findByProps({ testID: "consumer-repair-item-specification-edit-test-owned-row" }).props.onPress());
      act(() => renderer.root.findByProps({ testID: "consumer-repair-item-specification-input-test-owned-row" }).props.onChangeText("Несохранённое уточнение названия"));
      const other = renderer.root.findByProps({ testID: "consumer-repair-item-unit-price-input-unrelated-row" });
      act(() => { other.props.onFocus(); other.props.onChangeText("77"); });
      const edited = renderer.root.findByProps({ testID: inputId });
      act(() => { edited.props.onFocus(); edited.props.onChangeText(field === "price" ? "222.22" : "17"); });
      const oldBlur = renderer.root.findByProps({ testID: inputId }).props.onBlur;
      const oldChange = renderer.root.findByProps({ testID: inputId }).props.onChangeText;
      act(() => renderer.root.findByProps({ testID: "request-estimate-row-batch-cancel" }).props.onPress());
      expect(alert).toHaveBeenCalledTimes(1);
      act(() => { alert.mock.calls[0][2]![1].onPress!(); renderer.update(view()); });
      expect(renderer.root.findByProps({ testID: inputId }).props.value).toBe(field === "price" ? "" : "14.25");
      expect(renderer.root.findByProps({ testID: "consumer-repair-item-unit-price-input-unrelated-row" }).props.value).toBe("77");
      expect(renderer.root.findByProps({ testID: "consumer-repair-item-specification-input-test-owned-row" }).props.value).toBe("Несохранённое уточнение названия");
      expect(onPrice).toHaveBeenCalledWith('unrelated-row','77','input');
      if(field==='price')expect(onPrice).toHaveBeenCalledWith('test-owned-row','222.22','input');
      else expect(onQuantity).toHaveBeenCalledWith('test-owned-row','17',undefined,'input');
      onQuantity.mockClear();onPrice.mockClear();
      act(() => { oldChange("999"); oldBlur(); });
      expect(renderer.root.findByProps({ testID: inputId }).props.value).toBe(field === "price" ? "" : "14.25");
      expect(onQuantity).not.toHaveBeenCalled();
      expect(onPrice).not.toHaveBeenCalled();
      expect(onSpecification).not.toHaveBeenCalled();
      expect(editor.mutable.state.pendingCanonicalRowEditCount).toBe(0);
      expect(renderer.root.findAllByProps({ testID: "request-estimate-row-batch-cancel" })).toHaveLength(0);
      expect(editor.recalculate).not.toHaveBeenCalled();
    } finally { if (renderer) act(() => renderer.unmount()); alert.mockRestore(); }
  });
  it("keeps an explicit equal-value manual pin, but cancelling that unsaved pin returns to the original automatic baseline", async () => {
    const editor = stagedEditor();
    await editor.mutable.changeItemQuantity("test-owned-row", "14.25");
    expect(editor.mutable.state.pendingCanonicalRowEditCount).toBe(1);
    expect(editor.current().sourceParameters?.manualQuantityOverride).toBe(true);
    await editor.mutable.changeItemQuantity("test-owned-row", "");
    expect(editor.mutable.state.pendingCanonicalRowEditCount).toBe(0);
    expect(editor.current().sourceParameters?.manualQuantityOverride).toBe(false);
  });
  it("removes only the reverted quantity amendment while applying an independent pending price once", async () => {
    const editor = stagedEditor();
    await editor.mutable.changeItemUnitPrice("test-owned-row", "2");
    await editor.mutable.changeItemQuantity("test-owned-row", "16");
    await editor.mutable.changeItemQuantity("test-owned-row", "");
    expect(editor.mutable.state.pendingCanonicalRowEditCount).toBe(1);
    editor.recalculate.mockRejectedValueOnce(new Error("TEST_KEEP_PENDING_PRICE"));
    expect(await editor.mutable.applyPendingCanonicalRowEdits()).toBe(false);
    const override = editor.recalculate.mock.calls[0][0].rowOverrides["test:bedding"];
    expect(override).toMatchObject({ unitPrice: 2 });
    expect(override).not.toHaveProperty("quantity");
    expect(editor.current()).toMatchObject({ quantity: 14.25, unitPrice: 2, totalPrice: 28.5 });
    expect(editor.recalculate).toHaveBeenCalledTimes(1);
  });
  it("retains a reset of a SAVED manual override for backend Apply even when its value equals the calculated result", async () => {
    const editor = stagedEditor({ quantity: 14.25, sourceParameters: {
      canonicalBackendRevisionId: "test-parent", canonicalBackendReleaseId: "test-release", rowCode: "test:bedding",
      manualQuantityOverride: true, calculatedQuantityBeforeOverride: 14.25,
    } });
    await editor.mutable.changeItemQuantity("test-owned-row", "");
    expect(editor.mutable.state.pendingCanonicalRowEditCount).toBe(1);
    editor.recalculate.mockRejectedValueOnce(new Error("TEST_KEEP_REAL_RESET"));
    expect(await editor.mutable.applyPendingCanonicalRowEdits()).toBe(false);
    expect(editor.recalculate.mock.calls[0][0].rowOverrides["test:bedding"]).toMatchObject({ quantity: null });
    expect(editor.mutable.state.pendingCanonicalRowEditCount).toBe(1);
  });
  it("cancels an unsaved edit back to its saved manual pin while retaining the actual distinct formula baseline", async () => {
    const editor = stagedEditor({ quantity: 18, sourceParameters: {
      canonicalBackendRevisionId: "test-parent", canonicalBackendReleaseId: "test-release", rowCode: "test:bedding",
      manualQuantityOverride: true, calculatedQuantityBeforeOverride: 14.25,
    } });
    await editor.mutable.changeItemQuantity("test-owned-row", "20");
    await editor.mutable.changeItemQuantity("test-owned-row", "18");
    expect(editor.mutable.state.pendingCanonicalRowEditCount).toBe(0);
    expectMode(editor.current(), "Введено вручную. По формуле: 14.25 м³.");
    expect(await editor.mutable.applyPendingCanonicalRowEdits()).toBe(false);
    expect(editor.recalculate).not.toHaveBeenCalled();
  });
  it("stages stepper quantity and manual provenance together without waiting for a future animation frame", () => {
    const editor = stagedEditor();
    const frame = jest.spyOn(globalThis, "requestAnimationFrame").mockImplementation(() => 1);
    const committed = jest.spyOn(quantityTrace, "recordConsumerRepairQuantityReactCommit");
    let renderer!: ReactTestRenderer;
    const renderRow = () => <ConsumerRepairItemRow item={editor.current()}
      onDecrease={jest.fn()} onIncrease={jest.fn()}
      onQuantityChange={(id, value) => {
        void editor.mutable.changeItemQuantity(id, value);
        renderer.update(renderRow());
      }} onUnitPriceChange={jest.fn()} onRemove={jest.fn()} />;
    try {
      act(() => { renderer = TestRenderer.create(renderRow()); });
      act(() => { renderer.root.findByProps({ testID: "consumer-repair-item-plus-test-owned-row" }).props.onPress(); });
      expect(editor.current().quantity).toBe(15.25);
      expect(renderer.root.findByProps({ testID: "consumer-repair-item-quantity-input-test-owned-row" }).props.value).toBe("15.25");
      if (renderer.root.findAllByProps({ testID: "consumer-repair-item-quantity-mode-test-owned-row" }).length === 0) {
        act(() => renderer.root.findByProps({ testID: "consumer-repair-item-professional-proof-test-owned-row" }).props.onPress());
      }
      expect(renderer.root.findByProps({ testID: "consumer-repair-item-quantity-mode-test-owned-row" }).props.children).toBe("Введено вручную. По формуле: 14.25 м³.");
      expect(frame).not.toHaveBeenCalled();
      expect(editor.recalculate).not.toHaveBeenCalled();
      expect(editor.original.quantity).toBe(14.25);
      expect(committed).toHaveBeenCalledTimes(1);
      act(() => { renderer.root.findByProps({ testID: "consumer-repair-item-plus-test-owned-row" }).props.onPress(); });
      expect(editor.current().quantity).toBe(16.25);
      expect(consumerRepairRowCalculatedQuantity(editor.current())).toBe(14.25);
      expect(committed).toHaveBeenCalledTimes(2);
      act(() => { renderer.root.findByProps({ testID: "consumer-repair-item-restore-calculated-test-owned-row" }).props.onPress(); });
      expect(editor.current().quantity).toBe(14.25);
      if (renderer.root.findAllByProps({ testID: "consumer-repair-item-quantity-mode-test-owned-row" }).length === 0) {
        act(() => renderer.root.findByProps({ testID: "consumer-repair-item-professional-proof-test-owned-row" }).props.onPress());
      }
      expect(renderer.root.findByProps({ testID: "consumer-repair-item-quantity-mode-test-owned-row" }).props.children).toBe("Рассчитано автоматически: 14.25 м³. Поле можно изменить.");
      expect(editor.recalculate).not.toHaveBeenCalled();
      expect(committed).toHaveBeenCalledTimes(3);
      expect(committed.mock.calls[2]![0]).toMatchObject({ source: "programmatic", nextQuantity: 14.25, baseRevisionId: "test-parent" });
    } finally {
      act(() => renderer?.unmount());
      frame.mockRestore();
      committed.mockRestore();
    }
  });

  it("retains the post-paint durable transaction path for non-backend rows", async () => {
    const editor = stagedEditor({ sourceParameters: {} });
    const callbacks: FrameRequestCallback[] = [];
    const frame = jest.spyOn(globalThis, "requestAnimationFrame").mockImplementation(callback => { callbacks.push(callback); return callbacks.length; });
    const onQuantityChange = jest.fn();
    let renderer!: ReactTestRenderer;
    try {
      act(() => { renderer = TestRenderer.create(<ConsumerRepairItemRow item={editor.current()}
        onDecrease={jest.fn()} onIncrease={jest.fn()} onQuantityChange={onQuantityChange}
        onUnitPriceChange={jest.fn()} onRemove={jest.fn()} />); });
      act(() => { renderer.root.findByProps({ testID: "consumer-repair-item-plus-test-owned-row" }).props.onPress(); });
      expect(renderer.root.findByProps({ testID: "consumer-repair-item-quantity-input-test-owned-row" }).props.value).toBe("15.25");
      expect(onQuantityChange).not.toHaveBeenCalled();
      expect(callbacks).toHaveLength(1);
      await act(async () => { callbacks[0]!(0); await Promise.resolve(); });
      expect(onQuantityChange).toHaveBeenCalledTimes(1);
      expect(onQuantityChange.mock.calls[0]?.slice(0, 2)).toEqual(["test-owned-row", "15.25"]);
    } finally {
      act(() => renderer?.unmount());
      frame.mockRestore();
    }
  });
  it("shows a staged manual value against the unchanged formula before Apply, without saving", async () => {
    const editor = stagedEditor();
    await editor.mutable.changeItemQuantity("test-owned-row", "16");
    expect(editor.current().quantity).toBe(16);
    expect(editor.current().sourceParameters).toMatchObject({
      manualQuantityOverride: true, calculatedQuantityBeforeOverride: 14.25,
    });
    expectMode(editor.current(), "Введено вручную. По формуле: 14.25 м³.");
    expect(editor.mutable.state.pendingCanonicalRowEditCount).toBe(1);
    expect(editor.recalculate).not.toHaveBeenCalled();
    expect(editor.original.quantity).toBe(14.25);
    expect(editor.original.sourceParameters).not.toHaveProperty("manualQuantityOverride");
  });

  it("does not replace the baseline on repeated quantity or price edits, including an explicit equal-value pin", async () => {
    const editor = stagedEditor();
    await editor.mutable.changeItemQuantity("test-owned-row", "16");
    await editor.mutable.changeItemQuantity("test-owned-row", "17");
    await editor.mutable.changeItemUnitPrice("test-owned-row", "99");
    expect(editor.current()).toMatchObject({ quantity: 17, unitPrice: 99, totalPrice: 1683 });
    expect(consumerRepairRowCalculatedQuantity(editor.current())).toBe(14.25);
    await editor.mutable.changeItemQuantity("test-owned-row", "14.25");
    expect(editor.current().sourceParameters?.manualQuantityOverride).toBe(true);
    expect(consumerRepairRowCalculatedQuantity(editor.current())).toBe(14.25);
    expect(editor.recalculate).not.toHaveBeenCalled();
  });

  it("preserves an already-pinned row's current backend baseline rather than its applied quantity", async () => {
    const editor = stagedEditor({ quantity: 18, sourceParameters: {
      canonicalBackendRevisionId: "test-parent", canonicalBackendReleaseId: "test-release", rowCode: "test:bedding",
      manualQuantityOverride: true, calculatedQuantityBeforeOverride: "26.30625",
    } });
    await editor.mutable.changeItemQuantity("test-owned-row", "20");
    expect(consumerRepairRowCalculatedQuantity(editor.current())).toBe(26.30625);
    expectMode(editor.current(), "Введено вручную. По формуле: 26.30625 м³.");
  });

  it("does not turn a price-only edit into a manual quantity override", async () => {
    const editor = stagedEditor();
    await editor.mutable.changeItemUnitPrice("test-owned-row", "2");
    expect(editor.current()).toMatchObject({ quantity: 14.25, unitPrice: 2, totalPrice: 28.5 });
    expect(editor.current().sourceParameters).toEqual(editor.original.sourceParameters);
    expectMode(editor.current(), "Рассчитано автоматически: 14.25 м³. Поле можно изменить.");
    expect(editor.recalculate).not.toHaveBeenCalled();
  });

  it("retains the pending manual value and formula baseline after a failed single Apply", async () => {
    const editor = stagedEditor();
    await editor.mutable.changeItemQuantity("test-owned-row", "16");
    const pending = editor.current();
    editor.recalculate.mockRejectedValueOnce(new Error("TEST_BACKEND_UNAVAILABLE"));
    expect(await editor.mutable.applyPendingCanonicalRowEdits()).toBe(false);
    expect(editor.recalculate).toHaveBeenCalledTimes(1);
    expect(editor.recalculate.mock.calls[0][0].rowOverrides).toMatchObject({ "test:bedding": { quantity: 16 } });
    expect(editor.current()).toEqual(pending);
    expect(editor.mutable.state.pendingCanonicalRowEditCount).toBe(1);
    expect(editor.mutable.state.statusMessage).toBe("TEST_BACKEND_UNAVAILABLE");
    expectMode(editor.current(), "Введено вручную. По формуле: 14.25 м³.");
    expect(editor.original.quantity).toBe(14.25);
  });

  it("restores the actual known formula immediately while the backend reset remains staged", async () => {
    const editor = stagedEditor();
    await editor.mutable.changeItemQuantity("test-owned-row", "16");
    await editor.mutable.changeItemQuantity("test-owned-row", "");
    await editor.mutable.changeItemUnitPrice("test-owned-row", "2");
    expect(editor.current()).toMatchObject({ quantity: 14.25, unitPrice: 2, totalPrice: 28.5, quantityEditedByConsumer: false });
    expect(editor.current().sourceParameters?.manualQuantityOverride).toBe(false);
    expectMode(editor.current(), "Рассчитано автоматически: 14.25 м³. Поле можно изменить.");
    expect(editor.mutable.state.pendingCanonicalRowEditCount).toBe(1);
    expect(editor.recalculate).not.toHaveBeenCalled();
  });

  it("preserves a zero formula result through a manual edit and reset", async () => {
    const editor = stagedEditor({ quantity: 0 });
    await editor.mutable.changeItemQuantity("test-owned-row", "2");
    expect(consumerRepairRowCalculatedQuantity(editor.current())).toBe(0);
    await editor.mutable.changeItemQuantity("test-owned-row", "");
    expect(editor.current().quantity).toBe(0);
    expectMode(editor.current(), "Рассчитано автоматически: 0 м³. Поле можно изменить.");
  });

  it("does not invent a formula baseline for a preliminary unknown quantity", async () => {
    const editor = stagedEditor({ quantity: null, sourceParameters: {
      canonicalBackendRevisionId: "test-parent", canonicalBackendReleaseId: "test-release", rowCode: "test:bedding",
      canonicalPreliminaryNeed: true,
    } });
    await editor.mutable.changeItemQuantity("test-owned-row", "4");
    expect(editor.current().quantity).toBe(4);
    expect(consumerRepairRowCalculatedQuantity(editor.current())).toBeNull();
    expectMode(editor.current(), "Введено вручную. Расчётное количество пока неизвестно.");
    await editor.mutable.changeItemQuantity("test-owned-row", "");
    expect(editor.current().quantity).toBeNull();
    expect(consumerRepairRowCalculatedQuantity(editor.current())).toBeNull();
    expect(editor.recalculate).not.toHaveBeenCalled();
  });
});
