import React from "react";
import { HeaderBackButton } from "@react-navigation/elements";
import { Stack, router } from "expo-router";

export const OFFICE_SAFE_BACK_ROUTE = "/office";

export function renderSafeOfficeBackButton(props: Record<string, unknown>) {
  return (
    <HeaderBackButton
      {...props}
      label="Офис"
      onPress={() => router.replace(OFFICE_SAFE_BACK_ROUTE)}
      testID="office-safe-back"
    />
  );
}

export default function OfficeStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: "#0F172A",
        headerTitleStyle: { fontWeight: "800" },
        headerBackTitle: "РћС„РёСЃ",
        headerShadowVisible: false,
        headerStyle: { backgroundColor: "#FFFFFF" },
        contentStyle: { backgroundColor: "#F8FAFC" },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="foreman"
        options={{
          title: "РџСЂРѕСЂР°Р±",
          headerLeft: renderSafeOfficeBackButton,
        }}
      />
      <Stack.Screen name="buyer" options={{ title: "РЎРЅР°Р±Р¶РµРЅРµС†" }} />
      <Stack.Screen name="director" options={{ title: "Р”РёСЂРµРєС‚РѕСЂ" }} />
      <Stack.Screen name="accountant" options={{ title: "Р‘СѓС…РіР°Р»С‚РµСЂ" }} />
      <Stack.Screen
        name="warehouse"
        options={{
          title: "РЎРєР»Р°Рґ",
          headerLeft: renderSafeOfficeBackButton,
        }}
      />
      <Stack.Screen name="contractor" options={{ title: "РџРѕРґСЂСЏРґС‡РёРє" }} />
      <Stack.Screen name="reports" options={{ title: "РћС‚С‡РµС‚С‹" }} />
      <Stack.Screen name="security" options={{ title: "Р‘РµР·РѕРїР°СЃРЅРѕСЃС‚СЊ" }} />
    </Stack>
  );
}
