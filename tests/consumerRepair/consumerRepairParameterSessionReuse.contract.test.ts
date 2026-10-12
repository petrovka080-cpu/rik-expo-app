import type { ConsumerRepairDraftBundle } from "../../src/lib/consumerRequests";
import { CANONICAL_PARAMETER_CORE_SCHEMA_VERSION, type CanonicalParameterSession } from "../../src/lib/estimate/canonicalParameters";
import { ConsumerRepairRequestScreenController } from "../../src/features/consumerRepair/ConsumerRepairRequestScreen";
import { consumerRepairCanonicalParameterSessionMatchesBundle } from "../../src/features/consumerRepair/consumerRepairCanonicalEstimateReadiness";
import { logger } from "../../src/lib/logger";
import { getCanonicalEstimateRevision } from "../../src/lib/estimate/backendPlatform/canonicalEstimateClient";
import { compactConsumerRepairBundleForDurableStorage } from "../../src/lib/platform/compactConsumerRepairDurableState";

jest.mock("@expo/vector-icons", () => ({ Ionicons: () => null }));
jest.mock("../../src/lib/estimate/backendPlatform/canonicalEstimateClient", () => ({
  ...jest.requireActual("../../src/lib/estimate/backendPlatform/canonicalEstimateClient"),
  getCanonicalEstimateRevision: jest.fn(),
}));

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
function controller(load: jest.Mock, cached: CanonicalParameterSession | null, recalculate = jest.fn()) {
  const instance = new ConsumerRepairRequestScreenController({
    consumerUserId: "consumer-test", onPrepareCanonicalEstimate: jest.fn(),
    onLoadCanonicalRevisionDraft: jest.fn(), onLoadCanonicalParameterSession: load,
    onRecalculateCanonicalEstimate: recalculate, onSelectCanonicalCatalogItem: jest.fn(),
    onAddCanonicalCatalogItem: jest.fn(), onOpenPhotoForMaterialRecognition: jest.fn(),
  });
  const action = instance as unknown as {
    state: typeof instance.state;
    setState: (update: Partial<typeof instance.state>, done?: () => void) => void;
    actionContext: () => { revisionId: string };
    refineCanonicalParameters: () => Promise<void>;
    loadCanonicalParameterSessionForBundle: (value: ConsumerRepairDraftBundle) => Promise<CanonicalParameterSession | null>;
    changeCompositionRows: (ids: readonly string[], excluded: boolean, operationKey?: string) => Promise<void>;
    refreshHistory: jest.Mock;
  };
  action.state = { ...action.state, bundle: bundle(), canonicalBackendParameterSession: cached, statusMessage: "unchanged" };
  action.setState = jest.fn((update, done) => { action.state = { ...action.state, ...update }; done?.(); });
  action.refreshHistory = jest.fn();
  // Admission has its own contracts; this fixture tests the post-admission session load.
  action.actionContext = () => ({ revisionId: "revision-current" });
  return action;
}

describe("immutable revision parameter-session reuse", () => {
  beforeEach(() => { jest.spyOn(logger, "releaseEvidence").mockImplementation(() => undefined); });
  afterEach(() => jest.restoreAllMocks());
  it("reports session publication only after its React callback, without user/draft/revision contents", async () => {
    const evidence = jest.spyOn(logger, "releaseEvidence").mockImplementation(() => undefined);
    const action = controller(jest.fn(async () => session()), null) as unknown as {
      state: ReturnType<typeof controller>["state"];
      setState: (update: Partial<ReturnType<typeof controller>["state"]>, callback?: () => void) => void;
      hydrateCurrentCanonicalParameterSession: () => Promise<void>;
    };
    let commit: (() => void) | undefined;
    action.setState = (update, callback) => { action.state = { ...action.state, ...update }; commit = callback; };
    await action.hydrateCurrentCanonicalParameterSession();
    expect(action.state.canonicalBackendParameterSession?.revisionId).toBe("revision-current");
    expect(evidence.mock.calls.some(([, phase]) => phase === "CONTROLLER_SESSION_COMMIT")).toBe(false);
    expect(commit).toBeDefined(); commit!();
    const event = evidence.mock.calls.find(([, phase]) => phase === "CONTROLLER_SESSION_COMMIT")?.[2];
    expect(event).toMatchObject({ status: "completed", phase: "CONTROLLER_SESSION_COMMIT", durationMs: expect.any(Number) });
    expect(JSON.stringify(event)).not.toMatch(/draft-current|revision-current|consumer-test/u);
  });
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

describe("composition restoration after durable cold reopen", () => {
  const readRevision = jest.mocked(getCanonicalEstimateRevision);
  const selection = {contractVersion:"canonical-estimate-composition-selection/v1" as const,
    excludedOperationKeys:[JSON.stringify(['roof','primer'])],excludedRowIds:['worker','other-resource']};
  const saved = {revisionId:'revision-current',releaseId:'release-current',compositionSelectionV1:selection};
  beforeEach(() => readRevision.mockReset());
  function coldBundle() {
    const original={...bundle(),events:[],structuredEstimatePayload:{canonicalBackend:saved}} as unknown as ConsumerRepairDraftBundle;
    const cold=compactConsumerRepairBundleForDurableStorage(original);
    expect(cold.structuredEstimatePayload).toBeNull();return cold;
  }
  it('restores the selected resource and preserves other saved exclusions after payload compaction',async()=>{
    readRevision.mockResolvedValue(saved as never);
    const recalculate=jest.fn(async()=>({bundle:bundle(undefined,'revision-child'),session:session(undefined,'revision-child')}));
    const action=controller(jest.fn(),null,recalculate);action.state={...action.state,bundle:coldBundle()};
    await action.changeCompositionRows(['worker'],false);
    expect(readRevision).toHaveBeenCalledWith('revision-current');
    expect(recalculate).toHaveBeenCalledWith(expect.objectContaining({compositionSelectionV1:{...selection,excludedRowIds:['other-resource']}}));
    expect(action.state.bundle?.items[0]?.sourceParameters?.canonicalBackendRevisionId).toBe('revision-child');
    expect(action.state.canonicalEstimateMutationBusy).toBe(false);
  });
  it('restores a subwork without clearing another excluded resource',async()=>{
    readRevision.mockResolvedValue(saved as never);
    const recalculate=jest.fn(async()=>({bundle:bundle(undefined,'revision-child'),session:session(undefined,'revision-child')}));
    const action=controller(jest.fn(),null,recalculate);action.state={...action.state,bundle:coldBundle()};
    await action.changeCompositionRows(['worker'],false,selection.excludedOperationKeys[0]);
    expect(recalculate).toHaveBeenCalledWith(expect.objectContaining({compositionSelectionV1:{...selection,excludedOperationKeys:[],excludedRowIds:['other-resource']}}));
  });
  it('does not assume an empty selection when the saved revision cannot be read',async()=>{
    readRevision.mockRejectedValue(new Error('CONTROL_READ_FAILED'));
    const recalculate=jest.fn(),action=controller(jest.fn(),null,recalculate),cold=coldBundle();action.state={...action.state,bundle:cold};
    await action.changeCompositionRows(['worker'],false);
    expect(recalculate).not.toHaveBeenCalled();expect(action.state.bundle).toBe(cold);
    expect(action.state.statusMessage).toBe('CONTROL_READ_FAILED');expect(action.state.canonicalEstimateMutationBusy).toBe(false);
  });
  it('does not mutate a different workspace after an asynchronous saved-revision read',async()=>{
    let resolveRead!:(value:never)=>void;
    readRevision.mockImplementation(()=>new Promise(resolve=>{resolveRead=resolve;}));
    const recalculate=jest.fn(),action=controller(jest.fn(),null,recalculate);action.state={...action.state,bundle:coldBundle()};
    const pending=action.changeCompositionRows(['worker'],false);const next=bundle('draft-other');action.state={...action.state,bundle:next};
    resolveRead(saved as never);await pending;expect(recalculate).not.toHaveBeenCalled();expect(action.state.bundle).toBe(next);
  });
  it('uses the bound live payload without a second read when it has not been compacted',async()=>{
    const recalculate=jest.fn(async()=>({bundle:bundle(undefined,'revision-child'),session:session(undefined,'revision-child')}));
    const action=controller(jest.fn(),null,recalculate);action.state={...action.state,bundle:{...bundle(),structuredEstimatePayload:{canonicalBackend:saved}} as unknown as ConsumerRepairDraftBundle};
    await action.changeCompositionRows(['worker'],false);expect(readRevision).not.toHaveBeenCalled();expect(recalculate).toHaveBeenCalledTimes(1);
  });
});
