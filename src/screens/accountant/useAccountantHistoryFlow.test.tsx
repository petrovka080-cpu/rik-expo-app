import React from "react";
import { Pressable, Text } from "react-native";
import TestRenderer, { act } from "react-test-renderer";

import { useAccountantHistoryFlow } from "./useAccountantHistoryFlow";

const mockAccountantLoadProposalFinancialState = jest.fn();

jest.mock("../../lib/api/accountant", () => ({
  accountantLoadProposalFinancialState: (...args: unknown[]) =>
    mockAccountantLoadProposalFinancialState(...args),
}));

function HistoryFlowHarness(props: {
  openCard: jest.Mock;
  safeAlert: jest.Mock;
}) {
  const { onOpenHistoryRow } = useAccountantHistoryFlow({
    setCurrentPaymentId: jest.fn(),
    setAccountantFio: jest.fn(),
    openCard: props.openCard,
    safeAlert: props.safeAlert,
    errText: (error) => (error instanceof Error ? error.message : String(error ?? "")),
  });

  return (
    <Pressable
      testID="history-open"
      onPress={() =>
        void onOpenHistoryRow({
          payment_id: 55,
          paid_at: "2026-03-30T10:00:00.000Z",
          proposal_id: "proposal-1",
          supplier: "Supplier",
          invoice_number: "INV-1",
          invoice_date: "2026-03-30",
          invoice_amount: 100,
          invoice_currency: "KGS",
          amount: 40,
          method: "Банк",
          note: null,
          has_invoice: true,
          accountant_fio: "Accountant",
          purpose: "Payment",
        })
      }
    >
      <Text>open</Text>
    </Pressable>
  );
}

describe("useAccountantHistoryFlow", () => {
  beforeEach(() => {
    mockAccountantLoadProposalFinancialState.mockReset();
  });

  it("opens history row using canonical server financial state", async () => {
    mockAccountantLoadProposalFinancialState.mockResolvedValue({
      totals: {
        totalPaid: 40,
        paymentsCount: 1,
        paymentStatus: "Частично оплачено",
      },
    });

    const openCard = jest.fn();
    const safeAlert = jest.fn();

    let renderer!: ReturnType<typeof TestRenderer.create>;
    await act(async () => {
      renderer = TestRenderer.create(
        <HistoryFlowHarness openCard={openCard} safeAlert={safeAlert} />,
      );
    });

    await act(async () => {
      renderer.root.findByProps({ testID: "history-open" }).props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockAccountantLoadProposalFinancialState).toHaveBeenCalledWith("proposal-1");
    expect(openCard).toHaveBeenCalledWith(
      expect.objectContaining({
        proposal_id: "proposal-1",
        total_paid: 40,
        payment_status: "Частично оплачено",
      }),
    );
    expect(safeAlert).not.toHaveBeenCalled();
  });

  it("shows a controlled error when canonical server state load fails", async () => {
    mockAccountantLoadProposalFinancialState.mockRejectedValue(
      new Error("financial state failed"),
    );

    const openCard = jest.fn();
    const safeAlert = jest.fn();

    let renderer!: ReturnType<typeof TestRenderer.create>;
    await act(async () => {
      renderer = TestRenderer.create(
        <HistoryFlowHarness openCard={openCard} safeAlert={safeAlert} />,
      );
    });

    await act(async () => {
      renderer.root.findByProps({ testID: "history-open" }).props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(openCard).not.toHaveBeenCalled();
    expect(safeAlert).toHaveBeenCalledWith(
      "Ошибка финансового состояния",
      expect.stringContaining("financial state failed"),
    );
  });
});
