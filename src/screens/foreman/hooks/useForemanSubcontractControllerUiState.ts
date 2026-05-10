import { useMemo, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ReqItemRow } from "../../../lib/catalog_api";
import type { Subcontract } from "../../subcontracts/subcontracts.shared";
import { useForemanSubcontractUiStore } from "../foremanSubcontractUi.store";
import {
  EMPTY_FORM,
  buildDraftScopeKey,
  deriveSubcontractControllerModel,
  type DictOption,
  type FormState,
} from "./foreman.subcontractController.model";
import { useForemanHistory } from "./useForemanHistory";

type ForemanSubcontractControllerUiStateParams = {
  dicts: {
    objOptions: DictOption[];
    lvlOptions: DictOption[];
    sysOptions: DictOption[];
  };
};

export function useForemanSubcontractControllerUiState({
  dicts,
}: ForemanSubcontractControllerUiStateParams) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const modalHeaderTopPad = Platform.OS === "web" ? 16 : insets.top + 10;
  const {
    historyRequests,
    historyLoading: requestHistoryLoading,
    historyVisible: requestHistoryVisible,
    fetchHistory: fetchRequestHistory,
    closeHistory: closeRequestHistory,
  } = useForemanHistory();
  const [userId, setUserId] = useState("");
  const [foremanName, setForemanName] = useState("");

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [displayNo, setDisplayNo] = useState("");

  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState<Subcontract[]>([]);

  const historyOpen = useForemanSubcontractUiStore((state) => state.historyOpen);
  const setHistoryOpen = useForemanSubcontractUiStore((state) => state.setHistoryOpen);
  const subcontractFlowOpen = useForemanSubcontractUiStore((state) => state.subcontractFlowOpen);
  const setSubcontractFlowOpen = useForemanSubcontractUiStore((state) => state.setSubcontractFlowOpen);
  const subcontractFlowScreen = useForemanSubcontractUiStore((state) => state.subcontractFlowScreen);
  const setSubcontractFlowScreen = useForemanSubcontractUiStore((state) => state.setSubcontractFlowScreen);
  const selectedWorkType = useForemanSubcontractUiStore((state) => state.selectedWorkType);
  const setSelectedWorkType = useForemanSubcontractUiStore((state) => state.setSelectedWorkType);
  const [draftItems, setDraftItems] = useState<ReqItemRow[]>([]);
  const dateTarget = useForemanSubcontractUiStore((state) => state.dateTarget);
  const setDateTarget = useForemanSubcontractUiStore((state) => state.setDateTarget);
  const selectedTemplateId = useForemanSubcontractUiStore((state) => state.selectedTemplateId);
  const setSelectedTemplateId = useForemanSubcontractUiStore((state) => state.setSelectedTemplateId);
  const closeSubcontractFlowUi = useForemanSubcontractUiStore((state) => state.closeSubcontractFlow);
  const [requestId, setRequestId] = useState("");
  const draftItemsLoadSeqRef = useRef(0);

  const model = useMemo(
    () =>
      deriveSubcontractControllerModel({
        history,
        selectedTemplateId,
        dicts,
        form,
        subcontractFlowOpen,
        subcontractFlowScreen,
        foremanName,
      }),
    [history, selectedTemplateId, dicts, form, subcontractFlowOpen, subcontractFlowScreen, foremanName],
  );
  const draftScopeKey = useMemo(() => buildDraftScopeKey(form, selectedTemplateId), [form, selectedTemplateId]);

  return {
    router,
    modalHeaderTopPad,
    ...model,
    draftScopeKey,
    historyRequests,
    requestHistoryLoading,
    requestHistoryVisible,
    fetchRequestHistory,
    closeRequestHistory,
    userId,
    setUserId,
    foremanName,
    setForemanName,
    form,
    setForm,
    displayNo,
    setDisplayNo,
    saving,
    setSaving,
    sending,
    setSending,
    historyLoading,
    setHistoryLoading,
    history,
    setHistory,
    historyOpen,
    setHistoryOpen,
    subcontractFlowOpen,
    setSubcontractFlowOpen,
    subcontractFlowScreen,
    setSubcontractFlowScreen,
    selectedWorkType,
    setSelectedWorkType,
    draftItems,
    setDraftItems,
    dateTarget,
    setDateTarget,
    selectedTemplateId,
    setSelectedTemplateId,
    closeSubcontractFlowUi,
    requestId,
    setRequestId,
    draftItemsLoadSeqRef,
  };
}
