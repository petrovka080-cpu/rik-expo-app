// app/(tabs)/contractor.tsx
import React from "react";

import { supabase } from "../../lib/supabaseClient";
import { ContractorScreenContainer } from "./ContractorScreenContainer";

export function ContractorScreen() {
  return <ContractorScreenContainer supabaseClient={supabase} />;
}
