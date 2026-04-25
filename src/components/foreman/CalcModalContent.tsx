import React from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { EdgeInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { FlashList } from "@/src/ui/FlashList";

import IconSquareButton from "../../ui/IconSquareButton";
import SendPrimaryButton from "../../ui/SendPrimaryButton";
import type { Field, BasisKey } from "./useCalcFields";
import type { CalcModalFieldErrors, CalcModalInputs, CalcModalRow } from "./calcModal.model";
import { qtyIssue, rowKeyOf } from "./calcModal.model";

const SHADOW_CARD =
  Platform.OS === "web"
    ? ({ boxShadow: "0px 10px 18px rgba(0,0,0,0.14)" } as const)
    : {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.14,
        shadowRadius: 18,
        elevation: 8,
      };

const SHADOW_STICKY =
  Platform.OS === "web"
    ? ({ boxShadow: "0px 6px 12px rgba(0,0,0,0.06)" } as const)
    : {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 2,
      };

const Hint = ({ text }: { text?: string | null }) => {
  if (!text) return null;

  return (
    <Text
      style={cs.hint}
      onPress={() => Alert.alert("Подсказка", String(text))}
    >
      ?
    </Text>
  );
};

type Props = {
  insets: EdgeInsets;
  toastOpacity: Animated.Value;
  toastTranslateY: Animated.Value;
  scrollRef: React.MutableRefObject<ScrollView | null>;
  keyboardEffectiveHeight: number;
  footerPaddingBottom: number;
  visibleWorkTypeLabel: string;
  onBack?: () => void;
  onClose: () => void;
  fieldsCollapsed: boolean;
  loadingFields: boolean;
  fieldsError: string | null;
  coreFields: Field[];
  additionalFields: Field[];
  derivedFields: Field[];
  showSecondaryFields: boolean;
  hasMultiplierField: boolean;
  hasWastePctField: boolean;
  lossPct: string;
  lossError: string | null;
  multiplier: number;
  inputs: CalcModalInputs;
  errors: CalcModalFieldErrors;
  rows: CalcModalRow[] | null;
  calculating: boolean;
  addingToRequest: boolean;
  canCalculate: boolean;
  canSend: boolean;
  onInputChange: (key: BasisKey, value: string) => void;
  onInputBlur: (key: BasisKey) => void;
  onInputFocus: () => void;
  onLossChange: (value: string) => void;
  onLossBlur: () => void;
  onToggleSecondaryFields: () => void;
  onToggleFieldsCollapsed: () => void;
  onCalculate: () => void;
  onSend: () => Promise<void>;
  onDecreaseRow: (rowKey: string) => void;
  onIncreaseRow: (rowKey: string) => void;
  onSetRowQty: (rowKey: string, value: string) => void;
  onRemoveRow: (rowKey: string) => void;
};

const BOTTOM_BAR_HEIGHT = 72;

const FieldInput = ({
  field,
  value,
  errorText,
  rowsOpen,
  onChange,
  onBlur,
  onFocus,
}: {
  field: Field;
  value: string;
  errorText?: string;
  rowsOpen: boolean;
  onChange: (value: string) => void;
  onBlur: () => void;
  onFocus: () => void;
}) => {
  const editable = field.editable !== false;

  return (
    <View key={field.key} style={cs.fieldInputWrap}>
      <View style={cs.fieldLabelRow}>
        <Text style={cs.fieldLabel}>
          {field.label}
          {field.uom ? `, ${field.uom}` : ""}
        </Text>
        {field.required ? (
          <Text style={cs.fieldRequired}>*</Text>
        ) : null}
        <Hint text={field.hint ?? ""} />
      </View>

      {editable ? (
        <TextInput
          testID={`calc-field:${field.key}`}
          keyboardType="numeric"
          placeholder={field.hint ?? ""}
          placeholderTextColor="#94A3B8"
          value={value}
          onChangeText={onChange}
          onBlur={onBlur}
          style={[
            cs.fieldInputEditable,
            { borderColor: errorText ? "#ef4444" : "#e5e7eb" },
          ]}
          onFocus={() => {
            if (rowsOpen) {
              onFocus();
            }
          }}
        />
      ) : (
        <View style={cs.fieldInputReadonly}>
          <Text style={cs.fieldInputReadonlyText}>{value || "—"}</Text>
        </View>
      )}

      {errorText ? (
        <Text style={cs.fieldError}>{errorText}</Text>
      ) : field.hint ? (
        <Text style={cs.fieldHint}>{field.hint}</Text>
      ) : null}
    </View>
  );
};

const ResultRow = ({
  item,
  onDecrease,
  onIncrease,
  onSetQty,
  onRemove,
}: {
  item: CalcModalRow;
  onDecrease: (rowKey: string) => void;
  onIncrease: (rowKey: string) => void;
  onSetQty: (rowKey: string, value: string) => void;
  onRemove: (rowKey: string) => void;
}) => {
  const rowKey = rowKeyOf(item);

  return (
    <View style={cs.resultRow}>
      <Text style={cs.resultRowTitle}>
        {item.item_name_ru ?? item.rik_code}
        {item.section ? <Text style={cs.resultRowSection}>{` (${item.section})`}</Text> : null}
      </Text>

      <View style={cs.resultRowBody}>
        <View style={cs.resultRowFlex}>
          <Text style={cs.resultRowQtyLabel}>Кол-во</Text>

          <View style={cs.resultRowQtyRow}>
            <TextInput
              testID={`calc-row-qty:${rowKey}`}
              value={String(qtyIssue(Number(item.qty ?? 0))).replace(".", ",")}
              onChangeText={(text) => onSetQty(rowKey, text)}
              keyboardType="numeric"
              style={cs.resultRowQtyInput}
            />
            <Text style={cs.resultRowUom}>{item.uom_code}</Text>
          </View>

          {Number.isFinite(item.suggested_qty as number) ? (
            <Text style={cs.resultRowSuggested}>
              К выдаче: <Text style={cs.resultRowSuggestedBold}>{qtyIssue(Number(item.suggested_qty ?? 0))}</Text>{" "}
              {item.uom_code}
            </Text>
          ) : null}
        </View>

        <Pressable
          testID={`calc-row-decrease:${rowKey}`}
          onPress={() => onDecrease(rowKey)}
          hitSlop={8}
          style={cs.resultRowPmBtn}
        >
          <Text style={cs.resultRowPmText}>-</Text>
        </Pressable>

        <Pressable
          testID={`calc-row-increase:${rowKey}`}
          onPress={() => onIncrease(rowKey)}
          hitSlop={8}
          style={cs.resultRowPmBtn}
        >
          <Text style={cs.resultRowPmText}>+</Text>
        </Pressable>

        <Pressable
          testID={`calc-row-remove:${rowKey}`}
          onPress={() => onRemove(rowKey)}
          hitSlop={8}
          style={cs.resultRowRemoveBtn}
        >
          <Text style={cs.resultRowRemoveText}>×</Text>
        </Pressable>
      </View>
    </View>
  );
};

export default function CalcModalContent(props: Props) {
  return (
    <View style={cs.outerWrap}>
      <View style={cs.innerWrap}>
        <View
          style={[
            cs.headerBar,
            { paddingTop: props.insets.top + 8 },
          ]}
        >
          {props.onBack ? (
            <Pressable
              testID="calc-back-button"
              onPress={props.onBack}
              hitSlop={10}
              style={cs.backBtn}
            >
              <Text style={cs.backBtnText}>← Назад</Text>
            </Pressable>
          ) : (
            <View style={cs.backBtnPlaceholder} />
          )}

          <View style={cs.headerTitleWrap}>
            <Text style={cs.headerTitleText} numberOfLines={1}>
              Смета
            </Text>
          </View>

          <IconSquareButton
            testID="calc-close-button"
            onPress={props.onClose}
            width={44}
            height={44}
            radius={12}
            bg="#F3F4F6"
            bgPressed="#E5E7EB"
            bgDisabled="#F3F4F6"
            spinnerColor="#111827"
            accessibilityLabel="Закрыть"
          >
            <Ionicons name="close" size={22} color="#111827" />
          </IconSquareButton>
        </View>

        <Animated.View
          pointerEvents="none"
          style={[
            cs.toastWrap,
            {
              top: props.insets.top + 62,
              opacity: props.toastOpacity,
              transform: [{ translateY: props.toastTranslateY }],
            },
          ]}
        >
          <View style={cs.toastBubble}>
            <Text style={cs.toastText}>Заполните поля - расчет автоматически</Text>
          </View>
        </Animated.View>

        <View style={cs.bodyFlex}>
          <KeyboardAvoidingView
            style={cs.bodyFlex}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={Platform.OS === "ios" ? props.insets.top + 56 : 0}
          >
            <ScrollView
              ref={(value) => {
                props.scrollRef.current = value;
              }}
              style={cs.bodyFlex}
              stickyHeaderIndices={[0]}
              contentContainerStyle={{
                padding: 16,
                paddingBottom:
                  16 + BOTTOM_BAR_HEIGHT + props.footerPaddingBottom + props.keyboardEffectiveHeight + 16,
              }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
            >
              <View style={[cs.stickyHeader, SHADOW_STICKY as object]}>
                <View style={cs.stickyHeaderPad}>
                  <Text
                    style={cs.stickyHeaderTitle}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                  >
                    {props.visibleWorkTypeLabel}
                  </Text>
                </View>
              </View>

              {!props.fieldsCollapsed ? (
                <>
                  {props.loadingFields ? (
                    <View style={cs.loadingWrap}>
                      <ActivityIndicator />
                    </View>
                  ) : props.coreFields.length === 0 && props.additionalFields.length === 0 && props.derivedFields.length === 0 ? (
                    <Text style={cs.mutedText}>
                      {props.fieldsError ?? "Для этого вида работ нет активных норм."}
                    </Text>
                  ) : (
                    <>
                      {props.coreFields.map((field) => (
                        <FieldInput
                          key={field.key}
                          field={field}
                          value={props.inputs[field.key] ?? ""}
                          errorText={props.errors[field.key]}
                          rowsOpen={Boolean(props.rows)}
                          onChange={(value) => props.onInputChange(field.key, value)}
                          onBlur={() => props.onInputBlur(field.key)}
                          onFocus={props.onInputFocus}
                        />
                      ))}

                      {props.additionalFields.length > 0 ? (
                        <View style={cs.fieldInputWrap}>
                          <Pressable
                            testID="calc-toggle-secondary-fields"
                            onPress={props.onToggleSecondaryFields}
                            style={cs.toggleSecondaryBtn}
                          >
                            <Text style={cs.toggleSecondaryText}>
                              Дополнительные параметры {props.showSecondaryFields ? "▴" : "▾"}
                            </Text>
                          </Pressable>
                        </View>
                      ) : null}

                      {props.showSecondaryFields
                        ? props.additionalFields.map((field) => (
                            <FieldInput
                              key={field.key}
                              field={field}
                              value={props.inputs[field.key] ?? ""}
                              errorText={props.errors[field.key]}
                              rowsOpen={Boolean(props.rows)}
                              onChange={(value) => props.onInputChange(field.key, value)}
                              onBlur={() => props.onInputBlur(field.key)}
                              onFocus={props.onInputFocus}
                            />
                          ))
                        : null}

                      {props.derivedFields.length > 0 ? (
                        <View style={cs.derivedWrap}>
                          <Text style={cs.derivedTitle}>
                            Расчётные значения
                          </Text>
                          {props.derivedFields.map((field) => (
                            <FieldInput
                              key={field.key}
                              field={field}
                              value={props.inputs[field.key] ?? ""}
                              errorText={props.errors[field.key]}
                              rowsOpen={Boolean(props.rows)}
                              onChange={(value) => props.onInputChange(field.key, value)}
                              onBlur={() => props.onInputBlur(field.key)}
                              onFocus={props.onInputFocus}
                            />
                          ))}
                        </View>
                      ) : null}

                      {!props.hasMultiplierField && !props.hasWastePctField ? (
                        <View style={cs.lossWrap}>
                          <Text style={cs.derivedTitle}>
                            Запас/потери, %
                          </Text>
                          <TextInput
                            testID="calc-loss-input"
                            keyboardType="numeric"
                            placeholder="Обычно 5-10%"
                            placeholderTextColor="#94A3B8"
                            value={props.lossPct}
                            onChangeText={props.onLossChange}
                            onBlur={props.onLossBlur}
                            style={[
                              cs.fieldInputEditable,
                              { borderColor: props.lossError ? "#ef4444" : "#e5e7eb" },
                            ]}
                          />
                          {props.lossError ? (
                            <Text style={cs.lossErrorText}>{props.lossError}</Text>
                          ) : (
                            <Text style={cs.lossHintText}>
                              Итоговый множитель: {props.multiplier.toFixed(2)}
                            </Text>
                          )}
                        </View>
                      ) : null}
                    </>
                  )}
                </>
              ) : null}

              {props.rows ? (
                <View style={cs.resultsSection}>
                  <View style={cs.resultsTitleRow}>
                    <Text style={cs.resultsSectionTitle}>Результат</Text>

                    <Pressable
                      testID="calc-toggle-fields"
                      onPress={props.onToggleFieldsCollapsed}
                      style={cs.toggleFieldsBtn}
                    >
                      <Text style={cs.toggleFieldsBtnText}>
                        {props.fieldsCollapsed ? "Поля ▾" : "Поля ▴"}
                      </Text>
                    </Pressable>
                  </View>

                  {props.rows.length > 0 ? (
                    <View style={cs.resultsListWrap}>
                      <FlashList
                        data={props.rows}
                        renderItem={({ item }) => (
                          <ResultRow
                            item={item}
                            onDecrease={props.onDecreaseRow}
                            onIncrease={props.onIncreaseRow}
                            onSetQty={props.onSetRowQty}
                            onRemove={props.onRemoveRow}
                          />
                        )}
                        keyExtractor={(item) => rowKeyOf(item)}
                        scrollEnabled={false}
                      />
                    </View>
                  ) : (
                    <Text style={cs.mutedText}>Для указанных параметров нормы не найдены.</Text>
                  )}
                </View>
              ) : null}
            </ScrollView>
          </KeyboardAvoidingView>

          <View
            style={[
              cs.footerOuter,
              { paddingBottom: props.footerPaddingBottom },
            ]}
          >
            <View style={[cs.footerInner, SHADOW_CARD as object]}>
              <IconSquareButton
                testID="calc-cancel-button"
                onPress={props.onClose}
                width={52}
                height={52}
                radius={16}
                bg="#DC2626"
                bgPressed="#B91C1C"
                bgDisabled="#FCA5A5"
                spinnerColor="#FFFFFF"
                accessibilityLabel="Отмена"
              >
                <Ionicons name="close" size={22} color="#FFFFFF" />
              </IconSquareButton>

              <View style={cs.footerSpacer} />

              <Pressable
                testID="calc-run-button"
                onPress={props.onCalculate}
                disabled={!props.canCalculate}
                style={[
                  cs.calcRunBtn,
                  { opacity: props.canCalculate ? 1 : 0.45 },
                ]}
              >
                {props.calculating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={cs.calcRunBtnText}>Рассчитать</Text>
                )}
              </Pressable>

              {props.canSend ? (
                <>
                  <View style={cs.footerSpacer} />
                  <SendPrimaryButton
                    variant="green"
                    disabled={!props.canSend}
                    loading={props.addingToRequest}
                    onPress={props.onSend}
                    accessibilityLabel="Отправить"
                  />
                </>
              ) : null}
            </View>
          </View>

          {props.calculating ? (
            <View
              style={[
                cs.calcOverlay,
                { bottom: BOTTOM_BAR_HEIGHT + props.footerPaddingBottom + 16 },
              ]}
            >
              <ActivityIndicator size="large" />
              <Text style={cs.calcOverlayText}>Идет расчет...</Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const cs = StyleSheet.create({
  outerWrap: { flex: 1, backgroundColor: "#F8FAFC" },
  innerWrap: { flex: 1, backgroundColor: "#fff" },
  headerBar: {
    paddingBottom: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    zIndex: 50,
  },
  backBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#111827",
  },
  backBtnText: { color: "#fff", fontWeight: "900" },
  backBtnPlaceholder: { width: 88 },
  headerTitleWrap: { flex: 1, minWidth: 0, alignItems: "center" },
  headerTitleText: { fontSize: 16, fontWeight: "900", color: "#0F172A" },
  toastWrap: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 999,
  },
  toastBubble: {
    alignSelf: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(17,24,39,0.92)",
    ...(Platform.OS === "web"
      ? ({ boxShadow: "0px 10px 18px rgba(0,0,0,0.18)" } as object)
      : {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.18,
          shadowRadius: 18,
          elevation: 8,
        }),
  },
  toastText: { color: "#fff", fontWeight: "800" },
  bodyFlex: { flex: 1 },
  stickyHeader: {
    backgroundColor: "#fff",
    paddingTop: 2,
    paddingBottom: 12,
    marginTop: -2,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    zIndex: 20,
  },
  stickyHeaderPad: { paddingHorizontal: 16 },
  stickyHeaderTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#0F172A",
    lineHeight: 22,
  },
  loadingWrap: { paddingVertical: 24, alignItems: "center" },
  mutedText: { color: "#6b7280" },
  fieldInputWrap: { marginBottom: 12 },
  fieldLabelRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  fieldLabel: { fontWeight: "600", color: "#0F172A" },
  fieldRequired: { marginLeft: 4, color: "#EF4444", fontWeight: "700" },
  fieldInputEditable: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "web" ? 10 : 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  fieldInputReadonly: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "web" ? 10 : 12,
    backgroundColor: "#f8fafc",
  },
  fieldInputReadonlyText: { fontSize: 16, color: "#0F172A", fontWeight: "600" },
  fieldError: { color: "#ef4444", marginTop: 4 },
  fieldHint: { color: "#6b7280", marginTop: 4 },
  hint: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: "#f3f4f6",
    color: "#374151",
    fontWeight: "700",
  },
  toggleSecondaryBtn: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#f8fafc",
  },
  toggleSecondaryText: { color: "#0F172A", fontWeight: "700" },
  derivedWrap: { marginBottom: 8 },
  derivedTitle: { fontWeight: "700", marginBottom: 6, color: "#0F172A" },
  lossWrap: { marginTop: 4 },
  lossErrorText: { color: "#ef4444", marginTop: 6 },
  lossHintText: { color: "#6b7280", marginTop: 6 },
  resultsSection: { marginTop: 16, borderTopWidth: 1, borderTopColor: "#e5e7eb", paddingTop: 12 },
  resultsTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  resultsSectionTitle: { fontSize: 18, fontWeight: "900", color: "#0F172A" },
  toggleFieldsBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  toggleFieldsBtnText: { fontWeight: "900", color: "#111827" },
  resultsListWrap: { borderRadius: 16, backgroundColor: "#fff" },
  resultRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  resultRowTitle: { fontWeight: "800", fontSize: 15, color: "#111827" },
  resultRowSection: { color: "#6b7280" },
  resultRowBody: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  resultRowFlex: { flex: 1 },
  resultRowQtyLabel: { color: "#6b7280", fontSize: 12 },
  resultRowQtyRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  resultRowQtyInput: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    minWidth: 96,
    textAlign: "center",
    backgroundColor: "#fff",
  },
  resultRowUom: { fontSize: 14, fontWeight: "800", color: "#374151" },
  resultRowSuggested: { color: "#374151", marginTop: 4 },
  resultRowSuggestedBold: { fontWeight: "900" },
  resultRowPmBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
  },
  resultRowPmText: { fontWeight: "900" },
  resultRowRemoveBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DC2626",
  },
  resultRowRemoveText: { color: "#fff", fontSize: 22, fontWeight: "900", lineHeight: 22 },
  footerOuter: {
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
    backgroundColor: "rgba(255,255,255,0.96)",
  },
  footerInner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  footerSpacer: { width: 10 },
  calcRunBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1B7F55",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  calcRunBtnText: { color: "#fff", fontWeight: "900", fontSize: 16 },
  calcOverlay: {
    position: "absolute",
    left: 16,
    right: 16,
    top: 16,
    backgroundColor: "rgba(255,255,255,0.60)",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
  },
  calcOverlayText: { marginTop: 10, fontWeight: "900", color: "#111827" },
});
