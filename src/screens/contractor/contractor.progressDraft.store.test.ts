import { createMemoryOfflineStorage } from "../../lib/offline/offlineStorage";
import {
  configureContractorProgressDraftStore,
  getContractorProgressDraft,
  hydrateContractorProgressDraftStore,
  markContractorProgressSynced,
  setContractorProgressDraftFields,
  useContractorProgressDraftStore,
} from "./contractor.progressDraft.store";

const STORAGE_KEY = "contractor_progress_draft_store_v2";
const LEGACY_STORAGE_KEY = "contractor_progress_draft_store_v1";

describe("contractor progress draft storage discipline", () => {
  beforeEach(() => {
    useContractorProgressDraftStore.setState({
      hydrated: false,
      drafts: {},
    });
  });

  it("migrates legacy payload into the active boundary and prunes empty synced records", async () => {
    const storage = createMemoryOfflineStorage({
      [LEGACY_STORAGE_KEY]: JSON.stringify({
        version: 2,
        drafts: {
          staleSynced: {
            progressId: "staleSynced",
            syncStatus: "synced",
            fields: {},
            materials: [],
          },
          activeDirty: {
            progressId: "activeDirty",
            syncStatus: "dirty_local",
            fields: { comment: "needs sync" },
            materials: [],
          },
        },
      }),
    });
    configureContractorProgressDraftStore({ storage });

    const state = await hydrateContractorProgressDraftStore();
    const dump = storage.dump();

    expect(state.drafts.staleSynced).toBeUndefined();
    expect(state.drafts.activeDirty?.fields.comment).toBe("needs sync");
    expect(dump[LEGACY_STORAGE_KEY]).toBeUndefined();
    expect(dump[STORAGE_KEY]).toContain("activeDirty");
    expect(dump[STORAGE_KEY]).not.toContain("staleSynced");
  });

  it("keeps synced state in memory but removes empty synced progress drafts from persistence", async () => {
    const storage = createMemoryOfflineStorage();
    configureContractorProgressDraftStore({ storage });

    await setContractorProgressDraftFields("progress-1", { comment: "done soon" });
    expect(storage.dump()[STORAGE_KEY]).toContain("progress-1");

    await markContractorProgressSynced("progress-1");

    expect(getContractorProgressDraft("progress-1")?.syncStatus).toBe("synced");
    expect(storage.dump()[STORAGE_KEY]).toBeUndefined();
    expect(storage.dump()[LEGACY_STORAGE_KEY]).toBeUndefined();
  });

  it("removes stale legacy storage when the active v2 boundary is already present", async () => {
    const storage = createMemoryOfflineStorage({
      [STORAGE_KEY]: JSON.stringify({
        version: 2,
        drafts: {
          activeDirty: {
            progressId: "activeDirty",
            syncStatus: "dirty_local",
            fields: { comment: "active v2" },
            materials: [],
          },
        },
      }),
      [LEGACY_STORAGE_KEY]: JSON.stringify({
        version: 2,
        drafts: {
          staleLegacy: {
            progressId: "staleLegacy",
            syncStatus: "dirty_local",
            fields: { comment: "old" },
            materials: [],
          },
        },
      }),
    });
    configureContractorProgressDraftStore({ storage });

    const state = await hydrateContractorProgressDraftStore();
    const dump = storage.dump();

    expect(state.drafts.activeDirty?.fields.comment).toBe("active v2");
    expect(state.drafts.staleLegacy).toBeUndefined();
    expect(dump[LEGACY_STORAGE_KEY]).toBeUndefined();
  });
});
