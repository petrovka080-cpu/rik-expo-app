
import { View, Text, Button } from "react-native";
import { Link } from "expo-router";

export default function Calculator() {
  return (
    <View style={{flex:1,alignItems:"center",justifyContent:"center", gap:12}}>
      <Text style={{fontSize:20}}>Калькулятор (заглушка)</Text>
      <Link href="/foreman">Назад к прорабу</Link>
    </View>
  );
}

