// WORK draft: NOT RUN. Reuses the actual existing controller test harness.
import React from "react";
import TestRenderer, {act,type ReactTestRenderer} from "react-test-renderer";
import {Alert} from "react-native";
import {ConsumerRepairItemRow} from "../../src/features/consumerRepair/ConsumerRepairItemRow";
import {ConsumerRepairRequestScreenController} from "../../src/features/consumerRepair/ConsumerRepairRequestScreen";
import type {ConsumerRepairDraftBundle,ConsumerRepairRequestItem} from "../../src/lib/consumerRequests/consumerRequestTypes";
import {canonicalExactPurchaseInputV1,normalizeCanonicalExactPurchaseEditV1,stepCanonicalExactPurchaseV1,
  canonicalExactPurchaseEditMatchesV1} from "../../src/features/consumerRepair/canonicalExactPurchaseEditingV1";
import * as quantityTrace from "../../src/features/consumerRepair/consumerRepairQuantityEditTrace";
import {consumerEstimateUnresolvedQuantityItems,isConsumerEstimatePayableItem} from "../../src/lib/consumerRequests/consumerEstimateReadiness";
import {buildCanonicalProcurementPreviewRows} from "../../src/features/consumerRepair/canonicalProcurementPreviewRows";
import type {EstimateDraftRevision} from "../../src/lib/estimate/estimateDraftRevisionContract";
import {canonicalConsumerRepairMarketplaceProjection} from "../../src/lib/consumerRequests/consumerRequestMarketplaceService";
jest.mock("@expo/vector-icons",()=>({Ionicons:()=>null}));
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
    changeItemUnitPrice: (id: string, value: string) => Promise<void>;
    applyPendingCanonicalRowEdits: () => Promise<boolean>;
    cancelPendingCanonicalRowEdits: () => void;
    canonicalRowEditorResetKeys: Readonly<Record<string, number>>;
    pendingCanonicalRowOverrides: Record<string,{quantity?:string|number|null}>;
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

function exactEditor(raw="9007199254740993.123456789") {
  return stagedEditor({quantity:Number(raw),unit:"m",unitLabel:"м",titleRu:"Мой материал",unitPrice:12.5,totalPrice:null,
    sourceParameters:{rowCode:"test:bedding",canonicalBackendRevisionId:"test-parent",canonicalBackendReleaseId:"test-release",
      manualQuantityOverride:true,calculatedQuantityBeforeOverride:"9007199254741000",
      canonicalExactPurchaseQuantityV1:{version:"canonical-exact-purchase-quantity/v1",quantityText:raw,manualQuantityText:raw,
        calculatedQuantityText:"9007199254741000"}}});
}

function supplyBlock(ownerRowId="test:bedding",rawManualQuantity="8.000") {
  return {version:"canonical-manual-purchase-supply-block/v1",policy:"retain-raw-and-block-quantum",ownerRowId,unitId:"m",
    rawManualQuantity,manualProvenance:{kind:"manual",reason:"test"},reasonCode:"ORDER_QUANTUM_VIOLATION",quantum:"75",
    procurementReady:false,physicalBalanceReady:false,derivedQuantityPublishable:false};
}
function blockedEditor() {
  const editor=exactEditor("8.000"), item=editor.current();
  item.sourceParameters={...item.sourceParameters,canonicalPurchaseSupplyBlocksV1:[supplyBlock()],
    includedInEstimate:false,includedInProcurement:false,canonicalManualTitleOverride:true};
  return editor;
}

test("known manual Q still blocks approval and an unsaved new multiple is not a ready cost",async()=>{
  const editor=blockedEditor();
  expect(consumerEstimateUnresolvedQuantityItems(editor.mutable.state.bundle).map(row=>row.id)).toEqual([editor.original.id]);
  expect(isConsumerEstimatePayableItem(editor.current())).toBe(false);
  await editor.mutable.changeItemQuantity(editor.original.id,"75");
  expect(editor.current().totalPrice).toBeNull();expect(editor.current().unitPrice).toBe(12.5);
  expect(consumerEstimateUnresolvedQuantityItems(editor.mutable.state.bundle)).toHaveLength(1);
});

test("blocked row does not present a user exclusion or computed amount, and preserves exact input",()=>{
  const editor=blockedEditor();let renderer!:ReactTestRenderer;
  try {
    act(()=>{renderer=TestRenderer.create(<ConsumerRepairItemRow item={editor.current()} onDecrease={jest.fn()} onIncrease={jest.fn()}
      onQuantityChange={jest.fn()} onUnitPriceChange={jest.fn()} onRemove={jest.fn()}/>);});
    expect(renderer.root.findByProps({testID:"consumer-repair-item-quantity-input-test-owned-row"}).props.value).toBe("8.000");
    expect(renderer.root.findAllByProps({testID:"consumer-repair-item-optional-toggle-test-owned-row"})).toHaveLength(0);
    expect(renderer.root.findByProps({testID:"consumer-repair-item-total-test-owned-row"}).props.children).toBe("Не суммируется");
    expect(renderer.root.findByProps({testID:"consumer-repair-item-unit-price-input-test-owned-row"}).props.value).toBeTruthy();
  } finally {act(()=>renderer?.unmount());}
});

test("preview reports blocked owner/need with null order and exact reason, ignoring stale revisions and duplicates",()=>{
  const editor=blockedEditor(), item=editor.current();
  const row={rowId:"test:bedding",rowType:"material",titleRu:item.titleRu,quantity:8,unit:"m",currency:"KGS",
    unitPrice:12.5,includedInProcurement:false,sourceParameters:item.sourceParameters};
  const revision={revisionId:"test-parent",boq:{rows:[row]}} as unknown as EstimateDraftRevision;
  const need={...item,id:"need",sourceParameters:{...item.sourceParameters,canonicalPreliminaryNeed:true}};
  const preview=buildCanonicalProcurementPreviewRows(revision,[need]);
  expect(preview).toHaveLength(1);expect(preview[0]).toMatchObject({quantity:null,preliminary:true,supplyBlocked:true,unitPrice:12.5,titleRu:"Мой материал"});
  expect(preview[0].quantityDetails).toHaveLength(1);expect(preview[0].quantityDetails[0]).toContain("8.000");
  const empty={...revision,boq:{rows:[]}} as unknown as EstimateDraftRevision;
  expect(buildCanonicalProcurementPreviewRows(empty,[{...need,sourceParameters:{...need.sourceParameters,canonicalBackendRevisionId:"other"}}])).toEqual([]);
  expect(buildCanonicalProcurementPreviewRows(empty,[need,need])).toHaveLength(1);
});

test("ready opt-in preview retains lexical Q over a normalized saved balance; ordinary path stays the balance",()=>{
  const editor=exactEditor("75.000"),source=editor.current().sourceParameters;
  const balance={ownerRowId:"test:bedding",unitId:"m",consumed:"3",stock:"0",reserve:"0",effectiveOrder:"75",
    remaining:"72",freeBeyondReserve:"72",consumptionShortage:"0",reserveDeficit:"0",quantum:"75"};
  const row={rowId:"test:bedding",rowType:"material",titleRu:"Материал",quantity:75,unit:"m",currency:"KGS",
    includedInProcurement:true,sourceParameters:{...source,canonicalPurchaseBalance:balance}};
  const revision={revisionId:"test-parent",boq:{rows:[row]}} as unknown as EstimateDraftRevision;
  expect(buildCanonicalProcurementPreviewRows(revision)[0].quantity).toBe("75.000");
  delete (row.sourceParameters as Record<string,unknown>).canonicalExactPurchaseQuantityV1;
  expect(buildCanonicalProcurementPreviewRows(revision)[0].quantity).toBe("75");
});

test("ordinary send blocks the full saved supply composition before filtering needs; exact remote transport stays closed",()=>{
  const artifact={artifactId:"test-artifact",kind:"procurement" as const,status:"ready" as const,
    revisionId:"test-parent",releaseId:"test-release",sha256:"a".repeat(64),revisionChecksumSha256:"b".repeat(64)};
  const blocked=blockedEditor();blocked.current().sourceParameters!.canonicalPreliminaryNeed=true;
  expect(()=>canonicalConsumerRepairMarketplaceProjection(blocked.mutable.state.bundle,artifact))
    .toThrow(expect.objectContaining({code:"PROCUREMENT_SUPPLY_QUANTUM_BLOCKED"}));
  const ready=exactEditor("75.000");
  expect(()=>canonicalConsumerRepairMarketplaceProjection(ready.mutable.state.bundle,artifact))
    .toThrow(expect.objectContaining({code:"PROCUREMENT_EXACT_QUANTITY_TRANSPORT_UNSUPPORTED"}));
});
test("exact edit domain retains lexical value and separates adjacent values beyond Number precision",()=>{
  expect(normalizeCanonicalExactPurchaseEditV1(" +0008,000 ")).toBe("+0008.000");
  expect(stepCanonicalExactPurchaseV1("9007199254740993.123456789",1)).toBe("9007199254740994.123456789");
  expect(stepCanonicalExactPurchaseV1("",1)).toBeNull();expect(stepCanonicalExactPurchaseV1("0",-1)).toBe("0");
  expect(canonicalExactPurchaseEditMatchesV1("9007199254740993","9007199254740992")).toBe(false);
  expect(canonicalExactPurchaseEditMatchesV1("8.00","8")).toBe(false);
  for(const bad of ["8.0000000001","-1","1e2","8 0","Infinity"])expect(()=>normalizeCanonicalExactPurchaseEditV1(bad)).toThrow();
});
test("pending and actual recalc request retain exact string; old Q, title and price stay immutable",async()=>{
  const editor=exactEditor(),before=JSON.stringify(editor.original);
  await editor.mutable.changeItemQuantity(editor.original.id,"9007199254740994.123456789");
  expect(editor.mutable.pendingCanonicalRowOverrides["test:bedding"].quantity).toBe("9007199254740994.123456789");
  expect(canonicalExactPurchaseInputV1(editor.current())).toBe("9007199254740994.123456789");
  editor.recalculate.mockRejectedValueOnce(new Error("TEST_STOP_BEFORE_SERVER"));
  await editor.mutable.applyPendingCanonicalRowEdits();
  expect(editor.recalculate.mock.calls[0][0].rowOverrides["test:bedding"].quantity).toBe("9007199254740994.123456789");
  expect(JSON.stringify(editor.original)).toBe(before);expect(editor.current().unitPrice).toBe(12.5);
});
test("exact equality does not drop a meaningful pending string edit, and undo restores saved raw data",async()=>{
  const editor=exactEditor("8.00"),before=JSON.stringify(editor.original),alert=jest.spyOn(Alert,"alert").mockImplementation(()=>{});
  try {
    await editor.mutable.changeItemQuantity(editor.original.id,"8");expect(editor.mutable.state.pendingCanonicalRowEditCount).toBe(1);
    editor.mutable.cancelPendingCanonicalRowEdits();
    expect(alert.mock.calls[0][1]).toContain("количество 8 → 8.00");alert.mock.calls[0][2]![1].onPress!();
    expect(canonicalExactPurchaseInputV1(editor.current())).toBe("8.00");expect(editor.current().unitPrice).toBe(12.5);
    expect(editor.mutable.state.pendingCanonicalRowEditCount).toBe(0);expect(JSON.stringify(editor.original)).toBe(before);
  } finally {alert.mockRestore();}
});
test("exact no-op with surrounding whitespace does not create a manual amendment, including zero",async()=>{
  for(const raw of ["8.000","0.000"]){
    const editor=exactEditor(raw),before=JSON.stringify(editor.original);
    await editor.mutable.changeItemQuantity(editor.original.id,`  ${raw}  `);
    expect(editor.mutable.pendingCanonicalRowOverrides).toEqual({});
    expect(editor.mutable.state.pendingCanonicalRowEditCount).toBe(0);
    expect(canonicalExactPurchaseInputV1(editor.current())).toBe(raw);
    expect(JSON.stringify(editor.original)).toBe(before);
  }
});
test("clear override uses the saved exact formula string, not the numeric display baseline",async()=>{
  const editor=exactEditor();await editor.mutable.changeItemQuantity(editor.original.id,"");
  expect(editor.mutable.pendingCanonicalRowOverrides["test:bedding"].quantity).toBeNull();
  expect(canonicalExactPurchaseInputV1(editor.current())).toBe("9007199254741000");
  expect(editor.current().sourceParameters?.manualQuantityOverride).toBe(false);
});
test("row input, stepper and acknowledgement use exact parent text and survive reopen",()=>{
  const editor=exactEditor(),change=jest.fn(),committed=jest.spyOn(quantityTrace,"recordConsumerRepairQuantityReactCommit");
  const view=(item:ConsumerRepairRequestItem)=><ConsumerRepairItemRow item={item} onDecrease={jest.fn()} onIncrease={jest.fn()}
    onQuantityChange={change} onUnitPriceChange={jest.fn()} onRemove={jest.fn()}/>;
  let renderer!:ReactTestRenderer;
  try {
    act(()=>{renderer=TestRenderer.create(view(editor.current()));});
    expect(renderer.root.findByProps({testID:"consumer-repair-item-quantity-input-test-owned-row"}).props.value).toBe("9007199254740993.123456789");
    act(()=>renderer.root.findByProps({testID:"consumer-repair-item-plus-test-owned-row"}).props.onPress());
    expect(change.mock.calls[0][1]).toBe("9007199254740994.123456789");expect(committed).not.toHaveBeenCalled();
    const confirmed={...editor.current(),sourceParameters:{...editor.current().sourceParameters,
      canonicalExactPurchaseQuantityV1:{version:"canonical-exact-purchase-quantity/v1",quantityText:"9007199254740994.123456789",
        manualQuantityText:"9007199254740994.123456789",calculatedQuantityText:"9007199254741000"}}};
    act(()=>renderer.update(view(confirmed)));expect(committed).toHaveBeenCalledTimes(1);
    act(()=>renderer.unmount());act(()=>{renderer=TestRenderer.create(view(JSON.parse(JSON.stringify(confirmed))));});
    expect(renderer.root.findByProps({testID:"consumer-repair-item-quantity-input-test-owned-row"}).props.value).toBe("9007199254740994.123456789");
  } finally {if(renderer)act(()=>renderer.unmount());committed.mockRestore();}
});
test("legacy rows still send numeric amendments through the original branch",async()=>{
  const editor=stagedEditor();await editor.mutable.changeItemQuantity(editor.original.id,"16");
  expect(editor.mutable.pendingCanonicalRowOverrides["test:bedding"].quantity).toBe(16);
});
