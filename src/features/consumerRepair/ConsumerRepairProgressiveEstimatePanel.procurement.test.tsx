import React from "react";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";

import { ConsumerRepairProgressiveEstimatePanel } from "./ConsumerRepairProgressiveEstimatePanel";

type ProgressiveEstimateViewModel = React.ComponentProps<
  typeof ConsumerRepairProgressiveEstimatePanel
>["viewModel"];

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
} as ProgressiveEstimateViewModel;

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

function panel(
  currentRevision: ReturnType<typeof revision>,
  model = viewModel,
) {
  const noop = jest.fn();
  return (
    <ConsumerRepairProgressiveEstimatePanel
      viewModel={model}
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

  it("keeps a user-opened positions panel in front of the procurement preview", () => {
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(panel(revision(true)));
    });

    act(() => {
      renderer.root.findByProps({ testID: "request-estimate-positions-toggle" }).props.onPress();
    });

    expect(renderer.root.findByProps({ testID: "request-estimate-positions-panel" }))
      .toBeTruthy();
    expect(renderer.root.findAllByProps({ testID: "consumer-estimate-procurement-list" }))
      .toHaveLength(0);
  });

  it("shows every position by default when the estimate has no preliminary needs", () => {
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(panel(revision(true), {
        ...viewModel,
        preliminaryNeedCount: 0,
      } as never));
    });

    expect(renderer.root.findByProps({ testID: "request-estimate-positions-panel" }))
      .toBeTruthy();
    expect(renderer.root.findAllByProps({ testID: "consumer-estimate-procurement-list" }))
      .toHaveLength(0);
  });
});
