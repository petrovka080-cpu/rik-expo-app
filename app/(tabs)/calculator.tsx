import React from "react";
import { View, Text, ScrollView } from "react-native";
export default function CalculatorScreen() {
  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <View style={{ backgroundColor:"#fff", borderRadius:12, borderWidth:1, borderColor:"#E2E8F0", padding:16 }}>
        <Text style={{ fontSize:18, fontWeight:"700" }}>Калькулятор</Text>
        <Text style={{ opacity:0.8, marginTop:8 }}>Файл маршрута активен. Логика норм подставляется из calc-модулей.</Text>
      </View>
    </ScrollView>
  );
}

