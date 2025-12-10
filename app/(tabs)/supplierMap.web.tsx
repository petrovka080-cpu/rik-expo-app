// app/(tabs)/supplierMap.web.tsx
import React from "react";
import SupplierMapWeb from "../../src/components/SupplierMap.web";

export default function SupplierMapWebScreen() {
  // ВАЖНО: здесь НИКАКИХ импортов из "react-native-maps" и SupplierMap.native!
  return <SupplierMapWeb />;
}

