import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Platform,
  View,
} from "react-native";
import RNModal from "react-native-modal";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabaseClient";
import PeriodPickerSheet from "../../components/PeriodPickerSheet";
import CatalogModal, { type PickedRow as CatalogPickedRow } from "../../components/foreman/CatalogModal";
import WorkTypePicker from "../../components/foreman/WorkTypePicker";
import CalcModal from "../../components/foreman/CalcModal";
import {
  rikQuickSearch,
  requestCreateDraft,
  requestSubmit,
  updateRequestMeta,
  listRequestItems,
  addRequestItemsFromRikBatch,
  exportRequestPdf,
  clearCachedDraftRequestId,
  type ReqItemRow,
  type RequestMetaPatch
} from "../../lib/catalog_api";
import { useRouter } from "expo-router";
import { buildPdfFileName } from "../../lib/documents/pdfDocument";
import { preparePdfDocument, previewPdfDocument } from "../../lib/documents/pdfDocumentActions";
import { generateRequestPdfDocument } from "../../lib/documents/pdfDocumentGenerators";
import ForemanHistoryBar from "./ForemanHistoryBar";
import ForemanHistoryModal from "./ForemanHistoryModal";
import ForemanSubcontractHistoryModal from "./ForemanSubcontractHistoryModal";
import {
  ApprovedContractsList,
  DraftSheetBody,
  SubcontractDetailsModalBody,
} from "./ForemanSubcontractTab.sections";
import { s } from "./foreman.styles";
import { REQUEST_STATUS_STYLES, UI } from "./foreman.ui";
import { resolveStatusInfo as resolveStatusHelper, shortId } from "./foreman.helpers";
import {
  STATUS_CONFIG,
  fmtAmount,
  listForemanSubcontracts,
  type Subcontract,
  type SubcontractPriceType,
  type SubcontractWorkMode,
} from "../subcontracts/subcontracts.shared";
import {
  fetchForemanRequestDisplayLabel,
  type ForemanRequestDirectPatch,
  fetchForemanRequestLink,
  findLatestDraftRequestByLink,
  patchForemanRequestLink,
  pickForemanRequestLinkId,
} from "./foreman.requests";
import { readForemanProfileName } from "./foreman.dicts.repo";
import { useForemanHistory } from "./hooks/useForemanHistory";

type Props = {
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

type LinkedRequestRow = {
  id: string;
  created_at: string | null;
  display_no: string | null;
  request_no: string | null;
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

type DateTarget = "contractDate" | "dateStart" | "dateEnd" | null;

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

const pickName = (arr: Array<{ code?: string; name?: string }>, code: string) => {
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

const logForemanSubcontractDebug = (...args: unknown[]) => {
  if (!__DEV__) return;
  console.warn(...args);
};

const warnForemanSubcontract = (scope: string, error: unknown) => {
  logForemanSubcontractDebug(`[ForemanSubcontractTab] ${scope}:`, error);
};

const resolveRequestStatusInfo = (raw?: string | null) =>
  resolveStatusHelper(raw, REQUEST_STATUS_STYLES);

export default function ForemanSubcontractTab({ contentTopPad, onScroll, dicts }: Props) {
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

  const [draftOpen, setDraftOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [catalogVisible, setCatalogVisible] = useState(false);
  const [workTypePickerVisible, setWorkTypePickerVisible] = useState(false);
  const [calcVisible, setCalcVisible] = useState(false);
  const [subcontractModalOpen, setSubcontractModalOpen] = useState(false);
  const [selectedWorkType, setSelectedWorkType] = useState<{ code: string; name: string } | null>(null);
  const [draftItems, setDraftItems] = useState<ReqItemRow[]>([]);
  const [dateTarget, setDateTarget] = useState<DateTarget>(null);
  const [templateContract, setTemplateContract] = useState<Subcontract | null>(null);
  const [requestId, setRequestId] = useState("");
  const activeDraftScopeKeyRef = useRef("");

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

  const setField = useCallback(<K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((prev) => ({ ...prev, [k]: v }));
  }, []);

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
    if (!uid) return;
    setHistoryLoading(true);
    try {
      const rows = await listForemanSubcontracts(uid);
      setHistory(rows);
    } catch (e) {
      Alert.alert("Не удалось загрузить данные", getErrorMessage(e, "Не удалось загрузить историю подрядов."));
    } finally {
      setHistoryLoading(false);
    }
  }, [userId]);

  const loadDraftItems = useCallback(async (rid: string) => {
    const id = String(rid || "").trim();
    if (!id) {
      setDraftItems([]);
      return;
    }
    try {
      const rows = await listRequestItems(id);
      setDraftItems(rows || []);
    } catch (e) {
      logForemanSubcontractDebug("[loadDraftItems] error:", e);
      setDraftItems([]);
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

  const draftScopeKey = useMemo(() => buildDraftScopeKey(form, templateContract?.id), [form, templateContract]);
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
    const subcontractId = String(templateContract?.id || "").trim();
    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        const patch: RequestMetaPatch = {
          subcontract_id: subcontractId || null,
          contractor_job_id: subcontractId || null,
          object_type_code: form.objectCode || templateObjectCode || null,
          level_code: form.levelCode || templateLevelCode || null,
          system_code: form.systemCode || templateSystemCode || null,
          object_name: objectName || templateObjectName || null,
          level_name: levelName || templateLevelName || null,
          system_name: systemName || templateSystemName || null,
          zone_name: String(form.zoneText || "").trim() || null,
          comment: scopeNote || null,
        };
        const ok = await updateRequestMeta(rid, patch);
        if (!ok || cancelled) return;
      })();
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    requestId,
    templateContract?.id,
    form.objectCode,
    form.levelCode,
    form.systemCode,
    form.zoneText,
    objectName,
    levelName,
    systemName,
    templateObjectCode,
    templateLevelCode,
    templateSystemCode,
    templateObjectName,
    templateLevelName,
    templateSystemName,
    scopeNote,
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

  const ensureDraftOnly = useCallback(async (): Promise<string | null> => {
    const subcontractId = ensureTemplateContractStrict();
    if (!subcontractId) return null;

    const scopeChanged = activeDraftScopeKeyRef.current !== draftScopeKey;

    if (requestId && !scopeChanged) {
      if (draftItems.length === 0) await loadDraftItems(requestId);
      return requestId;
    }

    if (!userId) {
      Alert.alert("Данные не загружены", "Профиль пользователя не найден.");
      return null;
    }

    setSaving(true);
    try {
      const existingDraft = await findLatestDraftRequestByLink(subcontractId);
      if (existingDraft?.id) {
        const rid = String(existingDraft.id).trim();
        const displayLabel = String(existingDraft.request_no || existingDraft.display_no || "").trim();
        setRequestId(rid);
        setDisplayNo(displayLabel);
        activeDraftScopeKeyRef.current = draftScopeKey;
        await loadDraftItems(rid);
        return rid;
      }

      // Clear Rik draft cache to ensure autonomy from Materials tab
      clearCachedDraftRequestId();
      const res = await requestCreateDraft(requestMetaFromTemplate);
      if (!res?.id) throw new Error("Не удалось создать черновик заявки.");
      const rid = String(res.id);

      const meta: RequestMetaPatch = requestMetaFromTemplate;
      const metaOk = await updateRequestMeta(rid, meta);
      if (!metaOk) {
        throw new Error("Не удалось сохранить привязку заявки к подряду (subcontract_id).");
      }

      const objectNameForRequest = String(
        templateObjectName || objectName || templateContract?.object_name || "",
      ).trim();
      const directPatch: ForemanRequestDirectPatch = {
        subcontract_id: subcontractId,
        contractor_job_id: subcontractId,
      };
      if (objectNameForRequest) {
        directPatch.object_name = objectNameForRequest;
      }
      const directError = await patchForemanRequestLink(rid, directPatch);
      if (directError) {
        logForemanSubcontractDebug("[foreman.subcontract][requests.patch400.direct]", {
          request_id: rid,
          payload: directPatch,
          error: directError,
        });
        const msg = String(directError.message || "");
        if (msg.toLowerCase().includes("does not exist")) {
          throw new Error("В таблице requests отсутствуют поля subcontract_id/contractor_job_id. Нужна миграция БД.");
        }
        throw new Error(directError.message || "Не удалось сохранить привязку заявки к подряду.");
      }

      const displayLabel = String(res?.display_no || "DRAFT").trim() || "DRAFT";
      setRequestId(rid);
      setDisplayNo(displayLabel || res.display_no || "DRAFT");
      activeDraftScopeKeyRef.current = draftScopeKey;
      return rid;
    } catch (e) {
      Alert.alert("Не удалось создать черновик", getErrorMessage(e, "Не удалось создать черновик заявки."));
      return null;
    } finally {
      setSaving(false);
    }
  }, [
    requestId,
    userId,
    draftScopeKey,
    templateContract,
    draftItems,
    loadDraftItems,
    requestMetaFromTemplate,
    templateObjectName,
    objectName,
    ensureTemplateContractStrict,
  ]);

  const appendCatalogRows = useCallback(async (rows: CatalogPickedRow[]) => {
    if (!rows?.length) return;
    const rid = await ensureDraftOnly();
    if (!rid) return;

    setSaving(true);
    try {
      await addRequestItemsFromRikBatch(
        rid,
        rows.map((r) => ({
          rik_code: r.rik_code || "",
          qty: Math.max(1, Number(String(r.qty || "1").replace(",", ".")) || 1),
          opts: {
            name_human: r.name || "",
            uom: r.uom || null,
            note: scopeNote || null,
          },
        })),
      );
      await loadDraftItems(rid);
    } catch (e) {
      Alert.alert("Не удалось обновить заявку", getErrorMessage(e, "Не удалось добавить позиции из каталога."));
    } finally {
      setSaving(false);
    }
  }, [ensureDraftOnly, loadDraftItems, scopeNote]);

  const appendCalcRows = useCallback(async (rows: CalcPickedRow[]) => {
    if (!rows?.length) return;
    const rid = await ensureDraftOnly();
    if (!rid) return;

    setSaving(true);
    try {
      await addRequestItemsFromRikBatch(
        rid,
        rows.map((r) => ({
          rik_code: r.rik_code || "",
          qty: Math.max(1, Number(r.qty) || 1),
          opts: {
            name_human: r.item_name_ru || r.name_human || "Без названия",
            uom: r.uom_code || null,
            note: scopeNote || null,
          },
        })),
      );
      await loadDraftItems(rid);
    } catch (e) {
      Alert.alert("Не удалось обновить заявку", getErrorMessage(e, "Не удалось добавить позиции из сметы."));
    } finally {
      setSaving(false);
    }
  }, [ensureDraftOnly, loadDraftItems, scopeNote]);

  const removeDraftItem = useCallback(async (id: string) => {
    try {
      setSaving(true);
      const { error } = await supabase.from("request_items").delete().eq("id", id);
      if (error) throw error;
      await loadDraftItems(requestId);
    } catch (e) {
      Alert.alert("Не удалось обновить заявку", getErrorMessage(e, "Не удалось удалить позицию."));
    } finally {
      setSaving(false);
    }
  }, [loadDraftItems, requestId]);

  const sendToDirector = useCallback(async () => {
    const subcontractId = ensureTemplateContractStrict();
    if (!subcontractId) return;

    if (!requestId) {
      Alert.alert("Внимание", "Сначала сформируйте заявку.");
      return;
    }
    setSending(true);
    try {
      let linked = null;
      try {
        linked = await fetchForemanRequestLink(requestId);
      } catch (error) {
        const msg = getErrorMessage(error, "");
        if (msg.toLowerCase().includes("does not exist")) {
          throw new Error("В таблице requests отсутствуют поля subcontract_id/contractor_job_id. Нужна миграция БД.");
        }
        throw error;
      }
      const reqLink = pickForemanRequestLinkId(linked);
      if (!reqLink || reqLink !== subcontractId) {
        throw new Error("Текущая заявка привязана к другому подряду.");
      }

      await requestSubmit(requestId);
      Alert.alert("Успешно", "Заявка отправлена директору.");
      await loadHistory(userId);
      setRequestId("");
      setDisplayNo("");
      setDraftItems([]);
      setTemplateContract(null);
      setSubcontractModalOpen(false);
      activeDraftScopeKeyRef.current = "";
      setDraftOpen(false);
    } catch (e) {
      Alert.alert("Не удалось отправить заявку", getErrorMessage(e, "Не удалось отправить заявку директору."));
    } finally {
      setSending(false);
    }
  }, [requestId, loadHistory, userId, ensureTemplateContractStrict]);

  const onPdf = useCallback(async () => {
    const rid = String(requestId || "").trim();
    if (!rid) {
      Alert.alert("PDF", "Сначала создайте черновик заявки.");
      return;
    }
    const template = await generateRequestPdfDocument({
      requestId: rid,
      originModule: "foreman",
    });
    const title = displayNo ? `Черновик ${displayNo}` : `Черновик ${rid}`;
    const doc = await preparePdfDocument({
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
      getRemoteUrl: () => template.uri,
    });
    await previewPdfDocument(doc, { router });
  }, [requestId, displayNo, router]);

  const openRequestHistoryPdf = useCallback(async (reqId: string) => {
    const rid = String(reqId || "").trim();
    if (!rid) return;
    const template = await generateRequestPdfDocument({
      requestId: rid,
      originModule: "foreman",
    });
    const doc = await preparePdfDocument({
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
      getRemoteUrl: () => template.uri,
    });
    await previewPdfDocument(doc, { router });
  }, [router]);

  const handleRequestHistorySelect = useCallback(async (reqId: string) => {
    closeRequestHistory();
    await openRequestHistoryPdf(reqId);
  }, [closeRequestHistory, openRequestHistoryPdf]);

  const clearDraft = useCallback(async () => {
    if (requestId) {
      try {
        await supabase.from("request_items").delete().eq("request_id", requestId);
      } catch (e) {
        Alert.alert("Не удалось очистить черновик", getErrorMessage(e, "Не удалось очистить черновик."));
        return;
      }
    }
    setRequestId("");
    setDisplayNo("");
    setForm(EMPTY_FORM);
    setDraftItems([]);
    setTemplateContract(null);
    setSubcontractModalOpen(false);
    activeDraftScopeKeyRef.current = "";
    setDraftOpen(false);
  }, [requestId]);

  const openFromHistory = useCallback((it: Subcontract) => {
    // History row is a subcontract template, not a material request draft.
    // Reset request draft and switch current template to selected subcontract.
    setTemplateContract(it);
    setForm((prev) => ({
      ...prev,
      objectCode: resolveCodeFromDict(dicts.objOptions || [], it.object_name) || prev.objectCode,
      levelCode: resolveCodeFromDict(dicts.lvlOptions || [], it.work_zone) || prev.levelCode,
      systemCode: resolveCodeFromDict(dicts.sysOptions || [], it.work_type) || prev.systemCode,
      zoneText: prev.zoneText || "",
    }));
    setRequestId("");
    setDisplayNo("");
    setDraftItems([]);
    activeDraftScopeKeyRef.current = "";
    setSubcontractModalOpen(true);
    setHistoryOpen(false);
  }, [dicts.lvlOptions, dicts.objOptions, dicts.sysOptions]);

  const acceptApprovedFromDirector = useCallback((it: Subcontract) => {
    setTemplateContract(it);
    setForm((prev) => ({
      ...prev,
      objectCode: resolveCodeFromDict(dicts.objOptions || [], it.object_name) || prev.objectCode,
      levelCode: resolveCodeFromDict(dicts.lvlOptions || [], it.work_zone) || prev.levelCode,
      systemCode: resolveCodeFromDict(dicts.sysOptions || [], it.work_type) || prev.systemCode,
      zoneText: prev.zoneText || "",
    }));
    setRequestId(""); // Force new draft on first item
    setDisplayNo("");
    setSubcontractModalOpen(true);
  }, [dicts.lvlOptions, dicts.objOptions, dicts.sysOptions]);

  return (
    <View style={{ flex: 1 }}>
      <ApprovedContractsList
        approvedContracts={approvedContracts}
        historyLoading={historyLoading}
        contentTopPad={contentTopPad}
        onScroll={onScroll}
        objOptions={dicts.objOptions}
        sysOptions={dicts.sysOptions}
        selectedTemplateId={templateContract?.id ?? null}
        onSelect={acceptApprovedFromDirector}
      />

      <RNModal
        isVisible={subcontractModalOpen && !!templateContract}
        onBackdropPress={() => setSubcontractModalOpen(false)}
        onBackButtonPress={() => setSubcontractModalOpen(false)}
        backdropOpacity={0.45}
        useNativeDriver={Platform.OS !== "web"}
        useNativeDriverForBackdrop={Platform.OS !== "web"}
        hideModalContentWhileAnimating
        style={{ margin: 0 }}
      >
        <SubcontractDetailsModalBody
          modalHeaderTopPad={modalHeaderTopPad}
          onClose={() => setSubcontractModalOpen(false)}
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
          onOpenCatalog={() => setCatalogVisible(true)}
          onOpenCalc={() => setWorkTypePickerVisible(true)}
          onOpenDraft={() => setDraftOpen(true)}
          displayNo={displayNo}
        />
      </RNModal>

      <ForemanHistoryBar
        busy={saving || sending}
        onOpenRequestHistory={() => fetchRequestHistory(foremanName)}
        onOpenSubcontractHistory={() => setHistoryOpen(true)}
        ui={UI}
        styles={s}
      />

      <RNModal
        isVisible={draftOpen}
        onBackdropPress={() => setDraftOpen(false)}
        onBackButtonPress={() => setDraftOpen(false)}
        backdropOpacity={0.55}
        useNativeDriver={Platform.OS !== "web"}
        useNativeDriverForBackdrop={Platform.OS !== "web"}
        hideModalContentWhileAnimating
        style={{ margin: 0, justifyContent: "flex-end" }}
      >
        <DraftSheetBody
          displayNo={displayNo}
          onClose={() => setDraftOpen(false)}
          objectName={objectName}
          templateObjectName={templateObjectName}
          levelName={levelName}
          templateLevelName={templateLevelName}
          systemName={systemName}
          templateSystemName={templateSystemName}
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
          onExcel={() => Alert.alert("Excel", "Экспорт Excel для подрядов будет добавлен.")}
          onSendToDirector={() => void sendToDirector()}
        />
      </RNModal>

      <PeriodPickerSheet
        visible={!!dateTarget}
        onClose={() => setDateTarget(null)}
        initialFrom={dateTarget ? String(form[dateTarget] || "") : ""}
        initialTo={dateTarget ? String(form[dateTarget] || "") : ""}
        onClear={() => {
          if (!dateTarget) return;
          setField(dateTarget, "");
          setDateTarget(null);
        }}
        onApply={(from) => {
          if (!dateTarget) return;
          setField(dateTarget, String(from || ""));
          setDateTarget(null);
        }}
        ui={{
          cardBg: UI.cardBg,
          text: UI.text,
          sub: UI.sub,
          border: "rgba(255,255,255,0.14)",
          approve: UI.btnApprove,
          accentBlue: "#3B82F6",
        }}
      />

      <CatalogModal
        visible={catalogVisible}
        onClose={() => setCatalogVisible(false)}
        rikQuickSearch={rikQuickSearch}
        onCommitToDraft={(rows) => void appendCatalogRows(rows)}
        onOpenDraft={() => {
          setCatalogVisible(false);
          setDraftOpen(true);
        }}
        draftCount={draftItems.length}
      />

      <WorkTypePicker
        visible={workTypePickerVisible}
        onClose={() => setWorkTypePickerVisible(false)}
        onSelect={(wt) => {
          setSelectedWorkType(wt);
          setWorkTypePickerVisible(false);
          setCalcVisible(true);
        }}
      />

      <CalcModal
        visible={calcVisible}
        onClose={() => {
          setCalcVisible(false);
          setSelectedWorkType(null);
        }}
        onBack={() => {
          setCalcVisible(false);
          setSelectedWorkType(null);
          setWorkTypePickerVisible(true);
        }}
        workType={selectedWorkType}
        onAddToRequest={async (rows) => {
          await appendCalcRows(rows as CalcPickedRow[]);
          setCalcVisible(false);
          setSelectedWorkType(null);
        }}
      />

      <ForemanHistoryModal
        visible={requestHistoryVisible}
        onClose={closeRequestHistory}
        loading={requestHistoryLoading}
        requests={historyRequests}
        resolveStatusInfo={resolveRequestStatusInfo}
        onSelect={(reqId) => void handleRequestHistorySelect(reqId)}
        onOpenPdf={(reqId) => void openRequestHistoryPdf(reqId)}
        isPdfBusy={() => false}
        shortId={shortId}
        styles={s}
      />

      <ForemanSubcontractHistoryModal
        visible={historyOpen}
        onClose={() => setHistoryOpen(false)}
        loading={historyLoading}
        history={history}
        styles={s}
        ui={UI}
      />

    </View>
  );
}




