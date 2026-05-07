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
import {
  BOTTOM_BAR_HEIGHT,
  SHADOW_CARD,
  SHADOW_STICKY,
  cs,
} from "./CalcModalContent.styles";

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
