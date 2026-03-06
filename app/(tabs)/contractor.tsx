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
import { generateActPdf } from "../../src/screens/contractor/contractorPdf";
import { normalizeRuText } from "../../src/lib/text/encoding";
import {
  fetchRequestScopeRows,
  getProgressIdsForSubcontract,
  loadConsumedByCode,
  loadIssuedByCode,
  loadWorkLogRows,
} from "../../src/screens/contractor/contractor.data";
import {
  buildActBuilderMaterialItems,
  buildActBuilderWorkItems,
  resolveActBuilderRowsScope,
} from "../../src/screens/contractor/contractor.actBuilder";
import {
  buildSelectedActBuilderPayload,
  collectActBuilderWarnings,
} from "../../src/screens/contractor/contractor.submitHelpers";
import { persistActBuilderSubmission } from "../../src/screens/contractor/contractor.actSubmitService";
import {
  buildWorkProgressMaterialsPayload,
  buildWorkProgressNote,
  persistWorkProgressSubmission,
} from "../../src/screens/contractor/contractor.progressService";
import {
  loadIssuedTodayData,
} from "../../src/screens/contractor/contractor.workModalService";
import {
  generateHistoryPdfForLog,
  generateSummaryPdfForWork,
} from "../../src/screens/contractor/contractor.pdfService";
import {
  resolveContractorJobIdForRow,
  resolveRequestIdForRow,
} from "../../src/screens/contractor/contractor.resolvers";
import { mapCatalogSearchToWorkMaterials } from "../../src/screens/contractor/contractor.search";
import {
  attachSubcontractAndObject,
  buildSubcontractLookups,
  buildSyntheticSubcontractRows,
  filterVisibleRows,
  selectScopedApprovedSubcontracts,
} from "../../src/screens/contractor/contractor.rows";
import {
  enrichWorksRows,
  mapWorksFactRows,
} from "../../src/screens/contractor/contractor.loadWorksService";
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
  debounce,
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

// DEV toggle: when true, show approved subcontracts even without strict org/phone match.
const DEV_SHOW_ALL_SUBCONTRACTS = __DEV__;

// ---- TYPES ----
type WorkRow = {
  progress_id: string;
  purchase_item_id?: string | null;
  work_code: string | null;
  work_name: string | null;
  object_name: string | null;
  contractor_org?: string | null;
  contractor_inn?: string | null;
  contractor_phone?: string | null;
  request_id?: string | null;
  request_status?: string | null;
  contractor_job_id?: string | null;
  uom_id: string | null;
  qty_planned: number;
  qty_done: number;
  qty_left: number;
  unit_price?: number | null;
  work_status: string;
  contractor_id: string | null;
  started_at?: string | null;
  finished_at?: string | null;
};

type UserProfile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  company: string | null;
  is_contractor: boolean;
};

type Contractor = {
  id: string;
  company_name: string | null;
  full_name: string | null;
  phone: string | null;
};
type SubcontractLite = {
  id: string;
  status?: string | null;
  object_name?: string | null;
  work_type?: string | null;
  qty_planned?: number | null;
  uom?: string | null;
  contractor_org?: string | null;
  contractor_inn?: string | null;
  created_at?: string | null;
};
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
  const [workSearchQuery, setWorkSearchQuery] = useState("");
  const [workSearchResults, setWorkSearchResults] = useState<WorkMaterialRow[]>(
    []
  );
  const workModalRowRef = useRef<WorkRow | null>(null);
  const workSearchActiveQuery = useRef<string>("");
  const modalTransitionActionRef = useRef<null | (() => void)>(null);
  const modalTransitionPendingDismissRef = useRef(0);
  const loadWorksSeqRef = useRef(0);
  const screenReloadInFlightRef = useRef<Promise<void> | null>(null);
  const workModalBootSeqRef = useRef(0);
  const issuedLoadSeqRef = useRef(0);
  const activeWorkModalProgressRef = useRef<string>("");
  const issuedPollInFlightRef = useRef(false);

  // ---- LOAD USER PROFILE ----
  const loadProfile = useCallback(async () => {
    if (!focusedRef.current) return;
    setLoadingProfile(true);
    const { data: auth } = await supabase.auth.getUser();

    if (!auth.user) {
      setProfile(null);
      setLoadingProfile(false);
      return;
    }

    const { data } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (data) {
      const nextProfile = {
        id: auth.user.id,
        full_name: normText(data.full_name) || null,
        phone: normText(data.phone) || null,
        company: normText(data.company) || null,
        is_contractor: data.is_contractor === true,
      };
      profileRef.current = nextProfile;
      setProfile(nextProfile);
    } else {
      profileRef.current = null;
      setProfile(null);
    }

    setLoadingProfile(false);
  }, []);

  // ---- Load contractor from current user profile ----
  const loadContractor = useCallback(async () => {
    if (!focusedRef.current) return;

    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) {
      contractorRef.current = null;
      setContractor(null);
      return;
    }

    const { data, error } = await supabase
      .from("contractors")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      console.error("[contractor] loadContractor error:", error.message);
    }

    if (data) {
      const nextContractor = {
        id: data.id,
        company_name: normText(data.company_name) || null,
        full_name: normText(data.full_name) || null,
        phone: normText(data.phone) || null,
      };
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
      const sqApprovedPromise = supabase
        .from("subcontracts" as any)
        .select("id, status, work_type, object_name, qty_planned, uom, contractor_org, contractor_inn, contractor_phone, created_at")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(500);

      const { data, error } = await supabase
        .from("v_works_fact")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        if (reqSeq !== loadWorksSeqRef.current) return;
        console.error("loadWorks error:", error);
        return;
      }
      if (reqSeq !== loadWorksSeqRef.current) return;
      const mappedBase = mapWorksFactRows(data as any[], normText) as WorkRow[];
      const enrichResult = await enrichWorksRows({
        supabaseClient: supabase,
        mappedBase: mappedBase as any,
        looksLikeUuid,
        pickWorkProgressRow,
      });
      const mappedByReq = enrichResult.rows as WorkRow[];
      const objByJob = enrichResult.objByJob;
      let subcontractsByOrg: SubcontractLite[] = [];

      const sqApproved = await sqApprovedPromise;
      if (sqApproved.error) {
        if (reqSeq !== loadWorksSeqRef.current) return;
        console.error("loadWorks subcontracts error:", sqApproved.error);
        return;
      }
      if (reqSeq !== loadWorksSeqRef.current) return;
      const myOrg = String(
        contractorRef.current?.company_name || profileRef.current?.company || ""
      )
        .trim()
        .toLowerCase();
      const myPhone = normPhone(
        String(contractorRef.current?.phone || profileRef.current?.phone || "").trim()
      );
      if (Array.isArray(sqApproved.data)) {
        const allApproved = sqApproved.data as SubcontractLite[];
        subcontractsByOrg = selectScopedApprovedSubcontracts({
          allApproved,
          myOrg,
          myPhone,
          normPhone,
          devShowAllSubcontracts: DEV_SHOW_ALL_SUBCONTRACTS,
        }) as SubcontractLite[];
        setSubcontractCards(subcontractsByOrg);
      }

      const lookupMaps = buildSubcontractLookups(subcontractsByOrg as any);
      const mappedWithObject = attachSubcontractAndObject({
        rows: mappedByReq as any,
        objByJob,
        lookups: lookupMaps,
      }) as WorkRow[];

      const allowedJobIds = new Set(
        subcontractsByOrg.map((s) => String(s.id || "").trim()).filter(Boolean)
      );
      const myContractorId = String(contractorRef.current?.id || "").trim();

      const filtered = filterVisibleRows({
        rows: mappedWithObject as any,
        allowedJobIds,
        myContractorId,
        myOrg,
        myPhone,
        devShowAllSubcontracts: DEV_SHOW_ALL_SUBCONTRACTS,
        isExcludedWorkCode,
        isApprovedForOtherStatus,
        normPhone,
      }) as WorkRow[];

      const existingJobIds = new Set(
        filtered.map((r) => String(r.contractor_job_id || "").trim()).filter(Boolean)
      );
      const syntheticRows = buildSyntheticSubcontractRows(
        subcontractsByOrg as any,
        existingJobIds
      ) as WorkRow[];

      if (reqSeq !== loadWorksSeqRef.current) return;
      setRows([...syntheticRows, ...filtered]);
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

      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) return;

      const { error } = await supabase
        .from("user_profiles")
        .update({ is_contractor: true })
        .eq("user_id", user.id);

      if (error) throw error;

      Alert.alert("Успешно", "Профиль подрядчика активирован.");
      await reloadContractorScreenData();
    } catch (e: any) {
      Alert.alert("Ошибка", e.message);
    } finally {
      setActivating(false);
    }
  };


  const loadWorkLogData = useCallback(async (progressId: string): Promise<WorkLogRow[]> => {
    try {
      return await loadWorkLogRows(supabase, progressId, normText);
    } catch (e) {
      console.warn("[loadWorkLog] error", e);
      return [];
    }
  }, []);

  const resolveRequestId = useCallback(
    async (row: WorkRow): Promise<string> => resolveRequestIdForRow(supabase, row),
    []
  );

  const resolveContractorJobId = useCallback(
    async (row: WorkRow): Promise<string> =>
      resolveContractorJobIdForRow(supabase, row, resolveRequestId as any),
    [resolveRequestId]
  );

  const loadIssuedTodayDataForRow = useCallback(async (row: WorkRow) => {
    try {
      return await loadIssuedTodayData({
        supabaseClient: supabase,
        row,
        allRows: rows as any,
        resolveContractorJobId: resolveContractorJobId as any,
        resolveRequestId: resolveRequestId as any,
        isRejectedOrCancelledRequestStatus,
        toLocalDateKey,
        normText,
      });
    } catch (e) {
      console.warn("[loadIssuedToday] error:", e);
      return {
        issuedItems: [] as IssuedItemRow[],
        linkedReqCards: [] as LinkedReqCard[],
        issuedHint: "",
      };
    }
  }, [
    resolveContractorJobId,
    resolveRequestId,
    rows,
  ]);

  const refreshIssuedTodayForCurrentRow = useCallback(
    async (row: WorkRow) => {
      const issueSeq = ++issuedLoadSeqRef.current;
      setLoadingIssued(true);
      const data = await loadIssuedTodayDataForRow(row);
      const isCurrent =
        issueSeq === issuedLoadSeqRef.current &&
        activeWorkModalProgressRef.current === String(row.progress_id || "").trim();
      if (!isCurrent) return;
      setIssuedItems(data.issuedItems as IssuedItemRow[]);
      setLinkedReqCards(data.linkedReqCards as LinkedReqCard[]);
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
      setWorkSearchQuery("");
      setWorkSearchResults([]);
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
            allRows: rows as any,
            fallbackOrg: contractor?.company_name || profile?.company || null,
            fallbackPhone: contractor?.phone || profile?.phone || null,
            resolveContractorJobId: resolveContractorJobId as any,
            resolveRequestId: resolveRequestId as any,
            loadWorkLogData,
            isRejectedOrCancelledRequestStatus,
            toLocalDateKey,
            normText,
          });

          const isCurrent =
            openSeq === workModalBootSeqRef.current &&
            activeWorkModalProgressRef.current === String(row.progress_id || "").trim();
          if (!isCurrent) return;

          setJobHeader(bundle.jobHeader as any);
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
      contractor,
      profile,
      resolveContractorJobId,
      resolveRequestId,
      loadWorkLogData,
    ]
  );

  const issuedPollingProgressId = useMemo(() => {
    if (!workModalVisible || !issuedOpen) return "";
    return String(workModalRow?.progress_id || "").trim();
  }, [workModalVisible, issuedOpen, workModalRow?.progress_id]);
  useEffect(() => {
    if (!looksLikeUuid(issuedPollingProgressId)) return;
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      if (issuedPollInFlightRef.current) return;
      const currentRow = workModalRowRef.current;
      if (!currentRow) return;
      if (String(currentRow.progress_id || "").trim() !== issuedPollingProgressId) return;
      issuedPollInFlightRef.current = true;
      try {
        await refreshIssuedTodayForCurrentRow(currentRow);
      } finally {
        issuedPollInFlightRef.current = false;
      }
    };
    const timer = setInterval(() => {
      void tick();
    }, 25000);
    return () => {
      cancelled = true;
      clearInterval(timer);
      issuedPollInFlightRef.current = false;
    };
  }, [issuedPollingProgressId, refreshIssuedTodayForCurrentRow]);

  const runMaterialSearch = useCallback(async (q: string) => {
    try {
      const { data, error } = await supabase.rpc("catalog_search" as any, {
        p_query: q,
        p_kind: "material",
      } as any);

      if (workSearchActiveQuery.current !== q) return;

      if (error) {
        console.warn("[material_search/catalog_search] error:", error.message);
        return;
      }
      if (!Array.isArray(data)) return;

      setWorkSearchResults(mapCatalogSearchToWorkMaterials(data as any[]));
    } catch (e: any) {
      if (workSearchActiveQuery.current !== q) return;
      console.warn(
        "[material_search/catalog_search] exception:",
        e?.message || e
      );
    }
  }, []);

  const debouncedMaterialSearch = useRef(
    debounce((q: string) => {
      runMaterialSearch(q);
    }, 300)
  ).current;

  const handleWorkSearchChange = useCallback(
    (text: string) => {
      setWorkSearchQuery(text);

      const q = text.trim();
      workSearchActiveQuery.current = q;

      if (q.length < 2) {
        setWorkSearchResults([]);
        return;
      }

      debouncedMaterialSearch(q);
    },
    [debouncedMaterialSearch]
  );

  const clearWorkSearchState = useCallback(() => {
    setWorkSearchVisible(false);
    setWorkSearchQuery("");
    setWorkSearchResults([]);
  }, []);

  const addWorkMaterial = useCallback((item: WorkMaterialRow) => {
    setWorkModalMaterials((prev) => {
      const idx = prev.findIndex(
        (m: any) => m.mat_code === (item as any).mat_code
      );
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = {
          ...copy[idx],
          name: (item as any).name,
          uom: (item as any).uom,
          available: (item as any).available,
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
  const runQueuedModalTransition = useCallback(() => {
    const run = modalTransitionActionRef.current;
    if (!run) return;
    modalTransitionActionRef.current = null;
    run();
  }, []);
  const onAnyModalDismissed = useCallback(() => {
    if (modalTransitionPendingDismissRef.current <= 0) return;
    modalTransitionPendingDismissRef.current -= 1;
    if (modalTransitionPendingDismissRef.current === 0) {
      runQueuedModalTransition();
    }
  }, [runQueuedModalTransition]);
  const queueAfterClosingModals = useCallback(
    (run: () => void, opts?: { closeWork?: boolean; closeActBuilder?: boolean }) => {
      modalTransitionActionRef.current = run;
      let pendingDismisses = 0;
      const shouldCloseWork = !!opts?.closeWork && workModalVisible;
      const shouldCloseAct = !!opts?.closeActBuilder && actBuilderVisible;
      if (shouldCloseWork) pendingDismisses += 1;
      if (shouldCloseAct) pendingDismisses += 1;
      modalTransitionPendingDismissRef.current = pendingDismisses;
      if (shouldCloseWork) closeWorkModal();
      if (shouldCloseAct) setActBuilderVisible(false);
      if (!pendingDismisses) runQueuedModalTransition();
    },
    [closeWorkModal, workModalVisible, actBuilderVisible, runQueuedModalTransition]
  );
  useEffect(() => {
    if (modalTransitionPendingDismissRef.current <= 0) return;
    if (workModalVisible || actBuilderVisible) return;
    modalTransitionPendingDismissRef.current = 0;
    runQueuedModalTransition();
  }, [workModalVisible, actBuilderVisible, runQueuedModalTransition]);

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
    let ensuredWorkMaterials = workModalMaterials;
    if ((!ensuredWorkMaterials || ensuredWorkMaterials.length === 0) && String(workModalRow?.work_code || "").trim()) {
      try {
        const jobId = await resolveContractorJobId(workModalRow as WorkRow);
        const reqIdForRow = await resolveRequestId(workModalRow as WorkRow);
        if (!looksLikeUuid(String(jobId || "")) && !looksLikeUuid(String(reqIdForRow || ""))) {
          setActBuilderLoadState("error");
          setActBuilderHint("Данные подряда не загружены");
          Alert.alert("Ошибка", "Данные подряда не готовы для загрузки материалов.");
          return;
        }
        const reqRows = await fetchRequestScopeRows(supabase, jobId, reqIdForRow);
        const hasAllowedRequests = reqRows.some((r) => !isRejectedOrCancelledRequestStatus(r.status));
        if (!hasAllowedRequests) {
          ensuredWorkMaterials = [];
          setWorkModalMaterials([]);
        } else {
          const workCode = String(workModalRow?.work_code || "").trim();
          const q1 = await supabase
            .from("work_default_materials" as any)
            .select("mat_code, uom")
            .eq("work_code", workCode)
            .limit(100);
          const defaults = !q1.error && Array.isArray(q1.data) ? (q1.data as any[]) : [];
          if (defaults.length) {
            const codes = defaults.map((d: any) => String(d.mat_code || "").trim()).filter(Boolean);
            const namesMap: Record<string, { name: string; uom: string | null }> = {};
            if (codes.length) {
              const ci = await supabase
                .from("catalog_items" as any)
                .select("rik_code, name_human_ru, name_human, uom_code")
                .in("rik_code", codes);
              if (!ci.error && Array.isArray(ci.data)) {
                for (const n of ci.data as any[]) {
                  const code = String(n.rik_code || "").trim();
                  if (!code) continue;
                  namesMap[code] = {
                    name: String(n.name_human_ru || n.name_human || code),
                    uom: n.uom_code == null ? null : String(n.uom_code),
                  };
                }
              }
            }
            ensuredWorkMaterials = defaults.map((d: any) => {
              const code = String(d.mat_code || "").trim();
              const meta = namesMap[code];
              return {
                mat_code: code,
                name: meta?.name || code || "Материал",
                uom: meta?.uom || String(d.uom || ""),
                available: 0,
                qty_fact: 0,
              } as WorkMaterialRow;
            });
            setWorkModalMaterials(ensuredWorkMaterials);
          }
        }
      } catch (e) {
        console.warn("[openActBuilder] default materials fallback failed:", e);
      }
    }
    const nextItems = buildActBuilderMaterialItems(issuedItems, ensuredWorkMaterials);
    const rowsForJob = resolveActBuilderRowsScope(rows, workModalRow as any);
    const nextWorks = buildActBuilderWorkItems(
      rowsForJob as any,
      (value) => toHumanWork(value as any),
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
    if (actBuilderLoadState !== "ready") {
      setActBuilderHint("Данные подряда не загружены");
      Alert.alert("Ошибка", "Данные подряда не загружены");
      return;
    }
    try {
      setActBuilderHint("");
      setActBuilderSaving(true);

      // 1. COLLECT PAYLOAD DIRECTLY FROM STATE (as per PROD-TZ)
      const { selectedWorks, selectedMaterials, invalidMaterial: invalidMat } =
        buildSelectedActBuilderPayload(actBuilderWorks, actBuilderItems);
      if (invalidMat) {
        Alert.alert("Некорректный материал", `Проверьте заполнение цены и количества: "${invalidMat.name}"`);
        return;
      }

      // 2. HARD VALIDATION
      if (selectedWorks.length === 0 && selectedMaterials.length === 0) {
        setActBuilderHint("Выберите хотя бы одну работу или один материал для продолжения.");
        Alert.alert("Пустой акт", "Выберите хотя бы одну работу или один материал.");
        return;
      }

      if (selectedMaterials.length > 0) {
        const jobId = await resolveContractorJobId(workModalRow);
        const reqIdForRow = await resolveRequestId(workModalRow);
        if (!looksLikeUuid(String(jobId || "")) && !looksLikeUuid(String(reqIdForRow || ""))) {
          setActBuilderHint("Данные подряда не загружены");
          Alert.alert("Ошибка", "Данные подряда не готовы для проверки материалов.");
          return;
        }
        const reqRows = await fetchRequestScopeRows(supabase, jobId, reqIdForRow);
        const requestIds = reqRows
          .filter((r) => !isRejectedOrCancelledRequestStatus(r.status))
          .map((r) => r.id)
          .filter(Boolean);
        if (!requestIds.length) {
          setActBuilderHint("Данные подряда не загружены");
          Alert.alert("Ошибка", "Не найдены заявки подряда для проверки материалов.");
          return;
        }
        const issuedByCode = await loadIssuedByCode(supabase, requestIds);
        const progressIdsForSubcontract = getProgressIdsForSubcontract(rows, jobId, workModalRow);
        const consumedByCode = await loadConsumedByCode(supabase, progressIdsForSubcontract, { positiveOnly: false });

        const exceeded = selectedMaterials.find((m) => {
          const code = String(m.mat_code || "").trim();
          const issued = Number(issuedByCode.get(code) || 0);
          const consumed = Number(consumedByCode.get(code) || 0);
          const availableNow = Math.max(0, issued - consumed);
          return Number(m.act_used_qty || 0) > availableNow;
        });
        if (exceeded) {
          const code = String(exceeded.mat_code || "").trim();
          const issued = Number(issuedByCode.get(code) || 0);
          const consumed = Number(consumedByCode.get(code) || 0);
          const availableNow = Math.max(0, issued - consumed);
          setActBuilderHint(`Превышено доступное количество по материалу "${exceeded.name}". Доступно: ${availableNow}.`);
          Alert.alert(
            "Недостаточно материалов",
            `Материал "${exceeded.name}": доступно ${availableNow}, а в акте указано ${Number(exceeded.act_used_qty || 0)}.`
          );
          return;
        }
      }

      // Soft warnings for missing optional values (do not block generation).
      const warnings = collectActBuilderWarnings(selectedWorks, selectedMaterials);
      if (warnings.length > 0) {
        const uniq = Array.from(new Set(warnings));
        const preview = uniq.slice(0, 6).join("\n• ");
        const tail = uniq.length > 6 ? `\n• ...и еще ${uniq.length - 6}` : "";
        const shortHint = `Есть незаполненные поля (${uniq.length}). Проверьте предупреждения перед отправкой.`;
        setActBuilderHint(shortHint);
        Alert.alert(
          "Предупреждения",
          `Есть незаполненные поля:\n• ${preview}${tail}`
        );
      }

      // Validation for data loss (UI shows selected > 0 but payload is empty)
      if (actBuilderSelectedMatCount > 0 && selectedMaterials.length === 0) {
        console.error("CRITICAL: UI shows selected materials but payload is empty!", {
          actBuilderSelectedMatCount,
          actBuilderItemsCount: actBuilderItems.length
        });
        setActBuilderHint("Ошибка в данных: в UI есть выбранные материалы, но payload пуст.");
        Alert.alert("Критическая ошибка", "Потеряны выбранные материалы в payload. Повторите действие.");
        return;
      }

      const resolvedObj = pickFirstNonEmpty(workModalRow?.object_name, jobHeader?.object_name) || "";
      if (!String(resolvedObj || "").trim()) {
        setActBuilderHint("Недостаточно данных: не найден объект работ.");
        Alert.alert("Нет объекта", "Не удалось определить объект для формирования акта.");
        return;
      }

      // Log payload for debugging (as requested)
      // console.log("[submitActBuilder] FINAL PAYLOAD:", {
      //   object: resolvedObj,
      //   works: selectedWorks,
      //   materialsCount: selectedMaterials.length,
      //   materials: selectedMaterials
      // });

      // 4. GENERATE PDF IMMEDIATELY (Decoupled from DB as per PROD-TZ)
      await generateActPdf({
        mode: "normal",
        work: { ...workModalRow, object_name: resolvedObj },
        materials: selectedMaterials as any,
        selectedWorks: selectedWorks as any,
        contractorName: jobHeader?.contractor_org,
        contractorInn: jobHeader?.contractor_inn,
        contractorPhone: jobHeader?.contractor_phone,
        customerName: resolvedObj,
        customerInn: null,
        contractNumber: jobHeader?.contract_number,
        contractDate: jobHeader?.contract_date,
        zoneText: `${jobHeader?.zone || "—"} / ${jobHeader?.level_name || "—"}`,
        mainWorkName: jobHeader?.work_type || workModalRow.work_name || workModalRow.work_code,
        actNumber: workModalRow.progress_id?.slice?.(0, 8),
      });

      // 5. ATTEMPT SAVE TO DB (Non-blocking for PDF)
      const persistResult = await persistActBuilderSubmission({
        supabaseClient: supabase,
        workModalRow,
        selectedWorks,
        selectedMaterials,
        buildActMetaNote,
      });

      if (!persistResult.logSaved) {
        console.warn("[submitActBuilder] log save failed:", persistResult.logError);
        setWorkModalHint("PDF сформирован, но запись в журнал не сохранилась.");
        Alert.alert("Частичный успех", "Журнал не сохранен (ошибка БД), но PDF уже сформирован.");
        // We continue to close modal so user isn't stuck
      } else if (!persistResult.materialsSaved) {
        console.warn("[submitActBuilder] materials save failed:", persistResult.materialsError);
        Alert.alert("Ошибка материалов", "Материалы не сохранились в БД. PDF уже сформирован.");
      }

      setActBuilderVisible(false);
      setWorkModalHint("Акт успешно сформирован. Проверьте результат в истории и в PDF.");
      Alert.alert("Готово", "Акт успешно сформирован. Проверьте результат в истории.");
      await loadWorks();
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

      const resolvedObjectName = pickFirstNonEmpty(workModalRow?.object_name, jobHeader?.object_name) || "";
      if (!String(resolvedObjectName || "").trim()) {
        Alert.alert(
          "Нет объекта",
          "Не удалось определить объект для сохранения выполненных работ."
        );
        return;
      }

      const qtyNum = 1;
      const materialsPayload = buildWorkProgressMaterialsPayload(workModalMaterials as any[]);

      try {
        setWorkModalSaving(true);
        const note = buildWorkProgressNote(workModalLocation, workModalComment);
        const submitResult = await persistWorkProgressSubmission({
          supabaseClient: supabase,
          progressId: workModalRow.progress_id,
          workUom: workModalRow.uom_id || null,
          stageNote: workModalStage || null,
          note,
          qty: qtyNum,
          materialsPayload,
        });
        if (submitResult.ok === false) {
          const submitError = submitResult;
          if (submitError.stage === "log") {
            Alert.alert("Ошибка журнала", pickErr(submitError.error));
            return;
          }
          if (submitError.stage === "materials") {
            Alert.alert("Ошибка материалов", pickErr(submitError.error));
            return;
          }
        }

        Alert.alert("Готово", "Факт по работе сохранен.");
        setWorkModalVisible(false);
        await loadWorks();
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
      contractorCompany: contractor?.company_name,
      profileCompany: profile?.company,
      toHumanObject,
      toHumanWork,
      normalizeText: normText,
      debugCompanySource: true,
      debugPlatform: Platform.OS,
      allowGlobalFallback: false,
    });
  }, [subcontractCards, groupedWorksByJob, contractor, profile, toHumanObject, toHumanWork, rowsReady, subcontractsReady]);
  const { cards: unifiedSubcontractCards, rowByCardId: otherRowByCardId } = useMemo(() => {
    return buildUnifiedCardsFromJobsAndOthers({
      jobCards: jobCards as any,
      otherRows: otherRows as any,
      contractorCompany: contractor?.company_name,
      profileCompany: profile?.company,
      toHumanObject,
      toHumanWork,
      normalizeText: normText,
      debugCompanySource: true,
      debugPlatform: Platform.OS,
      allowGlobalFallback: false,
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
        otherRowByCardId: otherRowByCardId as any,
        groupedWorksByJob: groupedWorksByJob as any,
        subcontractCards: subcontractCards as any,
        rows: rows as any,
        looksLikeUuid,
        pickWorkProgressRow,
      });
      if (targetRow) {
        void openWorkInOneClick(targetRow as WorkRow);
        return;
      }
      Alert.alert(
        "Нет работ для открытия",
        "Сначала назначьте работу на подряд или дождитесь синхронизации."
      );
    },
    [otherRowByCardId, groupedWorksByJob, subcontractCards, rows, openWorkInOneClick]
  );

  const renderWorkSearchItem = useCallback(({ item }: any) => {
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

  const renderWorkStageItem = useCallback(({ item }: any) => (
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
        workModalRow={workModalRow as any}
        workModalLoading={workModalLoading}
        resolvedObjectName={resolvedObjectName}
        resolvedObjectInfo={textOrDash(resolvedObjectName)}
        jobHeader={jobHeader as any}
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
        renderWorkSearchItem={renderWorkSearchItem as any}
        onOpenSearch={() => setWorkSearchVisible(true)}
        closeSearch={clearWorkSearchState}
      />

      <WorkStagePickerModal
        visible={workOverlayModal === "stage"}
        onClose={closeWorkStagePickerModal}
        sheetHeaderTopPad={sheetHeaderTopPad}
        workStageOptions={workStageOptions}
        renderWorkStageItem={renderWorkStageItem as any}
      />
    </View>
  );
}
