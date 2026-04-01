import React from "react";
import { Stack } from "expo-router";

export default function OfficeStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: "#0F172A",
        headerTitleStyle: { fontWeight: "800" },
        headerBackTitle: "Офис",
        headerShadowVisible: false,
        headerStyle: { backgroundColor: "#FFFFFF" },
        contentStyle: { backgroundColor: "#F8FAFC" },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="foreman" options={{ title: "Прораб" }} />
      <Stack.Screen name="buyer" options={{ title: "Снабженец" }} />
      <Stack.Screen name="director" options={{ title: "Директор" }} />
      <Stack.Screen name="accountant" options={{ title: "Бухгалтер" }} />
      <Stack.Screen name="warehouse" options={{ title: "Склад" }} />
      <Stack.Screen name="contractor" options={{ title: "Подрядчик" }} />
      <Stack.Screen name="reports" options={{ title: "Отчеты" }} />
      <Stack.Screen name="security" options={{ title: "Безопасность" }} />
    </Stack>
  );
}
