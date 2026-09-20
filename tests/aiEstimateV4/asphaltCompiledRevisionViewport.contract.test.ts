import {
  STOP_R9_HARNESS_COMPILED_REVISION_MARKER_NOT_FOUND_AFTER_BOUNDED_SCROLL,
  STOP_R9_HARNESS_UI_DUMP_UNAVAILABLE,
  STOP_R9_HARNESS_VIEWPORT_SCROLL_NO_PROGRESS,
  STOP_R9_PRODUCT_COMPILED_REVISION_IDENTITY_MISMATCH,
  assessCompiledRevisionTransition,
  assessNoRevisionTransition,
  classifyGovernedMissingParameterKeys,
  findCompiledRevisionMarkerAcrossViewport,
  type CompiledRevisionExpectedIdentity,
  type CompiledRevisionViewportNode,
  type CompiledRevisionViewportSnapshot,
} from "../../scripts/e2e/asphaltCompiledRevisionViewport";

const expected: CompiledRevisionExpectedIdentity = {
  selectedCatalogId: "catalog-asphalt-001",
  selectedWorkKey: "asphalt_concrete_pavement",
  canonicalOwner: "asphalt_concrete_pavement",
  previousRevisionId: null,
  baselineRevisionOrdinal: 0,
  baselineBuildCount: 4,
  expectedBuildDelta: 1,
  expectedRowCount: 12,
  expectedCalculationStatus: "draft_ready",
};

function node(resourceId: string): CompiledRevisionViewportNode {
  return { resourceId, contentDesc: "", text: "", bounds: "[0,0][100,100]" };
}

function markerNodes(overrides: Partial<{
  selectedCatalogId: string;
  selectedWorkKey: string;
  canonicalOwner: string;
  revisionId: string;
  ordinal: number;
  rowCount: number;
  status: string;
}> = {}): CompiledRevisionViewportNode[] {
  const values = {
    selectedCatalogId: expected.selectedCatalogId,
    selectedWorkKey: expected.selectedWorkKey,
    canonicalOwner: expected.canonicalOwner,
    revisionId: "revision-r1-exact",
    ordinal: 1,
    rowCount: 12,
    status: "draft_ready",
    ...overrides,
  };
  return [node([
    "estimate-compiled-revision-v1",
    `catalog-${values.selectedCatalogId}`,
    `work-${values.selectedWorkKey}`,
    `owner-${values.canonicalOwner}`,
    `revision-${values.revisionId}`,
    `ordinal-${values.ordinal}`,
    `rows-${values.rowCount}`,
    `status-${values.status}`,
  ].join("--"))];
}

function snapshot(id: string, nodes: CompiledRevisionViewportNode[]): CompiledRevisionViewportSnapshot {
  return { xml: id, nodes };
}

async function search(viewports: CompiledRevisionViewportSnapshot[]) {
  let index = 0;
  const scrolls: string[] = [];
  const result = await findCompiledRevisionMarkerAcrossViewport({
    expected,
    currentBuildCount: 5,
    readViewport: async () => viewports[index]!,
    scrollKnownContainerUp: async () => {
      scrolls.push("up");
      index = Math.min(index + 1, viewports.length - 1);
      return true;
    },
    readSettledViewport: async () => viewports[index]!,
    fingerprint: (value) => value.xml,
  });
  return { result, scrolls };
}

describe("R9 compiled revision viewport recovery", () => {
  it("accepts the first observed positive catalog-global ordinal and keeps its successor exact", () => {
    const first = assessCompiledRevisionTransition({
      nodes: markerNodes({ ordinal: 6 }),
      expected: { ...expected, expectedRevisionOrdinal: null },
      currentBuildCount: 5,
    });
    expect(first).toMatchObject({
      status: "ready",
      evidence: { revision_ordinal: 6 },
    });

    expect(assessCompiledRevisionTransition({
      nodes: markerNodes({ ordinal: 8 }),
      expected: { ...expected, baselineRevisionOrdinal: 6 },
      currentBuildCount: 5,
    }).status).toBe("identity_mismatch");
  });

  it("classifies exact scope-disclosure IDs through the governed Asphalt schema", () => {
    expect(classifyGovernedMissingParameterKeys([
      node("request-estimate-missing-param-geometry_method"),
      node("request-estimate-missing-param-length_m"),
      node("request-estimate-missing-param-width_m"),
      node("request-estimate-missing-param-traffic_load_category"),
    ], [
      { canonicalKey: "geometry_method", critical: true, internal: false },
      { canonicalKey: "length_m", critical: true, internal: false },
      { canonicalKey: "width_m", critical: true, internal: false },
      { canonicalKey: "traffic_load_category", critical: false, internal: false },
    ])).toEqual({
      criticalKeys: ["geometry_method", "length_m", "width_m"],
      nonCriticalKeys: ["traffic_load_category"],
      unknownKeys: [],
    });
  });

  it("does not infer missing parameters from labels or partial IDs", () => {
    expect(classifyGovernedMissingParameterKeys([
      { ...node("editable-param-chip-geometry_method"), text: "request-estimate-missing-param-geometry_method" },
      node("prefix-request-estimate-missing-param-length_m"),
    ], [
      { canonicalKey: "geometry_method", critical: true, internal: false },
      { canonicalKey: "length_m", critical: true, internal: false },
    ])).toEqual({ criticalKeys: [], nonCriticalKeys: [], unknownKeys: [] });
  });

  it("fails classification closed on an unregistered exact missing-parameter ID", () => {
    expect(classifyGovernedMissingParameterKeys([
      node("request-estimate-missing-param-foreign_parameter"),
    ], [
      { canonicalKey: "geometry_method", critical: true, internal: false },
    ])).toEqual({
      criticalKeys: [],
      nonCriticalKeys: [],
      unknownKeys: ["foreign_parameter"],
    });
  });

  it("finds an exact marker in the first viewport without scrolling", async () => {
    const { result, scrolls } = await search([snapshot("visible", markerNodes())]);
    expect(result.status).toBe("found");
    expect(result.swipes).toBe(0);
    expect(scrolls).toEqual([]);
    expect(result.evidence).toMatchObject({
      current_revision_id: "revision-r1-exact",
      build_count_delta: 1,
      revision_ordinal: 1,
      compiled_row_count: 12,
    });
  });

  it("finds an exact marker below the viewport with bounded scroll", async () => {
    const { result, scrolls } = await search([
      snapshot("top", [node("consumer-repair-screen")]),
      snapshot("below", markerNodes()),
    ]);
    expect(result.status).toBe("found");
    expect(result.swipes).toBe(1);
    expect(scrolls).toEqual(["up"]);
  });

  it("recovers the summary anchor before scanning when a prior case left the viewport inside a panel", async () => {
    const displaced = snapshot("panel", [node("request-estimate-parameter-panel")]);
    const recovered = snapshot("summary", markerNodes());
    const recoverKnownAnchor = jest.fn(async () => recovered);
    const scrollKnownContainerUp = jest.fn(async () => true);
    const boundaries: string[] = [];

    const result = await findCompiledRevisionMarkerAcrossViewport({
      expected,
      currentBuildCount: 5,
      readViewport: async () => displaced,
      scrollKnownContainerUp,
      readSettledViewport: async () => recovered,
      recoverKnownAnchor,
      fingerprint: (value) => value.xml,
      onViewport: (boundary) => {
        boundaries.push(boundary);
      },
    });

    expect(result).toMatchObject({
      status: "found",
      swipes: 0,
      evidence: { current_revision_id: "revision-r1-exact" },
    });
    expect(recoverKnownAnchor).toHaveBeenCalledWith(displaced);
    expect(scrollKnownContainerUp).not.toHaveBeenCalled();
    expect(boundaries).toEqual(["before", "anchor_recovery", "final"]);
  });

  it("finds an exact marker one viewport past the historical eight-swipe boundary", async () => {
    const viewports = [
      ...Array.from({ length: 9 }, (_, index) =>
        snapshot(`before-marker-${index}`, [node("consumer-repair-screen")])
      ),
      snapshot("ninth-swipe-marker", markerNodes()),
    ];
    const { result, scrolls } = await search(viewports);

    expect(result.status).toBe("found");
    expect(result.swipes).toBe(9);
    expect(scrolls).toEqual(Array(9).fill("up"));
  });

  it("recovers when two transient scroll acknowledgements make no viewport progress", async () => {
    const { result, scrolls } = await search([
      snapshot("same", [node("consumer-repair-screen")]),
      snapshot("same", [node("consumer-repair-screen")]),
      snapshot("same", [node("consumer-repair-screen")]),
      snapshot("third-swipe-marker", markerNodes()),
    ]);
    expect(result.status).toBe("found");
    expect(result.swipes).toBe(3);
    expect(scrolls).toEqual(["up", "up", "up"]);
  });

  it("fails closed when three consecutive scrolls make no viewport progress", async () => {
    const { result } = await search([snapshot("same", [node("consumer-repair-screen")])]);
    expect(result.status).toBe("no_progress");
    expect(result.failureToken).toBe(STOP_R9_HARNESS_VIEWPORT_SCROLL_NO_PROGRESS);
    expect(result.swipes).toBe(3);
  });

  it("classifies an unavailable UiAutomator snapshot before fingerprinting it", async () => {
    const { result, scrolls } = await search([{ ok: false, xml: "", nodes: [] }]);

    expect(result.status).toBe("ui_dump_unavailable");
    expect(result.failureToken).toBe(STOP_R9_HARNESS_UI_DUMP_UNAVAILABLE);
    expect(result.viewportFingerprints).toEqual([]);
    expect(scrolls).toEqual([]);
  });

  it("deduplicates multiple UI nodes for one logical revision", () => {
    const nodes = markerNodes();
    nodes.push(nodes[0]!);
    const result = assessCompiledRevisionTransition({ nodes, expected, currentBuildCount: 5 });
    expect(result.status).toBe("ready");
  });

  it("rejects two different current revision IDs", () => {
    const nodes = markerNodes();
    nodes.push(...markerNodes({ revisionId: "foreign-r2" }));
    const result = assessCompiledRevisionTransition({ nodes, expected, currentBuildCount: 5 });
    expect(result).toMatchObject({
      status: "identity_mismatch",
      failureToken: STOP_R9_PRODUCT_COMPILED_REVISION_IDENTITY_MISMATCH,
    });
  });

  it("accepts baseline build B transitioning exactly to B+1", () => {
    expect(assessCompiledRevisionTransition({
      nodes: markerNodes(),
      expected,
      currentBuildCount: 5,
    }).status).toBe("ready");
  });

  it("admits an exact preliminary revision only when that status is explicitly expected", () => {
    expect(assessCompiledRevisionTransition({
      nodes: markerNodes({ status: "needs_more_params_but_preliminary_available" }),
      expected: {
        ...expected,
        expectedCalculationStatus: "needs_more_params_but_preliminary_available",
      },
      currentBuildCount: 5,
    })).toMatchObject({
      status: "ready",
      evidence: { calculation_status: "needs_more_params_but_preliminary_available" },
    });
  });

  it("rejects a preliminary revision when the final draft-ready status is required", () => {
    expect(assessCompiledRevisionTransition({
      nodes: markerNodes({ status: "needs_more_params_but_preliminary_available" }),
      expected,
      currentBuildCount: 5,
    })).toMatchObject({
      status: "identity_mismatch",
      failureToken: STOP_R9_PRODUCT_COMPILED_REVISION_IDENTITY_MISMATCH,
    });
  });

  it("does not accept a build count that did not change", () => {
    expect(assessCompiledRevisionTransition({
      nodes: markerNodes(),
      expected,
      currentBuildCount: 4,
    }).status).toBe("pending");
  });

  it("rejects a build count that changed by more than one", () => {
    expect(assessCompiledRevisionTransition({
      nodes: markerNodes(),
      expected,
      currentBuildCount: 6,
    })).toMatchObject({
      status: "identity_mismatch",
      failureToken: STOP_R9_PRODUCT_COMPILED_REVISION_IDENTITY_MISMATCH,
    });
  });

  it("keeps D0 at zero revision delta", () => {
    expect(assessNoRevisionTransition({
      baselineBuildCount: 4,
      currentBuildCount: 4,
      maximumBuildDelta: 0,
      visibleRevisionIds: [],
    })).toEqual({ ok: true, failureToken: null });
  });

  it("keeps haul=true first Apply at zero revision delta", () => {
    expect(assessNoRevisionTransition({
      baselineBuildCount: 0,
      currentBuildCount: 0,
      maximumBuildDelta: 1,
      visibleRevisionIds: [],
    }).ok).toBe(true);
  });

  it("allows one launch runtime build before the first compiled revision is visible", () => {
    expect(assessNoRevisionTransition({
      baselineBuildCount: 0,
      currentBuildCount: 1,
      maximumBuildDelta: 1,
      visibleRevisionIds: [],
    }).ok).toBe(true);
  });

  it("rejects a duplicate launch build before the first compiled revision", () => {
    expect(assessNoRevisionTransition({
      baselineBuildCount: 0,
      currentBuildCount: 2,
      maximumBuildDelta: 1,
      visibleRevisionIds: [],
    })).toMatchObject({
      ok: false,
      failureToken: STOP_R9_PRODUCT_COMPILED_REVISION_IDENTITY_MISMATCH,
    });
  });

  it("rejects any compiled revision marker at the D0 boundary", () => {
    expect(assessNoRevisionTransition({
      baselineBuildCount: 0,
      currentBuildCount: 1,
      maximumBuildDelta: 1,
      visibleRevisionIds: ["unexpected-r1"],
    }).ok).toBe(false);
  });

  it("requires haul=true second Apply to create a new revision without a duplicate build", () => {
    expect(assessCompiledRevisionTransition({
      nodes: markerNodes({ revisionId: "revision-r2-exact", ordinal: 2 }),
      expected: {
        ...expected,
        previousRevisionId: "revision-r1-exact",
        baselineRevisionOrdinal: 1,
        baselineBuildCount: 1,
        expectedBuildDelta: 0,
      },
      currentBuildCount: 1,
    }).status).toBe("ready");
  });

  it.each([
    { selectedCatalogId: "foreign-catalog" },
    { selectedWorkKey: "foreign-work" },
    { canonicalOwner: "foreign-owner" },
  ])("rejects mismatched exact identity: %o", (override) => {
    expect(assessCompiledRevisionTransition({
      nodes: markerNodes(override),
      expected,
      currentBuildCount: 5,
    })).toMatchObject({
      status: "identity_mismatch",
      failureToken: STOP_R9_PRODUCT_COMPILED_REVISION_IDENTITY_MISMATCH,
    });
  });

  it("uses no more than twelve controlled swipes before marker-not-found", async () => {
    const viewports = Array.from({ length: 13 }, (_, index) =>
      snapshot(`viewport-${index}`, [node("consumer-repair-screen")])
    );
    const { result, scrolls } = await search(viewports);
    expect(result.status).toBe("not_found");
    expect(result.failureToken).toBe(
      STOP_R9_HARNESS_COMPILED_REVISION_MARKER_NOT_FOUND_AFTER_BOUNDED_SCROLL,
    );
    expect(result.swipes).toBe(12);
    expect(scrolls).toHaveLength(12);
    expect(scrolls).toEqual(Array(12).fill("up"));
  });

  it("waits on a visible previous revision until the exact edited revision replaces it", async () => {
    const editExpected: CompiledRevisionExpectedIdentity = {
      ...expected,
      previousRevisionId: "revision-r1-exact",
      baselineRevisionOrdinal: 1,
      expectedBuildDelta: 0,
    };
    const previous = snapshot("previous", markerNodes({
      revisionId: "revision-r1-exact",
      ordinal: 1,
    }));
    const edited = snapshot("edited", markerNodes({
      revisionId: "revision-r2-exact",
      ordinal: 2,
    }));
    const scrollKnownContainerUp = jest.fn(async () => true);
    let settledReads = 0;
    const result = await findCompiledRevisionMarkerAcrossViewport({
      expected: editExpected,
      currentBuildCount: 4,
      readViewport: async () => previous,
      scrollKnownContainerUp,
      readSettledViewport: async () => {
        settledReads += 1;
        return edited;
      },
      fingerprint: (value) => value.xml,
    });

    expect(result).toMatchObject({
      status: "found",
      swipes: 0,
      evidence: {
        current_revision_id: "revision-r2-exact",
        revision_ordinal: 2,
        build_count_delta: 0,
      },
    });
    expect(settledReads).toBe(1);
    expect(scrollKnownContainerUp).not.toHaveBeenCalled();
  });

  it("classifies a bounded stale visible revision as product identity mismatch without scrolling it away", async () => {
    const editExpected: CompiledRevisionExpectedIdentity = {
      ...expected,
      previousRevisionId: "revision-r1-exact",
      baselineRevisionOrdinal: 1,
      expectedBuildDelta: 0,
    };
    const previous = snapshot("previous", markerNodes({
      revisionId: "revision-r1-exact",
      ordinal: 1,
    }));
    const scrollKnownContainerUp = jest.fn(async () => true);
    const result = await findCompiledRevisionMarkerAcrossViewport({
      expected: editExpected,
      currentBuildCount: 4,
      readViewport: async () => previous,
      scrollKnownContainerUp,
      readSettledViewport: async () => previous,
      fingerprint: (value) => value.xml,
      maxPendingMarkerPolls: 2,
    });

    expect(result).toMatchObject({
      status: "identity_mismatch",
      failureToken: STOP_R9_PRODUCT_COMPILED_REVISION_IDENTITY_MISMATCH,
      swipes: 0,
    });
    expect(scrollKnownContainerUp).not.toHaveBeenCalled();
  });

  it("waits through a slow transactional projection before accepting its exact successor", async () => {
    const editExpected: CompiledRevisionExpectedIdentity = {
      ...expected,
      previousRevisionId: "revision-r1-exact",
      baselineRevisionOrdinal: 1,
      expectedBuildDelta: 0,
    };
    const previous = snapshot("previous", markerNodes({
      revisionId: "revision-r1-exact",
      ordinal: 1,
    }));
    const successor = snapshot("successor", markerNodes({
      revisionId: "revision-r2-exact",
      ordinal: 2,
    }));
    let settledReads = 0;
    const scrollKnownContainerUp = jest.fn(async () => true);
    const result = await findCompiledRevisionMarkerAcrossViewport({
      expected: editExpected,
      currentBuildCount: 4,
      readViewport: async () => previous,
      scrollKnownContainerUp,
      readSettledViewport: async () => {
        settledReads += 1;
        return settledReads < 6 ? previous : successor;
      },
      fingerprint: (value) => value.xml,
      maxPendingMarkerPolls: 8,
    });

    expect(result).toMatchObject({
      status: "found",
      swipes: 0,
      evidence: {
        current_revision_id: "revision-r2-exact",
        revision_ordinal: 2,
      },
    });
    expect(settledReads).toBe(6);
    expect(scrollKnownContainerUp).not.toHaveBeenCalled();
  });

  it("recovers the exact summary anchor when an async edit remount displaces the visible marker", async () => {
    const editExpected: CompiledRevisionExpectedIdentity = {
      ...expected,
      previousRevisionId: "revision-r1-exact",
      baselineRevisionOrdinal: 1,
      expectedBuildDelta: 0,
    };
    const previous = snapshot("previous", markerNodes({
      revisionId: "revision-r1-exact",
      ordinal: 1,
    }));
    const displaced = snapshot("displaced", [node("request-estimate-parameter-panel")]);
    const recovered = snapshot("recovered", markerNodes({
      revisionId: "revision-r2-exact",
      ordinal: 2,
    }));
    const scrollKnownContainerUp = jest.fn(async () => true);
    const recoverKnownAnchor = jest.fn(async () => recovered);
    const boundaries: string[] = [];
    const result = await findCompiledRevisionMarkerAcrossViewport({
      expected: editExpected,
      currentBuildCount: 4,
      readViewport: async () => previous,
      scrollKnownContainerUp,
      readSettledViewport: async () => displaced,
      recoverKnownAnchor,
      fingerprint: (value) => value.xml,
      onViewport: (boundary) => {
        boundaries.push(boundary);
      },
    });

    expect(result).toMatchObject({
      status: "found",
      swipes: 0,
      evidence: {
        current_revision_id: "revision-r2-exact",
        revision_ordinal: 2,
      },
    });
    expect(recoverKnownAnchor).toHaveBeenCalledWith(displaced);
    expect(boundaries).toEqual(["before", "pending_poll", "anchor_recovery", "final"]);
    expect(scrollKnownContainerUp).not.toHaveBeenCalled();
  });
});
