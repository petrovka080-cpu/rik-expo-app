// src/components/WorkMaterialsEditor.tsx
import React from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
} from "react-native";

import { FlashList } from "../ui/FlashList";

const UI = {
  bg: "#F9FAFB",
  text: "#0F172A",
  sub: "#6B7280",
  border: "#E5E7EB",
  chip: "#EFF6FF",
  danger: "#EF4444",
  accent: "#0EA5E9",
};

export type WorkMaterialRow = {
  id?: string;                  // id строки (может быть из БД, может быть локальный)
  material_id: string | null;   // id материала в каталоге
  code?: string | null;         // RIK-код
  name?: string | null;         // Название
  uom?: string | null;          // Ед. изм.
  qty: number;                  // Кол-во (классическое поле)
  price?: number | null;        // Цена за единицу

  // 🔥 ДОБАВЛЕНО для склада:
  mat_code?: string | null;     // RIK-код (альтернативное имя, ты его используешь)
  available?: number;           // доступно на складе
  qty_fact?: number;            // фактическое кол-во (мы будем синхронизировать с qty)
};

type Props = {
  rows: WorkMaterialRow[];
  onChange: (rows: WorkMaterialRow[]) => void;
  readOnly?: boolean;

  // 🔥 ДОБАВЛЕНО: открыть каталог материалов
  onAdd?: () => void;

  // 🔥 ДОБАВЛЕНО: если нужно, внешнее удаление
  onRemove?: (index: number) => void;
};

export const WorkMaterialsEditor: React.FC<Props> = ({
  rows,
  onChange,
  readOnly,
  onAdd,
  onRemove,
}) => {
  const handleQtyChange = (index: number, value: string) => {
    const qty = parseFloat(value.replace(",", ".")) || 0;
    const newRows = [...rows];
    const prev = newRows[index];
    if (!prev) return;

    newRows[index] = {
      ...prev,
      qty,
      qty_fact: qty, // 🔥 СИНХРОНИЗИРУЕМ qty_fact для твоей логики склада
    };
    onChange(newRows);
  };

  const handlePriceChange = (index: number, value: string) => {
    const price =
      value.trim() === "" ? null : parseFloat(value.replace(",", "."));
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], price: price ?? null };
    onChange(newRows);
  };

  const handleRemove = (index: number) => {
    if (readOnly) return;

    // если снаружи передали onRemove — даём ему решать
    if (onRemove) {
      onRemove(index);
      return;
    }

    const newRows = [...rows];
    newRows.splice(index, 1);
    onChange(newRows);
  };

  const handleAddEmpty = () => {
    if (readOnly) return;

    // 🔥 ГЛАВНОЕ: если есть onAdd → не добавляем пустую строку, а открываем КАТАЛОГ
    if (onAdd) {
      onAdd();
      return;
    }

    // Фоллбек: старое поведение, если onAdd не передали (другие экраны)
    const newRows = [
      ...rows,
      {
        id: undefined,
        material_id: null,
        code: null,
        name: "Новая позиция",
        uom: null,
        qty: 1,
        qty_fact: 1,
        price: null,
      } as WorkMaterialRow,
    ];
    onChange(newRows);
  };

  const renderRow = ({ item, index }: { item: WorkMaterialRow; index: number }) => {
    const qty = item.qty ?? item.qty_fact ?? 0;

    const sum =
      item.price != null && !Number.isNaN(item.price)
        ? (item.price || 0) * (qty || 0)
        : null;

    const codeToShow = item.code ?? item.mat_code ?? null;

    return (
      <View style={styles.rowCard}>
        <View style={styles.rowHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>
              {item.name || codeToShow || "Материал"}
            </Text>
            <Text style={styles.rowSubtitle}>
              {codeToShow ? `${codeToShow} · ` : ""}
              {item.uom || "ед."}
            </Text>
            {typeof item.available === "number" && (
              <Text
                style={{
                  fontSize: 11,
                  marginTop: 2,
                  color: "#0F766E",
                }}
              >
                Доступно:{" "}
                {Number(item.available).toLocaleString("ru-RU")}
              </Text>
            )}
          </View>
          {!readOnly && (
            <Pressable
              style={styles.removeBtn}
              onPress={() => handleRemove(index)}
            >
              <Text style={styles.removeBtnText}>✕</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.rowBody}>
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Кол-во</Text>
            <TextInput
              style={[styles.input, readOnly && styles.inputReadonly]}
              value={String(qty ?? "")}
              onChangeText={(v) => handleQtyChange(index, v)}
              keyboardType="decimal-pad"
              editable={!readOnly}
            />
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Цена</Text>
            <TextInput
              style={[styles.input, readOnly && styles.inputReadonly]}
              value={
                item.price != null && !Number.isNaN(item.price)
                  ? String(item.price)
                  : ""
              }
              onChangeText={(v) => handlePriceChange(index, v)}
              keyboardType="decimal-pad"
              editable={!readOnly}
              placeholder="0"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={[styles.fieldBlock, { flex: 1.2 }]}>
            <Text style={styles.fieldLabel}>Сумма</Text>
            <View style={styles.sumBox}>
              <Text style={styles.sumText}>
                {sum != null ? `${sum.toLocaleString()} c` : "—"}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <FlashList
        data={rows}
        estimatedItemSize={148}
        keyExtractor={(_, idx) => `${idx}`}
        renderItem={renderRow}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Нет материалов</Text>
            <Text style={styles.emptyText}>
              Добавь материалы, которые были использованы по этому этапу.
            </Text>
          </View>
        }
      />
      {!readOnly && (
        <Pressable style={styles.addBtn} onPress={handleAddEmpty}>
          <Text style={styles.addBtnText}>+ Добавить позицию</Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  rowCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: "#FFFFFF",
    padding: 10,
    marginBottom: 8,
  },
  rowHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: UI.text,
  },
  rowSubtitle: {
    fontSize: 11,
    color: UI.sub,
    marginTop: 2,
  },
  removeBtn: {
    marginLeft: 8,
    width: 26,
    height: 26,
    borderRadius: 999,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  removeBtnText: {
    color: UI.danger,
    fontWeight: "700",
  },
  rowBody: {
    flexDirection: "row",
    marginTop: 10,
    alignItems: "flex-end",
  },
  fieldBlock: {
    marginRight: 8,
  },
  fieldLabel: {
    fontSize: 11,
    color: UI.sub,
    marginBottom: 2,
  },
  input: {
    minWidth: 70,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: UI.border,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 13,
    color: UI.text,
    backgroundColor: "#F9FAFB",
  },
  inputReadonly: {
    backgroundColor: "#F3F4F6",
  },
  sumBox: {
    minWidth: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: UI.border,
    paddingHorizontal: 8,
    paddingVertical: 6,
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
  },
  sumText: {
    fontSize: 13,
    color: UI.text,
    fontWeight: "500",
  },
  emptyBox: {
    padding: 16,
    alignItems: "flex-start",
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: UI.text,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 12,
    color: UI.sub,
  },
  addBtn: {
    marginTop: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: UI.accent,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECFEFF",
  },
  addBtnText: {
    fontSize: 13,
    color: UI.accent,
    fontWeight: "600",
  },
});
