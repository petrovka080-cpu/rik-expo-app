import { createMemoryOfflineStorage } from "../../lib/offline/offlineStorage";
import { fetchRequestDetails, listRequestItems } from "../../lib/catalog_api";
import {
  clearForemanDurableDraftState,
  configureForemanDurableDraftStore,
  replaceForemanDurableDraftSnapshot,
} from "./foreman.durableDraft.store";
import {
  loadForemanRemoteDraftSnapshot,
  resolveForemanDraftBootstrap,
  type ForemanLocalDraftSnapshot,
} from "./foreman.localDraft";

jest.mock("../../lib/catalog_api", () => ({
  clearLocalDraftId: jest.fn(),
  fetchRequestDetails: jest.fn(),
  listRequestItems: jest.fn(),
  setLocalDraftId: jest.fn(),
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockFetchRequestDetails = fetchRequestDetails as unknown as jest.Mock;
const mockListRequestItems = listRequestItems as unknown as jest.Mock;

const sampleSnapshot: ForemanLocalDraftSnapshot = {
  version: 1,
  ownerId: "srv:req-lifecycle-1",
  requestId: "req-lifecycle-1",
  displayNo: "REQ-9999/2026",
  status: "draft",
  header: {
    foreman: "Wave1C Foreman",
    comment: "draft comment",
    objectType: "OBJ",
    level: "L1",
    system: "SYS",
    zone: "Z1",
  },
  items: [
    {
      local_id: "local-1",
      remote_item_id: "item-1",
      rik_code: "MAT-1",
      name_human: "Material 1",
      qty: 2,
      uom: "pcs",
      status: "draft",
      note: "note",
      app_code: null,
      kind: "material",
      line_no: 1,
    },
  ],
  qtyDrafts: {
    "item-1": "2",
  },
  pendingDeletes: [],
  submitRequested: false,
  lastError: null,
  updatedAt: "2026-03-30T12:00:00.000Z",
};

describe("foreman local draft lifecycle boundary", () => {
  beforeEach(async () => {
    configureForemanDurableDraftStore({ storage: createMemoryOfflineStorage() });
    await clearForemanDurableDraftState();
    mockFetchRequestDetails.mockReset();
    mockListRequestItems.mockReset();
  });

  it("clears durable bootstrap snapshot when remote request is already submitted", async () => {
    await replaceForemanDurableDraftSnapshot(sampleSnapshot);

    const clearDraftCache = jest.fn(async () => undefined);
    const fetchDetails = jest.fn(async () => ({
      id: "req-lifecycle-1",
      status: "pending",
      display_no: "REQ-9999/2026",
    }));

    const result = await resolveForemanDraftBootstrap({
      localDraftId: "req-lifecycle-1",
      clearDraftCache,
      fetchDetails,
    });

    expect(fetchDetails).toHaveBeenCalledWith("req-lifecycle-1");
    expect(clearDraftCache).toHaveBeenCalledWith({
      snapshot: sampleSnapshot,
      requestId: "req-lifecycle-1",
    });
    expect(result).toEqual({
      kind: "none",
      restoreSource: "none",
      restoreIdentity: null,
    });
  });

  it("treats submitted remote request as terminal and does not rebuild mutable snapshot", async () => {
    mockFetchRequestDetails.mockResolvedValue({
      id: "req-lifecycle-1",
      status: "pending",
      display_no: "REQ-9999/2026",
    });

    const result = await loadForemanRemoteDraftSnapshot({
      requestId: "req-lifecycle-1",
    });

    expect(mockFetchRequestDetails).toHaveBeenCalledWith("req-lifecycle-1");
    expect(mockListRequestItems).not.toHaveBeenCalled();
    expect(result).toEqual({
      snapshot: null,
      details: {
        id: "req-lifecycle-1",
        status: "pending",
        display_no: "REQ-9999/2026",
      },
      isTerminal: true,
    });
  });
});
