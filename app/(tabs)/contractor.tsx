// app/(tabs)/contractor.tsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import {
  View,
  FlatList,
  Pressable,
  ActivityIndicator,
  TextInput,
  Alert,
  Platform,
} from "react-native";
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../../src/lib/supabaseClient";
import {
  WorkMaterialRow,
} from "../../src/components/WorkMaterialsEditor";
import { useForemanDicts } from "../../src/screens/foreman/useForemanDicts";
import { normalizeRuText } from "../../src/lib/text/encoding";
import {
  buildActBuilderMaterialItems,
  buildActBuilderWorkItems,
  resolveActBuilderRowsScope,
} from "../../src/screens/contractor/contractor.actBuilder";
import { ensureActBuilderWorkMaterials } from "../../src/screens/contractor/contractor.actBuilderOpenService";
import {
  submitActBuilderFlow,
} from "../../src/screens/contractor/contractor.actBuilderSubmitFlow";
import {
  submitWorkProgressFlow,
} from "../../src/screens/contractor/contractor.workProgressSubmitFlow";
import {
  generateHistoryPdfForLog,
  generateSummaryPdfForWork,
} from "../../src/screens/contractor/contractor.pdfService";
import {
  createWorkModalDataController,
  type WorkModalControllerRow,
} from "../../src/screens/contractor/contractor.workModalController";
import { mapCatalogSearchToWorkMaterials } from "../../src/screens/contractor/contractor.search";
import {
  type ContractorSubcontractCard,
  type ContractorWorkRow,
  loadContractorWorksBundle,
} from "../../src/screens/contractor/contractor.loadWorksService";
import { useContractorModalFlow } from "../../src/screens/contractor/contractor.modalFlow";
import { useIssuedPolling } from "../../src/screens/contractor/contractor.issuedPolling";
import {
  activateCurrentUserAsContractor,
  loadCurrentContractorProfile,
  loadCurrentContractorUserProfile,
  type ContractorProfileCard,
  type ContractorUserProfile,
} from "../../src/screens/contractor/contractor.profileService";
import {
  buildUnifiedCardsFromJobsAndOthers,
  buildJobCards,
  groupWorksByJob,
} from "../../src/screens/contractor/contractor.viewModels";
import { resolveWorkRowFromUnifiedCard } from "../../src/screens/contractor/contractor.openCard";
import {
  isApprovedForOtherStatus,
  isRejectedOrCancelledRequestStatus,
} from "../../src/screens/contractor/contractor.status";
import {
  actBuilderReducer,
  initialActBuilderState,
} from "../../src/screens/contractor/contractor.actBuilderReducer";
import { bootstrapWorkModalData } from "../../src/screens/contractor/contractor.workModalBootstrap";
import {
  buildActMetaNote,
  inferUnitByWorkName,
  isActiveWork,
  isExcludedWorkCode,
  looksLikeUuid,
  normPhone,
  normText,
  parseActMeta,
  pickErr,
  pickFirstNonEmpty,
  pickWorkProgressRow,
  textOrDash,
  toLocalDateKey,
} from "../../src/screens/contractor/contractor.utils";
import { useContractorWorkSearchController } from "../../src/screens/contractor/contractor.workSearchController";
import type {
  IssuedItemRow,
  LinkedReqCard,
  WorkLogRow,
} from "../../src/screens/contractor/types";
import EstimateMaterialsModal from "../../src/screens/contractor/components/EstimateMaterialsModal";
import WorkStagePickerModal from "../../src/screens/contractor/components/WorkStagePickerModal";
import ContractDetailsModal from "../../src/screens/contractor/components/ContractDetailsModal";
import ActBuilderModal from "../../src/screens/contractor/components/ActBuilderModal";
import ContractorSubcontractsList from "../../src/screens/contractor/components/ContractorSubcontractsList";
import ContractorWorkModal from "../../src/screens/contractor/components/ContractorWorkModal";
import { styles } from "../../src/screens/contractor/contractor.styles";
import Text from "../../src/screens/contractor/components/NormalizedText";

// ---- TYPES ----
type WorkRow = ContractorWorkRow;

type UserProfile = ContractorUserProfile;
type Contractor = ContractorProfileCard;
type SubcontractLite = ContractorSubcontractCard;
type WorkOverlayModal = "none" | "contract" | "estimate" | "stage";
type ScreenLoadState = "init" | "loading" | "ready" | "error";

type ContractorJobHeader = {
  contractor_org: string | null;
  contractor_inn: string | null;
  contractor_rep: string | null;
  contractor_phone: string | null;
  contract_number: string | null;
  contract_date: string | null;
  object_name: string | null;
  work_type?: string | null;
  zone: string | null;
  level_name: string | null;
  qty_planned?: number | null;
  uom?: string | null;
  unit_price: number | null;
  total_price?: number | null;
  date_start: string | null;
  date_end: string | null;
};

const showErr = (e: any) =>
  Alert.alert(
    "Ошибка",
    String(e?.message || e?.error_description || e?.hint || e || "Неизвестная ошибка")
  );

// ---- MAIN SCREEN ----
export default function ContractorScreen() {
  const insets = useSafeAreaInsets();
  const modalHeaderTopPad = Platform.OS === "web" ? 16 : (insets.top + 10);
  const sheetHeaderTopPad = Platform.OS === "web" ? 12 : 12 + Math.min(insets.top, 20);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [code, setCode] = useState("");
  const [activating, setActivating] = useState(false);

  const [rows, setRows] = useState<WorkRow[]>([]);
  const [manualClaimedJobIds, setManualClaimedJobIds] = useState<string[]>([]);
  const [subcontractCards, setSubcontractCards] = useState<SubcontractLite[]>([]);
  const [loadingWorks, setLoadingWorks] = useState(false);
  const [rowsReady, setRowsReady] = useState(false);
  const [subcontractsReady, setSubcontractsReady] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  const focusedRef = useRef(false);
  const lastKickRef = useRef(0);
  const openingWorkRef = useRef(false);
  const profileRef = useRef<UserProfile | null>(null);
  const contractorRef = useRef<Contractor | null>(null);

  const { objOptions, lvlOptions, sysOptions } = useForemanDicts();

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    contractorRef.current = contractor;
  }, [contractor]);

  const objNameByCode = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of objOptions || []) m.set(String(o.code || "").trim(), normalizeRuText(String(o.name || "").trim()));
    return m;
  }, [objOptions]);
  const lvlNameByCode = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of lvlOptions || []) m.set(String(o.code || "").trim(), normalizeRuText(String(o.name || "").trim()));
    return m;
  }, [lvlOptions]);
  const sysNameByCode = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of sysOptions || []) m.set(String(o.code || "").trim(), normalizeRuText(String(o.name || "").trim()));
    return m;
  }, [sysOptions]);

  const toHumanObject = useCallback((raw: string | null | undefined): string => {
    const src = normalizeRuText(String(raw || "").trim());
    if (!src) return "—";
    const parts = src.split("/").map((p) => p.trim()).filter(Boolean);
    if (!parts.length) return src;
    const out = parts.map((p) => objNameByCode.get(p) || lvlNameByCode.get(p) || sysNameByCode.get(p) || p);
    return out.join(" / ");
  }, [objNameByCode, lvlNameByCode, sysNameByCode]);

  const toHumanWork = useCallback((raw: string | null | undefined): string => {
    const src = normalizeRuText(String(raw || "").trim());
    if (!src) return "—";
    return sysNameByCode.get(src) || src;
  }, [sysNameByCode]);

  // ===== Work modal state =====
  const [workModalVisible, setWorkModalVisible] = useState(false);
  const [workModalRow, setWorkModalRow] = useState<WorkRow | null>(null);
  const [workModalStage, setWorkModalStage] = useState("");
  const [workModalComment, setWorkModalComment] = useState("");
  const [workModalMaterials, setWorkModalMaterials] = useState<WorkMaterialRow[]>(
    []
  );
  const [workModalSaving, setWorkModalSaving] = useState(false);
  const [workModalLocation, setWorkModalLocation] = useState("");
  const [workModalReadOnly, setWorkModalReadOnly] = useState(false);
  const [workModalLoading, setWorkModalLoading] = useState(false);
  const [workLog, setWorkLog] = useState<WorkLogRow[]>([]);
  const [jobHeader, setJobHeader] = useState<ContractorJobHeader | null>(null);
  const [workOverlayModal, setWorkOverlayModal] = useState<WorkOverlayModal>("none");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [issuedOpen, setIssuedOpen] = useState(false);
  const [actBuilderVisible, setActBuilderVisible] = useState(false);
  const [actBuilderState, dispatchActBuilder] = useReducer(
    actBuilderReducer,
    initialActBuilderState
  );
  const [actBuilderSaving, setActBuilderSaving] = useState(false);
  const [actBuilderHint, setActBuilderHint] = useState("");
  const [actBuilderLoadState, setActBuilderLoadState] = useState<ScreenLoadState>("init");
  const [workModalHint, setWorkModalHint] = useState("");
  useEffect(() => {
    workModalRowRef.current = workModalRow;
  }, [workModalRow]);
  const actBuilderItems = actBuilderState.items;
  const actBuilderWorks = actBuilderState.works;
  const actBuilderExpandedWork = actBuilderState.expandedWorkId;
  const actBuilderExpandedMat = actBuilderState.expandedMatId;
  const handleActWorkToggleInclude = useCallback(
    (idx: number) => {
      dispatchActBuilder({ type: "TOGGLE_WORK_INCLUDE", payload: { index: idx } });
    },
    []
  );
  const handleActWorkQtyChange = useCallback(
    (idx: number, txt: string) => {
      const num = Number(String(txt).replace(",", "."));
      if (!Number.isFinite(num)) return;
      dispatchActBuilder({ type: "SET_WORK_QTY", payload: { index: idx, qty: num } });
    },
    []
  );
  const handleActWorkUnitChange = useCallback(
    (idx: number, txt: string) => {
      dispatchActBuilder({ type: "SET_WORK_UNIT", payload: { index: idx, unit: txt } });
    },
    []
  );
  const handleActWorkPriceChange = useCallback(
    (idx: number, txt: string) => {
      const num = Number(txt.replace(",", "."));
      dispatchActBuilder({
        type: "SET_WORK_PRICE",
        payload: { index: idx, price: Number.isFinite(num) ? num : null },
      });
    },
    []
  );
  const handleActMatToggleInclude = useCallback(
    (idx: number) => {
      dispatchActBuilder({ type: "TOGGLE_MAT_INCLUDE", payload: { index: idx } });
    },
    []
  );
  const handleActMatDecrement = useCallback(
    (idx: number) => {
      const current = actBuilderState.items[idx];
      if (!current) return;
      dispatchActBuilder({
        type: "SET_MAT_QTY",
        payload: { index: idx, qty: Math.max(0, Number(current.qty || 0) - 1) },
      });
    },
    [actBuilderState.items]
  );
  const handleActMatIncrement = useCallback(
    (idx: number) => {
      const current = actBuilderState.items[idx];
      if (!current) return;
      const newVal = Number(current.qty || 0) + 1;
      if (newVal > current.qtyMax) {
        Alert.alert("Лимит", `Нельзя указать больше доступного количества (${current.qtyMax}).`);
        return;
      }
      dispatchActBuilder({ type: "SET_MAT_QTY", payload: { index: idx, qty: newVal } });
    },
    [actBuilderState.items]
  );
  const handleActMatPriceChange = useCallback(
    (idx: number, txt: string) => {
      const num = Number(String(txt).replace(",", "."));
      dispatchActBuilder({
        type: "SET_MAT_PRICE",
        payload: { index: idx, price: Number.isFinite(num) ? num : null },
      });
    },
    []
  );
  const [issuedItems, setIssuedItems] = useState<IssuedItemRow[]>([]);
  const [loadingIssued, setLoadingIssued] = useState(false);
  const [issuedHint, setIssuedHint] = useState<string>("");
  const [linkedReqCards, setLinkedReqCards] = useState<LinkedReqCard[]>([]);
  const [workStageOptions, setWorkStageOptions] = useState<
    { code: string; name: string }[]
  >([]);
  const [workSearchVisible, setWorkSearchVisible] = useState(false);
  const {
    query: workSearchQuery,
    results: workSearchResults,
    onChange: handleWorkSearchChange,
    clear: clearSearchState,
  } = useContractorWorkSearchController({
    supabaseClient: supabase,
    mapCatalogSearchToWorkMaterials,
    delayMs: 300,
  });
  const clearWorkSearchState = useCallback(() => {
    setWorkSearchVisible(false);
    clearSearchState();
  }, [clearSearchState]);
  const workModalRowRef = useRef<WorkRow | null>(null);
  const loadWorksSeqRef = useRef(0);
  const screenReloadInFlightRef = useRef<Promise<void> | null>(null);
  const workModalBootSeqRef = useRef(0);
  const issuedLoadSeqRef = useRef(0);
  const activeWorkModalProgressRef = useRef<string>("");

  // ---- LOAD USER PROFILE ----
  const loadProfile = useCallback(async () => {
    if (!focusedRef.current) return;
    setLoadingProfile(true);
    try {
      const nextProfile = await loadCurrentContractorUserProfile({
        supabaseClient: supabase,
        normText,
      });
      if (nextProfile) {
        profileRef.current = nextProfile;
        setProfile(nextProfile);
      } else {
        profileRef.current = null;
        setProfile(null);
      }
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  // ---- Load contractor from current user profile ----
  const loadContractor = useCallback(async () => {
    if (!focusedRef.current) return;

    const nextContractor = await loadCurrentContractorProfile({
      supabaseClient: supabase,
      normText,
    });

    if (nextContractor) {
      contractorRef.current = nextContractor;
      setContractor(nextContractor);
    } else {
      contractorRef.current = null;
      setContractor(null);
    }
  }, []);

  // ---- LOAD WORKS ----
  const loadWorks = useCallback(async () => {
    if (!focusedRef.current) return;

    const reqSeq = ++loadWorksSeqRef.current;
    setLoadingWorks(true);
    setRowsReady(false);
    setSubcontractsReady(false);
    try {
      const isStaff = profileRef.current?.is_contractor === false;
      const myContractorId = String(contractorRef.current?.id || "").trim();
      const bundle = await loadContractorWorksBundle({
        supabaseClient: supabase,
        normText,
        looksLikeUuid,
        pickWorkProgressRow,
        myContractorId,
        isStaff,
        isExcludedWorkCode,
        isApprovedForOtherStatus,
      });
      if (reqSeq !== loadWorksSeqRef.current) return;
      setSubcontractCards(bundle.subcontractCards);

      if (__DEV__) {
        console.log("[contractor.loadWorks] debug-filter", {
          isStaff: bundle.debug.isStaff,
          subcontractsFound: bundle.debug.subcontractsFound,
          totalApproved: bundle.debug.totalApproved,
        });
      }
      setRows(bundle.rows);
      setRowsReady(true);
      setSubcontractsReady(true);
    } catch (e) {
      if (reqSeq !== loadWorksSeqRef.current) return;
      console.error("loadWorks exception:", e);
    } finally {
      if (reqSeq !== loadWorksSeqRef.current) return;
      setLoadingWorks(false);
    }
  }, []);

  const reloadContractorScreenData = useCallback(async () => {
    if (screenReloadInFlightRef.current) return screenReloadInFlightRef.current;
    let currentPromise: Promise<void> | null = null;
    currentPromise = (async () => {
      try {
        await Promise.all([loadProfile(), loadContractor()]);
        await loadWorks();
      } finally {
        if (screenReloadInFlightRef.current === currentPromise) {
          screenReloadInFlightRef.current = null;
        }
      }
    })();
    screenReloadInFlightRef.current = currentPromise;
    return currentPromise;
  }, [loadProfile, loadContractor, loadWorks]);

  // ---- ACTIVATE CODE ----
  const activateCode = async () => {
    if (!code.trim()) return;

    try {
      setActivating(true);
      await activateCurrentUserAsContractor({ supabaseClient: supabase });
      Alert.alert("Успешно", "Профиль подрядчика активирован.");
      await reloadContractorScreenData();
    } catch (e: any) {
      Alert.alert("Ошибка", e.message);
    } finally {
      setActivating(false);
    }
  };


  const workModalDataController = useMemo(
    () =>
      createWorkModalDataController({
        supabaseClient: supabase,
        rows: rows as WorkModalControllerRow[],
        normText,
        isRejectedOrCancelledRequestStatus,
        toLocalDateKey,
      }),
    [rows]
  );

  const loadWorkLogData = useCallback(
    async (progressId: string): Promise<WorkLogRow[]> =>
      workModalDataController.loadWorkLogData(progressId),
    [workModalDataController]
  );

  const resolveRequestId = useCallback(
    async (row: WorkRow): Promise<string> => workModalDataController.resolveRequestId(row),
    [workModalDataController]
  );

  const resolveContractorJobId = useCallback(
    async (row: WorkRow): Promise<string> => workModalDataController.resolveContractorJobId(row),
    [workModalDataController]
  );

  const loadIssuedTodayDataForRow = useCallback(
    async (row: WorkRow) => workModalDataController.loadIssuedTodayDataForRow(row),
    [workModalDataController]
  );

  const refreshIssuedTodayForCurrentRow = useCallback(
    async (row: WorkRow) => {
      const issueSeq = ++issuedLoadSeqRef.current;
      setLoadingIssued(true);
      const data = await loadIssuedTodayDataForRow(row);
      const isCurrent =
        issueSeq === issuedLoadSeqRef.current &&
        activeWorkModalProgressRef.current === String(row.progress_id || "").trim();
      if (!isCurrent) return;
      setIssuedItems(data.issuedItems);
      setLinkedReqCards(data.linkedReqCards);
      setIssuedHint(data.issuedHint || "");
      setLoadingIssued(false);
    },
    [loadIssuedTodayDataForRow]
  );

  const openWorkAddModal = useCallback(
    (row: WorkRow, readOnly: boolean = false) => {
      const openSeq = ++workModalBootSeqRef.current;
      activeWorkModalProgressRef.current = String(row.progress_id || "").trim();
      setWorkModalRow(row);
      setWorkModalStage("");
      setWorkModalComment("");
      setWorkModalLocation("");
      setWorkModalReadOnly(readOnly);
      setWorkSearchVisible(false);
      clearSearchState();
      setWorkModalHint("");
      setActBuilderHint("");
      setActBuilderLoadState("init");
      setWorkModalVisible(true);
      setWorkModalLoading(true);
      setLoadingIssued(true);
      setHistoryOpen(false);
      setIssuedOpen(false);
      setWorkOverlayModal("none");
      setJobHeader(null);
      setWorkLog([]);
      setWorkStageOptions([]);
      setWorkModalMaterials([]);
      setIssuedItems([]);
      setLinkedReqCards([]);
      setIssuedHint("");

      (async () => {
        try {
          const bundle = await bootstrapWorkModalData({
            supabaseClient: supabase,
            row,
            readOnly,
            allRows: rows,
            resolveContractorJobId,
            resolveRequestId,
            loadWorkLogData,
            isRejectedOrCancelledRequestStatus,
            toLocalDateKey,
            normText,
          });

          const isCurrent =
            openSeq === workModalBootSeqRef.current &&
            activeWorkModalProgressRef.current === String(row.progress_id || "").trim();
          if (!isCurrent) return;

          setJobHeader(bundle.jobHeader);
          if (String(bundle.objectNameOverride || "").trim()) {
            setWorkModalRow((prev) =>
              prev ? { ...prev, object_name: String(bundle.objectNameOverride) } : prev
            );
          }
          setWorkLog(bundle.workLog);
          setWorkStageOptions(bundle.workStageOptions);
          if (!readOnly) setWorkModalMaterials(bundle.initialMaterials as WorkMaterialRow[]);
          setIssuedItems(bundle.issuedData.issuedItems || []);
          setLinkedReqCards(bundle.issuedData.linkedReqCards || []);
          setIssuedHint(String(bundle.issuedData.issuedHint || ""));
          if (bundle.loadState !== "ready") {
            setWorkModalHint("Данные подряда не загружены полностью.");
          }
        } finally {
          const isCurrent =
            openSeq === workModalBootSeqRef.current &&
            activeWorkModalProgressRef.current === String(row.progress_id || "").trim();
          if (!isCurrent) return;
          setLoadingIssued(false);
          setWorkModalLoading(false);
        }
      })();
    },
    [
      rows,
      clearSearchState,
      resolveContractorJobId,
      resolveRequestId,
      loadWorkLogData,
    ]
  );

  const issuedPollingProgressId = useMemo(() => {
    if (!workModalVisible || !issuedOpen) return "";
    return String(workModalRow?.progress_id || "").trim();
  }, [workModalVisible, issuedOpen, workModalRow?.progress_id]);
  useIssuedPolling({
    progressId: issuedPollingProgressId,
    looksLikeUuid,
    getCurrentRow: () => workModalRowRef.current,
    getRowProgressId: (row) => String(row?.progress_id || "").trim(),
    onTick: async (row) => {
      await refreshIssuedTodayForCurrentRow(row);
    },
    intervalMs: 25000,
  });
  const addWorkMaterial = useCallback((item: WorkMaterialRow) => {
    setWorkModalMaterials((prev) => {
      const idx = prev.findIndex(
        (m) => m.mat_code === item.mat_code
      );
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = {
          ...copy[idx],
          name: item.name,
          uom: item.uom,
          available: item.available,
        };
        return copy;
      }
      return [...prev, item];
    });

    clearWorkSearchState();
  }, [clearWorkSearchState]);

  const closeWorkModal = useCallback(() => {
    workModalBootSeqRef.current += 1;
    issuedLoadSeqRef.current += 1;
    activeWorkModalProgressRef.current = "";
    clearWorkSearchState();
    setLinkedReqCards([]);
    setWorkOverlayModal("none");
    setActBuilderLoadState("init");
    setLoadingIssued(false);
    setWorkModalLoading(false);
    setWorkModalVisible(false);
  }, [clearWorkSearchState]);
  const openContractDetailsModal = useCallback(() => {
    setWorkOverlayModal("contract");
  }, []);
  const openEstimateMaterialsModal = useCallback(() => {
    setWorkOverlayModal("estimate");
  }, []);
  const closeWorkOverlayModal = useCallback(() => {
    setWorkOverlayModal("none");
  }, []);
  const closeContractDetailsModal = closeWorkOverlayModal;
  const closeEstimateMaterialsModal = closeWorkOverlayModal;
  const closeWorkStagePickerModal = closeWorkOverlayModal;
  const { onAnyModalDismissed, queueAfterClosingModals } = useContractorModalFlow({
    workModalVisible,
    actBuilderVisible,
    closeWorkModal,
    closeActBuilder: () => setActBuilderVisible(false),
  });

  const openActBuilder = useCallback(async () => {
    if (!workModalRow) {
      setActBuilderLoadState("error");
      setActBuilderHint("Данные подряда не загружены");
      Alert.alert("Ошибка", "Данные подряда не загружены");
      return;
    }
    if (workModalLoading || loadingIssued) {
      setActBuilderLoadState("loading");
      setActBuilderHint("Загрузка данных подряда...");
      Alert.alert("Загрузка", "Дождитесь загрузки данных подряда");
      return;
    }
    setActBuilderLoadState("loading");
    const ensured = await ensureActBuilderWorkMaterials({
      supabaseClient: supabase,
      row: workModalRow,
      currentMaterials: workModalMaterials,
      looksLikeUuid,
      resolveContractorJobId,
      resolveRequestId,
      isRejectedOrCancelledRequestStatus,
    });
    if (ensured.fatalError) {
      setActBuilderLoadState("error");
      setActBuilderHint("Данные подряда не загружены");
      Alert.alert("Ошибка", ensured.fatalError);
      return;
    }
    const ensuredWorkMaterials = ensured.materials || [];
    if (ensuredWorkMaterials !== workModalMaterials) {
      setWorkModalMaterials(ensuredWorkMaterials);
    }
    const nextItems = buildActBuilderMaterialItems(issuedItems, ensuredWorkMaterials);
    const rowsForJob = resolveActBuilderRowsScope(rows, workModalRow);
    const nextWorks = buildActBuilderWorkItems(
      rowsForJob,
      (value) => toHumanWork(value),
      inferUnitByWorkName,
      jobHeader
    );
    dispatchActBuilder({
      type: "SET_ALL",
      payload: { items: nextItems, works: nextWorks },
    });
    const resolvedObjectName = pickFirstNonEmpty(workModalRow?.object_name, jobHeader?.object_name) || "";
    const hasHeader = !!jobHeader;
    const hasObject = !!String(resolvedObjectName || "").trim();
    const hasWorks = nextWorks.length > 0;
    if (!hasHeader || !hasObject || !hasWorks) {
      setActBuilderLoadState("error");
      setActBuilderHint("Данные подряда не загружены");
      Alert.alert("Ошибка", "Данные подряда не загружены");
      return;
    }
    setActBuilderLoadState("ready");
    setActBuilderHint("");
    if (workModalVisible) {
      queueAfterClosingModals(
        () => {
          setActBuilderVisible(true);
        },
        { closeWork: true }
      );
      return;
    }
    setActBuilderVisible(true);
  }, [
    issuedItems,
    workModalMaterials,
    rows,
    workModalRow,
    toHumanWork,
    workModalVisible,
    queueAfterClosingModals,
    jobHeader,
    workModalLoading,
    loadingIssued,
    resolveContractorJobId,
    resolveRequestId,
  ]);

  const actBuilderSelectedMatCount = useMemo(
    () => actBuilderItems.filter((x) => x.include).length,
    [actBuilderItems]
  );
  const actBuilderSelectedWorkCount = useMemo(
    () => actBuilderWorks.filter((x) => x.include).length,
    [actBuilderWorks]
  );
  const actBuilderHasSelected = useMemo(
    () => actBuilderSelectedMatCount + actBuilderSelectedWorkCount > 0,
    [actBuilderSelectedMatCount, actBuilderSelectedWorkCount]
  );
  const actBuilderCanSubmit = useMemo(
    () => actBuilderLoadState === "ready" && actBuilderHasSelected,
    [actBuilderLoadState, actBuilderHasSelected]
  );
  const actBuilderDateText = useMemo(() => new Date().toLocaleDateString("ru-RU"), []);
  const actBuilderWorkSum = useMemo(
    () =>
      actBuilderWorks
        .filter((x) => x.include)
        .reduce((acc, x) => {
          const qty = Number(x.qty || 0);
          const price = Number(x.price || 0);
          if (!Number.isFinite(qty) || !Number.isFinite(price)) return acc;
          return acc + qty * price;
        }, 0),
    [actBuilderWorks]
  );
  const actBuilderMatSum = useMemo(
    () =>
      actBuilderItems
        .filter((x) => x.include)
        .reduce((acc, x) => {
          const qty = Number(x.qty || 0);
          const price = Number(x.price || 0);
          if (!Number.isFinite(qty) || !Number.isFinite(price)) return acc;
          return acc + qty * price;
        }, 0),
    [actBuilderItems]
  );

  const submitActBuilder = useCallback(async () => {
    if (!workModalRow) return;
    try {
      setActBuilderHint("");
      setActBuilderSaving(true);
      const result = await submitActBuilderFlow({
        supabaseClient: supabase,
        actBuilderLoadState,
        actBuilderWorks,
        actBuilderItems,
        actBuilderSelectedMatCount,
        workModalRow,
        jobHeader,
        rows,
        resolveContractorJobId,
        resolveRequestId,
        isRejectedOrCancelledRequestStatus,
        looksLikeUuid,
        pickFirstNonEmpty,
        buildActMetaNote,
        pickErr,
        notify: (title, message) => Alert.alert(title, message),
      });

      if (result.actBuilderHint) setActBuilderHint(result.actBuilderHint);
      if (result.workModalHint) setWorkModalHint(result.workModalHint);
      if (result.alert) Alert.alert(result.alert.title, result.alert.message);
      if (!result.ok) return;
      if (result.closeActBuilder) setActBuilderVisible(false);
      if (result.reloadWorks) await loadWorks();
    } catch (e) {
      setActBuilderHint(`Ошибка формирования акта: ${pickErr(e)}`);
      showErr(e);
    } finally {
      setActBuilderSaving(false);
    }
  }, [
    workModalRow,
    actBuilderLoadState,
    jobHeader,
    loadWorks,
    actBuilderItems,
    actBuilderWorks,
    actBuilderSelectedMatCount,
    resolveContractorJobId,
    resolveRequestId,
    rows,
  ]);

  const submitWorkProgress = useCallback(
    async () => {
      if (!workModalRow) return;
      try {
        setWorkModalSaving(true);
        const result = await submitWorkProgressFlow({
          supabaseClient: supabase,
          workModalRow,
          jobHeader,
          workModalMaterials,
          workModalLocation,
          workModalComment,
          workModalStage,
          pickFirstNonEmpty,
          pickErr,
        });

        if (result.alert) Alert.alert(result.alert.title, result.alert.message);
        if (!result.ok) return;
        if (result.closeWorkModal) setWorkModalVisible(false);
        if (result.reloadWorks) await loadWorks();
      } catch (e: any) {
        console.warn("[submitWorkProgress] exception:", e);
        showErr(e);
      } finally {
        setWorkModalSaving(false);
      }
    },
    [
      workModalRow,
      workModalStage,
      workModalComment,
      workModalMaterials,
      workModalLocation,
      jobHeader,
      loadWorks,
    ]
  );

  const claimedJobIds = useMemo(() => {
    if (!contractor) return new Set<string>();
    return new Set(
      rows
        .filter((r) => r.contractor_id === contractor.id)
        .map((r) => String(r.contractor_job_id || "").trim())
        .filter(Boolean)
        .concat(manualClaimedJobIds)
    );
  }, [rows, contractor, manualClaimedJobIds]);

  const availableRows = useMemo(() => {
    return rows.filter((r) => {
      const jobId = String(r.contractor_job_id || "").trim();
      if (jobId && claimedJobIds.has(jobId)) return false;
      if (r.contractor_id) return false;
      if (!isActiveWork(r)) return false;

      const code = (r.work_code || "").toUpperCase();
      if (code.startsWith("MAT-") || code.startsWith("KIT-")) return false;

      return true;
    });
  }, [rows, claimedJobIds]);

  const myRows = useMemo(() => {
    if (!contractor) return [];
    return rows.filter((r) => {
      if (r.contractor_id === contractor.id) return true;
      const jobId = String(r.contractor_job_id || "").trim();
      return !!jobId && claimedJobIds.has(jobId);
    });
  }, [rows, contractor, claimedJobIds]);
  const unifiedRows = useMemo(() => {
    const ownSet = new Set(myRows.map((r) => String(r.progress_id)));
    const availableOnly = availableRows.filter((r) => !ownSet.has(String(r.progress_id)));
    return [...myRows, ...availableOnly];
  }, [myRows, availableRows]);
  const openWorkInOneClick = useCallback(
    async (row: WorkRow) => {
      if (actingId || openingWorkRef.current) return;
      const rpcProgressId = pickWorkProgressRow(row);
      if (!looksLikeUuid(rpcProgressId)) {
        Alert.alert("Ошибка данных", "Для выбранной работы отсутствует корректный идентификатор progress_id.");
        return;
      }
      openingWorkRef.current = true;
      try {
        openWorkAddModal(row);
      } finally {
        openingWorkRef.current = false;
      }
    },
    [actingId, openWorkAddModal]
  );
  const groupedWorksByJob = useMemo(() => {
    return groupWorksByJob(rows);
  }, [rows]);
  const otherRows = useMemo(
    () => unifiedRows.filter((r) => !String(r.contractor_job_id || "").trim()),
    [unifiedRows]
  );
  const jobCards = useMemo(() => {
    if (!rowsReady || !subcontractsReady) return [];
    return buildJobCards({
      subcontractCards,
      groupedWorksByJob,
      toHumanObject,
      toHumanWork,
      normalizeText: normText,
      debugCompanySource: true,
      debugPlatform: Platform.OS,
    });
  }, [subcontractCards, groupedWorksByJob, contractor, profile, toHumanObject, toHumanWork, rowsReady, subcontractsReady]);
  const { cards: unifiedSubcontractCards, rowByCardId: otherRowByCardId } = useMemo(() => {
    return buildUnifiedCardsFromJobsAndOthers({
      jobCards,
      otherRows,
      toHumanObject,
      toHumanWork,
      normalizeText: normText,
      debugCompanySource: true,
      debugPlatform: Platform.OS,
    });
  }, [jobCards, otherRows, contractor, profile, toHumanObject, toHumanWork]);
  const resolvedObjectName = pickFirstNonEmpty(workModalRow?.object_name, jobHeader?.object_name) || "";
  const handleGenerateSummaryPdf = useCallback(async () => {
    if (!workModalRow) return;
    try {
      await generateSummaryPdfForWork({
        supabaseClient: supabase,
        workModalRow,
        jobHeader,
        pickFirstNonEmpty,
      });
    } catch (e) {
      console.warn("[PDF aggregated] error", e);
      showErr(e);
    }
  }, [workModalRow, jobHeader]);
  const handleGenerateHistoryPdf = useCallback(
    async (log: WorkLogRow) => {
      if (!workModalRow) return;
      try {
        await generateHistoryPdfForLog({
          supabaseClient: supabase,
          workModalRow,
          jobHeader,
          log,
          parseActMeta,
          pickFirstNonEmpty,
        });
      } catch (e) {
        showErr(e);
      }
    },
    [workModalRow, jobHeader]
  );
  const handleOpenUnifiedCard = useCallback(
    (id: string) => {
      const targetRow = resolveWorkRowFromUnifiedCard({
        id,
        otherRowByCardId,
        groupedWorksByJob,
        subcontractCards,
        rows,
        looksLikeUuid,
        pickWorkProgressRow,
      });
      if (targetRow) {
        void openWorkInOneClick(targetRow);
        return;
      }
      Alert.alert(
        "Нет работ для открытия",
        "Сначала назначьте работу на подряд или дождитесь синхронизации."
      );
    },
    [otherRowByCardId, groupedWorksByJob, subcontractCards, rows, openWorkInOneClick]
  );

  const renderWorkSearchItem = useCallback(({ item }: { item: WorkMaterialRow }) => {
    const hasStock = (item.available || 0) > 0;
    return (
      <Pressable
        onPress={() => addWorkMaterial(item as WorkMaterialRow)}
        style={styles.searchItemRow}
      >
        <View style={styles.flex1}>
          <Text style={styles.searchItemName} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.searchItemUom}>{item.uom || "—"}</Text>
        </View>
        <Text style={[styles.searchItemStockText, { color: hasStock ? "#166534" : "#6b7280" }]}>
          {hasStock ? `Доступно ${item.available}` : "Нет на складе"}
        </Text>
      </Pressable>
    );
  }, [addWorkMaterial]);

  const renderWorkStageItem = useCallback(({ item }: { item: { code: string; name: string } }) => (
    <Pressable
      onPress={() => {
        setWorkModalStage(item.name);
        setWorkOverlayModal("none");
      }}
      style={styles.stageItemRow}
    >
      <Text style={styles.stageItemName}>{item.name}</Text>
      <Text style={styles.stageItemCode}>
        {item.code}
      </Text>
    </Pressable>
  ), []);

  useFocusEffect(
    useCallback(() => {
      focusedRef.current = true;

      const now = Date.now();
      if (now - lastKickRef.current > 900) {
        lastKickRef.current = now;
        (async () => {
          await reloadContractorScreenData();
        })();
      }

      return () => {
        focusedRef.current = false;
      };
    }, [reloadContractorScreenData])
  );
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await reloadContractorScreenData();
    } finally {
      setRefreshing(false);
    }
  }, [reloadContractorScreenData]);


  if (loadingProfile && !profile) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Загрузка профиля...</Text>
      </View>
    );
  }

  // ---- User is not contractor: show activation input ----
  if (!profile?.is_contractor) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Подрядчик - вход</Text>

        <Text style={{ marginTop: 12, fontSize: 14 }}>
          Введите ваш код подключения, который выдали в управляющей системе:
        </Text>

        <TextInput
          placeholder="Например: A3F9-C8ZD"
          value={code}
          onChangeText={setCode}
          style={styles.input}
        />

        <Pressable
          onPress={activateCode}
          disabled={activating}
          style={styles.activateBtn}
        >
          <Text style={styles.activateText}>
            {activating ? "Активация..." : "Активировать"}
          </Text>
        </Pressable>
      </View>
    );
  }

  // ---- Contractor active: show works ----
  return (
    <View style={[styles.container, styles.homeContainer]}>
      <View pointerEvents="none" style={styles.homeGlow} />
      <View style={styles.homeHeader}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <Text style={[styles.headerTitle, styles.homeHeaderTitle]}>Подряды</Text>
        </View>
      </View>

      <ContractorSubcontractsList
        data={unifiedSubcontractCards}
        refreshing={refreshing}
        loadingWorks={loadingWorks || !rowsReady || !subcontractsReady}
        onRefresh={handleRefresh}
        onOpen={handleOpenUnifiedCard}
        styles={styles}
      />

      <ContractorWorkModal
        visible={workModalVisible}
        onClose={closeWorkModal}
        onDismiss={onAnyModalDismissed}
        modalHeaderTopPad={modalHeaderTopPad}
        workModalRow={workModalRow}
        workModalLoading={workModalLoading}
        resolvedObjectName={resolvedObjectName}
        resolvedObjectInfo={textOrDash(resolvedObjectName)}
        jobHeader={jobHeader}
        workModalSaving={workModalSaving}
        loadingIssued={loadingIssued}
        workModalHint={workModalHint}
        onOpenContract={openContractDetailsModal}
        onOpenActBuilder={openActBuilder}
        onOpenSummaryPdf={() => {
          void handleGenerateSummaryPdf();
        }}
        historyOpen={historyOpen}
        onToggleHistory={() => setHistoryOpen((v) => !v)}
        workLog={workLog}
        onOpenHistoryPdf={(log) => {
          void handleGenerateHistoryPdf(log);
        }}
        getVisibleNote={(note) => parseActMeta(note).visibleNote}
        issuedOpen={issuedOpen}
        onToggleIssued={() => setIssuedOpen((v) => !v)}
        linkedReqCards={linkedReqCards}
        issuedItems={issuedItems}
        issuedHint={issuedHint}
        onOpenEstimate={openEstimateMaterialsModal}
        styles={styles}
      />

      <ActBuilderModal
        visible={actBuilderVisible}
        onClose={() => setActBuilderVisible(false)}
        onDismiss={onAnyModalDismissed}
        modalHeaderTopPad={modalHeaderTopPad}
        jobHeader={jobHeader}
        resolvedObjectName={resolvedObjectName}
        actBuilderDateText={actBuilderDateText}
        selectedWorkCount={actBuilderSelectedWorkCount}
        selectedMatCount={actBuilderSelectedMatCount}
        actBuilderMatSum={actBuilderMatSum}
        actBuilderWorkSum={actBuilderWorkSum}
        works={actBuilderWorks}
        items={actBuilderItems}
        expandedWorkId={actBuilderExpandedWork}
        expandedMatId={actBuilderExpandedMat}
        onToggleExpandedWork={(id) =>
          dispatchActBuilder({ type: "TOGGLE_EXPANDED_WORK", payload: { id } })
        }
        onToggleExpandedMat={(id) =>
          dispatchActBuilder({ type: "TOGGLE_EXPANDED_MAT", payload: { id } })
        }
        onToggleIncludeWork={handleActWorkToggleInclude}
        onQtyChangeWork={handleActWorkQtyChange}
        onUnitChangeWork={handleActWorkUnitChange}
        onPriceChangeWork={handleActWorkPriceChange}
        onToggleIncludeMat={handleActMatToggleInclude}
        onDecrementMat={handleActMatDecrement}
        onIncrementMat={handleActMatIncrement}
        onPriceChangeMat={handleActMatPriceChange}
        saving={actBuilderSaving}
        hint={actBuilderHint}
        hasSelected={actBuilderHasSelected}
        canSubmit={actBuilderCanSubmit}
        onSubmit={submitActBuilder}
      />

      <ContractDetailsModal
        visible={workOverlayModal === "contract"}
        onClose={closeContractDetailsModal}
        jobHeader={jobHeader}
        workModalRow={workModalRow}
        resolvedObjectName={resolvedObjectName}
      />

      <EstimateMaterialsModal
        visible={workOverlayModal === "estimate"}
        onClose={closeEstimateMaterialsModal}
        sheetHeaderTopPad={sheetHeaderTopPad}
        workModalMaterials={workModalMaterials}
        setWorkModalMaterials={setWorkModalMaterials}
        workModalReadOnly={workModalReadOnly}
        workSearchVisible={workSearchVisible}
        workSearchQuery={workSearchQuery}
        handleWorkSearchChange={handleWorkSearchChange}
        workSearchResults={workSearchResults}
        renderWorkSearchItem={renderWorkSearchItem}
        onOpenSearch={() => setWorkSearchVisible(true)}
        closeSearch={clearWorkSearchState}
      />

      <WorkStagePickerModal
        visible={workOverlayModal === "stage"}
        onClose={closeWorkStagePickerModal}
        sheetHeaderTopPad={sheetHeaderTopPad}
        workStageOptions={workStageOptions}
        renderWorkStageItem={renderWorkStageItem}
      />
    </View>
  );
}
