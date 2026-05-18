import { Alert, Pressable, Text, TextInput, View } from "react-native";

import type { CalcModalRow } from "./calcModal.model";
import { qtyIssue, rowKeyOf } from "./calcModal.model";
import { cs } from "./CalcModalContent.styles";
import type { Field } from "./useCalcFields";

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

export const FieldInput = ({
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

export const ResultRow = ({
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
