// app/(tabs)/accountant.tsx
import React from "react";

import { AccountantScreenView } from "./components/AccountantScreenView";
import { useAccountantScreenComposition } from "./useAccountantScreenComposition";

export function AccountantScreen() {
  const model = useAccountantScreenComposition();
  return <AccountantScreenView {...model} />;
}
