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

export default function ForemanSubcontractTab({ contentTopPad, onScroll, dicts }: Props) {
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
  const [approvedPickerOpen, setApprovedPickerOpen] = useState(false);
  const [catalogVisible, setCatalogVisible] = useState(false);
  const [workTypePickerVisible, setWorkTypePickerVisible] = useState(false);
  const [calcVisible, setCalcVisible] = useState(false);
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
    const obj = String(templateObjectName || objectName || "").trim();
    const lvl = String(templateLevelName || levelName || "").trim();
    const sys = String(templateSystemName || systemName || "").trim();
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
    const workMode = String(templateContract.work_mode || "").trim();
    const qty = fmtAmount(templateContract.qty_planned);
    const uom = String(templateContract.uom || "").trim();
    const details = [
      templateContract.display_no ? `Подряд ${templateContract.display_no}` : "",
      contractor,
      workMode,
      qty !== "—" ? `${qty} ${uom}`.trim() : "",
    ].filter(Boolean);
    return {
      object_type_code: templateObjectCode || form.objectCode || null,
      level_code: templateLevelCode || form.levelCode || null,
      system_code: templateSystemCode || form.systemCode || null,
      zone_code: null,
      foreman_name: foremanName || "Прораб",
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
    foremanName,
  ]);

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
      Alert.alert("Ошибка", getErrorMessage(e, "Не удалось загрузить историю подрядов"));
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

  const ensureDraftOnly = useCallback(async (): Promise<string | null> => {
    const scopeChanged = activeDraftScopeKeyRef.current !== draftScopeKey;

    if (requestId && !scopeChanged) {
      if (draftItems.length === 0) await loadDraftItems(requestId);
      return requestId;
    }

    if (!userId) {
      Alert.alert("Ошибка", "Пользователь не авторизован");
      return null;
    }

    setSaving(true);
    try {
      // Clear Rik draft cache to ensure autonomy from Materials tab
      clearCachedDraftRequestId();
      const res = await requestCreateDraft();
      if (!res?.id) throw new Error("ID не получен");
      const rid = String(res.id);

      const meta: RequestMetaPatch = requestMetaFromTemplate;
      await updateRequestMeta(rid, meta);

      const objectNameForRequest = String(
        templateObjectName || objectName || templateContract?.object_name || "",
      ).trim();
      if (objectNameForRequest) {
        await supabase.from("requests").update({ object_name: objectNameForRequest }).eq("id", rid);
      }

      setRequestId(rid);
      setDisplayNo(res.display_no || "DRAFT");
      activeDraftScopeKeyRef.current = draftScopeKey;
      return rid;
    } catch (e) {
      Alert.alert("Ошибка", getErrorMessage(e, "Не удалось создать черновик"));
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
      Alert.alert("Ошибка", getErrorMessage(e, "Не удалось добавить позиции"));
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
            name_human: r.item_name_ru || r.name_human || "Позиция",
            uom: r.uom_code || null,
            note: scopeNote || null,
          },
        );
      }
      await loadDraftItems(rid);
    } catch (e) {
      Alert.alert("Ошибка", getErrorMessage(e, "Не удалось добавить позиции"));
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
      Alert.alert("Ошибка", getErrorMessage(e, "Не удалось удалить позицию"));
    } finally {
      setSaving(false);
    }
  }, [loadDraftItems, requestId]);

  const sendToDirector = useCallback(async () => {
    if (!requestId) {
      Alert.alert("Нет черновика", "Сначала добавите позиции");
      return;
    }
    setSending(true);
    try {
      await requestSubmit(requestId);
      Alert.alert("Отправлено", "Заявка на материалы отправлена");
      await loadHistory(userId);
      setRequestId("");
      setDisplayNo("");
      setDraftItems([]);
      setTemplateContract(null);
      activeDraftScopeKeyRef.current = "";
      setDraftOpen(false);
    } catch (e) {
      Alert.alert("Ошибка", getErrorMessage(e, "Не удалось отправить заявку"));
    } finally {
      setSending(false);
    }
  }, [requestId, loadHistory, userId]);

  const onPdf = useCallback(async () => {
    const rid = String(requestId || "").trim();
    if (!rid) {
      Alert.alert("PDF", "Сначала добавьте позиции в черновик");
      return;
    }
    const fileName = displayNo ? `Заявка_${displayNo}` : `Заявка_${rid}`;
    await runPdfTop({
      supabase,
      key: `pdf:subcontracts-request:${rid}`,
      label: "Готовлю PDF...",
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
        Alert.alert("Ошибка", getErrorMessage(e, "Не удалось очистить позиции черновика"));
        return;
      }
    }
    setRequestId("");
    setDisplayNo("");
    setForm(EMPTY_FORM);
    setDraftItems([]);
    setTemplateContract(null);
    activeDraftScopeKeyRef.current = "";
    setDraftOpen(false);
  }, [requestId]);

  const openFromHistory = useCallback((it: Subcontract) => {
    // History row is a subcontract template, not a material request draft.
    // Reset request draft and switch current template to selected subcontract.
    setTemplateContract(it);
    setRequestId("");
    setDisplayNo("");
    setDraftItems([]);
    activeDraftScopeKeyRef.current = "";
    setHistoryOpen(false);
  }, []);

  const acceptApprovedFromDirector = useCallback((it: Subcontract) => {
    setTemplateContract(it);
    setRequestId(""); // Force new draft on first item
    setDisplayNo("");
    setApprovedPickerOpen(false);
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: contentTopPad, paddingHorizontal: 16, paddingBottom: 120 }}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      >
        <Pressable
          onPress={async () => {
            await loadHistory(userId);
            setApprovedPickerOpen(true);
          }}
          style={{
            borderRadius: 14,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.14)",
            backgroundColor: "rgba(17,26,42,0.85)",
            paddingVertical: 12,
            paddingHorizontal: 14,
            marginBottom: 20,
          }}
        >
          <Text style={{ color: UI.sub, fontWeight: "800", fontSize: 12 }}>ПОДРЯДЫ ОТ ДИРЕКТОРА</Text>
          <Text style={{ color: UI.text, fontWeight: "900", fontSize: 16, marginTop: 4 }}>
            {templateContract
              ? `Принят: ${templateContract.display_no || "SUB"}`
              : "Выбрать утвержденный подряд"}
          </Text>
          <Text style={{ color: UI.sub, marginTop: 4 }}>
            {approvedContracts.length > 0
              ? `Доступно утверждённых: ${approvedContracts.length}`
              : "Нет утвержденных подрядов"}
          </Text>
        </Pressable>

        {templateContract ? (
          <>
            <View style={s.section}>
              <Text style={s.sectionTitle}>ДЕТАЛИ ПОДРЯДА</Text>
            </View>
            <View style={s.detailsCard}>
              <Text style={s.detailsRow}><Text style={s.detailsLabel}>ПОДРЯДЧИК:</Text> {templateContract.contractor_org || "—"}</Text>
              <Text style={s.detailsRow}><Text style={s.detailsLabel}>ТЕЛЕФОН:</Text> {templateContract.contractor_phone || "—"}</Text>
              <View style={{ height: 8 }} />
              <Text style={s.detailsRow}><Text style={s.detailsLabel}>ОБЪЕКТ:</Text> {templateObjectName || "—"}</Text>
              <Text style={s.detailsRow}><Text style={s.detailsLabel}>ЭТАЖ/УРОВЕНЬ:</Text> {templateLevelName || "—"}</Text>
              <Text style={s.detailsRow}><Text style={s.detailsLabel}>ВИД РАБОТ:</Text> {templateSystemName || "—"}</Text>
              <Text style={s.detailsRow}><Text style={s.detailsLabel}>ОБЪЕМ:</Text> {fmtAmount(templateContract.qty_planned)} {templateContract.uom || ""}</Text>
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
          </>
        ) : (
          <View style={{ marginTop: 40, alignItems: 'center' }}>
            <Ionicons name="alert-circle-outline" size={48} color={UI.sub} />
            <Text style={{ color: UI.sub, fontSize: 16, textAlign: 'center', marginTop: 12 }}>
              Выбери утвержденный подряд выше,{"\n"}чтобы сделать заявку на материалы
            </Text>
          </View>
        )}
      </ScrollView>

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
              Объект: <Text style={s.sheetMetaValue}>{templateObjectName || objectName || "—"}</Text>
            </Text>
            <Text style={s.sheetMetaLine}>
              Этаж/уровень: <Text style={s.sheetMetaValue}>{templateLevelName || levelName || "—"}</Text>
            </Text>
            <Text style={s.sheetMetaLine}>
              Система: <Text style={s.sheetMetaValue}>{templateSystemName || systemName || "—"}</Text>
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
                      <Text style={s.historyModalPrimary}>{item.display_no || "SUB"}</Text>
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

      <RNModal
        isVisible={approvedPickerOpen}
        onBackdropPress={() => setApprovedPickerOpen(false)}
        onBackButtonPress={() => setApprovedPickerOpen(false)}
        backdropOpacity={0.55}
        useNativeDriver={Platform.OS !== "web"}
        useNativeDriverForBackdrop={Platform.OS !== "web"}
        hideModalContentWhileAnimating
        style={{ margin: 0, justifyContent: "flex-end" }}
      >
        <View style={s.historyModal}>
          <View style={s.historyModalHeader}>
            <Text style={s.historyModalTitle}>Утвержденные подряды</Text>
            <Pressable onPress={() => setApprovedPickerOpen(false)}>
              <Text style={s.historyModalClose}>Закрыть</Text>
            </Pressable>
          </View>

          {historyLoading ? (
            <View style={{ paddingVertical: 24 }}>
              <ActivityIndicator color={UI.text} />
            </View>
          ) : approvedContracts.length === 0 ? (
            <Text style={s.historyModalEmpty}>Нет подрядов со статусом "В работе".</Text>
          ) : (
            <FlatList
              data={approvedContracts}
              keyExtractor={(it) => it.id}
              contentContainerStyle={{ paddingBottom: 8 }}
              renderItem={({ item }) => (
                <Pressable style={s.historyModalRow} onPress={() => acceptApprovedFromDirector(item)}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.historyModalPrimary}>{item.display_no || "SUB"}</Text>
                    <Text style={s.historyModalMeta} numberOfLines={1}>
                      {item.contractor_org || "—"} · {item.object_name || "—"}
                    </Text>
                    <Text style={s.historyModalMetaSecondary} numberOfLines={1}>
                      {item.work_type || "—"} · {fmtAmount(item.qty_planned)} {item.uom || ""}
                    </Text>
                  </View>
                  <View style={[s.historyStatusBadge, { backgroundColor: "#DCFCE7" }]}>
                    <Text style={{ color: "#166534", fontWeight: "900", fontSize: 12 }}>Принять</Text>
                  </View>
                </Pressable>
              )}
            />
          )}
        </View>
      </RNModal>
    </View>
  );
}
