import {
  compileProductionExpandedEstimate10000,
  PRODUCTION_WORK_DEFINITIONS_10000,
} from "../../src/lib/ai/estimateTemplate10000";
import { classifyEstimateRowsReality } from "./classifyEstimateRowReality";

export const GREEN_AI_ESTIMATE_10000_NO_BLIND_QUANTITY_COPY_NO_BUILDS =
  "GREEN_AI_ESTIMATE_10000_NO_BLIND_QUANTITY_COPY_NO_BUILDS" as const;
export const STOP_AI_ESTIMATE_10000_BLIND_QUANTITY_COPY_FOUND =
  "STOP_AI_ESTIMATE_10000_BLIND_QUANTITY_COPY_FOUND" as const;

export function validateNoBlindQuantityCopy10000() {
  let rowCount = 0;
  let blindQuantityCopyCount = 0;
  const blockers: string[] = [];
  for (const definition of PRODUCTION_WORK_DEFINITIONS_10000) {
    const estimate = compileProductionExpandedEstimate10000({
      workKey: definition.workKey,
      quantity: 100,
      countryCode: "KG",
    });
    const reality = classifyEstimateRowsReality(estimate.rows);
    rowCount += reality.row_count;
    blindQuantityCopyCount += reality.blind_quantity_copy_count;
    if (reality.blind_quantity_copy_count > 0) {
      blockers.push(`${definition.workKey}:blind_quantity_copy:${reality.blind_quantity_copy_count}`);
    }
  }
  return {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_10000_NO_BLIND_QUANTITY_COPY_NO_BUILDS
      : STOP_AI_ESTIMATE_10000_BLIND_QUANTITY_COPY_FOUND,
    template_count: PRODUCTION_WORK_DEFINITIONS_10000.length,
    row_count: rowCount,
    blind_quantity_copy_count: blindQuantityCopyCount,
    no_blind_quantity_copy: blindQuantityCopyCount === 0,
    fake_green_claimed: false,
    blockers: blockers.slice(0, 50),
  };
}

function requireAllFlag(): void {
  if (!process.argv.includes("--all")) {
    throw new Error("VALIDATE_NO_BLIND_QUANTITY_COPY_10000_REQUIRES_--all");
  }
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/validateNoBlindQuantityCopy10000.ts")) {
  try {
    requireAllFlag();
    const result = validateNoBlindQuantityCopy10000();
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.final_status === GREEN_AI_ESTIMATE_10000_NO_BLIND_QUANTITY_COPY_NO_BUILDS ? 0 : 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
