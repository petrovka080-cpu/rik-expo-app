// app/(tabs)/supplierMap.tsx
// Базовый fallback для expo-router, чтобы он не ругался.
// На web будет использоваться supplierMap.web.tsx,
// на native — supplierMap.native.tsx. Этот файл практически нигде
// не будет использоваться, главное — он НЕ импортирует react-native-maps.

import React from "react";
import { View } from "react-native";

export default function SupplierMapFallback() {
  return <View />;
}
