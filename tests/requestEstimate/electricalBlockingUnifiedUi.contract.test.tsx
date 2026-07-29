import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import { ConsumerRepairDraftPanel } from "../../src/features/consumerRepair/ConsumerRepairDraftPanel";
import { ConsumerRepairRequestStickyActions } from "../../src/features/consumerRepair/ConsumerRepairRequestChrome";
import { buildConsumerRepairSelectedWorkDraftBundle } from "../../src/features/consumerRepair/requestEstimateScreenActions";
import {
  __resetConsumerRepairRequestStoreForTests,
  validateConsumerRepairRequestForApprove,
} from "../../src/lib/consumerRequests";

jest.mock("@expo/vector-icons", () => {
  const mockReact = jest.requireActual("react") as typeof import("react");
  return {
    Ionicons: ({ name }: { name: string }) =>
      mockReact.createElement("MockIonicon", { name }),
  };
});

function visibleText(
  tree: ReturnType<TestRenderer.ReactTestRenderer["toJSON"]>,
): string {
  if (!tree) return "";
  if (Array.isArray(tree)) return tree.map(visibleText).join(" ");
  return (tree.children ?? [])
    .map((child) => typeof child === "string" ? child : visibleText(child))
    .join(" ");
}

describe("unified canonical estimate UI", () => {
  beforeEach(() => {
    __resetConsumerRepairRequestStoreForTests();
  });

  it("uses the shared parameter editor and explicit actions for blocking electrical scope", () => {
    const { bundle } = buildConsumerRepairSelectedWorkDraftBundle({
      consumerUserId: "electrical-unified-ui",
      problemText: "электрика под ключ 100 кв метров площадь",
      repairType: "estimate",
      city: "Bishkek",
      addressText: "",
      preferredTimeText: "",
      contactPhone: "",
      selectedWork: null,
    });
    const noop = jest.fn();
    let panel!: TestRenderer.ReactTestRenderer;
    let actions!: TestRenderer.ReactTestRenderer;

    act(() => {
      panel = TestRenderer.create(
        <ConsumerRepairDraftPanel
          bundle={bundle}
          aiAnswerRu={null}
          onDecrease={noop}
          onIncrease={noop}
          onQuantityChange={noop}
          onUnitPriceChange={noop}
          onRemove={noop}
          onAddManual={noop}
          onAddPhotoMaterialRecognition={noop}
          onOpenPhotoForEstimateItem={noop}
          onAddCustom={noop}
          onOpenCatalog={noop}
          onApplyParamBatch={noop}
        />,
      );
      actions = TestRenderer.create(
        <ConsumerRepairRequestStickyActions
          approved={false}
          sent={false}
          hasBundle
          hasSnapshot={false}
          approvalBlockedByEstimate
          onOpenPdf={noop}
          onMakePdf={noop}
          onCreateNew={noop}
          onDeleteDraft={noop}
          onApproveDraft={noop}
          onPrepareDraft={noop}
        />,
      );
    });

    const panelText = visibleText(panel.toJSON());
    const actionText = visibleText(actions.toJSON());
    expect(panel.root.findAllByProps({
      testID: "request-estimate-parameter-panel",
    }).length).toBeGreaterThan(0);
    expect(panel.root.findAllByProps({
      testID: "request-estimate-visible-missing-parameters",
    }).length).toBeGreaterThan(0);
    expect(panelText).toContain("Уточнить параметры расчёта");
    expect(panelText).toContain("Площадь объекта");
    expect(panelText).toContain("Длина кабельной трассы");
    expect(panelText).not.toContain(
      "Укажите площадь либо подтвердите длину и ширину",
    );
    expect(actionText).toContain("Сначала рассчитайте смету");
    expect(actionText).toContain("Удалить");
    expect(
      actions.root.findByProps({ testID: "consumer-repair-approve" }).props
        .disabled,
    ).toBe(true);
    expect(
      validateConsumerRepairRequestForApprove(
        bundle.draft.id,
        bundle.draft.consumerUserId,
      ).errors,
    ).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "ESTIMATE_PARAMETERS_REQUIRED",
      }),
    ]));
  });

  it("offers one explicit estimate action when a new prompt is typed over an existing draft", () => {
    const noop = jest.fn();
    let actions!: TestRenderer.ReactTestRenderer;

    act(() => {
      actions = TestRenderer.create(
        <ConsumerRepairRequestStickyActions
          approved={false}
          sent={false}
          hasBundle
          hasSnapshot={false}
          hasPendingPrompt
          onOpenPdf={noop}
          onMakePdf={noop}
          onCreateNew={noop}
          onDeleteDraft={noop}
          onApproveDraft={noop}
          onPrepareDraft={noop}
        />,
      );
    });

    expect(visibleText(actions.toJSON())).toContain("Сформировать смету");
    const prepare = actions.root.findByProps({
      testID: "consumer-repair-prepare-draft",
    });
    expect(prepare.props.disabled).not.toBe(true);
    act(() => prepare.props.onPress());
    expect(noop).toHaveBeenCalledTimes(1);
  });
});
