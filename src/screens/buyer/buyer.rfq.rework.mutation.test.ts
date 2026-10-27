import {
  clearRequestItemsDirectorRejectState,
  publishRfq,
} from "./buyer.actions.repo";
import { isBuyerMutationFailure } from "./buyer.mutation.shared";
import { repoUpdateProposalItems } from "./buyer.repo";
import { publishRfqAction } from "./buyer.rfq.mutation";
import { rwSendToDirectorAction } from "./buyer.rework.mutation";

jest.mock("../../lib/supabaseClient", () => ({ supabase: {} }));

jest.mock("./buyer.actions.repo", () => ({
  clearRequestItemsDirectorRejectState: jest.fn(),
  publishRfq: jest.fn(),
}));

jest.mock("./buyer.repo", () => ({
  repoUpdateProposalItems: jest.fn(),
}));

const mockedClearRequestItemsDirectorRejectState =
  clearRequestItemsDirectorRejectState as unknown as jest.Mock;
const mockedPublishRfq = publishRfq as unknown as jest.Mock;
const mockedRepoUpdateProposalItems = repoUpdateProposalItems as unknown as jest.Mock;

const buildProposalUpdateSupabase = (errors: (unknown | null)[]) => {
  let callIndex = 0;
  return {
    from: jest.fn(() => ({
      update: jest.fn(() => ({
        eq: jest.fn(async () => ({
          error: errors[callIndex++] ?? null,
        })),
      })),
    })),
  } as never;
};

describe("buyer rfq and rework mutation owners", () => {
  beforeEach(() => {
    (globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;
    mockedClearRequestItemsDirectorRejectState.mockReset().mockResolvedValue(undefined);
    mockedPublishRfq.mockReset().mockResolvedValue({ data: "tender-1", error: null });
    mockedRepoUpdateProposalItems.mockReset().mockResolvedValue(undefined);
  });

  it("keeps RFQ happy path inside the rfq owner", async () => {
    const alert = jest.fn();

    const result = await publishRfqAction({
      pickedIds: ["ri-1"],
      rfqDeadlineIso: "2030-03-30T12:30:00.000Z",
      rfqDeliveryDays: "2",
      rfqCity: "Bishkek",
      rfqAddressText: "",
      rfqPhone: "700123456",
      rfqCountryCode: "+996",
      rfqEmail: "",
      rfqVisibility: "open",
      rfqNote: "",
      supabase: {} as never,
      setBusy: jest.fn(),
      closeSheet: jest.fn(),
      alert,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.status).toBe("success");
    expect(result.data).toEqual({ tenderId: "tender-1" });
    expect(alert).toHaveBeenCalledWith("Готово", expect.stringContaining("tender-1"));
  });

  it("surfaces RFQ publish failures without hiding the exact stage", async () => {
    const alert = jest.fn();
    mockedPublishRfq.mockResolvedValue({ data: null, error: new Error("rfq failed") });

    const result = await publishRfqAction({
      pickedIds: ["ri-1"],
      rfqDeadlineIso: "2030-03-30T12:30:00.000Z",
      rfqDeliveryDays: "2",
      rfqCity: "Bishkek",
      rfqAddressText: "",
      rfqPhone: "700123456",
      rfqCountryCode: "+996",
      rfqEmail: "",
      rfqVisibility: "open",
      rfqNote: "",
      supabase: {} as never,
      setBusy: jest.fn(),
      closeSheet: jest.fn(),
      alert,
    });

    expect(isBuyerMutationFailure(result)).toBe(true);
    if (!isBuyerMutationFailure(result)) return;
    expect(result.failedStage).toBe("publish_rfq");
    expect(alert).toHaveBeenCalledWith(
      "Ошибка",
      expect.stringContaining("Публикация торгов"),
    );
  });

  it("does not show RFQ success or close the sheet when the server denies actor role", async () => {
    const alert = jest.fn();
    const closeSheet = jest.fn();
    const setBusy = jest.fn();
    mockedPublishRfq.mockResolvedValue({
      data: null,
      error: {
        code: "42501",
        message: "buyer_rfq_create_and_publish_v1: forbidden actor role",
        details: "contractor",
      },
    });

    const result = await publishRfqAction({
      pickedIds: ["ri-1"],
      rfqDeadlineIso: "2030-03-30T12:30:00.000Z",
      rfqDeliveryDays: "2",
      rfqCity: "Bishkek",
      rfqAddressText: "",
      rfqPhone: "700123456",
      rfqCountryCode: "+996",
      rfqEmail: "",
      rfqVisibility: "open",
      rfqNote: "",
      supabase: {} as never,
      setBusy,
      closeSheet,
      alert,
    });

    expect(isBuyerMutationFailure(result)).toBe(true);
    if (!isBuyerMutationFailure(result)) return;
    expect(result.failedStage).toBe("publish_rfq");
    expect(result.message).toContain("forbidden actor role");
    expect(closeSheet).not.toHaveBeenCalled();
    expect(alert).not.toHaveBeenCalledWith("Р“РѕС‚РѕРІРѕ", expect.any(String));
    expect(alert).toHaveBeenCalledWith(
      "Ошибка",
      expect.stringContaining("forbidden actor role"),
    );
    expect(setBusy).toHaveBeenNthCalledWith(1, true);
    expect(setBusy).toHaveBeenLastCalledWith(false);
  });

  it("keeps rework send-to-director happy path observable and owned", async () => {
    const alert = jest.fn();
    const setRejected = jest.fn((updater: (prev: { id?: string }[]) => { id?: string }[]) =>
      updater([{ id: "proposal-1" }]),
    );

    const result = await rwSendToDirectorAction({
      pid: "proposal-1",
      items: [{ request_item_id: "ri-1", price: "10" }],
      supabase: buildProposalUpdateSupabase([null, null]),
      proposalSubmit: async () => undefined,
      fetchInbox: async () => undefined,
      fetchBuckets: async () => undefined,
      setRejected,
      closeSheet: jest.fn(),
      setBusy: jest.fn(),
      alert,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.status).toBe("success");
    expect(result.data).toEqual({ proposalId: "proposal-1" });
    expect(setRejected).toHaveBeenCalled();
    expect(alert).toHaveBeenCalledWith("Готово", "Отправлено директору.");
  });

  it("surfaces rework send-to-director failures at the exact stage", async () => {
    const alert = jest.fn();

    const result = await rwSendToDirectorAction({
      pid: "proposal-1",
      items: [{ request_item_id: "ri-1", price: "10" }],
      supabase: buildProposalUpdateSupabase([null]),
      proposalSubmit: async () => {
        throw new Error("submit failed");
      },
      fetchInbox: async () => undefined,
      fetchBuckets: async () => undefined,
      setRejected: jest.fn(),
      closeSheet: jest.fn(),
      setBusy: jest.fn(),
      alert,
    });

    expect(isBuyerMutationFailure(result)).toBe(true);
    if (!isBuyerMutationFailure(result)) return;
    expect(result.failedStage).toBe("submit_to_director");
    expect(alert).toHaveBeenCalledWith(
      "Ошибка отправки",
      expect.stringContaining("Повторный submit директору"),
    );
  });
});
