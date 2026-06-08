import { allPayloads } from "./structuredPipelineTestHelpers";
import { buildBoqLaborRows } from "../../src/lib/ai/professionalBoq/buildBoqLaborRows";

const CONTROL_ROW_PATTERNS = [
  /\u043a\u043e\u043d\u0442\u0440\u043e\u043b\u044c\s+\u043a\u0430\u0447\u0435\u0441\u0442\u0432\u0430/i,
  /РєРѕРЅС‚СЂРѕР»СЊ\s+РєР°С‡РµСЃС‚РІР°/i,
  /\bquality\s+control\b/i,
  /контроль\s+сметного\s+объ[её]ма/i,
  /резерв\s+профильных\s+материалов/i,
  /креп[её]ж\s+и\s+профильные\s+расходники/i,
] as const;

describe("structured estimate control rows policy", () => {
  it("keeps control rows out of paid line items", () => {
    for (const payload of allPayloads()) {
      const controlRows = payload.rows.filter((row) =>
        CONTROL_ROW_PATTERNS.some((pattern) => pattern.test(row.visibleName)),
      );
      expect(controlRows).toEqual([]);
    }
  });

  it("keeps generic quality-control template rows out of paid labor templates", () => {
    for (const workKey of ["asphalt_paving", "unknown_work_key"]) {
      const rows = buildBoqLaborRows(workKey);
      expect(rows.some((row) => row.code === "quality_control")).toBe(false);
      expect(rows.some((row) => CONTROL_ROW_PATTERNS.some((pattern) => pattern.test(row.nameRu)))).toBe(false);
    }
  });
});
