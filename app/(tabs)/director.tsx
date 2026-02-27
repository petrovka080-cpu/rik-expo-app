// app/(tabs)/director.tsx — единый блок «Ожидает утверждения (прораб)», БЕЗ нижнего блока «шапок»
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, FlatList, ScrollView, Pressable, Alert, ActivityIndicator,
  RefreshControl, Platform, TextInput, Animated, Linking, InteractionManager
} from 'react-native';

import { openSignedUrlUniversal } from "../../src/lib/files";
import { UI, s } from "../../src/screens/director/director.styles";
import DirectorDashboard from "../../src/screens/director/DirectorDashboard";
import {
  type FinanceRow,
  type FinSupplierDebt,
  type FinRep,
  mapToFinanceRow,
  computeFinanceRep,
  money,
  nnum,
  addDaysIso,
  mid,
  parseMid,
} from "../../src/screens/director/director.finance";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import PeriodPickerSheet from "../../src/components/PeriodPickerSheet";

import { fmtDateOnly } from "../../src/screens/director/director.helpers";
import { useDirectorProposalActions } from "../../src/screens/director/director.proposal";
import { useDirectorData } from "../../src/screens/director/director.data";
import { useDirectorProposalDetail } from "../../src/screens/director/director.proposal.detail";
import { useDirectorProposalRow } from "../../src/screens/director/director.proposal.row";
import { useDirectorFinancePanel } from "../../src/screens/director/director.finance.panel";
import { useDirectorLifecycle } from "../../src/screens/director/director.lifecycle";
import { useDirectorRequestActions } from "../../src/screens/director/director.request";
import { useDirectorReports } from "../../src/screens/director/director.reports";
import { useDirectorRtToast } from "../../src/screens/director/director.toast";

import {
  type Tab,
  type DirTopTab,
  type PendingRow,
  type Group,
  type ProposalItem,
  type ProposalAttachmentRow,
  type SheetKind,
  type FinPage,
} from "../../src/screens/director/director.types";

import { listAccountantInbox } from "../../src/lib/api/accountant";

import { useGlobalBusy } from '../../src/ui/GlobalBusy';
import { supabase, ensureSignedIn } from '../../src/lib/supabaseClient';
import { runPdfTop } from "../../src/lib/pdfRunner";
import { Ionicons } from '@expo/vector-icons';
import DirectorFinanceCardModal from "../../src/screens/director/DirectorFinanceCardModal";
import DirectorFinanceContent from "../../src/screens/director/DirectorFinanceContent";
import DirectorReportsModal from "../../src/screens/director/DirectorReportsModal";
import DirectorSheetModal from "../../src/screens/director/DirectorSheetModal";


export default function DirectorScreen() {
  const busy = useGlobalBusy();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('foreman');

  const [dirTab, setDirTab] = useState<DirTopTab>("Заявки");

  const [finOpen, setFinOpen] = useState(false);
  const [finPage, setFinPage] = useState<FinPage>("home");

  // стек страниц для "назад"
  const finStackRef = useRef<FinPage[]>(["home"]);
  const pushFin = useCallback((p: FinPage) => {
    finStackRef.current = [...finStackRef.current, p];
    setFinPage(p);
  }, []);
  const popFin = useCallback(() => {
    const s = finStackRef.current.slice(0, -1);
    finStackRef.current = s.length ? s : ["home"];
    setFinPage(finStackRef.current[finStackRef.current.length - 1] || "home");
  }, []);

  const [finSupplier, setFinSupplier] = useState<FinSupplierDebt | null>(null);

  const [finLoading, setFinLoading] = useState(false);
  const [finRows, setFinRows] = useState<FinanceRow[]>([]);
  const [finSpendRows, setFinSpendRows] = useState<any[]>([]);
  const [finRep, setFinRep] = useState<FinRep>(() => computeFinanceRep([], { dueDaysDefault: 7, criticalDays: 14 }));
  const [finPeriodOpen, setFinPeriodOpen] = useState(false);
  const [finFrom, setFinFrom] = useState<string | null>(null);
  const [finTo, setFinTo] = useState<string | null>(null);

  const {
    repOpen,
    repTab,
    repPeriodOpen,
    repObjOpen,
    repFrom,
    repTo,
    repObjectName,
    repLoading,
    repData,
    repOptLoading,
    repOptObjects,
    repPeriodShort,
    setRepTab,
    setRepPeriodOpen,
    setRepObjOpen,
    fetchReport,
    fetchReportOptions,
    applyObjectFilter,
    applyReportPeriod,
    clearReportPeriod,
    openReports,
    refreshReports,
    closeReports,
  } = useDirectorReports({ fmtDateOnly });


  const FIN_DUE_DAYS_DEFAULT = 7;
  const FIN_CRITICAL_DAYS = 14;
  const [finKindName, setFinKindName] = useState<string>("");
  const [finKindList, setFinKindList] = useState<any[]>([]);
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  const openFinPeriod = useCallback(() => setFinPeriodOpen(true), []);
  const closeFinPeriod = useCallback(() => setFinPeriodOpen(false), []);

  const openFinancePage = useCallback((page: FinPage) => {
    finStackRef.current = ["home"];
    setFinOpen(true);
    setFinPage("home");

    if (page !== "home") {
      finStackRef.current = ["home", page];
      setFinPage(page);
    }
  }, []);

  const closeFinance = useCallback(() => {
    setFinOpen(false);
    setFinPage("home");
    finStackRef.current = ["home"];
    setFinSupplier(null);
    setFinKindName("");
    setFinKindList([]);
  }, []);


  const isMobile = Platform.OS !== "web";

  const HEADER_MIN = isMobile
    ? (dirTab === "Заявки" ? 148 : 108)
    : 76;

  const HEADER_MAX = isMobile
    ? (dirTab === "Заявки" ? 198 : 150)
    : (dirTab === "Заявки" ? 210 : 170);

  const HEADER_SCROLL = Math.max(1, HEADER_MAX - HEADER_MIN);

  const isRequestsTab = dirTab === "Заявки";

  // 1) scroll value
  const scrollY = useRef(new Animated.Value(0)).current;

  // 2) safe clamp range (never 0)
  const _HEADER_SCROLL = Math.max(1, Number(HEADER_SCROLL || 0));

  // 3) clampedY MUST be declared before any interpolate usage
  const clampedY = useMemo(() => {
    return Animated.diffClamp(scrollY, 0, _HEADER_SCROLL);
  }, [scrollY, _HEADER_SCROLL]);

  // 4) interpolations
  const headerHeight = useMemo(() => {
    return clampedY.interpolate({
      inputRange: [0, HEADER_SCROLL],
      outputRange: [HEADER_MAX, HEADER_MIN],
      extrapolate: "clamp",
    });
  }, [clampedY, HEADER_SCROLL, HEADER_MAX, HEADER_MIN]);

  const titleSize = useMemo(() => {
    return clampedY.interpolate({
      inputRange: [0, HEADER_SCROLL],
      outputRange: [24, 16],
      extrapolate: "clamp",
    });
  }, [clampedY, HEADER_SCROLL]);

  const subOpacity = useMemo(() => {
    return clampedY.interpolate({
      inputRange: [0, HEADER_SCROLL],
      outputRange: [1, 0],
      extrapolate: "clamp",
    });
  }, [clampedY, HEADER_SCROLL]);

  const headerShadow = useMemo(() => {
    return isRequestsTab
      ? clampedY.interpolate({
        inputRange: [0, 10],
        outputRange: [0, 0.12],
        extrapolate: "clamp",
      })
      : 0.12;
  }, [isRequestsTab, clampedY]);

  const [actingId, setActingId] = useState<string | null>(null);


  const [reqDeleteId, setReqDeleteId] = useState<number | string | null>(null);
  const [reqSendId, setReqSendId] = useState<number | string | null>(null);


  const [propApproveId, setPropApproveId] = useState<string | null>(null);
  const [propReturnId, setPropReturnId] = useState<string | null>(null);

  const [propAttByProp, setPropAttByProp] = useState<Record<string, ProposalAttachmentRow[]>>({});
  const [propAttBusyByProp, setPropAttBusyByProp] = useState<Record<string, boolean>>({});

  const [sheetKind, setSheetKind] = useState<SheetKind>('none');
  const [sheetRequest, setSheetRequest] = useState<Group | null>(null);
  const [sheetProposalId, setSheetProposalId] = useState<string | null>(null);

  const loadingPropRef = useRef<Record<string, boolean>>({});
  const lastTapRef = useRef<number>(0);
  const pdfTapLockRef = useRef<Record<string, boolean>>({});
  const isSheetOpen = sheetKind !== 'none';

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

  const [itemsByProp, setItemsByProp] = useState<Record<string, ProposalItem[]>>({});
  const [loadedByProp, setLoadedByProp] = useState<Record<string, boolean>>({});

  const [loadingPropId, setLoadingPropId] = useState<string | null>(null);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [actingPropItemId, setActingPropItemId] = useState<number | null>(null);

  const [pdfHtmlByProp, setPdfHtmlByProp] = useState<Record<string, string>>({});
  const { rtToast, showRtToast, showSuccess } = useDirectorRtToast();

  const {
    rows,
    setRows,
    loadingRows,
    propsHeads,
    buyerPropsCount,
    buyerPositionsCount,
    propItemsCount,
    loadingProps,
    submittedAtByReq,
    reqMetaByIdRef,
    reqItemNoteByIdRef,
    propReqIdsByPropRef,
    setReqItemNoteById,
    labelForRequest,
    preloadProposalRequestIds,
    fetchRows,
    fetchProps,
  } = useDirectorData({ supabase });

  const screenLock =
    !!actingId ||
    reqDeleteId != null ||
    reqSendId != null ||
    propApproveId != null ||
    propReturnId != null ||
    actingPropItemId != null;

  const fetchFinSpendRows = useCallback(async () => {
    try {
      let q = supabase
        .from("v_director_finance_spend_kinds_v3")
        .select("proposal_id,proposal_no,supplier,kind_code,kind_name,approved_alloc,paid_alloc,paid_alloc_cap,overpay_alloc,director_approved_at");

      if (finFrom) q = q.gte("director_approved_at", finFrom);
      if (finTo) q = q.lte("director_approved_at", finTo);

      const { data, error } = await q;
      if (error) throw error;

      setFinSpendRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.warn("[director] fetchFinSpendRows:", e?.message ?? e);

    }
  }, [supabase, finFrom, finTo]);


  const fetchFinance = useCallback(async () => {
    setFinLoading(true);


    let nextRows: FinanceRow[] | null = null;

    try {
      const list = await listAccountantInbox();

      const mapped = (Array.isArray(list) ? list : [])
        .map(mapToFinanceRow)
        .filter(x => !!x && !!x.id)
        .filter(x => Number.isFinite(Number(x.amount)));


      const t0 = mid(new Date());
      mapped.sort((a, b) => {
        const aPaid = nnum(a.amount) > 0 && Math.max(nnum(a.amount) - nnum(a.paidAmount), 0) <= 0;
        const bPaid = nnum(b.amount) > 0 && Math.max(nnum(b.amount) - nnum(b.paidAmount), 0) <= 0;

        const aDueIso =
          a.dueDate ??
          (a.invoiceDate ? addDaysIso(a.invoiceDate, FIN_DUE_DAYS_DEFAULT) : null) ??
          (a.approvedAtIso ? addDaysIso(a.approvedAtIso, FIN_DUE_DAYS_DEFAULT) : null);

        const bDueIso =
          b.dueDate ??
          (b.invoiceDate ? addDaysIso(b.invoiceDate, FIN_DUE_DAYS_DEFAULT) : null) ??
          (b.approvedAtIso ? addDaysIso(b.approvedAtIso, FIN_DUE_DAYS_DEFAULT) : null);
        const aDue = parseMid(aDueIso) ?? 0;
        const bDue = parseMid(bDueIso) ?? 0;

        const aRest = Math.max(nnum(a.amount) - nnum(a.paidAmount), 0);
        const bRest = Math.max(nnum(b.amount) - nnum(b.paidAmount), 0);

        const aOver = (!aPaid && aRest > 0 && aDue && aDue < t0) ? 1 : 0;
        const bOver = (!bPaid && bRest > 0 && bDue && bDue < t0) ? 1 : 0;

        if (aOver !== bOver) return bOver - aOver;

        // дальше сорт по сроку
        return (aDue || 0) - (bDue || 0);
      });

      nextRows = mapped;

      const rep = computeFinanceRep(mapped, {
        dueDaysDefault: FIN_DUE_DAYS_DEFAULT,
        criticalDays: FIN_CRITICAL_DAYS,
        periodFromIso: finFrom,
        periodToIso: finTo,
      });
      setFinRows(mapped);
      setFinRep(rep);
      await fetchFinSpendRows();

    } catch (e: any) {
      console.warn("[director] fetchFinance:", e?.message ?? e);
      if (nextRows) {
        setFinRows(nextRows);
        setFinRep(computeFinanceRep(nextRows, { dueDaysDefault: FIN_DUE_DAYS_DEFAULT, criticalDays: FIN_CRITICAL_DAYS }));
      }
      try { await fetchFinSpendRows(); } catch { }
    } finally {
      setFinLoading(false);
    }
  }, [finFrom, finTo, fetchFinSpendRows]);



  useDirectorLifecycle({
    dirTab,
    finFrom,
    finTo,
    repFrom,
    repTo,
    fetchRows,
    fetchProps,
    fetchFinance,
    fetchReportOptions,
    fetchReport,
    showRtToast,
  });

  const {
    exportRequestExcel,
    openRequestPdf,
    isRequestPdfBusy,
    rejectRequestItem,
    deleteRequestAll,
    approveRequestAndSend,
  } = useDirectorRequestActions({
    busy,
    supabase,
    screenLock,
    reqDeleteId,
    reqSendId,
    labelForRequest,
    setRows,
    setSheetRequest,
    setActingId,
    setReqDeleteId,
    setReqSendId,
    fetchProps,
    closeSheet,
    showSuccess,
  });

  const {
    isProposalPdfBusy,
    rejectProposalItem,
    openProposalPdf,
    exportProposalExcel,
    approveProposal,
  } = useDirectorProposalActions({
    busy,
    supabase,
    pdfTapLockRef,
    itemsByProp,
    setItemsByProp,
    setDecidingId,
    setActingPropItemId,
    setPropApproveId,
    fetchProps,
    fetchRows,
    closeSheet,
    showSuccess,
  });
  const { loadProposalAttachments, onDirectorReturn } = useDirectorProposalDetail({
    supabase,
    propAttBusyByProp,
    setPropAttBusyByProp,
    setPropAttByProp,
    setPropReturnId,
    setItemsByProp,
    setLoadedByProp,
    setPdfHtmlByProp,
    fetchProps,
    closeSheet,
  });


  const groups: Group[] = useMemo(() => {
    const map = new Map<number | string, PendingRow[]>();
    for (const r of rows) {
      const k = String(r.request_id ?? '');
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    }
    let list = Array.from(map.entries()).map(([request_id, items]) => ({ request_id, items }));


    return list;
  }, [rows, labelForRequest]);


  const foremanRequestsCount = groups.length; // кол-во заявок
  const foremanPositionsCount = rows.length;  // кол-во позиций

  const { toggleExpand, ProposalRow } = useDirectorProposalRow({
    busy,
    supabase,
    loadedByProp,
    pdfHtmlByProp,
    propItemsCount,
    loadingPropId,
    loadingPropRef,
    lastTapRef,
    setLoadingPropId,
    setItemsByProp,
    setLoadedByProp,
    setPdfHtmlByProp,
    setReqItemNoteById,
    preloadProposalRequestIds,
    loadProposalAttachments,
    openProposalSheet,
    fmtDateOnly,
  });

  const {
    openSupplier,
    openFinKind,
    onFinancePdf,
    onSupplierPdf,
    financePeriodShort,
    financeTitle,
    supplierPdfBusy,
    financeTopLoading,
    onCloseFinanceTop,
    applyFinPeriod,
    clearFinPeriod,
  } = useDirectorFinancePanel({
    busy,
    supabase,
    finPage,
    finFrom,
    finTo,
    finRows,
    finSpendRows,
    finLoading,
    finSupplier,
    finKindName,
    fmtDateOnly,
    pushFin,
    popFin,
    closeFinance,
    setFinSupplier,
    setFinKindName,
    setFinKindList,
    setFinFrom,
    setFinTo,
    setFinPeriodOpen,
    fetchFinance,
    FIN_DUE_DAYS_DEFAULT,
    FIN_CRITICAL_DAYS,
  });

  const financePeriodUi = useMemo(() => ({
    cardBg: UI.cardBg,
    text: UI.text,
    sub: UI.sub,
    border: "rgba(255,255,255,0.14)",
    accentBlue: "#3B82F6",
    approve: "#22C55E",
  }), []);

  const sheetTitle = useMemo(() => {
    if (sheetKind === "request" && sheetRequest) {
      return `Заявка ${labelForRequest(sheetRequest.request_id)}`;
    }
    if (sheetKind === "proposal" && sheetProposalId) {
      const p = propsHeads.find((x) => String(x.id) === String(sheetProposalId));
      const pretty = String(p?.pretty ?? "").trim();
      return pretty ? `Предложение ${pretty}` : `Предложение #${String(sheetProposalId).slice(0, 8)}`;
    }
    return "—";
  }, [sheetKind, sheetRequest, sheetProposalId, propsHeads, labelForRequest]);

  return (
    <View style={[s.container, { backgroundColor: UI.bg }]}>
      <DirectorDashboard
        HEADER_MAX={HEADER_MAX}
        HEADER_MIN={HEADER_MIN}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        headerHeight={headerHeight}
        headerShadow={headerShadow}
        titleSize={titleSize}
        subOpacity={subOpacity}

        dirTab={dirTab}
        setDirTab={setDirTab}
        tab={tab}
        setTab={setTab}
        closeSheet={closeSheet}

        groups={groups as any}
        propsHeads={propsHeads as any}
        loadingRows={loadingRows}
        loadingProps={loadingProps}

        foremanRequestsCount={foremanRequestsCount}
        foremanPositionsCount={foremanPositionsCount}
        buyerPropsCount={buyerPropsCount}
        buyerPositionsCount={buyerPositionsCount}

        labelForRequest={(rid: any) => labelForRequest(rid)}
        fmtDateOnly={fmtDateOnly}
        submittedAtByReq={submittedAtByReq}

        openRequestSheet={openRequestSheet as any}
        ProposalRow={ProposalRow as any}
        screenLock={screenLock}

        ensureSignedIn={ensureSignedIn}
        fetchRows={fetchRows as any}
        fetchProps={fetchProps as any}
        rtToast={rtToast}

        finLoading={finLoading}
        finRows={finRows as any}
        finRep={finRep as any}
        finSpendRows={finSpendRows as any}
        money={money}
        FIN_DUE_DAYS_DEFAULT={FIN_DUE_DAYS_DEFAULT}
        FIN_CRITICAL_DAYS={FIN_CRITICAL_DAYS}
        fetchFinance={fetchFinance as any}
        finFrom={finFrom}
        finTo={finTo}

        openFinancePage={(page: any) => openFinancePage(page)}
        openReports={() => void openReports()}
        reportsPeriodShort={repPeriodShort}
      />

      <DirectorFinanceCardModal
        visible={finOpen}
        onClose={onCloseFinanceTop}
        title={financeTitle}
        periodShort={financePeriodShort}
        loading={financeTopLoading}
        onOpenPeriod={openFinPeriod}
        onRefresh={() => void fetchFinance()}
        onPdf={finPage === "supplier" ? onSupplierPdf : onFinancePdf}
        overlay={
          finPeriodOpen ? (
            <PeriodPickerSheet
              visible={finPeriodOpen}
              onClose={closeFinPeriod}
              initialFrom={finFrom || ""}
              initialTo={finTo || ""}
              onApply={applyFinPeriod}
              onClear={clearFinPeriod}
              ui={financePeriodUi}
            />
          ) : null
        }
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          <DirectorFinanceContent
            finPage={finPage}
            finLoading={finLoading}
            finRep={finRep}
            finSpendRows={finSpendRows}
            finKindName={finKindName}
            finKindList={finKindList}
            finSupplier={finSupplier}
            supplierPdfBusy={supplierPdfBusy}
            FIN_CRITICAL_DAYS={FIN_CRITICAL_DAYS}
            pushFin={pushFin}
            openSupplier={openSupplier}
            openFinKind={openFinKind}
            onSupplierPdf={onSupplierPdf}
            fmtDateOnly={fmtDateOnly}
          />
        </ScrollView>
      </DirectorFinanceCardModal>
      <DirectorReportsModal
        visible={repOpen}
        onClose={closeReports}
        repData={repData}
        repPeriodShort={repPeriodShort}
        repLoading={repLoading}
        repPeriodOpen={repPeriodOpen}
        onOpenPeriod={() => setRepPeriodOpen(true)}
        onClosePeriod={() => setRepPeriodOpen(false)}
        repFrom={repFrom}
        repTo={repTo}
        onApplyPeriod={(from: string, to: string) => void applyReportPeriod(from || null, to || null)}
        onClearPeriod={clearReportPeriod}
        repObjOpen={repObjOpen}
        onCloseRepObj={() => setRepObjOpen(false)}
        repOptObjects={repOptObjects}
        applyObjectFilter={applyObjectFilter}
        repObjectName={repObjectName}
        onOpenRepObj={() => setRepObjOpen(true)}
        repOptLoading={repOptLoading}
        repTab={repTab}
        setRepTab={setRepTab}
        onRefresh={refreshReports}
      />

      <DirectorSheetModal
        isVisible={isSheetOpen}
        onClose={closeSheet}
        sheetTitle={sheetTitle}
        sheetKind={sheetKind}
        sheetRequest={sheetRequest}
        sheetProposalId={sheetProposalId}
        screenLock={screenLock}
        actingId={actingId}
        reqDeleteId={reqDeleteId}
        reqSendId={reqSendId}
        isRequestPdfBusy={isRequestPdfBusy}
        onRejectItem={rejectRequestItem}
        onDeleteAll={deleteRequestAll}
        onOpenPdf={openRequestPdf}
        onExportExcel={exportRequestExcel}
        onApproveAndSend={approveRequestAndSend}
        loadedByProp={loadedByProp}
        itemsByProp={itemsByProp}
        propsHeads={propsHeads}
        propApproveId={propApproveId}
        propReturnId={propReturnId}
        decidingId={decidingId}
        actingPropItemId={actingPropItemId}
        propAttByProp={propAttByProp}
        propAttBusyByProp={propAttBusyByProp}
        reqItemNoteById={reqItemNoteByIdRef.current}
        propReqIdsByProp={propReqIdsByPropRef.current}
        reqMetaById={reqMetaByIdRef.current}
        isProposalPdfBusy={isProposalPdfBusy}
        loadProposalAttachments={loadProposalAttachments}
        onOpenAttachment={(url, fileName) => {
          void openSignedUrlUniversal(url, fileName);
        }}
        rejectProposalItem={rejectProposalItem}
        onDirectorReturn={onDirectorReturn}
        openProposalPdf={openProposalPdf}
        exportProposalExcel={exportProposalExcel}
        approveProposal={approveProposal}
      />

    </View>
  );
}
