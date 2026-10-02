import React from "react";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";

import { ConsumerRepairItemRow } from "../../src/features/consumerRepair/ConsumerRepairItemRow";
import { ConsumerRepairRequestScreenController } from "../../src/features/consumerRepair/ConsumerRepairRequestScreen";
import { consumerRepairRowCalculatedQuantity } from "../../src/features/consumerRepair/consumerRepairRowMetadata";
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
    changeItemUnitPrice: (id: string, value: string) => Promise<void>;
    applyPendingCanonicalRowEdits: () => Promise<boolean>;
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
  expect(renderer.root.findByProps({ testID: `consumer-repair-item-quantity-mode-${item.id}` }).props.children).toBe(expected);
  expect(renderer.root.findByProps({ testID: `consumer-repair-item-quantity-input-${item.id}` }).props.value).toBe(String(item.quantity ?? ""));
  act(() => renderer.unmount());
}

describe("canonical pending row quantity provenance", () => {
  it("stages stepper quantity and manual provenance together without waiting for a future animation frame", () => {
    const editor = stagedEditor();
    const frame = jest.spyOn(globalThis, "requestAnimationFrame").mockImplementation(() => 1);
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
      expect(renderer.root.findByProps({ testID: "consumer-repair-item-quantity-mode-test-owned-row" }).props.children).toBe("Введено вручную. По формуле: 14.25 м³.");
      expect(frame).not.toHaveBeenCalled();
      expect(editor.recalculate).not.toHaveBeenCalled();
      expect(editor.original.quantity).toBe(14.25);
      act(() => { renderer.root.findByProps({ testID: "consumer-repair-item-plus-test-owned-row" }).props.onPress(); });
      expect(editor.current().quantity).toBe(16.25);
      expect(consumerRepairRowCalculatedQuantity(editor.current())).toBe(14.25);
      act(() => { renderer.root.findByProps({ testID: "consumer-repair-item-restore-calculated-test-owned-row" }).props.onPress(); });
      expect(editor.current().quantity).toBe(14.25);
      expect(renderer.root.findByProps({ testID: "consumer-repair-item-quantity-mode-test-owned-row" }).props.children).toBe("Рассчитано автоматически: 14.25 м³. Поле можно изменить.");
      expect(editor.recalculate).not.toHaveBeenCalled();
    } finally {
      act(() => renderer?.unmount());
      frame.mockRestore();
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
