import {
  __resetConsumerRepairRequestStoreForTests,
  createConsumerRepairRequestDraft,
  listConsumerRepairRequestHistory,
} from "../../src/lib/consumerRequests";
import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import {
  buildEstimateDraftSessionTransitionStatusMessage,
  buildInitialConsumerRepairRequestState,
} from "../../src/features/consumerRepair/requestEstimateScreenActions";
import { buildConsumerRepairRequestRenderModel } from "../../src/features/consumerRepair/ConsumerRepairRequestScreenRenderModel";
import {
  CONSUMER_REPAIR_TEST_USER_ID,
  createApprovedConsumerRepairRequest,
} from "./consumerRepairTestHelpers";
import {
  isFreshRequestEstimateLaunchWorkspace,
  isRequestEstimatePromptComposerRendered,
  shouldAutoPrepareInitialConsumerRepairRequest,
} from "../../src/features/consumerRepair/ConsumerRepairRequestScreen";

describe("reload does not restore approved estimate as active draft", () => {
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

  it("projects the user status from the canonical DraftSession state", () => {
    const draft = createConsumerRepairRequestDraft({
      consumerUserId: CONSUMER_REPAIR_TEST_USER_ID,
      problemText: "road without confirmed geometry",
      repairType: "road",
      aiDraft: buildConsumerRepairAiDraft("road without confirmed geometry"),
    });
    const session = draft.estimateDraftSession;
    expect(session).not.toBeNull();
    if (!session) throw new Error("TEST_DRAFT_SESSION_MISSING");

    expect(buildEstimateDraftSessionTransitionStatusMessage({
      ...draft,
      estimateDraftSession: { ...session, status: "PARAMETERS_REQUIRED" },
    })).toContain("обязательные параметры");
    expect(buildEstimateDraftSessionTransitionStatusMessage({
      ...draft,
      estimateDraftSession: { ...session, status: "REVIEW" },
    })).toContain("Смета рассчитана");
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
