import {
  __resetConsumerRepairRequestStoreForTests,
  createConsumerRepairRequestDraft,
  listConsumerRepairRequestHistory,
} from "../../src/lib/consumerRequests";
import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import {
  buildEstimateDraftSessionTransitionStatusMessage,
  buildInitialConsumerRepairRequestState,
  shouldShowConsumerRepairWorkSelection,
} from "../../src/features/consumerRepair/requestEstimateScreenActions";
import { buildConsumerRepairRequestRenderModel } from "../../src/features/consumerRepair/ConsumerRepairRequestScreenRenderModel";
import {
  CONSUMER_REPAIR_TEST_USER_ID,
  createApprovedConsumerRepairRequest,
} from "./consumerRepairTestHelpers";
import {
  isFreshRequestEstimateLaunchWorkspace,
  isRequestEstimatePromptComposerRendered,
  shouldSkipAcknowledgedRequestEstimateLaunch,
  shouldAutoPrepareInitialConsumerRepairRequest,
  shouldReuseAcknowledgedRequestEstimateLaunch,
} from "../../src/features/consumerRepair/ConsumerRepairRequestScreen";

describe("reload does not restore approved estimate as active draft", () => {
  it("keeps work search visible after a prompt-only draft is saved", () => {
    const bundle = createConsumerRepairRequestDraft({
      consumerUserId: CONSUMER_REPAIR_TEST_USER_ID,
      problemText: "Построить асфальтовую дорогу длиной 15 000 м",
    });

    expect(shouldShowConsumerRepairWorkSelection({
      bundle,
      selectedWork: null,
    })).toBe(true);
    expect(shouldShowConsumerRepairWorkSelection({
      bundle,
      selectedWork: {
        selectedWorkKey: "canonical-work:road",
        selectedTitleRu: "Строительство асфальтовой дороги",
        selectedCategoryKey: "other",
        selectedCategoryTitleRu: "Дорожные работы",
        rawInput: bundle.draft.problemText ?? "",
        source: "user_selected",
        resolverReGuessed: false,
      },
    })).toBe(false);
  });

  it("does not let a composer acknowledgement satisfy an automation launch without a bound draft", () => {
    expect(shouldReuseAcknowledgedRequestEstimateLaunch({
      acknowledged: true,
      requestDraftId: null,
      autoPrepare: true,
    })).toBe(false);
    expect(shouldReuseAcknowledgedRequestEstimateLaunch({
      acknowledged: true,
      requestDraftId: "consumer-draft-exact",
      autoPrepare: true,
    })).toBe(true);
    expect(shouldReuseAcknowledgedRequestEstimateLaunch({
      acknowledged: true,
      requestDraftId: null,
    })).toBe(true);
  });
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());

  it("leaves active workspace empty when history contains only an approved laminate estimate", () => {
    const laminate = createApprovedConsumerRepairRequest();
    const state = buildInitialConsumerRepairRequestState({
      history: listConsumerRepairRequestHistory(CONSUMER_REPAIR_TEST_USER_ID),
    });

    expect(state.bundle).toBeNull();
    expect(state.selectedHistoryId).toBeNull();
    expect(state.history.map((bundle) => bundle.draft.id)).toContain(laminate.draft.id);
  });

  it("does not restore the latest non-approved draft without its exact draftId", () => {
    createApprovedConsumerRepairRequest();
    const draft = createConsumerRepairRequestDraft({
      consumerUserId: CONSUMER_REPAIR_TEST_USER_ID,
      problemText: "новая смета на фундамент",
      repairType: "foundation",
      aiDraft: buildConsumerRepairAiDraft("новая смета на фундамент"),
    });
    const state = buildInitialConsumerRepairRequestState({
      history: listConsumerRepairRequestHistory(CONSUMER_REPAIR_TEST_USER_ID),
    });

    expect(state.bundle).toBeNull();
    expect(state.history.map((bundle) => bundle.draft.id)).toContain(draft.draft.id);
  });

  it("recovers only the exact active draftId on reload", () => {
    const prompt = "apartment capital renovation 101 sqm";
    const draft = createConsumerRepairRequestDraft({
      consumerUserId: CONSUMER_REPAIR_TEST_USER_ID,
      problemText: prompt,
      repairType: "repair",
      city: "Bishkek",
      addressText: "Test address 17",
      preferredTimeText: "weekday morning",
      contactPhone: "+996 700 000 001",
      aiDraft: buildConsumerRepairAiDraft(prompt),
    });

    const state = buildInitialConsumerRepairRequestState({
      initialDraftId: draft.draft.id,
      initialProblemText: `  ${prompt}  `,
      history: listConsumerRepairRequestHistory(CONSUMER_REPAIR_TEST_USER_ID),
    });

    expect(state.bundle?.draft.id).toBe(draft.draft.id);
    expect(state.problemText).toBe("");
    expect(state.selectedWork).toBeNull();
    expect(state.city).toBe("Bishkek");
    expect(state.addressText).toBe("Test address 17");
    expect(state.preferredTimeText).toBe("weekday morning");
    expect(state.contactPhone).toBe("+996 700 000 001");
    expect(state.history.map((bundle) => bundle.draft.id)).toEqual([draft.draft.id]);
  });

  it("treats an exact route draftId as authoritative over retained auto-prepare prompt provenance", () => {
    expect(shouldAutoPrepareInitialConsumerRepairRequest({
      initialProblemText: "road prompt retained in route",
      initialDraftId: "exact-active-draft",
      autoPrepare: true,
    })).toBe(false);
    expect(shouldAutoPrepareInitialConsumerRepairRequest({
      initialProblemText: "new road prompt",
      autoPrepare: true,
    })).toBe(true);
    expect(shouldAutoPrepareInitialConsumerRepairRequest({
      initialProblemText: "new prompt-only launch",
      launchId: "prompt-only-launch-0001",
    })).toBe(false);
    expect(shouldAutoPrepareInitialConsumerRepairRequest({
      initialProblemText: "new automatic launch",
      launchId: "automatic-launch-0001",
      autoPrepare: true,
    })).toBe(true);
  });

  it("does not acknowledge a fresh warm launch until the exact prompt composer replaced the old bundle", () => {
    const expectedPrompt = "roof waterproofing 220 sqm";
    const staleBundle = createConsumerRepairRequestDraft({
      consumerUserId: CONSUMER_REPAIR_TEST_USER_ID,
      problemText: "electrical installation 180 sqm",
      repairType: "electrical",
      aiDraft: buildConsumerRepairAiDraft("electrical installation 180 sqm"),
    });

    expect(isFreshRequestEstimateLaunchWorkspace({
      initialProblemText: expectedPrompt,
      launchId: "roof-launch-0001",
    })).toBe(true);
    expect(isFreshRequestEstimateLaunchWorkspace({
      initialProblemText: expectedPrompt,
      initialDraftId: staleBundle.draft.id,
      launchId: "roof-launch-0001",
    })).toBe(false);
    expect(isRequestEstimatePromptComposerRendered({
      bundle: staleBundle,
      problemText: expectedPrompt,
      expectedPrompt,
    })).toBe(false);
    expect(isRequestEstimatePromptComposerRendered({
      bundle: null,
      problemText: expectedPrompt,
      expectedPrompt,
    })).toBe(true);
    const launchState = buildInitialConsumerRepairRequestState({
      initialProblemText: expectedPrompt,
      history: [],
    });
    expect(buildConsumerRepairRequestRenderModel(launchState, {
      includeWorkSuggestions: false,
    }).workSuggestions).toEqual([]);
  });

  it("does not compile an acknowledged launch again during the route-binding remount", () => {
    const acknowledged = new Set(["exact-road-launch-0001"]);
    const isAcknowledged = (launchId: string) => acknowledged.has(launchId);

    expect(shouldSkipAcknowledgedRequestEstimateLaunch({
      launchId: " exact-road-launch-0001 ",
      isAcknowledged,
    })).toBe(true);
    expect(shouldSkipAcknowledgedRequestEstimateLaunch({
      launchId: "new-road-launch-0002",
      isAcknowledged,
    })).toBe(false);
    expect(shouldSkipAcknowledgedRequestEstimateLaunch({
      launchId: null,
      isAcknowledged,
    })).toBe(false);
    expect(shouldSkipAcknowledgedRequestEstimateLaunch({
      launchId: null,
      isAcknowledged,
      launchFingerprint: "same-native-envelope",
      isFingerprintAcknowledged: (fingerprint) =>
        fingerprint === "same-native-envelope",
    })).toBe(true);
    expect(shouldSkipAcknowledgedRequestEstimateLaunch({
      launchId: "new-explicit-launch-0003",
      isAcknowledged,
      launchFingerprint: "same-native-envelope",
      isFingerprintAcknowledged: () => true,
    })).toBe(false);
  });

  it("does not synthesize a retired legacy DraftSession for a canonical backend draft", () => {
    const draft = createConsumerRepairRequestDraft({
      consumerUserId: CONSUMER_REPAIR_TEST_USER_ID,
      problemText: "road without confirmed geometry",
      repairType: "road",
      aiDraft: buildConsumerRepairAiDraft("road without confirmed geometry"),
    });
    expect(draft.estimateDraftSession).toBeNull();
    expect(buildEstimateDraftSessionTransitionStatusMessage(draft)).toBe("Состояние сметы обновлено.");
  });

  it("fails closed when an exact draftId is unknown", () => {
    const known = createConsumerRepairRequestDraft({
      consumerUserId: CONSUMER_REPAIR_TEST_USER_ID,
      problemText: "known draft",
      repairType: "repair",
      aiDraft: buildConsumerRepairAiDraft("known draft"),
    });
    const state = buildInitialConsumerRepairRequestState({
      initialDraftId: "missing-draft-id",
      history: [known],
    });

    expect(state.bundle).toBeNull();
    expect(state.selectedWork).toBeNull();
    expect(state.problemText).toBe("");
    expect(state.statusMessage).toMatch(/не найден|недоступен/u);
  });

  it("does not auto-open any of 34 active drafts without an exact draftId", () => {
    const history = Array.from({ length: 34 }, (_, index) =>
      createConsumerRepairRequestDraft({
        consumerUserId: CONSUMER_REPAIR_TEST_USER_ID,
        problemText: `saved active draft ${index + 1}`,
        repairType: "repair",
        aiDraft: buildConsumerRepairAiDraft(`saved active draft ${index + 1}`),
      })
    );
    const state = buildInitialConsumerRepairRequestState({ history });

    expect(state.history).toHaveLength(34);
    expect(state.bundle).toBeNull();
    expect(state.selectedWork).toBeNull();
  });
});
