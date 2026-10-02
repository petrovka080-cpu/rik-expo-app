import type { ConsumerRepairDraftBundle } from "../../src/lib/consumerRequests";
import { CANONICAL_PARAMETER_CORE_SCHEMA_VERSION, type CanonicalParameterSession } from "../../src/lib/estimate/canonicalParameters";
import { ConsumerRepairRequestScreenController } from "../../src/features/consumerRepair/ConsumerRepairRequestScreen";
import { consumerRepairCanonicalParameterSessionMatchesBundle } from "../../src/features/consumerRepair/consumerRepairCanonicalEstimateReadiness";

jest.mock("@expo/vector-icons", () => ({ Ionicons: () => null }));

function bundle(draftId = "draft-current", revisionId = "revision-current"): ConsumerRepairDraftBundle {
  // Only ownership fields are relevant to this controller action.
  return {
    draft: { id: draftId },
    items: [{ sourceParameters: { canonicalBackendRevisionId: revisionId, canonicalBackendReleaseId: "release-current" } }],
  } as unknown as ConsumerRepairDraftBundle;
}
function session(draftId = "draft-current", revisionId = "revision-current"): CanonicalParameterSession {
  return {
    coreSchemaVersion: CANONICAL_PARAMETER_CORE_SCHEMA_VERSION,
    sessionId: "session-current", draftId, revisionId,
    schemaId: "schema-current", schemaVersion: "1", workPassportId: "passport-current",
    canonicalWorkKey: "test-work", calculationVersion: "1", status: "COMPLETE",
    parameters: [], blockingMissingParameterIds: [], contractMissingParameterIds: [],
    assumptionParameterIds: [], invalidParameterIds: [], fingerprint: "fingerprint-current",
    createdAt: "2026-10-02T00:00:00Z", updatedAt: "2026-10-02T00:00:00Z",
  };
}
function controller(load: jest.Mock, cached: CanonicalParameterSession | null) {
  const instance = new ConsumerRepairRequestScreenController({
    consumerUserId: "consumer-test", onPrepareCanonicalEstimate: jest.fn(),
    onLoadCanonicalRevisionDraft: jest.fn(), onLoadCanonicalParameterSession: load,
    onRecalculateCanonicalEstimate: jest.fn(), onSelectCanonicalCatalogItem: jest.fn(),
    onAddCanonicalCatalogItem: jest.fn(), onOpenPhotoForMaterialRecognition: jest.fn(),
  });
  const action = instance as unknown as {
    state: typeof instance.state;
    setState: (update: Partial<typeof instance.state>) => void;
    actionContext: () => { revisionId: string };
    refineCanonicalParameters: () => Promise<void>;
    loadCanonicalParameterSessionForBundle: (value: ConsumerRepairDraftBundle) => Promise<CanonicalParameterSession | null>;
  };
  action.state = { ...action.state, bundle: bundle(), canonicalBackendParameterSession: cached, statusMessage: "unchanged" };
  action.setState = jest.fn(update => { action.state = { ...action.state, ...update }; });
  // Admission has its own contracts; this fixture tests the post-admission session load.
  action.actionContext = () => ({ revisionId: "revision-current" });
  return action;
}

describe("immutable revision parameter-session reuse", () => {
  it("requires the exact draft and revision, never a precompile or unrelated session", () => {
    expect(consumerRepairCanonicalParameterSessionMatchesBundle(session(), bundle())).toBe(true);
    expect(consumerRepairCanonicalParameterSessionMatchesBundle(session("draft-other"), bundle())).toBe(false);
    expect(consumerRepairCanonicalParameterSessionMatchesBundle(session(undefined, "revision-old"), bundle())).toBe(false);
    expect(consumerRepairCanonicalParameterSessionMatchesBundle(session(undefined, "precompile:current"), bundle())).toBe(false);
    expect(consumerRepairCanonicalParameterSessionMatchesBundle(null, bundle())).toBe(false);
    expect(consumerRepairCanonicalParameterSessionMatchesBundle(session(), null)).toBe(false);
    expect(consumerRepairCanonicalParameterSessionMatchesBundle(session(), { ...bundle(), items: [] })).toBe(false);
  });
  it("twenty repeated panel opens do not reload or mutate the current session", async () => {
    const cached = session();
    const load = jest.fn();
    const action = controller(load, cached);
    for (let i = 0; i < 20; i += 1) await action.refineCanonicalParameters();
    expect(load).not.toHaveBeenCalled();
    expect(action.setState).not.toHaveBeenCalled();
    expect(action.state.canonicalBackendParameterSession).toBe(cached);
    expect(action.state.statusMessage).toBe("unchanged");
  });
  it.each([
    ["absent", null],
    ["previous revision", session(undefined, "revision-old")],
    ["another draft", session("draft-other")],
  ])("loads a %s session once, then reuses the validated result", async (_label, cached) => {
    const loaded = session();
    const load = jest.fn(async () => loaded);
    const action = controller(load, cached);
    await action.refineCanonicalParameters();
    await action.refineCanonicalParameters();
    expect(load).toHaveBeenCalledTimes(1);
    expect(load).toHaveBeenCalledWith("revision-current", "draft-current");
    expect(action.state.canonicalBackendParameterSession).toBe(loaded);
  });
  it.each([
    ["revision", session(undefined, "revision-wrong")],
    ["draft", session("draft-wrong")],
  ])("rejects a response with a mismatched %s", async (_label, loaded) => {
    const action = controller(jest.fn(async () => loaded), null);
    await expect(action.loadCanonicalParameterSessionForBundle(bundle())).rejects.toThrow("CANONICAL_PARAMETER_SESSION_REVISION_MISMATCH");
    expect(action.state.canonicalBackendParameterSession).toBeNull();
  });
  it("does not publish an obsolete response after switching drafts", async () => {
    let resolveLoad!: (value: CanonicalParameterSession) => void;
    const load = jest.fn(() => new Promise<CanonicalParameterSession>(resolve => { resolveLoad = resolve; }));
    const action = controller(load, null);
    const pending = action.refineCanonicalParameters();
    action.state = { ...action.state, bundle: bundle("draft-new"), statusMessage: "new draft" };
    resolveLoad(session());
    await pending;
    expect(action.state.canonicalBackendParameterSession).toBeNull();
    expect(action.state.statusMessage).toBe("new draft");
  });
});
