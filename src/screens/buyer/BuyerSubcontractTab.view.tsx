import React from "react";
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

import { APP_LAYOUT } from "../../components/layout/appLayout";
import SingleDatePickerSheet from "../../components/SingleDatePickerSheet";
import SendPrimaryButton from "../../ui/SendPrimaryButton";
import ForemanDropdown from "../foreman/ForemanDropdown";
import { s as foremanStyles } from "../foreman/foreman.styles";
import type { RefOption } from "../foreman/foreman.types";
import { UI as B_UI } from "./buyerUi";
import {
  BUYER_SUBCONTRACT_UOM_OPTIONS as UOM_OPTIONS,
  type BuyerSubcontractFormState as FormState,
} from "./buyerSubcontractForm.model";
import type { BuyerSubcontractDateTarget } from "./BuyerSubcontractTab.model";
import { styles } from "./BuyerSubcontractTab.styles";
import {
  PRICE_TYPE_OPTIONS,
  STATUS_CONFIG,
  WORK_MODE_OPTIONS,
  fmtAmount,
  fmtDate,
  type Subcontract,
} from "../subcontracts/subcontracts.shared";

type BuyerSubcontractTabViewProps = {
  contentTopPad: number;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  showForm: boolean;
  items: Subcontract[];
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  form: FormState;
  subId: string;
  saving: boolean;
  sending: boolean;
  dateTarget: BuyerSubcontractDateTarget | null;
  objOptions: RefOption[];
  lvlOptions: RefOption[];
  sysOptions: RefOption[];
  onChangeForm: React.Dispatch<React.SetStateAction<FormState>>;
  onCloseForm: () => void;
  onOpenForm: () => void;
  onOpenEditableItem: (item: Subcontract) => void;
  onSetDateTarget: (target: BuyerSubcontractDateTarget | null) => void;
  onSave: () => void;
  onSubmit: () => void;
  onRefresh: () => void;
  onEndReached: () => void;
};

const dropdownUi = { text: B_UI.text };
const BUYER_SUBCONTRACT_LIST_FLATLIST_TUNING = {
  initialNumToRender: 8,
  maxToRenderPerBatch: 8,
  updateCellsBatchingPeriod: 32,
  windowSize: 7,
  removeClippedSubviews: false,
} as const;

const buyerSubcontractKeyExtractor = (item: Subcontract) => item.id;

function BuyerSubcontractCard({
  item,
  onOpenEditableItem,
}: {
  item: Subcontract;
  onOpenEditableItem: (item: Subcontract) => void;
}) {
  const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.draft;
  const title = item.work_type || "Подряд";

  const onPress = () => {
    if (item.status === "draft" || item.status === "rejected") {
      onOpenEditableItem(item);
      return;
    }

    Alert.alert("Информация", `Статус: ${cfg.label}\nПодрядчик: ${item.contractor_org || "-"}`);
  };

  return (
    <Pressable style={styles.card} onPress={onPress}>
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
        <Text style={styles.cardPrice}>{fmtAmount(item.total_price)}{"\u00a0\u0441\u043e\u043c"}</Text>
        <Text style={styles.cardDate}>{fmtDate(item.created_at)}</Text>
      </View>
    </Pressable>
  );
}

export function BuyerSubcontractTabView({
  contentTopPad,
  onScroll,
  showForm,
  items,
  loading,
  refreshing,
  loadingMore,
  hasMore,
  form,
  subId,
  saving,
  sending,
  dateTarget,
  objOptions,
  lvlOptions,
  sysOptions,
  onChangeForm,
  onCloseForm,
  onOpenForm,
  onOpenEditableItem,
  onSetDateTarget,
  onSave,
  onSubmit,
  onRefresh,
  onEndReached,
}: BuyerSubcontractTabViewProps) {
  return (
    <View style={{ flex: 1 }}>
      {showForm ? (
        <ScrollView
          contentContainerStyle={{ paddingTop: contentTopPad + 10, paddingHorizontal: 16, paddingBottom: APP_LAYOUT.scrollBottomPaddingPx }}
          onScroll={onScroll}
          scrollEventThrottle={16}
        >
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>{subId ? `Подряд ${subId.slice(0, 8)}` : "Новый подряд"}</Text>
            <Pressable onPress={onCloseForm}>
              <Ionicons name="close" size={24} color={B_UI.text} />
            </Pressable>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Объект</Text>
            <ForemanDropdown
              label="Объект"
              options={objOptions}
              value={form.objectName}
              onChange={(v) => onChangeForm((p) => ({ ...p, objectName: v }))}
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
              onChange={(v) => onChangeForm((p) => ({ ...p, workZone: v }))}
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
              onChange={(v) => onChangeForm((p) => ({ ...p, workType: v }))}
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
            onChangeText={(v) => onChangeForm((p) => ({ ...p, contractorOrg: v }))}
          />
          <TextInput
            style={styles.input}
            placeholder="ИНН"
            placeholderTextColor={B_UI.sub}
            value={form.contractorInn}
            onChangeText={(v) => onChangeForm((p) => ({ ...p, contractorInn: v }))}
            keyboardType="numeric"
          />
          <TextInput
            style={styles.input}
            placeholder="Представитель"
            placeholderTextColor={B_UI.sub}
            value={form.contractorRep}
            onChangeText={(v) => onChangeForm((p) => ({ ...p, contractorRep: v }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Телефон"
            placeholderTextColor={B_UI.sub}
            value={form.contractorPhone}
            onChangeText={(v) => onChangeForm((p) => ({ ...p, contractorPhone: v }))}
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
              onChangeText={(v) => onChangeForm((p) => ({ ...p, contractNumber: v }))}
            />
            <View style={{ flex: 1 }}>
              <Pressable style={styles.datePicker} onPress={() => onSetDateTarget("contractDate")}>
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
              <Pressable style={styles.datePicker} onPress={() => onSetDateTarget("dateStart")}>
                <Text style={{ color: form.dateStart ? B_UI.text : B_UI.sub }}>
                  {form.dateStart ? fmtDate(form.dateStart) : "Выбрать дату"}
                </Text>
              </Pressable>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Конец работы</Text>
              <Pressable style={styles.datePicker} onPress={() => onSetDateTarget("dateEnd")}>
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
              onChangeText={(v) => onChangeForm((p) => ({ ...p, qtyPlanned: v }))}
              keyboardType="decimal-pad"
            />
            <View style={{ flex: 1 }}>
              <ForemanDropdown
                label="Ед. изм."
                options={UOM_OPTIONS}
                value={form.uom}
                onChange={(v) => onChangeForm((p) => ({ ...p, uom: v }))}
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
              onChangeText={(v) => onChangeForm((p) => ({ ...p, pricePerUnit: v }))}
              keyboardType="decimal-pad"
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Итого"
              placeholderTextColor={B_UI.sub}
              value={form.totalPrice}
              onChangeText={(v) => onChangeForm((p) => ({ ...p, totalPrice: v }))}
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
                    onPress={() => onChangeForm((p) => ({ ...p, workMode: opt.value }))}
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
                    onPress={() => onChangeForm((p) => ({ ...p, priceType: opt.value }))}
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
            onChangeText={(v) => onChangeForm((p) => ({ ...p, foremanComment: v }))}
            multiline
          />

          <View style={styles.btnRow}>
            <Pressable
              style={[styles.actionBtn, { backgroundColor: B_UI.btnNeutral }]}
              onPress={onSave}
              disabled={saving}
            >
              {saving ? <ActivityIndicator size="small" color={B_UI.text} /> : <Text style={styles.btnText}>Сохранить</Text>}
            </Pressable>
            <View style={{ flex: 1 }}>
              <SendPrimaryButton
                label="Отправить директору"
                onPress={onSubmit}
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
          renderItem={({ item }) => (
            <BuyerSubcontractCard item={item} onOpenEditableItem={onOpenEditableItem} />
          )}
          keyExtractor={buyerSubcontractKeyExtractor}
          estimatedItemSize={118}
          {...BUYER_SUBCONTRACT_LIST_FLATLIST_TUNING}
          contentContainerStyle={{ paddingTop: contentTopPad + 10, paddingHorizontal: 16, paddingBottom: APP_LAYOUT.scrollBottomPaddingPx }}
          onScroll={onScroll}
          scrollEventThrottle={16}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          onEndReachedThreshold={0.45}
          onEndReached={hasMore ? onEndReached : undefined}
          ListHeaderComponent={
            <Pressable style={styles.createBtn} onPress={onOpenForm}>
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
        onClose={() => onSetDateTarget(null)}
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
          onChangeForm((p) => ({ ...p, [dateTarget]: date }));
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
