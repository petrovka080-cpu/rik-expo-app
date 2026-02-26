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

import { toFilterId, shortId, fmtDateOnly } from "../../src/screens/director/director.helpers";

import * as XLSX from 'xlsx';
import {
  listDirectorProposalsPending,
  exportRequestPdf,
} from "../../src/lib/catalog_api";
import {
  type Tab,
  type DirTopTab,
  type PendingRow,
  type Group,
  type ProposalHead,
  type ProposalItem,
  type ProposalAttachmentRow,
  type SheetKind,
  type RequestMeta,
  type RtToast,
} from "../../src/screens/director/director.types";

import { listAccountantInbox } from "../../src/lib/api/accountant";

import { useGlobalBusy } from '../../src/ui/GlobalBusy';
import RNModal from "react-native-modal";
import { supabase, ensureSignedIn } from '../../src/lib/supabaseClient';
import { runPdfTop } from "../../src/lib/pdfRunner";
import { Ionicons } from '@expo/vector-icons';
import SendPrimaryButton from "../../src/ui/SendPrimaryButton";
import DeleteAllButton from "../../src/ui/DeleteAllButton";
import RejectItemButton from "../../src/ui/RejectItemButton";
import DirectorFinanceCardModal from "../../src/screens/director/DirectorFinanceCardModal";
import DirectorFinanceDebtModal from "../../src/screens/director/DirectorFinanceDebtModal";
import DirectorFinanceSpendModal from "../../src/screens/director/DirectorFinanceSpendModal";
import DirectorFinanceKindSuppliersModal from "../../src/screens/director/DirectorFinanceKindSuppliersModal";
import DirectorFinanceSupplierModal from "../../src/screens/director/DirectorFinanceSupplierModal";
import {
  fetchDirectorWarehouseReport,
  fetchDirectorWarehouseReportOptions,
} from "../../src/lib/api/director_reports";


export default function DirectorScreen() {
  const busy = useGlobalBusy();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('foreman');

  const [dirTab, setDirTab] = useState<DirTopTab>("Заявки");

  type FinPage = "home" | "debt" | "spend" | "kind" | "supplier";

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

  type RepTab = "materials" | "discipline";

  type RepRow = {
    rik_code: string;
    name_human_ru?: string;
    uom: string;
    qty_total: number;
    docs_cnt: number;
    qty_free: number;
    docs_free: number;
  };

  type RepWho = { who: string; items_cnt: number };

  type RepKpi = {
    issues_total: number;
    issues_no_obj: number;
    items_total: number;
    items_free: number;
  };

  type RepPayload = {
    meta?: { from?: string; to?: string; object_name?: string | null };
    kpi?: RepKpi;
    rows?: RepRow[];
    discipline_who?: RepWho[];
  };

  const [repOpen, setRepOpen] = useState(false);
  const [repTab, setRepTab] = useState<RepTab>("materials");
  const [repPeriodOpen, setRepPeriodOpen] = useState(false);
  const [repObjOpen, setRepObjOpen] = useState(false);
  const [repFrom, setRepFrom] = useState<string | null>(null);
  const [repTo, setRepTo] = useState<string | null>(null);
  const [repObjectName, setRepObjectName] = useState<string | null>(null); // пока null = все

  const [repLoading, setRepLoading] = useState(false);
  const [repData, setRepData] = useState<RepPayload | null>(null);
  const [repOptLoading, setRepOptLoading] = useState(false);
  const [repOptObjects, setRepOptObjects] = useState<string[]>([]);
  const [repOptObjectIdByName, setRepOptObjectIdByName] = useState<Record<string, string | null>>({});

  const isoDate = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const minusDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d;
  };

  useEffect(() => {
    if (repFrom || repTo) return;
    const to = isoDate(new Date());
    const from = isoDate(minusDays(30));
    setRepFrom(from);
    setRepTo(to);
  }, [repFrom, repTo]);

  const repPeriodShort = useMemo(() => {
    return repFrom || repTo
      ? `${repFrom ? fmtDateOnly(repFrom) : "—"} → ${repTo ? fmtDateOnly(repTo) : "—"}`
      : "Последние 30 дней";
  }, [repFrom, repTo]);

  const fetchReport = useCallback(async (objectNameArg?: string | null) => {
    const from = repFrom ? String(repFrom).slice(0, 10) : isoDate(minusDays(30));
    const to = repTo ? String(repTo).slice(0, 10) : isoDate(new Date());
    const objectName = objectNameArg === undefined ? repObjectName : objectNameArg;

    setRepLoading(true);
    try {
      const payload = await fetchDirectorWarehouseReport({
        from,
        to,
        objectName: objectName ?? null,
        objectIdByName: repOptObjectIdByName,
      });
      setRepData((payload ?? null) as any);
    } catch (e: any) {
      console.warn("[director] fetchReport:", e?.message ?? e);
      setRepData(null);
      Alert.alert("Отчеты", e?.message ?? "Не удалось получить отчет");
    } finally {
      setRepLoading(false);
    }
  }, [repFrom, repTo, repObjectName, repOptObjectIdByName]);

  const applyObjectFilter = useCallback(async (obj: string | null) => {
    const busyKey = "director.report.object.filter";
    if (busy.isBusy(busyKey)) return;
    setRepObjectName(obj);
    await busy.run(
      async () => {
        await fetchReport(obj);
        return true;
      },
      {
        key: busyKey,
        label: "Пересчитываем отчет по объекту...",
        minMs: 500,
      }
    );
  }, [busy, fetchReport]);

  const fetchReportOptions = useCallback(async () => {
    const from = repFrom ? String(repFrom).slice(0, 10) : isoDate(minusDays(30));
    const to = repTo ? String(repTo).slice(0, 10) : isoDate(new Date());

    setRepOptLoading(true);
    try {
      const opt = await fetchDirectorWarehouseReportOptions({
        from,
        to,
      });
      setRepOptObjects(Array.isArray(opt.objects) ? opt.objects : []);
      setRepOptObjectIdByName(opt.objectIdByName ?? {});
    } catch (e: any) {
      console.warn("[director] fetchReportOptions:", e?.message ?? e);
      setRepOptObjects([]);
      setRepOptObjectIdByName({});
    } finally {
      setRepOptLoading(false);
    }
  }, [repFrom, repTo]);

  const applyReportPeriod = useCallback(async (nextFrom: string | null, nextTo: string | null) => {
    setRepFrom(nextFrom);
    setRepTo(nextTo);
    setRepObjectName(null);
    setRepPeriodOpen(false);

    const from = nextFrom ? String(nextFrom).slice(0, 10) : isoDate(minusDays(30));
    const to = nextTo ? String(nextTo).slice(0, 10) : isoDate(new Date());

    setRepOptLoading(true);
    setRepLoading(true);
    try {
      const opt = await fetchDirectorWarehouseReportOptions({
        from,
        to,
      });
      setRepOptObjects(Array.isArray(opt.objects) ? opt.objects : []);
      setRepOptObjectIdByName(opt.objectIdByName ?? {});

      const payload = await fetchDirectorWarehouseReport({
        from,
        to,
        objectName: null,
        objectIdByName: opt.objectIdByName ?? {},
      });
      setRepData((payload ?? null) as any);
    } catch (e: any) {
      console.warn("[director] applyReportPeriod:", e?.message ?? e);
      setRepData(null);
      setRepOptObjects([]);
      setRepOptObjectIdByName({});
      Alert.alert("Отчеты", e?.message ?? "Не удалось пересчитать отчет");
    } finally {
      setRepOptLoading(false);
      setRepLoading(false);
    }
  }, []);

  const openReports = useCallback(async () => {
    setRepOpen(true);
    setRepTab("materials");
    await fetchReportOptions();
    await fetchReport(null);
  }, [fetchReportOptions, fetchReport]);
  const closeReports = useCallback(() => {
    setRepOpen(false);
    setRepPeriodOpen(false);
  }, []);


  const FIN_DUE_DAYS_DEFAULT = 7;
  const FIN_CRITICAL_DAYS = 14;
  const [finKindName, setFinKindName] = useState<string>("");
  const [finKindList, setFinKindList] = useState<any[]>([]);
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  const openSupplier = useCallback((s: any) => {
    const supplierName = (() => {
      if (typeof s === "string") return s.trim() || "—";
      const v =
        s?.supplier?.supplier ??
        s?.supplier ??
        s?.name ??
        "";
      return String(v).trim() || "—";
    })();

    const kindName = (() => {
      if (typeof s === "string") return "";
      const v = s?._kindName ?? s?.kindName ?? "";
      return String(v).trim();
    })();

    const inPeriod = (iso: any) => {
      const d = String(iso ?? "").slice(0, 10);
      if (!d) return true;
      if (finFrom && d < String(finFrom).slice(0, 10)) return false;
      if (finTo && d > String(finTo).slice(0, 10)) return false;
      return true;
    };

    let allowedProposalIds: Set<string> | null = null;
    const proposalNoById: Record<string, string> = {};

    if (kindName) {
      const spend = (Array.isArray(finSpendRows) ? finSpendRows : [])
        .filter((r: any) => String(r?.supplier ?? "").trim() === supplierName)
        .filter((r: any) => String(r?.kind_name ?? "").trim() === kindName)
        .filter((r: any) => inPeriod(r?.director_approved_at ?? r?.approved_at ?? r?.approvedAtIso));

      allowedProposalIds = new Set(
        spend.map((r: any) => String(r?.proposal_id ?? "").trim()).filter(Boolean)
      );

      for (const r of spend) {
        const pid = String(r?.proposal_id ?? "").trim();
        const pno = String(r?.proposal_no ?? "").trim();
        if (pid && pno) proposalNoById[pid] = pno;
      }
    }

    const fin = (Array.isArray(finRows) ? finRows : [])
      .filter((r: any) => String(r?.supplier ?? "").trim() === supplierName)
      .filter((r: any) => inPeriod(r?.approvedAtIso ?? r?.approved_at ?? r?.director_approved_at))
      .filter((r: any) => {
        if (!allowedProposalIds) return true;
        const pid = String(r?.proposalId ?? r?.proposal_id ?? "").trim();
        return pid && allowedProposalIds.has(pid);
      });

    const t0 = mid(new Date());
    const dueDays = FIN_DUE_DAYS_DEFAULT;

    const pickIso = (...vals: any[]) => {
      for (const v of vals) {
        const s = String(v ?? "").trim();
        if (!s) continue;
        return s.slice(0, 10);
      }
      return null;
    };

    const pickApprovedIso = (r: any) =>
      pickIso(
        r?.approvedAtIso,
        r?.director_approved_at,
        r?.approved_at,
        r?.approvedAt,
        r?.approved_at_iso
      );

    const pickInvoiceIso = (r: any) =>
      pickIso(r?.invoiceDate, r?.invoice_date, r?.invoiceIso, r?.invoice_at, r?.created_at, r?.raw?.created_at);


    const pickAmount = (r: any) =>
      nnum(r?.amount ?? r?.invoice_amount ?? r?.invoiceAmount ?? r?.approved_amount ?? 0);

    const pickPaid = (r: any) =>
      nnum(r?.paidAmount ?? r?.total_paid ?? r?.totalPaid ?? r?.paid_amount ?? 0);


    const invoices = fin
      .map((r: any, idx: number) => {
        const amount = pickAmount(r);
        const paid = pickPaid(r);
        const rest = Math.max(amount - paid, 0);

        const pid = String(r?.proposalId ?? r?.proposal_id ?? "").trim();
        const invNo = String(r?.invoiceNumber ?? r?.invoice_number ?? "").trim();

        const approvedIso =
          pickApprovedIso(r) ??
          pickIso(r?.raw?.director_approved_at, r?.raw?.approved_at, r?.raw?.approvedAtIso);

        const invoiceIso =
          pickInvoiceIso(r) ??
          pickIso(r?.raw?.invoice_date, r?.raw?.invoice_at, r?.raw?.created_at);


        const pno = pid ? String(proposalNoById[pid] ?? r?.proposal_no ?? "").trim() : "";
        const title =
          invNo ? `Счёт №${invNo}` :
            pno ? `Предложение ${pno}` :
              pid ? `Предложение #${pid.slice(0, 8)}` :
                "Счёт";

        const dueIso =
          r?.dueDate ??
          r?.due_date ??
          (invoiceIso ? addDaysIso(String(invoiceIso).slice(0, 10), dueDays) : null) ??
          (approvedIso ? addDaysIso(String(approvedIso).slice(0, 10), dueDays) : null);

        const dueMid = parseMid(dueIso) ?? 0;
        const isOverdue = rest > 0 && !!dueMid && dueMid < t0;

        let isCritical = false;
        if (isOverdue && dueMid) {
          const days = Math.floor((t0 - dueMid) / (24 * 3600 * 1000));
          isCritical = days >= FIN_CRITICAL_DAYS;
        }

        const key = [
          pid || "",
          invNo || "",
          String(invoiceIso ?? ""),
          String(approvedIso ?? ""),
          String(idx),
        ].join("|");

        return {
          id: key,
          title,
          amount,
          paid,
          rest,
          isOverdue,
          isCritical,
          approvedIso: approvedIso ? String(approvedIso) : null,
          invoiceIso: invoiceIso ? String(invoiceIso) : null,
          dueIso: dueIso ? String(dueIso) : null,
        };
      })
      .filter((x: any) => x.amount > 0 || x.rest > 0);

    const debtAmount = invoices.reduce((s2: number, x: any) => s2 + Math.max(nnum(x.rest), 0), 0);
    const debtCount = invoices.filter((x: any) => Math.max(nnum(x.rest), 0) > 0).length;
    const overdueCount = invoices.filter((x: any) => x.isOverdue && Math.max(nnum(x.rest), 0) > 0).length;
    const criticalCount = invoices.filter((x: any) => x.isCritical && Math.max(nnum(x.rest), 0) > 0).length;

    const payload: any = {
      supplier: supplierName,
      _kindName: kindName || "",
      amount: debtAmount,
      count: debtCount,
      overdueCount,
      criticalCount,
      invoices,
    };

    setFinSupplier(payload);
    pushFin("supplier");


  }, [finRows, finSpendRows, finFrom, finTo]);

  const closeSupplier = useCallback(() => {
    setFinSupplier(null);
    popFin();
  }, [popFin]);



  const openFinKind = useCallback((kindName: string, list: any[]) => {
    setFinKindName(String(kindName || ""));
    setFinKindList(Array.isArray(list) ? list : []);
    pushFin("kind");
  }, [pushFin]);

  const closeFinKind = useCallback(() => {
    setFinKindName("");
    setFinKindList([]);
    popFin();
  }, [popFin]);

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

  const onFinancePdf = useCallback(async () => {
    await runPdfTop({
      busy,
      supabase,
      key: "pdf:director:finance",
      label: "Готовлю управленческий отчёт...",
      mode: Platform.OS === "web" ? "preview" : "share",
      fileName: "Director_Management_Report",
      getRemoteUrl: async () => {

        const { exportDirectorManagementReportPdf } = await import("../../src/lib/api/pdf_director");
        return await exportDirectorManagementReportPdf({
          periodFrom: finFrom,
          periodTo: finTo,
          financeRows: finRows,
          spendRows: finSpendRows,
          topN: 15,
          dueDaysDefault: FIN_DUE_DAYS_DEFAULT,
          criticalDays: FIN_CRITICAL_DAYS,
        });
      },
    });
  }, [
    busy,
    supabase,
    finFrom,
    finTo,
    finRows,
    finSpendRows,
    FIN_DUE_DAYS_DEFAULT,
    FIN_CRITICAL_DAYS,
  ]);


  const onSupplierPdf = useCallback(async () => {
    const supName = String((finSupplier as any)?.supplier ?? "").trim();
    if (!supName) {
      Alert.alert("PDF", "Поставщик не выбран");
      return;
    }

    await runPdfTop({
      busy,
      supabase,
      key: `pdf:director:supplier:${supName}`,
      label: "Готовлю сводку...",
      mode: Platform.OS === "web" ? "preview" : "share",
      fileName: `Supplier_${supName}`,
      getRemoteUrl: async () => {
        const kindName = String((finSupplier as any)?._kindName ?? "").trim();

        const inPeriod = (iso: any) => {
          const d = String(iso ?? "").slice(0, 10);
          if (!d) return true;
          if (finFrom && d < String(finFrom).slice(0, 10)) return false;
          if (finTo && d > String(finTo).slice(0, 10)) return false;
          return true;
        };

        let financeFiltered = (Array.isArray(finRows) ? finRows : [])
          .filter((r: any) => String(r?.supplier ?? "").trim() === supName)
          .filter((r: any) => inPeriod(r?.approvedAtIso ?? r?.approved_at ?? r?.director_approved_at));

        let spendFiltered = (Array.isArray(finSpendRows) ? finSpendRows : [])
          .filter((r: any) => String(r?.supplier ?? "").trim() === supName)
          .filter((r: any) => inPeriod(r?.director_approved_at ?? r?.approved_at ?? r?.approvedAtIso));

        if (kindName) {
          spendFiltered = spendFiltered.filter((r: any) => String(r?.kind_name ?? "").trim() === kindName);
        }

        spendFiltered = (spendFiltered as any[]).filter((r) => String(r?.proposal_id ?? "").trim());

        const { exportDirectorSupplierSummaryPdf } = await import("../../src/lib/api/pdf_director");
        return await exportDirectorSupplierSummaryPdf({
          supplier: supName,
          periodFrom: finFrom,
          periodTo: finTo,
          financeRows: financeFiltered,
          spendRows: spendFiltered,
        });
      },
    });
  }, [busy, supabase, finSupplier, finFrom, finTo, finRows, finSpendRows]);


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

  const [rows, setRows] = useState<PendingRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);
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


  const didInit = useRef(false);
  const fetchTicket = useRef(0);
  const lastNonEmptyRows = useRef<PendingRow[]>([]);


  const [propsHeads, setPropsHeads] = useState<ProposalHead[]>([]);
  const [buyerPropsCount, setBuyerPropsCount] = useState<number>(0);
  const [buyerPositionsCount, setBuyerPositionsCount] = useState<number>(0);
  const [propItemsCount, setPropItemsCount] = useState<Record<string, number>>({});
  const [loadingProps, setLoadingProps] = useState(false);

  const [itemsByProp, setItemsByProp] = useState<Record<string, ProposalItem[]>>({});
  const [loadedByProp, setLoadedByProp] = useState<Record<string, boolean>>({});


  const [loadingPropId, setLoadingPropId] = useState<string | null>(null);

  const [decidingId, setDecidingId] = useState<string | null>(null);


  const [actingPropItemId, setActingPropItemId] = useState<number | null>(null);

  const screenLock =
    !!actingId ||
    reqDeleteId != null ||
    reqSendId != null ||
    propApproveId != null ||
    propReturnId != null ||
    actingPropItemId != null;

  const [pdfHtmlByProp, setPdfHtmlByProp] = useState<Record<string, string>>({});
  const [rtToast, setRtToast] = useState<RtToast>({
    visible: false,
    title: '',
    body: '',
    count: 0,
  });

  const rtToastTimerRef = useRef<any>(null);

  const showRtToast = useCallback((title?: string, body?: string) => {
    const t = String(title || "Операция").trim();
    const b = String(body || '').trim();

    if (rtToastTimerRef.current) {
      clearTimeout(rtToastTimerRef.current);
      rtToastTimerRef.current = null;
    }

    setRtToast(prev => {
      const same = prev.visible && prev.title === t && prev.body === b;
      return {
        visible: true,
        title: t,
        body: b,
        count: same ? prev.count + 1 : 1,
      };
    });

    rtToastTimerRef.current = setTimeout(() => {
      setRtToast(prev => ({ ...prev, visible: false }));
    }, 2600);
  }, []);

  const showSuccess = useCallback((msg: string) => {
    showRtToast("Ошибка", msg);
  }, [showRtToast]);
  // ===== КЭШ НОМЕРОВ ЗАЯВОК =====
  const [displayNoByReq, setDisplayNoByReq] = useState<Record<string, string>>({});
  const [submittedAtByReq, setSubmittedAtByReq] = useState<Record<string, string>>({});


  const [reqMetaById, setReqMetaById] = useState<Record<string, RequestMeta>>({});
  const reqMetaByIdRef = useRef<Record<string, RequestMeta>>({});
  useEffect(() => { reqMetaByIdRef.current = reqMetaById; }, [reqMetaById]);
  // ✅ request_item_id -> note (чтобы в proposal-sheet было как у прораба)
  const [reqItemNoteById, setReqItemNoteById] = useState<Record<string, string>>({});
  const reqItemNoteByIdRef = useRef<Record<string, string>>({});
  useEffect(() => { reqItemNoteByIdRef.current = reqItemNoteById; }, [reqItemNoteById]);

  // proposal_id -> [request_id...]
  const [propReqIdsByProp, setPropReqIdsByProp] = useState<Record<string, string[]>>({});
  const propReqIdsByPropRef = useRef<Record<string, string[]>>({});
  useEffect(() => { propReqIdsByPropRef.current = propReqIdsByProp; }, [propReqIdsByProp]);

  const preloadRequestMeta = useCallback(async (reqIds: string[]) => {
    const uniq = Array.from(new Set((reqIds || []).map(String).filter(Boolean)));
    const existing = reqMetaByIdRef.current || {};
    const need = uniq.filter(id => !existing[id]);
    if (!need.length) return;

    try {
      const q = await supabase
        .from("requests")
        .select("id, object_name, object, level_code, system_code, zone_code, site_address_snapshot, note, comment")
        .in("id", need);

      if (q.error) throw q.error;

      const next: Record<string, RequestMeta> = {};
      (q.data || []).forEach((r: any) => {
        const id = String(r?.id || "").trim();
        if (!id) return;
        next[id] = {
          // note_preview больше НЕ используем (и не читаем из view)
          object_name: r?.object_name ?? null,
          object: r?.object ?? null,
          level_code: r?.level_code ?? null,
          system_code: r?.system_code ?? null,
          zone_code: r?.zone_code ?? null,
          site_address_snapshot: r?.site_address_snapshot ?? null,
          note: r?.note ?? null,
          comment: r?.comment ?? null,
        };
      });

      if (Object.keys(next).length) {
        setReqMetaById(prev => ({ ...prev, ...next }));
      }
    } catch (e: any) {
      console.warn("[director] preloadRequestMeta:", e?.message ?? e);
    }
  }, [supabase]);
  const preloadProposalRequestIds = useCallback(async (proposalId: string, requestItemIds: (string | null)[]) => {
    const pid = String(proposalId || "").trim();
    if (!pid) return;

    // если уже есть — не дёргаем
    if (propReqIdsByPropRef.current?.[pid]?.length) return;

    const ids = Array.from(new Set((requestItemIds || []).map(x => String(x || "").trim()).filter(Boolean)));
    if (!ids.length) return;

    try {
      // request_items: id -> request_id
      const q = await supabase
        .from("request_items")
        .select("id, request_id")
        .in("id", ids);

      if (q.error) throw q.error;

      const reqIds = Array.from(new Set((q.data || []).map((r: any) => String(r?.request_id || "").trim()).filter(Boolean)));
      if (!reqIds.length) return;

      setPropReqIdsByProp(prev => ({ ...prev, [pid]: reqIds }));
      await preloadRequestMeta(reqIds);
    } catch (e: any) {
      console.warn("[director] preloadProposalRequestIds:", e?.message ?? e);
    }
  }, [supabase, preloadRequestMeta]);

  const labelForRequest = useCallback((rid: number | string | null | undefined, fallbackDocNo?: string | null) => {
    const key = String(rid ?? '');
    if (fallbackDocNo && fallbackDocNo.trim()) return fallbackDocNo.trim();
    const d = displayNoByReq[key];
    if (d && d.trim()) return d.trim();
    return `#${shortId(rid)}`;
  }, [displayNoByReq]);

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


  const isPaidRow = (r: FinanceRow) => {
    const amt = nnum(r.amount);
    const paidAmt = nnum(r.paidAmount);
    const rest = Math.max(amt - paidAmt, 0);

    // если остаток = 0 -> точно оплачено
    if (amt > 0 && rest <= 0) return true;

    // статусом НЕ решаем (иначе "оплачено частично" выкинет частичные)
    return false;
  };

  const getDueIso = (r: FinanceRow) =>
    r.dueDate ??
    (r.invoiceDate ? addDaysIso(r.invoiceDate, FIN_DUE_DAYS_DEFAULT) : null) ??
    (r.approvedAtIso ? addDaysIso(r.approvedAtIso, FIN_DUE_DAYS_DEFAULT) : null);

  const preloadDisplayNos = useCallback(async (reqIds: Array<number | string>) => {
    const needed = Array.from(
      new Set(
        reqIds
          .map(x => String(x ?? '').trim())
          .filter(Boolean)
          .filter(id => displayNoByReq[id] == null || submittedAtByReq[id] == null)
      )
    );
    if (!needed.length) return;

    try {
      const { data, error } = await supabase
        .from('requests')
        .select('id, display_no, submitted_at')
        .in('id', needed);

      if (error) throw error;

      const mapDn: Record<string, string> = {};
      const mapSub: Record<string, string> = {};

      for (const r of (data ?? []) as any[]) {
        const id = String(r?.id ?? '').trim();
        if (!id) continue;

        const dn = String(r?.display_no ?? '').trim();
        const sa = r?.submitted_at ?? null;

        if (dn) mapDn[id] = dn;
        if (sa) mapSub[id] = String(sa);
      }

      if (Object.keys(mapDn).length) setDisplayNoByReq(prev => ({ ...prev, ...mapDn }));
      if (Object.keys(mapSub).length) setSubmittedAtByReq(prev => ({ ...prev, ...mapSub }));
    } catch (e) {
      console.warn('[director] preloadDisplayNos]:', (e as any)?.message ?? e);
    }
  }, [displayNoByReq, submittedAtByReq]);


  const fetchRows = useCallback(async () => {
    const my = ++fetchTicket.current;
    setLoadingRows(true);
    try {
      const { data, error } = await supabase.rpc('list_director_items_stable');
      if (error) throw error;

      const normalized: PendingRow[] = (data ?? []).map((r: any, idx: number) => ({
        id: idx,
        request_id: r.request_id,
        request_item_id: r.request_item_id != null ? String(r.request_item_id) : null,
        name_human: r.name_human ?? '',
        qty: Number(r.qty ?? 0),
        uom: r.uom ?? null,
        rik_code: r.rik_code ?? null,
        app_code: r.app_code ?? null,
        item_kind: r.item_kind ?? null,
        note: r.note ?? null,
      }));

      lastNonEmptyRows.current = normalized;
      if (my === fetchTicket.current) setRows(normalized);

      const ids = Array.from(new Set(normalized.map(r => String(r.request_id ?? '').trim()).filter(Boolean)));
      if (ids.length) await preloadDisplayNos(ids);
    } catch (e) {
      console.error('[director] list_director_items_stable]:', (e as any)?.message ?? e);
    } finally {
      if (my === fetchTicket.current) setLoadingRows(false);
    }
  }, [preloadDisplayNos]);

  const fetchProps = useCallback(async () => {
    setLoadingProps(true);
    try {

      const list = await listDirectorProposalsPending();
      const heads: ProposalHead[] = (list ?? [])
        .filter((x: any) => x && x.id != null && x.submitted_at != null)
        .map((x: any) => ({ id: String(x.id), submitted_at: x.submitted_at, pretty: null }));

      if (!heads.length) { setPropsHeads([]); return; }

      const ids = heads.map(h => h.id);
      const { data, error } = await supabase
        .from('proposals')
        .select('id, proposal_no, id_short, sent_to_accountant_at')
        .in('id', ids);

      if (error || !Array.isArray(data)) { setPropsHeads(heads); return; }

      const okIds = new Set<string>(
        data.filter(r => !r?.sent_to_accountant_at).map(r => String(r.id))
      );

      const prettyMap: Record<string, string> = {};
      for (const r of data) {
        const id = String((r as any).id);
        const pn = String((r as any).proposal_no ?? '').trim();   // ✅ PR-0024/2026
        const short = (r as any).id_short;
        const pretty = pn || (short != null ? `PR-${String(short)}` : '');
        if (id && pretty) prettyMap[id] = pretty;
      }

      let filtered = heads
        .filter(h => okIds.has(h.id))
        .map(h => ({ ...h, pretty: prettyMap[h.id] ?? h.pretty ?? null }));


      try {
        const propIds = filtered.map(h => h.id);
        if (propIds.length) {
          const q = await supabase
            .from('proposal_items')
            .select('proposal_id')
            .in('proposal_id', propIds);

          const nonEmpty = new Set((q.data || []).map((r: any) => String(r.proposal_id)));
          filtered = filtered.filter(h => nonEmpty.has(String(h.id)));
        }
      } catch { }

      setPropsHeads(filtered);
      try {
        const propIds = filtered.map(h => h.id);
        if (propIds.length) {
          const qCnt = await supabase
            .from('proposal_items')
            .select('proposal_id')
            .in('proposal_id', propIds);

          const map: Record<string, number> = {};
          for (const r of (qCnt.data || []) as any[]) {
            const pid = String(r?.proposal_id ?? '');
            if (!pid) continue;
            map[pid] = (map[pid] || 0) + 1;
          }
          setPropItemsCount(map);
        } else {
          setPropItemsCount({});
        }
      } catch {
        setPropItemsCount({});
      }

      setBuyerPropsCount(filtered.length);

      try {
        const propIds = filtered.map(h => h.id);
        if (propIds.length) {
          const q = await supabase
            .from('proposal_items_view')
            .select('proposal_id')
            .in('proposal_id', propIds);

          setBuyerPositionsCount(!q.error && Array.isArray(q.data) ? q.data.length : 0);
        } else {
          setBuyerPositionsCount(0);
        }
      } catch {
        setBuyerPositionsCount(0);
      }

    } catch (e) {
      console.error('[director] proposals list]:', (e as any)?.message ?? e);
      setPropsHeads([]);
    } finally {
      setLoadingProps(false);
    }
  }, []);


  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    (async () => {
      try {
        await ensureSignedIn();
        await fetchRows();
        await fetchProps();
      } catch (e) {
        console.warn('[Director] ensureSignedIn]:', (e as any)?.message || e);
      }
    })();
  }, [fetchRows, fetchProps]);

  useEffect(() => {
    return () => {
      try {
        if (rtToastTimerRef.current) clearTimeout(rtToastTimerRef.current);
      } catch { }
    };
  }, []);

  useEffect(() => {
    if (dirTab !== "Финансы") return;
    void fetchFinance();
  }, [dirTab, fetchFinance]);


  useEffect(() => {
    const ch = supabase.channel('notif-director-rt')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: "role=eq.director"
      }, (payload: any) => {
        const n = payload?.new || {};
        showRtToast(n.title, n.body);
        void fetchRows();
        void fetchProps();
      })
      .subscribe();

    return () => {
      try { ch.unsubscribe(); } catch { }
      try { supabase.removeChannel(ch); } catch { }
    };

  }, [fetchRows, fetchProps, showRtToast]);


  // Экспорт заявки в настоящий XLSX (без предупреждения Excel)
  const exportRequestExcel = useCallback((g: Group) => {
    const rows = g.items;
    if (!rows.length) {
      Alert.alert('Экспорт', 'Нет позиций для выгрузки.');
      return;
    }

    const safe = (v: any) =>
      v === null || v === undefined ? '' : String(v).replace(/[\r\n]+/g, ' ').trim();

    const title = labelForRequest(g.request_id);
    const sheetName =
      title.replace(/[^\w\u0400-\u04FF0-9]/g, '_').slice(0, 31) || 'Заявка';

    // Данные для Excel: первая строка — заголовки
    const data: any[][] = [];
    data.push(['№', 'Наименование', 'Кол-во', 'Ед. изм.', 'Применение', 'Примечание']);

    rows.forEach((it, idx) => {
      data.push([
        idx + 1,
        safe(it.name_human),
        safe(it.qty),
        safe(it.uom),
        safe(it.app_code),
        safe(it.note),
      ]);
    });

    try {
      // 1) создаём книгу и лист
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(data);

      // чуть-чуть красоты: ширина колонок
      ws['!cols'] = [
        { wch: 4 },   // №
        { wch: 40 },  // Наименование
        { wch: 10 },  // Кол-во
        { wch: 10 },  // Ед. изм.
        { wch: 18 },  // Применение
        { wch: 60 },  // Примечание
      ];

      XLSX.utils.book_append_sheet(wb, ws, sheetName);

      // 2) превращаем в бинарный массив
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

      if (Platform.OS === 'web') {
        const blob = new Blob([wbout], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `request-${title}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        Alert.alert(
          'Экспорт',
          'XLSX экспорт сейчас реализован только для Web-версии.',
        );
      }
    } catch (e: any) {
      console.error('[exportRequestExcel]', e?.message ?? e);
      Alert.alert('Ошибка', e?.message ?? 'Не удалось сформировать Excel-файл');
    }
  }, [labelForRequest]);

  const openRequestPdf = useCallback(async (g: any) => {
    const rid = String(g?.request_id ?? "").trim();
    if (!rid) return;

    await runPdfTop({
      busy,
      supabase,
      key: `pdf:req:${rid}`,
      label: "Открываю PDF…",
      mode: "preview",
      fileName: `Заявка_${rid}`,
      getRemoteUrl: () => exportRequestPdf(rid, "preview"),
    });
  }, [busy, supabase]);


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


  /* ===== Карточка предложения (СНАБЖЕНЕЦ) — как у заявок ===== */
  const ProposalRow = React.memo(({ p, screenLock }: { p: ProposalHead; screenLock: boolean }) => {
    const pidStr = String(p.id);
    const pretty = String(p.pretty ?? '').trim();
    const itemsCount = propItemsCount[pidStr] ?? 0;

    // ✅ объявляем ДО return (а не внутри JSX)
    const title = pretty || `#${pidStr.slice(0, 8)}`;

    return (
      <View style={{ marginBottom: 12 }}>
        <View style={s.groupHeader}>
          {/* LEFT */}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.groupTitle} numberOfLines={1}>
              {title}
            </Text>

            <Text style={s.cardMeta} numberOfLines={1}>
              {fmtDateOnly(p.submitted_at)}
            </Text>
          </View>

          {/* RIGHT */}
          <View style={s.rightStack}>
            <View style={s.metaPill}>
              <Text style={s.metaPillText}>{`Позиций ${itemsCount}`}</Text>
            </View>

            <View style={s.rightStackSpacer} />

            <Pressable
              disabled={screenLock}
              onPress={() => {
                if (screenLock) return;
                openProposalSheet(pidStr);

                // ✅ ВАЖНО: грузим вложения ВСЕГДА, даже если loadedByProp уже true
                void loadProposalAttachments(pidStr);

                // состав (как было)
                void toggleExpand(pidStr);
              }}

              style={[s.openBtn, screenLock && { opacity: 0.6 }]}
            >
              <Text style={s.openBtnText}>{loadingPropId === pidStr ? '…' : 'Открыть'}</Text>
            </Pressable>
          </View>

        </View>
      </View>
    );
  });
  const loadProposalAttachments = useCallback(async (pidStr: string) => {
    const pid = String(pidStr || "").trim();
    if (!pid) return;

    // чтобы не дергать 10 раз
    if (propAttBusyByProp[pid]) return;
    setPropAttBusyByProp(prev => ({ ...prev, [pid]: true }));

    try {
      const q = await supabase
        .from("proposal_attachments")
        .select("id, file_name, url, group_key, created_at, bucket_id, storage_path")
        .eq("proposal_id", pid)
        .order("created_at", { ascending: false });

      if (q.error) throw q.error;

      const raw = (q.data || []) as any[];

      const rows: ProposalAttachmentRow[] = [];
      const seen = new Set<string>();

      for (const r of raw) {
        const id = String(r?.id ?? "").trim();
        if (!id) continue;

        if (seen.has(id)) continue;
        seen.add(id);

        let url = (r.url ?? null) as string | null;

        if (!url) {
          const bucket = String(r.bucket_id ?? "").trim();
          const path = String(r.storage_path ?? "").trim();
          if (bucket && path) {
            try {
              const s = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60);
              if (!s.error && s.data?.signedUrl) url = s.data.signedUrl;
            } catch { }
          }
        }

        rows.push({
          id,
          file_name: String(r.file_name ?? "file"),
          url,
          group_key: r.group_key ?? null,
          created_at: r.created_at ?? null,
          bucket_id: r.bucket_id ?? null,
          storage_path: r.storage_path ?? null,
        });
      }

      setPropAttByProp(prev => ({ ...prev, [pid]: rows }));

    } catch (e: any) {
      console.warn("[director] loadProposalAttachments:", e?.message ?? e);
      setPropAttByProp(prev => ({ ...prev, [pid]: [] }));
    } finally {
      setPropAttBusyByProp(prev => ({ ...prev, [pid]: false }));
    }
  }, [supabase, propAttBusyByProp]);
  /* ---------- toggleExpand: грузим состав и HTML (web) ---------- */
  const toggleExpand = useCallback(async (pid: string) => {
    const pidStr = String(pid);

    // ✅ анти-спам по времени (очень важно на телефоне)
    const now = Date.now();
    if (now - lastTapRef.current < 350) return;
    lastTapRef.current = now;

    // ✅ если сейчас уже идет загрузка какого-то предложения — не стартуем вторую
    const anyLoading = Object.values(loadingPropRef.current).some(Boolean);
    if (anyLoading) return;

    // ✅ уже загружено — выходим
    if (loadedByProp[pidStr]) return;

    // ✅ если уже грузим именно это — игнор
    if (loadingPropRef.current[pidStr]) return;

    // ✅ UI: показываем "..." на кнопке
    setLoadingPropId(pidStr);

    loadingPropRef.current[pidStr] = true;

    try {
      await busy.run(async () => {
        try {
          let base: any[] | null = null;
          let plain: any[] | null = null;

          // 1) SNAPSHOT (самый “истинный”, если есть)
          const qSnap = await supabase
            .from("proposal_snapshot_items")
            .select("id, request_item_id, rik_code, name_human, uom, app_code, total_qty")
            .eq("proposal_id", pidStr)
            .order("id", { ascending: true });

          if (!qSnap.error && Array.isArray(qSnap.data) && qSnap.data.length > 0) {
            base = qSnap.data;
          }

          // 2) VIEW (fallback, если snapshot пуст)
          if (!base) {
            const qView = await supabase
              .from("proposal_items_view")
              .select("id, request_item_id, rik_code, name_human, uom, app_code, total_qty")
              .eq("proposal_id", pidStr)
              .order("id", { ascending: true });

            if (!qView.error && Array.isArray(qView.data) && qView.data.length > 0) {
              base = qView.data;
            }
          }

          // 3) PLAIN (fallback + источник цены)
          const qPlain = await supabase
            .from("proposal_items")
            .select("id, request_item_id, rik_code, name_human, uom, app_code, qty, price")
            .eq("proposal_id", pidStr)
            .order("id", { ascending: true });

          if (!qPlain.error && Array.isArray(qPlain.data) && qPlain.data.length > 0) {
            plain = qPlain.data;
          }

          // ---- формируем итог без перетирания ----
          const priceByReqItemId: Record<string, number> = {};
          if (plain) {
            for (const r of plain as any[]) {
              const rid = String(r?.request_item_id ?? "").trim();
              const pr = r?.price;
              if (rid && pr != null && !Number.isNaN(Number(pr))) {
                priceByReqItemId[rid] = Number(pr);
              }
            }
          }

          const effective = base ?? (plain ? plain.map((r: any) => ({ ...r, total_qty: r.qty })) : []);

          let norm = (effective ?? []).map((r: any, i: number) => {
            const reqItemId = r.request_item_id != null ? String(r.request_item_id) : null;
            const price =
              r.price != null
                ? Number(r.price)
                : (reqItemId ? (priceByReqItemId[reqItemId] ?? null) : null);

            return {
              id: Number(r.id ?? i),
              request_item_id: reqItemId,
              rik_code: r.rik_code ?? null,
              name_human: r.name_human ?? "",
              uom: r.uom ?? null,
              app_code: r.app_code ?? null,
              total_qty: Number(r.total_qty ?? r.qty ?? 0),
              price: price,
              item_kind: null as any,
            };
          });

          // item_kind из request_items
          try {
            const ids = Array.from(
              new Set(norm.map((x) => String(x.request_item_id ?? "")).filter(Boolean))
            );
            if (ids.length) {
              const qKinds = await supabase
                .from("request_items")
                .select("id, item_kind, note")
                .in("id", ids);


              if (!qKinds.error && Array.isArray(qKinds.data)) {
                const mapKind: Record<string, string> = {};
                const mapNote: Record<string, string> = {};

                for (const rr of qKinds.data as any[]) {
                  const id = String(rr.id ?? "").trim();
                  const k = String(rr.item_kind ?? "").trim();
                  const n = String(rr.note ?? "").trim();

                  if (id && k) mapKind[id] = k;
                  if (id && n) mapNote[id] = n;
                }

                // item_kind — как было
                norm = norm.map((x) => ({
                  ...x,
                  item_kind: x.request_item_id ? mapKind[String(x.request_item_id)] ?? null : null,
                }));

                // ✅ ДОБАВИЛИ: кэш note для proposal-sheet (чтобы был русский контекст)
                if (Object.keys(mapNote).length) {
                  setReqItemNoteById(prev => ({ ...prev, ...mapNote }));
                }
              }

            }
          } catch { }

          setItemsByProp((prev) => ({ ...prev, [pidStr]: norm }));

          // ✅ подтягиваем request_id(ы) и их контекст для инфо-блока в proposal-sheet
          try {
            const reqItemIds = norm.map(x => x.request_item_id);
            await preloadProposalRequestIds(pidStr, reqItemIds);
          } catch { }

          // ✅ ВОТ ИМЕННО СЮДА. НЕ ВЫШЕ. НЕ НИЖЕ.
          try {
            await loadProposalAttachments(pidStr);
          } catch { }

        } finally {
          setLoadedByProp((prev) => ({ ...prev, [pidStr]: true }));
        }
      }, { key: `dir:loadProp:${pidStr}`, label: "Загружаю состав…", minMs: 900 });

      // web html (опционально)
      if (Platform.OS === "web") {
        setTimeout(async () => {
          try {
            if (pdfHtmlByProp[pidStr]) return;
            const { buildProposalPdfHtml } = await import("../../src/lib/rik_api");
            const html = await buildProposalPdfHtml(pidStr as any);
            setPdfHtmlByProp((prev) => ({ ...prev, [pidStr]: html }));
          } catch { }
        }, 0);
      }
    } catch (e: any) {
      Alert.alert("Ошибка", e?.message ?? "Не удалось загрузить строки предложения");
      setItemsByProp((prev) => ({ ...prev, [pidStr]: [] }));
      setLoadedByProp((prev) => ({ ...prev, [pidStr]: true }));
    } finally {
      loadingPropRef.current[pidStr] = false;

      // ✅ снимаем "..." только если это было текущее
      setLoadingPropId((cur) => (cur === pidStr ? null : cur));
    }
  }, [busy, loadedByProp, pdfHtmlByProp, supabase, preloadProposalRequestIds, loadProposalAttachments]);

  async function onDirectorReturn(proposalId: string | number, note?: string) {
    const pidStr = String(proposalId);

    try {
      const chk = await supabase
        .from('proposals')
        .select('sent_to_accountant_at')
        .eq('id', pidStr)
        .maybeSingle();

      if (!chk.error && chk.data?.sent_to_accountant_at) {
        Alert.alert('Нельзя вернуть', 'Документ уже у бухгалтерии. Вернуть может только бухгалтер.');
        return;
      }

      // ✅ ВАЖНО: это ЛОАДЕР ДЛЯ КРАСНОЙ КНОПКИ "Вернуть/Удалить"
      setPropReturnId(pidStr);

      // ✅ Берём ВСЕ request_item_id из БД
      const q = await supabase
        .from('proposal_items')
        .select('request_item_id')
        .eq('proposal_id', pidStr);

      if (q.error) throw q.error;

      const ids = Array.from(new Set(
        (q.data || []).map((r: any) => String(r?.request_item_id || '').trim()).filter(Boolean)
      ));

      if (!ids.length) {
        Alert.alert('Пусто', 'В предложении нет строк для возврата.');
        return;
      }

      const comment = (note || '').trim() || 'Отклонено директором';

      const payload = ids.map((rid) => ({
        request_item_id: rid,
        decision: 'rejected',
        comment,
      }));

      const res = await supabase.rpc('director_decide_proposal_items', {
        p_proposal_id: pidStr,
        p_decisions: payload,
        p_finalize: true,
      });

      if (res.error) throw res.error;

      setItemsByProp(m => { const c = { ...m }; delete c[pidStr]; return c; });
      setLoadedByProp(m => { const c = { ...m }; delete c[pidStr]; return c; });
      setPdfHtmlByProp(m => { const c = { ...m }; delete c[pidStr]; return c; });

      await fetchProps();
      closeSheet();
    } catch (e: any) {
      Alert.alert('Ошибка', e?.message ?? 'Не удалось вернуть предложение');
    } finally {
      setPropReturnId(null);
    }
  }

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

      {(() => {
        const periodShort =
          finFrom || finTo
            ? `${finFrom ? fmtDateOnly(finFrom) : "—"} → ${finTo ? fmtDateOnly(finTo) : "—"}`
            : "Весь период";

        const title =
          finPage === "debt" ? "Долги и риски"
            : finPage === "spend" ? "Расходы (период)"
              : finPage === "kind" ? (finKindName ? `${finKindName}: поставщики` : "Поставщики")
                : finPage === "supplier" ? (
                  (() => {
                    const s = String((finSupplier as any)?.supplier ?? "").trim();
                    if (!s || s === "—") return "Поставщик";
                    // Если имя короткое или цифровое, добавим контекст
                    if (/^\d+$/.test(s) || s.length < 3) return `Поставщик: ${s}`;
                    return s;
                  })()
                )
                  : "Финансы";

        const supNameForKey = String((finSupplier as any)?.supplier ?? "").trim();
        const topPdfKey =
          finPage === "supplier" ? `pdf:director:supplier:${supNameForKey}` : "pdf:director:finance";
        const supplierPdfBusy = !!supNameForKey && busy.isBusy(`pdf:director:supplier:${supNameForKey}`);


        const onCloseTop = () => {
          if (finPage !== "home") {
            popFin();
            return;
          }
          closeFinance();
        };

        return (
          <DirectorFinanceCardModal
            visible={finOpen}
            onClose={onCloseTop}
            title={title}
            periodShort={periodShort}
            loading={finLoading || busy.isBusy(topPdfKey)}
            onOpenPeriod={() => setFinPeriodOpen(true)}
            onRefresh={() => void fetchFinance()}
            onPdf={finPage === "supplier" ? onSupplierPdf : onFinancePdf}
            overlay={
              finPeriodOpen ? (
                <PeriodPickerSheet
                  visible={finPeriodOpen}
                  onClose={() => setFinPeriodOpen(false)}
                  initialFrom={finFrom || ""}
                  initialTo={finTo || ""}
                  onApply={(from: string, to: string) => {
                    setFinFrom(from || null);
                    setFinTo(to || null);
                    setFinPeriodOpen(false);
                    void fetchFinance();
                  }}
                  onClear={() => {
                    setFinFrom(null);
                    setFinTo(null);
                    setFinPeriodOpen(false);
                    void fetchFinance();
                  }}
                  ui={{
                    cardBg: UI.cardBg,
                    text: UI.text,
                    sub: UI.sub,
                    border: "rgba(255,255,255,0.14)",
                    accentBlue: "#3B82F6",
                    approve: "#22C55E",
                  }}
                />
              ) : null
            }
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 24 }}
            >
              {finPage === "home" ? (
                <View>
                  <Pressable onPress={() => pushFin("debt")} style={[s.mobCard, { marginBottom: 10 }]}>
                    <Text style={{ color: UI.text, fontWeight: "900" }}>Обязательства</Text>
                  </Pressable>

                  <Pressable onPress={() => pushFin("spend")} style={[s.mobCard, { marginBottom: 10 }]}>
                    <Text style={{ color: UI.text, fontWeight: "900" }}>Расходы</Text>
                  </Pressable>
                </View>
              ) : finPage === "debt" ? (
                <DirectorFinanceDebtModal
                  loading={finLoading}
                  rep={finRep}
                  money={money}
                  FIN_CRITICAL_DAYS={FIN_CRITICAL_DAYS}
                  openSupplier={(srow: any) => openSupplier(srow)}
                />
              ) : finPage === "spend" ? (
                <DirectorFinanceSpendModal
                  visible={true}
                  loading={finLoading}
                  sum={finRep?.summary}
                  spendRows={finSpendRows}
                  money={money}
                  onOpenKind={(kindName, list) => openFinKind(kindName, list)}
                  onOpenSupplier={(supplierName: string) => openSupplier({ supplier: supplierName })}
                />
              ) : finPage === "kind" ? (
                <DirectorFinanceKindSuppliersModal
                  loading={finLoading}
                  kindName={finKindName}
                  list={finKindList}
                  money={money}
                  onOpenSupplier={(payload: any) => openSupplier(payload)}
                />
              ) : finPage === "supplier" ? (
                <DirectorFinanceSupplierModal
                  loading={finLoading || supplierPdfBusy}
                  onPdf={onSupplierPdf}
                  supplier={finSupplier}
                  money={money}
                  fmtDateOnly={fmtDateOnly}
                />
              ) : null}
            </ScrollView>
          </DirectorFinanceCardModal>
        );
      })()}
      {(() => {
        const kpi: RepKpi | null = (repData as any)?.kpi ?? null;
        const rows: RepRow[] = Array.isArray((repData as any)?.rows) ? (repData as any).rows : [];
        const who: RepWho[] = Array.isArray((repData as any)?.discipline_who) ? (repData as any).discipline_who : [];

        const pct = (a: number, b: number) => {
          const aa = Number(a || 0);
          const bb = Number(b || 0);
          if (!bb) return "0%";
          return `${Math.round((aa / bb) * 100)}%`;
        };

        const issuesTotal = Number(kpi?.issues_total ?? 0);
        const issuesNoObj = Number(kpi?.issues_no_obj ?? 0);
        const itemsTotal = Number(kpi?.items_total ?? 0);
        const itemsNoReq = Number(kpi?.items_free ?? 0);

        return (
          <DirectorFinanceCardModal
            visible={repOpen}
            onClose={closeReports}
            title="Весь период (даты)"
            periodShort={repPeriodShort}
            loading={repLoading}
            onOpenPeriod={() => setRepPeriodOpen(true)}
            onRefresh={async () => {
              await fetchReportOptions();
              await applyObjectFilter(repObjectName);
            }}
            onPdf={() => Alert.alert("PDF", "Позже добавим единый PDF.")}
            overlay={
              repPeriodOpen ? (
                <PeriodPickerSheet
                  visible={repPeriodOpen}
                  onClose={() => setRepPeriodOpen(false)}
                  initialFrom={repFrom || ""}
                  initialTo={repTo || ""}
                  onApply={(from: string, to: string) => void applyReportPeriod(from || null, to || null)}
                  onClear={() => {
                    const to = isoDate(new Date());
                    const from = isoDate(minusDays(30));
                    void applyReportPeriod(from, to);
                  }}
                  ui={{
                    cardBg: UI.cardBg,
                    text: UI.text,
                    sub: UI.sub,
                    border: "rgba(255,255,255,0.14)",
                    accentBlue: "#3B82F6",
                    approve: "#22C55E",
                  }}
                />
              ) : repObjOpen ? (
                <RNModal
                  isVisible={repObjOpen}
                  onBackdropPress={() => setRepObjOpen(false)}
                  onBackButtonPress={() => setRepObjOpen(false)}
                  backdropOpacity={0.55}
                  useNativeDriver
                  useNativeDriverForBackdrop
                  hideModalContentWhileAnimating
                  style={{ margin: 0, justifyContent: "flex-end" }}
                >
                  <View style={s.sheet}>
                    <View style={s.sheetHandle} />

                    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 14, paddingBottom: 10 }}>
                      <Text style={{ color: UI.text, fontWeight: "900", fontSize: 16 }}>
                        {`Объекты (${repOptObjects?.length ?? 0})`}
                      </Text>

                      <Pressable onPress={() => setRepObjOpen(false)}>
                        <Text style={{ color: UI.sub, fontWeight: "900" }}>Объекты</Text>
                      </Pressable>
                    </View>

                    <ScrollView style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled">
                      {(repOptObjects || []).map((item, i) => (
                        <Pressable
                          key={`${item}:${i}`}
                          onPress={async () => {
                            setRepObjOpen(false);
                            await applyObjectFilter(item);
                          }}
                          style={[s.mobCard, { marginHorizontal: 12, marginBottom: 10 }]}
                        >
                          <Text style={{ color: UI.text, fontWeight: "900" }} numberOfLines={2}>
                            {item}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                </RNModal>
              ) : null
            }
          >
            <View style={{ marginBottom: 10 }}>
              <Text style={{ color: UI.sub, fontWeight: "900", marginBottom: 6 }}>
                Склад
              </Text>

              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                <Pressable
                  onPress={() => void applyObjectFilter(null)}
                  style={[s.tab, !repObjectName && s.tabActive, { marginRight: 8, marginBottom: 8 }]}
                >
                  <Text style={{ color: !repObjectName ? UI.text : UI.sub, fontWeight: "900" }}>
                    Все
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setRepObjOpen(true)}
                  style={[s.tab, repObjectName && s.tabActive, { marginRight: 8, marginBottom: 8 }]}
                >
                  <Text style={{ color: repObjectName ? UI.text : UI.sub, fontWeight: "900" }}>
                    {`Объекты · ${(repOptObjects?.length ?? 0)}`}
                  </Text>
                </Pressable>

                {repObjectName ? (
                  <Pressable
                    onPress={() => setRepObjOpen(true)}
                    style={[s.tab, s.tabActive, { marginRight: 8, marginBottom: 8 }]}
                  >
                    <Text numberOfLines={1} style={{ color: UI.text, fontWeight: "900", maxWidth: 220 }}>
                      {repObjectName}
                    </Text>
                  </Pressable>
                ) : null}

                {repOptLoading ? (
                  <Text style={{ color: UI.sub, fontWeight: "800", marginLeft: 4, marginTop: 8 }}>•</Text>
                ) : null}
              </View>
            </View>

            <View style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={[s.kpiPillHalf, { flex: 1 }]}>
                  <Text style={s.kpiLabel}>Документов</Text>
                  <Text style={s.kpiValue}>{repLoading ? "…" : String(issuesTotal)}</Text>
                </View>

                <View style={[s.kpiPillHalf, { flex: 1 }]}>
                  <Text style={s.kpiLabel}>Позиций</Text>
                  <Text style={s.kpiValue}>{repLoading ? "…" : String(itemsTotal)}</Text>
                </View>
              </View>

              <View style={{ height: 8 }} />

              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={[s.kpiPillHalf, { flex: 1 }]}>
                  <Text style={s.kpiLabel}>Без объекта</Text>
                  <Text style={s.kpiValue}>
                    {repLoading ? "…" : `${issuesNoObj} · ${pct(issuesNoObj, issuesTotal)}`}
                  </Text>
                </View>

                <View style={[s.kpiPillHalf, { flex: 1 }]}>
                  <Text style={s.kpiLabel}>Без заявки</Text>
                  <Text style={s.kpiValue}>
                    {repLoading ? "…" : `${itemsNoReq} · ${pct(itemsNoReq, itemsTotal)}`}
                  </Text>
                </View>
              </View>
            </View>

            <View style={{ flexDirection: "row", marginBottom: 10 }}>
              {(["materials", "discipline"] as RepTab[]).map((t) => {
                const active = repTab === t;
                return (
                  <Pressable
                    key={t}
                    onPress={() => setRepTab(t)}
                    style={[s.tab, active && s.tabActive, { marginRight: 8 }]}
                  >
                    <Text style={{ color: active ? UI.text : UI.sub, fontWeight: "900" }}>
                      {t === "materials" ? "Материалы" : "Дисциплина"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {repTab === "materials" ? (
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {rows.map((item, idx) => {
                  const qAll = Number(item.qty_total || 0);
                  const qNoReq = Number(item.qty_free || 0);
                  const docs = Number(item.docs_cnt || 0);
                  const docsNoReq = Number(item.docs_free || 0);
                  return (
                    <View key={`${item.rik_code}:${item.uom}:${idx}`} style={[s.mobCard, { marginBottom: 10 }]}>
                      <View style={s.mobMain}>
                        <Text style={s.mobTitle} numberOfLines={2}>
                          {item.name_human_ru || item.rik_code}
                        </Text>
                        <Text style={s.mobMeta} numberOfLines={2}>
                          {`Выдано: ${qAll} ${item.uom} · док ${docs}`}
                          {qNoReq > 0 ? ` · без заявки: ${qNoReq} (${docsNoReq} док)` : ""}
                        </Text>
                      </View>
                    </View>
                  );
                })}
                {!repLoading && rows.length === 0 ? (
                  <Text style={{ opacity: 0.7, color: UI.sub, paddingVertical: 8 }}>
                    Нет выдач за выбранный период.
                  </Text>
                ) : null}
              </ScrollView>
            ) : (
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {who.map((item, idx) => (
                  <View key={`${item.who}:${idx}`} style={[s.mobCard, { marginBottom: 10 }]}>
                    <View style={s.mobMain}>
                      <Text style={s.mobTitle} numberOfLines={1}>{item.who}</Text>
                      <Text style={s.mobMeta} numberOfLines={1}>
                        {`Выдачи без заявки: ${String(item.items_cnt ?? 0)}`}
                      </Text>
                    </View>
                  </View>
                ))}
                {!repLoading && who.length === 0 ? (
                  <Text style={{ opacity: 0.7, color: UI.sub, paddingVertical: 8 }}>
                    Нет данных по дисциплинам за период.
                  </Text>
                ) : null}
              </ScrollView>
            )}

            <View style={{ marginTop: 10, flexDirection: "row", gap: 8 }}>
              <Pressable
                onPress={() => Alert.alert("Excel", "Позже добавим выгрузку Excel.")}
                style={[s.openBtn, { paddingVertical: 10, paddingHorizontal: 14, backgroundColor: UI.btnNeutral }]}
              >
                <Text style={[s.openBtnText, { fontSize: 12 }]}>Excel</Text>
              </Pressable>

              <Pressable
                onPress={() => void applyObjectFilter(null)}
                style={[s.openBtn, { paddingVertical: 10, paddingHorizontal: 14, backgroundColor: "rgba(255,255,255,0.06)" }]}
              >
                <Text style={[s.openBtnText, { fontSize: 12 }]}>Все объекты</Text>
              </Pressable>
            </View>
          </DirectorFinanceCardModal>
        );
      })()}

      <RNModal
        isVisible={isSheetOpen}
        onBackdropPress={closeSheet}
        onBackButtonPress={closeSheet}
        backdropOpacity={0.55}
        useNativeDriver
        useNativeDriverForBackdrop
        hideModalContentWhileAnimating
        style={{ margin: 0, justifyContent: 'flex-end' }}
      >

        <View style={s.sheet}>
          <View style={s.sheetHandle} />

          {/* TOP BAR */}
          <View style={s.sheetTopBar}>
            <Text style={s.sheetTitle} numberOfLines={1}>
              {sheetKind === 'request' && sheetRequest
                ? `Заявка ${labelForRequest(sheetRequest.request_id)}`
                : sheetKind === 'proposal' && sheetProposalId
                  ? (() => {
                    const p = propsHeads.find(x => String(x.id) === String(sheetProposalId));
                    const pretty = String(p?.pretty ?? '').trim();
                    return pretty ? `Предложение ${pretty}` : `Предложение #${String(sheetProposalId).slice(0, 8)}`;
                  })()
                  : '—'}
            </Text>

            <Pressable onPress={closeSheet} style={s.sheetCloseBtn}>
              <Text style={s.sheetCloseText}>Свернуть</Text>
            </Pressable>
          </View>

          {/* ===== REQUEST (прораб) ===== */}
          {sheetKind === 'request' && sheetRequest ? (
            <View style={{ flex: 1, minHeight: 0 }}>
              {/* NOTE */}
              {(() => {
                const headerNote = sheetRequest.items.find(x => x.note)?.note || null;
                if (!headerNote) return null;

                const lines = headerNote
                  .split(';')
                  .map(x => x.trim())
                  .filter(Boolean)
                  .slice(0, 4);

                if (!lines.length) return null;

                return (
                  <View style={s.reqNoteBox}>
                    {lines.map((line, idx) => (
                      <Text key={idx} style={s.reqNoteLine} numberOfLines={1}>
                        {line}
                      </Text>
                    ))}
                  </View>
                );
              })()}

              <FlatList
                data={sheetRequest.items}
                keyExtractor={(it, idx) => (it.request_item_id ? `mri:${it.request_item_id}` : `mri:${idx}`)}
                contentContainerStyle={{ paddingBottom: 12 }}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
                scrollEnabled
                showsVerticalScrollIndicator={false}
                renderItem={({ item: it }) => (
                  <View style={s.mobCard}>
                    <View style={s.mobMain}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                        <Text style={[s.mobTitle, { marginRight: 8 }]} numberOfLines={3}>
                          {it.name_human}
                        </Text>

                        {it.item_kind ? (
                          <View style={[s.kindPill, { marginTop: 4 }]}>
                            <Text style={s.kindPillText}>
                              {it.item_kind === 'material' ? 'Материал'
                                : it.item_kind === 'work' ? 'Работа'
                                  : it.item_kind === 'service' ? 'Услуга'
                                    : it.item_kind}
                            </Text>
                          </View>
                        ) : null}
                      </View>


                      <Text style={s.mobMeta} numberOfLines={2}>
                        {`${it.qty} ${it.uom || ''}`.trim()}
                        {it.app_code ? ` · ${it.app_code}` : ''}
                      </Text>
                    </View>

                    <RejectItemButton
                      disabled={!it.request_item_id || actingId === it.request_item_id}
                      loading={actingId === it.request_item_id}
                      onPress={async () => {
                        if (!it.request_item_id) return;
                        setActingId(it.request_item_id);
                        try {
                          const { error } = await supabase.rpc('reject_request_item', {
                            request_item_id: it.request_item_id,
                            reason: null,
                          });
                          if (error) throw error;

                          setRows(prev => prev.filter(r => r.request_item_id !== it.request_item_id));
                          setSheetRequest(prev => prev
                            ? ({ ...prev, items: prev.items.filter(x => x.request_item_id !== it.request_item_id) })
                            : prev
                          );
                        } catch (e: any) {
                          Alert.alert('Ошибка', e?.message ?? 'Не удалось отклонить позицию');
                        } finally {
                          setActingId(null);
                        }
                      }}
                    />
                  </View>
                )}
              />
              {/* ===== REQUEST ACTIONS (PROD) ===== */}
              <View style={s.reqActionsBottom}>
                {/* ✅ Delete — LEFT */}
                <View style={s.actionBtnSquare}>
                  <DeleteAllButton
                    disabled={screenLock || reqDeleteId === sheetRequest.request_id || reqSendId === sheetRequest.request_id}
                    loading={reqDeleteId === sheetRequest.request_id}
                    accessibilityLabel="Удалить заявку"
                    onPress={() => {
                      const doIt = async () => {
                        setReqDeleteId(sheetRequest.request_id);
                        try {
                          const reqId = toFilterId(sheetRequest.request_id);
                          if (reqId == null) throw new Error("request_id пустой");

                          const { error } = await supabase.rpc("reject_request_all", {
                            p_request_id: String(reqId),
                            p_reason: null,
                          });
                          if (error) throw error;

                          setRows(prev => prev.filter(r => r.request_id !== sheetRequest.request_id));
                          closeSheet();
                        } catch (e: any) {
                          Alert.alert("Ошибка", e?.message ?? "Не удалось отклонить все позиции");
                        } finally {
                          setReqDeleteId(null);
                        }
                      };

                      if (Platform.OS === "web") {
                        // @ts-ignore
                        const ok = window.confirm("Удалить заявку?\n\nОтклонить ВСЮ заявку вместе со всеми позициями?");
                        if (!ok) return;
                        void doIt();
                        return;
                      }

                      Alert.alert(
                        "Удалить заявку?",
                        "Вы уверены, что хотите отклонить ВСЮ заявку вместе со всеми позициями?",
                        [
                          { text: "Отмена", style: "cancel" },
                          { text: "Да, удалить", style: "destructive", onPress: () => void doIt() },
                        ],
                      );
                    }}
                  />
                </View>

                <View style={s.sp8} />

                {/* PDF — CENTER */}
                {(() => {
                  const rid = String(sheetRequest.request_id ?? "").trim();
                  const pdfKey = `pdf:req:${rid}`;
                  const pdfBusy = busy.isBusy(pdfKey);

                  return (
                    <Pressable
                      disabled={!rid || pdfBusy || screenLock}
                      onPress={async () => {
                        if (!rid || pdfBusy || screenLock) return;
                        try {
                          await openRequestPdf(sheetRequest);
                        } catch (e: any) {
                          if (String(e?.message ?? "").toLowerCase().includes("busy")) return;
                          Alert.alert("Ошибка", e?.message ?? "PDF не сформирован");
                        }
                      }}
                      style={[
                        s.actionBtnWide,
                        { backgroundColor: UI.btnNeutral, opacity: (!rid || pdfBusy || screenLock) ? 0.6 : 1 },
                      ]}
                    >
                      <Text style={s.actionText}>{pdfBusy ? "PDF…" : "PDF"}</Text>
                    </Pressable>
                  );
                })()}

                <View style={s.sp8} />

                {/* Excel — CENTER */}
                <Pressable
                  disabled={screenLock}
                  onPress={() => {
                    if (screenLock) return;
                    exportRequestExcel(sheetRequest);
                  }}
                  style={[
                    s.actionBtnWide,
                    { backgroundColor: UI.btnNeutral, opacity: screenLock ? 0.6 : 1 },
                  ]}
                >
                  <Text style={s.actionText}>Excel</Text>
                </Pressable>

                <View style={s.sp8} />

                {/* ✅ Approve/Send — RIGHT */}
                {(() => {
                  const disabled =
                    screenLock ||
                    reqDeleteId === sheetRequest.request_id ||
                    reqSendId === sheetRequest.request_id ||
                    (sheetRequest.items?.length ?? 0) === 0;

                  return (
                    <View style={s.actionBtnSquare}>
                      <SendPrimaryButton
                        variant="green"
                        disabled={disabled}
                        loading={reqSendId === sheetRequest.request_id}
                        onPress={async () => {
                          if (disabled) return;

                          setReqSendId(sheetRequest.request_id);
                          try {
                            const reqId = toFilterId(sheetRequest.request_id);
                            if (reqId == null) throw new Error("request_id пустой");

                            const reqIdStr = String(reqId);

                            const updItems = await supabase
                              .from("request_items")
                              .update({ status: "К закупке" })
                              .eq("request_id", reqIdStr)
                              .neq("status", "Отклонено");
                            if (updItems.error) throw updItems.error;

                            const updReq = await supabase
                              .from("requests")
                              .update({ status: "К закупке" })
                              .eq("id", reqIdStr);
                            if (updReq.error) throw updReq.error;

                            setRows(prev => prev.filter(r => r.request_id !== sheetRequest.request_id));
                            await fetchProps();

                            closeSheet();
                            showSuccess(`Заявка ${labelForRequest(sheetRequest.request_id)} утверждена и отправлена снабженцу`);
                          } catch (e: any) {
                            Alert.alert("Ошибка", e?.message ?? "Не удалось утвердить и отправить заявку");
                          } finally {
                            setReqSendId(null);
                          }
                        }}
                      />
                    </View>
                  );
                })()}
              </View>
            </View>
          ) : null}

          {/* ===== PROPOSAL (снабженец) ===== */}
          {sheetKind === 'proposal' && sheetProposalId ? (
            <View style={{ flex: 1, minHeight: 0 }}>
              {(() => {
                const pidStr = String(sheetProposalId);
                const key = pidStr;
                const loaded = !!loadedByProp[key];
                const items = itemsByProp[key] || [];

                const isEmptyProposal = loaded && (items?.length ?? 0) === 0;
                const approveDisabled =
                  screenLock ||
                  propApproveId === pidStr ||
                  propReturnId === pidStr ||
                  !loaded ||
                  isEmptyProposal;

                const pretty = String(propsHeads.find(x => String(x.id) === pidStr)?.pretty ?? '').trim();

                const totalSum = (items || []).reduce((acc, it) => {
                  const pr = Number((it as any).price ?? 0);
                  const q = Number((it as any).total_qty ?? 0);
                  return acc + pr * q;
                }, 0);


                if (!loaded) return <Text style={{ opacity: 0.7, color: UI.sub }}>Загружаю состав…</Text>;
                if (!items.length) {
                  return (
                    <Text style={{ opacity: 0.75, color: UI.sub }}>
                      Состав пуст — утвердить нельзя
                    </Text>
                  );
                }
                return (
                  <>
                    {/* ===== REQUEST CONTEXT (для предложения) ===== */}
                    {(() => {
                      // ✅ 0) Самый лучший источник — request_items.note (как у прораба)
                      const firstReqItemId =
                        (itemsByProp[pidStr] || items || [])
                          .map(x => String(x?.request_item_id ?? "").trim())
                          .find(Boolean) || "";

                      const headerNote = firstReqItemId ? String(reqItemNoteByIdRef.current?.[firstReqItemId] ?? "").trim() : "";

                      if (headerNote) {
                        const lines = headerNote
                          .split(";")
                          .map(x => x.trim())
                          .filter(Boolean)
                          .slice(0, 4);

                        if (lines.length) {
                          return (
                            <View style={s.reqNoteBox}>
                              {lines.map((t, idx) => (
                                <Text key={idx} style={s.reqNoteLine} numberOfLines={1}>
                                  {t}
                                </Text>
                              ))}
                            </View>
                          );
                        }
                      }

                      // ✅ 1) Второй вариант — requests.note/comment (если вдруг есть)
                      const reqIds = propReqIdsByPropRef.current?.[pidStr] || [];
                      if (!reqIds.length) return null;

                      const firstReqId = reqIds[0];
                      const meta = reqMetaByIdRef.current?.[firstReqId];

                      const human =
                        String(meta?.note ?? "").trim() ||
                        String(meta?.comment ?? "").trim();

                      if (human) {
                        const lines = human
                          .split(";")
                          .map(x => x.trim())
                          .filter(Boolean)
                          .slice(0, 4);

                        if (lines.length) {
                          return (
                            <View style={s.reqNoteBox}>
                              {lines.map((t, idx) => (
                                <Text key={idx} style={s.reqNoteLine} numberOfLines={1}>
                                  {t}
                                </Text>
                              ))}
                            </View>
                          );
                        }
                      }

                      // ✅ 2) Fallback — коды (как было)
                      const obj =
                        String(meta?.object_name ?? "").trim() ||
                        String(meta?.object ?? "").trim() ||
                        (meta?.site_address_snapshot ? String(meta.site_address_snapshot).trim() : "");

                      const lines: string[] = [];
                      if (obj) lines.push(`Объект: ${obj}`);
                      if (meta?.level_code) lines.push(`Этаж/уровень: ${meta.level_code}`);
                      if (meta?.system_code) lines.push(`Система: ${meta.system_code}`);
                      if (meta?.zone_code) lines.push(`Зона: ${meta.zone_code}`);

                      if (!lines.length) return null;

                      return (
                        <View style={s.reqNoteBox}>
                          {lines.slice(0, 4).map((t, idx) => (
                            <Text key={idx} style={s.reqNoteLine} numberOfLines={1}>
                              {t}
                            </Text>
                          ))}
                        </View>
                      );
                    })()}
                    {(() => {
                      const pidStr = String(sheetProposalId);
                      const files = propAttByProp[pidStr] || [];
                      const busyAtt = !!propAttBusyByProp[pidStr];

                      return (
                        <View style={{ marginTop: 6, marginBottom: 12 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                            <Text style={{ color: UI.text, fontWeight: "900" }}>
                              Вложения: {files.length}
                            </Text>

                            <Pressable
                              disabled={busyAtt}
                              onPress={() => void loadProposalAttachments(pidStr)}
                              style={{
                                paddingVertical: 6,
                                paddingHorizontal: 10,
                                borderRadius: 999,
                                borderWidth: 1,
                                borderColor: "rgba(255,255,255,0.18)",
                                backgroundColor: "rgba(255,255,255,0.06)",
                                opacity: busyAtt ? 0.6 : 1,
                              }}
                            >
                              <Text style={{ color: UI.text, fontWeight: "900", fontSize: 12 }}>
                                {busyAtt ? "…" : "Обновить"}
                              </Text>
                            </Pressable>
                          </View>

                          {busyAtt ? (
                            <Text style={{ color: UI.sub, fontWeight: "800", marginTop: 8 }}>
                              Загружаю вложения…
                            </Text>
                          ) : files.length === 0 ? (
                            <Text style={{ color: UI.sub, fontWeight: "800", marginTop: 8 }}>
                              Нет вложений (либо не прикреплены, либо RLS не пускает).
                            </Text>
                          ) : (
                            <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 8 }}>
                              {files.map((f, idx) => (
                                <Pressable key={`${f.id}:${idx}`}
                                  onPress={() => {
                                    const url = String(f.url || "").trim();
                                    if (!url) {
                                      Alert.alert("Вложение", "URL пустой");
                                      return;
                                    }
                                    void openSignedUrlUniversal(url, String(f.file_name ?? "file"));
                                  }}
                                  style={{
                                    paddingVertical: 8,
                                    paddingHorizontal: 12,
                                    borderRadius: 999,
                                    borderWidth: 1,
                                    borderColor: "rgba(255,255,255,0.18)",
                                    backgroundColor: "rgba(255,255,255,0.06)",
                                    marginRight: 8,
                                    marginBottom: 8,
                                  }}
                                >
                                  <Text style={{ color: UI.text, fontWeight: "900" }} numberOfLines={1}>
                                    {f.group_key ? `${f.group_key}: ` : ""}{f.file_name}
                                  </Text>
                                </Pressable>

                              ))}
                            </View>
                          )}
                        </View>
                      );
                    })()}
                    <FlatList
                      data={items}
                      keyExtractor={(it, idx) => `pi:${key}:${it.id}:${idx}`}
                      contentContainerStyle={{ paddingBottom: 12 }}
                      keyboardShouldPersistTaps="handled"
                      nestedScrollEnabled
                      scrollEnabled
                      showsVerticalScrollIndicator={false}
                      renderItem={({ item: it }) => (
                        <View style={s.mobCard}>
                          <View style={s.mobMain}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                              <Text style={[s.mobTitle, { marginRight: 8 }]} numberOfLines={3}>
                                {it.name_human}
                              </Text>

                              {it.item_kind ? (
                                <View style={[s.kindPill, { marginTop: 4 }]}>
                                  <Text style={s.kindPillText}>
                                    {it.item_kind === 'material' ? 'Материал'
                                      : it.item_kind === 'work' ? 'Работа'
                                        : it.item_kind === 'service' ? 'Услуга'
                                          : it.item_kind}
                                  </Text>
                                </View>
                              ) : null}
                            </View>
                            <Text style={s.mobMeta}>
                              {`${it.total_qty} ${it.uom || ''}`.trim()}
                              {it.price != null ? ` · цена ${it.price}` : ''}
                              {it.price != null ? ` · сумма ${Math.round(Number(it.price) * Number(it.total_qty || 0))}` : ''}
                              {it.app_code ? ` · ${it.app_code}` : ''}
                            </Text>
                          </View>
                          <View style={{ marginLeft: 10 }}>
                            <RejectItemButton
                              disabled={decidingId === pidStr || actingPropItemId === Number(it.id)}
                              loading={actingPropItemId === Number(it.id)}
                              onPress={async () => {
                                try {
                                  setDecidingId(pidStr);
                                  setActingPropItemId(Number(it.id));

                                  // ✅ Берём request_item_id железно из БД по proposal_items.id
                                  const q = await supabase
                                    .from('proposal_items')
                                    .select('request_item_id')
                                    .eq('proposal_id', pidStr)
                                    .eq('id', it.id) // it.id = proposal_items.id
                                    .maybeSingle();

                                  if (q.error) throw q.error;

                                  const rid = String(q.data?.request_item_id || '').trim();
                                  if (!rid) {
                                    Alert.alert('Ошибка', 'В строке предложения нет request_item_id (в базе).');
                                    return;
                                  }

                                  const beforeCount = (itemsByProp[pidStr] || items || []).length;
                                  const isLast = beforeCount <= 1;

                                  const payload = [{
                                    request_item_id: rid,
                                    decision: 'rejected',
                                    comment: 'Отклонено директором',
                                  }];

                                  const res = await supabase.rpc('director_decide_proposal_items', {
                                    p_proposal_id: pidStr,
                                    p_decisions: payload,
                                    p_finalize: isLast,
                                  });

                                  if (res.error) throw res.error;

                                  // локально убираем строку
                                  setItemsByProp(prev => {
                                    const before = prev[pidStr] || [];
                                    const nextItems = before.filter(x => Number(x.id) !== Number(it.id));
                                    return { ...prev, [pidStr]: nextItems };
                                  });

                                  if (isLast) {
                                    await fetchProps();
                                    void fetchRows();
                                    closeSheet();
                                  }
                                } catch (e: any) {
                                  Alert.alert('Ошибка', e?.message ?? 'Не удалось отклонить позицию');
                                } finally {
                                  setActingPropItemId(null);
                                  setDecidingId(null);
                                }
                              }}
                            />
                          </View>
                        </View>
                      )}
                      ListFooterComponent={() => (
                        <View style={{ paddingTop: 10, paddingBottom: 6, alignItems: 'flex-end' }}>
                          <View
                            style={{
                              paddingVertical: 6,
                              paddingHorizontal: 12,
                              borderRadius: 999,
                              backgroundColor: 'rgba(255,255,255,0.06)',
                              borderWidth: 1,
                              borderColor: 'rgba(255,255,255,0.12)',
                            }}
                          >
                            <Text style={{ fontWeight: '900', color: UI.text, fontSize: 14 }}>
                              ИТОГО: {Math.round(totalSum)}
                            </Text>
                          </View>
                        </View>
                      )}
                    />
                    {/* ===== PROPOSAL ACTIONS (PROD) ===== */}
                    <View style={s.reqActionsBottom}>
                      {/* ✅ Return/Delete — LEFT */}
                      <View style={s.actionBtnSquare}>
                        <DeleteAllButton
                          disabled={screenLock || propReturnId === pidStr || propApproveId === pidStr}
                          loading={propReturnId === pidStr}
                          accessibilityLabel="Вернуть/Отклонить"
                          onPress={() => {
                            if (screenLock) return;
                            onDirectorReturn(pidStr);
                          }}
                        />
                      </View>

                      <View style={s.sp8} />

                      {/* PDF — CENTER */}
                      {(() => {
                        const pdfKey = `pdfshare:prop:${pidStr}`;
                        const pdfBusy = busy.isBusy(pdfKey);

                        return (
                          <Pressable
                            disabled={pdfBusy || screenLock}
                            style={[
                              s.actionBtnWide,
                              { backgroundColor: UI.btnNeutral, opacity: (pdfBusy || screenLock) ? 0.6 : 1 },
                            ]}
                            onPress={async () => {
                              if (pdfBusy || screenLock) return;
                              if (pdfTapLockRef.current[pdfKey]) return;
                              pdfTapLockRef.current[pdfKey] = true;

                              try {
                                await runPdfTop({
                                  busy,
                                  supabase,
                                  key: pdfKey,
                                  label: "Готовлю файл…",
                                  mode: "share",
                                  fileName: `Предложение_${pidStr}`,
                                  getRemoteUrl: async () => {
                                    const { exportProposalPdf } = await import("../../src/lib/rik_api");
                                    return await exportProposalPdf(pidStr as any, "share");
                                  },
                                });
                              } catch (e: any) {
                                if (String(e?.message ?? "").toLowerCase().includes("busy")) return;
                                Alert.alert("Ошибка", e?.message ?? "Не удалось отправить PDF");
                              } finally {
                                setTimeout(() => { pdfTapLockRef.current[pdfKey] = false; }, 450);
                              }
                            }}
                          >
                            <Text style={s.actionText}>{pdfBusy ? "PDF…" : "PDF"}</Text>
                          </Pressable>
                        );
                      })()}

                      <View style={s.sp8} />

                      {/* Excel — CENTER */}
                      <Pressable
                        disabled={screenLock}
                        style={[
                          s.actionBtnWide,
                          { backgroundColor: UI.btnNeutral, opacity: screenLock ? 0.6 : 1 },
                        ]}
                        onPress={async () => {
                          if (screenLock) return;

                          try {
                            if (Platform.OS !== "web") {
                              Alert.alert("Excel", "Excel экспорт сейчас реализован только для Web-версии.");
                              return;
                            }
                            if (!items.length) {
                              Alert.alert("Excel", "Нет строк для выгрузки.");
                              return;
                            }

                            const safe = (v: any) => (v == null ? "" : String(v).replace(/[\r\n]+/g, " ").trim());
                            const title = (pretty || `PROPOSAL-${pidStr.slice(0, 8)}`).replace(/[^\w\u0400-\u04FF0-9]/g, "_");
                            const sheetName = title.slice(0, 31) || "Предложение";

                            const data: any[][] = [["№", "Наименование", "Кол-во", "Ед. изм.", "Применение"]];
                            items.forEach((it, idx) =>
                              data.push([idx + 1, safe(it.name_human), safe(it.total_qty), safe(it.uom), safe(it.app_code)])
                            );

                            const wb = XLSX.utils.book_new();
                            const ws = XLSX.utils.aoa_to_sheet(data);
                            XLSX.utils.book_append_sheet(wb, ws, sheetName);

                            const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
                            const blob = new Blob([wbout], {
                              type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                            });

                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `${sheetName}.xlsx`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                          } catch (e: any) {
                            Alert.alert("Ошибка", e?.message ?? "Не удалось сформировать Excel");
                          }
                        }}
                      >
                        <Text style={s.actionText}>Excel</Text>
                      </Pressable>

                      <View style={s.sp8} />

                      {/* ✅ Approve — RIGHT */}
                      <View style={s.actionBtnSquare}>
                        <SendPrimaryButton
                          variant="green"
                          disabled={approveDisabled}
                          loading={propApproveId === pidStr}
                          onPress={async () => {
                            if (approveDisabled) return;

                            try {
                              setPropApproveId(pidStr);

                              const { error } = await supabase.rpc("director_approve_min_auto", {
                                p_proposal_id: pidStr,
                                p_comment: null,
                              });
                              if (error) throw error;

                              const rInc = await supabase.rpc("ensure_purchase_and_incoming_strict", {
                                p_proposal_id: pidStr,
                              });
                              if ((rInc as any)?.error) throw (rInc as any).error;

                              try {
                                const purchaseId = String((rInc as any)?.data?.purchase_id ?? "").trim();
                                if (purchaseId) {
                                  const rW = await supabase.rpc("work_seed_from_purchase" as any, { p_purchase_id: purchaseId } as any);
                                  if (rW.error) console.warn("[work_seed_from_purchase] error:", rW.error.message);
                                }
                              } catch { }

                              const { error: accErr } = await supabase.rpc("proposal_send_to_accountant_min", {
                                p_proposal_id: pidStr,
                                p_invoice_number: null,
                                p_invoice_date: null,
                                p_invoice_amount: null,
                                p_invoice_currency: "KGS",
                              });
                              if (accErr) throw accErr;

                              await fetchProps();
                              void fetchRows();
                              closeSheet();
                              showSuccess("Утверждено → бухгалтер → склад/подрядчики");
                            } catch (e: any) {
                              Alert.alert("Ошибка", e?.message ?? "Не удалось утвердить");
                            } finally {
                              setPropApproveId(null);
                            }
                          }}
                        />
                      </View>
                    </View>
                  </>
                );
              })()}
            </View>
          ) : null}
        </View>
      </RNModal>

    </View>
  );
}
