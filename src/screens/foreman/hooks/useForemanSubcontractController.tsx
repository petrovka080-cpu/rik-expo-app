import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../../../lib/supabaseClient";
import { type PickedRow as CatalogPickedRow } from "../../../components/foreman/CatalogModal";
import {
  rikQuickSearch,
  updateRequestMeta,
  listRequestItems,
  type ReqItemRow,
  type RequestMetaPatch,
} from "../../../lib/catalog_api";
import {
  mapReqItemsToDraftSyncLines,
  syncForemanAtomicDraft,
  type ForemanDraftSyncMutationKind,
  type RequestDraftSyncLineInput,
} from "../foreman.draftSync.repository";
import { useRouter } from "expo-router";
import { buildPdfFileName } from "../../../lib/documents/pdfDocument";
import { prepareAndPreviewGeneratedPdf } from "../../../lib/pdf/pdf.runner";
import {
  ForemanSubcontractMainSections,
  ForemanSubcontractModalStack,
} from "../ForemanSubcontractTab.sections";
import { s } from "../foreman.styles";
import { REQUEST_STATUS_STYLES, UI } from "../foreman.ui";
import { resolveStatusInfo as resolveStatusHelper, shortId } from "../foreman.helpers";
import {
  fmtAmount,
  listForemanSubcontracts,
  type Subcontract,
  type SubcontractPriceType,
  type SubcontractWorkMode,
} from "../../subcontracts/subcontracts.shared";
import {
  fetchForemanRequestDisplayLabel,
  findLatestDraftRequestByLink,
} from "../foreman.requests";
import { readForemanProfileName } from "../foreman.dicts.repo";
import { useForemanHistory } from "./useForemanHistory";
import { useForemanSubcontractUiStore, type SubcontractFlowScreen } from "../foremanSubcontractUi.store";
import { buildForemanRequestPdfDescriptor } from "../foreman.requestPdf.service";

export type ForemanSubcontractTabProps = {
  contentTopPad: number;
  onScroll: (event: unknown) => void;
  dicts: {
    objOptions: DictOption[];
    lvlOptions: DictOption[];
    sysOptions: DictOption[];
  };
};

type DictOption = {
  code: string;
  name: string;
};

type FormState = {
  contractorOrg: string;
  contractorRep: string;
  contractorPhone: string;
  contractNumber: string;
  contractDate: string;
  objectCode: string;
  levelCode: string;
  systemCode: string;
  zoneText: string;
  qtyPlanned: string;
  uom: string;
  dateStart: string;
  dateEnd: string;
  workMode: SubcontractWorkMode | "";
  pricePerUnit: string;
  totalPrice: string;
  priceType: SubcontractPriceType | "";
  foremanComment: string;
};

type CalcPickedRow = {
  rik_code?: string | null;
  item_name_ru?: string | null;
  name_human?: string | null;
  qty?: string | number | null;
  uom_code?: string | null;
};

const buildDraftScopeKey = (form: FormState, templateId?: string | null) =>
  [
    templateId || "",
    form.objectCode.trim(),
    form.levelCode.trim(),
    form.systemCode.trim(),
    form.zoneText.trim(),
    form.contractorOrg.trim(),
    form.contractNumber.trim(),
  ].join("|");

const isCancelledDraftRow = (status?: string | null) => {
  const normalized = String(status || "").trim().toLowerCase();
  return normalized === "cancelled" || normalized === "canceled";
};

const filterActiveDraftItems = (rows: ReqItemRow[] | null | undefined): ReqItemRow[] =>
  (rows || []).filter((row) => !isCancelledDraftRow(row.status));

const EMPTY_FORM: FormState = {
  contractorOrg: "",
  contractorRep: "",
  contractorPhone: "",
  contractNumber: "",
  contractDate: "",
  objectCode: "",
  levelCode: "",
  systemCode: "",
  zoneText: "",
  qtyPlanned: "",
  uom: "",
  dateStart: "",
  dateEnd: "",
  workMode: "",
  pricePerUnit: "",
  totalPrice: "",
  priceType: "",
  foremanComment: "",
};

const UOM_OPTIONS = [
  { code: "шт", name: "шт" },
  { code: "м", name: "м" },
  { code: "м2", name: "м2" },
  { code: "м3", name: "м3" },
  { code: "кг", name: "кг" },
  { code: "т", name: "т" },
  { code: "компл", name: "компл" },
  { code: "смена", name: "смена" },
  { code: "час", name: "час" },
];

void UOM_OPTIONS;

const toNum = (v: string) => {
  const n = Number(String(v || "").trim().replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

const toIso = (v: string) => {
  const s = String(v || "").trim();
  if (!s) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
};

const sanitizeDecimal = (v: string) => String(v || "").replace(",", ".").replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
const sanitizePhone = (v: string) => {
  const s = String(v || "").trim();
  const leadPlus = s.startsWith("+");
  const digits = s.replace(/\D/g, "");
  return `${leadPlus ? "+" : ""}${digits}`;
};

void sanitizeDecimal;
void sanitizePhone;

const pickName = (arr: { code?: string; name?: string }[], code: string) => {
  const c = String(code || "").trim();
  if (!c) return "";
  const row = (arr || []).find((x) => String(x?.code || "") === c);
  return String(row?.name || c);
};

const resolveCodeOrName = (arr: DictOption[], raw: string | null | undefined) => {
  const value = String(raw || "").trim();
  if (!value) return "";
  const byCode = arr.find((x) => String(x.code || "").trim() === value);
  if (byCode?.name) return String(byCode.name).trim();
  const byName = arr.find((x) => String(x.name || "").trim() === value);
  if (byName?.name) return String(byName.name).trim();
  return value;
};

const resolveCodeFromDict = (arr: DictOption[], raw: string | null | undefined) => {
  const value = String(raw || "").trim();
  if (!value) return "";
  const byCode = arr.find((x) => String(x.code || "").trim() === value);
  if (byCode?.code) return String(byCode.code).trim();
  const byName = arr.find((x) => String(x.name || "").trim() === value);
  if (byName?.code) return String(byName.code).trim();
  return "";
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  if (typeof error === "string" && error.trim()) return error.trim();
  return fallback;
};

const trim = (value: unknown) => String(value ?? "").trim();

const makeLocalDraftRowId = () => `local:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;

const toPositiveQty = (value: unknown, fallback = 1) => {
  const parsed = Number(String(value ?? "").trim().replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const toRemoteDraftItemId = (value: unknown): string | null => {
  const id = trim(value);
  if (!id || id.startsWith("local:")) return null;
  return id;
};

const cloneDraftItem = (item: ReqItemRow): ReqItemRow => ({
  ...item,
  id: trim(item.id),
  request_id: trim(item.request_id),
  rik_code: trim(item.rik_code) || null,
  name_human: trim(item.name_human) || "—",
  qty: Number(item.qty ?? 0) || 0,
  uom: trim(item.uom) || null,
  status: item.status ?? null,
  supplier_hint: item.supplier_hint ?? null,
  app_code: item.app_code ?? null,
  note: item.note ?? null,
  line_no: Number.isFinite(Number(item.line_no)) ? Number(item.line_no) : null,
});

const buildDraftMergeKey = (rikCode?: string | null, uom?: string | null) =>
  `${trim(rikCode).toLowerCase()}::${trim(uom).toLowerCase()}`;

const appendLineInputsToDraftItems = (
  currentItems: ReqItemRow[],
  addRows: RequestDraftSyncLineInput[],
  requestId: string,
): ReqItemRow[] => {
  const next = currentItems.map(cloneDraftItem);

  for (const row of addRows) {
    const rikCode = trim(row.rik_code);
    const qty = Number(row.qty ?? 0);
    if (!rikCode || !Number.isFinite(qty) || qty <= 0) continue;

    const existing = next.find(
      (item) => buildDraftMergeKey(item.rik_code, item.uom) === buildDraftMergeKey(rikCode, row.uom),
    );
    if (existing) {
      existing.qty = Number(existing.qty ?? 0) + qty;
      if (row.note !== undefined) existing.note = row.note ?? null;
      if (row.name_human) existing.name_human = row.name_human;
      if (row.uom !== undefined) existing.uom = row.uom ?? null;
      if (row.app_code !== undefined) existing.app_code = row.app_code ?? null;
      existing.status = existing.status ?? "Черновик";
      continue;
    }

    next.push({
      id: makeLocalDraftRowId(),
      request_id: trim(requestId),
      rik_code: rikCode,
      name_human: trim(row.name_human) || rikCode,
      qty,
      uom: trim(row.uom) || null,
      status: "Черновик",
      supplier_hint: null,
      app_code: row.app_code ?? null,
      note: row.note ?? null,
      line_no: next.length + 1,
    });
  }

  return next.map((item, index) => ({
    ...item,
    request_id: trim(item.request_id) || trim(requestId),
    line_no: index + 1,
  }));
};

const logForemanSubcontractDebug = (...args: unknown[]) => {
  if (!__DEV__) return;
  console.warn(...args);
};

const warnForemanSubcontract = (scope: string, error: unknown) => {
  logForemanSubcontractDebug(`[ForemanSubcontractTab] ${scope}:`, error);
};

void warnForemanSubcontract;

const resolveRequestStatusInfo = (raw?: string | null) =>
  resolveStatusHelper(raw, REQUEST_STATUS_STYLES);

export function useForemanSubcontractController({
  contentTopPad,
  onScroll,
  dicts,
}: ForemanSubcontractTabProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const modalHeaderTopPad = Platform.OS === "web" ? 16 : (insets.top + 10);
  const {
    historyRequests,
    historyLoading: requestHistoryLoading,
    historyVisible: requestHistoryVisible,
    fetchHistory: fetchRequestHistory,
    closeHistory: closeRequestHistory,
  } = useForemanHistory();
  const [userId, setUserId] = useState("");
  const [foremanName, setForemanName] = useState("");

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [displayNo, setDisplayNo] = useState("");

  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState<Subcontract[]>([]);

  const historyOpen = useForemanSubcontractUiStore((state) => state.historyOpen);
  const setHistoryOpen = useForemanSubcontractUiStore((state) => state.setHistoryOpen);
  const subcontractFlowOpen = useForemanSubcontractUiStore((state) => state.subcontractFlowOpen);
  const setSubcontractFlowOpen = useForemanSubcontractUiStore((state) => state.setSubcontractFlowOpen);
  const subcontractFlowScreen = useForemanSubcontractUiStore((state) => state.subcontractFlowScreen);
  const setSubcontractFlowScreen = useForemanSubcontractUiStore((state) => state.setSubcontractFlowScreen);
  const selectedWorkType = useForemanSubcontractUiStore((state) => state.selectedWorkType);
  const setSelectedWorkType = useForemanSubcontractUiStore((state) => state.setSelectedWorkType);
  const [draftItems, setDraftItems] = useState<ReqItemRow[]>([]);
  const dateTarget = useForemanSubcontractUiStore((state) => state.dateTarget);
  const setDateTarget = useForemanSubcontractUiStore((state) => state.setDateTarget);
  const selectedTemplateId = useForemanSubcontractUiStore((state) => state.selectedTemplateId);
  const setSelectedTemplateId = useForemanSubcontractUiStore((state) => state.setSelectedTemplateId);
  const closeSubcontractFlowUi = useForemanSubcontractUiStore((state) => state.closeSubcontractFlow);
  const [requestId, setRequestId] = useState("");
  const activeDraftScopeKeyRef = useRef("");
  const draftItemsLoadSeqRef = useRef(0);

  const templateContract = useMemo(
    () => history.find((row) => String(row.id || "").trim() === String(selectedTemplateId || "").trim()) ?? null,
    [history, selectedTemplateId],
  );

  const objectName = useMemo(() => pickName(dicts.objOptions || [], form.objectCode), [dicts.objOptions, form.objectCode]);
  const levelName = useMemo(() => pickName(dicts.lvlOptions || [], form.levelCode), [dicts.lvlOptions, form.levelCode]);
  const systemName = useMemo(() => pickName(dicts.sysOptions || [], form.systemCode), [dicts.sysOptions, form.systemCode]);
  const zoneName = form.zoneText.trim() || "—";
  const templateObjectName = useMemo(
    () => resolveCodeOrName(dicts.objOptions || [], templateContract?.object_name),
    [dicts.objOptions, templateContract?.object_name],
  );
  const templateLevelName = useMemo(
    () => resolveCodeOrName(dicts.lvlOptions || [], templateContract?.work_zone),
    [dicts.lvlOptions, templateContract?.work_zone],
  );
  const templateSystemName = useMemo(
    () => resolveCodeOrName(dicts.sysOptions || [], templateContract?.work_type),
    [dicts.sysOptions, templateContract?.work_type],
  );
  const templateObjectCode = useMemo(
    () => resolveCodeFromDict(dicts.objOptions || [], templateContract?.object_name),
    [dicts.objOptions, templateContract?.object_name],
  );
  const templateLevelCode = useMemo(
    () => resolveCodeFromDict(dicts.lvlOptions || [], templateContract?.work_zone),
    [dicts.lvlOptions, templateContract?.work_zone],
  );
  const templateSystemCode = useMemo(
    () => resolveCodeFromDict(dicts.sysOptions || [], templateContract?.work_type),
    [dicts.sysOptions, templateContract?.work_type],
  );
  const subcontractDetailsVisible = subcontractFlowOpen && subcontractFlowScreen === "details" && !!templateContract;
  const draftOpen = subcontractFlowOpen && subcontractFlowScreen === "draft";
  const catalogVisible = subcontractFlowOpen && subcontractFlowScreen === "catalog";
  const workTypePickerVisible = subcontractFlowOpen && subcontractFlowScreen === "workType";
  const calcVisible = subcontractFlowOpen && subcontractFlowScreen === "calc";
  const scopeNote = useMemo(() => {
    const obj = String(objectName || templateObjectName || "").trim();
    const lvl = String(levelName || templateLevelName || "").trim();
    const sys = String(systemName || templateSystemName || "").trim();
    const zone = String(form.zoneText || "").trim();
    const contractor = String(templateContract?.contractor_org || form.contractorOrg || "").trim();
    const phone = String(templateContract?.contractor_phone || form.contractorPhone || "").trim();
    const qty = templateContract?.qty_planned ?? toNum(form.qtyPlanned);
    const qtyUom = String(templateContract?.uom || form.uom || "").trim();
    const volumeRaw = fmtAmount(qty);
    const volume = volumeRaw !== "—" ? `${volumeRaw} ${qtyUom}`.trim() : "";
    return [
      obj ? `Объект: ${obj}` : "",
      lvl ? `Этаж/уровень: ${lvl}` : "",
      sys ? `Система: ${sys}` : "",
      zone ? `Зона: ${zone}` : "",
      contractor ? `Подрядчик: ${contractor}` : "",
      phone ? `Телефон: ${phone}` : "",
      volume ? `Объём: ${volume}` : "",
    ]
      .filter(Boolean)
      .join("; ");
  }, [
    templateContract,
    form.contractorOrg,
    form.contractorPhone,
    form.qtyPlanned,
    form.uom,
    objectName,
    levelName,
    systemName,
    form.zoneText,
    templateObjectName,
    templateLevelName,
    templateSystemName,
  ]);
  const requestMetaFromTemplate = useMemo<RequestMetaPatch>(() => {
    if (!templateContract) return {};
    const contractor = String(templateContract.contractor_org || "").trim();
    const phone = String(templateContract.contractor_phone || "").trim();
    const workMode = String(templateContract.work_mode || "").trim();
    const qty = fmtAmount(templateContract.qty_planned);
    const uom = String(templateContract.uom || "").trim();
    const details = [
      templateContract.display_no ? `Подряд ${templateContract.display_no}` : "",
      contractor,
      systemName || templateSystemName || workMode,
      levelName || templateLevelName || "",
      String(form.zoneText || "").trim() || "",
      qty !== "—" ? `${qty} ${uom}`.trim() : "",
    ].filter(Boolean);
    return {
      contractor_job_id: String(templateContract.id || "").trim() || null,
      subcontract_id: String(templateContract.id || "").trim() || null,
      object_type_code: form.objectCode || templateObjectCode || null,
      level_code: form.levelCode || templateLevelCode || null,
      system_code: form.systemCode || templateSystemCode || null,
      zone_code: null,
      foreman_name: foremanName || "Прораб",
      contractor_org: contractor || null,
      subcontractor_org: contractor || null,
      contractor_phone: phone || null,
      subcontractor_phone: phone || null,
      planned_volume: templateContract.qty_planned ?? null,
      qty_plan: templateContract.qty_planned ?? null,
      volume: templateContract.qty_planned ?? null,
      object_name: objectName || templateObjectName || null,
      level_name: levelName || templateLevelName || null,
      system_name: systemName || templateSystemName || null,
      zone_name: String(form.zoneText || "").trim() || null,
      comment: details.length ? details.join(" · ") : null,
    };
  }, [
    templateContract,
    templateObjectCode,
    templateLevelCode,
    templateSystemCode,
    form.objectCode,
    form.levelCode,
    form.systemCode,
    form.zoneText,
    foremanName,
    objectName,
    levelName,
    systemName,
    templateObjectName,
    templateLevelName,
    templateSystemName,
  ]);
  const requestMetaPersistPatch = useMemo<RequestMetaPatch>(() => ({
    contractor_job_id: String(templateContract?.id || "").trim() || null,
    subcontract_id: String(templateContract?.id || "").trim() || null,
    object_type_code: form.objectCode || templateObjectCode || null,
    level_code: form.levelCode || templateLevelCode || null,
    system_code: form.systemCode || templateSystemCode || null,
    zone_code: null,
    foreman_name: foremanName || "Прораб",
    object_name: objectName || templateObjectName || null,
    comment: (requestMetaFromTemplate.comment ?? scopeNote) || null,
  }), [
    templateContract?.id,
    form.objectCode,
    form.levelCode,
    form.systemCode,
    templateObjectCode,
    templateLevelCode,
    templateSystemCode,
    foremanName,
    objectName,
    templateObjectName,
    requestMetaFromTemplate.comment,
    scopeNote,
  ]);

  const getTemplateSubcontractId = useCallback(() => {
    return String(templateContract?.id || "").trim();
  }, [templateContract]);

  const ensureTemplateContractStrict = useCallback((): string | null => {
    const subcontractId = getTemplateSubcontractId();
    if (!subcontractId) {
      Alert.alert("Подряд не выбран", "Сначала выберите утвержденный подряд.");
      return null;
    }
    if (templateContract?.status !== "approved") {
      Alert.alert("Подряд не утвержден", "Для заявки можно использовать только утвержденный подряд.");
      return null;
    }
    return subcontractId;
  }, [getTemplateSubcontractId, templateContract?.status]);


  const patch = useMemo(() => ({
    foreman_name: foremanName || null,
    contractor_org: form.contractorOrg.trim() || null,
    contractor_rep: form.contractorRep.trim() || null,
    contractor_phone: form.contractorPhone.trim() || null,
    contract_number: form.contractNumber.trim() || null,
    contract_date: toIso(form.contractDate),
    object_name: objectName || null,
    work_zone: levelName || null,
    work_type: systemName || null,
    qty_planned: toNum(form.qtyPlanned),
    uom: form.uom.trim() || null,
    date_start: toIso(form.dateStart),
    date_end: toIso(form.dateEnd),
    work_mode: (form.workMode || null) as SubcontractWorkMode | null,
    price_per_unit: toNum(form.pricePerUnit),
    total_price: toNum(form.totalPrice),
    price_type: (form.priceType || null) as SubcontractPriceType | null,
    foreman_comment: form.foremanComment.trim() || null,
  }), [foremanName, form, objectName, levelName, systemName]);

  void patch;

  const setField = useCallback(<K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((prev) => ({ ...prev, [k]: v }));
  }, []);

  const openSubcontractFlow = useCallback((screen: SubcontractFlowScreen = "details") => {
    setSubcontractFlowScreen(screen);
    setSubcontractFlowOpen(true);
  }, [setSubcontractFlowOpen, setSubcontractFlowScreen]);

  const closeSubcontractFlow = useCallback(() => {
    closeSubcontractFlowUi();
  }, [closeSubcontractFlowUi]);

  useEffect(() => {
    const qty = toNum(form.qtyPlanned);
    const ppu = toNum(form.pricePerUnit);
    if (qty != null && ppu != null) {
      const total = qty * ppu;
      setForm((prev) => ({ ...prev, totalPrice: String(Number.isFinite(total) ? total : "") }));
      return;
    }
    setForm((prev) => ({ ...prev, totalPrice: "" }));
  }, [form.qtyPlanned, form.pricePerUnit]);

  const loadHistory = useCallback(async (uid = userId) => {
    let nextUserId = String(uid || "").trim();
    if (!nextUserId) {
      const auth = await supabase.auth.getUser();
      nextUserId = String(auth.data?.user?.id || "").trim();
    }
    if (!nextUserId) return;
    setHistoryLoading(true);
    try {
      const rows = await listForemanSubcontracts(nextUserId);
      setHistory(rows);
    } catch (e) {
      Alert.alert("Не удалось загрузить данные", getErrorMessage(e, "Не удалось загрузить историю подрядов."));
    } finally {
      setHistoryLoading(false);
    }
  }, [userId]);

  const loadDraftItems = useCallback(async (rid: string) => {
    const requestSeq = ++draftItemsLoadSeqRef.current;
    const id = String(rid || "").trim();
    if (!id) {
      setDraftItems([]);
      return;
    }
    try {
      const rows = await listRequestItems(id);
      if (requestSeq !== draftItemsLoadSeqRef.current) return;
      setDraftItems(filterActiveDraftItems(rows || []));
    } catch (e) {
      if (requestSeq !== draftItemsLoadSeqRef.current) return;
      logForemanSubcontractDebug("[loadDraftItems] error:", e);
      setDraftItems([]);
    }
  }, []);

  const resetSubcontractDraftContext = useCallback((options?: { clearForm?: boolean }) => {
    draftItemsLoadSeqRef.current += 1;
    setRequestId("");
    setDisplayNo("");
    setDraftItems([]);
    activeDraftScopeKeyRef.current = "";
    if (options?.clearForm) {
      setForm(EMPTY_FORM);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = String(data?.user?.id || "").trim();
      if (!uid) return;
      setUserId(uid);

      const nm = String(data?.user?.user_metadata?.full_name || "").trim();
      if (nm) setForemanName(nm);

      if (!nm) {
        try {
          const x = await readForemanProfileName(uid);
          if (x) setForemanName(x);
        } catch (e) {
          logForemanSubcontractDebug("foreman profile load failed", e);
        }
      }

      await loadHistory(uid);
    })();
  }, [loadHistory]);

  const draftScopeKey = useMemo(() => buildDraftScopeKey(form, selectedTemplateId), [form, selectedTemplateId]);

  const saveDraftAtomic = useCallback(
    async (
      params: {
        submit?: boolean;
        pendingDeleteIds?: string[];
        itemsSnapshot?: ReqItemRow[];
        mutationKind: ForemanDraftSyncMutationKind;
        localBeforeCount?: number | null;
        localAfterCount?: number | null;
      }
    ): Promise<string | null> => {
      const subcontractId = ensureTemplateContractStrict();
      if (!subcontractId) return null;

      if (!userId) {
        Alert.alert("Данные не загружены", "Профиль пользователя не найден.");
        return null;
      }

      const snapshotItems = params.itemsSnapshot ?? draftItems;
      const lines = mapReqItemsToDraftSyncLines(snapshotItems);
      const pendingDeleteIds = Array.from(
        new Set((params.pendingDeleteIds || []).map((id) => trim(id)).filter(Boolean)),
      );

      if (!requestId && lines.length === 0 && pendingDeleteIds.length === 0 && params.submit !== true) {
        return null;
      }

      setSaving(true);
      if (params.submit) setSending(true);

      try {
        const objectNameForRequest = String(
          templateObjectName || objectName || templateContract?.object_name || ""
        ).trim();

        const res = await syncForemanAtomicDraft({
          mutationKind: params.mutationKind,
          sourcePath: "foreman_subcontract",
          draftScopeKey,
          requestId: requestId || null,
          submit: params.submit,
          pendingDeleteIds,
          lines,
          meta: requestMetaFromTemplate,
          subcontractId,
          contractorJobId: subcontractId,
          objectName: objectNameForRequest || null,
          levelName: levelName || templateLevelName || null,
          systemName: systemName || templateSystemName || null,
          zoneName: trim(form.zoneText) || null,
          beforeLineCount: params.localBeforeCount ?? draftItems.length,
          afterLocalSnapshotLineCount: params.localAfterCount ?? snapshotItems.length,
        });

        const rid = String(res.request.id);
        const displayLabel = String(res.request.display_no || res.request.id || "DRAFT");
        
        setRequestId(rid);
        setDisplayNo(displayLabel);
        setDraftItems(filterActiveDraftItems(res.items));
        activeDraftScopeKeyRef.current = draftScopeKey;
        return rid;
      } catch (e) {
        Alert.alert("Ошибка", getErrorMessage(e, "Не удалось выполнить атомарное сохранение заявки."));
        return null;
      } finally {
        setSaving(false);
        if (params.submit) setSending(false);
      }
    },
    [
      ensureTemplateContractStrict,
      userId,
      requestId,
      draftItems,
      requestMetaFromTemplate,
      templateObjectName,
      objectName,
      templateContract?.object_name,
      levelName,
      templateLevelName,
      systemName,
      templateSystemName,
      form.zoneText,
      draftScopeKey,
    ]
  );

  const approvedContracts = useMemo(() => {
    return history.filter((h) => h.status === "approved");
  }, [history]);

  useEffect(() => {
    void loadDraftItems(requestId);
  }, [requestId, loadDraftItems]);

  useEffect(() => {
    if (!requestId) return;
    const rid = String(requestId || "").trim();
    if (!rid) return;
    let cancelled = false;
    void (async () => {
      const ok = await updateRequestMeta(rid, requestMetaPersistPatch);
      if (!ok || cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [
    requestId,
    requestMetaPersistPatch,
  ]);

  useEffect(() => {
    if (!requestId) return;
    let cancelled = false;
    (async () => {
      try {
        const label = await fetchForemanRequestDisplayLabel(requestId);
        if (cancelled || !label) return;
        if (label) setDisplayNo(label);
      } catch {
        // old schema without request_no; keep existing display
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [requestId]);

  const appendCatalogRows = useCallback(async (rows: CatalogPickedRow[]) => {
    if (!rows?.length) return;
    const lineInputs: RequestDraftSyncLineInput[] = rows.map((r) => ({
      rik_code: r.rik_code || "",
      qty: toPositiveQty(r.qty, 1),
      uom: r.uom || null,
      name_human: r.name || "",
      note: scopeNote || null,
    }));
    const nextItems = appendLineInputsToDraftItems(draftItems, lineInputs, requestId);
    await saveDraftAtomic({
      itemsSnapshot: nextItems,
      mutationKind: "catalog_add",
      localBeforeCount: draftItems.length,
      localAfterCount: nextItems.length,
    });
    setSubcontractFlowScreen("draft");
  }, [saveDraftAtomic, scopeNote, draftItems, requestId, setSubcontractFlowScreen]);

  const appendCalcRows = useCallback(async (rows: CalcPickedRow[]) => {
    if (!rows?.length) return;
    const lineInputs: RequestDraftSyncLineInput[] = rows.map((r) => ({
      rik_code: r.rik_code || "",
      qty: toPositiveQty(r.qty, 1),
      uom: r.uom_code || null,
      name_human: r.item_name_ru || r.name_human || "Без названия",
      note: scopeNote || null,
    }));
    const nextItems = appendLineInputsToDraftItems(draftItems, lineInputs, requestId);
    await saveDraftAtomic({
      itemsSnapshot: nextItems,
      mutationKind: "calc_add",
      localBeforeCount: draftItems.length,
      localAfterCount: nextItems.length,
    });
    setSubcontractFlowScreen("draft");
  }, [saveDraftAtomic, scopeNote, draftItems, requestId, setSubcontractFlowScreen]);

  const removeDraftItem = useCallback(async (id: string) => {
    const nextItems = draftItems.filter((item) => trim(item.id) !== trim(id));
    await saveDraftAtomic({
      itemsSnapshot: nextItems,
      pendingDeleteIds: toRemoteDraftItemId(id) ? [id] : [],
      mutationKind: "row_remove",
      localBeforeCount: draftItems.length,
      localAfterCount: nextItems.length,
    });
  }, [saveDraftAtomic, draftItems]);

  const sendToDirector = useCallback(async () => {
    const subcontractId = ensureTemplateContractStrict();
    if (!subcontractId) return;

    if (!requestId) {
      Alert.alert("Внимание", "Сначала сформируйте заявку.");
      return;
    }

    if (draftItems.length === 0) {
      Alert.alert("Внимание", "В черновике нет позиций для отправки.");
      return;
    }

    const okId = await saveDraftAtomic({
      submit: true,
      itemsSnapshot: draftItems,
      mutationKind: "submit",
      localBeforeCount: draftItems.length,
      localAfterCount: draftItems.length,
    });
    if (okId) {
      Alert.alert("Успешно", "Заявка отправлена директору.");
      await loadHistory(userId);
      resetSubcontractDraftContext({ clearForm: true });
      closeSubcontractFlow();
    }
  }, [closeSubcontractFlow, draftItems, ensureTemplateContractStrict, loadHistory, requestId, resetSubcontractDraftContext, saveDraftAtomic, userId]);

  const onPdf = useCallback(async () => {
    const rid = String(requestId || "").trim();
    if (!rid) {
      Alert.alert("PDF", "Сначала создайте черновик заявки.");
      return;
    }
    const template = await buildForemanRequestPdfDescriptor({
      requestId: rid,
      generatedBy: foremanName || null,
      displayNo: displayNo || null,
      title: displayNo ? `Р§РµСЂРЅРѕРІРёРє ${displayNo}` : `Р§РµСЂРЅРѕРІРёРє ${rid}`,
    });
    const title = displayNo ? `Черновик ${displayNo}` : `Черновик ${rid}`;
    await prepareAndPreviewGeneratedPdf({
      supabase,
      key: `pdf:subcontracts-request:${rid}`,
      label: "Открываю PDF…",
      descriptor: {
        ...template,
        title,
        fileName: buildPdfFileName({
          documentType: "request",
          title: displayNo || "chernovik",
          entityId: rid,
        }),
      },
      router,
    });
  }, [displayNo, foremanName, requestId, router]);

  const openRequestHistoryPdf = useCallback(async (reqId: string) => {
    const rid = String(reqId || "").trim();
    if (!rid) return;
    const template = await buildForemanRequestPdfDescriptor({
      requestId: rid,
      generatedBy: foremanName || null,
      title: `Р—Р°СЏРІРєР° ${rid}`,
    });
    await prepareAndPreviewGeneratedPdf({
      supabase,
      key: `pdf:history:${rid}`,
      label: "Открываю PDF…",
      descriptor: {
        ...template,
        title: `Заявка ${rid}`,
        fileName: buildPdfFileName({
          documentType: "request",
          title: rid,
          entityId: rid,
        }),
      },
      router,
    });
  }, [foremanName, router]);

  const handleRequestHistorySelect = useCallback(async (reqId: string) => {
    closeRequestHistory();
    await openRequestHistoryPdf(reqId);
  }, [closeRequestHistory, openRequestHistoryPdf]);

  const clearDraft = useCallback(async () => {
    const pendingDeleteIds = draftItems
      .map((item) => toRemoteDraftItemId(item.id))
      .filter((id): id is string => Boolean(id));
    if (draftItems.length > 0 || pendingDeleteIds.length > 0) {
      const cleared = await saveDraftAtomic({
        itemsSnapshot: [],
        pendingDeleteIds,
        mutationKind: "whole_cancel",
        localBeforeCount: draftItems.length,
        localAfterCount: 0,
      });
      if (!cleared) return;
    }
    resetSubcontractDraftContext({ clearForm: true });
    closeSubcontractFlow();
  }, [draftItems, closeSubcontractFlow, resetSubcontractDraftContext, saveDraftAtomic]);

  const hydrateSelectedSubcontract = useCallback(
    async (it: Subcontract) => {
      const nextForm: FormState = {
        ...form,
        objectCode: resolveCodeFromDict(dicts.objOptions || [], it.object_name) || form.objectCode,
        levelCode: resolveCodeFromDict(dicts.lvlOptions || [], it.work_zone) || form.levelCode,
        systemCode: resolveCodeFromDict(dicts.sysOptions || [], it.work_type) || form.systemCode,
        zoneText: form.zoneText || "",
      };
      const nextScopeKey = buildDraftScopeKey(nextForm, it.id);

      setSelectedTemplateId(String(it.id || "").trim() || null);
      setForm(nextForm);

      const existingDraft = await findLatestDraftRequestByLink(String(it.id || "").trim());
      if (existingDraft?.id) {
        const rid = String(existingDraft.id).trim();
        const label = String(existingDraft.request_no || existingDraft.display_no || "").trim();
        setRequestId(rid);
        setDisplayNo(label);
        activeDraftScopeKeyRef.current = nextScopeKey;
        await loadDraftItems(rid);
      } else {
        resetSubcontractDraftContext();
      }

      openSubcontractFlow("details");
    },
    [
      dicts.lvlOptions,
      dicts.objOptions,
      dicts.sysOptions,
      form,
      loadDraftItems,
      openSubcontractFlow,
      resetSubcontractDraftContext,
      setSelectedTemplateId,
    ],
  );

  const acceptApprovedFromDirector = useCallback(async (it: Subcontract) => {
    await hydrateSelectedSubcontract(it);
  }, [hydrateSelectedSubcontract]);

  return (
    <View style={{ flex: 1 }}>
      <ForemanSubcontractMainSections
        approvedContracts={approvedContracts}
        approvedContractsLoading={historyLoading}
        contentTopPad={contentTopPad}
        onScroll={onScroll}
        objOptions={dicts.objOptions}
        sysOptions={dicts.sysOptions}
        selectedTemplateId={selectedTemplateId}
        onSelectApprovedContract={acceptApprovedFromDirector}
        busy={saving || sending}
        onOpenRequestHistory={() => fetchRequestHistory(foremanName)}
        onOpenSubcontractHistory={() => {
          void loadHistory(userId);
          setHistoryOpen(true);
        }}
        ui={UI}
        styles={s}
      />

      <ForemanSubcontractModalStack
        subcontractDetailsVisible={subcontractDetailsVisible}
        onCloseSubcontractFlow={closeSubcontractFlow}
        modalHeaderTopPad={modalHeaderTopPad}
        templateContract={templateContract}
        templateObjectName={templateObjectName}
        templateLevelName={templateLevelName}
        templateSystemName={templateSystemName}
        formLevelCode={form.levelCode}
        formSystemCode={form.systemCode}
        formZoneText={form.zoneText}
        draftItemsCount={draftItems.length}
        lvlOptions={dicts.lvlOptions}
        sysOptions={dicts.sysOptions}
        onChangeLevelCode={(value) => setField("levelCode", value)}
        onChangeSystemCode={(value) => setField("systemCode", value)}
        onChangeZoneText={(value) => setField("zoneText", value)}
        onOpenCatalog={() => setSubcontractFlowScreen("catalog")}
        onOpenCalc={() => setSubcontractFlowScreen("workType")}
        onOpenDraft={() => setSubcontractFlowScreen("draft")}
        displayNo={displayNo}
        draftOpen={draftOpen}
        onCloseDraft={() => setSubcontractFlowScreen("details")}
        objectName={objectName}
        levelName={levelName}
        systemName={systemName}
        zoneName={zoneName}
        contractorName={templateContract?.contractor_org || form.contractorOrg || ""}
        phoneName={templateContract?.contractor_phone || form.contractorPhone || ""}
        volumeText={`${fmtAmount(templateContract?.qty_planned ?? toNum(form.qtyPlanned))} ${templateContract?.uom || form.uom || ""}`.trim()}
        draftItems={draftItems}
        saving={saving}
        sending={sending}
        requestId={requestId}
        onRemoveDraftItem={removeDraftItem}
        onClearDraft={() => void clearDraft()}
        onPdf={() => void onPdf()}
        onExcel={() => Alert.alert("Excel", "Р­РєСЃРїРѕСЂС‚ Excel РґР»СЏ РїРѕРґСЂСЏРґРѕРІ Р±СѓРґРµС‚ РґРѕР±Р°РІР»РµРЅ.")}
        onSendToDirector={() => void sendToDirector()}
        periodPickerVisible={!!dateTarget}
        onClosePeriodPicker={() => setDateTarget(null)}
        periodInitialFrom={dateTarget ? String(form[dateTarget] || "") : ""}
        periodInitialTo={dateTarget ? String(form[dateTarget] || "") : ""}
        onClearPeriod={() => {
          if (!dateTarget) return;
          setField(dateTarget, "");
          setDateTarget(null);
        }}
        onApplyPeriod={(from) => {
          if (!dateTarget) return;
          setField(dateTarget, String(from || ""));
          setDateTarget(null);
        }}
        ui={UI}
        catalogVisible={catalogVisible}
        onCloseCatalog={() => setSubcontractFlowScreen("details")}
        rikQuickSearch={rikQuickSearch}
        onCommitCatalogToDraft={(rows) => void appendCatalogRows(rows)}
        onOpenDraftFromCatalog={() => {
          setSubcontractFlowScreen("draft");
        }}
        workTypePickerVisible={workTypePickerVisible}
        onCloseWorkTypePicker={() => setSubcontractFlowScreen("details")}
        onSelectWorkType={(wt) => {
          setSelectedWorkType(wt);
          setSubcontractFlowScreen("calc");
        }}
        calcVisible={calcVisible}
        onCloseCalc={() => {
          setSubcontractFlowScreen("details");
          setSelectedWorkType(null);
        }}
        onBackFromCalc={() => {
          setSubcontractFlowScreen("workType");
        }}
        selectedWorkType={selectedWorkType}
        onAddCalcToRequest={async (rows) => {
          await appendCalcRows(rows as CalcPickedRow[]);
          setSubcontractFlowScreen("details");
          setSelectedWorkType(null);
        }}
        requestHistoryVisible={requestHistoryVisible}
        onCloseRequestHistory={closeRequestHistory}
        requestHistoryLoading={requestHistoryLoading}
        requestHistoryRequests={historyRequests}
        resolveRequestStatusInfo={resolveRequestStatusInfo}
        onShowRequestDetails={(request) => void handleRequestHistorySelect(request.id)}
        onSelectRequest={(request) => void handleRequestHistorySelect(request.id)}
        onReopenRequest={(request) => void handleRequestHistorySelect(request.id)}
        onOpenRequestPdf={(reqId) => void openRequestHistoryPdf(reqId)}
        shortId={shortId}
        styles={s}
        subcontractHistoryVisible={historyOpen}
        onCloseSubcontractHistory={() => setHistoryOpen(false)}
        subcontractHistoryLoading={historyLoading}
        subcontractHistory={history}
      />


    </View>
  );
}
