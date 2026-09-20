import React from "react";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";

import { ConsumerRepairProgressiveEstimatePanel } from "./ConsumerRepairProgressiveEstimatePanel";

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

const viewModel = {
  title: "Монтаж анкерной группы",
  summary: "",
  totalLabel: "",
  priceStatusLabel: "",
  sourceConfidenceLabel: "",
  sourceLabels: [],
  taxLabel: "",
  trustLevelLabel: "",
  commercialEstimateLevelLabel: "",
  sourceQualityLabel: "",
  expertReviewStatusLabel: "",
  fullTotalStatusLabel: "",
  visibleLines: [],
  assumptionRows: [],
  sections: [],
  professionalPreview: false,
  previewSections: [],
  calculationPreviewLines: [],
  normSourcePreviewLines: [],
  rawItemCount: 0,
  manualCatalogItems: [],
} as never;

function revision(procurementReady: boolean) {
  const revisionId = "revision-anchor-52";
  return {
    revisionId,
    canonicalRevisionNumber: 25,
    missingInputs: [],
    inputParams: {},
    boq: {
      sections: [],
      rows: [{
        rowId: "material:anchor-group:anchor-bolts",
        titleRu: "Анкерные болты AG-M42-HL",
        quantity: 52,
        unit: "piece",
        unitLabel: "шт.",
        unitPrice: null,
        currency: "KGS",
        includedInProcurement: true,
        sourceParameters: {},
      }],
    },
    artifacts: {
      snapshotId: null,
      pdfArtifactId: null,
      buyerHandoffId: null,
      artifactsValidForRevisionId: null,
      procurementArtifactId: procurementReady ? "procurement-artifact-52" : null,
      procurementValidForRevisionId: procurementReady ? revisionId : null,
    },
  } as never;
}

function panel(currentRevision: ReturnType<typeof revision>) {
  const noop = jest.fn();
  return (
    <ConsumerRepairProgressiveEstimatePanel
      viewModel={viewModel}
      revisionState={null}
      currentRevision={currentRevision}
      latestDiff={null}
      onOpenProcurement={noop}
      onDecrease={noop}
      onIncrease={noop}
      onQuantityChange={noop}
      onUnitPriceChange={noop}
      onRemove={noop}
      onAddManual={noop}
      onAddCustom={noop}
    />
  );
}

describe("canonical procurement preview remount", () => {
  it("opens when the current revision receives its procurement artifact", () => {
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(panel(revision(false)));
    });
    expect(renderer.root.findAllByProps({ testID: "consumer-estimate-procurement-list" }))
      .toHaveLength(0);

    act(() => renderer.update(panel(revision(true))));

    expect(renderer.root.findByProps({ testID: "consumer-estimate-procurement-list" }))
      .toBeTruthy();
    expect(renderer.root.findAllByProps({ testID: "request-estimate-positions-panel" }))
      .toHaveLength(0);
  });

  it("restores the open preview from a ready artifact after a parent remount", () => {
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(panel(revision(true)));
    });

    expect(renderer.root.findByProps({ testID: "consumer-estimate-procurement-list" }))
      .toBeTruthy();
    expect(renderer.root.findByProps({
      testID: "consumer-estimate-procurement-row-material:anchor-group:anchor-bolts",
    })).toBeTruthy();
  });
});
