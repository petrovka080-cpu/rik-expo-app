import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import { ConsumerRepairRequestContent } from "../../src/features/consumerRepair/ConsumerRepairRequestChrome";
import { ConsumerRepairDraftPanel } from "../../src/features/consumerRepair/ConsumerRepairDraftPanel";
import type { ConsumerRepairDraftBundle } from "../../src/lib/consumerRequests";

jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

jest.mock("../../src/features/catalog/CatalogItemPicker", () => ({
  CatalogItemPicker: () => null,
}));

jest.mock("../../src/features/consumerRepair/ConsumerRepairDraftPanel", () => ({
  ConsumerRepairDraftPanel: () => null,
}));

jest.mock("../../src/features/consumerRepair/ConsumerRepairHistory", () => ({
  ConsumerRepairHistory: () => null,
}));

jest.mock("../../src/features/consumerRepair/ConsumerRepairMarketplaceSend", () => ({
  ConsumerRepairMarketplaceSend: () => null,
}));

jest.mock("../../src/features/consumerRepair/ConsumerRepairMediaButtons", () => ({
  ConsumerRepairDeliveryFieldsCard: () => null,
  ConsumerRepairRequestFormCard: () => null,
}));

function bundle(prompt: string, id: string): ConsumerRepairDraftBundle {
  return {
    draft: {
      id,
      consumerUserId: "mounted-launch-user",
      problemText: prompt,
      repairType: "request_launch",
      status: "draft",
      missingData: [],
      createdAt: "2026-07-28T00:00:00.000Z",
    },
    items: [],
    media: [],
    pdfs: [],
    projectExecutionDrafts: [],
    marketplaceLink: {
      id: `marketplace-${id}`,
      requestDraftId: id,
      status: "not_sent",
      createdAt: "2026-07-28T00:00:00.000Z",
    },
    events: [],
  };
}

const noop = () => undefined;

function renderContent(currentBundle: ConsumerRepairDraftBundle) {
  return (
    <ConsumerRepairRequestContent
      problemText=""
      city=""
      addressText=""
      preferredTimeText=""
      contactPhone=""
      selectedWork={null}
      workSuggestions={[]}
      workSearchLiteralTotalCount={0}
      workSearchGlobalLiteralTotalCount={0}
      workSearchExternalLiteralTotalCount={0}
      workSearchSuggestionTotalCount={0}
      workSearchShownCount={0}
      workSearchLoading={false}
      workSearchErrorRu={null}
      workSearchHasMore={false}
      onLoadMoreWorkSuggestions={noop}
      bundle={currentBundle}
      aiAnswerRu={null}
      statusMessage={null}
      approvedHistoryPage={{
        items: [],
        records: [],
        totalApprovedCount: 0,
        archivedApprovedCount: 0,
        nextCursorCreatedAt: null,
        pageSize: 20,
        totalCountSource: "durable_store",
      }}
      revisionHistory={[]}
      selectedHistoryId={null}
      showPdfAction={false}
      marketplaceSendErrors={[]}
      catalogPickerVisible={false}
      catalogPickerInitialQuery=""
      editingParam={null}
      problemInputRef={React.createRef()}
      canRestoreLastRemoved={false}
      onProblemTextChange={noop}
      onCityChange={noop}
      onAddressTextChange={noop}
      onPreferredTimeTextChange={noop}
      onContactPhoneChange={noop}
      onSelectWorkSuggestion={noop}
      onSelectTemplateCandidate={noop}
      onPrepareDraft={noop}
      onMakePdf={noop}
      onOpenProcurement={noop}
      onDecrease={noop}
      onIncrease={noop}
      onQuantityChange={noop}
      onUnitPriceChange={noop}
      onRemove={noop}
      onAddManual={noop}
      onAddPhotoMaterialRecognition={noop}
      onOpenPhotoForEstimateItem={noop}
      onAddCustom={noop}
      onRestoreLastRemoved={noop}
      onOpenCatalog={noop}
      onOpenParamEditor={noop}
      onSaveParamEdit={noop}
      onCancelParamEdit={noop}
      onApplyParamPatch={noop}
      onApplyParamBatch={noop}
      onOpenPdf={noop}
      onOpenDraft={noop}
      onToggleHistorySnapshot={noop}
      onEditHistoryDraft={noop}
      onSendHistoryToMarket={noop}
      onOpenHistory={noop}
      onLoadMoreHistory={noop}
      onCloseCatalogPicker={noop}
      onSelectCatalogItem={noop}
      onSelectRoadScope={noop}
    />
  );
}

describe("mounted request launch prompt", () => {
  it("shows the compiled Russian work and keeps the unmodified original request available separately", () => {
    const current = bundle("LOGICROOF 100 m2\nмои условия", "draft-roof");
    current.draft.selectedWorkTitleRu = "Ошибочно сохранённое старое название — 90 м²";
    current.structuredEstimatePayload = {
      workTitle: "Поле ПВХ-кровли1.2мм по готовому утеплителю и бетонному основанию: крепление и сварка — 100 м²",
    } as NonNullable<ConsumerRepairDraftBundle["structuredEstimatePayload"]>;
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(renderContent(current)); });
    expect(renderer.root.findByProps({ testID: "request-estimate-current-launch-prompt-text" }).props.children)
      .toBe("Укладка и крепление ПВХ-мембраны толщиной 1,2 мм — 100 м²");
    expect(renderer.root.findAllByProps({ testID: "request-estimate-original-request-text" })).toHaveLength(0);
    act(() => renderer.root.findByProps({ testID: "request-estimate-original-request-toggle" }).props.onPress());
    expect(renderer.root.findByProps({ testID: "request-estimate-original-request-text" }).props.children)
      .toBe("LOGICROOF 100 m2\nмои условия");
    current.structuredEstimatePayload.workTitle = "Укладка и крепление ПВХ-мембраны толщиной 1,2 мм — 101 м²";
    act(() => renderer.update(renderContent(current)));
    expect(renderer.root.findByProps({ testID: "request-estimate-current-launch-prompt-text" }).props.children)
      .toBe("Укладка и крепление ПВХ-мембраны толщиной 1,2 мм — 101 м²");
    expect(current.draft.problemText).toBe("LOGICROOF 100 m2\nмои условия");
    act(() => renderer.unmount());
  });
  it.each([false, true])("keeps an existing status below the mounted draft before and after the first queued edit (priority %s)", prioritized => {
    const current = bundle("TEST prompt", "draft-status");
    if (prioritized) current.structuredEstimatePayload = {} as never;
    const content = (count: number) => React.cloneElement(renderContent(current), {
      statusMessage: count ? "Изменение ещё не сохранено" : "Смета рассчитана",
      pendingCanonicalRowEditCount: count,
    });
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(content(0)); });
    const panel = renderer.root.findByType(ConsumerRepairDraftPanel);
    const assertOrder = () => {
      const nodes = renderer.root.findAll(node => node.type === ConsumerRepairDraftPanel || node.props.testID === "consumer-repair-status");
      expect(nodes.findIndex(node => node.type === ConsumerRepairDraftPanel))
        .toBeLessThan(nodes.findIndex(node => node.props.testID === "consumer-repair-status"));
    };
    assertOrder();
    act(() => { renderer.update(content(1)); });
    expect(renderer.root.findByType(ConsumerRepairDraftPanel)).toBe(panel);
    assertOrder();
    expect(renderer.root.findByProps({ testID: "consumer-repair-status" }).props.children).toBe("Изменение ещё не сохранено");
    act(() => renderer.unmount());
  });
  it("renders the exact prompt and reacts to a new launch bundle without remount", () => {
    const firstPrompt = "Электрика 180 м2 — launch A";
    const secondPrompt = "Кровля 220 м2 — launch B";
    let renderer!: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(renderContent(bundle(firstPrompt, "draft-a")));
    });
    expect(
      renderer.root.findByProps({
        testID: "request-estimate-current-launch-prompt-text",
      }).props.children,
    ).toBe(firstPrompt);

    act(() => {
      renderer.update(renderContent(bundle(secondPrompt, "draft-b")));
    });
    expect(
      renderer.root.findByProps({
        testID: "request-estimate-current-launch-prompt-text",
      }).props.children,
    ).toBe(secondPrompt);
  });
});
