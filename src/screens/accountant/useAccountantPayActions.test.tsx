import React from "react";
import { Pressable, Text } from "react-native";
import TestRenderer, { act } from "react-test-renderer";

import {
  getPlatformObservabilityEvents,
  resetPlatformObservabilityEvents,
} from "../../lib/observability/platformObservability";
import { useAccountantPayActions } from "./useAccountantPayActions";

const mockAccountantAddPaymentWithAllocations = jest.fn();

jest.mock("../../lib/logError", () => ({
  logError: jest.fn(),
}));

jest.mock("../../lib/api/accountant", () => ({
  accountantAddPaymentWithAllocations: (...args: unknown[]) =>
    mockAccountantAddPaymentWithAllocations(...args),
}));

function PayActionsHarness(props: {
  safeAlert: jest.Mock;
  closeCard: jest.Mock;
  setCurrentPaymentId: jest.Mock;
  setRows: jest.Mock;
  afterPaymentSync: jest.Mock;
  persistInvoiceMetaIfNeeded: jest.Mock;
}) {
  const { addPayment } = useAccountantPayActions({
    canAct: true,
    current: {
      proposal_id: "proposal-1",
      invoice_amount: 100,
      total_paid: 0,
    },
    amount: "10",
    accountantFio: "Accountant",
    payKind: "bank",
    note: "",
    allocRows: [{ proposal_item_id: "item-1", amount: 10 }],
    allocOk: true,
    purposePrefix: "Payment",
    persistInvoiceMetaIfNeeded: props.persistInvoiceMetaIfNeeded,
    afterPaymentSync: props.afterPaymentSync,
    closeCard: props.closeCard,
    setCurrentPaymentId: props.setCurrentPaymentId,
    setRows: props.setRows,
    safeAlert: props.safeAlert,
    errText: (error) => (error instanceof Error ? error.message : String(error ?? "")),
  });

  return (
    <Pressable
      testID="pay-actions-trigger"
      onPress={() => {
        void addPayment();
      }}
    >
      <Text>pay</Text>
    </Pressable>
  );
}

describe("useAccountantPayActions", () => {
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    (globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;
    resetPlatformObservabilityEvents();
    mockAccountantAddPaymentWithAllocations.mockReset();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it("exposes apply failure visibly and records observability without false success", async () => {
    mockAccountantAddPaymentWithAllocations.mockRejectedValue(new Error("payment apply failed"));

    const safeAlert = jest.fn();
    const closeCard = jest.fn();
    const setCurrentPaymentId = jest.fn();
    const setRows = jest.fn();
    const afterPaymentSync = jest.fn().mockResolvedValue(undefined);
    const persistInvoiceMetaIfNeeded = jest.fn().mockResolvedValue(undefined);

    let renderer!: ReturnType<typeof TestRenderer.create>;
    await act(async () => {
      renderer = TestRenderer.create(
        <PayActionsHarness
          safeAlert={safeAlert}
          closeCard={closeCard}
          setCurrentPaymentId={setCurrentPaymentId}
          setRows={setRows}
          afterPaymentSync={afterPaymentSync}
          persistInvoiceMetaIfNeeded={persistInvoiceMetaIfNeeded}
        />,
      );
    });

    await act(async () => {
      renderer.root.findByProps({ testID: "pay-actions-trigger" }).props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(safeAlert).toHaveBeenCalled();
    expect(closeCard).not.toHaveBeenCalled();
    expect(setCurrentPaymentId).not.toHaveBeenCalled();

    const events = getPlatformObservabilityEvents();
    expect(events.some((event) => event.event === "payment_apply_failed")).toBe(true);
    expect(
      events.some((event) => event.event === "payment_apply" && event.result === "success"),
    ).toBe(false);
  });
});
