import { useCallback, useRef } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import {
  loadCurrentContractorProfile,
  loadCurrentContractorUserProfile,
  type ContractorProfileCard,
  type ContractorUserProfile,
} from "../contractor.profileService";
import {
  loadContractorWorksBundle,
  type ContractorSubcontractCard,
  type ContractorWorkRow,
} from "../contractor.loadWorksService";
import {
  loadContractorInboxScope,
  type ContractorInboxRow,
} from "../../../lib/api/contractor.scope.service";
import { recordPlatformObservability } from "../../../lib/observability/platformObservability";
import { getPlatformNetworkSnapshot } from "../../../lib/offline/platformNetwork.service";
import { recordPlatformGuardSkip } from "../../../lib/observability/platformGuardDiscipline";

type Params = {
  supabaseClient: any;
  focusedRef: MutableRefObject<boolean>;
  profileRef: MutableRefObject<ContractorUserProfile | null>;
  contractorRef: MutableRefObject<ContractorProfileCard | null>;
  setLoadingProfile: Dispatch<SetStateAction<boolean>>;
  setProfile: Dispatch<SetStateAction<ContractorUserProfile | null>>;
  setContractor: Dispatch<SetStateAction<ContractorProfileCard | null>>;
  setLoadingWorks: Dispatch<SetStateAction<boolean>>;
  setRowsReady: Dispatch<SetStateAction<boolean>>;
  setSubcontractsReady: Dispatch<SetStateAction<boolean>>;
  setSubcontractCards: Dispatch<SetStateAction<ContractorSubcontractCard[]>>;
  setRows: Dispatch<SetStateAction<ContractorWorkRow[]>>;
  setInboxRows: Dispatch<SetStateAction<ContractorInboxRow[]>>;
  normText: (value: unknown) => string;
  looksLikeUuid: (value: unknown) => boolean;
  pickWorkProgressRow: (row: ContractorWorkRow) => string;
  isExcludedWorkCode: (code: unknown) => boolean;
  isApprovedForOtherStatus: (status: unknown) => boolean;
};

const loadEmptyInboxRows = (): ContractorInboxRow[] => [];

export function useContractorScreenData(params: Params) {
  const {
    supabaseClient,
    focusedRef,
    profileRef,
    contractorRef,
    setLoadingProfile,
    setProfile,
    setContractor,
    setLoadingWorks,
    setRowsReady,
    setSubcontractsReady,
    setSubcontractCards,
    setRows,
    setInboxRows,
    normText,
    looksLikeUuid,
    pickWorkProgressRow,
    isExcludedWorkCode,
    isApprovedForOtherStatus,
  } = params;

  const loadWorksSeqRef = useRef(0);
  const screenReloadInFlightRef = useRef<Promise<void> | null>(null);

  const loadProfile = useCallback(async () => {
    if (!focusedRef.current) return;
    setLoadingProfile(true);
    try {
      const nextProfile = await loadCurrentContractorUserProfile({
        supabaseClient,
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
  }, [focusedRef, setLoadingProfile, supabaseClient, normText, profileRef, setProfile]);

  const loadContractor = useCallback(async () => {
    if (!focusedRef.current) return;

    const nextContractor = await loadCurrentContractorProfile({
      supabaseClient,
      normText,
    });

    if (nextContractor) {
      contractorRef.current = nextContractor;
      setContractor(nextContractor);
    } else {
      contractorRef.current = null;
      setContractor(null);
    }
  }, [focusedRef, supabaseClient, normText, contractorRef, setContractor]);

  const loadWorks = useCallback(async () => {
    if (!focusedRef.current) return;

    const reqSeq = ++loadWorksSeqRef.current;
    setLoadingWorks(true);
    setRowsReady(false);
    setSubcontractsReady(false);
    try {
      const isStaff = profileRef.current?.is_contractor === false;
      const myContractorId = String(contractorRef.current?.id || "").trim();
      const [bundle, inboxScope] = await Promise.all([
        loadContractorWorksBundle({
          supabaseClient,
          normText,
          looksLikeUuid,
          pickWorkProgressRow,
          myContractorId,
          isStaff,
          isExcludedWorkCode,
          isApprovedForOtherStatus,
        }),
        loadContractorInboxScope({
          supabaseClient,
          myContractorId: myContractorId || null,
          isStaff,
        }),
      ]);
      if (reqSeq !== loadWorksSeqRef.current) return;

      setSubcontractCards(bundle.subcontractCards);
      setInboxRows(inboxScope.rows);
      if (__DEV__) {
        console.log("[contractor.loadWorks] debug-filter", {
          isStaff: bundle.debug.isStaff,
          subcontractsFound: bundle.debug.subcontractsFound,
          totalApproved: bundle.debug.totalApproved,
          canonicalReadyRows: inboxScope.meta.readyRows,
        });
      }
      setRows(bundle.rows);
      setRowsReady(true);
      setSubcontractsReady(true);
      recordPlatformObservability({
        screen: "contractor",
        surface: "works_list",
        category: "ui",
        event: "content_ready",
        result: "success",
        rowCount: bundle.rows.length,
        extra: {
          canonicalReadyRows: inboxScope.meta.readyRows,
          invalidMissingContractor: inboxScope.meta.invalidMissingContractor,
          invalidMaterialOnly: inboxScope.meta.invalidMaterialOnly,
          subcontractCards: bundle.subcontractCards.length,
          primaryOwner: bundle.sourceMeta.primaryOwner,
          fallbackUsed: bundle.sourceMeta.fallbackUsed,
          sourceKind: bundle.sourceMeta.sourceKind,
        },
      });
    } catch (error) {
      if (reqSeq !== loadWorksSeqRef.current) return;
      console.error("loadWorks exception:", error);
      setInboxRows(loadEmptyInboxRows());
    } finally {
      if (reqSeq !== loadWorksSeqRef.current) return;
      setLoadingWorks(false);
    }
  }, [
    focusedRef,
    setLoadingWorks,
    setRowsReady,
    setSubcontractsReady,
    profileRef,
    contractorRef,
    supabaseClient,
    normText,
    looksLikeUuid,
    pickWorkProgressRow,
    isExcludedWorkCode,
    isApprovedForOtherStatus,
    setSubcontractCards,
    setRows,
    setInboxRows,
  ]);

  const reloadContractorScreenData = useCallback(async (trigger: "focus" | "manual" | "activation" = "focus") => {
    if (!focusedRef.current) {
      recordPlatformGuardSkip("not_focused", {
        screen: "contractor",
        surface: "screen_reload",
        event: "reload_screen",
        trigger,
      });
      return;
    }

    if (screenReloadInFlightRef.current) {
      recordPlatformObservability({
        screen: "contractor",
        surface: "screen_reload",
        category: "reload",
        event: "reload_screen",
        result: "joined_inflight",
      });
      return screenReloadInFlightRef.current;
    }

    const networkSnapshot = getPlatformNetworkSnapshot();
    if (networkSnapshot.hydrated && networkSnapshot.networkKnownOffline) {
      recordPlatformGuardSkip("network_known_offline", {
        screen: "contractor",
        surface: "screen_reload",
        event: "reload_screen",
        trigger,
        extra: {
          networkKnownOffline: true,
        },
      });
      return;
    }

    const { data: sessionData } = await supabaseClient.auth.getSession();
    if (!sessionData.session?.user) {
      recordPlatformGuardSkip("auth_not_ready", {
        screen: "contractor",
        surface: "screen_reload",
        event: "reload_screen",
        trigger,
      });
      return;
    }

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
  }, [focusedRef, loadProfile, loadContractor, loadWorks, supabaseClient.auth]);

  return { loadWorks, reloadContractorScreenData };
}
