import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import { parseUserParamPatch } from "../../src/lib/estimate/parseUserParamPatch";
import { recalculateEstimateDraftRevision } from "../../src/lib/estimate/recalculateEstimateDraftRevision";
import { EstimateRevisionDiff } from "../../src/features/requests/components/EstimateRevisionDiff";
import {
  EstimateRevisionTimeline,
  estimateRevisionArtifactsStatusRu,
} from "../../src/features/requests/components/EstimateRevisionTimeline";

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
  it("distinguishes not-created, partial, current and stale artifacts", () => {
    const base = createEstimateDraftRevision({
      estimateDraftId: "artifact-state-ui",
      rawInput: "Работа 1 м2",
      createdAt: "2026-09-11T00:00:00.000Z",
    });
    expect(estimateRevisionArtifactsStatusRu(base)).toBe("PDF ещё не создан; закупка для этой операции не требуется");
    expect(estimateRevisionArtifactsStatusRu({
      ...base,
      artifacts: { ...base.artifacts, pdfArtifactId: "pdf-1", pdfValidForRevisionId: base.revisionId },
    })).toBe("PDF актуален; закупка для этой операции не требуется");
    expect(estimateRevisionArtifactsStatusRu({
      ...base,
      artifacts: { ...base.artifacts, pdfArtifactId: "pdf-old", pdfValidForRevisionId: "old-revision" },
    })).toBe("PDF относится к предыдущей версии — его нужно пересоздать; закупка не требуется");

    const procurementBase = {
      ...base,
      boq: {
        ...base.boq,
        rows: [{ includedInProcurement: true } as (typeof base.boq.rows)[number]],
      },
    };
    expect(estimateRevisionArtifactsStatusRu(procurementBase)).toBe("PDF и пакет закупки ещё не созданы");
    expect(estimateRevisionArtifactsStatusRu({
      ...procurementBase,
      artifacts: { ...base.artifacts, pdfArtifactId: "pdf-1", pdfValidForRevisionId: base.revisionId },
    })).toBe("PDF готов; пакет закупки ещё не создан");
    expect(estimateRevisionArtifactsStatusRu({
      ...procurementBase,
      artifacts: { ...base.artifacts, pdfArtifactId: "pdf-1", procurementArtifactId: "proc-1",
        pdfValidForRevisionId: base.revisionId, procurementValidForRevisionId: base.revisionId },
    })).toBe("PDF и пакет закупки актуальны");
  });

  it("shows the immutable backend revision ordinal instead of renumbering a loaded history slice", () => {
    const revision = {
      ...createEstimateDraftRevision({
        estimateDraftId: "backend-ordinal-ui",
        rawInput: "Ремонт фасада 120 м2",
        createdAt: "2026-08-22T00:00:00.000Z",
      }),
      canonicalRevisionNumber: 4,
      applicableBoqRowsCount: 9,
      status: "needs_more_params_but_preliminary_available" as const,
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
    expect(visibleText(tree)).toContain("Версия 4");
    expect(visibleText(tree)).not.toContain("Текущая версия:");
    expect(collectJsonTestIds(tree).some(({ testID }) => testID.includes("--ordinal-4--"))).toBe(true);
    expect(collectJsonTestIds(tree).some(({ testID }) =>
      testID.includes("--rows-9--status-needs_more_params_but_preliminary_available")
    )).toBe(true);
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
    expect(countJsonTestId(hostTree, "estimate-revision-timeline-r2")).toBe(0);
    expect(countJsonTestId(hostTree, "estimate-revision-diff")).toBe(1);
    expect(countJsonTestId(hostTree, "estimate-revision-diff-param-length_m")).toBe(1);
    expect(countJsonTestId(hostTree, "estimate-revision-artifact-status")).toBe(0);
    expect(visibleText(hostTree)).toContain("PDF и пакет закупки ещё не созданы");
    expect(visibleText(hostTree)).not.toMatch(/\bR2\b/u);
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

  it("uses canonical parameter labels and units in the visible diff", () => {
    const diff = {
      fromRevisionId: "revision-before",
      toRevisionId: "revision-after",
      changedParams: [{
        key: "base_emulsion_rate_l_m2",
        before: null,
        after: 0.3,
      }],
      changedRows: [{
        rowId: "mix_delivery",
        titleRu: "Доставка асфальтобетонной смеси",
        beforeQuantity: null,
        afterQuantity: 12,
        unit: "machine_hour",
      }],
      changedRowsCount: 1,
      staleArtifactsAfterEdit: {
        snapshotInvalidated: true,
        pdfInvalidated: true,
        buyerHandoffInvalidated: true,
      },
    };
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <EstimateRevisionDiff
          diff={diff}
          parameters={[{
            parameterId: "base_emulsion_rate_l_m2",
            label: "Норма розлива эмульсии по основанию",
            unit: "l_m2",
          }]}
        />,
      );
    });

    const text = visibleText(renderer.toJSON());
    expect(text).toContain("Норма розлива эмульсии по основанию");
    expect(text).toContain("л/м²");
    expect(text).toContain("маш.-ч");
    expect(text).not.toContain(": нет -> 0.3 м²");
  });
});
