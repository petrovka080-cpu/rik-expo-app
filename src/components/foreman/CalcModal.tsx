import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
} from 'react-native';
import { supabase } from '../../../src/lib/supabaseClient';
import { useCalcFields, BasisKey, Field } from './useCalcFields';

type Props = {
  visible: boolean;
  onClose: () => void;
  onBack?: () => void; // ✅ NEW: назад к выбору вида работ
  workType?: { code: string; name: string } | null;
  onAddToRequest?: (rows: any[]) => void;
};

type Measures = Partial<Record<BasisKey, number>>;
type Inputs = Partial<Record<BasisKey, string>>;
type FieldErrors = Partial<Record<BasisKey, string>>;

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
type WowScope = {
  work_type_code: string;
  scope_ru?: string | null;
  tools_ru?: string | null;
  safety_ru?: string | null;
};

type WowOption = {
  opt_code: string;
  title_ru: string;
  desc_ru: string | null;
  section: 'works' | 'materials' | 'services';
  rik_code: string;
  basis_key: string;
  coeff: number;
  is_default: boolean;
  sort_order: number;
  uom_code: string | null;
  item_name: string | null;
};

const isDemoWorkType = (code?: string | null) => {
  const c = String(code ?? '');
  return c.startsWith('WT-DEM-') || c === 'WT-DEMO';
};

const formatNumber = (value: number) => {
  if (!Number.isFinite(value)) return '';
  const fixed = value.toFixed(6);
  return fixed.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
};

const formatQtyByUom = (value: number, uom?: string | null) => {
  if (!Number.isFinite(value)) return '';
  const u = (uom ?? '').toLowerCase();
  if (u === 'шт' || u === 'компл' || u === 'комплект' || u === 'pcs') {
    return String(Math.round(value));
  }
  return formatNumber(value);
};
const qtyIssue = (value: number) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.ceil(n);
};

const sanitizeExpression = (raw: string) =>
  raw.replace(/,/g, '.').replace(/[×хХxX]/g, '*').replace(/:/g, '/').trim();

const SAFE_EXPRESSION = /^[-+*/().0-9\s]+$/;

const evaluateExpression = (rawInput: string): number => {
  const sanitized = sanitizeExpression(rawInput);
  if (!sanitized) throw new Error('empty');
  if (!SAFE_EXPRESSION.test(sanitized)) throw new Error('invalid_char');
  // eslint-disable-next-line no-new-func
  const fn = Function(`"use strict"; return (${sanitized});`);
  const result = fn();
  if (typeof result !== 'number' || !Number.isFinite(result)) throw new Error('not_finite');
  return result;
};

const LOSS_ERROR_TEXT = 'Некорректное значение';

const Hint = ({ text }: { text?: string | null }) => {
  if (!text) return null;
  return (
    <Text
      style={{
        marginLeft: 8,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 999,
        backgroundColor: '#f3f4f6',
        color: '#374151',
        fontWeight: '700',
      }}
      onPress={() => Alert.alert('Подсказка', String(text))}
    >
      ?
    </Text>
  );
};

export default function CalcModal({ visible, onClose, onBack, workType, onAddToRequest }: Props) {
  const { loading: fLoading, fields, error: fieldsError } = useCalcFields(workType?.code);

  const [inputs, setInputs] = useState<Inputs>({});
  const [measures, setMeasures] = useState<Measures>({});
  const [errors, setErrors] = useState<FieldErrors>({});
  const [lossPct, setLossPct] = useState<string>('');
  const [lossTouched, setLossTouched] = useState(false);
  const [filmTouched, setFilmTouched] = useState(false);
  const [manualKeys, setManualKeys] = useState<Set<string>>(new Set());
  const [rows, setRows] = useState<Row[] | null>(null);

  const [calculating, setCalculating] = useState(false);
  const [addingToRequest, setAddingToRequest] = useState(false);

  const fieldMap = useMemo(() => {
    const map = new Map<BasisKey, Field>();
    fields.forEach((f) => map.set(f.key, f));
    return map;
  }, [fields]);

  const hasMultiplierField = useMemo(
    () => fields.some((f) => f.key === 'multiplier' || f.key === 'loss'),
    [fields],
  );

  const hasWastePctField = useMemo(
    () => fields.some((f) => f.key === 'waste_pct' || f.key === 'loss'),
    [fields],
  );

   const applyAutoRules = useCallback(
  (nextMeasures: Measures, nextInputs: Inputs) => {
    // --- ind_concrete: film_m2 auto = area_m2 ---
    if (workType?.code === 'ind_concrete' && !filmTouched) {
      const a = (nextMeasures as any).area_m2;
      const f = (nextMeasures as any).film_m2;
      if (
        typeof a === 'number' &&
        Number.isFinite(a) &&
        !(typeof f === 'number' && Number.isFinite(f))
      ) {
        (nextMeasures as any).film_m2 = a;
        nextInputs.film_m2 = formatNumber(a);
      }
    }

    // --- derived: area_m2 (facade) ---
// приоритет: length_m * height_m, иначе perimeter_m * height_m
// + вычитаем площадь проёмов (area_wall_m2) если задана
if (!manualKeys.has('area_m2')) {
  const len = (nextMeasures as any).length_m;
  const p = (nextMeasures as any).perimeter_m;
  const h = (nextMeasures as any).height_m;

  // площадь проёмов (мы её переименовали через override)
  const openingsA = (nextMeasures as any).area_wall_m2;

  const hasLH =
    typeof len === 'number' && Number.isFinite(len) &&
    typeof h === 'number' && Number.isFinite(h);

  const hasPH =
    typeof p === 'number' && Number.isFinite(p) &&
    typeof h === 'number' && Number.isFinite(h);

  let a: number | null = null;
  if (hasLH) a = len * h;
  else if (hasPH) a = p * h;

  if (a != null) {
    if (typeof openingsA === 'number' && Number.isFinite(openingsA) && openingsA > 0) {
      a = Math.max(0, a - openingsA);
    }

    const curA = (nextMeasures as any).area_m2;
    if (!(typeof curA === 'number' && Number.isFinite(curA))) {
      const out = Number(a.toFixed(3));
      (nextMeasures as any).area_m2 = out;
      nextInputs.area_m2 = formatNumber(out);
    }
  }
}


    // --- derived: volume_m3 ---
    // автозаполняем только если user не правил volume_m3 руками
    if (!manualKeys.has('volume_m3')) {
      const area = (nextMeasures as any).area_m2;
      const thickness = (nextMeasures as any).height_m; // height_m = "толщина"
      const perim = (nextMeasures as any).perimeter_m;
      const width = (nextMeasures as any).length_m;

      const hasAreaThickness =
        typeof area === 'number' && Number.isFinite(area) &&
        typeof thickness === 'number' && Number.isFinite(thickness);

      const hasStripDims =
        typeof perim === 'number' && Number.isFinite(perim) &&
        typeof width === 'number' && Number.isFinite(width) &&
        typeof thickness === 'number' && Number.isFinite(thickness);

      let derived: number | null = null;
      if (hasStripDims) derived = perim * width * thickness;
      else if (hasAreaThickness) derived = area * thickness;

      if (derived != null) {
        const v = Number(derived.toFixed(3));
        const cur = (nextMeasures as any).volume_m3;

        if (!(typeof cur === 'number' && Number.isFinite(cur))) {
          (nextMeasures as any).volume_m3 = v;
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
    setLossPct('');
    setLossTouched(false);
    setFilmTouched(false);
    setManualKeys(new Set());      // ✅ вот сюда
    setCalculating(false);
    setAddingToRequest(false);
    return;
  }
}, [visible]);

 useEffect(() => {
  if (!visible) return;
  setRows(null);
  setMeasures({});
  setInputs({});
  setErrors({});
  setLossPct('');
  setLossTouched(false);
  setFilmTouched(false);
  setManualKeys(new Set());      // ✅ и сюда тоже
}, [workType?.code, visible]);


  useEffect(() => {
    if (!visible) return;

    const nextInputs: Inputs = {};
    const nextMeasures: Measures = {};

    fields.forEach((field) => {
      const k = field.key;
      if ((inputs as any)[k] !== undefined) nextInputs[k] = (inputs as any)[k];
      else nextInputs[k] = '';

      if ((measures as any)[k] != null) nextMeasures[k] = (measures as any)[k];
      else delete (nextMeasures as any)[k];
    });

    applyAutoRules(nextMeasures, nextInputs);

    setErrors((prev) => {
      const next: FieldErrors = { ...prev };
      Object.keys(next).forEach((key) => {
        if (!fieldMap.has(key as any)) delete (next as any)[key];
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
    return fields.filter((f) => f.usedInNorms || f.required).map((f) => f.key);
  }, [fields]);

  const canCalculate = useMemo(() => {
    if (!workType?.code) return false;
    if (fLoading || calculating) return false;
    if (!fields.length) return false;

    for (const k of requiredKeys) {
      const raw = (inputs as any)[k];
      if (typeof raw !== 'string' || raw.trim() === '') return false;
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

        const rawOriginal = inputs[key] ?? '';
        const raw = rawOriginal.trim();
        let errorMessage: string | undefined;

        if (!raw) {
          delete nextMeasures[key];
          nextInputs[key] = '';
          allValid = false;
          errorMessage = 'Заполните поле';
        } else {
          try {
            const numeric = evaluateExpression(rawOriginal);
            nextMeasures[key] = numeric;
            nextInputs[key] = formatNumber(numeric);
          } catch {
            delete nextMeasures[key];
            allValid = false;
            errorMessage = 'Некорректное значение';
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
    if (workType?.code === 'ind_concrete' && key === 'film_m2') setFilmTouched(true);

    // manual tracking for derived fields
    if (key === 'volume_m3' || key === 'area_m2' || key === 'perimeter_m') {
  setManualKeys((prev) => {
    const next = new Set(prev);
    const trimmed = String(value ?? '').trim();

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
    const normalized = raw.replace(',', '.').trim();
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
      return prev.filter((r) => `${r.section}:${r.rik_code}` !== rowKey);
    });
  };

  const calc = async () => {
    if (!workType?.code) return;

    if (!fields.length) {
      Alert.alert('Нет полей', 'Для этого вида работ не настроены поля ввода.');
      return;
    }

    if (!canCalculate) {
      runParse(requiredKeys, true);
      setLossTouched(true);
      return;
    }

    const parseResult = runParse(fields.map((f) => f.key), true);

    setLossTouched(true);
    if (lossInvalid) return;
    if (!parseResult.valid) return;

    if (lossPct.trim() && !lossInvalid) setLossPct(formatNumber(lossValue));

    try {
      Keyboard.dismiss();
      setCalculating(true);
      setRows(null);

      const parsedMeasures = parseResult.measures;
      const payload: Record<string, any> = {};

      for (const f of fields) {
        const v = (parsedMeasures as any)[f.key];
        if (typeof v === 'number' && Number.isFinite(v)) payload[f.key] = v;
      }

      if (
        typeof (parsedMeasures as any).multiplier === 'number' &&
        Number.isFinite((parsedMeasures as any).multiplier)
      ) {
        payload.multiplier = (parsedMeasures as any).multiplier;
      } else {
        const lossFromField = (parsedMeasures as any).loss ?? (parsedMeasures as any).waste_pct;
        if (typeof lossFromField === 'number' && Number.isFinite(lossFromField)) payload.loss = lossFromField;
        else payload.loss = Number.isFinite(lossValue) ? lossValue : 0;
      }

      const { data, error } = await supabase.rpc('rpc_calc_work_kit', {
        p_work_type_code: workType.code,
        p_inputs: payload,
      });

      if (error) {
        console.error('[CalcModal][rpc_calc_work_kit]', { payload, error });
        throw error;
      }

      setRows(Array.isArray(data) ? (data as Row[]) : []);
    } catch (e: any) {
      console.error('[CalcModal]', e);
      Alert.alert('Ошибка', 'Не удалось выполнить расчёт. Проверьте параметры и попробуйте ещё раз.');
      setRows(null);
    } finally {
      setCalculating(false);
    }
  };

  const renderField = (field: Field) => {
    const value = inputs[field.key] ?? '';
    const errorText = errors[field.key];

    return (
      <View key={field.key} style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
          <Text style={{ fontWeight: '600' }}>
            {field.label}
            {field.uom ? `, ${field.uom}` : ''}
            {field.required ? ' *' : ''}
          </Text>
          <Hint text={field.hint ?? ''} />
        </View>

        <TextInput
          keyboardType="numeric"
          placeholder={field.hint ?? ''}
          placeholderTextColor="#94A3B8"
          value={value}
          onChangeText={(t) => handleInputChange(field.key, t)}
          onBlur={() => handleBlur(field.key)}
          style={{
            borderWidth: 1,
            borderColor: errorText ? '#ef4444' : '#e5e7eb',
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: Platform.OS === 'web' ? 10 : 12,
            fontSize: 16,
          }}
        />

        {errorText ? (
          <Text style={{ color: '#ef4444', marginTop: 4 }}>{errorText}</Text>
        ) : field.hint ? (
          <Text style={{ color: '#6b7280', marginTop: 4 }}>{field.hint}</Text>
        ) : null}
      </View>
    );
  };

  return (
  <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        {/* HEADER */}
        <View
          style={{
            paddingTop: 12,
            paddingBottom: 10,
            paddingHorizontal: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#E2E8F0',
            backgroundColor: '#fff',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
          }}
        >
          {onBack ? (
            <Pressable
              onPress={() => {
                Keyboard.dismiss();
                onBack();
              }}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 12,
                backgroundColor: '#111827',
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '900' }}>← Назад</Text>
            </Pressable>
          ) : (
            <View style={{ width: 88 }} />
          )}

          <View style={{ flex: 1, minWidth: 0, alignItems: 'center' }}>
            <Text style={{ fontSize: 16, fontWeight: '900', color: '#0F172A' }} numberOfLines={1}>
              Смета
            </Text>
            <Text style={{ color: '#6b7280', fontSize: 12 }} numberOfLines={1}>
              {workType?.name ?? workType?.code ?? 'Вид работ'}
            </Text>
          </View>

          <Pressable
            onPress={() => {
              Keyboard.dismiss();
              onClose();
            }}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderRadius: 12,
              backgroundColor: '#f3f4f6',
            }}
          >
            <Text style={{ fontWeight: '800' }}>Закрыть</Text>
          </Pressable>
        </View>

        <View style={{ flex: 1, padding: 16 }}>
          <Text style={{ color: '#6b7280', marginBottom: 12 }}>
            Укажите только необходимые параметры — остальное рассчитается автоматически.
          </Text>

          {/* FIELDS */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 12 }}
            keyboardShouldPersistTaps="handled"
          >
            {fLoading ? (
              <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                <ActivityIndicator />
              </View>
            ) : fields.length === 0 ? (
              <Text style={{ color: '#6b7280' }}>{fieldsError ?? 'Для этого вида работ нет активных норм.'}</Text>
            ) : (
              <>
                {fields.map((field) => renderField(field))}

                {!hasMultiplierField && !hasWastePctField && (
                  <View style={{ marginTop: 4 }}>
                    <Text style={{ fontWeight: '700', marginBottom: 6 }}>Запас/потери, %</Text>
                    <TextInput
                      keyboardType="numeric"
                      placeholder="Обычно 5–10%"
                      placeholderTextColor="#94A3B8"
                      value={lossPct}
                      onChangeText={handleLossChange}
                      onBlur={handleLossBlur}
                      style={{
                        borderWidth: 1,
                        borderColor: lossError ? '#ef4444' : '#e5e7eb',
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: Platform.OS === 'web' ? 10 : 12,
                        fontSize: 16,
                      }}
                    />
                    {lossError ? (
                      <Text style={{ color: '#ef4444', marginTop: 6 }}>{lossError}</Text>
                    ) : (
                      <Text style={{ color: '#6b7280', marginTop: 6 }}>
                        Итоговый множитель: {multiplier.toFixed(2)}
                      </Text>
                    )}
                  </View>
                )}
              </>
            )}

            {/* RESULT */}
            {rows && (
              <View style={{ marginTop: 14, borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 12 }}>
                <Text style={{ fontSize: 18, fontWeight: '900', marginBottom: 10 }}>Результат</Text>

                {rows.length > 0 ? (
                  <>
                    <ScrollView style={{ maxHeight: 320 }} keyboardShouldPersistTaps="handled">
                      {rows.map((r) => {
                        const rowKey = `${r.section}:${r.rik_code}`;
                        return (
                          <View
                            key={rowKey}
                            style={{
                              paddingVertical: 10,
                              borderBottomWidth: 1,
                              borderBottomColor: '#f3f4f6',
                            }}
                          >
                            <Text style={{ fontWeight: '800', fontSize: 15 }}>
                              {r.item_name_ru ?? r.rik_code}
                              {r.section ? <Text style={{ color: '#6b7280' }}>{` (${r.section})`}</Text> : null}
                            </Text>

                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                              <View style={{ flex: 1 }}>
                                <Text style={{ color: '#6b7280', fontSize: 12 }}>Кол-во</Text>

                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                  <TextInput
                                    value={String(qtyIssue(Number(r.qty ?? 0))).replace('.', ',')}

                                    onChangeText={(t) => setRowQty(rowKey, t)}
                                    keyboardType="numeric"
                                    style={{
                                      fontSize: 18,
                                      fontWeight: '900',
                                      color: '#111827',
                                      paddingVertical: 4,
                                      paddingHorizontal: 8,
                                      borderWidth: 1,
                                      borderColor: '#e5e7eb',
                                      borderRadius: 10,
                                      minWidth: 90,
                                      textAlign: 'center',
                                    }}
                                  />
                                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#374151' }}>
                                    {r.uom_code}
                                  </Text>
                                </View>

                                {Number.isFinite(r.suggested_qty as any) ? (
  <Text style={{ color: '#374151', marginTop: 4 }}>
    К выдаче:{' '}
    <Text style={{ fontWeight: '900' }}>
      {qtyIssue(Number(r.suggested_qty ?? 0))}
    </Text>{' '}
    {r.uom_code}
  </Text>
) : null}

                              </View>

                              <Pressable
                                onPress={() => incRow(rowKey, -1)}
                                style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: '#f3f4f6' }}
                              >
                                <Text style={{ fontWeight: '900' }}>–</Text>
                              </Pressable>

                              <Pressable
                                onPress={() => incRow(rowKey, +1)}
                                style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: '#f3f4f6' }}
                              >
                                <Text style={{ fontWeight: '900' }}>+</Text>
                              </Pressable>

                              <Pressable
                                onPress={() => removeRow(rowKey)}
                                style={{ width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#DC2626' }}
                              >
                                <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900', lineHeight: 22 }}>✕</Text>
                              </Pressable>
                            </View>
                          </View>
                        );
                      })}
                    </ScrollView>

                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
                      <Pressable
                        onPress={async () => {
                          try {
                            setAddingToRequest(true);
                            await Promise.resolve(onAddToRequest?.(rows));
                          } finally {
                            setAddingToRequest(false);
                          }
                        }}
                        disabled={addingToRequest}
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 12,
                          borderRadius: 12,
                          backgroundColor: '#2563eb',
                          opacity: addingToRequest ? 0.6 : 1,
                          minWidth: 190,
                          alignItems: 'center',
                        }}
                      >
                        {addingToRequest ? <ActivityIndicator color="#fff" /> : <Text style={{ fontWeight: '900', color: '#fff' }}>Добавить в заявку</Text>}
                      </Pressable>
                    </View>
                  </>
                ) : (
                  <Text style={{ color: '#6b7280' }}>Для указанных параметров нормы не найдены.</Text>
                )}
              </View>
            )}
          </ScrollView>

          {/* FOOTER BUTTONS */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <Pressable
              onPress={() => {
                Keyboard.dismiss();
                onClose();
              }}
              style={{ flex: 1, paddingVertical: 12, borderRadius: 14, backgroundColor: '#f3f4f6', alignItems: 'center' }}
            >
              <Text style={{ fontWeight: '900' }}>Отмена</Text>
            </Pressable>

            <Pressable
              onPress={calc}
              disabled={!canCalculate}
              style={{ flex: 1, paddingVertical: 12, borderRadius: 14, backgroundColor: '#22c55e', opacity: canCalculate ? 1 : 0.45, alignItems: 'center' }}
            >
              <Text style={{ fontWeight: '900', color: '#fff' }}>
                {calculating ? 'Считаю' : 'Рассчитать'}
              </Text>
            </Pressable>
          </View>

          {calculating && (
            <View
              style={{
                position: 'absolute',
                left: 16,
                right: 16,
                top: 16,
                bottom: 16,
                backgroundColor: 'rgba(255,255,255,0.75)',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 16,
              }}
            >
              <ActivityIndicator size="large" />
              <Text style={{ marginTop: 10, fontWeight: '900', color: '#111827' }}>Идёт расчёт…</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  </Modal>
);

}
