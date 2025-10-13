import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { supabase } from '../../../src/lib/supabaseClient';

export default function RequestDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('requests')
        .select('*')
        .eq('id', Number(id))
        .single();
      if (!error) setItem(data);
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <View style={{ flex:1, justifyContent:'center', alignItems:'center' }}>
        <ActivityIndicator size="large" />
        <Text>Загрузка…</Text>
      </View>
    );
  }
  if (!item) {
    return <View style={{ padding:16 }}><Text>Заявка не найдена</Text></View>;
  }

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold' }}>Заявка #{item.id}</Text>
      <Text>Объект: {item.object ?? '—'}</Text>
      <Text>РИК: {item.rik_code ?? '—'}</Text>
      <Text>Наименование: {item.name ?? '—'}</Text>
      <Text>Количество: {item.qty ?? '—'} {item.uom ?? ''}</Text>
      <Text>Статус: {item.status ?? '—'}</Text>
    </View>
  );
}



