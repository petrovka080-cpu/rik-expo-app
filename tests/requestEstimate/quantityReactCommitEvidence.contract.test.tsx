import React from "react";
import { StyleSheet } from "react-native";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";

import { ConsumerRepairItemRow } from "../../src/features/consumerRepair/ConsumerRepairItemRow";
import * as trace from "../../src/features/consumerRepair/consumerRepairQuantityEditTrace";
import { logger } from "../../src/lib/logger";
import type { ConsumerRepairRequestItem } from "../../src/lib/consumerRequests/consumerRequestTypes";

jest.mock("@expo/vector-icons", () => ({ Ionicons: () => null }));

const event = { operationId: "test-reaction", itemId: "test-row", source: "stepper" as const,
  previousQuantity: 14.25, nextQuantity: 15.25 };
const store = globalThis as typeof globalThis & { __consumerRepairQuantityEditTrace?: { events: trace.ConsumerRepairQuantityEditTraceEvent[] } };

function row(): ConsumerRepairRequestItem {
  return { id: "test-row", requestDraftId: "test-owned-draft", itemType: "material", titleRu: "Основание",
    quantity: 14.25, unit: "m3", unitLabel: "м³", unitPrice: null, totalPrice: null, currency: "KGS",
    source: "ai_suggested", editableByConsumer: true, createdAt: "2026-10-02T00:00:00.000Z",
    sourceParameters: { canonicalBackendRevisionId: "test-parent", rowCode: "test:bedding" } };
}

describe("bounded quantity React-commit evidence, not physical-frame acceptance", () => {
  beforeEach(() => { delete store.__consumerRepairQuantityEditTrace; });
  afterEach(() => { jest.restoreAllMocks(); delete store.__consumerRepairQuantityEditTrace; });

  it("measures the matching action to React commit without printing business content", () => {
    const clock = jest.spyOn(performance, "now").mockReturnValue(100);
    const log = jest.spyOn(logger, "info").mockImplementation(() => undefined);
    trace.recordConsumerRepairQuantityEditStage({ ...event, stage: "QUANTITY_ACTION_RECEIVED" });
    clock.mockReturnValue(412.345);
    expect(trace.recordConsumerRepairQuantityReactCommit({ ...event, baseRevisionId: "test-parent" })).toBe(312.35);
    expect(store.__consumerRepairQuantityEditTrace?.events.at(-1)).toMatchObject({
      stage: "ROW_DRAFT_REACT_COMMITTED", elapsedMs: 312.35, baseRevisionId: "test-parent",
    });
    const publicEvidence = JSON.parse(log.mock.calls[0]![1] as string);
    expect(publicEvidence).toEqual({ stage: "ROW_DRAFT_REACT_COMMITTED", source: "stepper", elapsedMs: 312.35,
      measurementScope: "JS_ACTION_TO_REACT_COMMIT_NOT_NATIVE_FRAME_OR_SAVE" });
    expect(publicEvidence).not.toHaveProperty("nextQuantity");
    expect(publicEvidence).not.toHaveProperty("itemId");
  });

  it("reports a missing or evicted start as unknown and keeps the trace bounded", () => {
    expect(trace.recordConsumerRepairQuantityReactCommit({ ...event, baseRevisionId: "test-parent" })).toBeNull();
    trace.recordConsumerRepairQuantityEditStage({ ...event, stage: "QUANTITY_ACTION_RECEIVED" });
    for (let index = 0; index < 161; index += 1) {
      trace.recordConsumerRepairQuantityEditStage({ ...event, operationId: `other-${index}`, stage: "VISIBLE_INPUT_UPDATED" });
    }
    expect(trace.recordConsumerRepairQuantityReactCommit({ ...event, baseRevisionId: "test-parent" })).toBeNull();
    expect(store.__consumerRepairQuantityEditTrace?.events).toHaveLength(160);
    expect(store.__consumerRepairQuantityEditTrace?.events.at(-1)?.elapsedMs).toBeNull();
  });

  it("cannot make editing fail when the diagnostic logger fails", () => {
    jest.spyOn(logger, "info").mockImplementation(() => { throw new Error("TEST_DIAGNOSTIC_FAILURE"); });
    expect(trace.recordConsumerRepairQuantityReactCommit({ ...event, baseRevisionId: "test-parent" })).toBeNull();
  });

  it("does not interpret a backwards diagnostic clock as a fast successful response", () => {
    const clock = jest.spyOn(performance, "now").mockReturnValue(100);
    trace.recordConsumerRepairQuantityEditStage({ ...event, stage: "QUANTITY_ACTION_RECEIVED" });
    clock.mockReturnValue(90);
    expect(trace.recordConsumerRepairQuantityReactCommit({ ...event, baseRevisionId: "test-parent" })).toBeNull();
  });

  it("does not acknowledge local text until the same parent row's quantity and manual provenance agree", () => {
    const committed = jest.spyOn(trace, "recordConsumerRepairQuantityReactCommit");
    const noop = jest.fn();
    const item = row();
    let renderer!: ReactTestRenderer;
    const render = (current: ConsumerRepairRequestItem) => <ConsumerRepairItemRow item={current}
      onDecrease={noop} onIncrease={noop} onQuantityChange={noop} onUnitPriceChange={noop} onRemove={noop} />;
    try {
      act(() => { renderer = TestRenderer.create(render(item)); });
      act(() => { renderer.root.findByProps({ testID: "consumer-repair-item-plus-test-row" }).props.onPress(); });
      expect(committed).not.toHaveBeenCalled();
      act(() => { renderer.update(render({ ...item, quantity: 15.25 })); });
      expect(committed).not.toHaveBeenCalled();
      act(() => { renderer.update(render({ ...item, quantity: 15.25, sourceParameters: {
        ...item.sourceParameters, manualQuantityOverride: true, calculatedQuantityBeforeOverride: 14.25 } })); });
      expect(committed).toHaveBeenCalledTimes(1);
      expect(committed.mock.calls[0]![0]).toMatchObject({ itemId: "test-row", baseRevisionId: "test-parent", nextQuantity: 15.25 });
      act(() => { renderer.update(render({ ...item, quantity: 15.25, sourceParameters: {
        ...item.sourceParameters, manualQuantityOverride: true, calculatedQuantityBeforeOverride: 14.25 } })); });
      expect(committed).toHaveBeenCalledTimes(1);
    } finally { act(() => renderer?.unmount()); }
  });

  it("does not transfer an acknowledgement to another revision", () => {
    const committed = jest.spyOn(trace, "recordConsumerRepairQuantityReactCommit");
    const noop = jest.fn();
    const item = row();
    let renderer!: ReactTestRenderer;
    const render = (current: ConsumerRepairRequestItem) => <ConsumerRepairItemRow item={current}
      onDecrease={noop} onIncrease={noop} onQuantityChange={noop} onUnitPriceChange={noop} onRemove={noop} />;
    try {
      act(() => { renderer = TestRenderer.create(render(item)); });
      act(() => { renderer.root.findByProps({ testID: "consumer-repair-item-plus-test-row" }).props.onPress(); });
      act(() => { renderer.update(render({ ...item, quantity: 15.25, sourceParameters: {
        ...item.sourceParameters, canonicalBackendRevisionId: "test-other-parent", manualQuantityOverride: true } })); });
      expect(committed).not.toHaveBeenCalled();
    } finally { act(() => renderer?.unmount()); }
  });

  it("gives a long calculated quantity more space without truncating or rounding the input", () => {
    const noop = jest.fn();
    let renderer!: ReactTestRenderer;
    try {
      act(() => { renderer = TestRenderer.create(<ConsumerRepairItemRow item={{ ...row(), quantity: 69.171546141 }}
        onDecrease={noop} onIncrease={noop} onQuantityChange={noop} onUnitPriceChange={noop} onRemove={noop} />); });
      const input = renderer.root.findByProps({ testID: "consumer-repair-item-quantity-input-test-row" });
      expect(input.props.value).toBe("69.171546141");
      expect(StyleSheet.flatten(input.props.style).width).toBe(140);
    } finally { act(() => renderer?.unmount()); }
  });

  it("attributes synchronous render work only to an active action, not to a completed or old one", () => {
    const clock = jest.spyOn(performance, "now").mockReturnValue(100);
    const log = jest.spyOn(logger, "info").mockImplementation(() => undefined);
    const result = { businessResult: "unchanged" };
    const work = jest.fn(() => { clock.mockReturnValue(120); return result; });
    expect(trace.measureConsumerRepairQuantityRenderWork("DRAFT_VIEW_MODEL", work)).toBe(result);
    expect(log).not.toHaveBeenCalled();
    clock.mockReturnValue(100);
    trace.recordConsumerRepairQuantityEditStage({ ...event, stage: "QUANTITY_ACTION_RECEIVED" });
    expect(trace.measureConsumerRepairQuantityRenderWork("DRAFT_VIEW_MODEL", work)).toBe(result);
    expect(JSON.parse(log.mock.calls[0]![1] as string)).toEqual({ phase: "DRAFT_VIEW_MODEL", elapsedMs: 20,
      measurementScope: "SYNCHRONOUS_JS_WORK_NOT_NATIVE_FRAME_OR_SAVE" });
    trace.recordConsumerRepairQuantityReactCommit({ ...event, baseRevisionId: "test-parent" });
    log.mockClear();
    expect(trace.measureConsumerRepairQuantityRenderWork("DRAFT_VIEW_MODEL", work)).toBe(result);
    expect(log).not.toHaveBeenCalled();
    clock.mockReturnValue(200);
    trace.recordConsumerRepairQuantityEditStage({ ...event, operationId: "old", stage: "QUANTITY_ACTION_RECEIVED" });
    clock.mockReturnValue(5_201);
    trace.measureConsumerRepairQuantityRenderWork("DRAFT_VIEW_MODEL", () => result);
    expect(log).not.toHaveBeenCalled();
  });

  it("never changes a work result or its original error when render diagnostics fail", () => {
    trace.recordConsumerRepairQuantityEditStage({ ...event, stage: "QUANTITY_ACTION_RECEIVED" });
    jest.spyOn(logger, "info").mockImplementation(() => { throw new Error("TEST_LOG_FAILURE"); });
    const result = {};
    expect(trace.measureConsumerRepairQuantityRenderWork("PUBLIC_TITLE_ADMISSION", () => result)).toBe(result);
    const failure = new Error("ORIGINAL_WORK_FAILURE");
    expect(() => trace.measureConsumerRepairQuantityRenderWork("PUBLIC_TITLE_ADMISSION", () => { throw failure; })).toThrow(failure);
  });
});
