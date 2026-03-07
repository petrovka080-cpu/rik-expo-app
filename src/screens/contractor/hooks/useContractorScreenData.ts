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
  normText: (value: unknown) => string;
  looksLikeUuid: (value: unknown) => boolean;
  pickWorkProgressRow: (row: ContractorWorkRow) => string;
  isExcludedWorkCode: (code: unknown) => boolean;
  isApprovedForOtherStatus: (status: unknown) => boolean;
};

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
      const bundle = await loadContractorWorksBundle({
        supabaseClient,
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
    } catch (error) {
      if (reqSeq !== loadWorksSeqRef.current) return;
      console.error("loadWorks exception:", error);
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
  ]);

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

  return { loadWorks, reloadContractorScreenData };
}
