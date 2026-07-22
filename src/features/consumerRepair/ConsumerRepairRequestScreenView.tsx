import React from "react";
import type { TextInput } from "react-native";

import { AppScreen } from "../../components/layout/AppScreen";
import { AppScreenHeader } from "../../components/layout/AppScreenHeader";
import { AppScreenScroll } from "../../components/layout/AppScreenScroll";
import type {
  ConsumerRepairDraftRevisionParamBatchPatch,
} from "../../lib/consumerRequests";
import type { CatalogItemPickerItem } from "../../lib/catalog/catalog.facade";
import type { GlobalWorkSmartSearchSuggestion } from "../../lib/ai/globalEstimate";
import type { InlineWorkTemplateCandidate } from "../../lib/ai/matchWorkTemplateFromPrompt";
import type { UserParamPatchOperation } from "../../lib/estimate/validateUserParamPatch";
import type { ConsumerRepairQuantityChangeMeta } from "./consumerRepairQuantityEditTrace";
import {
  ConsumerRepairRequestContent,
  ConsumerRepairRequestHeaderMarketButton,
  ConsumerRepairRequestStickyActions,
  consumerRepairNeedsFreshApproval,
} from "./ConsumerRepairRequestChrome";
import type { buildConsumerRepairRequestRenderModel } from "./ConsumerRepairRequestScreenRenderModel";
import { consumerRepairRequestScreenStyles as styles } from "./ConsumerRepairRequestScreen.styles";
import type { ConsumerRepairRequestScreenState } from "./requestEstimateScreenActions";

type ConsumerRepairRequestRenderModel = ReturnType<typeof buildConsumerRepairRequestRenderModel>;

type ConsumerRepairRequestScreenViewProps = {
  state: ConsumerRepairRequestScreenState;
  renderModel: ConsumerRepairRequestRenderModel;
  problemInputRef: React.RefObject<TextInput | null>;
  onGoToMarket: () => void;
  onProblemTextChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onAddressTextChange: (value: string) => void;
  onPreferredTimeTextChange: (value: string) => void;
  onContactPhoneChange: (value: string) => void;
  onSelectWorkSuggestion: (suggestion: GlobalWorkSmartSearchSuggestion) => void;
  onSelectTemplateCandidate: (candidate: InlineWorkTemplateCandidate) => void;
  onMakePdf: () => void;
  onDecrease: (itemId: string) => void;
  onIncrease: (itemId: string) => void;
  onQuantityChange: (itemId: string, value: string, meta?: ConsumerRepairQuantityChangeMeta) => void;
  onUnitPriceChange: (itemId: string, value: string) => void;
  onRemove: (itemId: string) => void;
  onAddManual: () => void;
  onAddPhotoMaterialRecognition: () => void;
  onOpenPhotoForEstimateItem: (itemId: string) => void;
  onAddCustom: () => void;
  onRestoreLastRemoved: () => void;
  onOpenCatalog: (itemId: string) => void;
  onOpenParamEditor: (operation: UserParamPatchOperation, paramKey: string) => void;
  onSaveParamEdit: (rawValue: string) => void;
  onCancelParamEdit: () => void;
  onApplyParamPatch: (operation: UserParamPatchOperation, paramKey: string, rawValue: string) => void;
  onApplyParamBatch: (patches: ConsumerRepairDraftRevisionParamBatchPatch[]) => void;
  onOpenPdf: (requestDraftId?: string) => void;
  onOpenDraft: (requestDraftId: string) => void;
  onToggleHistorySnapshot: (requestDraftId: string) => void;
  onEditHistoryDraft: (requestDraftId: string) => void;
  onSendHistoryToMarket: (requestDraftId: string) => void;
  onOpenHistory: () => void;
  onLoadMoreHistory: () => void;
  onCloseCatalogPicker: () => void;
  onSelectCatalogItem: (item: CatalogItemPickerItem) => void;
  onCreateNew: () => void;
  onDeleteDraft: () => void;
  onApproveDraft: () => void;
  onPrepareDraft: () => void;
};

export function ConsumerRepairRequestScreenView({
  state,
  renderModel,
  problemInputRef,
  onGoToMarket,
  onProblemTextChange,
  onCityChange,
  onAddressTextChange,
  onPreferredTimeTextChange,
  onContactPhoneChange,
  onSelectWorkSuggestion,
  onSelectTemplateCandidate,
  onMakePdf,
  onDecrease,
  onIncrease,
  onQuantityChange,
  onUnitPriceChange,
  onRemove,
  onAddManual,
  onAddPhotoMaterialRecognition,
  onOpenPhotoForEstimateItem,
  onAddCustom,
  onRestoreLastRemoved,
  onOpenCatalog,
  onOpenParamEditor,
  onSaveParamEdit,
  onCancelParamEdit,
  onApplyParamPatch,
  onApplyParamBatch,
  onOpenPdf,
  onOpenDraft,
  onToggleHistorySnapshot,
  onEditHistoryDraft,
  onSendHistoryToMarket,
  onOpenHistory,
  onLoadMoreHistory,
  onCloseCatalogPicker,
  onSelectCatalogItem,
  onCreateNew,
  onDeleteDraft,
  onApproveDraft,
  onPrepareDraft,
}: ConsumerRepairRequestScreenViewProps) {
  return (
    <AppScreen hasStickyAction style={styles.screen}>
      <AppScreenHeader
        title="Смета"
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
          approvedHistoryPage={state.approvedHistoryPage}
          selectedHistoryId={state.selectedHistoryId}
          showPdfAction={false}
          marketplaceSendErrors={renderModel.marketplaceSendErrors}
          catalogPickerVisible={state.catalogPickerVisible}
          catalogPickerInitialQuery={state.catalogPickerInitialQuery}
          editingParam={state.editingParam}
          problemInputRef={problemInputRef}
          canRestoreLastRemoved={Boolean(state.lastRemovedItem)}
          onProblemTextChange={onProblemTextChange}
          onCityChange={onCityChange}
          onAddressTextChange={onAddressTextChange}
          onPreferredTimeTextChange={onPreferredTimeTextChange}
          onContactPhoneChange={onContactPhoneChange}
          onSelectWorkSuggestion={onSelectWorkSuggestion}
          onSelectTemplateCandidate={onSelectTemplateCandidate}
          onPrepareDraft={onPrepareDraft}
          onMakePdf={onMakePdf}
          onDecrease={onDecrease}
          onIncrease={onIncrease}
          onQuantityChange={onQuantityChange}
          onUnitPriceChange={onUnitPriceChange}
          onRemove={onRemove}
          onAddManual={onAddManual}
          onAddPhotoMaterialRecognition={onAddPhotoMaterialRecognition}
          onOpenPhotoForEstimateItem={onOpenPhotoForEstimateItem}
          onAddCustom={onAddCustom}
          onRestoreLastRemoved={onRestoreLastRemoved}
          onOpenCatalog={onOpenCatalog}
          onOpenParamEditor={onOpenParamEditor}
          onSaveParamEdit={onSaveParamEdit}
          onCancelParamEdit={onCancelParamEdit}
          onApplyParamPatch={onApplyParamPatch}
          onApplyParamBatch={onApplyParamBatch}
          onOpenPdf={onOpenPdf}
          onOpenDraft={onOpenDraft}
          onToggleHistorySnapshot={onToggleHistorySnapshot}
          onEditHistoryDraft={onEditHistoryDraft}
          onSendHistoryToMarket={onSendHistoryToMarket}
          onOpenHistory={onOpenHistory}
          onLoadMoreHistory={onLoadMoreHistory}
          onCloseCatalogPicker={onCloseCatalogPicker}
          onSelectCatalogItem={onSelectCatalogItem}
        />
      </AppScreenScroll>
      <ConsumerRepairRequestStickyActions
        approved={renderModel.approved}
        sent={renderModel.sent}
        hasBundle={Boolean(renderModel.bundle)}
        hasSnapshot={Boolean(renderModel.bundle?.editableEstimateSnapshot)}
        needsFreshApproval={consumerRepairNeedsFreshApproval(renderModel.bundle)}
        onOpenPdf={() => onOpenPdf()}
        onMakePdf={onMakePdf}
        onCreateNew={onCreateNew}
        onDeleteDraft={onDeleteDraft}
        onApproveDraft={onApproveDraft}
        onPrepareDraft={onPrepareDraft}
      />
    </AppScreen>
  );
}
