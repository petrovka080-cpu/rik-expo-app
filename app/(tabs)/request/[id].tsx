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
        <Text>Р—Р°РіСЂСѓР·РєР°вЂ¦</Text>
      </View>
    );
  }
  if (!item) {
    return <View style={{ padding:16 }}><Text>Р—Р°СЏРІРєР° РЅРµ РЅР°Р№РґРµРЅР°</Text></View>;
  }

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold' }}>Р—Р°СЏРІРєР° #{item.id}</Text>
      <Text>РћР±СЉРµРєС‚: {item.object ?? 'вЂ”'}</Text>
      <Text>Р РРљ: {item.rik_code ?? 'вЂ”'}</Text>
      <Text>РќР°РёРјРµРЅРѕРІР°РЅРёРµ: {item.name ?? 'вЂ”'}</Text>
      <Text>РљРѕР»РёС‡РµСЃС‚РІРѕ: {item.qty ?? 'вЂ”'} {item.uom ?? ''}</Text>
      <Text>РЎС‚Р°С‚СѓСЃ: {item.status ?? 'вЂ”'}</Text>
    </View>
  );
}



