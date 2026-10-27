// app/(tabs)/buyer.tsx
import React from "react";

import { BuyerScreenContent } from "./components/BuyerScreenContent";
import { useBuyerScreenController } from "./hooks/useBuyerScreenController";

export function BuyerScreen() {
  const contentProps = useBuyerScreenController();
  return <BuyerScreenContent {...contentProps} />;
}
