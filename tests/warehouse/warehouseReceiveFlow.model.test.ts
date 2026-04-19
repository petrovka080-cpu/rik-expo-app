import {
  buildWarehouseReceiveEnqueueTelemetry,
  buildWarehouseReceiveManualRetryTelemetry,
  buildWarehouseReceiveRemoteTruth,
  buildWarehouseReceiveSelection,
  shouldRequeueWarehouseReceiveManualRetry,
  toWarehouseReceiveDraftItemsFromInputMap,
  toWarehouseReceiveQtyInputMap,
} from "../../src/screens/warehouse/hooks/warehouseReceiveFlow.model";

describe("warehouseReceiveFlow model", () => {
  beforeEach(() => {
    jest.spyOn(Date, "now").mockReturnValue(1710000000000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("normalizes input map entries into draft items without invalid or empty quantities", () => {
    expect(
      toWarehouseReceiveDraftItemsFromInputMap({
        "  item-a  ": " 1,5 ",
        "item-b": "0",
        "item-c": "-2",
        "item-d": "abc",
        "item-e": " 2 000 ",
        "   ": "7",
      }),
    ).toEqual([
      {
        itemId: "item-a",
        qty: 1.5,
        localUpdatedAt: 1710000000000,
      },
      {
        itemId: "item-e",
        qty: 2000,
        localUpdatedAt: 1710000000000,
      },
    ]);
  });

  it("maps draft items back to the qty input shape used by the receive modal", () => {
    expect(
      toWarehouseReceiveQtyInputMap([
        { itemId: "purchase-1", qty: 2, localUpdatedAt: 1 },
        { itemId: "purchase-2", qty: 3.5, localUpdatedAt: 2 },
      ]),
    ).toEqual({
      "purchase-1": "2",
      "purchase-2": "3.5",
    });
  });

  it("builds receive selection from remaining quantities and clamps selected qty to left", () => {
    expect(
      buildWarehouseReceiveSelection(
        [
          {
            purchase_item_id: "purchase-1",
            qty_expected: 10,
            qty_received: 3,
          },
          {
            purchase_item_id: "purchase-2",
            qty_expected: 4,
            qty_received: 0,
            qty_left: 1,
          },
        ],
        {
          "purchase-1": "99",
          "purchase-2": "0,5",
        },
      ),
    ).toEqual({
      items: [
        {
          itemId: "purchase-1",
          qty: 7,
          localUpdatedAt: 1710000000000,
        },
        {
          itemId: "purchase-2",
          qty: 0.5,
          localUpdatedAt: 1710000000000,
        },
      ],
      payload: [
        { purchase_item_id: "purchase-1", qty: 7 },
        { purchase_item_id: "purchase-2", qty: 0.5 },
      ],
    });
  });

  it("skips rows that cannot produce a positive receive selection", () => {
    expect(
      buildWarehouseReceiveSelection(
        [
          { purchase_item_id: "", qty_expected: 1, qty_received: 0 },
          { purchase_item_id: "received", qty_expected: 1, qty_received: 1 },
          { purchase_item_id: "blank", qty_left: 5 },
          { purchase_item_id: "bad", qty_left: 5 },
          { purchase_item_id: "negative", qty_left: 5 },
        ],
        {
          blank: "",
          bad: "not-a-number",
          negative: "-1",
        },
      ),
    ).toEqual({
      items: [],
      payload: [],
    });
  });

  it("builds pending remote truth from positive remaining receive rows", () => {
    expect(
      buildWarehouseReceiveRemoteTruth("incoming-1", [
        {
          purchase_item_id: "purchase-1",
          qty_expected: 10,
          qty_received: 4,
        },
        {
          purchase_item_id: "purchase-2",
          qty_expected: 8,
          qty_received: 0,
          qty_left: 3,
        },
      ]),
    ).toEqual({
      kind: "warehouse_receive",
      entityId: "incoming-1",
      present: true,
      remainingCount: 9,
      terminal: false,
      terminalWhenMissing: true,
      status: "pending",
      reason: "receive_remaining_qty_zero",
    });
  });

  it("builds completed remote truth when receive rows are gone", () => {
    expect(buildWarehouseReceiveRemoteTruth("incoming-missing", [])).toEqual({
      kind: "warehouse_receive",
      entityId: "incoming-missing",
      present: false,
      remainingCount: 0,
      terminal: true,
      terminalWhenMissing: true,
      status: "completed",
      reason: "not_in_receive_scope",
    });
  });

  it("builds completed remote truth when all received rows have no remaining qty", () => {
    expect(
      buildWarehouseReceiveRemoteTruth("incoming-complete", [
        {
          purchase_item_id: "purchase-1",
          qty_expected: 10,
          qty_received: 10,
        },
        {
          purchase_item_id: "purchase-2",
          qty_expected: 5,
          qty_received: 1,
          qty_left: 0,
        },
      ]),
    ).toEqual({
      kind: "warehouse_receive",
      entityId: "incoming-complete",
      present: true,
      remainingCount: 0,
      terminal: true,
      terminalWhenMissing: true,
      status: "completed",
      reason: "receive_remaining_qty_zero",
    });
  });

  it("plans enqueue telemetry without keeping queue branching in the hook", () => {
    expect(
      buildWarehouseReceiveEnqueueTelemetry({
        incomingId: "incoming-1",
        coalescedCount: 2,
        retryCount: 3,
        pendingCount: 4,
        networkOnline: false,
      }),
    ).toEqual({
      contourKey: "warehouse_receive",
      entityKey: "incoming-1",
      syncStatus: "queued",
      queueAction: "coalesce",
      coalesced: true,
      retryCount: 3,
      pendingCount: 4,
      failureClass: "none",
      triggerKind: "submit",
      networkKnownOffline: true,
      restoredAfterReopen: false,
      manualRetry: false,
      durationMs: null,
    });

    expect(
      buildWarehouseReceiveEnqueueTelemetry({
        incomingId: "incoming-2",
        pendingCount: 1,
        networkOnline: true,
      }),
    ).toMatchObject({
      entityKey: "incoming-2",
      queueAction: "enqueue",
      coalesced: false,
      retryCount: 0,
      pendingCount: 1,
      networkKnownOffline: false,
    });
  });

  it("plans manual retry telemetry and final-state requeue decisions", () => {
    expect(shouldRequeueWarehouseReceiveManualRetry("conflicted")).toBe(true);
    expect(shouldRequeueWarehouseReceiveManualRetry("failed_non_retryable")).toBe(true);
    expect(shouldRequeueWarehouseReceiveManualRetry("retry_wait")).toBe(false);

    expect(
      buildWarehouseReceiveManualRetryTelemetry({
        incomingId: "incoming-conflict",
        draftStatus: "queued",
        draftRetryCount: 2,
        draftPendingCount: 3,
        queuedStatus: "conflicted",
        networkOnline: true,
      }),
    ).toMatchObject({
      entityKey: "incoming-conflict",
      syncStatus: "queued",
      queueAction: "manual_retry",
      failureClass: "conflicted",
      retryCount: 2,
      pendingCount: 3,
      manualRetry: true,
      networkKnownOffline: false,
    });

    expect(
      buildWarehouseReceiveManualRetryTelemetry({
        incomingId: "incoming-terminal",
        draftStatus: "failed_terminal",
        queuedStatus: "retry_wait",
        networkOnline: false,
      }),
    ).toMatchObject({
      entityKey: "incoming-terminal",
      syncStatus: "failed_terminal",
      failureClass: "failed_non_retryable",
      retryCount: 0,
      pendingCount: 0,
      networkKnownOffline: true,
    });
  });

});
