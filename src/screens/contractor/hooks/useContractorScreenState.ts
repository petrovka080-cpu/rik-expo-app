import { useEffect, useReducer, useRef, useState } from "react";
import type { WorkMaterialRow } from "../../../components/WorkMaterialsEditor";
import type {
  ContractorSubcontractCard,
  ContractorWorkRow,
} from "../contractor.loadWorksService";
import { actBuilderReducer, initialActBuilderState } from "../contractor.actBuilderReducer";
import type {
  ContractorProfileCard,
  ContractorUserProfile,
} from "../contractor.profileService";
import type { IssuedItemRow, LinkedReqCard, WorkLogRow } from "../types";

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

export function useContractorScreenState() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [code, setCode] = useState("");
  const [rows, setRows] = useState<WorkRow[]>([]);
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

  const [workModalVisible, setWorkModalVisible] = useState(false);
  const [workModalRow, setWorkModalRow] = useState<WorkRow | null>(null);
  const [, setWorkModalStage] = useState("");
  const [, setWorkModalComment] = useState("");
  const [workModalMaterials, setWorkModalMaterials] = useState<WorkMaterialRow[]>([]);
  const [workModalSaving] = useState(false);
  const [, setWorkModalLocation] = useState("");
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
  const [issuedItems, setIssuedItems] = useState<IssuedItemRow[]>([]);
  const [loadingIssued, setLoadingIssued] = useState(false);
  const [issuedHint, setIssuedHint] = useState<string>("");
  const [linkedReqCards, setLinkedReqCards] = useState<LinkedReqCard[]>([]);
  const [workStageOptions, setWorkStageOptions] = useState<{ code: string; name: string }[]>([]);
  const [workSearchVisible, setWorkSearchVisible] = useState(false);

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
    setWorkModalStage,
    setWorkModalComment,
    workModalMaterials,
    setWorkModalMaterials,
    workModalSaving,
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
    issuedItems,
    setIssuedItems,
    loadingIssued,
    setLoadingIssued,
    issuedHint,
    setIssuedHint,
    linkedReqCards,
    setLinkedReqCards,
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

