import React from "react";
import { Platform } from "react-native";

// ВАЖНО:
// - на web импортнется ./SupplierMap.web
// - на телефоне импортнется ./SupplierMap.native
const Impl =
  Platform.OS === "web"
    ? // eslint-disable-next-line @typescript-eslint/no-var-requires
      require("./SupplierMap.web").default
    : // eslint-disable-next-line @typescript-eslint/no-var-requires
      require("./SupplierMap.native").default;

export default function SupplierMapImpl() {
  return <Impl />;
}
