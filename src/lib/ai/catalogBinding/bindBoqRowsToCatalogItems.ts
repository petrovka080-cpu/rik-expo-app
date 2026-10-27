import {
  bindEstimateRowsToCatalogItems,
  type EstimateCatalogSearchProvider,
} from "../globalEstimate/catalogBinding/bindEstimateRowsToCatalogItems";
import type { GlobalEstimateResult } from "../globalEstimate";

export async function bindBoqRowsToCatalogItems(input: {
  estimate: GlobalEstimateResult;
  searchProvider?: EstimateCatalogSearchProvider;
  maxCandidatesPerRow?: number;
}) {
  return bindEstimateRowsToCatalogItems(input);
}
