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
import {
  buildCompatibilityInboxRows,
  resolveContractorScreenContract,
  type ContractorScreenContract,
} from "../contractor.visibilityRecovery";
import { hasCurrentContractorSessionUser } from "../contractor.screenData.auth.transport";
import { logger } from "../../../lib/logger";

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
  setScreenContract: Dispatch<SetStateAction<ContractorScreenContract>>;
  normText: (value: unknown) => string;
  looksLikeUuid: (value: unknown) => boolean;
  pickWorkProgressRow: (row: ContractorWorkRow) => string;
  isExcludedWorkCode: (code: unknown) => boolean;
  isApprovedForOtherStatus: (status: unknown) => boolean;
};

export type ContractorReloadTrigger = "focus" | "manual" | "activation" | "realtime";
export type ContractorVisibleScope = "works_bundle" | "inbox_scope";

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
    setScreenContract,
    normText,
    looksLikeUuid,
    pickWorkProgressRow,
    isExcludedWorkCode,
    isApprovedForOtherStatus,
  } = params;

  const loadWorksSeqRef = useRef(0);
  const screenReloadInFlightRef = useRef<Promise<void> | null>(null);
  const visibleScopeReloadInFlightRef = useRef<Promise<void> | null>(null);

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
      const myUserId = String(profileRef.current?.id || "").trim();
      const myContractorId = String(contractorRef.current?.id || "").trim();
      const [bundle, inboxScope] = await Promise.all([
        loadContractorWorksBundle({
          supabaseClient,
          normText,
          looksLikeUuid,
          pickWorkProgressRow,
          myContractorId,
          myUserId,
          myContractorInn: contractorRef.current?.inn ?? null,
          myContractorCompany: contractorRef.current?.company_name ?? null,
          myContractorFullName: contractorRef.current?.full_name ?? null,
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

      const compatibilityRows = buildCompatibilityInboxRows({
        rows: bundle.rows,
        subcontractCards: bundle.subcontractCards,
        contractor: contractorRef.current,
      });
      const effectiveInboxRows = inboxScope.rows.length > 0 ? inboxScope.rows : compatibilityRows;
      const screenContract = resolveContractorScreenContract({
        canonicalRows: inboxScope.rows,
        canonicalMeta: inboxScope.meta,
        compatibilityRows,
        hasContractorIdentity: Boolean(myContractorId),
        loadError: null,
      });

      setSubcontractCards(bundle.subcontractCards);
      setInboxRows(effectiveInboxRows);
      setScreenContract(screenContract);
      if (__DEV__) {
        logger.info("log", "[contractor.loadWorks] debug-filter", {
          isStaff: bundle.debug.isStaff,
          subcontractsFound: bundle.debug.subcontractsFound,
          totalApproved: bundle.debug.totalApproved,
          canonicalReadyRows: inboxScope.meta.readyRows,
          canonicalCurrentRows: inboxScope.meta.readyCurrentRows,
          canonicalDegradedTitleRows: inboxScope.meta.readyCurrentDegradedTitle,
          canonicalLegacyFilteredOut: inboxScope.meta.legacyFilteredOut,
          canonicalHistoricalExcluded: inboxScope.meta.historicalExcluded,
          compatibilityReadyRows: compatibilityRows.length,
          screenState: screenContract.state,
          renderState: screenContract.renderState,
          screenSource: screenContract.source,
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
          canonicalCurrentRows: inboxScope.meta.readyCurrentRows,
          canonicalDegradedTitleRows: inboxScope.meta.readyCurrentDegradedTitle,
          canonicalLegacyFilteredOut: inboxScope.meta.legacyFilteredOut,
          canonicalHistoricalExcluded: inboxScope.meta.historicalExcluded,
          effectiveReadyRows: effectiveInboxRows.length,
          compatibilityReadyRows: compatibilityRows.length,
          invalidMissingContractor: inboxScope.meta.invalidMissingContractor,
          invalidMaterialOnly: inboxScope.meta.invalidMaterialOnly,
          subcontractCards: bundle.subcontractCards.length,
          primaryOwner: bundle.sourceMeta.primaryOwner,
          fallbackUsed: bundle.sourceMeta.fallbackUsed,
          sourceKind: bundle.sourceMeta.sourceKind,
          screenState: screenContract.state,
          renderState: screenContract.renderState,
          screenSource: screenContract.source,
        },
      });
    } catch (error) {
      if (reqSeq !== loadWorksSeqRef.current) return;
      if (__DEV__) console.error("loadWorks exception:", error);
      setRows([]);
      setSubcontractCards([]);
      setInboxRows(loadEmptyInboxRows());
      setScreenContract(
        resolveContractorScreenContract({
          canonicalRows: [],
          canonicalMeta: null,
          compatibilityRows: [],
          hasContractorIdentity: Boolean(String(contractorRef.current?.id || "").trim()),
          loadError: error,
        }),
      );
      setRowsReady(true);
      setSubcontractsReady(true);
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
    setScreenContract,
  ]);

  const reloadContractorScreenData = useCallback(async (trigger: ContractorReloadTrigger = "focus") => {
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

    if (!(await hasCurrentContractorSessionUser({ supabaseClient }))) {
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
  }, [focusedRef, loadProfile, loadContractor, loadWorks, supabaseClient]);

  const refreshVisibleContractorScopes = useCallback(
    async (params: {
      trigger?: ContractorReloadTrigger;
      scopes: readonly ContractorVisibleScope[];
      force?: boolean;
    }) => {
      const trigger = params.trigger ?? "realtime";
      const force = params.force === true;

      if (!focusedRef.current) {
        recordPlatformGuardSkip("not_focused", {
          screen: "contractor",
          surface: "visible_scope_reload",
          event: "reload_visible_scope",
          trigger,
          extra: {
            scopes: [...params.scopes],
            force,
          },
        });
        return;
      }

      if (screenReloadInFlightRef.current) {
        recordPlatformObservability({
          screen: "contractor",
          surface: "visible_scope_reload",
          category: "reload",
          event: "reload_visible_scope",
          result: "joined_inflight",
          trigger,
          extra: {
            scopes: [...params.scopes],
            owner: "visible_scope_reload",
            joinedOwner: "screen_reload",
            force,
          },
        });
        return screenReloadInFlightRef.current;
      }

      if (visibleScopeReloadInFlightRef.current) {
        recordPlatformObservability({
          screen: "contractor",
          surface: "visible_scope_reload",
          category: "reload",
          event: "reload_visible_scope",
          result: "joined_inflight",
          trigger,
          extra: {
            scopes: [...params.scopes],
            owner: "visible_scope_reload",
            joinedOwner: "visible_scope_reload",
            force,
          },
        });
        return visibleScopeReloadInFlightRef.current;
      }

      const networkSnapshot = getPlatformNetworkSnapshot();
      if (networkSnapshot.hydrated && networkSnapshot.networkKnownOffline) {
        recordPlatformGuardSkip("network_known_offline", {
          screen: "contractor",
          surface: "visible_scope_reload",
          event: "reload_visible_scope",
          trigger,
          extra: {
            scopes: [...params.scopes],
            networkKnownOffline: true,
            force,
          },
        });
        return;
      }

      if (!(await hasCurrentContractorSessionUser({ supabaseClient }))) {
        recordPlatformGuardSkip("auth_not_ready", {
          screen: "contractor",
          surface: "visible_scope_reload",
          event: "reload_visible_scope",
          trigger,
          extra: {
            scopes: [...params.scopes],
            force,
          },
        });
        return;
      }

      if (!profileRef.current && !contractorRef.current) {
        return reloadContractorScreenData(trigger);
      }

      let currentPromise: Promise<void> | null = null;
      currentPromise = (async () => {
        try {
          await loadWorks();
        } finally {
          if (visibleScopeReloadInFlightRef.current === currentPromise) {
            visibleScopeReloadInFlightRef.current = null;
          }
        }
      })();

      visibleScopeReloadInFlightRef.current = currentPromise;
      return currentPromise;
    },
    [focusedRef, loadWorks, profileRef, contractorRef, reloadContractorScreenData, supabaseClient],
  );

  const isContractorRefreshInFlight = useCallback(
    () => Boolean(screenReloadInFlightRef.current || visibleScopeReloadInFlightRef.current),
    [],
  );

  return {
    loadWorks,
    reloadContractorScreenData,
    refreshVisibleContractorScopes,
    isContractorRefreshInFlight,
  };
}
