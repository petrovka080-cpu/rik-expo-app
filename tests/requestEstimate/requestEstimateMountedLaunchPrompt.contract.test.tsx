import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import { ConsumerRepairRequestContent } from "../../src/features/consumerRepair/ConsumerRepairRequestChrome";
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
