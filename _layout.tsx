// app/_layout.tsx  ← КОРНЕВОЙ ЛЭЙАУТ

import "./_webStyleGuard";        // web-guard включаем самым первым

import React from "react";
import { Slot } from "expo-router";

export default function RootLayout() {
  return <Slot />;
}
