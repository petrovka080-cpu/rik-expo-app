import type { GlobalUnitInput, GlobalWorkCategory } from "../globalEstimate/globalEstimateTypes";

export type BuiltInAi10000IntentKind = "estimate" | "product_search";

export type BuiltInAi10000Domain = {
  id: string;
  key: string;
  title: string;
  category: GlobalWorkCategory;
  backendWorkKey: string;
  promptAnchor: string;
  expectedRowsContain: string[];
  dangerousWork?: boolean;
  intentKind?: BuiltInAi10000IntentKind;
};

export type BuiltInAi10000Case = {
  id: string;
  domainId: string;
  domainKey: string;
  category: GlobalWorkCategory;
  workKey: string;
  titleRu: string;
  promptRu: string;
  volume: number;
  unit: GlobalUnitInput["normalizedUnit"];
  expectedTitleContains: string[];
  expectedRowsContain: string[];
  forbiddenRowsContain: string[];
  dangerousWork?: boolean;
  productSearchCompanion?: boolean;
};
