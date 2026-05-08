import {
  openProposalViewAction,
  setProposalBuyerFioAction,
} from "./buyer.actions";
import {
  repoGetProposalItemsForView,
  repoGetProposalRequestItemIntegrity,
  repoGetRequestItemsByIds,
  repoSetProposalBuyerFio,
} from "./buyer.repo";

jest.mock("./buyer.repo", () => ({
  repoGetProposalItemsForView: jest.fn(),
  repoGetProposalRequestItemIntegrity: jest.fn(),
  repoGetRequestItemsByIds: jest.fn(),
  repoGetProposalItemLinks: jest.fn(),
  repoGetRequestItemToRequestMap: jest.fn(),
  repoSetProposalBuyerFio: jest.fn(),
  repoUpdateProposalItems: jest.fn(),
}));

const mockRepoGetProposalItemsForView =
  repoGetProposalItemsForView as unknown as jest.Mock;
const mockRepoGetProposalRequestItemIntegrity =
  repoGetProposalRequestItemIntegrity as unknown as jest.Mock;
const mockRepoGetRequestItemsByIds =
  repoGetRequestItemsByIds as unknown as jest.Mock;
const mockRepoSetProposalBuyerFio =
  repoSetProposalBuyerFio as unknown as jest.Mock;

describe("buyer proposal recovery view", () => {
  beforeEach(() => {
    mockRepoGetProposalItemsForView.mockReset();
    mockRepoGetProposalRequestItemIntegrity.mockReset();
    mockRepoGetRequestItemsByIds.mockReset();
    mockRepoSetProposalBuyerFio.mockReset();
  });

  it("preserves degraded proposal line when source request item is missing", async () => {
    mockRepoGetProposalItemsForView.mockResolvedValue([
      {
        request_item_id: "ri-missing",
        name_human: "Snapshot line",
        uom: "pcs",
        qty: 2,
        rik_code: "MAT-1",
        app_code: "APP-1",
        price: 10,
        supplier: "Supplier",
        note: "snapshot note",
      },
    ]);
    mockRepoGetRequestItemsByIds.mockResolvedValue([]);
    mockRepoGetProposalRequestItemIntegrity.mockResolvedValue([
      {
        proposal_id: "proposal-1",
        proposal_item_id: 1,
        request_item_id: "ri-missing",
        integrity_state: "source_missing",
        integrity_reason: "request_item_missing",
        request_item_exists: false,
        request_item_status: null,
        request_item_cancelled_at: null,
      },
    ]);

    const setPropViewLines = jest.fn();
    const setPropViewBusy = jest.fn();

    await openProposalViewAction({
      pidStr: "proposal-1",
      head: { id: "proposal-1" },
      supabase: {} as never,
      openPropDetailsSheet: jest.fn(),
      setPropViewId: jest.fn(),
      setPropViewHead: jest.fn(),
      setPropViewLines,
      setPropViewBusy,
      log: jest.fn(),
    });

    expect(setPropViewLines).toHaveBeenLastCalledWith([
      expect.objectContaining({
        request_item_id: "ri-missing",
        name_human: "Snapshot line",
        request_item_integrity_state: "source_missing",
        request_item_integrity_reason: "request_item_missing",
      }),
    ]);
    expect(setPropViewBusy).toHaveBeenLastCalledWith(false);
  });

  it("resolves buyer FIO from auth metadata before saving", async () => {
    const supabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: {
            user: {
              user_metadata: {
                full_name: " Buyer One ",
                name: "Ignored Name",
              },
            },
          },
        }),
      },
    } as never;

    await setProposalBuyerFioAction({
      supabase,
      propId: "proposal-1",
      log: jest.fn(),
    });

    expect(mockRepoSetProposalBuyerFio).toHaveBeenCalledWith(
      supabase,
      "proposal-1",
      "Buyer One",
    );
  });
});
