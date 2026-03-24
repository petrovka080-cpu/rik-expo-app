// src/components/foreman/CalcModal.tsx
// PROD UI. Бизнес-логика не изменена.
// FIX: footer не двигается вместе с клавиатурой (всегда внизу)
// FIX: двигается только контент (ScrollView), инпуты прокручиваются выше footer
// FIX: paddingBottom учитывает footer + safe-area + keyboard overlap
// UX: workType вынесен из header и сделан sticky внутри ScrollView
// UX: под ним короткая подсказка
// FIX WEB: shadow* -> boxShadow (через SHADOW_*), без warning на web

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Animated,
  type KeyboardEvent,
} from "react-native";
import { FlashList } from "@/src/ui/FlashList";
import { supabase } from "../../../src/lib/supabaseClient";
import { useCalcFields, BasisKey, Field } from "./useCalcFields";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import IconSquareButton from "../../ui/IconSquareButton";
import SendPrimaryButton from "../../ui/SendPrimaryButton";

type Props = {
  visible: boolean;
  onClose: () => void;
  onBack?: () => void;
  workType?: { code: string; name: string } | null;
  onAddToRequest?: (rows: Row[]) => void;
};

type Measures = Partial<Record<BasisKey, number>>;
type Inputs = Partial<Record<BasisKey, string>>;
type FieldErrors = Partial<Record<BasisKey, string>>;
type MeasureMap = Record<string, number | undefined>;
type InputMap = Record<string, string | undefined>;

type Row = {
  work_type_code: string;
  rik_code: string;
  section: string;
  uom_code: string;
  basis: string;
  base_coeff: number;
  effective_coeff: number;
  qty: number;
  suggested_qty: number | null;
  packs: number | null;
  pack_size: number | null;
  pack_uom: string | null;
  hint: string | null;
  item_name_ru: string | null;
};

type CalcRpcRow = Partial<Row>;

const formatNumber = (value: number) => {
  if (!Number.isFinite(value)) return "";
  const fixed = value.toFixed(6);
  return fixed.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
};

const qtyIssue = (value: number) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.ceil(n);
};

const sanitizeExpression = (raw: string) =>
  raw.replace(/,/g, ".").replace(/[xX*×хХ]/g, "*").replace(/:/g, "/").trim();

const SAFE_EXPRESSION = /^[-+*/().0-9\s]+$/;

const evaluateExpression = (rawInput: string): number => {
  const sanitized = sanitizeExpression(rawInput);
  if (!sanitized) throw new Error("empty");
  if (!SAFE_EXPRESSION.test(sanitized)) throw new Error("invalid_char");
  const fn = Function(`"use strict"; return (${sanitized});`);
  const result = fn();
  if (typeof result !== "number" || !Number.isFinite(result)) throw new Error("not_finite");
  return result;
};

const LOSS_ERROR_TEXT = "Некорректное значение";

const rowKeyOf = (row: Pick<Row, "section" | "rik_code">) => `${row.section}:${row.rik_code}`;

const normalizeCalcRow = (row: CalcRpcRow): Row => ({
  work_type_code: String(row.work_type_code ?? ""),
  rik_code: String(row.rik_code ?? ""),
  section: String(row.section ?? ""),
  uom_code: String(row.uom_code ?? ""),
  basis: String(row.basis ?? ""),
  base_coeff: Number.isFinite(Number(row.base_coeff)) ? Number(row.base_coeff) : 0,
  effective_coeff: Number.isFinite(Number(row.effective_coeff)) ? Number(row.effective_coeff) : 0,
  qty: Number.isFinite(Number(row.qty)) ? Number(row.qty) : 0,
  suggested_qty:
    row.suggested_qty == null || !Number.isFinite(Number(row.suggested_qty))
      ? null
      : Number(row.suggested_qty),
  packs: row.packs == null || !Number.isFinite(Number(row.packs)) ? null : Number(row.packs),
  pack_size:
    row.pack_size == null || !Number.isFinite(Number(row.pack_size)) ? null : Number(row.pack_size),
  pack_uom: row.pack_uom == null ? null : String(row.pack_uom),
  hint: row.hint == null ? null : String(row.hint),
  item_name_ru: row.item_name_ru == null ? null : String(row.item_name_ru),
});

// ===== SHADOW (PROD cross-platform) =====
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

// ===== KEYBOARD HEIGHT (iOS/Android) =====
function useKeyboardHeight() {
  const [h, setH] = useState(0);

  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const subShow = Keyboard.addListener(showEvt, (e: KeyboardEvent) => {
      const kh = Number(e?.endCoordinates?.height ?? 0);
      setH(kh > 0 ? kh : 0);
    });

    const subHide = Keyboard.addListener(hideEvt, () => setH(0));

    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, []);

  return h;
}

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

export default function CalcModal({ visible, onClose, onBack, workType, onAddToRequest }: Props) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView | null>(null);

  const keyboardH = useKeyboardHeight();
  const { loading: fLoading, fields, error: fieldsError } = useCalcFields(workType?.code);
// ===== TOAST HINT (2s) =====
const toastY = useRef(new Animated.Value(-8)).current;
const toastA = useRef(new Animated.Value(0)).current;
const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

const showToastHint = useCallback(() => {
  if (toastTimerRef.current) clearTimeout(toastTimerRef.current);

  toastY.setValue(-8);
  toastA.setValue(0);

  Animated.parallel([
    Animated.timing(toastA, { toValue: 1, duration: 180, useNativeDriver: true }),
    Animated.timing(toastY, { toValue: 0, duration: 180, useNativeDriver: true }),
  ]).start();

  toastTimerRef.current = setTimeout(() => {
    Animated.parallel([
      Animated.timing(toastA, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(toastY, { toValue: -8, duration: 200, useNativeDriver: true }),
    ]).start();
  }, 2000);
}, [toastA, toastY]);

useEffect(() => {
  return () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  };
}, []);
useEffect(() => {
  if (!visible) return;
  showToastHint();
}, [visible, workType?.code, showToastHint]);


  const [inputs, setInputs] = useState<Inputs>({});
  const [measures, setMeasures] = useState<Measures>({});
  const [errors, setErrors] = useState<FieldErrors>({});
  const [lossPct, setLossPct] = useState<string>("");
  const [lossTouched, setLossTouched] = useState(false);
  const [filmTouched, setFilmTouched] = useState(false);
  const [manualKeys, setManualKeys] = useState<Set<string>>(new Set());
  const [rows, setRows] = useState<Row[] | null>(null);

  const [calculating, setCalculating] = useState(false);
  const [addingToRequest, setAddingToRequest] = useState(false);
  const [showSecondaryFields, setShowSecondaryFields] = useState(false);

  // вњ… поля сворачиваем ТОЛЬКО после расчёта (UI)
  const [fieldsCollapsed, setFieldsCollapsed] = useState(false);
  useEffect(() => setFieldsCollapsed(!!rows), [rows]);

  const fieldMap = useMemo(() => {
    const map = new Map<BasisKey, Field>();
    fields.forEach((f) => map.set(f.key, f));
    return map;
  }, [fields]);

  const hasMultiplierField = useMemo(
    () => fields.some((f) => f.key === "multiplier" || f.key === "loss"),
    [fields],
  );

  const hasWastePctField = useMemo(
    () => fields.some((f) => f.key === "waste_pct" || f.key === "loss"),
    [fields],
  );

  const coreFields = useMemo(
    () => fields.filter((f) => (f.uiPriority ?? "core") === "core" && f.visibleInBaseUi !== false),
    [fields],
  );

  const additionalFields = useMemo(
    () =>
      fields.filter((f) => {
        const priority = f.uiPriority ?? "core";
        return priority === "secondary" || priority === "engineering";
      }),
    [fields],
  );

  const derivedFields = useMemo(
    () => fields.filter((f) => (f.uiPriority ?? "core") === "derived"),
    [fields],
  );

  const applyAutoRules = useCallback(
    (nextMeasures: Measures, nextInputs: Inputs) => {
      // --- ind_concrete: film_m2 auto = area_m2 ---
      if (workType?.code === "ind_concrete" && !filmTouched) {
        const a = (nextMeasures as MeasureMap).area_m2;
        const f = (nextMeasures as MeasureMap).film_m2;
        if (
          typeof a === "number" &&
          Number.isFinite(a) &&
          !(typeof f === "number" && Number.isFinite(f))
        ) {
          (nextMeasures as MeasureMap).film_m2 = a;
          nextInputs.film_m2 = formatNumber(a);
        }
      }

      // --- derived: area_m2 (facade) ---
      if (!manualKeys.has("area_m2")) {
        const len = (nextMeasures as MeasureMap).length_m;
        const p = (nextMeasures as MeasureMap).perimeter_m;
        const h = (nextMeasures as MeasureMap).height_m;
        const openingsA = (nextMeasures as MeasureMap).area_wall_m2;

        const hasLH =
          typeof len === "number" && Number.isFinite(len) && typeof h === "number" && Number.isFinite(h);

        const hasPH =
          typeof p === "number" && Number.isFinite(p) && typeof h === "number" && Number.isFinite(h);

        let a: number | null = null;
        if (hasLH) a = len * h;
        else if (hasPH) a = p * h;

        if (a != null) {
          if (typeof openingsA === "number" && Number.isFinite(openingsA) && openingsA > 0) {
            a = Math.max(0, a - openingsA);
          }
          const curA = (nextMeasures as MeasureMap).area_m2;
          if (!(typeof curA === "number" && Number.isFinite(curA))) {
            const out = Number(a.toFixed(3));
            (nextMeasures as MeasureMap).area_m2 = out;
            nextInputs.area_m2 = formatNumber(out);
          }
        }
      }

      // --- derived: volume_m3 ---
      if (!manualKeys.has("volume_m3")) {
        const area = (nextMeasures as MeasureMap).area_m2;
        const thickness = (nextMeasures as MeasureMap).height_m;
        const perim = (nextMeasures as MeasureMap).perimeter_m;
        const width = (nextMeasures as MeasureMap).length_m;

        const hasAreaThickness =
          typeof area === "number" && Number.isFinite(area) && typeof thickness === "number" && Number.isFinite(thickness);

        const hasStripDims =
          typeof perim === "number" &&
          Number.isFinite(perim) &&
          typeof width === "number" &&
          Number.isFinite(width) &&
          typeof thickness === "number" &&
          Number.isFinite(thickness);

        let derived: number | null = null;
        if (hasStripDims) derived = perim * width * thickness;
        else if (hasAreaThickness) derived = area * thickness;

        if (derived != null) {
          const v = Number(derived.toFixed(3));
          const cur = (nextMeasures as MeasureMap).volume_m3;
          if (!(typeof cur === "number" && Number.isFinite(cur))) {
            (nextMeasures as MeasureMap).volume_m3 = v;
            nextInputs.volume_m3 = formatNumber(v);
          }
        }
      }
    },
    [workType?.code, filmTouched, manualKeys],
  );

  useEffect(() => {
    if (!visible) {
      setRows(null);
      setMeasures({});
      setInputs({});
      setErrors({});
      setLossPct("");
      setLossTouched(false);
      setFilmTouched(false);
      setManualKeys(new Set());
      setCalculating(false);
      setAddingToRequest(false);
      setShowSecondaryFields(false);
      return;
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    setRows(null);
    setMeasures({});
    setInputs({});
    setErrors({});
    setLossPct("");
    setLossTouched(false);
    setFilmTouched(false);
    setManualKeys(new Set());
    setShowSecondaryFields(false);
  }, [workType?.code, visible]);

  useEffect(() => {
    if (!visible) return;

    const nextInputs: Inputs = {};
    const nextMeasures: Measures = {};

    fields.forEach((field) => {
      const k = field.key;
      if ((inputs as InputMap)[k] !== undefined) nextInputs[k] = (inputs as InputMap)[k];
      else nextInputs[k] = "";

      if ((measures as MeasureMap)[k] != null) nextMeasures[k] = (measures as MeasureMap)[k];
      else delete (nextMeasures as MeasureMap)[k];
    });

    applyAutoRules(nextMeasures, nextInputs);

    setErrors((prev) => {
      const next: FieldErrors = { ...prev };
      Object.keys(next).forEach((key) => {
        if (!fieldMap.has(key as BasisKey)) delete (next as Record<string, string | undefined>)[key];
      });
      return next;
    });

    setInputs(nextInputs);
    setMeasures(nextMeasures);
  }, [visible, fields, fieldMap, applyAutoRules]);

  const { lossValue, lossInvalid } = useMemo(() => {
    const trimmed = lossPct.trim();
    if (!trimmed) return { lossValue: 0, lossInvalid: false };
    try {
      const value = evaluateExpression(trimmed);
      return { lossValue: value, lossInvalid: false };
    } catch {
      return { lossValue: 0, lossInvalid: true };
    }
  }, [lossPct]);

  const lossError = lossTouched && lossInvalid ? LOSS_ERROR_TEXT : null;

  const multiplier = useMemo(() => {
    if (hasMultiplierField && Number.isFinite(measures.multiplier ?? NaN)) {
      return measures.multiplier as number;
    }
    if (lossInvalid) return 1;
    return Math.max(0, 1 + (lossValue ?? 0) / 100);
  }, [hasMultiplierField, lossInvalid, lossValue, measures.multiplier]);

  const requiredKeys = useMemo(() => {
    return coreFields
      .filter((f) => (f.usedInNorms || f.required) && f.editable !== false)
      .map((f) => f.key);
  }, [coreFields]);

  const canCalculate = useMemo(() => {
    if (!workType?.code) return false;
    if (fLoading || calculating) return false;
    if (!fields.length) return false;

    for (const k of requiredKeys) {
      const raw = (inputs as InputMap)[k];
      if (typeof raw !== "string" || raw.trim() === "") return false;
    }

    if (!hasMultiplierField && !hasWastePctField) {
      if (!lossPct.trim()) return false;
      if (lossInvalid) return false;
    }

    return true;
  }, [
    workType?.code,
    fLoading,
    calculating,
    fields.length,
    requiredKeys,
    inputs,
    hasMultiplierField,
    hasWastePctField,
    lossPct,
    lossInvalid,
  ]);

  const runParse = useCallback(
    (keys: BasisKey[], showErrors = false) => {
      const nextInputs: Inputs = { ...inputs };
      const nextMeasures: Measures = { ...measures };
      const nextErrors: FieldErrors = { ...errors };
      let allValid = true;

      keys.forEach((key) => {
        const field = fieldMap.get(key);
        if (!field) return;

        const rawOriginal = inputs[key] ?? "";
        const raw = rawOriginal.trim();
        let errorMessage: string | undefined;

        if (!raw) {
          delete nextMeasures[key];
          nextInputs[key] = "";
          allValid = false;
          errorMessage = "Заполните поле";
        } else {
          try {
            const numeric = evaluateExpression(rawOriginal);
            nextMeasures[key] = numeric;
            nextInputs[key] = formatNumber(numeric);
          } catch {
            delete nextMeasures[key];
            allValid = false;
            errorMessage = "Некорректное значение";
          }
        }

        if (showErrors) {
          if (errorMessage) nextErrors[key] = errorMessage;
          else delete nextErrors[key];
        } else {
          if (!errorMessage) delete nextErrors[key];
        }
      });

      applyAutoRules(nextMeasures, nextInputs);

      setInputs(nextInputs);
      setMeasures(nextMeasures);

      if (showErrors) setErrors(nextErrors);
      else {
        setErrors((prev) => {
          const updated: FieldErrors = { ...prev };
          keys.forEach((k) => {
            if (!nextErrors[k]) delete updated[k];
          });
          return updated;
        });
      }

      return { valid: allValid, measures: nextMeasures };
    },
    [inputs, measures, errors, fieldMap, applyAutoRules],
  );

  const handleInputChange = useCallback(
    (key: BasisKey, value: string) => {
      if (workType?.code === "ind_concrete" && key === "film_m2") setFilmTouched(true);

      if (key === "area_m2" || key === "perimeter_m") {
        setManualKeys((prev) => {
          const next = new Set(prev);
          const trimmed = String(value ?? "").trim();
          if (trimmed) next.add(String(key));
          else next.delete(String(key));
          return next;
        });
      }

      setInputs((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => {
        if (!prev[key]) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    [workType?.code],
  );

  const handleBlur = useCallback((key: BasisKey) => runParse([key], true), [runParse]);

  const handleLossChange = (value: string) => {
    setLossPct(value);
    setLossTouched(false);
  };

  const handleLossBlur = () => {
    setLossTouched(true);
    if (!lossInvalid && lossPct.trim()) setLossPct(formatNumber(lossValue));
  };

  const incRow = (rowKey: string, delta: number) => {
    setRows((prev) => {
      if (!prev) return prev;
      return prev.map((r) => {
        const rk = `${r.section}:${r.rik_code}`;
        if (rk !== rowKey) return r;
        const nextQty = Math.max(0, Number(r.qty ?? 0) + delta);
        return { ...r, qty: nextQty };
      });
    });
  };

  const setRowQty = (rowKey: string, raw: string) => {
    const normalized = raw.replace(",", ".").trim();
    const value = Number(normalized);
    if (!Number.isFinite(value)) return;

    setRows((prev) => {
      if (!prev) return prev;
      return prev.map((r) => {
        const rk = `${r.section}:${r.rik_code}`;
        if (rk !== rowKey) return r;
        return { ...r, qty: value };
      });
    });
  };

  const removeRow = (rowKey: string) => {
    setRows((prev) => {
      if (!prev) return prev;
      return prev.filter((r) => rowKeyOf(r) !== rowKey);
    });
  };

  const calc = async () => {
    if (!workType?.code) return;

    if (!fields.length) {
      Alert.alert("Нет полей", "Для этого вида работ не настроены поля ввода.");
      return;
    }

    if (!canCalculate) {
      runParse(requiredKeys, true);
      setLossTouched(true);
      return;
    }

    const parseKeys = fields
      .filter((f) => {
        if (f.editable === false) return false;
        if ((f.uiPriority ?? "core") === "core") return true;
        if (((f.uiPriority ?? "core") === "secondary" || (f.uiPriority ?? "core") === "engineering") && showSecondaryFields) return true;
        const raw = (inputs as InputMap)[f.key];
        return typeof raw === "string" && raw.trim() !== "";
      })
      .map((f) => f.key);

    const parseResult = runParse(parseKeys, true);

    setLossTouched(true);
    if (lossInvalid) return;
    if (!parseResult.valid) return;

    if (lossPct.trim() && !lossInvalid) setLossPct(formatNumber(lossValue));

    try {
      Keyboard.dismiss();
      setCalculating(true);
      setRows(null);

      const parsedMeasures = parseResult.measures;
      const payload: Record<string, number> = {};

      for (const f of fields) {
        const v = (parsedMeasures as MeasureMap)[f.key];
        if (typeof v === "number" && Number.isFinite(v)) payload[f.key] = v;
      }

      if (
        typeof (parsedMeasures as MeasureMap).multiplier === "number" &&
        Number.isFinite((parsedMeasures as MeasureMap).multiplier)
      ) {
        payload.multiplier = (parsedMeasures as MeasureMap).multiplier;
      } else {
        const lossFromField = (parsedMeasures as MeasureMap).loss ?? (parsedMeasures as MeasureMap).waste_pct;
        if (typeof lossFromField === "number" && Number.isFinite(lossFromField)) payload.loss = lossFromField;
        else payload.loss = Number.isFinite(lossValue) ? lossValue : 0;
      }

      const { data, error } = await supabase.rpc("rpc_calc_work_kit", {
        p_work_type_code: workType.code,
        p_inputs: payload,
      });

      if (error) {
        console.error("[CalcModal][rpc_calc_work_kit]", { payload, error });
        throw error;
      }

      setRows(Array.isArray(data) ? data.map((row) => normalizeCalcRow(row as CalcRpcRow)) : []);
    } catch (e: unknown) {
      console.error("[CalcModal]", e);
      Alert.alert("Ошибка", "Не удалось выполнить расчет. Проверьте параметры и попробуйте еще раз.");
      setRows(null);
    } finally {
      setCalculating(false);
    }
  };

  const renderField = (field: Field) => {
    const value = inputs[field.key] ?? "";
    const errorText = errors[field.key];
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
            keyboardType="numeric"
            placeholder={field.hint ?? ""}
            placeholderTextColor="#94A3B8"
            value={value}
            onChangeText={(t) => handleInputChange(field.key, t)}
            onBlur={() => handleBlur(field.key)}
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
              if (rows) setFieldsCollapsed(false);
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
            <Text style={{ fontSize: 16, color: "#0F172A", fontWeight: "600" }}>
              {value || "—"}
            </Text>
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

  const renderResultRow = useCallback(
    ({ item }: { item: Row }) => {
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
                  value={String(qtyIssue(Number(item.qty ?? 0))).replace(".", ",")}
                  onChangeText={(text) => setRowQty(rowKey, text)}
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
                <Text style={{ fontSize: 14, fontWeight: "800", color: "#374151" }}>
                  {item.uom_code}
                </Text>
              </View>

              {Number.isFinite(item.suggested_qty as number) ? (
                <Text style={{ color: "#374151", marginTop: 4 }}>
                  К выдаче:{" "}
                  <Text style={{ fontWeight: "900" }}>
                    {qtyIssue(Number(item.suggested_qty ?? 0))}
                  </Text>{" "}
                  {item.uom_code}
                </Text>
              ) : null}
            </View>

            <Pressable
              onPress={() => incRow(rowKey, -1)}
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
              onPress={() => incRow(rowKey, +1)}
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
              onPress={() => removeRow(rowKey)}
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
              <Text style={{ color: "#fff", fontSize: 22, fontWeight: "900", lineHeight: 22 }}>
                ×
              </Text>
            </Pressable>
          </View>
        </View>
      );
    },
    [incRow, removeRow, setRowQty],
  );

  const keyExtractor = useCallback((item: Row) => rowKeyOf(item), []);

  const canSend = !!rows && rows.length > 0 && !addingToRequest && !calculating;

  // вњ… высота нижней панели (для paddingBottom контента)
  const BOTTOM_BAR_H = 72;

  // вњ… keyboard overlap СЃРЅРёР·Сѓ (без safe-area)
  const kbEffective = Math.max(0, keyboardH - insets.bottom);

  // вњ… РЅРёР¶РЅРёР№ паддинг footer (safe area)
  const footerPadBottom = insets.bottom + 12;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
        <View style={{ flex: 1, backgroundColor: "#fff" }}>
          {/* HEADER */}
          <View
            style={{
              paddingTop: insets.top + 8,
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
            {onBack ? (
              <Pressable
                onPress={() => {
                  Keyboard.dismiss();
                  onBack();
                }}
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

            {/* Header */}
            <View style={{ flex: 1, minWidth: 0, alignItems: "center" }}>
              <Text style={{ fontSize: 16, fontWeight: "900", color: "#0F172A" }} numberOfLines={1}>
                Смета
              </Text>
              {/* Если хочешь убрать "Смета" вообще: замени весь этот View РЅР° <View style={{ flex: 1 }} /> */}
            </View>

            <IconSquareButton
              onPress={() => {
                Keyboard.dismiss();
                onClose();
              }}
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
{/* Toast hint (2s) */}
<Animated.View
  pointerEvents="none"
  style={{
    position: "absolute",
    left: 12,
    right: 12,
    top: insets.top + 62,
    opacity: toastA,
    transform: [{ translateY: toastY }],
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
    <Text style={{ color: "#fff", fontWeight: "800" }}>
      Заполните поля - расчет автоматически
    </Text>
  </View>
</Animated.View>


          {/* BODY: контент (KAV) + footer (РІРЅРµ KAV, всегда РІРЅРёР·Сѓ) */}
          <View style={{ flex: 1 }}>
            {/* вњ… KAV только для контента */}
            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 56 : 0}
            >
              <ScrollView
                ref={(r) => { scrollRef.current = r; }}
                style={{ flex: 1 }}
                stickyHeaderIndices={[0]}
                contentContainerStyle={{
                  padding: 16,
                  paddingBottom: 16 + BOTTOM_BAR_H + footerPadBottom + kbEffective + 16,
                }}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
              >
                {/* вњ… STICKY HEADER (workType + hint) */}
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
                      {workType?.name ?? workType?.code ?? "Вид работ"}
                    </Text>
                  </View>
                </View>

                {/* ====== FIELDS (collapsible) ====== */}
                {!fieldsCollapsed ? (
                  <>
                    {fLoading ? (
                      <View style={{ paddingVertical: 24, alignItems: "center" }}>
                        <ActivityIndicator />
                      </View>
                    ) : fields.length === 0 ? (
                      <Text style={{ color: "#6b7280" }}>
                        {fieldsError ?? "Для этого вида работ нет активных норм."}
                      </Text>
                    ) : (
                      <>
                        {coreFields.map((field) => renderField(field))}

                        {additionalFields.length > 0 ? (
                          <View style={{ marginBottom: 12 }}>
                            <Pressable
                              onPress={() => setShowSecondaryFields((prev) => !prev)}
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
                                Дополнительные параметры {showSecondaryFields ? "▴" : "▾"}
                              </Text>
                            </Pressable>
                          </View>
                        ) : null}

                        {showSecondaryFields ? additionalFields.map((field) => renderField(field)) : null}

                        {derivedFields.length > 0 ? (
                          <View style={{ marginBottom: 8 }}>
                            <Text style={{ fontWeight: "700", marginBottom: 6, color: "#0F172A" }}>
                              Расчётные значения
                            </Text>
                            {derivedFields.map((field) => renderField(field))}
                          </View>
                        ) : null}

                        {!hasMultiplierField && !hasWastePctField && (
                          <View style={{ marginTop: 4 }}>
                            <Text style={{ fontWeight: "700", marginBottom: 6, color: "#0F172A" }}>
                              Запас/потери, %
                            </Text>
                            <TextInput
                              keyboardType="numeric"
                              placeholder="Обычно 5-10%"
                              placeholderTextColor="#94A3B8"
                              value={lossPct}
                              onChangeText={handleLossChange}
                              onBlur={handleLossBlur}
                              style={{
                                borderWidth: 1,
                                borderColor: lossError ? "#ef4444" : "#e5e7eb",
                                borderRadius: 12,
                                paddingHorizontal: 12,
                                paddingVertical: Platform.OS === "web" ? 10 : 12,
                                fontSize: 16,
                                backgroundColor: "#fff",
                              }}
                            />
                            {lossError ? (
                              <Text style={{ color: "#ef4444", marginTop: 6 }}>{lossError}</Text>
                            ) : (
                              <Text style={{ color: "#6b7280", marginTop: 6 }}>
                                Итоговый множитель: {multiplier.toFixed(2)}
                              </Text>
                            )}
                          </View>
                        )}
                      </>
                    )}
                  </>
                ) : null}

                {/* ===== RESULT ===== */}
                {rows ? (
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
                        onPress={() => {
                          Keyboard.dismiss();
                          setFieldsCollapsed((v) => !v);
                          if (fieldsCollapsed) {
                            requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: true }));
                          }
                        }}
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
                          {fieldsCollapsed ? "Поля ▾" : "Поля ▴"}
                        </Text>
                      </Pressable>
                    </View>

                    {rows.length > 0 ? (
                      <View style={{ borderRadius: 16, backgroundColor: "#fff" }}>
                        <FlashList
                          data={rows}
                          renderItem={renderResultRow}
                          keyExtractor={keyExtractor}
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

            {/* вњ… FOOTER Р’РќР• KAV: РЅРёРєРѕРіРґР° РЅРµ уезжает РІ середину */}
            <View
              style={{
                paddingHorizontal: 16,
                paddingTop: 10,
                paddingBottom: footerPadBottom,
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
                  onPress={() => {
                    Keyboard.dismiss();
                    onClose();
                  }}
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
                  onPress={calc}
                  disabled={!canCalculate}
                  style={{
                    flex: 1,
                    height: 52,
                    borderRadius: 16,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#1B7F55",
                    opacity: canCalculate ? 1 : 0.45,
                    borderWidth: 1,
                    borderColor: "rgba(0,0,0,0.08)",
                  }}
                >
                  {calculating ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={{ color: "#fff", fontWeight: "900", fontSize: 16 }}>Рассчитать</Text>
                  )}
                </Pressable>

                {canSend ? (
                  <>
                    <View style={{ width: 10 }} />
                    <SendPrimaryButton
                      variant="green"
                      disabled={!canSend}
                      loading={addingToRequest}
                      onPress={async () => {
                        if (!rows) return;
                        try {
                          setAddingToRequest(true);
                          await Promise.resolve(onAddToRequest?.(rows));
                        } finally {
                          setAddingToRequest(false);
                        }
                      }}
                      accessibilityLabel="Отправить"
                    />
                  </>
                ) : null}
              </View>
            </View>

            {calculating && (
              <View
                style={{
                  position: "absolute",
                  left: 16,
                  right: 16,
                  top: 16,
                  bottom: BOTTOM_BAR_H + footerPadBottom + 16,
                  backgroundColor: "rgba(255,255,255,0.60)",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 16,
                }}
              >
                <ActivityIndicator size="large" />
                <Text style={{ marginTop: 10, fontWeight: "900", color: "#111827" }}>Идет расчет...</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}





