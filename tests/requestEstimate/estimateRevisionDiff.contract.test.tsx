import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import { parseUserParamPatch } from "../../src/lib/estimate/parseUserParamPatch";
import { recalculateEstimateDraftRevision } from "../../src/lib/estimate/recalculateEstimateDraftRevision";
import { EstimateRevisionDiff } from "../../src/features/requests/components/EstimateRevisionDiff";
import { EstimateRevisionTimeline } from "../../src/features/requests/components/EstimateRevisionTimeline";

type JsonTree = ReturnType<TestRenderer.ReactTestRenderer["toJSON"]>;

function countJsonTestId(tree: JsonTree, testID: string): number {
  if (!tree) return 0;
  if (Array.isArray(tree)) {
    return tree.reduce((count, node) => count + countJsonTestId(node, testID), 0);
  }
  return (tree.props?.testID === testID ? 1 : 0)
    + (tree.children ?? []).reduce((count, child) => count + countJsonTestId(typeof child === "string" ? null : child, testID), 0);
}

describe("estimate revision diff UI", () => {
  it("shows changed params, changed rows and current revision artifact status", () => {
    const r1 = createEstimateDraftRevision({
      estimateDraftId: "diff-ui",
      rawInput: "габион стена длина 150 метров высота 30 метров толщина 1 метр",
      createdAt: "2026-07-07T00:00:00.000Z",
    });
    const patch = parseUserParamPatch({
      revision: r1,
      operation: "update_param",
      paramKey: "length_m",
      rawValue: "100 м",
    });
    const { revision: r2, diff } = recalculateEstimateDraftRevision(r1, patch, {
      createdAt: "2026-07-07T00:01:00.000Z",
      revisionIndex: 2,
    });
    const state = {
      estimateDraftId: r1.estimateDraftId,
      currentRevisionId: r2.revisionId,
      revisions: [r1, r2],
      diffs: [diff],
    };
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <>
          <EstimateRevisionTimeline state={state} />
          <EstimateRevisionDiff diff={diff} />
        </>,
      );
    });
    const hostTree = renderer.toJSON();

    expect(countJsonTestId(hostTree, "estimate-revision-timeline")).toBe(1);
    expect(countJsonTestId(hostTree, "estimate-revision-timeline-r2")).toBe(1);
    expect(countJsonTestId(hostTree, "estimate-revision-diff")).toBe(1);
    expect(countJsonTestId(hostTree, "estimate-revision-diff-param-length_m")).toBe(1);
    expect(countJsonTestId(hostTree, "estimate-revision-artifact-status")).toBe(1);
  });
});
