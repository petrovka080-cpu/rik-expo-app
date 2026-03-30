import { useCallback, useMemo, useRef, useState } from "react";
import { Platform, Animated } from "react-native";
import { supabase } from "../../lib/supabaseClient";
import { useDirectorData } from "./director.data";
import { useDirectorFinancePanel } from "./director.finance.panel";
import { useDirectorReports } from "./director.reports";
import { useDirectorRtToast } from "./director.toast";
import { useDirectorRequestActions } from "./director.request";
import { useDirectorProposalActions } from "./director.proposal";
import { useDirectorProposalDetail } from "./director.proposal.detail";
import { useDirectorProposalRow } from "./director.proposal.row";
import { useDirectorLifecycle } from "./director.lifecycle";
import { useDirectorFinanceRealtimeLifecycle } from "./director.finance.realtime.lifecycle";
import { useDirectorReportsRealtimeLifecycle } from "./director.reports.realtime.lifecycle";
import { useGlobalBusy } from "../../ui/GlobalBusy";
import { fmtDateOnly } from "./director.helpers";
import {
    loadDirectorFinanceScreenScope,
} from "../../lib/api/directorFinanceScope.service";
import {
    type FinPage,
    type Group,
    type ProposalItem,
    type ProposalAttachmentRow,
} from "./director.types";
import {
    money as moneyHelper,
    type FinRep,
    type FinSpendSummary,
} from "./director.finance";
import type { DirectorFinanceCanonicalScope } from "./director.readModels";
import { useIsFocused } from "@react-navigation/native";
import { useDirectorUiStore } from "./directorUi.store";

const warnDirectorFinance = (
    scope: "fetchFinSpendRows" | "fetchFinance" | "fetchFinanceSummary" | "fetchFinancePanelScope",
    error: unknown,
) => {
    if (__DEV__) {
        const message = error instanceof Error ? error.message : String(error ?? "");
        console.warn(`[director] ${scope}:`, message || error);
    }
};

const EMPTY_FIN_REP: FinRep = {
    summary: {
        approved: 0,
        paid: 0,
        partialPaid: 0,
        toPay: 0,
        overdueCount: 0,
        overdueAmount: 0,
        criticalCount: 0,
        criticalAmount: 0,
        partialCount: 0,
        debtCount: 0,
    },
    report: {
        suppliers: [],
    },
};

const EMPTY_FIN_SPEND_SUMMARY: FinSpendSummary = {
    header: {
        approved: 0,
        paid: 0,
        toPay: 0,
        overpay: 0,
    },
    kindRows: [],
    overpaySuppliers: [],
};

const DIRECTOR_FINANCE_TAB = "\u0424\u0438\u043d\u0430\u043d\u0441\u044b";
const DIRECTOR_REPORTS_TAB = "\u041e\u0442\u0447\u0451\u0442\u044b";

export function useDirectorScreenController() {
    const busy = useGlobalBusy();
    const isScreenFocused = useIsFocused();
    const screenFocusedRef = useRef(isScreenFocused);
    screenFocusedRef.current = isScreenFocused;

    // Tabs
    const tab = useDirectorUiStore((state) => state.requestTab);
    const setTab = useDirectorUiStore((state) => state.setRequestTab);
    const dirTab = useDirectorUiStore((state) => state.dirTab);
    const setDirTab = useDirectorUiStore((state) => state.setDirTab);

    // Finance State
    const finOpen = useDirectorUiStore((state) => state.finOpen);
    const setFinOpen = useDirectorUiStore((state) => state.setFinOpen);
    const finPage = useDirectorUiStore((state) => state.finPage);
    const setFinPage = useDirectorUiStore((state) => state.setFinPage);
    const finLoading = useDirectorUiStore((state) => state.finLoading);
    const setFinLoading = useDirectorUiStore((state) => state.setFinLoading);
    const finStackRef = useRef<FinPage[]>(["home"]);
    const [finScope, setFinScope] = useState<DirectorFinanceCanonicalScope | null>(null);
    const [finRep, setFinRep] = useState<FinRep>(EMPTY_FIN_REP);
    const [finSpendSummary, setFinSpendSummary] = useState<FinSpendSummary>(EMPTY_FIN_SPEND_SUMMARY);
    const finPeriodOpen = useDirectorUiStore((state) => state.finPeriodOpen);
    const setFinPeriodOpen = useDirectorUiStore((state) => state.setFinPeriodOpen);
    const finFrom = useDirectorUiStore((state) => state.finFrom);
    const setFinFrom = useDirectorUiStore((state) => state.setFinFrom);
    const finTo = useDirectorUiStore((state) => state.finTo);
    const setFinTo = useDirectorUiStore((state) => state.setFinTo);
    const finKindName = useDirectorUiStore((state) => state.finKindName);
    const setFinKindName = useDirectorUiStore((state) => state.setFinKindName);
    const finSupplierSelection = useDirectorUiStore((state) => state.finSupplierSelection);
    const setFinSupplierSelection = useDirectorUiStore((state) => state.setFinSupplierSelection);
    const setRefreshReason = useDirectorUiStore((state) => state.setRefreshReason);
    const FIN_DUE_DAYS_DEFAULT = 7;
    const FIN_CRITICAL_DAYS = 14;

    const fetchFinance = useCallback(async () => {
        setFinLoading(true);
        try {
            const scope = await loadDirectorFinanceScreenScope({
                periodFromIso: finFrom,
                periodToIso: finTo,
                dueDaysDefault: FIN_DUE_DAYS_DEFAULT,
                criticalDays: FIN_CRITICAL_DAYS,
            });

            for (const issue of scope.issues) {
                if (issue.scope === "finance_rows") {
                    warnDirectorFinance("fetchFinance", issue.error);
                } else if (issue.scope === "spend_rows") {
                    warnDirectorFinance("fetchFinSpendRows", issue.error);
                } else {
                    warnDirectorFinance("fetchFinancePanelScope", issue.error);
                }
            }

            setFinScope(scope.canonicalScope);
            setFinRep(scope.finRep);
            setFinSpendSummary(scope.finSpendSummary);
        } catch (e: unknown) {
            warnDirectorFinance("fetchFinance", e);
        } finally {
            setFinLoading(false);
        }
    }, [FIN_CRITICAL_DAYS, FIN_DUE_DAYS_DEFAULT, finFrom, finTo, setFinLoading]);

    // Navigation Logic for Finance
    const pushFin = useCallback((p: FinPage) => {
        finStackRef.current = [...finStackRef.current, p];
        setFinPage(p);
    }, [setFinPage]);

    const popFin = useCallback(() => {
        const s = finStackRef.current.slice(0, -1);
        finStackRef.current = s.length ? s : ["home"];
        setFinPage(finStackRef.current[finStackRef.current.length - 1] || "home");
    }, [setFinPage]);

    const closeFinance = useCallback(() => {
        useDirectorUiStore.getState().closeFinanceUi();
        finStackRef.current = ["home"];
    }, []);

    const openFinancePage = useCallback((page: FinPage) => {
        setFinOpen(true);
        if (page === "home") {
            finStackRef.current = ["home"];
            setFinPage("home");
        } else {
            finStackRef.current = ["home", page];
            setFinPage(page);
        }
    }, [setFinOpen, setFinPage]);

    // Reports
    const reports = useDirectorReports({ fmtDateOnly });

    // Data
    const data = useDirectorData({ supabase });
    const { rtToast, showRtToast, showSuccess } = useDirectorRtToast();

    // Requests/Proposals State
    const actingId = useDirectorUiStore((state) => state.actingId);
    const setActingId = useDirectorUiStore((state) => state.setActingId);
    const reqDeleteId = useDirectorUiStore((state) => state.reqDeleteId);
    const setReqDeleteId = useDirectorUiStore((state) => state.setReqDeleteId);
    const reqSendId = useDirectorUiStore((state) => state.reqSendId);
    const setReqSendId = useDirectorUiStore((state) => state.setReqSendId);
    const propApproveId = useDirectorUiStore((state) => state.propApproveId);
    const setPropApproveId = useDirectorUiStore((state) => state.setPropApproveId);
    const propReturnId = useDirectorUiStore((state) => state.propReturnId);
    const setPropReturnId = useDirectorUiStore((state) => state.setPropReturnId);
    const [propAttByProp, setPropAttByProp] = useState<Record<string, ProposalAttachmentRow[]>>({});
    const [propAttBusyByProp, setPropAttBusyByProp] = useState<Record<string, boolean>>({});
    const [propAttErrByProp, setPropAttErrByProp] = useState<Record<string, string>>({});
    const sheetKind = useDirectorUiStore((state) => state.sheetKind);
    const selectedRequestId = useDirectorUiStore((state) => state.selectedRequestId);
    const selectedProposalId = useDirectorUiStore((state) => state.selectedProposalId);
    const openRequestSheetUi = useDirectorUiStore((state) => state.openRequestSheet);
    const openProposalSheetUi = useDirectorUiStore((state) => state.openProposalSheet);
    const [itemsByProp, setItemsByProp] = useState<Record<string, ProposalItem[]>>({});
    const [loadedByProp, setLoadedByProp] = useState<Record<string, boolean>>({});
    const loadingPropId = useDirectorUiStore((state) => state.loadingPropId);
    const setLoadingPropId = useDirectorUiStore((state) => state.setLoadingPropId);
    const decidingId = useDirectorUiStore((state) => state.decidingId);
    const setDecidingId = useDirectorUiStore((state) => state.setDecidingId);
    const actingPropItemId = useDirectorUiStore((state) => state.actingPropItemId);
    const setActingPropItemId = useDirectorUiStore((state) => state.setActingPropItemId);
    const [pdfHtmlByProp, setPdfHtmlByProp] = useState<Record<string, string>>({});

    const pdfTapLockRef = useRef<Record<string, boolean>>({});
    const loadingPropRef = useRef<Record<string, boolean>>({});
    const lastTapRef = useRef<number>(0);

    const screenLock = !!actingId || reqDeleteId != null || reqSendId != null || propApproveId != null || propReturnId != null || actingPropItemId != null;

    // Actions
    const closeSheet = useCallback(() => {
        useDirectorUiStore.getState().closeSheetUi();
    }, []);

    const openRequestSheet = useCallback((g: Group) => {
        openRequestSheetUi(g.request_id);
    }, [openRequestSheetUi]);

    const openProposalSheet = useCallback((pid: string) => {
        openProposalSheetUi(pid);
    }, [openProposalSheetUi]);

    const requestActions = useDirectorRequestActions({
        busy, supabase, screenLock, reqDeleteId, reqSendId,
        labelForRequest: data.labelForRequest, setRows: data.setRows,
        setActingId, setReqDeleteId, setReqSendId,
        fetchRows: data.fetchRows, fetchProps: data.fetchProps,
        closeSheet, showSuccess
    });

    const proposalActions = useDirectorProposalActions({
        busy, supabase, pdfTapLockRef, itemsByProp,
        setItemsByProp, setDecidingId, setActingPropItemId, setPropApproveId,
        fetchProps: data.fetchProps, fetchRows: data.fetchRows,
        closeSheet, showSuccess
    });

    const proposalDetail = useDirectorProposalDetail({
        supabase, propAttBusyByProp, setPropAttBusyByProp, setPropAttByProp,
        setPropAttErrByProp,
        setPropReturnId, setItemsByProp, setLoadedByProp, setPdfHtmlByProp,
        fetchProps: data.fetchProps, closeSheet
    });

    const propRow = useDirectorProposalRow({
        busy, supabase, loadedByProp, pdfHtmlByProp,
        propItemsCount: data.propItemsCount,
        loadingPropId, loadingPropRef, lastTapRef,
        setLoadingPropId, setItemsByProp, setLoadedByProp, setPdfHtmlByProp,
        setReqItemNoteById: data.setReqItemNoteById,
        preloadProposalRequestIds: data.preloadProposalRequestIds,
        loadProposalAttachments: proposalDetail.loadProposalAttachments,
        openProposalSheet, fmtDateOnly
    });

    const financePanel = useDirectorFinancePanel({
        busy, supabase, finPage, finFrom, finTo, finSpendSummary, finLoading,
        finKindName, finSupplierSelection, fmtDateOnly, pushFin, popFin, closeFinance,
        setFinSupplierSelection, setFinKindName, setFinFrom, setFinTo,
        setFinPeriodOpen, fetchFinance,
        FIN_DUE_DAYS_DEFAULT, FIN_CRITICAL_DAYS
    });

    const refreshFinanceRealtimeScope = useCallback(async () => {
        setRefreshReason("realtime:director:finance");
        await fetchFinance();
    }, [fetchFinance, setRefreshReason]);

    const refreshReportsRealtimeScope = useCallback(async () => {
        setRefreshReason("realtime:director:reports");
        await reports.refreshReports();
    }, [reports, setRefreshReason]);

    useDirectorFinanceRealtimeLifecycle({
        focusedRef: screenFocusedRef,
        visible: isScreenFocused && dirTab === DIRECTOR_FINANCE_TAB,
        refreshFinanceScope: refreshFinanceRealtimeScope,
        isRefreshInFlight: () => finLoading,
    });

    useDirectorReportsRealtimeLifecycle({
        focusedRef: screenFocusedRef,
        visible: isScreenFocused && dirTab === DIRECTOR_REPORTS_TAB && reports.repOpen,
        refreshReportsScope: refreshReportsRealtimeScope,
        isRefreshInFlight: () =>
            reports.repLoading || reports.repOptLoading || reports.repDisciplinePriceLoading,
    });

    // Lifecycle
    useDirectorLifecycle({
        dirTab, requestTab: tab, finFrom, finTo, repFrom: reports.repFrom, repTo: reports.repTo,
        isScreenFocused, fetchRows: data.fetchRows, fetchProps: data.fetchProps,
        fetchFinance, fetchReport: reports.fetchReport,
        showRtToast
    });

    // Header Animation
    const isMobile = Platform.OS !== "web";
    const isRequestsTab = dirTab === "Заявки";
    const HEADER_MIN = isMobile ? (isRequestsTab ? 148 : 108) : 76;
    const HEADER_MAX = isMobile ? (isRequestsTab ? 198 : 150) : (isRequestsTab ? 210 : 170);
    const HEADER_SCROLL = Math.max(1, HEADER_MAX - HEADER_MIN);
    const scrollY = useRef(new Animated.Value(0)).current;
    const clampedY = Animated.diffClamp(scrollY, 0, HEADER_SCROLL);

    const headerHeight = clampedY.interpolate({
        inputRange: [0, HEADER_SCROLL],
        outputRange: [HEADER_MAX, HEADER_MIN],
        extrapolate: "clamp",
    });

    const titleSize = clampedY.interpolate({
        inputRange: [0, HEADER_SCROLL],
        outputRange: [24, 16],
        extrapolate: "clamp",
    });

    const subOpacity = clampedY.interpolate({
        inputRange: [0, HEADER_SCROLL],
        outputRange: [1, 0],
        extrapolate: "clamp",
    });

    const headerShadow = isRequestsTab
        ? clampedY.interpolate({
            inputRange: [0, 10],
            outputRange: [0, 0.12],
            extrapolate: "clamp",
        })
        : 0.12;

    // Groups derivation
    const groups: Group[] = useMemo(() => {
        const map = new Map<number | string, Group["items"]>();
        for (const r of data.rows) {
            const k = String(r.request_id ?? '');
            if (!map.has(k)) map.set(k, []);
            map.get(k)!.push(r);
        }
        return Array.from(map.entries())
            .map(([request_id, items]) => ({ request_id, items }))
            .sort((a, b) => {
                const aTsRaw = data.submittedAtByReq[String(a.request_id ?? "").trim()] ?? null;
                const bTsRaw = data.submittedAtByReq[String(b.request_id ?? "").trim()] ?? null;
                const aTs = aTsRaw ? Date.parse(String(aTsRaw)) : 0;
                const bTs = bTsRaw ? Date.parse(String(bTsRaw)) : 0;
                return bTs - aTs;
            });
    }, [data.rows, data.submittedAtByReq]);

    const sheetRequest = useMemo(() => {
        const requestId = String(selectedRequestId ?? "").trim();
        if (!requestId) return null;
        return groups.find((group) => String(group.request_id ?? "").trim() === requestId) ?? null;
    }, [groups, selectedRequestId]);

    const sheetTitle = useMemo(() => {
        if (sheetKind === "request" && sheetRequest) {
            return `Заявка ${data.labelForRequest(sheetRequest.request_id)}`;
        }
        if (sheetKind === "proposal" && selectedProposalId) {
            const p = data.propsHeads.find((x) => String(x.id) === String(selectedProposalId));
            const pretty = String(p?.pretty ?? "").trim();
            return pretty ? `Предложение ${pretty}` : `Предложение #${String(selectedProposalId).slice(0, 8)}`;
        }
        return "—";
    }, [data, selectedProposalId, sheetKind, sheetRequest]);

    return {
        // Derived
        groups,
        sheetTitle,
        isSheetOpen: sheetKind !== 'none',
        screenLock,
        money: moneyHelper,

        // State
        tab, setTab,
        dirTab, setDirTab,
        scrollY, headerHeight, headerShadow, titleSize, subOpacity,
        HEADER_MAX, HEADER_MIN,

        // Finance State
        finOpen,
        finPage,
        finScope,
        finSpendSummary,
        finRep,
        finPeriodOpen,
        finFrom,
        finTo,
        finSupplier: financePanel.finSupplier,
        finSupplierLoading: financePanel.finSupplierLoading,
        finKindName,
        finKindList: financePanel.finKindList,
        finLoading,

        // Actions/Modals
        closeSheet, openRequestSheet, openProposalSheet,
        openFinancePage, closeFinance, pushFin, popFin,

        // Components/Hooks results
        data,
        reports,
        rtToast,
        requestActions,
        proposalActions,
        proposalDetail,
        propRow,
        financePanel,

        // Individual flags/IDs for sheet
        sheetKind, sheetRequest, sheetProposalId: selectedProposalId,
        actingId, reqDeleteId, reqSendId, propApproveId, propReturnId,
        itemsByProp, loadedByProp, decidingId, actingPropItemId, propAttByProp, propAttBusyByProp,
        propAttErrByProp,
        pdfHtmlByProp,

        // Helpers
        fmtDateOnly,
    };
}
