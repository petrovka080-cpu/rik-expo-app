import {
  beginCompile,
  bindEstimateDraftScope,
  cloneRevisionExplicitly,
  commitEstimateCompileResult,
  confirmParameters,
  createAnotherDraft,
  createEstimateDraftSession,
  hydrateExactDraft,
  markEstimateLegacyReviewRequired,
  openExactDraft,
  openHistoricalRevision,
  prepareEstimateCompile,
  requireScope,
  selectEstimateDraftWork,
  selectScope,
  setEstimateDraftParameters,
  setParameter,
} from "../../src/lib/estimate/draftSession/estimateDraftSession";

const scopeInput = {
  scopePresetId: "FULL_ROAD_INFRASTRUCTURE",
  calculationStrategyId: "ASPHALT_FULL_ROAD_V4",
  parameterSchemaVersion: "asphalt-v4",
  engineVersion: "estimate-v4",
  requiredParameterAlternatives: [
    { alternativeId: "area", parameterKeys: ["area_m2"] },
    { alternativeId: "length_width", parameterKeys: ["length_m", "width_m"] },
  ],
};

describe("estimate draft session state machine", () => {
  test("work selection invalidates every work-scoped value and cannot jump to review", () => {
    const previous = {
      ...createEstimateDraftSession({ draftId: "draft-a" }),
      selectionEpoch: 7,
      workIntent: {
        catalogWorkId: "old-work",
        canonicalWorkKey: "old-work",
        source: "EXPLICIT_SELECTION" as const,
      },
      scopePresetId: "old-scope",
      calculationStrategyId: "old-strategy",
      parameterSchemaVersion: "old-schema",
      parameters: {
        area_m2: { value: 128000, unit: "m2", origin: "USER_ENTERED" as const, confirmedAt: "old" },
      },
      contextHash: "old-context",
      activeRevisionId: "old-revision",
      status: "REVIEW" as const,
    };

    const selected = selectEstimateDraftWork(previous, {
      catalogWorkId: "asphalt_concrete_pavement",
      canonicalWorkKey: "asphalt_concrete_pavement",
      source: "EXPLICIT_SELECTION",
      scopeRequired: true,
    });

    expect(selected).toMatchObject({
      draftId: "draft-a",
      selectionEpoch: 8,
      workIntent: {
        catalogWorkId: "asphalt_concrete_pavement",
        canonicalWorkKey: "asphalt_concrete_pavement",
        source: "EXPLICIT_SELECTION",
      },
      status: "SCOPE_REQUIRED",
      scopePresetId: null,
      calculationStrategyId: null,
      contextHash: null,
      activeRevisionId: null,
      parameters: {},
    });
  });

  test("confirmed length and width create a stable compile context", () => {
    const selected = selectEstimateDraftWork(createEstimateDraftSession({ draftId: "draft-a" }), {
      catalogWorkId: "asphalt_concrete_pavement",
      canonicalWorkKey: "asphalt_concrete_pavement",
      source: "EXPLICIT_SELECTION",
      scopeRequired: true,
    });
    const scoped = bindEstimateDraftScope(selected, scopeInput);
    expect(scoped.status).toBe("PARAMETERS_REQUIRED");
    const ready = setEstimateDraftParameters(scoped, {
      length_m: { value: 2000, unit: "m", origin: "USER_ENTERED", confirmedAt: "2026-07-26T00:00:00.000Z" },
      width_m: { value: 32, unit: "m", origin: "USER_ENTERED", confirmedAt: "2026-07-26T00:00:00.000Z" },
    });
    expect(ready.status).toBe("READY_TO_COMPILE");

    const first = prepareEstimateCompile(ready);
    const second = prepareEstimateCompile(ready);
    expect(first.context.contextHash).toBe(second.context.contextHash);
    expect(first.context.confirmedParameters).toEqual(ready.parameters);
    expect(first.session.status).toBe("COMPILING");
  });

  test("an old async result cannot mutate a newer selection epoch", () => {
    const selected = selectEstimateDraftWork(createEstimateDraftSession({ draftId: "draft-a" }), {
      catalogWorkId: "asphalt_concrete_pavement",
      canonicalWorkKey: "asphalt_concrete_pavement",
      source: "EXPLICIT_SELECTION",
      scopeRequired: true,
    });
    const ready = setEstimateDraftParameters(bindEstimateDraftScope(selected, scopeInput), {
      area_m2: { value: 64000, unit: "m2", origin: "USER_ENTERED", confirmedAt: "now" },
    });
    const compiling = prepareEstimateCompile(ready);
    const changed = selectEstimateDraftWork(compiling.session, {
      catalogWorkId: "tile_installation",
      canonicalWorkKey: "tile_installation",
      source: "EXPLICIT_SELECTION",
      scopeRequired: false,
    });
    const committed = commitEstimateCompileResult(changed, {
      draftId: compiling.context.draftId,
      selectionEpoch: compiling.context.selectionEpoch,
      contextHash: compiling.context.contextHash,
      revisionId: "stale-revision",
      scopePresetId: compiling.context.scopePresetId,
      parameterSchemaVersion: compiling.context.parameterSchemaVersion,
      calculationStrategyId: compiling.context.calculationStrategyId,
    });

    expect(committed.status).toBe("STALE_RESULT_REJECTED");
    expect(committed.activeRevisionId).toBeNull();
    expect(committed.workIntent?.catalogWorkId).toBe("tile_installation");
  });

  test.each([
    ["scopePresetId", "ROAD_SURFACING_ONLY"],
    ["parameterSchemaVersion", "asphalt-v3"],
    ["calculationStrategyId", "ASPHALT_SURFACE_V4"],
  ] as const)("rejects a compile result with mismatched %s", (field, mismatchedValue) => {
    const ready = setEstimateDraftParameters(
      bindEstimateDraftScope(
        selectEstimateDraftWork(createEstimateDraftSession({ draftId: "draft-a" }), {
          catalogWorkId: "asphalt_concrete_pavement",
          canonicalWorkKey: "asphalt_concrete_pavement",
          source: "EXPLICIT_SELECTION",
          scopeRequired: true,
        }),
        scopeInput,
      ),
      {
        area_m2: { value: 64000, unit: "m2", origin: "USER_ENTERED", confirmedAt: "now" },
      },
    );
    const compiling = prepareEstimateCompile(ready);
    const result = {
      draftId: compiling.context.draftId,
      selectionEpoch: compiling.context.selectionEpoch,
      contextHash: compiling.context.contextHash,
      revisionId: "rejected-revision",
      scopePresetId: compiling.context.scopePresetId,
      parameterSchemaVersion: compiling.context.parameterSchemaVersion,
      calculationStrategyId: compiling.context.calculationStrategyId,
      [field]: mismatchedValue,
    };

    expect(commitEstimateCompileResult(compiling.session, result)).toMatchObject({
      status: "STALE_RESULT_REJECTED",
      activeRevisionId: null,
      rejectionReason: "compile_context_mismatch",
    });
  });

  test("legacy parameters are unconfirmed and cannot compile", () => {
    const legacy = markEstimateLegacyReviewRequired(
      createEstimateDraftSession({ draftId: "legacy-draft" }),
    );
    expect(legacy).toMatchObject({
      status: "LEGACY_REVIEW_REQUIRED",
      activeRevisionId: null,
      contextHash: null,
      workIntent: null,
      scopePresetId: null,
      parameters: {},
    });
    expect(() => prepareEstimateCompile(legacy)).toThrow("ESTIMATE_DRAFT_NOT_READY_TO_COMPILE");
  });

  test("scope is a validated aggregate transition and preserves entered geometry", () => {
    const selected = selectEstimateDraftWork(createEstimateDraftSession({ draftId: "draft-a" }), {
      catalogWorkId: "asphalt_concrete_pavement",
      canonicalWorkKey: "asphalt_concrete_pavement",
      source: "FREE_TEXT",
      scopeRequired: false,
      parameters: {
        length_m: { value: 5400, unit: "m", origin: "USER_ENTERED", confirmedAt: "now" },
        width_m: { value: 15, unit: "m", origin: "USER_ENTERED", confirmedAt: "now" },
      },
    });
    const required = requireScope(selected, {
      originalUserText: "асфальт 5400 x 15",
      requestedCatalogWorkId: "asphalt_concrete_pavement",
      offeredScopePresetIds: ["ASPHALT_LAYER_ON_PREPARED_BASE", "FULL_ROAD_INFRASTRUCTURE"],
      resolverEvidence: ["ambiguous_road_scope"],
      resolverVersion: "road-scope-v4",
      createdAt: "now",
    });
    expect(required).toMatchObject({
      status: "SCOPE_REQUIRED",
      parameters: {
        length_m: { value: 5400 },
        width_m: { value: 15 },
      },
    });
    expect(() => selectScope(required, {
      ...scopeInput,
      scopePresetId: "NOT_OFFERED",
    })).toThrow("ESTIMATE_DRAFT_SCOPE_NOT_OFFERED");
    const scoped = selectScope(required, scopeInput);
    expect(scoped.status).toBe("READY_TO_COMPILE");
    expect(scoped.scopeRequirement).toBeNull();
  });

  test("set and confirm parameters are separate commands", () => {
    const selected = selectEstimateDraftWork(createEstimateDraftSession({ draftId: "draft-a" }), {
      catalogWorkId: "asphalt_concrete_pavement",
      canonicalWorkKey: "asphalt_concrete_pavement",
      source: "EXPLICIT_SELECTION",
      scopeRequired: true,
    });
    const scoped = bindEstimateDraftScope(selected, scopeInput);
    const entered = setParameter(scoped, {
      key: "area_m2",
      value: 64000,
      unit: "m2",
      origin: "USER_ENTERED",
    });
    expect(entered.status).toBe("PARAMETERS_REQUIRED");
    const ready = confirmParameters(entered, {
      confirmedAt: "2026-07-26T00:00:00.000Z",
      parameterKeys: ["area_m2"],
    });
    expect(ready.status).toBe("READY_TO_COMPILE");
    expect(beginCompile(ready).context.confirmedParameters.area_m2.value).toBe(64000);
  });

  test("exact hydration isolates two drafts and fails closed for mismatch/corruption", () => {
    const draftA = createEstimateDraftSession({ draftId: "draft-a" });
    const draftB = createEstimateDraftSession({ draftId: "draft-b" });

    expect(hydrateExactDraft(draftA, "draft-a")).toMatchObject({
      status: "ok",
      session: { draftId: "draft-a" },
    });
    expect(hydrateExactDraft(draftB, "draft-a")).toEqual({ status: "not_found", session: null });
    expect(hydrateExactDraft({ schemaVersion: "estimate_draft_session_v1", draftId: "draft-a" }, "draft-a"))
      .toEqual({ status: "corrupted", session: null });
    expect(() => openExactDraft(draftB, "draft-a")).toThrow("ESTIMATE_DRAFT_EXACT_ID_NOT_FOUND");
    expect(() => openExactDraft("broken", "draft-a")).toThrow("ESTIMATE_DRAFT_SNAPSHOT_CORRUPTED");
  });

  test("legacy migration is idempotent and never imports old active state", () => {
    const legacySnapshot = {
      draftId: "legacy-draft",
      selectedWork: "old-asphalt",
      area_m2: 128000,
      activeRevisionId: "old-revision",
    };
    const first = hydrateExactDraft(legacySnapshot, "legacy-draft");
    expect(first).toMatchObject({
      status: "legacy",
      session: {
        draftId: "legacy-draft",
        status: "LEGACY_REVIEW_REQUIRED",
        workIntent: null,
        parameters: {},
        activeRevisionId: null,
      },
    });
    if (first.status !== "legacy") throw new Error("expected legacy");
    expect(hydrateExactDraft(first.session, "legacy-draft")).toMatchObject({
      status: "ok",
      session: first.session,
    });
  });

  test("history opens read-only and cloning is the only parameter transfer path", () => {
    const source = setEstimateDraftParameters(
      bindEstimateDraftScope(
        selectEstimateDraftWork(createEstimateDraftSession({ draftId: "draft-a" }), {
          catalogWorkId: "asphalt_concrete_pavement",
          canonicalWorkKey: "asphalt_concrete_pavement",
          source: "EXPLICIT_SELECTION",
          scopeRequired: true,
        }),
        scopeInput,
      ),
      {
        area_m2: { value: 128000, unit: "m2", origin: "USER_ENTERED", confirmedAt: "old" },
      },
    );
    const revision = {
      draftId: "draft-a",
      revisionId: "revision-a",
      contextHash: "historical-hash",
      payload: { rows: 702 },
    };
    const view = openHistoricalRevision(source, revision);
    expect(view).toMatchObject({ mode: "HISTORICAL_REVISION", revisionId: "revision-a" });
    expect(Object.isFrozen(view)).toBe(true);
    expect(createAnotherDraft(source, { draftId: "draft-b" })).toMatchObject({
      draftId: "draft-b",
      status: "EMPTY",
      parameters: {},
    });
    const cloned = cloneRevisionExplicitly({
      sourceSession: source,
      sourceRevision: revision,
      newDraftId: "draft-c",
      parameters: source.parameters,
    });
    expect(cloned).toMatchObject({
      draftId: "draft-c",
      status: "PARAMETERS_REQUIRED",
      activeRevisionId: null,
      parameters: {
        area_m2: { value: 128000, origin: "EXPLICIT_CLONE", confirmedAt: null },
      },
    });
  });
});
