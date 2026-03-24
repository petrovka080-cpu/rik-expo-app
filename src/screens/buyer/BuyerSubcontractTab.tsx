import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@/src/ui/FlashList";

import { supabase } from "../../lib/supabaseClient";
import SingleDatePickerSheet from "../../components/SingleDatePickerSheet";
import SendPrimaryButton from "../../ui/SendPrimaryButton";
import ForemanDropdown from "../foreman/ForemanDropdown";
import { s as foremanStyles } from "../foreman/foreman.styles";
import { useForemanDicts } from "../foreman/useForemanDicts";
import { UI as B_UI } from "./buyerUi";
import {
  PRICE_TYPE_OPTIONS,
  STATUS_CONFIG,
  WORK_MODE_OPTIONS,
  createSubcontractDraftWithPatch,
  fmtAmount,
  fmtDate,
  listForemanSubcontracts,
  submitSubcontract,
  updateSubcontract,
  type Subcontract,
  type SubcontractPriceType,
  type SubcontractWorkMode,
} from "../subcontracts/subcontracts.shared";

const warnBuyerSubcontract = (
  scope: "load error" | "contractor_id attach skipped" | "contractor_id attach exception",
  error: unknown,
) => {
  if (__DEV__) {
    console.warn(`[BuyerSubcontractTab] ${scope}:`, error);
  }
};

type Props = {
  contentTopPad: number;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  buyerFio: string;
};

type FormState = {
  contractorOrg: string;
  contractorInn: string;
  contractorRep: string;
  contractorPhone: string;
  foremanName: string;
  contractNumber: string;
  contractDate: string;
  objectName: string;
  workZone: string;
  workType: string;
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
type ContractorRow = { id?: string | null; phone?: string | null };

const EMPTY_FORM: FormState = {
  contractorOrg: "",
  contractorInn: "",
  contractorRep: "",
  contractorPhone: "",
  foremanName: "",
  contractNumber: "",
  contractDate: "",
  objectName: "",
  workZone: "",
  workType: "",
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

const toNum = (v: string): number | null => {
  const n = Number(String(v || "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

const normalizePhone996 = (value: string): string => {
  const digits = String(value || "").replace(/\D+/g, "");
  if (!digits) return "";
  if (digits.startsWith("996") && digits.length >= 12) return digits.slice(0, 12);
  if (digits.startsWith("0") && digits.length >= 10) return `996${digits.slice(-9)}`;
  if (digits.length === 9) return `996${digits}`;
  if (digits.length > 9) return `996${digits.slice(-9)}`;
  return digits;
};

const normalizeInn = (value: string): string => String(value || "").replace(/\D+/g, "");

const errText = (e: unknown, fallback: string) => {
  if (e instanceof Error && e.message.trim()) return e.message.trim();
  return fallback;
};

export default function BuyerSubcontractTab({ contentTopPad, onScroll, buyerFio }: Props) {
  const [items, setItems] = useState<Subcontract[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [subId, setSubId] = useState("");
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [dateTarget, setDateTarget] = useState<"dateStart" | "dateEnd" | "contractDate" | null>(null);

  const { objOptions, lvlOptions, sysOptions } = useForemanDicts();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id;
      if (!uid) return;
      const list = await listForemanSubcontracts(uid);
      setItems(list);
    } catch (e) {
      warnBuyerSubcontract("load error", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const qty = toNum(form.qtyPlanned);
    const ppu = toNum(form.pricePerUnit);
    if (qty != null && ppu != null && qty > 0 && ppu > 0) {
      setForm((prev) => ({ ...prev, totalPrice: String(qty * ppu) }));
      return;
    }
    setForm((prev) => ({ ...prev, totalPrice: "" }));
  }, [form.qtyPlanned, form.pricePerUnit]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const patch = useMemo(() => {
    const phoneNormalized = normalizePhone996(form.contractorPhone);
    const innNormalized = normalizeInn(form.contractorInn);
    return {
      foreman_name: form.foremanName.trim() || buyerFio || "Снабженец",
      contractor_org: form.contractorOrg.trim() || null,
      contractor_inn: innNormalized || null,
      contractor_rep: form.contractorRep.trim() || null,
      contractor_phone: phoneNormalized || null,
      contract_number: form.contractNumber.trim() || null,
      contract_date: form.contractDate || null,
      object_name: form.objectName || null,
      work_zone: form.workZone || null,
      work_type: form.workType || null,
      qty_planned: toNum(form.qtyPlanned),
      uom: form.uom || null,
      date_start: form.dateStart || null,
      date_end: form.dateEnd || null,
      work_mode: (form.workMode || null) as SubcontractWorkMode | null,
      price_per_unit: toNum(form.pricePerUnit),
      total_price: toNum(form.totalPrice),
      price_type: (form.priceType || null) as SubcontractPriceType | null,
      foreman_comment: form.foremanComment.trim() || null,
    };
  }, [buyerFio, form]);

  const resolveContractorIdByPhone = useCallback(async (phoneNormalized: string): Promise<string | null> => {
    const pn = normalizePhone996(phoneNormalized);
    if (!pn) return null;

    const direct = await supabase
      .from("contractors")
      .select("id, phone")
      .eq("phone", pn)
      .limit(1);
    if (!direct.error && Array.isArray(direct.data) && direct.data.length > 0) {
      const first = (direct.data[0] ?? null) as ContractorRow | null;
      return String(first?.id ?? "").trim() || null;
    }

    const tail = pn.slice(-9);
    if (!tail) return null;
    const fallback = await supabase
      .from("contractors")
      .select("id, phone")
      .ilike("phone", `%${tail}`)
      .limit(20);
    if (fallback.error || !Array.isArray(fallback.data)) return null;
    const rows = fallback.data as ContractorRow[];
    const matched = rows.find((row) => normalizePhone996(String(row?.phone || "")) === pn);
    return matched ? String(matched.id ?? "").trim() || null : null;
  }, []);

  const attachContractorIdIfPossible = useCallback(async (subcontractId: string, contractorId: string | null) => {
    const sid = String(subcontractId || "").trim();
    const cid = String(contractorId || "").trim();
    if (!sid || !cid) return;
    try {
      const upd = await supabase
        .from("subcontracts")
        .update({ contractor_id: cid } as never)
        .eq("id", sid);
      if (upd.error && __DEV__) {
        warnBuyerSubcontract("contractor_id attach skipped", upd.error.message);
      }
    } catch (e) {
      warnBuyerSubcontract("contractor_id attach exception", e);
    }
  }, []);

  const closeForm = useCallback(() => {
    setShowForm(false);
    setSubId("");
    setForm(EMPTY_FORM);
    setDateTarget(null);
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id;
      if (!uid) throw new Error("Пользователь не авторизован");
      const contractorId = await resolveContractorIdByPhone(String(patch.contractor_phone || ""));

      if (!subId) {
        const row = await createSubcontractDraftWithPatch(
          uid,
          form.foremanName.trim() || buyerFio || "Снабженец",
          patch,
        );
        await attachContractorIdIfPossible(row.id, contractorId);
        setSubId(row.id);
      } else {
        await updateSubcontract(subId, patch);
        await attachContractorIdIfPossible(subId, contractorId);
      }

      Alert.alert("Черновик сохранён");
      await load();
    } catch (e) {
      Alert.alert("Ошибка сохранения", errText(e, "Не удалось сохранить черновик"));
    } finally {
      setSaving(false);
    }
  }, [subId, form.foremanName, buyerFio, patch, load, resolveContractorIdByPhone, attachContractorIdIfPossible]);

  const handleSubmit = useCallback(async () => {
    setSending(true);
    try {
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id;
      if (!uid) throw new Error("Пользователь не авторизован");
      const contractorId = await resolveContractorIdByPhone(String(patch.contractor_phone || ""));

      let activeId = subId;
      if (!activeId) {
        const row = await createSubcontractDraftWithPatch(
          uid,
          form.foremanName.trim() || buyerFio || "Снабженец",
          patch,
        );
        activeId = row.id;
        await attachContractorIdIfPossible(activeId, contractorId);
      } else {
        await updateSubcontract(activeId, patch);
        await attachContractorIdIfPossible(activeId, contractorId);
      }

      await submitSubcontract(activeId);
      Alert.alert("Отправлено директору");
      closeForm();
      await load();
    } catch (e) {
      Alert.alert("Ошибка отправки", errText(e, "Не удалось отправить директору"));
    } finally {
      setSending(false);
    }
  }, [subId, form.foremanName, buyerFio, patch, closeForm, load, resolveContractorIdByPhone, attachContractorIdIfPossible]);

  const renderCard = useCallback(({ item }: { item: Subcontract }) => {
    const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.draft;
    const title = item.work_type || "Подряд";
    return (
      <Pressable
        style={styles.card}
        onPress={() => {
          if (item.status === "draft" || item.status === "rejected") {
            setSubId(item.id);
            setForm({
              contractorOrg: item.contractor_org || "",
              contractorInn: item.contractor_inn || "",
              contractorRep: item.contractor_rep || "",
              contractorPhone: item.contractor_phone || "",
              foremanName: item.foreman_name || "",
              contractNumber: item.contract_number || "",
              contractDate: item.contract_date || "",
              objectName: item.object_name || "",
              workZone: item.work_zone || "",
              workType: item.work_type || "",
              qtyPlanned: item.qty_planned != null ? String(item.qty_planned) : "",
              uom: item.uom || "",
              dateStart: item.date_start || "",
              dateEnd: item.date_end || "",
              workMode: item.work_mode || "",
              pricePerUnit: item.price_per_unit != null ? String(item.price_per_unit) : "",
              totalPrice: item.total_price != null ? String(item.total_price) : "",
              priceType: item.price_type || "",
              foremanComment: item.foreman_comment || "",
            });
            setShowForm(true);
            return;
          }

          Alert.alert("Информация", `Статус: ${cfg.label}\nПодрядчик: ${item.contractor_org || "—"}`);
        }}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{title}</Text>
          <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.badgeText, { color: cfg.fg }]}>{cfg.label}</Text>
          </View>
        </View>
        <Text style={styles.cardSubtitle}>
          {item.object_name || "-"} / {item.contractor_org || "-"}
        </Text>
        <View style={styles.cardFooter}>
          <Text style={styles.cardPrice}>{fmtAmount(item.total_price)} сом</Text>
          <Text style={styles.cardDate}>{fmtDate(item.created_at)}</Text>
        </View>
      </Pressable>
    );
  }, []);

  const dropdownUi = useMemo(() => ({ text: B_UI.text }), []);

  return (
    <View style={{ flex: 1 }}>
      {showForm ? (
        <ScrollView
          contentContainerStyle={{ paddingTop: contentTopPad + 10, paddingHorizontal: 16, paddingBottom: 100 }}
          onScroll={onScroll}
          scrollEventThrottle={16}
        >
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>{subId ? `Подряд ${subId.slice(0, 8)}` : "Новый подряд"}</Text>
            <Pressable onPress={closeForm}>
              <Ionicons name="close" size={24} color={B_UI.text} />
            </Pressable>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Объект</Text>
            <ForemanDropdown
              label="Объект"
              options={objOptions}
              value={form.objectName}
              onChange={(v) => setForm((p) => ({ ...p, objectName: v }))}
              placeholder="Выбери объект"
              ui={dropdownUi}
              styles={foremanStyles}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Зона/этаж</Text>
            <ForemanDropdown
              label="Зона/этаж"
              options={lvlOptions}
              value={form.workZone}
              onChange={(v) => setForm((p) => ({ ...p, workZone: v }))}
              placeholder="Выбери зону"
              ui={dropdownUi}
              styles={foremanStyles}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Вид работы</Text>
            <ForemanDropdown
              label="Вид работы"
              options={sysOptions}
              value={form.workType}
              onChange={(v) => setForm((p) => ({ ...p, workType: v }))}
              placeholder="Выбери вид работ"
              ui={dropdownUi}
              styles={foremanStyles}
            />
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Подрядчик</Text>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Организация"
            placeholderTextColor={B_UI.sub}
            value={form.contractorOrg}
            onChangeText={(v) => setForm((p) => ({ ...p, contractorOrg: v }))}
          />
          <TextInput
            style={styles.input}
            placeholder="ИНН"
            placeholderTextColor={B_UI.sub}
            value={form.contractorInn}
            onChangeText={(v) => setForm((p) => ({ ...p, contractorInn: v }))}
            keyboardType="numeric"
          />
          <TextInput
            style={styles.input}
            placeholder="Представитель"
            placeholderTextColor={B_UI.sub}
            value={form.contractorRep}
            onChangeText={(v) => setForm((p) => ({ ...p, contractorRep: v }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Телефон"
            placeholderTextColor={B_UI.sub}
            value={form.contractorPhone}
            onChangeText={(v) => setForm((p) => ({ ...p, contractorPhone: v }))}
            keyboardType="phone-pad"
          />

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Договор</Text>
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <TextInput
              style={[styles.input, { flex: 1.5 }]}
              placeholder="Номер договора"
              placeholderTextColor={B_UI.sub}
              value={form.contractNumber}
              onChangeText={(v) => setForm((p) => ({ ...p, contractNumber: v }))}
            />
            <View style={{ flex: 1 }}>
              <Pressable style={styles.datePicker} onPress={() => setDateTarget("contractDate")}>
                <Text style={{ color: form.contractDate ? B_UI.text : B_UI.sub, fontSize: 13 }}>
                  {form.contractDate ? fmtDate(form.contractDate) : "Дата"}
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Детали работы</Text>
          </View>

          <View style={styles.dateRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Начало работы</Text>
              <Pressable style={styles.datePicker} onPress={() => setDateTarget("dateStart")}>
                <Text style={{ color: form.dateStart ? B_UI.text : B_UI.sub }}>
                  {form.dateStart ? fmtDate(form.dateStart) : "Выбрать дату"}
                </Text>
              </Pressable>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Конец работы</Text>
              <Pressable style={styles.datePicker} onPress={() => setDateTarget("dateEnd")}>
                <Text style={{ color: form.dateEnd ? B_UI.text : B_UI.sub }}>
                  {form.dateEnd ? fmtDate(form.dateEnd) : "Выбрать дату"}
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Объём"
              placeholderTextColor={B_UI.sub}
              value={form.qtyPlanned}
              onChangeText={(v) => setForm((p) => ({ ...p, qtyPlanned: v }))}
              keyboardType="decimal-pad"
            />
            <View style={{ flex: 1 }}>
              <ForemanDropdown
                label="Ед. изм."
                options={UOM_OPTIONS}
                value={form.uom}
                onChange={(v) => setForm((p) => ({ ...p, uom: v }))}
                placeholder="Ед. изм."
                searchable={false}
                ui={dropdownUi}
                styles={foremanStyles}
              />
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Цена/ед"
              placeholderTextColor={B_UI.sub}
              value={form.pricePerUnit}
              onChangeText={(v) => setForm((p) => ({ ...p, pricePerUnit: v }))}
              keyboardType="decimal-pad"
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Итого"
              placeholderTextColor={B_UI.sub}
              value={form.totalPrice}
              onChangeText={(v) => setForm((p) => ({ ...p, totalPrice: v }))}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Режим выполнения</Text>
            <View style={styles.chipsRow}>
              {WORK_MODE_OPTIONS.map((opt) => {
                const active = form.workMode === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setForm((p) => ({ ...p, workMode: opt.value }))}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Тип расчёта</Text>
            <View style={styles.chipsRow}>
              {PRICE_TYPE_OPTIONS.map((opt) => {
                const active = form.priceType === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setForm((p) => ({ ...p, priceType: opt.value }))}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <TextInput
            style={[styles.input, { minHeight: 90, textAlignVertical: "top" }]}
            placeholder="Комментарий"
            placeholderTextColor={B_UI.sub}
            value={form.foremanComment}
            onChangeText={(v) => setForm((p) => ({ ...p, foremanComment: v }))}
            multiline
          />

          <View style={styles.btnRow}>
            <Pressable
              style={[styles.actionBtn, { backgroundColor: B_UI.btnNeutral }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? <ActivityIndicator size="small" color={B_UI.text} /> : <Text style={styles.btnText}>Сохранить</Text>}
            </Pressable>
            <View style={{ flex: 1 }}>
              <SendPrimaryButton
                label="Отправить директору"
                onPress={handleSubmit}
                loading={sending}
                disabled={sending}
                variant="green"
                mode="wide"
              />
            </View>
          </View>
        </ScrollView>
      ) : (
        <FlashList
          data={items}
          renderItem={renderCard}
          keyExtractor={(item) => item.id}
          estimatedItemSize={118}
          contentContainerStyle={{ paddingTop: contentTopPad + 10, paddingHorizontal: 16, paddingBottom: 100 }}
          onScroll={onScroll}
          scrollEventThrottle={16}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={
            <Pressable style={styles.createBtn} onPress={() => setShowForm(true)}>
              <Ionicons name="add-circle" size={24} color="#fff" />
              <Text style={styles.createBtnText}>Создать новый подряд</Text>
            </Pressable>
          }
          ListEmptyComponent={
            loading ? <ActivityIndicator style={{ marginTop: 20 }} color={B_UI.text} /> : <Text style={styles.emptyText}>Подрядов пока нет</Text>
          }
        />
      )}

      <SingleDatePickerSheet
        visible={!!dateTarget}
        onClose={() => setDateTarget(null)}
        label={
          dateTarget === "contractDate"
            ? "Дата договора"
            : dateTarget === "dateStart"
              ? "Начало работы"
              : "Окончание работы"
        }
        value={dateTarget === "contractDate" ? form.contractDate : dateTarget === "dateStart" ? form.dateStart : form.dateEnd}
        onApply={(date) => {
          if (!dateTarget) return;
          setForm((p) => ({ ...p, [dateTarget]: date }));
        }}
        ui={{
          cardBg: B_UI.cardBg,
          text: B_UI.text,
          sub: B_UI.sub,
          border: B_UI.border,
          approve: "#16A34A",
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  createBtn: {
    backgroundColor: "#16A34A",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 16,
  },
  createBtnText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 16,
  },
  card: {
    backgroundColor: B_UI.cardBg,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: B_UI.border,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTitle: {
    color: B_UI.text,
    fontSize: 16,
    fontWeight: "800",
    flex: 1,
  },
  cardSubtitle: {
    color: B_UI.sub,
    fontSize: 14,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardPrice: {
    color: "#22C55E",
    fontSize: 16,
    fontWeight: "900",
  },
  cardDate: {
    color: B_UI.sub,
    fontSize: 12,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  formHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  formTitle: {
    color: B_UI.text,
    fontSize: 20,
    fontWeight: "900",
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    color: B_UI.sub,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  sectionHeader: {
    marginTop: 20,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: B_UI.border,
    paddingBottom: 6,
  },
  sectionTitle: {
    color: B_UI.sub,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    padding: 14,
    color: B_UI.text,
    fontSize: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  dateRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  datePicker: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    height: 52,
    justifyContent: "center",
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: "rgba(34,197,94,0.2)",
    borderColor: "rgba(34,197,94,0.6)",
  },
  chipText: {
    color: B_UI.text,
    fontSize: 13,
    fontWeight: "700",
  },
  chipTextActive: {
    color: "#86EFAC",
  },
  btnRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  actionBtn: {
    height: 52,
    paddingHorizontal: 20,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: B_UI.btnBorder,
  },
  btnText: {
    color: B_UI.text,
    fontWeight: "900",
  },
  emptyText: {
    color: B_UI.sub,
    textAlign: "center",
    marginTop: 40,
    fontSize: 16,
  },
});


