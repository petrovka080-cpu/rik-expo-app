import React from "react";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";

import { ConsumerRepairProgressiveEstimatePanel } from "../../src/features/consumerRepair/ConsumerRepairProgressiveEstimatePanel";
import { ConsumerRepairRequestStickyActions } from "../../src/features/consumerRepair/ConsumerRepairRequestChrome";
import {
  consumerRepairCanonicalEstimateBlocksApproval,
  consumerRepairCanonicalMissingParameterCount,
  consumerRepairCanonicalUnpricedPayableRowCount,
  consumerRepairCanonicalUnresolvedRowCount,
} from "../../src/features/consumerRepair/consumerRepairCanonicalEstimateReadiness";

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

const noop = jest.fn();

function visibleText(renderer: ReactTestRenderer): string {
  return renderer.root.findAllByType("Text" as never)
    .map((node) => String(node.props.children ?? ""))
    .join(" ");
}

describe("incomplete canonical estimate readiness", () => {
  it("keeps a quantity-only preliminary estimate confirmable when only contract inputs are missing", () => {
    const session = {
      status: "PRELIMINARY_WITH_ASSUMPTIONS",
      blockingMissingParameterIds: [],
      contractMissingParameterIds: ["system_id", "site_access"],
      invalidParameterIds: [],
    } as never;

    expect(consumerRepairCanonicalMissingParameterCount(session)).toBe(2);
    expect(consumerRepairCanonicalEstimateBlocksApproval(session)).toBe(false);
  });

  it("blocks confirmation for genuinely blocking or invalid inputs", () => {
    expect(consumerRepairCanonicalEstimateBlocksApproval({
      status: "BLOCKING_REQUIRED",
      blockingMissingParameterIds: ["area_m2"],
      contractMissingParameterIds: [],
      invalidParameterIds: [],
    } as never)).toBe(true);
    expect(consumerRepairCanonicalEstimateBlocksApproval({
      status: "PRELIMINARY_WITH_ASSUMPTIONS",
      blockingMissingParameterIds: [],
      contractMissingParameterIds: [],
      invalidParameterIds: ["waste_mass_kg"],
    } as never)).toBe(true);
  });

  it("shows missing P0 immediately and never labels a partial BOQ as complete", () => {
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <ConsumerRepairProgressiveEstimatePanel
          viewModel={{
            title: "Устройство каркаса потолка — 158 м²",
            summary: "Устройство каркаса потолка — 158 м²",
            totalLabel: "Полный итог не рассчитан",
            priceStatusLabel: "0/1 строк с ценой",
            sourceConfidenceLabel: "high",
            sourceLabels: [],
            taxLabel: "",
            trustLevelLabel: "Рассчитаны подтверждённые объёмы",
            commercialEstimateLevelLabel: "Уровень сметы: только объёмы",
            sourceQualityLabel: "",
            expertReviewStatusLabel: "",
            fullTotalStatusLabel: "",
            visibleLines: [],
            assumptionRows: [],
            sections: [{
              id: "labor",
              title: "Работы",
              items: [{
                id: "frame-row",
                requestDraftId: "draft-frame",
                itemType: "work",
                titleRu: "Монтаж несущего каркаса плоского потолка",
                quantity: 158,
                unit: "m2",
                unitPrice: null,
                totalPrice: null,
                currency: "KGS",
                source: "ai_suggested",
                editableByConsumer: true,
                createdAt: "2026-09-08T00:00:00.000Z",
              }],
            }],
            professionalPreview: false,
            previewSections: [],
            calculationPreviewLines: [],
            normSourcePreviewLines: [],
            rawItemCount: 1,
            manualCatalogItems: [],
          }}
          revisionState={null}
          currentRevision={null}
          latestDiff={null}
          canonicalParameterSession={{
            revisionId: "frame-revision",
            status: "PRELIMINARY_WITH_ASSUMPTIONS",
            parameters: [{
              parameterId: "frame_system_id",
              label: "Выбранная система каркаса",
              description: "Комплектная система каркаса по проекту",
              value: null,
              valueType: "text",
              unit: null,
              source: "MISSING",
              state: "BLOCKING_REQUIRED",
              requiredLevel: "CONTRACT_REQUIRED",
              visibilityCondition: { kind: "ALWAYS" },
              validation: {},
              allowedValues: [],
              displayOrder: 1,
              confidence: 0,
              assumption: null,
              affectsRows: ["frame-row"],
              affectsFormula: [],
              normativeSource: null,
              sourceText: null,
              valid: false,
              validationIssues: ["VALUE_REQUIRED"],
            }],
            blockingMissingParameterIds: [],
            contractMissingParameterIds: Array.from({ length: 8 }, (_, index) => `required_${index}`),
            invalidParameterIds: [],
            assumptionParameterIds: [],
          } as never}
          onDecrease={noop}
          onIncrease={noop}
          onQuantityChange={noop}
          onUnitPriceChange={noop}
          onRemove={noop}
          onAddManual={noop}
          onAddCustom={noop}
        />,
      );
    });

    expect(renderer.root.findByProps({ testID: "request-estimate-parameter-status" }).props.children)
      .toBe("Нужно уточнить: 8 параметров");
    expect(renderer.root.findByProps({ testID: "request-estimate-parameter-panel" })).toBeTruthy();
    expect(renderer.root.findByProps({ testID: "request-estimate-composition-heading" }).props.children)
      .toBe("Предварительный состав");
    expect(renderer.root.findByProps({ testID: "request-estimate-incomplete-composition-notice" })).toBeTruthy();
    expect(visibleText(renderer)).not.toContain("Полная смета");
  });

  it("counts selected BOQ rows whose quantity still needs a source", () => {
    expect(consumerRepairCanonicalUnresolvedRowCount({
      items: [
        { sourceParameters: { canonicalPreliminaryNeed: true } },
        { sourceParameters: { canonicalPreliminaryNeed: true, includedInEstimate: false } },
        { sourceParameters: { canonicalPreliminaryNeed: false } },
      ],
    } as never)).toBe(1);
  });

  it("counts only included payable rows whose price is missing", () => {
    expect(consumerRepairCanonicalUnpricedPayableRowCount({
      items: [
        { quantity: 2, unitPrice: null, totalPrice: null, sourceParameters: {} },
        { quantity: 2, unitPrice: null, totalPrice: null, sourceParameters: { payable: false } },
        { quantity: 2, unitPrice: null, totalPrice: null, sourceParameters: { canonicalCostTreatment: "CONTROL_OR_DOCUMENT" } },
        { quantity: 2, unitPrice: null, totalPrice: null, sourceParameters: { includedInEstimate: false } },
        { quantity: 2, unitPrice: 10, totalPrice: 20, sourceParameters: {} },
      ],
    } as never)).toBe(1);
  });

  it("explains that unresolved BOQ rows block confirmation", () => {
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <ConsumerRepairRequestStickyActions
          approved={false}
          sent={false}
          hasBundle
          hasSnapshot
          approvalBlockedByEstimate
          approvalBlockedByParameters={false}
          approvalUnresolvedRowCount={24}
          onOpenPdf={noop}
          onMakePdf={noop}
          onCreateNew={noop}
          onDeleteDraft={noop}
          onApproveDraft={noop}
          onPrepareDraft={noop}
        />,
      );
    });

    const approval = renderer.root.findByProps({ testID: "consumer-repair-approve" });
    expect(approval.props.disabled).toBe(true);
    expect(approval.props.accessibilityLabel).toBe("Нельзя подтвердить: без количества 24");
  });

  it("blocks confirmation with an explicit parameter message", () => {
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <ConsumerRepairRequestStickyActions
          approved={false}
          sent={false}
          hasBundle
          hasSnapshot
          approvalBlockedByEstimate
          approvalBlockedByParameters
          onOpenPdf={noop}
          onMakePdf={noop}
          onCreateNew={noop}
          onDeleteDraft={noop}
          onApproveDraft={noop}
          onPrepareDraft={noop}
        />,
      );
    });

    const approval = renderer.root.findByProps({ testID: "consumer-repair-approve" });
    expect(approval.props.disabled).toBe(true);
    expect(approval.props.accessibilityLabel).toBe("Заполните параметры сметы");
  });

  it("explains that missing payable prices block confirmation", () => {
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <ConsumerRepairRequestStickyActions
          approved={false}
          sent={false}
          hasBundle
          hasSnapshot
          approvalBlockedByEstimate
          approvalMissingPriceCount={7}
          onOpenPdf={noop}
          onMakePdf={noop}
          onCreateNew={noop}
          onDeleteDraft={noop}
          onApproveDraft={noop}
          onPrepareDraft={noop}
        />,
      );
    });

    const approval = renderer.root.findByProps({ testID: "consumer-repair-approve" });
    expect(approval.props.disabled).toBe(true);
    expect(approval.props.accessibilityLabel).toBe("Нельзя подтвердить: без цены 7");
  });
});
