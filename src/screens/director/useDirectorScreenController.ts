import { useCallback, useRef, useState, useMemo } from "react";
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
import { useGlobalBusy } from "../../ui/GlobalBusy";
import { fmtDateOnly } from "./director.helpers";
import { listAccountantInbox } from "../../lib/api/accountant";
import {
    type Tab,
    type DirTopTab,
    type FinPage,
    type SheetKind,
    type Group,
    type ProposalItem,
    type ProposalAttachmentRow,
} from "./director.types";
import {
    computeFinanceRep,
    fetchDirectorFinanceSummaryViaRpc,
    money as moneyHelper,
    mapToFinanceRow,
    normalizeFinSpendRows,
    mid,
    nnum,
    addDaysIso,
    parseMid,
    type FinanceRow,
    type FinSpendRow,
    type FinKindSupplierRow,
    type FinSupplierPanelState,
} from "./director.finance";
import { useIsFocused } from "@react-navigation/native";

const warnDirectorFinance = (scope: "fetchFinSpendRows" | "fetchFinance" | "fetchFinanceSummary", error: unknown) => {
    if (__DEV__) {
        const message = error instanceof Error ? error.message : String(error ?? "");
        console.warn(`[director] ${scope}:`, message || error);
    }
};

export function useDirectorScreenController() {
    const busy = useGlobalBusy();
    const isScreenFocused = useIsFocused();

    // Tabs
    const [tab, setTab] = useState<Tab>('foreman');
    const [dirTab, setDirTab] = useState<DirTopTab>("Заявки");

    // Finance State
    const [finOpen, setFinOpen] = useState(false);
    const [finPage, setFinPage] = useState<FinPage>("home");
    const finStackRef = useRef<FinPage[]>(["home"]);
    const [finSupplier, setFinSupplier] = useState<FinSupplierPanelState | null>(null);
    const [finLoading, setFinLoading] = useState(false);
    const [finRows, setFinRows] = useState<FinanceRow[]>([]);
    const [finSpendRows, setFinSpendRows] = useState<FinSpendRow[]>([]);
    const [finRep, setFinRep] = useState(() => computeFinanceRep([], { dueDaysDefault: 7, criticalDays: 14 }));
    const [finPeriodOpen, setFinPeriodOpen] = useState(false);
    const [finFrom, setFinFrom] = useState<string | null>(null);
    const [finTo, setFinTo] = useState<string | null>(null);
    const [finKindName, setFinKindName] = useState<string>("");
    const [finKindList, setFinKindList] = useState<FinKindSupplierRow[]>([]);
    const FIN_DUE_DAYS_DEFAULT = 7;
    const FIN_CRITICAL_DAYS = 14;

    const loadFinSpendRows = useCallback(async (): Promise<FinSpendRow[]> => {
        let q = supabase
            .from("v_director_finance_spend_kinds_v3")
            .select("proposal_id,proposal_no,supplier,kind_code,kind_name,approved_alloc,paid_alloc,paid_alloc_cap,overpay_alloc,director_approved_at");

        if (finFrom) q = q.gte("director_approved_at", finFrom);
        if (finTo) q = q.lte("director_approved_at", finTo);

        const { data, error } = await q;
        if (error) throw error;
        return normalizeFinSpendRows(data);
    }, [finFrom, finTo]);

    const fetchFinance = useCallback(async () => {
        setFinLoading(true);
        let nextRows: FinanceRow[] | null = null;
        let nextSpendRows: FinSpendRow[] | null = null;
        try {
            const [listResult, spendResult, summaryResult] = await Promise.allSettled([
                listAccountantInbox(),
                loadFinSpendRows(),
                fetchDirectorFinanceSummaryViaRpc({
                    dueDaysDefault: FIN_DUE_DAYS_DEFAULT,
                    criticalDays: FIN_CRITICAL_DAYS,
                    periodFromIso: finFrom,
                    periodToIso: finTo,
                }),
            ]);

            if (spendResult.status === "fulfilled") {
                nextSpendRows = spendResult.value;
                setFinSpendRows(nextSpendRows);
            } else {
                warnDirectorFinance("fetchFinSpendRows", spendResult.reason);
            }

            if (listResult.status !== "fulfilled") throw listResult.reason;
            const list = listResult.value;
            const mapped = (Array.isArray(list) ? list : [])
                .map(mapToFinanceRow)
                .filter(x => !!x && !!x.id)
                .filter(x => Number.isFinite(Number(x.amount)));

            const t0 = mid(new Date());
            mapped.sort((a, b) => {
                const aPaid = nnum(a.amount) > 0 && Math.max(nnum(a.amount) - nnum(a.paidAmount), 0) <= 0;
                const bPaid = nnum(b.amount) > 0 && Math.max(nnum(b.amount) - nnum(b.paidAmount), 0) <= 0;
                const aDueIso = a.dueDate ?? (a.invoiceDate ? addDaysIso(a.invoiceDate, FIN_DUE_DAYS_DEFAULT) : null) ?? (a.approvedAtIso ? addDaysIso(a.approvedAtIso, FIN_DUE_DAYS_DEFAULT) : null);
                const bDueIso = b.dueDate ?? (b.invoiceDate ? addDaysIso(b.invoiceDate, FIN_DUE_DAYS_DEFAULT) : null) ?? (b.approvedAtIso ? addDaysIso(b.approvedAtIso, FIN_DUE_DAYS_DEFAULT) : null);
                const aDue = parseMid(aDueIso) ?? 0;
                const bDue = parseMid(bDueIso) ?? 0;
                const aRest = Math.max(nnum(a.amount) - nnum(a.paidAmount), 0);
                const bRest = Math.max(nnum(b.amount) - nnum(b.paidAmount), 0);
                const aOver = (!aPaid && aRest > 0 && aDue && aDue < t0) ? 1 : 0;
                const bOver = (!bPaid && bRest > 0 && bDue && bDue < t0) ? 1 : 0;
                if (aOver !== bOver) return bOver - aOver;
                return (aDue || 0) - (bDue || 0);
            });

            nextRows = mapped;
            if (summaryResult.status === "rejected") {
                warnDirectorFinance("fetchFinanceSummary", summaryResult.reason);
            }
            const rep = summaryResult.status === "fulfilled" && summaryResult.value
                ? summaryResult.value
                : computeFinanceRep(mapped, {
                    dueDaysDefault: FIN_DUE_DAYS_DEFAULT,
                    criticalDays: FIN_CRITICAL_DAYS,
                    periodFromIso: finFrom,
                    periodToIso: finTo,
                });
            setFinRows(mapped);
            setFinRep(rep);

        } catch (e: unknown) {
            warnDirectorFinance("fetchFinance", e);
            if (nextRows) {
                setFinRows(nextRows);
                setFinRep(computeFinanceRep(nextRows, { dueDaysDefault: FIN_DUE_DAYS_DEFAULT, criticalDays: FIN_CRITICAL_DAYS }));
            }
            if (nextSpendRows == null) {
                try {
                    setFinSpendRows(await loadFinSpendRows());
                } catch (spendError: unknown) {
                    warnDirectorFinance("fetchFinSpendRows", spendError);
                }
            }
        } finally {
            setFinLoading(false);
        }
    }, [FIN_CRITICAL_DAYS, FIN_DUE_DAYS_DEFAULT, finFrom, finTo, loadFinSpendRows]);

    // Navigation Logic for Finance
    const pushFin = useCallback((p: FinPage) => {
        finStackRef.current = [...finStackRef.current, p];
        setFinPage(p);
    }, []);

    const popFin = useCallback(() => {
        const s = finStackRef.current.slice(0, -1);
        finStackRef.current = s.length ? s : ["home"];
        setFinPage(finStackRef.current[finStackRef.current.length - 1] || "home");
    }, []);

    const closeFinance = useCallback(() => {
        setFinOpen(false);
        setFinPage("home");
        finStackRef.current = ["home"];
        setFinSupplier(null);
        setFinKindName("");
        setFinKindList([]);
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
    }, []);

    // Reports
    const reports = useDirectorReports({ fmtDateOnly });

    // Data
    const data = useDirectorData({ supabase });
    const { rtToast, showRtToast, showSuccess } = useDirectorRtToast();

    // Requests/Proposals State
    const [actingId, setActingId] = useState<string | null>(null);
    const [reqDeleteId, setReqDeleteId] = useState<number | string | null>(null);
    const [reqSendId, setReqSendId] = useState<number | string | null>(null);
    const [propApproveId, setPropApproveId] = useState<string | null>(null);
    const [propReturnId, setPropReturnId] = useState<string | null>(null);
    const [propAttByProp, setPropAttByProp] = useState<Record<string, ProposalAttachmentRow[]>>({});
    const [propAttBusyByProp, setPropAttBusyByProp] = useState<Record<string, boolean>>({});
    const [propAttErrByProp, setPropAttErrByProp] = useState<Record<string, string>>({});
    const [sheetKind, setSheetKind] = useState<SheetKind>('none');
    const [sheetRequest, setSheetRequest] = useState<Group | null>(null);
    const [sheetProposalId, setSheetProposalId] = useState<string | null>(null);
    const [itemsByProp, setItemsByProp] = useState<Record<string, ProposalItem[]>>({});
    const [loadedByProp, setLoadedByProp] = useState<Record<string, boolean>>({});
    const [loadingPropId, setLoadingPropId] = useState<string | null>(null);
    const [decidingId, setDecidingId] = useState<string | null>(null);
    const [actingPropItemId, setActingPropItemId] = useState<number | null>(null);
    const [pdfHtmlByProp, setPdfHtmlByProp] = useState<Record<string, string>>({});

    const pdfTapLockRef = useRef<Record<string, boolean>>({});
    const loadingPropRef = useRef<Record<string, boolean>>({});
    const lastTapRef = useRef<number>(0);

    const screenLock = !!actingId || reqDeleteId != null || reqSendId != null || propApproveId != null || propReturnId != null || actingPropItemId != null;

    // Actions
    const closeSheet = useCallback(() => {
        setSheetKind('none');
        setSheetRequest(null);
        setSheetProposalId(null);
    }, []);

    const openRequestSheet = useCallback((g: Group) => {
        setSheetRequest(g);
        setSheetProposalId(null);
        setSheetKind('request');
    }, []);

    const openProposalSheet = useCallback((pid: string) => {
        setSheetProposalId(pid);
        setSheetRequest(null);
        setSheetKind('proposal');
    }, []);

    const requestActions = useDirectorRequestActions({
        busy, supabase, screenLock, reqDeleteId, reqSendId,
        labelForRequest: data.labelForRequest, setRows: data.setRows,
        setSheetRequest, setActingId, setReqDeleteId, setReqSendId,
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
        busy, supabase, finPage, finFrom, finTo, finRows, finSpendRows, finLoading,
        finSupplier, finKindName, fmtDateOnly, pushFin, popFin, closeFinance,
        setFinSupplier, setFinKindName, setFinKindList, setFinFrom, setFinTo,
        setFinPeriodOpen, fetchFinance,
        FIN_DUE_DAYS_DEFAULT, FIN_CRITICAL_DAYS
    });

    // Lifecycle
    useDirectorLifecycle({
        dirTab, finFrom, finTo, repFrom: reports.repFrom, repTo: reports.repTo,
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

    const sheetTitle = useMemo(() => {
        if (sheetKind === "request" && sheetRequest) {
            return `Заявка ${data.labelForRequest(sheetRequest.request_id)}`;
        }
        if (sheetKind === "proposal" && sheetProposalId) {
            const p = data.propsHeads.find((x) => String(x.id) === String(sheetProposalId));
            const pretty = String(p?.pretty ?? "").trim();
            return pretty ? `Предложение ${pretty}` : `Предложение #${String(sheetProposalId).slice(0, 8)}`;
        }
        return "—";
    }, [sheetKind, sheetRequest, sheetProposalId, data]);

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
        finOpen, finPage, finRows, finSpendRows, finRep, finPeriodOpen, finFrom, finTo, finSupplier, finKindName, finKindList, finLoading,

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
        sheetKind, sheetRequest, sheetProposalId,
        actingId, reqDeleteId, reqSendId, propApproveId, propReturnId,
        itemsByProp, loadedByProp, decidingId, actingPropItemId, propAttByProp, propAttBusyByProp,
        propAttErrByProp,
        pdfHtmlByProp,

        // Helpers
        fmtDateOnly,
    };
}
