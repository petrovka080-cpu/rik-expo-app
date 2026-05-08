import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
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
  BUYER_SUBCONTRACT_EMPTY_FORM as EMPTY_FORM,
  BUYER_SUBCONTRACT_UOM_OPTIONS as UOM_OPTIONS,
  buyerSubcontractToNum as toNum,
  getBuyerSubcontractErrorText as errText,
  normalizeBuyerSubcontractInn as normalizeInn,
  normalizeBuyerSubcontractPhone996 as normalizePhone996,
  type BuyerSubcontractContractorRow as ContractorRow,
  type BuyerSubcontractFormState as FormState,
} from "./buyerSubcontractForm.model";
import { resolveCurrentBuyerSubcontractUserId } from "./BuyerSubcontractTab.auth.transport";
import { styles } from "./BuyerSubcontractTab.styles";
import {
  SUBCONTRACT_DEFAULT_PAGE_SIZE,
  PRICE_TYPE_OPTIONS,
  STATUS_CONFIG,
  WORK_MODE_OPTIONS,
  createSubcontractDraftWithPatch,
  fmtAmount,
  fmtDate,
  listForemanSubcontractsPage,
  mergeSubcontractPages,
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

export default function BuyerSubcontractTab({ contentTopPad, onScroll, buyerFio }: Props) {
  const [items, setItems] = useState<Subcontract[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [subId, setSubId] = useState("");
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [dateTarget, setDateTarget] = useState<"dateStart" | "dateEnd" | "contractDate" | null>(null);
  const nextOffsetRef = useRef(0);
  const loadSeqRef = useRef(0);
  const loadingRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(false);

  const { objOptions, lvlOptions, sysOptions } = useForemanDicts();

  const load = useCallback(async (options?: { reset?: boolean }) => {
    const reset = options?.reset !== false;
    const offset = reset ? 0 : nextOffsetRef.current;
    const seq = ++loadSeqRef.current;
    if (!reset && (loadingRef.current || loadingMoreRef.current || !hasMoreRef.current)) return;
    if (reset) {
      loadingRef.current = true;
      setLoading(true);
    } else {
      loadingMoreRef.current = true;
      setLoadingMore(true);
    }
    try {
      const uid = await resolveCurrentBuyerSubcontractUserId();
      if (!uid) return;
      const page = await listForemanSubcontractsPage(uid, {
        offset,
        pageSize: SUBCONTRACT_DEFAULT_PAGE_SIZE,
      });
      if (seq !== loadSeqRef.current) return;
      nextOffsetRef.current = page.nextOffset ?? offset;
      hasMoreRef.current = page.hasMore;
      setHasMore(page.hasMore);
      setItems((current) => (reset ? page.items : mergeSubcontractPages(current, page.items)));
    } catch (e) {
      warnBuyerSubcontract("load error", e);
    } finally {
      if (seq === loadSeqRef.current) {
        if (reset) {
          loadingRef.current = false;
          setLoading(false);
        } else {
          loadingMoreRef.current = false;
          setLoadingMore(false);
        }
      }
    }
  }, []);

  useEffect(() => {
    void load({ reset: true });
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
      await load({ reset: true });
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const onEndReached = useCallback(() => {
    void load({ reset: false });
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
      const uid = await resolveCurrentBuyerSubcontractUserId();
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
      await load({ reset: true });
    } catch (e) {
      Alert.alert("Ошибка сохранения", errText(e, "Не удалось сохранить черновик"));
    } finally {
      setSaving(false);
    }
  }, [subId, form.foremanName, buyerFio, patch, load, resolveContractorIdByPhone, attachContractorIdIfPossible]);

  const handleSubmit = useCallback(async () => {
    setSending(true);
    try {
      const uid = await resolveCurrentBuyerSubcontractUserId();
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
      await load({ reset: true });
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
          onEndReachedThreshold={0.45}
          onEndReached={hasMore ? onEndReached : undefined}
          ListHeaderComponent={
            <Pressable style={styles.createBtn} onPress={() => setShowForm(true)}>
              <Ionicons name="add-circle" size={24} color="#fff" />
              <Text style={styles.createBtnText}>Создать новый подряд</Text>
            </Pressable>
          }
          ListFooterComponent={
            loadingMore ? <ActivityIndicator style={{ marginVertical: 16 }} color={B_UI.text} /> : null
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
