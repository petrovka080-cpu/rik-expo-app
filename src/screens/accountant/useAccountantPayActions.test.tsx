import React from "react";
import { Pressable, Text } from "react-native";
import TestRenderer, { act } from "react-test-renderer";

import {
  getPlatformObservabilityEvents,
  resetPlatformObservabilityEvents,
} from "../../lib/observability/platformObservability";
import { useAccountantPayActions } from "./useAccountantPayActions";

const mockAccountantLoadProposalFinancialState = jest.fn();
const mockAccountantPayInvoiceAtomic = jest.fn();

jest.mock("../../lib/logError", () => ({
  logError: jest.fn(),
}));

jest.mock("../../lib/api/accountant", () => {
  class AccountantPayInvoiceAtomicError extends Error {
    code: string;
    proposalId: string;

    constructor(result: { failureCode: string; failureMessage: string; proposalId: string }) {
      super(result.failureMessage);
      this.name = "AccountantPayInvoiceAtomicError";
      this.code = result.failureCode;
      this.proposalId = result.proposalId;
    }
  }

  return {
    AccountantPayInvoiceAtomicError,
    accountantLoadProposalFinancialState: (...args: unknown[]) =>
      mockAccountantLoadProposalFinancialState(...args),
    accountantPayInvoiceAtomic: (...args: unknown[]) =>
      mockAccountantPayInvoiceAtomic(...args),
  };
});

function PayActionsHarness(props: {
  safeAlert: jest.Mock;
  closeCard: jest.Mock;
  setCurrentPaymentId: jest.Mock;
  setRows: jest.Mock;
  afterPaymentSync: jest.Mock;
}) {
  const { addPayment } = useAccountantPayActions({
    canAct: true,
    current: {
      proposal_id: "proposal-1",
      invoice_amount: 100,
      total_paid: 0,
      invoice_number: "INV-1",
      invoice_date: "2026-03-30",
      invoice_currency: "KGS",
    },
    amount: "10",
    accountantFio: "Accountant",
    payKind: "bank",
    note: "",
    allocRows: [{ proposal_item_id: "item-1", amount: 10 }],
    allocOk: true,
    purposePrefix: "Payment",
    afterPaymentSync: props.afterPaymentSync,
    closeCard: props.closeCard,
    setCurrentPaymentId: props.setCurrentPaymentId,
    setRows: props.setRows,
    safeAlert: props.safeAlert,
    errText: (error) => (error instanceof Error ? error.message : String(error ?? "")),
    invoiceNumber: "INV-1",
    invoiceDate: "2026-03-30",
    invoiceCurrency: "KGS",
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
    mockAccountantLoadProposalFinancialState.mockReset();
    mockAccountantPayInvoiceAtomic.mockReset();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it("exposes server-side payment rejection visibly and records observability without false success", async () => {
    mockAccountantLoadProposalFinancialState.mockResolvedValue({
      proposalId: "proposal-1",
      totals: {
        payableAmount: 100,
        totalPaid: 0,
        outstandingAmount: 100,
        paymentsCount: 0,
        paymentStatus: "К оплате",
        lastPaidAt: null,
      },
      eligibility: {
        approved: true,
        sentToAccountant: true,
        paymentEligible: true,
        failureCode: null,
      },
    });
    mockAccountantPayInvoiceAtomic.mockRejectedValue(
      new Error("Requested amount exceeds outstanding balance."),
    );

    const safeAlert = jest.fn();
    const closeCard = jest.fn();
    const setCurrentPaymentId = jest.fn();
    const setRows = jest.fn();
    const afterPaymentSync = jest.fn().mockResolvedValue(undefined);

    let renderer!: ReturnType<typeof TestRenderer.create>;
    await act(async () => {
      renderer = TestRenderer.create(
        <PayActionsHarness
          safeAlert={safeAlert}
          closeCard={closeCard}
          setCurrentPaymentId={setCurrentPaymentId}
          setRows={setRows}
          afterPaymentSync={afterPaymentSync}
        />,
      );
    });

    await act(async () => {
      renderer.root.findByProps({ testID: "pay-actions-trigger" }).props.onPress();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockAccountantLoadProposalFinancialState).toHaveBeenCalledWith("proposal-1");
    expect(mockAccountantPayInvoiceAtomic).toHaveBeenCalledWith(
      expect.objectContaining({
        proposalId: "proposal-1",
        amount: 10,
        clientMutationId: expect.stringMatching(/^accountant-payment:/),
        expectedTotalPaid: 0,
        expectedOutstanding: 100,
      }),
    );
    expect(safeAlert).toHaveBeenCalled();
    expect(closeCard).not.toHaveBeenCalled();
    expect(setCurrentPaymentId).not.toHaveBeenCalled();

    const events = getPlatformObservabilityEvents();
    expect(events.some((event) => event.event === "payment_apply_failed")).toBe(true);
    expect(
      events.some((event) => event.event === "payment_apply" && event.result === "success"),
    ).toBe(false);
  });

  it("reuses the same clientMutationId when an uncertain payment result is retried", async () => {
    mockAccountantLoadProposalFinancialState.mockResolvedValue({
      proposalId: "proposal-1",
      totals: {
        payableAmount: 100,
        totalPaid: 20,
        outstandingAmount: 80,
        paymentsCount: 1,
        paymentStatus: "Частично оплачено",
        lastPaidAt: null,
      },
      eligibility: {
        approved: true,
        sentToAccountant: true,
        paymentEligible: true,
        failureCode: null,
      },
    });
    mockAccountantPayInvoiceAtomic
      .mockRejectedValueOnce(new Error("network timeout after commit uncertainty"))
      .mockResolvedValueOnce({
        ok: true,
        proposalId: "proposal-1",
        paymentId: 90,
        clientMutationId: "accountant-payment:test-retry",
        idempotentReplay: true,
        outcome: "idempotent_replay",
        totalsBefore: {
          payableAmount: 100,
          totalPaid: 20,
          outstandingAmount: 80,
          paymentStatus: "Частично оплачено",
        },
        totalsAfter: {
          payableAmount: 100,
          totalPaid: 30,
          outstandingAmount: 70,
          paymentStatus: "Частично оплачено",
        },
      });

    const safeAlert = jest.fn();
    const closeCard = jest.fn();
    const setCurrentPaymentId = jest.fn();
    const setRows = jest.fn();
    const afterPaymentSync = jest.fn().mockResolvedValue(undefined);

    let renderer!: ReturnType<typeof TestRenderer.create>;
    await act(async () => {
      renderer = TestRenderer.create(
        <PayActionsHarness
          safeAlert={safeAlert}
          closeCard={closeCard}
          setCurrentPaymentId={setCurrentPaymentId}
          setRows={setRows}
          afterPaymentSync={afterPaymentSync}
        />,
      );
    });

    await act(async () => {
      renderer.root.findByProps({ testID: "pay-actions-trigger" }).props.onPress();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    await act(async () => {
      renderer.root.findByProps({ testID: "pay-actions-trigger" }).props.onPress();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockAccountantPayInvoiceAtomic).toHaveBeenCalledTimes(2);
    const firstMutationId = mockAccountantPayInvoiceAtomic.mock.calls[0][0].clientMutationId;
    const secondMutationId = mockAccountantPayInvoiceAtomic.mock.calls[1][0].clientMutationId;
    expect(firstMutationId).toEqual(expect.stringMatching(/^accountant-payment:/));
    expect(secondMutationId).toBe(firstMutationId);
    expect(setCurrentPaymentId).toHaveBeenCalledWith(90);
    expect(closeCard).toHaveBeenCalled();
  });

  it("uses server outstanding truth and only closes after atomic rpc + post sync succeed", async () => {
    mockAccountantLoadProposalFinancialState.mockResolvedValue({
      proposalId: "proposal-1",
      totals: {
        payableAmount: 100,
        totalPaid: 20,
        outstandingAmount: 80,
        paymentsCount: 1,
        paymentStatus: "Частично оплачено",
        lastPaidAt: null,
      },
      eligibility: {
        approved: true,
        sentToAccountant: true,
        paymentEligible: true,
        failureCode: null,
      },
    });
    mockAccountantPayInvoiceAtomic.mockResolvedValue({
      ok: true,
      proposalId: "proposal-1",
      paymentId: 77,
      clientMutationId: "accountant-payment:test-success",
      idempotentReplay: false,
      outcome: "success",
      totalsBefore: {
        payableAmount: 100,
        totalPaid: 20,
        outstandingAmount: 80,
        paymentStatus: "Частично оплачено",
      },
      totalsAfter: {
        payableAmount: 100,
        totalPaid: 30,
        outstandingAmount: 70,
        paymentStatus: "Частично оплачено",
      },
    });

    const safeAlert = jest.fn();
    const closeCard = jest.fn();
    const setCurrentPaymentId = jest.fn();
    const setRows = jest.fn();
    const afterPaymentSync = jest.fn().mockResolvedValue(undefined);

    let renderer!: ReturnType<typeof TestRenderer.create>;
    await act(async () => {
      renderer = TestRenderer.create(
        <PayActionsHarness
          safeAlert={safeAlert}
          closeCard={closeCard}
          setCurrentPaymentId={setCurrentPaymentId}
          setRows={setRows}
          afterPaymentSync={afterPaymentSync}
        />,
      );
    });

    await act(async () => {
      renderer.root.findByProps({ testID: "pay-actions-trigger" }).props.onPress();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockAccountantPayInvoiceAtomic).toHaveBeenCalledWith(
      expect.objectContaining({
        proposalId: "proposal-1",
        amount: 10,
        clientMutationId: expect.stringMatching(/^accountant-payment:/),
        expectedTotalPaid: 20,
        expectedOutstanding: 80,
      }),
    );
    expect(afterPaymentSync).toHaveBeenCalledWith("proposal-1");
    expect(setCurrentPaymentId).toHaveBeenCalledWith(77);
    expect(closeCard).toHaveBeenCalled();
    expect(safeAlert).toHaveBeenCalledWith("Оплата проведена", "Оплата успешно сохранена.");
  });

  it("does not report false success when post-commit sync fails after atomic payment commit", async () => {
    mockAccountantLoadProposalFinancialState.mockResolvedValue({
      proposalId: "proposal-1",
      totals: {
        payableAmount: 100,
        totalPaid: 20,
        outstandingAmount: 80,
        paymentsCount: 1,
        paymentStatus: "Частично оплачено",
        lastPaidAt: null,
      },
      eligibility: {
        approved: true,
        sentToAccountant: true,
        paymentEligible: true,
        failureCode: null,
      },
    });
    mockAccountantPayInvoiceAtomic.mockResolvedValue({
      ok: true,
      proposalId: "proposal-1",
      paymentId: 88,
      clientMutationId: "accountant-payment:test-sync-warning",
      idempotentReplay: false,
      outcome: "success",
      totalsBefore: {
        payableAmount: 100,
        totalPaid: 20,
        outstandingAmount: 80,
        paymentStatus: "Частично оплачено",
      },
      totalsAfter: {
        payableAmount: 100,
        totalPaid: 30,
        outstandingAmount: 70,
        paymentStatus: "Частично оплачено",
      },
    });

    const safeAlert = jest.fn();
    const closeCard = jest.fn();
    const setCurrentPaymentId = jest.fn();
    const setRows = jest.fn();
    const afterPaymentSync = jest.fn().mockRejectedValue(new Error("refresh failed"));

    let renderer!: ReturnType<typeof TestRenderer.create>;
    await act(async () => {
      renderer = TestRenderer.create(
        <PayActionsHarness
          safeAlert={safeAlert}
          closeCard={closeCard}
          setCurrentPaymentId={setCurrentPaymentId}
          setRows={setRows}
          afterPaymentSync={afterPaymentSync}
        />,
      );
    });

    await act(async () => {
      renderer.root.findByProps({ testID: "pay-actions-trigger" }).props.onPress();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(setCurrentPaymentId).toHaveBeenCalledWith(88);
    expect(closeCard).not.toHaveBeenCalled();
    expect(
      safeAlert.mock.calls.some(
        ([title]: [string]) =>
          title === "Оплата проведена, но обновление экрана не завершилось",
      ),
    ).toBe(true);

    const events = getPlatformObservabilityEvents();
    expect(events.some((event) => event.event === "payment_apply_sync_failed")).toBe(true);
    expect(
      events.some((event) => event.event === "payment_apply" && event.result === "success"),
    ).toBe(false);
  });

  it("blocks concurrent double-tap from firing two RPC calls (isSubmittingRef guard)", async () => {
    let resolvePayment!: (value: unknown) => void;
    const paymentPromise = new Promise((resolve) => {
      resolvePayment = resolve;
    });

    mockAccountantLoadProposalFinancialState.mockResolvedValue({
      proposalId: "proposal-1",
      totals: {
        payableAmount: 100,
        totalPaid: 0,
        outstandingAmount: 100,
        paymentsCount: 0,
        paymentStatus: "К оплате",
        lastPaidAt: null,
      },
      eligibility: {
        approved: true,
        sentToAccountant: true,
        paymentEligible: true,
        failureCode: null,
      },
    });
    mockAccountantPayInvoiceAtomic.mockReturnValue(paymentPromise);

    const safeAlert = jest.fn();
    const closeCard = jest.fn();
    const setCurrentPaymentId = jest.fn();
    const setRows = jest.fn();
    const afterPaymentSync = jest.fn().mockResolvedValue(undefined);

    let renderer!: ReturnType<typeof TestRenderer.create>;
    await act(async () => {
      renderer = TestRenderer.create(
        <PayActionsHarness
          safeAlert={safeAlert}
          closeCard={closeCard}
          setCurrentPaymentId={setCurrentPaymentId}
          setRows={setRows}
          afterPaymentSync={afterPaymentSync}
        />,
      );
    });

    // Fire first tap (starts RPC, hangs on paymentPromise)
    await act(async () => {
      renderer.root.findByProps({ testID: "pay-actions-trigger" }).props.onPress();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    // Fire second tap while first is still in-flight
    await act(async () => {
      renderer.root.findByProps({ testID: "pay-actions-trigger" }).props.onPress();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    // Only 1 RPC call should have been made (second was suppressed)
    expect(mockAccountantPayInvoiceAtomic).toHaveBeenCalledTimes(1);

    // Resolve the first payment
    resolvePayment({
      ok: true,
      proposalId: "proposal-1",
      paymentId: 99,
      clientMutationId: "accountant-payment:test-double-tap",
      idempotentReplay: false,
      outcome: "success",
      totalsBefore: {
        payableAmount: 100,
        totalPaid: 0,
        outstandingAmount: 100,
        paymentStatus: "К оплате",
      },
      totalsAfter: {
        payableAmount: 100,
        totalPaid: 10,
        outstandingAmount: 90,
        paymentStatus: "Частично оплачено",
      },
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    // First payment succeeded normally
    expect(setCurrentPaymentId).toHaveBeenCalledWith(99);
    expect(closeCard).toHaveBeenCalled();

    // Still only 1 RPC call total
    expect(mockAccountantPayInvoiceAtomic).toHaveBeenCalledTimes(1);
  });
});
