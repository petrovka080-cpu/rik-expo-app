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
} from 'react-native';
import { supabase } from '../../../src/lib/supabaseClient';
import { useCalcFields, BasisKey, Field } from './useCalcFields';

type Props = {
  visible: boolean;
  onClose: () => void;
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
};

type CalcRpcArgs = {
  p_work_type_code: string;
  p_area_m2: number;
  p_perimeter_m: number;
  p_length_m: number;
  p_points: number;
  p_volume_m3: number;
  p_count: number;
  p_multiplier: number;
};

const RPC_BASIS_MAP: Array<[BasisKey, keyof CalcRpcArgs]> = [
  ['area_m2', 'p_area_m2'],
  ['perimeter_m', 'p_perimeter_m'],
  ['length_m', 'p_length_m'],
  ['points', 'p_points'],
  ['volume_m3', 'p_volume_m3'],
  ['count', 'p_count'],
];

const formatNumber = (value: number) => {
  if (!Number.isFinite(value)) return '';
  const fixed = value.toFixed(6);
  return fixed.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
};

const sanitizeExpression = (raw: string) =>
  raw
    .replace(/,/g, '.')
    .replace(/[×хХxX]/g, '*')
    .replace(/:/g, '/')
    .trim();

const SAFE_EXPRESSION = /^[-+*/().0-9\s]+$/;

const evaluateExpression = (rawInput: string): number => {
  const sanitized = sanitizeExpression(rawInput);
  if (!sanitized) throw new Error('empty');
  if (!SAFE_EXPRESSION.test(sanitized)) throw new Error('invalid_char');
  // eslint-disable-next-line no-new-func
  const fn = Function(`"use strict"; return (${sanitized});`);
  const result = fn();
  if (typeof result !== 'number' || !Number.isFinite(result)) {
    throw new Error('not_finite');
  }
  return result;
};

const LOSS_ERROR_TEXT = 'Некорректное значение';

export default function CalcModal({ visible, onClose, workType, onAddToRequest }: Props) {
  const { loading: fLoading, fields, error: fieldsError } = useCalcFields(workType?.code);
  const [inputs, setInputs] = useState<Inputs>({});
  const [measures, setMeasures] = useState<Measures>({});
  const [errors, setErrors] = useState<FieldErrors>({});
  const [lossPct, setLossPct] = useState<string>('5');
  const [lossTouched, setLossTouched] = useState(false);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [calculating, setCalculating] = useState(false);

  const fieldMap = useMemo(() => {
    const map = new Map<BasisKey, Field>();
    fields.forEach((f) => map.set(f.key, f));
    return map;
  }, [fields]);

  const hasMultiplierField = useMemo(() => fields.some((f) => f.key === 'multiplier'), [fields]);

  useEffect(() => {
    if (!visible) {
      setRows(null);
      setMeasures({});
      setInputs({});
      setErrors({});
      setLossPct('5');
      setLossTouched(false);
      return;
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    setRows(null);
    setMeasures({});
    setInputs({});
    setErrors({});
    setLossPct('5');
    setLossTouched(false);
  }, [workType?.code, visible]);

  useEffect(() => {
    if (!visible) return;
    setInputs((prev) => {
      const next: Inputs = {};
      fields.forEach((field) => {
        if (prev[field.key] !== undefined) {
          next[field.key] = prev[field.key];
        } else if (field.defaultValue != null) {
          next[field.key] = formatNumber(field.defaultValue);
        } else {
          next[field.key] = '';
        }
      });
      return next;
    });
    setMeasures((prev) => {
      const next: Measures = {};
      fields.forEach((field) => {
        if (prev[field.key] != null) {
          next[field.key] = prev[field.key];
        } else if (field.defaultValue != null) {
          next[field.key] = field.defaultValue;
        }
      });
      return next;
    });
    setErrors((prev) => {
      const next: FieldErrors = { ...prev };
      Object.keys(next).forEach((key) => {
        if (!fieldMap.has(key)) {
          delete next[key];
        }
      });
      return next;
    });
  }, [fields, fieldMap, visible]);

  const { lossValue, lossInvalid } = useMemo(() => {
    const trimmed = lossPct.trim();
    if (!trimmed) return { lossValue: 0, lossInvalid: false };
    try {
      const value = evaluateExpression(trimmed);
      return { lossValue: value, lossInvalid: false };
    } catch (err) {
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
          if (field.required) {
            allValid = false;
            errorMessage = 'Заполните поле';
          }
        } else {
          try {
            const numeric = evaluateExpression(rawOriginal);
            nextMeasures[key] = numeric;
            nextInputs[key] = formatNumber(numeric);
          } catch (err) {
            delete nextMeasures[key];
            allValid = false;
            errorMessage = 'Некорректное значение';
          }
        }

        if (showErrors) {
          if (errorMessage) {
            nextErrors[key] = errorMessage;
          } else {
            delete nextErrors[key];
          }
        } else if (!errorMessage) {
          delete nextErrors[key];
        }
      });

      setInputs(nextInputs);
      setMeasures(nextMeasures);
      if (showErrors) {
        setErrors(nextErrors);
      } else {
        setErrors((prev) => {
          const updated: FieldErrors = { ...prev };
          keys.forEach((key) => {
            if (!nextErrors[key]) delete updated[key];
          });
          return updated;
        });
      }

      return { valid: allValid, measures: nextMeasures };
    },
    [inputs, measures, errors, fieldMap],
  );

  const handleInputChange = useCallback((key: BasisKey, value: string) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const handleBlur = useCallback((key: BasisKey) => {
    runParse([key], true);
  }, [runParse]);

  const handleLossChange = (value: string) => {
    setLossPct(value);
    setLossTouched(false);
  };

  const handleLossBlur = () => {
    setLossTouched(true);
    if (!lossInvalid && lossPct.trim()) {
      setLossPct(formatNumber(lossValue));
    }
  };

  const calc = async () => {
    if (!workType?.code) return;

    const parseResult = runParse(
      fields.map((f) => f.key),
      true,
    );

    setLossTouched(true);
    if (lossInvalid) {
      return;
    }

    if (!parseResult.valid) {
      return;
    }

    if (lossPct.trim() && !lossInvalid) {
      setLossPct(formatNumber(lossValue));
    }

    try {
      setCalculating(true);
      setRows(null);
      const parsedMeasures = parseResult.measures;
      const directMultiplier = parsedMeasures.multiplier;
      const effectiveMultiplier = Number.isFinite(directMultiplier)
        ? (directMultiplier as number)
        : Math.max(0, 1 + (lossValue ?? 0) / 100);

      const safeValue = (value: unknown, fallback: number) =>
        typeof value === 'number' && Number.isFinite(value) ? (value as number) : fallback;

      const baseArgs: CalcRpcArgs = {
        p_work_type_code: workType.code,
        p_area_m2: 0,
        p_perimeter_m: 0,
        p_length_m: 0,
        p_points: 0,
        p_volume_m3: 0,
        p_count: 1,
        p_multiplier: effectiveMultiplier || 1,
      };

      RPC_BASIS_MAP.forEach(([basisKey, argKey]) => {
        baseArgs[argKey] = safeValue(parsedMeasures[basisKey], baseArgs[argKey]);
      });

      const args = baseArgs;

      const { data, error } = await supabase.rpc('rpc_calc_kit_basic', args);
      if (error) {
        console.error('[CalcModal][rpc_calc_kit_basic]', { args, error });
        throw error;
      }
      setRows(Array.isArray(data) ? (data as Row[]) : []);
    } catch (e: any) {
      console.error('[CalcModal]', e);
      Alert.alert(
        'Ошибка',
        'Не удалось выполнить расчёт. Проверьте параметры и попробуйте ещё раз.',
      );
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
        <Text style={{ fontWeight: '600', marginBottom: 4 }}>
          {field.label}
          {field.uom ? `, ${field.uom}` : ''}
          {field.required ? ' *' : ''}
        </Text>
        <TextInput
          keyboardType="numeric"
          placeholder={field.hint ?? ''}
          value={value}
          onChangeText={(t) => handleInputChange(field.key, t)}
          onBlur={() => handleBlur(field.key)}
          style={{
            borderWidth: 1,
            borderColor: errorText ? '#ef4444' : '#e5e7eb',
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: Platform.OS === 'web' ? 8 : 10,
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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 16 }}>
        <View
          style={{
            backgroundColor: '#fff',
            borderRadius: 16,
            padding: 16,
            maxHeight: '88%',
            width: '100%',
            maxWidth: 740,
            alignSelf: 'center',
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 6 }}>
            {workType?.name ?? workType?.code ?? 'Вид работ'}
          </Text>
          <Text style={{ color: '#6b7280', marginBottom: 10 }}>
            Укажите только необходимые параметры — остальное рассчитается автоматически.
          </Text>

          <ScrollView style={{ maxHeight: 280 }}>
            {fLoading ? (
              <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                <ActivityIndicator />
              </View>
            ) : fields.length === 0 ? (
              <Text style={{ color: '#6b7280' }}>
                {fieldsError ?? 'Для этого вида работ нет активных норм.'}
              </Text>
            ) : (
              <>
                {fields.map((field) => renderField(field))}

                {!hasMultiplierField && (
                  <View style={{ marginTop: 4 }}>
                    <Text style={{ fontWeight: '600', marginBottom: 4 }}>Запас/потери, %</Text>
                    <TextInput
                      keyboardType="numeric"
                      placeholder="Обычно 5–10%"
                      value={lossPct}
                      onChangeText={handleLossChange}
                      onBlur={handleLossBlur}
                      style={{
                        borderWidth: 1,
                        borderColor: lossError ? '#ef4444' : '#e5e7eb',
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: Platform.OS === 'web' ? 8 : 10,
                      }}
                    />
                    {lossError ? (
                      <Text style={{ color: '#ef4444', marginTop: 4 }}>{lossError}</Text>
                    ) : (
                      <Text style={{ color: '#6b7280', marginTop: 4 }}>
                        Итоговый множитель: {multiplier.toFixed(2)}
                      </Text>
                    )}
                  </View>
                )}
              </>
            )}
          </ScrollView>

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <Pressable onPress={onClose} style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: '#f3f4f6' }}>
              <Text style={{ fontWeight: '600' }}>Отмена</Text>
            </Pressable>
            <Pressable
              onPress={calc}
              disabled={calculating || fLoading || !workType?.code}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 10,
                backgroundColor: calculating ? '#86efac' : '#22c55e',
                opacity: calculating || fLoading ? 0.6 : 1,
              }}
            >
              <Text style={{ fontWeight: '700', color: '#fff' }}>{calculating ? 'Считаю' : 'Рассчитать'}</Text>
            </Pressable>
          </View>

          {rows && (
            <View style={{ marginTop: 14, borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 8 }}>Результат</Text>
              {rows.length > 0 ? (
                <>
                  <ScrollView style={{ maxHeight: 260 }}>
                    {rows.map((r) => (
                      <View key={r.rik_code} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
                        <Text style={{ fontWeight: '600' }}>
                          {r.rik_code} <Text style={{ color: '#6b7280' }}>({r.section})</Text>
                        </Text>
                        <Text style={{ color: '#111827' }}>
                          qty: {Number(r.qty).toFixed(3)} {r.uom_code}
                          {r.packs && r.pack_size
                            ? `  |  упаковка: ${r.packs}  ${Number(r.pack_size).toFixed(3)} ${r.pack_uom ?? ''}`
                            : ''}
                          {Number.isFinite(r.suggested_qty as any)
                            ? `    к выдаче: ${Number(r.suggested_qty ?? 0).toFixed(3)} ${r.uom_code}`
                            : ''}
                        </Text>
                        {r.hint ? <Text style={{ color: '#6b7280' }}>{r.hint}</Text> : null}
                      </View>
                    ))}
                  </ScrollView>

                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, justifyContent: 'flex-end' }}>
                    <Pressable
                      onPress={() => onAddToRequest?.(rows)}
                      style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: '#2563eb' }}
                    >
                      <Text style={{ fontWeight: '700', color: '#fff' }}>Добавить в заявку</Text>
                    </Pressable>
                  </View>
                </>
              ) : (
                <Text style={{ color: '#6b7280' }}>
                  Для указанных параметров нормы не найдены.
                </Text>
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
