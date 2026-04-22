import React from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
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
      style={{
        marginLeft: 8,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 999,
        backgroundColor: "#f3f4f6",
        color: "#374151",
        fontWeight: "700",
      }}
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
    <View key={field.key} style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
        <Text style={{ fontWeight: "600", color: "#0F172A" }}>
          {field.label}
          {field.uom ? `, ${field.uom}` : ""}
        </Text>
        {field.required ? (
          <Text style={{ marginLeft: 4, color: "#EF4444", fontWeight: "700" }}>*</Text>
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
          style={{
            borderWidth: 1,
            borderColor: errorText ? "#ef4444" : "#e5e7eb",
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: Platform.OS === "web" ? 10 : 12,
            fontSize: 16,
            backgroundColor: "#fff",
          }}
          onFocus={() => {
            if (rowsOpen) {
              onFocus();
            }
          }}
        />
      ) : (
        <View
          style={{
            borderWidth: 1,
            borderColor: "#e5e7eb",
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: Platform.OS === "web" ? 10 : 12,
            backgroundColor: "#f8fafc",
          }}
        >
          <Text style={{ fontSize: 16, color: "#0F172A", fontWeight: "600" }}>{value || "—"}</Text>
        </View>
      )}

      {errorText ? (
        <Text style={{ color: "#ef4444", marginTop: 4 }}>{errorText}</Text>
      ) : field.hint ? (
        <Text style={{ color: "#6b7280", marginTop: 4 }}>{field.hint}</Text>
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
    <View
      style={{
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#f3f4f6",
      }}
    >
      <Text style={{ fontWeight: "800", fontSize: 15, color: "#111827" }}>
        {item.item_name_ru ?? item.rik_code}
        {item.section ? <Text style={{ color: "#6b7280" }}>{` (${item.section})`}</Text> : null}
      </Text>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#6b7280", fontSize: 12 }}>Кол-во</Text>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <TextInput
              testID={`calc-row-qty:${rowKey}`}
              value={String(qtyIssue(Number(item.qty ?? 0))).replace(".", ",")}
              onChangeText={(text) => onSetQty(rowKey, text)}
              keyboardType="numeric"
              style={{
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
              }}
            />
            <Text style={{ fontSize: 14, fontWeight: "800", color: "#374151" }}>{item.uom_code}</Text>
          </View>

          {Number.isFinite(item.suggested_qty as number) ? (
            <Text style={{ color: "#374151", marginTop: 4 }}>
              К выдаче: <Text style={{ fontWeight: "900" }}>{qtyIssue(Number(item.suggested_qty ?? 0))}</Text>{" "}
              {item.uom_code}
            </Text>
          ) : null}
        </View>

        <Pressable
          testID={`calc-row-decrease:${rowKey}`}
          onPress={() => onDecrease(rowKey)}
          hitSlop={8}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 12,
            backgroundColor: "#f3f4f6",
          }}
        >
          <Text style={{ fontWeight: "900" }}>-</Text>
        </Pressable>

        <Pressable
          testID={`calc-row-increase:${rowKey}`}
          onPress={() => onIncrease(rowKey)}
          hitSlop={8}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 12,
            backgroundColor: "#f3f4f6",
          }}
        >
          <Text style={{ fontWeight: "900" }}>+</Text>
        </Pressable>

        <Pressable
          testID={`calc-row-remove:${rowKey}`}
          onPress={() => onRemove(rowKey)}
          hitSlop={8}
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#DC2626",
          }}
        >
          <Text style={{ color: "#fff", fontSize: 22, fontWeight: "900", lineHeight: 22 }}>×</Text>
        </Pressable>
      </View>
    </View>
  );
};

export default function CalcModalContent(props: Props) {
  return (
    <View style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        <View
          style={{
            paddingTop: props.insets.top + 8,
            paddingBottom: 10,
            paddingHorizontal: 16,
            borderBottomWidth: 1,
            borderBottomColor: "#E2E8F0",
            backgroundColor: "#fff",
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            zIndex: 50,
          }}
        >
          {props.onBack ? (
            <Pressable
              testID="calc-back-button"
              onPress={props.onBack}
              hitSlop={10}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 12,
                backgroundColor: "#111827",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "900" }}>← Назад</Text>
            </Pressable>
          ) : (
            <View style={{ width: 88 }} />
          )}

          <View style={{ flex: 1, minWidth: 0, alignItems: "center" }}>
            <Text style={{ fontSize: 16, fontWeight: "900", color: "#0F172A" }} numberOfLines={1}>
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
          style={{
            position: "absolute",
            left: 12,
            right: 12,
            top: props.insets.top + 62,
            opacity: props.toastOpacity,
            transform: [{ translateY: props.toastTranslateY }],
            zIndex: 999,
          }}
        >
          <View
            style={{
              alignSelf: "center",
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 999,
              backgroundColor: "rgba(17,24,39,0.92)",
              ...(Platform.OS === "web"
                ? ({ boxShadow: "0px 10px 18px rgba(0,0,0,0.18)" } as const)
                : {
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.18,
                    shadowRadius: 18,
                    elevation: 8,
                  }),
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "800" }}>Заполните поля - расчет автоматически</Text>
          </View>
        </Animated.View>

        <View style={{ flex: 1 }}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={Platform.OS === "ios" ? props.insets.top + 56 : 0}
          >
            <ScrollView
              ref={(value) => {
                props.scrollRef.current = value;
              }}
              style={{ flex: 1 }}
              stickyHeaderIndices={[0]}
              contentContainerStyle={{
                padding: 16,
                paddingBottom:
                  16 + BOTTOM_BAR_HEIGHT + props.footerPaddingBottom + props.keyboardEffectiveHeight + 16,
              }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
            >
              <View
                style={{
                  backgroundColor: "#fff",
                  paddingTop: 2,
                  paddingBottom: 12,
                  marginTop: -2,
                  borderBottomWidth: 1,
                  borderBottomColor: "#E5E7EB",
                  zIndex: 20,
                  ...(SHADOW_STICKY as object),
                }}
              >
                <View style={{ paddingHorizontal: 16 }}>
                  <Text
                    style={{
                      fontSize: 17,
                      fontWeight: "900",
                      color: "#0F172A",
                      lineHeight: 22,
                    }}
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
                    <View style={{ paddingVertical: 24, alignItems: "center" }}>
                      <ActivityIndicator />
                    </View>
                  ) : props.coreFields.length === 0 && props.additionalFields.length === 0 && props.derivedFields.length === 0 ? (
                    <Text style={{ color: "#6b7280" }}>
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
                        <View style={{ marginBottom: 12 }}>
                          <Pressable
                            testID="calc-toggle-secondary-fields"
                            onPress={props.onToggleSecondaryFields}
                            style={{
                              borderWidth: 1,
                              borderColor: "#e5e7eb",
                              borderRadius: 12,
                              paddingHorizontal: 12,
                              paddingVertical: 10,
                              backgroundColor: "#f8fafc",
                            }}
                          >
                            <Text style={{ color: "#0F172A", fontWeight: "700" }}>
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
                        <View style={{ marginBottom: 8 }}>
                          <Text style={{ fontWeight: "700", marginBottom: 6, color: "#0F172A" }}>
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
                        <View style={{ marginTop: 4 }}>
                          <Text style={{ fontWeight: "700", marginBottom: 6, color: "#0F172A" }}>
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
                            style={{
                              borderWidth: 1,
                              borderColor: props.lossError ? "#ef4444" : "#e5e7eb",
                              borderRadius: 12,
                              paddingHorizontal: 12,
                              paddingVertical: Platform.OS === "web" ? 10 : 12,
                              fontSize: 16,
                              backgroundColor: "#fff",
                            }}
                          />
                          {props.lossError ? (
                            <Text style={{ color: "#ef4444", marginTop: 6 }}>{props.lossError}</Text>
                          ) : (
                            <Text style={{ color: "#6b7280", marginTop: 6 }}>
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
                <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: "#e5e7eb", paddingTop: 12 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 10,
                    }}
                  >
                    <Text style={{ fontSize: 18, fontWeight: "900", color: "#0F172A" }}>Результат</Text>

                    <Pressable
                      testID="calc-toggle-fields"
                      onPress={props.onToggleFieldsCollapsed}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 999,
                        backgroundColor: "#F3F4F6",
                        borderWidth: 1,
                        borderColor: "#E5E7EB",
                      }}
                    >
                      <Text style={{ fontWeight: "900", color: "#111827" }}>
                        {props.fieldsCollapsed ? "Поля ▾" : "Поля ▴"}
                      </Text>
                    </Pressable>
                  </View>

                  {props.rows.length > 0 ? (
                    <View style={{ borderRadius: 16, backgroundColor: "#fff" }}>
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
                    <Text style={{ color: "#6b7280" }}>Для указанных параметров нормы не найдены.</Text>
                  )}
                </View>
              ) : null}
            </ScrollView>
          </KeyboardAvoidingView>

          <View
            style={{
              paddingHorizontal: 16,
              paddingTop: 10,
              paddingBottom: props.footerPaddingBottom,
              borderTopWidth: 1,
              borderTopColor: "rgba(0,0,0,0.06)",
              backgroundColor: "rgba(255,255,255,0.96)",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 10,
                borderRadius: 18,
                backgroundColor: "rgba(255,255,255,0.96)",
                borderWidth: 1,
                borderColor: "rgba(0,0,0,0.06)",
                ...(SHADOW_CARD as object),
              }}
            >
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

              <View style={{ width: 10 }} />

              <Pressable
                testID="calc-run-button"
                onPress={props.onCalculate}
                disabled={!props.canCalculate}
                style={{
                  flex: 1,
                  height: 52,
                  borderRadius: 16,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#1B7F55",
                  opacity: props.canCalculate ? 1 : 0.45,
                  borderWidth: 1,
                  borderColor: "rgba(0,0,0,0.08)",
                }}
              >
                {props.calculating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: "#fff", fontWeight: "900", fontSize: 16 }}>Рассчитать</Text>
                )}
              </Pressable>

              {props.canSend ? (
                <>
                  <View style={{ width: 10 }} />
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
              style={{
                position: "absolute",
                left: 16,
                right: 16,
                top: 16,
                bottom: BOTTOM_BAR_HEIGHT + props.footerPaddingBottom + 16,
                backgroundColor: "rgba(255,255,255,0.60)",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 16,
              }}
            >
              <ActivityIndicator size="large" />
              <Text style={{ marginTop: 10, fontWeight: "900", color: "#111827" }}>Идет расчет...</Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}
