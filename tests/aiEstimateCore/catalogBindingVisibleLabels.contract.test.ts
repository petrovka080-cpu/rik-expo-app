import {
  internalKeysVisible,
  KNOWN_EXACT_BOQ_WORK_KEYS,
  materialRows,
  payloadForKnownWorkKey,
  visibleValuesForPayload,
} from "./aiEstimateCoreReal10000HardeningTestHelpers";
import { buildStructuredEstimateCatalogBinding } from "../../src/lib/estimateStructuredPipeline";

describe("AI estimate core catalog visible label binding", () => {
  it("binds catalog searches to visible material labels without exposing internal keys", () => {
    for (const workKey of KNOWN_EXACT_BOQ_WORK_KEYS.slice(0, 12)) {
      const { payload } = payloadForKnownWorkKey(workKey);
      const binding = buildStructuredEstimateCatalogBinding(payload);
      expect(binding.rows.length).toBe(materialRows(payload).length);
      expect(binding.rows.length).toBeGreaterThan(0);
      for (const row of binding.rows) {
        expect(row.searchQuery).toBeTruthy();
        expect(row.buttonLabel.toLocaleLowerCase("ru-RU")).toContain(row.searchQuery.toLocaleLowerCase("ru-RU"));
        expect(row.searchQuery).not.toMatch(/\b[a-z][a-z0-9]+(?:_[a-z0-9]+)+\b/);
      }
      expect(internalKeysVisible(payload)).toEqual([]);
      expect(visibleValuesForPayload(payload).join("\n")).not.toMatch(/\uFFFD/);
    }
  });
});
