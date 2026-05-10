import React, { useCallback, useMemo } from "react";
import { ActivityIndicator, Modal, Platform, Pressable, Text, View } from "react-native";
import { FlashList } from "@/src/ui/FlashList";
import { Ionicons } from "@expo/vector-icons";
import type { ReqItemRow, ForemanRequestSummary } from "../../lib/catalog_api";
import PeriodPickerSheet from "../../components/PeriodPickerSheet";
import CatalogModal, { type PickedRow as CatalogPickedRow } from "../../components/foreman/CatalogModal";
import CalcModal from "../../components/foreman/CalcModal";
import type { CalcModalRow } from "../../components/foreman/calcModal.model";
import WorkTypePicker from "../../components/foreman/WorkTypePicker";
import ForemanHistoryBar from "./ForemanHistoryBar";
import ForemanHistoryModal from "./ForemanHistoryModal";
import ForemanSubcontractHistoryModal from "./ForemanSubcontractHistoryModal";
import { s } from "./foreman.styles";
import { UI } from "./foreman.ui";
import { fmtAmount, type Subcontract } from "../subcontracts/subcontracts.shared";
import type { SubcontractSelectedWorkType } from "./foremanSubcontractUi.store";
import { DraftSheetBody, SubcontractDetailsModalBody } from "./ForemanSubcontractDraftSections";
import type { DictOption } from "./hooks/foreman.subcontractController.model";

export { DraftSheetBody, SubcontractDetailsModalBody } from "./ForemanSubcontractDraftSections";

const resolveCodeOrName = (arr: DictOption[], raw: string | null | undefined) => {
  const value = String(raw || "").trim();
  if (!value) return "";
  const byCode = arr.find((x) => String(x.code || "").trim() === value);
  if (byCode?.name) return String(byCode.name).trim();
  const byName = arr.find((x) => String(x.name || "").trim() === value);
  if (byName?.name) return String(byName.name).trim();
  return value;
};

export function ApprovedContractsList(props: {
  approvedContracts: Subcontract[];
  historyLoading: boolean;
  contentTopPad: number;
  onScroll: (event: unknown) => void;
  objOptions: DictOption[];
  sysOptions: DictOption[];
  selectedTemplateId?: string | null;
  onSelect: (item: Subcontract) => void;
}) {
  const {
    approvedContracts,
    historyLoading,
    contentTopPad,
    onScroll,
    objOptions,
    sysOptions,
    selectedTemplateId,
    onSelect,
  } = props;

  const renderApprovedContractItem = useCallback(({ item }: { item: Subcontract }) => {
    const objectLabel =
      resolveCodeOrName(objOptions || [], item.object_name) ||
      String(item.object_name || "").trim() ||
      "—";
    const workLabel =
      resolveCodeOrName(sysOptions || [], item.work_type) ||
      String(item.work_type || "").trim() ||
      "—";
    const isSelected = String(selectedTemplateId || "") === String(item.id || "");

    return (
      <Pressable
        onPress={() => onSelect(item)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingVertical: 12,
          paddingHorizontal: 10,
          borderRadius: 12,
          backgroundColor: isSelected ? "rgba(34,197,94,0.14)" : "rgba(255,255,255,0.04)",
          borderWidth: 1,
          borderColor: isSelected ? "rgba(34,197,94,0.28)" : "rgba(255,255,255,0.12)",
          marginBottom: 14,
          shadowColor: "#000",
          shadowOpacity: 0.16,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          elevation: 3,
        }}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: UI.sub, fontWeight: "700" }} numberOfLines={1}>
            {item.contractor_org || "—"} · {objectLabel}
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.65)", fontWeight: "700" }} numberOfLines={1}>
            {workLabel} · {fmtAmount(item.qty_planned)} {item.uom || ""}
          </Text>
        </View>
        <Ionicons
          name={isSelected ? "checkmark-circle" : "chevron-forward"}
          size={18}
          color={isSelected ? "#22C55E" : UI.sub}
        />
      </Pressable>
    );
  }, [objOptions, onSelect, selectedTemplateId, sysOptions]);

  const listFooter = useMemo(() => (
    <View style={{ marginTop: 26, alignItems: "center" }}>
      <Ionicons name="hand-left-outline" size={48} color={UI.sub} />
      <Text style={{ color: UI.sub, fontSize: 16, textAlign: "center", marginTop: 12 }}>
        Нажми на карточку подряда выше.
      </Text>
    </View>
  ), []);

  const listEmpty = useMemo(() => (
    <View
      style={{
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.12)",
        backgroundColor: "rgba(17,26,42,0.55)",
        paddingHorizontal: 8,
        paddingVertical: 8,
        marginBottom: 20,
      }}
    >
      {historyLoading ? (
        <View style={{ paddingVertical: 14 }}>
          <ActivityIndicator color={UI.text} />
        </View>
      ) : (
        <Text style={{ color: UI.sub, fontWeight: "700", paddingVertical: 8 }}>
          Нет утвержденных подрядов
        </Text>
      )}
    </View>
  ), [historyLoading]);

  return (
    <FlashList
      data={historyLoading ? [] : approvedContracts}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderApprovedContractItem}
      overrideItemLayout={(layout: { size?: number }) => {
        layout.size = 86;
      }}
      ListEmptyComponent={listEmpty}
      ListFooterComponent={listFooter}
      contentContainerStyle={{ paddingTop: contentTopPad, paddingHorizontal: 16, paddingBottom: 120 }}
      onScroll={onScroll}
      scrollEventThrottle={16}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      removeClippedSubviews={Platform.OS === "android"}
    />
  );
}

type StatusInfo = { label: string; bg: string; fg: string };

export function ForemanSubcontractMainSections(props: {
  approvedContracts: Subcontract[];
  approvedContractsLoading: boolean;
  contentTopPad: number;
  onScroll: (event: unknown) => void;
  objOptions: DictOption[];
  sysOptions: DictOption[];
  selectedTemplateId?: string | null;
  onSelectApprovedContract: (item: Subcontract) => void;
  busy: boolean;
  onOpenRequestHistory: () => void;
  onOpenSubcontractHistory: () => void;
  ui: typeof UI;
  styles: typeof s;
}) {
  return (
    <>
      <ApprovedContractsList
        approvedContracts={props.approvedContracts}
        historyLoading={props.approvedContractsLoading}
        contentTopPad={props.contentTopPad}
        onScroll={props.onScroll}
        objOptions={props.objOptions}
        sysOptions={props.sysOptions}
        selectedTemplateId={props.selectedTemplateId}
        onSelect={props.onSelectApprovedContract}
      />

      <ForemanHistoryBar
        busy={props.busy}
        onOpenRequestHistory={props.onOpenRequestHistory}
        onOpenSubcontractHistory={props.onOpenSubcontractHistory}
        ui={props.ui}
        styles={props.styles}
      />
    </>
  );
}

export function ForemanSubcontractModalStack(props: {
  subcontractDetailsVisible: boolean;
  onCloseSubcontractFlow: () => void;
  modalHeaderTopPad: number;
  templateContract: Subcontract | null;
  templateObjectName: string;
  templateLevelName: string;
  templateSystemName: string;
  formLevelCode: string;
  formSystemCode: string;
  formZoneText: string;
  draftItemsCount: number;
  lvlOptions: DictOption[];
  sysOptions: DictOption[];
  onChangeLevelCode: (value: string) => void;
  onChangeSystemCode: (value: string) => void;
  onChangeZoneText: (value: string) => void;
  onOpenCatalog: () => void;
  onOpenCalc: () => void;
  onOpenDraft: () => void;
  displayNo: string;
  draftOpen: boolean;
  onCloseDraft: () => void;
  objectName: string;
  levelName: string;
  systemName: string;
  zoneName: string;
  contractorName: string;
  phoneName: string;
  volumeText: string;
  draftItems: ReqItemRow[];
  saving: boolean;
  sending: boolean;
  requestId: string;
  onRemoveDraftItem: (id: string) => void;
  onClearDraft: () => void;
  onPdf: () => void;
  onExcel: () => void;
  onSendToDirector: () => void;
  periodPickerVisible: boolean;
  onClosePeriodPicker: () => void;
  periodInitialFrom: string;
  periodInitialTo: string;
  onClearPeriod: () => void;
  onApplyPeriod: (from: string) => void;
  ui: typeof UI;
  catalogVisible: boolean;
  onCloseCatalog: () => void;
  rikQuickSearch: typeof import("../../lib/catalog_api").rikQuickSearch;
  onCommitCatalogToDraft: (rows: CatalogPickedRow[]) => void;
  onOpenDraftFromCatalog: () => void;
  workTypePickerVisible: boolean;
  onCloseWorkTypePicker: () => void;
  onSelectWorkType: (wt: SubcontractSelectedWorkType) => void;
  calcVisible: boolean;
  onCloseCalc: () => void;
  onBackFromCalc: () => void;
  selectedWorkType: SubcontractSelectedWorkType;
  onAddCalcToRequest: (rows: CalcModalRow[]) => void | Promise<void>;
  requestHistoryVisible: boolean;
  onCloseRequestHistory: () => void;
  requestHistoryLoading: boolean;
  requestHistoryRequests: ForemanRequestSummary[];
  resolveRequestStatusInfo: (status: string | null | undefined) => StatusInfo;
  onShowRequestDetails: (request: ForemanRequestSummary) => void;
  onSelectRequest: (request: ForemanRequestSummary) => void;
  onReopenRequest: (request: ForemanRequestSummary) => void | Promise<void>;
  onOpenRequestPdf: (reqId: string) => void;
  shortId: (id: string) => string;
  styles: typeof s;
  subcontractHistoryVisible: boolean;
  onCloseSubcontractHistory: () => void;
  subcontractHistoryLoading: boolean;
  subcontractHistory: Subcontract[];
}) {
  return (
    <>
      <Modal
        visible={props.subcontractDetailsVisible}
        transparent
        animationType="fade"
        onRequestClose={props.onCloseSubcontractFlow}
        statusBarTranslucent={Platform.OS === "android"}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }}>
          <SubcontractDetailsModalBody
            modalHeaderTopPad={props.modalHeaderTopPad}
            onClose={props.onCloseSubcontractFlow}
            templateContract={props.templateContract}
            templateObjectName={props.templateObjectName}
            templateLevelName={props.templateLevelName}
            templateSystemName={props.templateSystemName}
            formLevelCode={props.formLevelCode}
            formSystemCode={props.formSystemCode}
            formZoneText={props.formZoneText}
            draftItemsCount={props.draftItemsCount}
            lvlOptions={props.lvlOptions}
            sysOptions={props.sysOptions}
            onChangeLevelCode={props.onChangeLevelCode}
            onChangeSystemCode={props.onChangeSystemCode}
            onChangeZoneText={props.onChangeZoneText}
            onOpenCatalog={props.onOpenCatalog}
            onOpenCalc={props.onOpenCalc}
            onOpenDraft={props.onOpenDraft}
            displayNo={props.displayNo}
          />
        </View>
      </Modal>

      <Modal
        visible={props.draftOpen}
        transparent
        animationType="fade"
        onRequestClose={props.onCloseDraft}
        statusBarTranslucent={Platform.OS === "android"}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" }}>
          <DraftSheetBody
            displayNo={props.displayNo}
            onClose={props.onCloseDraft}
            objectName={props.objectName}
            templateObjectName={props.templateObjectName}
            levelName={props.levelName}
            templateLevelName={props.templateLevelName}
            systemName={props.systemName}
            templateSystemName={props.templateSystemName}
            zoneName={props.zoneName}
            contractorName={props.contractorName}
            phoneName={props.phoneName}
            volumeText={props.volumeText}
            draftItems={props.draftItems}
            saving={props.saving}
            sending={props.sending}
            requestId={props.requestId}
            onRemoveDraftItem={props.onRemoveDraftItem}
            onClearDraft={props.onClearDraft}
            onPdf={props.onPdf}
            onExcel={props.onExcel}
            onSendToDirector={props.onSendToDirector}
          />
        </View>
      </Modal>

      <PeriodPickerSheet
        visible={props.periodPickerVisible}
        onClose={props.onClosePeriodPicker}
        initialFrom={props.periodInitialFrom}
        initialTo={props.periodInitialTo}
        onClear={props.onClearPeriod}
        onApply={props.onApplyPeriod}
        ui={{
          cardBg: props.ui.cardBg,
          text: props.ui.text,
          sub: props.ui.sub,
          border: "rgba(255,255,255,0.14)",
          approve: props.ui.btnApprove,
          accentBlue: "#3B82F6",
        }}
      />

      <CatalogModal
        visible={props.catalogVisible}
        onClose={props.onCloseCatalog}
        rikQuickSearch={props.rikQuickSearch}
        onCommitToDraft={(rows) => props.onCommitCatalogToDraft(rows)}
        onOpenDraft={props.onOpenDraftFromCatalog}
        draftCount={props.draftItemsCount}
      />

      <WorkTypePicker
        visible={props.workTypePickerVisible}
        onClose={props.onCloseWorkTypePicker}
        onSelect={props.onSelectWorkType}
      />

      <CalcModal
        visible={props.calcVisible}
        onClose={props.onCloseCalc}
        onBack={props.onBackFromCalc}
        workType={props.selectedWorkType}
        onAddToRequest={props.onAddCalcToRequest}
      />

      <ForemanHistoryModal
        visible={props.requestHistoryVisible}
        onClose={props.onCloseRequestHistory}
        mode="list"
        selectedRequestId={null}
        onShowDetails={props.onShowRequestDetails}
        onBackToList={() => {}}
        onResetView={() => {}}
        loading={props.requestHistoryLoading}
        requests={props.requestHistoryRequests}
        resolveStatusInfo={props.resolveRequestStatusInfo}
        onSelect={props.onSelectRequest}
        onReopen={props.onReopenRequest}
        reopenBusyRequestId={null}
        onOpenPdf={props.onOpenRequestPdf}
        isPdfBusy={() => false}
        shortId={props.shortId}
        styles={props.styles}
      />

      <ForemanSubcontractHistoryModal
        visible={props.subcontractHistoryVisible}
        onClose={props.onCloseSubcontractHistory}
        loading={props.subcontractHistoryLoading}
        history={props.subcontractHistory}
        styles={props.styles}
        ui={props.ui}
      />
    </>
  );
}
