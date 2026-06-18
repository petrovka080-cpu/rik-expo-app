import React from "react";
import type { TextInput } from "react-native";

import { AppScreen } from "../../components/layout/AppScreen";
import { AppScreenHeader } from "../../components/layout/AppScreenHeader";
import { AppScreenScroll } from "../../components/layout/AppScreenScroll";
import type { CatalogItemPickerItem } from "../../lib/catalog/catalog.facade";
import type { GlobalWorkSmartSearchSuggestion } from "../../lib/ai/globalEstimate";
import {
  ConsumerRepairRequestContent,
  ConsumerRepairRequestHeaderMarketButton,
  ConsumerRepairRequestStickyActions,
} from "./ConsumerRepairRequestChrome";
import type { buildConsumerRepairRequestRenderModel } from "./ConsumerRepairRequestScreenRenderModel";
import { consumerRepairRequestScreenStyles as styles } from "./ConsumerRepairRequestScreen.styles";
import type {
  ConsumerRepairProjectExecutionAction,
  ConsumerRepairRequestScreenState,
} from "./requestEstimateScreenActions";

type ConsumerRepairRequestRenderModel = ReturnType<typeof buildConsumerRepairRequestRenderModel>;

type ConsumerRepairRequestScreenViewProps = {
  state: ConsumerRepairRequestScreenState;
  renderModel: ConsumerRepairRequestRenderModel;
  problemInputRef: React.RefObject<TextInput | null>;
  onGoToMarket: () => void;
  onAddMedia: (mediaKind: "photo" | "video" | "document") => void;
  onProblemTextChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onAddressTextChange: (value: string) => void;
  onPreferredTimeTextChange: (value: string) => void;
  onContactPhoneChange: (value: string) => void;
  onSelectWorkSuggestion: (suggestion: GlobalWorkSmartSearchSuggestion) => void;
  onMakePdf: () => void;
  onDecrease: (itemId: string) => void;
  onIncrease: (itemId: string) => void;
  onQuantityChange: (itemId: string, value: string) => void;
  onUnitPriceChange: (itemId: string, value: string) => void;
  onRemove: (itemId: string) => void;
  onAddManual: () => void;
  onAddCustom: () => void;
  onRestoreLastRemoved: () => void;
  onOpenCatalog: (itemId: string) => void;
  onProjectExecutionAction: (action: ConsumerRepairProjectExecutionAction) => void;
  onOpenPdf: (requestDraftId?: string) => void;
  onOpenDraft: (requestDraftId: string) => void;
  onToggleHistorySnapshot: (requestDraftId: string) => void;
  onEditHistoryDraft: (requestDraftId: string) => void;
  onDuplicateHistoryDraft: (requestDraftId: string) => void;
  onSendHistoryToMarket: (requestDraftId: string) => void;
  onCloseCatalogPicker: () => void;
  onSelectCatalogItem: (item: CatalogItemPickerItem) => void;
  onCreateNew: () => void;
  onSendToMarketplace: () => void;
  onDeleteDraft: () => void;
  onApproveDraft: () => void;
  onPrepareDraft: () => void;
};

export function ConsumerRepairRequestScreenView({
  state,
  renderModel,
  problemInputRef,
  onGoToMarket,
  onAddMedia,
  onProblemTextChange,
  onCityChange,
  onAddressTextChange,
  onPreferredTimeTextChange,
  onContactPhoneChange,
  onSelectWorkSuggestion,
  onMakePdf,
  onDecrease,
  onIncrease,
  onQuantityChange,
  onUnitPriceChange,
  onRemove,
  onAddManual,
  onAddCustom,
  onRestoreLastRemoved,
  onOpenCatalog,
  onProjectExecutionAction,
  onOpenPdf,
  onOpenDraft,
  onToggleHistorySnapshot,
  onEditHistoryDraft,
  onDuplicateHistoryDraft,
  onSendHistoryToMarket,
  onCloseCatalogPicker,
  onSelectCatalogItem,
  onCreateNew,
  onSendToMarketplace,
  onDeleteDraft,
  onApproveDraft,
  onPrepareDraft,
}: ConsumerRepairRequestScreenViewProps) {
  return (
    <AppScreen hasStickyAction style={styles.screen}>
      <AppScreenHeader
        title="Смета"
        subtitle="Ремонт дома"
        centerTitle
        right={<ConsumerRepairRequestHeaderMarketButton onPress={onGoToMarket} />}
      />
      <AppScreenScroll contentStyle={styles.content} testID="consumer-repair-screen">
        <ConsumerRepairRequestContent
          problemText={state.problemText}
          city={state.city}
          addressText={state.addressText}
          preferredTimeText={state.preferredTimeText}
          contactPhone={state.contactPhone}
          selectedWork={state.selectedWork}
          workSuggestions={renderModel.workSuggestions}
          bundle={renderModel.bundle}
          aiAnswerRu={state.aiAnswerRu}
          statusMessage={state.statusMessage}
          history={state.history}
          selectedHistoryId={state.selectedHistoryId}
          photoCount={renderModel.photoCount}
          videoCount={renderModel.videoCount}
          documentCount={renderModel.documentCount}
          showPdfAction={false}
          marketplaceSendErrors={renderModel.marketplaceSendErrors}
          catalogPickerVisible={state.catalogPickerVisible}
          catalogPickerInitialQuery={state.catalogPickerInitialQuery}
          problemInputRef={problemInputRef}
          canRestoreLastRemoved={Boolean(state.lastRemovedItem)}
          onAddPhoto={() => onAddMedia("photo")}
          onAddVideo={() => onAddMedia("video")}
          onAddDocument={() => onAddMedia("document")}
          onProblemTextChange={onProblemTextChange}
          onCityChange={onCityChange}
          onAddressTextChange={onAddressTextChange}
          onPreferredTimeTextChange={onPreferredTimeTextChange}
          onContactPhoneChange={onContactPhoneChange}
          onSelectWorkSuggestion={onSelectWorkSuggestion}
          onMakePdf={onMakePdf}
          onDecrease={onDecrease}
          onIncrease={onIncrease}
          onQuantityChange={onQuantityChange}
          onUnitPriceChange={onUnitPriceChange}
          onRemove={onRemove}
          onAddManual={onAddManual}
          onAddCustom={onAddCustom}
          onRestoreLastRemoved={onRestoreLastRemoved}
          onOpenCatalog={onOpenCatalog}
          onProjectExecutionAction={onProjectExecutionAction}
          onOpenPdf={onOpenPdf}
          onOpenDraft={onOpenDraft}
          onToggleHistorySnapshot={onToggleHistorySnapshot}
          onEditHistoryDraft={onEditHistoryDraft}
          onDuplicateHistoryDraft={onDuplicateHistoryDraft}
          onSendHistoryToMarket={onSendHistoryToMarket}
          onCloseCatalogPicker={onCloseCatalogPicker}
          onSelectCatalogItem={onSelectCatalogItem}
        />
      </AppScreenScroll>
      <ConsumerRepairRequestStickyActions
        approved={renderModel.approved}
        sent={renderModel.sent}
        hasBundle={Boolean(renderModel.bundle)}
        canSendToMarketplace={renderModel.canSendToMarketplace}
        onOpenPdf={() => onOpenPdf()}
        onMakePdf={onMakePdf}
        onCreateNew={onCreateNew}
        onSendToMarketplace={onSendToMarketplace}
        onDeleteDraft={onDeleteDraft}
        onApproveDraft={onApproveDraft}
        onPrepareDraft={onPrepareDraft}
      />
    </AppScreen>
  );
}
