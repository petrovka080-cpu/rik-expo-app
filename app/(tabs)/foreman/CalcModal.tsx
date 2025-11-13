import React, { useEffect, useMemo, useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, ScrollView, Platform, ActivityIndicator, Alert } from 'react-native';
import { supabase } from '../../../src/lib/supabaseClient';
import { useCalcFields, BasisKey } from './useCalcFields';

type Props = {
  visible: boolean;
  onClose: () => void;
  workType?: { code: string; name: string } | null;
  onAddToRequest?: (rows: any[]) => void;
};

type Measures = Partial<Record<BasisKey, number>>;
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

export default function CalcModal({ visible, onClose, workType, onAddToRequest }: Props) {
  const { loading: fLoading, fields } = useCalcFields(workType?.code);
  const [measures, setMeasures] = useState<Measures>({});
  const [lossPct, setLossPct] = useState<string>('5');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [calculating, setCalculating] = useState(false);
  const multiplier = useMemo(() => {
    const v = Number(String(lossPct).replace(',', '.'));
    if (!Number.isFinite(v)) return 1;
    return Math.max(0, 1 + v / 100);
  }, [lossPct]);

  useEffect(() => {
    if (!visible) {
      setRows(null);
      setMeasures({});
      setLossPct('5');
    }
  }, [visible, workType?.code]);

  const setNum = (key: BasisKey, val: string) => {
    const n = Number(String(val).replace(',', '.'));
    setMeasures(prev => ({ ...prev, [key]: Number.isFinite(n) ? n : undefined }));
  };

  const calc = async () => {
    if (!workType?.code) return;
    try {
      const needKeys = fields.filter(f => f.required).map(f => f.key);
      const hasValue = needKeys.some(k => Number.isFinite(measures[k]!));
      if (!hasValue && needKeys.length) {
        Alert.alert('Заполните параметры', `Укажите: ${fields.map(f => f.label).join(', ')}`);
        return;
      }
      setCalculating(true);
      const args: any = {
        p_work_type_code: workType.code,
        p_area_m2: measures.area_m2 ?? null,
        p_perimeter_m: measures.perimeter_m ?? null,
        p_length_m: measures.length_m ?? null,
        p_points: measures.points ?? null,
        p_volume_m3: measures.volume_m3 ?? null,
        p_count: measures.count ?? null,
        p_multiplier: multiplier,
      };
      const { data, error } = await supabase.rpc('fn_calc_kit_basic', args);
      if (error) throw error;
      setRows(data as Row[]);
    } catch (e: any) {
      console.error('[CalcModal]', e?.message ?? e);
      Alert.alert('Ошибка', e?.message ?? 'Не удалось выполнить расчёт');
    } finally {
      setCalculating(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 16 }}>
        <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, maxHeight: '88%', width: '100%', maxWidth: 740, alignSelf: 'center' }}>
          <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 6 }}>
            {workType?.name ?? workType?.code ?? 'Вид работ'}
          </Text>
          <Text style={{ color: '#6b7280', marginBottom: 10 }}>
            Укажите только необходимые параметры  остальное рассчитается автоматически.
          </Text>

          <ScrollView style={{ maxHeight: 280 }}>
            {fLoading ? (
              <View style={{ paddingVertical: 24, alignItems: 'center' }}><ActivityIndicator/></View>
            ) : fields.length === 0 ? (
              <Text style={{ color: '#6b7280' }}>Для этого вида работ нет активных норм.</Text>
            ) : (
              <>
                {fields.map(f => {
                  const val = measures[f.key] ?? '';
                  return (
                    <View key={f.key} style={{ marginBottom: 10 }}>
                      <Text style={{ fontWeight: '600', marginBottom: 4 }}>
                        {f.label}{f.uom ? `, ${f.uom}` : ''}{f.required ? ' *' : ''}
                      </Text>
                      <TextInput
                        keyboardType="numeric"
                        placeholder={f.hint ?? ''}
                        value={String(val)}
                        onChangeText={(t) => setNum(f.key, t)}
                        style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: Platform.OS === 'web' ? 8 : 10 }}
                      />
                    </View>
                  );
                })}

                <View style={{ marginTop: 4 }}>
                  <Text style={{ fontWeight: '600', marginBottom: 4 }}>Запас/потери, %</Text>
                  <TextInput
                    keyboardType="numeric"
                    placeholder="Обычно 510%"
                    value={lossPct}
                    onChangeText={setLossPct}
                    style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: Platform.OS === 'web' ? 8 : 10 }}
                  />
                  <Text style={{ color: '#6b7280', marginTop: 4 }}>Итоговый множитель: {multiplier.toFixed(2)}</Text>
                </View>
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
                paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
                backgroundColor: calculating ? '#86efac' : '#22c55e', opacity: (calculating || fLoading) ? 0.6 : 1
              }}
            >
              <Text style={{ fontWeight: '700', color: '#fff' }}>{calculating ? 'Считаю' : 'Рассчитать'}</Text>
            </Pressable>
          </View>

          {!!rows && (
            <View style={{ marginTop: 14, borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 8 }}>Результат</Text>
              <ScrollView style={{ maxHeight: 260 }}>
                {rows.map(r => (
                  <View key={r.rik_code} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
                    <Text style={{ fontWeight: '600' }}>{r.rik_code} <Text style={{ color: '#6b7280' }}>({r.section})</Text></Text>
                    <Text style={{ color: '#111827' }}>
                      qty: {Number(r.qty).toFixed(3)} {r.uom_code}
                      {r.packs && r.pack_size ? `  |  упаковка: ${r.packs}  ${Number(r.pack_size).toFixed(3)} ${r.pack_uom ?? ''}` : ''}
                      {Number.isFinite(r.suggested_qty as any) ? `    к выдаче: ${Number(r.suggested_qty ?? 0).toFixed(3)} ${r.uom_code}` : ''}
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
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

