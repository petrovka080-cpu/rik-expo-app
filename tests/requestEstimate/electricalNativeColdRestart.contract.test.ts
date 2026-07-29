import { Platform } from "react-native";

import { buildConsumerRepairSelectedWorkDraftBundle } from "../../src/features/consumerRepair/requestEstimateScreenActions";
import {
  __resetConsumerRepairRequestStoreForTests,
  __simulateConsumerRepairRequestStoreReloadForTests,
  applyConsumerRepairDraftRevisionParamPatch,
  getConsumerRepairRequest,
  initializeConsumerRepairTransactionalDurableStorage,
} from "../../src/lib/consumerRequests";
import { setConsumerRepairTransactionalDurableStoreForTests } from "../../src/lib/consumerRequests/consumerRequestRepository";
import {
  flushTransactionalConsumerRepairWrites,
} from "../../src/lib/platform/consumerRepairTransactionalDurableBridge";
import {
  AsyncStorageEstimateRevisionDurableStore,
  type AsyncKeyValueStorage,
} from "../../src/lib/platform/estimateRevisionDurableStore.asyncStorage";

class AsyncStorageColdRestartDouble implements AsyncKeyValueStorage {
  readonly values = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.values.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.values.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.values.delete(key);
  }
}

function currentRevision(
  bundle: ReturnType<typeof getConsumerRepairRequest>,
) {
  const state = bundle.estimateDraftRevisionState;
  return state?.revisions.find(
    (revision) => revision.revisionId === state.currentRevisionId,
  ) ?? null;
}

describe("canonical electrical native cold restart", () => {
  const originalPlatformOs = Platform.OS;
  const originalNavigatorDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "navigator",
  );

  beforeEach(() => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      get: () => "android",
    });
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: { product: "ReactNative" },
    });
    __resetConsumerRepairRequestStoreForTests();
  });

  afterEach(() => {
    __resetConsumerRepairRequestStoreForTests();
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      get: () => originalPlatformOs,
    });
    if (originalNavigatorDescriptor) {
      Object.defineProperty(
        globalThis,
        "navigator",
        originalNavigatorDescriptor,
      );
    } else {
      Reflect.deleteProperty(globalThis, "navigator");
    }
  });

  it("restores the exact revision from AsyncStorage and keeps recalculation durable", async () => {
    const storage = new AsyncStorageColdRestartDouble();
    setConsumerRepairTransactionalDurableStoreForTests(
      new AsyncStorageEstimateRevisionDurableStore(storage),
    );
    const { bundle } = buildConsumerRepairSelectedWorkDraftBundle({
      consumerUserId: "electrical-native-cold-restart",
      problemText:
        "электромонтаж под ключ, площадь 300 м², длина трассы 500 м, " +
        "30 розеток, 20 выключателей, 25 точек освещения, " +
        "открытая прокладка в кабель-канале",
      repairType: "estimate",
      city: "Bishkek",
      addressText: "redacted test address",
      preferredTimeText: "",
      contactPhone: "redacted",
      selectedWork: null,
    });
    await flushTransactionalConsumerRepairWrites();
    const initialRevision = currentRevision(bundle);
    expect(initialRevision?.resolvedIdentity).toMatchObject({
      passportId: "ELECTRICAL_CANONICAL_V1",
      passportVersion: "1.0.0",
      legacyFallbackUsed: false,
      fallbackReason: null,
    });

    __simulateConsumerRepairRequestStoreReloadForTests();
    setConsumerRepairTransactionalDurableStoreForTests(
      new AsyncStorageEstimateRevisionDurableStore(storage),
    );
    await initializeConsumerRepairTransactionalDurableStorage();
    const restored = getConsumerRepairRequest(bundle.draft.id);
    const restoredRevision = currentRevision(restored);

    expect(restoredRevision?.revisionId).toBe(initialRevision?.revisionId);
    expect(restoredRevision?.resolvedIdentity).toEqual(
      initialRevision?.resolvedIdentity,
    );
    expect(restored.canonicalParameterSession?.fingerprint).toBe(
      bundle.canonicalParameterSession?.fingerprint,
    );
    expect(restored.draft.addressText).toBe("redacted test address");
    expect(restored.draft.contactPhone).toBe("redacted");

    const recalculated = applyConsumerRepairDraftRevisionParamPatch({
      requestDraftId: restored.draft.id,
      operation: "update_param",
      paramKey: "route_length_m",
      rawValue: "650",
      createdAt: "2026-07-29T12:00:00.000Z",
    });
    await flushTransactionalConsumerRepairWrites();
    expect(currentRevision(recalculated)?.revisionId).not.toBe(
      restoredRevision?.revisionId,
    );
    expect(
      currentRevision(recalculated)?.params.route_length_m,
    ).toMatchObject({
      value: 650,
      source: "edited_by_user",
    });

    __simulateConsumerRepairRequestStoreReloadForTests();
    setConsumerRepairTransactionalDurableStoreForTests(
      new AsyncStorageEstimateRevisionDurableStore(storage),
    );
    await initializeConsumerRepairTransactionalDurableStorage();
    const restartedAfterEdit = getConsumerRepairRequest(bundle.draft.id);
    const restartedRevision = currentRevision(restartedAfterEdit);

    expect(restartedRevision?.revisionId).toBe(
      currentRevision(recalculated)?.revisionId,
    );
    expect(restartedRevision?.params.route_length_m).toMatchObject({
      value: 650,
      source: "edited_by_user",
    });
    expect(restartedRevision?.resolvedIdentity).toMatchObject({
      passportId: "ELECTRICAL_CANONICAL_V1",
      legacyFallbackUsed: false,
    });
  });
});
