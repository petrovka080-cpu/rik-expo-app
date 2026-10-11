import React from "react";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";

import { ConsumerRepairProgressiveEstimatePanel } from "../../src/features/consumerRepair/ConsumerRepairProgressiveEstimatePanel";
import { ConsumerRepairRequestStickyActions } from "../../src/features/consumerRepair/ConsumerRepairRequestChrome";
import { RequestEstimateItemsEditor } from "../../src/features/consumerRepair/RequestEstimateItemsEditor";
import { ConsumerRepairRequestScreenController } from "../../src/features/consumerRepair/ConsumerRepairRequestScreen";
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
  it("keeps external withdrawal blocking even after a local parameter preview", () => {
    const session = { status: "READY", contentWithdrawalReasonRu: "Несовместимый паспорт",
      blockingMissingParameterIds: [], contractMissingParameterIds: [], invalidParameterIds: [], parameters: [] } as never;
    expect(consumerRepairCanonicalMissingParameterCount(session)).toBe(0);
    expect(consumerRepairCanonicalEstimateBlocksApproval(session)).toBe(true);
  });

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
    act(() => {
      renderer.root.findByProps({ testID: "request-estimate-parameters-toggle" }).props.onPress();
    });
    expect(renderer.root.findByProps({ testID: "request-estimate-parameter-panel" })).toBeTruthy();
    act(() => {
      renderer.root.findByProps({ testID: "request-estimate-positions-toggle" }).props.onPress();
    });
    expect(renderer.root.findByProps({ testID: "request-estimate-composition-heading" }).props.children)
      .toBe("Материалы и работы — расчёт не завершён");
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
    expect(approval.props.accessibilityLabel).toBe("Нельзя подтвердить: уточните позиции (24)");
  });

  it("highlights the exact unresolved row and offers one batch apply after several edits", () => {
    const apply = jest.fn();
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <RequestEstimateItemsEditor
          viewModel={{
            title: "Ленточный фундамент",
            summary: "Ленточный фундамент",
            totalLabel: "Итог не рассчитан",
            priceStatusLabel: "0/1",
            sourceConfidenceLabel: "high",
            sourceLabels: [],
            taxLabel: "",
            trustLevelLabel: "Предварительно",
            commercialEstimateLevelLabel: "Объёмы",
            sourceQualityLabel: "",
            expertReviewStatusLabel: "",
            fullTotalStatusLabel: "",
            visibleLines: [],
            assumptionRows: [],
            sections: [{
              id: "equipment",
              title: "Механизмы",
              items: [{
                id: "lifting-row",
                requestDraftId: "draft-foundation",
                itemType: "service",
                titleRu: "Подъёмное оборудование для арматурных каркасов",
                quantity: 240,
                unit: "machine_hour",
                unitPrice: null,
                totalPrice: null,
                currency: "KGS",
                source: "ai_suggested",
                editableByConsumer: true,
                createdAt: "2026-09-23T00:00:00.000Z",
                sourceParameters: {
                  canonicalPreliminaryNeed: true,
                  includedInEstimate: true,
                  missingParameterRequirements: [{
                    parameterId: "lifting_equipment_designation",
                    titleRu: "Обозначение подъёмного оборудования",
                  }],
                },
              }],
            }],
            professionalPreview: false,
            previewSections: [],
            calculationPreviewLines: [],
            normSourcePreviewLines: [],
            rawItemCount: 1,
            calculatedItemCount: 0,
            preliminaryNeedCount: 1,
            manualCatalogItems: [],
          }}
          incompleteParameterCount={1}
          pendingCanonicalRowEditCount={2}
          onApplyCanonicalRowEdits={apply}
          onDecrease={noop}
          onIncrease={noop}
          onQuantityChange={noop}
          onUnitPriceChange={noop}
          onRemove={noop}
          onAddManual={noop}
        />,
      );
    });

    expect(renderer.root.findByProps({ testID: "request-estimate-unresolved-row-list" })).toBeTruthy();
    expect(renderer.root.findByProps({ testID: "consumer-repair-item-unresolved-notice-lifting-row" })).toBeTruthy();
    expect(visibleText(renderer)).toContain("Обозначение подъёмного оборудования");
    expect(visibleText(renderer)).toContain("Количество 240 сохранено");
    act(() => {
      renderer.root.findByProps({ testID: "request-estimate-row-batch-apply-bottom" }).props.onPress();
    });
    expect(apply).toHaveBeenCalledTimes(1);
  });

  it("offers one action that applies pending row edits and confirms the resulting revision", () => {
    const applyAndApprove = jest.fn();
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <ConsumerRepairRequestStickyActions
          approved={false}
          sent={false}
          hasBundle
          hasSnapshot
          approvalBlockedByEstimate
          approvalPendingRowEditCount={3}
          approvalBlockedBeyondPendingEdits={false}
          onOpenPdf={noop}
          onMakePdf={noop}
          onCreateNew={noop}
          onDeleteDraft={noop}
          onApproveDraft={noop}
          onApplyAndApproveDraft={applyAndApprove}
          onPrepareDraft={noop}
        />,
      );
    });

    expect(renderer.root.findByProps({ testID: "consumer-repair-approve" }).props.accessibilityLabel)
      .toBe("Применить изменения и подтвердить смету");
    const approval = renderer.root.findByProps({ testID: "consumer-repair-approve" });
    expect(approval.props.disabled).toBe(false);
    act(() => approval.props.onPress());
    expect(applyAndApprove).toHaveBeenCalledTimes(1);
  });

  it.each([
    { approvalUnresolvedRowCount: 26, approvalBlockedBeyondPendingEdits: true, label: "Нельзя подтвердить: уточните позиции (26)" },
    { approvalUnresolvedRowCount: 0, approvalBlockedBeyondPendingEdits: undefined, label: "Сначала примените изменения: 1" },
    { approvalUnresolvedRowCount: 0, approvalBlockedBeyondPendingEdits: true, label: "Сначала примените изменения: 1" },
  ])("pending price does not enable confirmation of an incomplete or unverified composition: $label", ({label,...blocking}) => {
    let renderer!: ReactTestRenderer;
    act(() => { renderer=TestRenderer.create(<ConsumerRepairRequestStickyActions
      approved={false} sent={false} hasBundle hasSnapshot approvalBlockedByEstimate
      approvalPendingRowEditCount={1} {...blocking}
      onOpenPdf={noop} onMakePdf={noop} onCreateNew={noop} onDeleteDraft={noop}
      onApproveDraft={noop} onApplyAndApproveDraft={noop} onPrepareDraft={noop} />); });
    const approval=renderer.root.findByProps({testID:"consumer-repair-approve"});
    expect(approval.props.disabled).toBe(true);expect(approval.props.accessibilityLabel).toBe(label);
    act(()=>renderer.unmount());
  });

  it("recalculates several staged rows once and approves exactly the resulting child revision", async () => {
    const recalculate = jest.fn();
    const baseRowSource = (rowCode: string) => ({
      canonicalBackendRevisionId: "revision-base",
      canonicalBackendReleaseId: "release-base",
      rowCode,
    });
    const bundle = {
      draft: {
        id: "draft-batch",
        title: "Смета",
        problemText: "Ленточный фундамент",
        status: "draft",
      },
      items: [
        {
          id: "row-item-1",
          requestDraftId: "draft-batch",
          itemType: "material",
          titleRu: "Бетон",
          quantity: 10,
          unit: "m3",
          unitPrice: null,
          totalPrice: null,
          currency: "KGS",
          source: "ai_suggested",
          editableByConsumer: true,
          createdAt: "2026-09-23T00:00:00.000Z",
          sourceParameters: baseRowSource("material:concrete"),
        },
        {
          id: "row-item-2",
          requestDraftId: "draft-batch",
          itemType: "material",
          titleRu: "Арматура",
          quantity: 20,
          unit: "kg",
          unitPrice: null,
          totalPrice: null,
          currency: "KGS",
          source: "ai_suggested",
          editableByConsumer: true,
          createdAt: "2026-09-23T00:00:00.000Z",
          sourceParameters: baseRowSource("material:rebar"),
        },
      ],
    };
    let controller!: ConsumerRepairRequestScreenController;
    recalculate.mockImplementation(async () => {
      const currentBundle = (controller as never as { state: { bundle: typeof bundle } }).state.bundle;
      return {
        session: { revisionId: "revision-child" },
        bundle: {
          ...currentBundle,
          items: currentBundle.items.map((item) => ({
            ...item,
            sourceParameters: {
              ...item.sourceParameters,
              canonicalBackendRevisionId: "revision-child",
            },
          })),
        },
      };
    });
    controller = new ConsumerRepairRequestScreenController({
      consumerUserId: "consumer-batch",
      onPrepareCanonicalEstimate: jest.fn(),
      onLoadCanonicalRevisionDraft: jest.fn(),
      onLoadCanonicalParameterSession: jest.fn(),
      onRecalculateCanonicalEstimate: recalculate,
      onSelectCanonicalCatalogItem: jest.fn(),
      onAddCanonicalCatalogItem: jest.fn(),
      onOpenPhotoForMaterialRecognition: jest.fn(),
    });
    const mutable = controller as never as {
      state: Record<string, unknown> & { bundle: unknown; pendingCanonicalRowEditCount?: number };
      setState: (update: unknown, callback?: () => void) => void;
      changeItemQuantity: (itemId: string, value: string) => Promise<void>;
      changeItemUnitPrice: (itemId: string, value: string) => Promise<void>;
      applyPendingCanonicalRowEdits: () => Promise<boolean>;
      applyAndApproveDraft: () => Promise<void>;
      approveDraft: () => Promise<void>;
      approvalExpectedCanonicalRevisionId: string | null;
      refreshHistory: () => void;
    };
    mutable.state = { ...mutable.state, bundle };
    mutable.setState = (update, callback) => {
      const patch = typeof update === "function"
        ? (update as (state: typeof mutable.state) => Partial<typeof mutable.state>)(mutable.state)
        : update as Partial<typeof mutable.state>;
      mutable.state = { ...mutable.state, ...patch };
      callback?.();
    };
    mutable.refreshHistory = jest.fn();
    let approvedRevisionId: string | null = null;
    mutable.approveDraft = jest.fn(async () => {
      approvedRevisionId = mutable.approvalExpectedCanonicalRevisionId;
    });

    await mutable.changeItemQuantity("row-item-1", "12");
    await mutable.changeItemUnitPrice("row-item-2", "99");

    expect(recalculate).not.toHaveBeenCalled();
    expect(mutable.state.pendingCanonicalRowEditCount).toBe(2);

    await mutable.applyAndApproveDraft();

    expect(recalculate).toHaveBeenCalledTimes(1);
    expect(recalculate.mock.calls[0][0].rowOverrides).toMatchObject({
      "material:concrete": { quantity: 12 },
      "material:rebar": { unitPrice: 99 },
    });
    expect(mutable.state.pendingCanonicalRowEditCount).toBe(0);
    expect(mutable.approveDraft).toHaveBeenCalledTimes(1);
    expect(approvedRevisionId).toBe("revision-child");
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

  it("does not ask for parameters or allow pending edits to approve a withdrawn calculation", () => {
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <ConsumerRepairRequestStickyActions
          approved={false} sent={false} hasBundle hasSnapshot
          approvalBlockedByEstimate approvalBlockedByParameters
          approvalPendingRowEditCount={2}
          contentWithdrawalReasonRu="Ошибочная привязка паспорта"
          onOpenPdf={noop} onMakePdf={noop} onCreateNew={noop}
          onDeleteDraft={noop} onApproveDraft={noop} onPrepareDraft={noop}
        />,
      );
    });
    const approval = renderer.root.findByProps({ testID: "consumer-repair-approve" });
    expect(approval.props.disabled).toBe(true);
    expect(approval.props.accessibilityLabel).toBe("Расчёт требует исправления");
    expect(approval.props.accessibilityHint).toBe("Ошибочная привязка паспорта");
  });

  it("allows confirmation when only payable prices are missing", () => {
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <ConsumerRepairRequestStickyActions
          approved={false}
          sent={false}
          hasBundle
          hasSnapshot
          approvalBlockedByEstimate={false}
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
    expect(approval.props.disabled).toBe(false);
    expect(approval.props.accessibilityLabel).toBe("Подтвердить смету");
    expect(approval.props.accessibilityHint).toBe(
      "Без цены остаются позиции: 7. Их можно заполнить позже.",
    );
  });
});
