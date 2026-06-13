import fs from "node:fs";
import path from "node:path";

import { CONSTRUCTION_WORK_ONTOLOGY, WORK_ONTOLOGY_TARGET_CATEGORY_COUNTS } from "../../src/lib/ai/workOntology/constructionWorkOntologyCatalog";
import {
  parseWorkOntologyQuantityUnit,
  resolveConstructionWorkOntologyIntent,
} from "../../src/lib/ai/workOntology/constructionWorkOntologyMatcher";
import {
  REAL_WORK_ONTOLOGY_10000_CASES,
  WORK_ONTOLOGY_500_CONFUSION_PAIRS,
  WORK_ONTOLOGY_1000_RECIPE_BINDING_CASES,
} from "../../src/lib/ai/workOntology/realWorkOntologyDataset";
import type { WorkOntologyIntentResult } from "../../src/lib/ai/workOntology/constructionWorkOntologyTypes";
import {
  buildIosProtocolReadiness,
  explicitKeyHint,
  GENERIC_WORK_KEY_PATTERN,
  hasGenericFallback,
  hasInternalVisibleText,
  hasMojibakeVisibleText,
  INTERNAL_VISIBLE_PATTERN,
} from "../../scripts/e2e/workOntology10000.shared";

export {
  CONSTRUCTION_WORK_ONTOLOGY,
  WORK_ONTOLOGY_TARGET_CATEGORY_COUNTS,
  REAL_WORK_ONTOLOGY_10000_CASES,
  WORK_ONTOLOGY_500_CONFUSION_PAIRS,
  WORK_ONTOLOGY_1000_RECIPE_BINDING_CASES,
  buildIosProtocolReadiness,
  explicitKeyHint,
  hasGenericFallback,
  hasInternalVisibleText,
  hasMojibakeVisibleText,
  INTERNAL_VISIBLE_PATTERN,
  parseWorkOntologyQuantityUnit,
  resolveConstructionWorkOntologyIntent,
};

export function resolveWithKeyHint(userInput: string, workKey: string): WorkOntologyIntentResult {
  return resolveConstructionWorkOntologyIntent(`${userInput}, ${explicitKeyHint(workKey)}`);
}

export function sourceText(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

export function visiblePayload(result: WorkOntologyIntentResult): string {
  return [
    result.visible_work_name_ru,
    result.normalized_intent,
    result.ui_payload.visible_work_name_ru,
    result.pdf_payload.visible_work_name_ru,
  ].filter(Boolean).join(" ");
}

export function expectResolved(result: WorkOntologyIntentResult, expectedWorkKey: string): void {
  expect(result.ambiguity_status).toBe("RESOLVED");
  expect(result.selected_work_key).toBe(expectedWorkKey);
  expect(result.canonical_work_key).toBe(expectedWorkKey);
  expect(result.recipe_scope).toBeTruthy();
  expect(result.material_recipe_scope).toBeTruthy();
  expect(result.pricebook_scope).toBeTruthy();
  expect(hasGenericFallback(result)).toBe(false);
  expect(hasInternalVisibleText(result)).toBe(false);
  expect(hasMojibakeVisibleText(result)).toBe(false);
}

export function workKeyLooksGeneric(value: string | null): boolean {
  return Boolean(value && GENERIC_WORK_KEY_PATTERN.test(value));
}
