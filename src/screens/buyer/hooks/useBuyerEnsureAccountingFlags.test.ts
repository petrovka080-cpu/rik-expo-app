import fs from "fs";
import path from "path";
import { fetchBuyerAccountingFlags } from "./useBuyerAccountingFlagsRepo";
import { verifyBuyerAccountingServerState } from "./useBuyerEnsureAccountingFlags";
import {
  fetchBuyerAccountingFlagsRow,
  updateBuyerAccountingFlagsRow,
} from "./useBuyerAccountingFlags.transport";

jest.mock("./useBuyerAccountingFlagsRepo", () => ({
  fetchBuyerAccountingFlags: jest.fn(),
}));

const mockedFetchBuyerAccountingFlags =
  fetchBuyerAccountingFlags as unknown as jest.Mock;

const readSource = (relativePath: string): string =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("useBuyerEnsureAccountingFlags server-truth boundary", () => {
  beforeEach(() => {
    mockedFetchBuyerAccountingFlags.mockReset();
  });

  it("keeps buyer accounting flags provider calls behind the typed transport", () => {
    const repoSource = readSource("src/screens/buyer/hooks/useBuyerAccountingFlagsRepo.ts");
    const transportSource = readSource("src/screens/buyer/hooks/useBuyerAccountingFlags.transport.ts");

    expect(repoSource).toContain('from "./useBuyerAccountingFlags.transport"');
    expect(repoSource).toContain("fetchBuyerAccountingFlagsRow");
    expect(repoSource).toContain("updateBuyerAccountingFlagsRow");
    expect(repoSource).not.toContain('.from("proposals")');
    expect(transportSource.match(/\.from\("proposals"\)/g) ?? []).toHaveLength(2);
    expect(transportSource).toContain('select("payment_status, sent_to_accountant_at, invoice_amount")');
    expect(transportSource).toContain(".update(update)");
  });

  it("preserves buyer accounting flag read transport semantics", async () => {
    const maybeSingle = jest.fn(async () => ({
      data: {
        payment_status: "sent",
        sent_to_accountant_at: "2026-05-08T12:00:00.000Z",
        invoice_amount: 120,
      },
      error: null,
    }));
    const eq = jest.fn(() => ({ maybeSingle }));
    const select = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ select }));

    const result = await fetchBuyerAccountingFlagsRow(
      { from } as never,
      "proposal-1",
    );

    expect(result.data).toEqual({
      payment_status: "sent",
      sent_to_accountant_at: "2026-05-08T12:00:00.000Z",
      invoice_amount: 120,
    });
    expect(from).toHaveBeenCalledWith("proposals");
    expect(select).toHaveBeenCalledWith("payment_status, sent_to_accountant_at, invoice_amount");
    expect(eq).toHaveBeenCalledWith("id", "proposal-1");
    expect(maybeSingle).toHaveBeenCalledTimes(1);
  });

  it("preserves buyer accounting flag update transport semantics", async () => {
    const update = {
      payment_status: "sent",
      sent_to_accountant_at: "2026-05-08T12:00:00.000Z",
      invoice_amount: 120,
    };
    const updateResult = { data: null, error: null };
    const eq = jest.fn(async () => updateResult);
    const updateFn = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ update: updateFn }));

    await expect(
      updateBuyerAccountingFlagsRow({ from } as never, "proposal-1", update),
    ).resolves.toBe(updateResult);

    expect(from).toHaveBeenCalledWith("proposals");
    expect(updateFn).toHaveBeenCalledWith(update);
    expect(eq).toHaveBeenCalledWith("id", "proposal-1");
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
