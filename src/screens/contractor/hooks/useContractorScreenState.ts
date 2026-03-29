import { useEffect, useReducer, useRef, useState } from "react";
import type { WorkMaterialRow } from "../../../components/WorkMaterialsEditor";
import type {
  ContractorInboxRow,
  WarehouseIssuesPanelState,
} from "../../../lib/api/contractor.scope.service";
import type {
  ContractorSubcontractCard,
  ContractorWorkRow,
} from "../contractor.loadWorksService";
import type { ContractorScreenContract } from "../contractor.visibilityRecovery";
import { actBuilderReducer, initialActBuilderState } from "../contractor.actBuilderReducer";
import type {
  ContractorProfileCard,
  ContractorUserProfile,
} from "../contractor.profileService";
import type { WorkLogRow } from "../types";
import { useContractorUiStore } from "../contractorUi.store";

type WorkRow = ContractorWorkRow;
type UserProfile = ContractorUserProfile;
type Contractor = ContractorProfileCard;
type SubcontractLite = ContractorSubcontractCard;
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

export function useContractorScreenState() {
  const code = useContractorUiStore((state) => state.code);
  const setCode = useContractorUiStore((state) => state.setCode);
  const workModalVisible = useContractorUiStore((state) => state.workModalVisible);
  const setWorkModalVisible = useContractorUiStore((state) => state.setWorkModalVisible);
  const workModalReadOnly = useContractorUiStore((state) => state.workModalReadOnly);
  const setWorkModalReadOnly = useContractorUiStore((state) => state.setWorkModalReadOnly);
  const workModalLoading = useContractorUiStore((state) => state.workModalLoading);
  const setWorkModalLoading = useContractorUiStore((state) => state.setWorkModalLoading);
  const workOverlayModal = useContractorUiStore((state) => state.workOverlayModal);
  const setWorkOverlayModal = useContractorUiStore((state) => state.setWorkOverlayModal);
  const historyOpen = useContractorUiStore((state) => state.historyOpen);
  const setHistoryOpen = useContractorUiStore((state) => state.setHistoryOpen);
  const issuedOpen = useContractorUiStore((state) => state.issuedOpen);
  const setIssuedOpen = useContractorUiStore((state) => state.setIssuedOpen);
  const actBuilderVisible = useContractorUiStore((state) => state.actBuilderVisible);
  const setActBuilderVisible = useContractorUiStore((state) => state.setActBuilderVisible);
  const actBuilderHint = useContractorUiStore((state) => state.actBuilderHint);
  const setActBuilderHint = useContractorUiStore((state) => state.setActBuilderHint);
  const workModalHint = useContractorUiStore((state) => state.workModalHint);
  const setWorkModalHint = useContractorUiStore((state) => state.setWorkModalHint);
  const workSearchVisible = useContractorUiStore((state) => state.workSearchVisible);
  const setWorkSearchVisible = useContractorUiStore((state) => state.setWorkSearchVisible);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [rows, setRows] = useState<WorkRow[]>([]);
  const [inboxRows, setInboxRows] = useState<ContractorInboxRow[]>([]);
  const [screenContract, setScreenContract] = useState<ContractorScreenContract>({
    state: "empty",
    source: "none",
    message: "Нет назначенных подрядных работ.",
  });
  const [manualClaimedJobIds] = useState<string[]>([]);
  const [subcontractCards, setSubcontractCards] = useState<SubcontractLite[]>([]);
  const [loadingWorks, setLoadingWorks] = useState(false);
  const [rowsReady, setRowsReady] = useState(false);
  const [subcontractsReady, setSubcontractsReady] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const focusedRef = useRef(false);
  const lastKickRef = useRef(0);
  const profileRef = useRef<UserProfile | null>(null);
  const contractorRef = useRef<Contractor | null>(null);
  const workModalRowRef = useRef<WorkRow | null>(null);
  const workModalBootSeqRef = useRef(0);
  const issuedLoadSeqRef = useRef(0);
  const activeWorkModalProgressRef = useRef<string>("");

  const [workModalRow, setWorkModalRow] = useState<WorkRow | null>(null);
  const [workModalStage, setWorkModalStage] = useState("");
  const [workModalComment, setWorkModalComment] = useState("");
  const [workModalMaterials, setWorkModalMaterials] = useState<WorkMaterialRow[]>([]);
  const [workModalSaving, setWorkModalSaving] = useState(false);
  const [workModalLocation, setWorkModalLocation] = useState("");
  const [workLog, setWorkLog] = useState<WorkLogRow[]>([]);
  const [jobHeader, setJobHeader] = useState<ContractorJobHeader | null>(null);
  const [actBuilderState, dispatchActBuilder] = useReducer(
    actBuilderReducer,
    initialActBuilderState
  );
  const [actBuilderSaving, setActBuilderSaving] = useState(false);
  const [actBuilderLoadState, setActBuilderLoadState] = useState<ScreenLoadState>("init");
  const [warehouseIssuesState, setWarehouseIssuesState] = useState<WarehouseIssuesPanelState>({
    status: "idle",
  });
  const [workStageOptions, setWorkStageOptions] = useState<{ code: string; name: string }[]>([]);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    contractorRef.current = contractor;
  }, [contractor]);

  useEffect(() => {
    workModalRowRef.current = workModalRow;
  }, [workModalRow]);

  const actBuilderItems = actBuilderState.items;
  const actBuilderWorks = actBuilderState.works;
  const actBuilderExpandedWork = actBuilderState.expandedWorkId;
  const actBuilderExpandedMat = actBuilderState.expandedMatId;

  return {
    profile,
    setProfile,
    contractor,
    setContractor,
    loadingProfile,
    setLoadingProfile,
    code,
    setCode,
    rows,
    setRows,
    inboxRows,
    setInboxRows,
    screenContract,
    setScreenContract,
    manualClaimedJobIds,
    subcontractCards,
    setSubcontractCards,
    loadingWorks,
    setLoadingWorks,
    rowsReady,
    setRowsReady,
    subcontractsReady,
    setSubcontractsReady,
    refreshing,
    setRefreshing,
    focusedRef,
    lastKickRef,
    profileRef,
    contractorRef,
    workModalVisible,
    setWorkModalVisible,
    workModalRow,
    setWorkModalRow,
    workModalStage,
    setWorkModalStage,
    workModalComment,
    setWorkModalComment,
    workModalMaterials,
    setWorkModalMaterials,
    workModalSaving,
    setWorkModalSaving,
    workModalLocation,
    setWorkModalLocation,
    workModalReadOnly,
    setWorkModalReadOnly,
    workModalLoading,
    setWorkModalLoading,
    workLog,
    setWorkLog,
    jobHeader,
    setJobHeader,
    workOverlayModal,
    setWorkOverlayModal,
    historyOpen,
    setHistoryOpen,
    issuedOpen,
    setIssuedOpen,
    actBuilderVisible,
    setActBuilderVisible,
    actBuilderState,
    dispatchActBuilder,
    actBuilderSaving,
    setActBuilderSaving,
    actBuilderHint,
    setActBuilderHint,
    actBuilderLoadState,
    setActBuilderLoadState,
    workModalHint,
    setWorkModalHint,
    actBuilderItems,
    actBuilderWorks,
    actBuilderExpandedWork,
    actBuilderExpandedMat,
    warehouseIssuesState,
    setWarehouseIssuesState,
    workStageOptions,
    setWorkStageOptions,
    workSearchVisible,
    setWorkSearchVisible,
    workModalRowRef,
    workModalBootSeqRef,
    issuedLoadSeqRef,
    activeWorkModalProgressRef,
  };
}
