import { fetchBuyerAccountingFlags } from "./useBuyerAccountingFlagsRepo";
import { verifyBuyerAccountingServerState } from "./useBuyerEnsureAccountingFlags";

jest.mock("./useBuyerAccountingFlagsRepo", () => ({
  fetchBuyerAccountingFlags: jest.fn(),
}));

const mockedFetchBuyerAccountingFlags =
  fetchBuyerAccountingFlags as unknown as jest.Mock;

describe("useBuyerEnsureAccountingFlags server-truth boundary", () => {
  beforeEach(() => {
    mockedFetchBuyerAccountingFlags.mockReset();
  });

  it("accepts only authoritative server state with sent_to_accountant_at", async () => {
    mockedFetchBuyerAccountingFlags.mockResolvedValueOnce({
      data: {
        payment_status: "К оплате",
        sent_to_accountant_at: "2026-03-30T12:00:00.000Z",
        invoice_amount: 100,
      },
      error: null,
    });

    await expect(
      verifyBuyerAccountingServerState({ supabase: {} as never, proposalId: "proposal-1" }),
    ).resolves.toEqual({
      paymentStatus: "К оплате",
      sentToAccountantAt: "2026-03-30T12:00:00.000Z",
      invoiceAmount: 100,
    });
  });

  it("rejects stale server state instead of recreating final flags locally", async () => {
    mockedFetchBuyerAccountingFlags.mockResolvedValueOnce({
      data: {
        payment_status: null,
        sent_to_accountant_at: null,
        invoice_amount: null,
      },
      error: null,
    });

    await expect(
      verifyBuyerAccountingServerState({ supabase: {} as never, proposalId: "proposal-1" }),
    ).rejects.toThrow("Server truth did not confirm sent_to_accountant_at");
  });

  it("propagates readback failures instead of swallowing them", async () => {
    mockedFetchBuyerAccountingFlags.mockResolvedValueOnce({
      data: null,
      error: new Error("readback failed"),
    });

    await expect(
      verifyBuyerAccountingServerState({ supabase: {} as never, proposalId: "proposal-1" }),
    ).rejects.toThrow("readback failed");
  });
});
