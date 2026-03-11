import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import RNModal from "react-native-modal";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
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
  addRequestItemFromRik,
  exportRequestPdf,
  clearCachedDraftRequestId,
  type ReqItemRow,
  type RequestMetaPatch
} from "../../lib/catalog_api";
import { runPdfTop } from "../../lib/pdfRunner";
import ForemanDropdown from "./ForemanDropdown";
import { s } from "./foreman.styles";
import { UI } from "./foreman.ui";
import DeleteAllButton from "../../ui/DeleteAllButton";
import SendPrimaryButton from "../../ui/SendPrimaryButton";
import CloseIconButton from "../../ui/CloseIconButton";
import {
  STATUS_CONFIG,
  fmtAmount,
  listForemanSubcontracts,
  type Subcontract,
  type SubcontractPriceType,
  type SubcontractWorkMode,
} from "../subcontracts/subcontracts.shared";

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
let requestsHasRequestNoCache: boolean | null = null;

async function resolveRequestsHasRequestNo(): Promise<boolean> {
  if (requestsHasRequestNoCache != null) return requestsHasRequestNoCache;
  try {
    const q = await supabase.from("requests" as any).select("*").limit(1);
    if (q.error) throw q.error;
    const first = Array.isArray(q.data) && q.data.length ? (q.data[0] as Record<string, any>) : null;
    requestsHasRequestNoCache = !!first && Object.prototype.hasOwnProperty.call(first, "request_no");
    return requestsHasRequestNoCache;
  } catch {
    requestsHasRequestNoCache = false;
    return false;
  }
}

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

export default function ForemanSubcontractTab({ contentTopPad, onScroll, dicts }: Props) {
  const insets = useSafeAreaInsets();
  const modalHeaderTopPad = Platform.OS === "web" ? 16 : (insets.top + 10);
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
      Alert.alert("Ошибка", getErrorMessage(e, "Не удалось загрузить историю подрядов."));
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
      console.warn("[loadDraftItems] error:", e);
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
          const { data: prof } = await supabase
            .from("user_profiles")
            .select("full_name")
            .eq("user_id", uid)
            .maybeSingle();
          const x = String((prof as { full_name?: string } | null)?.full_name || "").trim();
          if (x) setForemanName(x);
        } catch (e) {
          console.warn("foreman profile load failed", e);
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
        const hasRequestNo = await resolveRequestsHasRequestNo();
        const primarySelect = hasRequestNo ? "request_no, display_no" : "display_no";
        let rq = await supabase
          .from("requests" as any)
          .select(primarySelect)
          .eq("id", requestId)
          .maybeSingle();
        if (rq.error) {
          const msg = String(rq.error.message || "").toLowerCase();
          const requestNoMissing =
            primarySelect.includes("request_no") &&
            (msg.includes("request_no") || msg.includes("column") || msg.includes("does not exist"));
          if (requestNoMissing) {
            requestsHasRequestNoCache = false;
            rq = await supabase
              .from("requests" as any)
              .select("display_no")
              .eq("id", requestId)
              .maybeSingle();
          }
        } else if (primarySelect.includes("request_no")) {
          requestsHasRequestNoCache = true;
        }
        if (cancelled || rq.error || !rq.data) return;
        const label = String((rq.data as any).request_no || (rq.data as any).display_no || "").trim();
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
      Alert.alert("Ошибка", "Профиль пользователя не найден.");
      return null;
    }

    setSaving(true);
    try {
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
      const directPatch: Record<string, any> = {
        subcontract_id: subcontractId,
        contractor_job_id: subcontractId,
      };
      if (objectNameForRequest) {
        directPatch.object_name = objectNameForRequest;
      }
      const directRes = await supabase
        .from("requests")
        .update(directPatch as any)
        .eq("id", rid);
      if (directRes.error) {
        console.warn("[foreman.subcontract][requests.patch400.direct]", {
          request_id: rid,
          payload: directPatch,
          error: {
            message: String((directRes.error as any)?.message ?? ""),
            code: String((directRes.error as any)?.code ?? ""),
            details: (directRes.error as any)?.details ?? null,
            hint: (directRes.error as any)?.hint ?? null,
          },
        });
        const msg = String(directRes.error.message || "");
        if (msg.toLowerCase().includes("does not exist")) {
          throw new Error("В таблице requests отсутствуют поля subcontract_id/contractor_job_id. Нужна миграция БД.");
        }
        throw directRes.error;
      }

      const displayLabel = String((res as any)?.request_no || res?.display_no || "DRAFT").trim() || "DRAFT";
      setRequestId(rid);
      setDisplayNo(displayLabel || res.display_no || "DRAFT");
      activeDraftScopeKeyRef.current = draftScopeKey;
      return rid;
    } catch (e) {
      Alert.alert("Ошибка", getErrorMessage(e, "Не удалось создать черновик заявки."));
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
      for (const r of rows) {
        await addRequestItemFromRik(
          rid,
          r.rik_code || "",
          Math.max(1, Number(String(r.qty || "1").replace(",", ".")) || 1),
          {
            name_human: r.name || "",
            uom: r.uom || null,
            note: scopeNote || null,
          }
        );
      }
      await loadDraftItems(rid);
    } catch (e) {
      Alert.alert("Ошибка", getErrorMessage(e, "Не удалось добавить позиции из каталога."));
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
      for (const r of rows) {
        await addRequestItemFromRik(
          rid,
          r.rik_code || "",
          Math.max(1, Number(r.qty) || 1),
          {
            name_human: r.item_name_ru || r.name_human || "Без названия",
            uom: r.uom_code || null,
            note: scopeNote || null,
          },
        );
      }
      await loadDraftItems(rid);
    } catch (e) {
      Alert.alert("Ошибка", getErrorMessage(e, "Не удалось добавить позиции из сметы."));
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
      Alert.alert("Ошибка", getErrorMessage(e, "Не удалось удалить позицию."));
    } finally {
      setSaving(false);
    }
  }, [loadDraftItems, requestId]);

  const sendToDirector = useCallback(async () => {
    const subcontractId = ensureTemplateContractStrict();
    if (!subcontractId) return;

    if (!requestId) {
      Alert.alert("Ошибка", "Сначала сформируйте заявку.");
      return;
    }
    setSending(true);
    try {
      const linked = await supabase
        .from("requests")
        .select("id, subcontract_id, contractor_job_id")
        .eq("id", requestId)
        .maybeSingle();
      if (linked.error) {
        const msg = String(linked.error.message || "");
        if (msg.toLowerCase().includes("does not exist")) {
          throw new Error("В таблице requests отсутствуют поля subcontract_id/contractor_job_id. Нужна миграция БД.");
        }
        throw linked.error;
      }
      const reqLink = String(
        (linked.data as any)?.subcontract_id || (linked.data as any)?.contractor_job_id || ""
      ).trim();
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
      Alert.alert("Ошибка", getErrorMessage(e, "Не удалось отправить заявку директору."));
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
    const fileName = displayNo ? `Черновик_${displayNo}` : `Черновик_${rid}`;
    await runPdfTop({
      supabase,
      key: `pdf:subcontracts-request:${rid}`,
      label: "Формируем PDF...",
      mode: "preview",
      fileName,
      getRemoteUrl: () => exportRequestPdf(rid, "preview"),
    });
  }, [requestId, displayNo]);

  const clearDraft = useCallback(async () => {
    if (requestId) {
      try {
        await supabase.from("request_items").delete().eq("request_id", requestId);
      } catch (e) {
        Alert.alert("Ошибка", getErrorMessage(e, "Не удалось очистить черновик."));
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
      <ScrollView
        contentContainerStyle={{ paddingTop: contentTopPad, paddingHorizontal: 16, paddingBottom: 120 }}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      >
        <View
          style={{
            borderRadius: 14,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.12)",
            backgroundColor: "rgba(17,26,42,0.55)",
            paddingHorizontal: 8,
            paddingVertical: 8,
            marginBottom: 20,
          }}
        >
          {historyLoading ? (
            <View style={{ paddingVertical: 14 }}>
              <ActivityIndicator color={UI.text} />
            </View>
          ) : approvedContracts.length === 0 ? (
            <Text style={{ color: UI.sub, fontWeight: "700", paddingVertical: 8 }}>
              Нет утвержденных подрядов
            </Text>
          ) : (
            approvedContracts.map((item) => (
              (() => {
                                const objectLabel =
                  resolveCodeOrName(dicts.objOptions || [], item.object_name) ||
                  String(item.object_name || "").trim() ||
                  "—";
                const workLabel =
                  resolveCodeOrName(dicts.sysOptions || [], item.work_type) ||
                  String(item.work_type || "").trim() ||
                  "—";
                return (
              <Pressable
                key={item.id}
                onPress={() => acceptApprovedFromDirector(item)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  paddingVertical: 12,
                  paddingHorizontal: 10,
                  borderRadius: 12,
                  backgroundColor:
                    String(templateContract?.id || "") === String(item.id || "")
                      ? "rgba(34,197,94,0.14)"
                      : "rgba(255,255,255,0.04)",
                  borderWidth: 1,
                  borderColor:
                    String(templateContract?.id || "") === String(item.id || "")
                      ? "rgba(34,197,94,0.28)"
                      : "rgba(255,255,255,0.12)",
                  marginBottom: 14,
                  shadowColor: "#000",
                  shadowOpacity: 0.16,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 3,
                }}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  
                  <Text style={{ color: UI.sub, fontWeight: "700" }} numberOfLines={1}>
                    {item.contractor_org || "—"} · {objectLabel}
                  </Text>
                  <Text style={{ color: "rgba(255,255,255,0.65)", fontWeight: "700" }} numberOfLines={1}>
                    {workLabel} · {fmtAmount(item.qty_planned)} {item.uom || ""}
                  </Text>
                </View>
                <Ionicons
                  name={String(templateContract?.id || "") === String(item.id || "") ? "checkmark-circle" : "chevron-forward"}
                  size={18}
                  color={String(templateContract?.id || "") === String(item.id || "") ? "#22C55E" : UI.sub}
                />
              </Pressable>
                );
              })()
            ))
          )}
        </View>

        <View style={{ marginTop: 40, alignItems: 'center' }}>
          <Ionicons name="hand-left-outline" size={48} color={UI.sub} />
          <Text style={{ color: UI.sub, fontSize: 16, textAlign: 'center', marginTop: 12 }}>
            Нажми на карточку подряда выше.
          </Text>
        </View>
      </ScrollView>

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
        <View style={{ flex: 1, backgroundColor: UI.cardBg }}>
          <View style={{ paddingHorizontal: 16, paddingTop: modalHeaderTopPad, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.10)" }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ color: UI.text, fontSize: 20, fontWeight: "900" }}>Детали подряда</Text>
              <Pressable onPress={() => setSubcontractModalOpen(false)}>
                <Text style={{ color: UI.sub, fontWeight: "900" }}>Закрыть</Text>
              </Pressable>
            </View>
          </View>

          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120, paddingTop: 10 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          >
            <View style={s.detailsCard}>
              <Text style={s.detailsRow}><Text style={s.detailsLabel}>ПОДРЯДЧИК:</Text> {templateContract?.contractor_org || "—"}</Text>
              <Text style={s.detailsRow}><Text style={s.detailsLabel}>ТЕЛЕФОН:</Text> {templateContract?.contractor_phone || "—"}</Text>
              <View style={{ height: 8 }} />
              <Text style={s.detailsRow}><Text style={s.detailsLabel}>ОБЪЕКТ:</Text> {templateObjectName || "—"}</Text>
              <Text style={s.detailsRow}><Text style={s.detailsLabel}>ЭТАЖ/УРОВЕНЬ:</Text> {templateLevelName || "—"}</Text>
              <Text style={s.detailsRow}><Text style={s.detailsLabel}>ВИД РАБОТ:</Text> {templateSystemName || "—"}</Text>
              <Text style={s.detailsRow}><Text style={s.detailsLabel}>ОБЪЕМ:</Text> {fmtAmount(templateContract?.qty_planned)} {templateContract?.uom || ""}</Text>
              <View style={{ height: 10 }} />
              <Text style={s.detailsRow}>
                <Text style={s.detailsLabel}>ПАРАМЕТРЫ ЗАЯВКИ (REQ):</Text> этаж, вид работ, зона
              </Text>
              <View style={{ marginTop: 8, gap: 8 }}>
                <ForemanDropdown
                  label="Этаж / уровень"
                  value={form.levelCode}
                  options={dicts.lvlOptions}
                  placeholder={templateLevelName || "Выбери этаж/уровень"}
                  onChange={(value) => setField("levelCode", value)}
                  ui={UI}
                  styles={s}
                />
                <ForemanDropdown
                  label="Вид работ / система"
                  value={form.systemCode}
                  options={dicts.sysOptions}
                  placeholder={templateSystemName || "Выбери вид работ"}
                  onChange={(value) => setField("systemCode", value)}
                  ui={UI}
                  styles={s}
                />
                <TextInput
                  value={form.zoneText}
                  onChangeText={(v) => setField("zoneText", v)}
                  placeholder="Зона / участок (например: секция A)"
                  placeholderTextColor="rgba(255,255,255,0.45)"
                  style={s.input}
                />
              </View>
            </View>

            <View style={s.pickTabsRow}>
              <Pressable
                style={s.pickTabBtn}
                onPress={() => setCatalogVisible(true)}
              >
                <Ionicons name="list" size={18} color={UI.text} />
                <Text style={s.pickTabText}>Каталог</Text>
              </Pressable>
              <Pressable
                style={s.pickTabBtn}
                onPress={() => setWorkTypePickerVisible(true)}
              >
                <Ionicons name="calculator" size={18} color={UI.text} />
                <Text style={s.pickTabText}>Смета</Text>
              </Pressable>
            </View>

            <Pressable
              style={s.draftCard}
              onPress={() => setDraftOpen(true)}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.draftTitle}>ЗАЯВКА НА МАТЕРИАЛЫ</Text>
                <Text style={s.draftNo}>{displayNo || "будет создана автоматически"}</Text>
                <Text style={s.draftHint}>{draftItems.length > 0 ? "Открыть позиции и отправить" : "Добавьте материалы из каталога или сметы"}</Text>
              </View>
              <View style={s.posPill}>
                <Ionicons name="cube" size={18} color={UI.text} />
                <Text style={s.posPillText}>Позиции</Text>
                <View style={s.posCountPill}><Text style={s.posCountText}>{draftItems.length}</Text></View>
              </View>
            </Pressable>
          </ScrollView>
        </View>
      </RNModal>

      <View style={s.stickyBar}>
        <Pressable style={s.miniBtn} onPress={() => setHistoryOpen(true)}>
          <Ionicons name="time-outline" size={20} color={UI.text} />
          <Text style={s.miniText}>История</Text>
        </Pressable>
      </View>

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
        <View style={s.sheet}>
          <View style={s.sheetHandle} />

          <View style={s.sheetTopBar}>
            <Text style={s.sheetTitle} numberOfLines={1}>Черновик {displayNo || ""}</Text>
            <CloseIconButton onPress={() => setDraftOpen(false)} accessibilityLabel="Закрыть черновик" size={24} color={UI.text} />
          </View>

          <View style={s.sheetMetaBox}>
            <Text style={s.sheetMetaLine}>
              Объект: <Text style={s.sheetMetaValue}>{objectName || templateObjectName || "—"}</Text>
            </Text>
            <Text style={s.sheetMetaLine}>
              Этаж/уровень: <Text style={s.sheetMetaValue}>{levelName || templateLevelName || "—"}</Text>
            </Text>
            <Text style={s.sheetMetaLine}>
              Система: <Text style={s.sheetMetaValue}>{systemName || templateSystemName || "—"}</Text>
            </Text>
            <Text style={s.sheetMetaLine}>
              Зона: <Text style={s.sheetMetaValue}>{zoneName || "—"}</Text>
            </Text>
            <Text style={s.sheetMetaLine}>
              Подрядчик: <Text style={s.sheetMetaValue}>{templateContract?.contractor_org || form.contractorOrg || "—"}</Text>
            </Text>
            <Text style={s.sheetMetaLine}>
              Телефон: <Text style={s.sheetMetaValue}>{templateContract?.contractor_phone || form.contractorPhone || "—"}</Text>
            </Text>
            <Text style={s.sheetMetaLine}>
              Объём: <Text style={s.sheetMetaValue}>{`${fmtAmount(templateContract?.qty_planned ?? toNum(form.qtyPlanned))} ${templateContract?.uom || form.uom || ""}`.trim() || "—"}</Text>
            </Text>
          </View>

          <View style={{ flex: 1, minHeight: 0 }}>
            {draftItems.length > 0 ? (
              <FlatList
                data={draftItems}
                keyExtractor={(it) => it.id}
                renderItem={({ item }) => (
                  <View style={s.draftRowCard}>
                    <View style={s.draftRowMain}>
                      <Text style={s.draftRowTitle}>{item.name_human}</Text>
                      <Text style={s.draftRowMeta}>{`${item.qty} ${item.uom || ""}`.trim()}</Text>
                      <Text style={s.draftRowStatus}>Статус: <Text style={s.draftRowStatusStrong}>Черновик</Text></Text>
                    </View>
                    <Pressable style={s.rejectBtn} onPress={() => removeDraftItem(item.id)}>
                      <Text style={s.rejectIcon}>×</Text>
                    </Pressable>
                  </View>
                )}
              />
            ) : (
              <Text style={s.historyModalEmpty}>Позиции не найдены</Text>
            )}
          </View>

          <View style={s.reqActionsBottom}>
            <View style={s.actionBtnSquare}>
              <DeleteAllButton
                disabled={saving || sending}
                loading={false}
                accessibilityLabel="Удалить черновик"
                onPress={() => void clearDraft()}
              />
            </View>

            <View style={s.sp8} />

            <Pressable
              disabled={saving || sending || !requestId}
              onPress={() => void onPdf()}
              style={({ pressed }) => [
                s.actionBtnWide,
                { backgroundColor: pressed ? "#31343A" : "#2A2D32", opacity: saving || sending || !requestId ? 0.6 : 1 },
              ]}
            >
              <Text style={s.actionText}>PDF</Text>
            </Pressable>

            <View style={s.sp8} />

            <Pressable
              disabled={saving || sending}
              onPress={() => Alert.alert("Excel", "Экспорт Excel для подрядов будет добавлен.")}
              style={({ pressed }) => [
                s.actionBtnWide,
                { backgroundColor: pressed ? "#31343A" : "#2A2D32", opacity: saving || sending ? 0.6 : 1 },
              ]}
            >
              <Text style={s.actionText}>Excel</Text>
            </Pressable>

            <View style={s.sp8} />

            <View style={s.actionBtnSquare}>
              <SendPrimaryButton
                variant="green"
                disabled={saving || sending || !requestId}
                loading={sending}
                onPress={() => void sendToDirector()}
              />
            </View>
          </View>
        </View>
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

      <RNModal
        isVisible={historyOpen}
        onBackdropPress={() => setHistoryOpen(false)}
        onBackButtonPress={() => setHistoryOpen(false)}
        backdropOpacity={0.55}
        useNativeDriver={Platform.OS !== "web"}
        useNativeDriverForBackdrop={Platform.OS !== "web"}
        hideModalContentWhileAnimating
        style={{ margin: 0, justifyContent: "flex-end" }}
      >
        <View style={s.historyModal}>
          <View style={s.historyModalHeader}>
            <Text style={s.historyModalTitle}>История подрядов</Text>
            <Pressable onPress={() => setHistoryOpen(false)}><Text style={s.historyModalClose}>Закрыть</Text></Pressable>
          </View>

          {historyLoading ? (
            <View style={{ paddingVertical: 24 }}><ActivityIndicator color={UI.text} /></View>
          ) : history.length === 0 ? (
            <Text style={s.historyModalEmpty}>Подрядов пока нет.</Text>
          ) : (
            <FlatList
              data={history}
              keyExtractor={(it) => it.id}
              contentContainerStyle={{ paddingBottom: 8 }}
              renderItem={({ item }) => {
                const st = STATUS_CONFIG[item.status] || STATUS_CONFIG.draft;
                return (
                  <Pressable style={s.historyModalRow} onPress={() => openFromHistory(item)}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.historyModalPrimary}>
                        Подряд
                      </Text>
                      <Text style={s.historyModalMeta} numberOfLines={1}>{item.object_name || "—"} · {item.work_type || "—"}</Text>
                      <Text style={s.historyModalMetaSecondary} numberOfLines={1}>{fmtAmount(item.qty_planned)} {item.uom || ""}</Text>
                    </View>
                    <View style={[s.historyStatusBadge, { backgroundColor: st.bg }]}>
                      <Text style={{ color: st.fg, fontWeight: "900", fontSize: 12 }}>{st.label}</Text>
                    </View>
                  </Pressable>
                );
              }}
            />
          )}
        </View>
      </RNModal>

    </View>
  );
}




