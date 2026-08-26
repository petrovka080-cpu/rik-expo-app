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

function collectJsonTestIds(tree: JsonTree): { type: string; testID: string }[] {
  if (!tree) return [];
  if (Array.isArray(tree)) return tree.flatMap(collectJsonTestIds);
  const own = typeof tree.props?.testID === "string"
    ? [{ type: tree.type, testID: tree.props.testID }]
    : [];
  return own.concat(
    (tree.children ?? []).flatMap((child) =>
      typeof child === "string" ? [] : collectJsonTestIds(child)
    ),
  );
}

function visibleText(tree: JsonTree): string {
  if (!tree) return "";
  if (Array.isArray(tree)) return tree.map(visibleText).join("");
  return (tree.children ?? []).map((child) =>
    typeof child === "string" ? child : visibleText(child)
  ).join("");
}

describe("estimate revision diff UI", () => {
  it("shows the immutable backend revision ordinal instead of renumbering a loaded history slice", () => {
    const revision = {
      ...createEstimateDraftRevision({
        estimateDraftId: "backend-ordinal-ui",
        rawInput: "Ремонт фасада 120 м2",
        createdAt: "2026-08-22T00:00:00.000Z",
      }),
      canonicalRevisionNumber: 4,
    };
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<EstimateRevisionTimeline state={{
        estimateDraftId: revision.estimateDraftId,
        currentRevisionId: revision.revisionId,
        revisions: [revision],
        diffs: [],
      }} />);
    });
    const tree = renderer.toJSON();
    expect(visibleText(tree)).toContain("Текущая версия: 4");
    expect(collectJsonTestIds(tree).some(({ testID }) => testID.includes("--ordinal-4--"))).toBe(true);
  });

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
    const compiledMarkers = collectJsonTestIds(hostTree)
      .filter(({ testID }) => testID.startsWith("estimate-compiled-revision-v1--"));
    const selectedCatalogId = r2.resolvedIdentity?.requestedCatalogWorkId ?? r2.selectedTemplateId;
    const selectedWorkKey = r2.professionalWorkId?.trim() ?? "";
    expect(compiledMarkers).toEqual([{
      type: "Text",
      testID: [
        "estimate-compiled-revision-v1",
        `catalog-${selectedCatalogId}`,
        `work-${selectedWorkKey}`,
        `owner-${selectedWorkKey}`,
        `revision-${r2.revisionId}`,
        "ordinal-2",
        `rows-${r2.boq.rows.length}`,
        `status-${r2.status}`,
      ].join("--"),
    }]);
    expect(JSON.stringify(hostTree)).not.toContain("runtimeIdentityMarker");
  });
});
