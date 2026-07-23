import { readFileSync } from "node:fs";
import path from "node:path";
import { compileMultiDomainReferencePassportV4 } from "../../src/lib/estimate/v4/multiDomainReferencePassportsV4";
import { MULTI_DOMAIN_INDEPENDENT_GOLDENS_V4 } from "../fixtures/multiDomainReferenceGoldensV4";

describe("60 independent multi-domain golden fixtures", () => {
  test("locks five independent scenarios for each of twelve passports", () => {
    expect(MULTI_DOMAIN_INDEPENDENT_GOLDENS_V4).toHaveLength(60);
    const byPassport = new Map<string, string[]>();
    for (const fixture of MULTI_DOMAIN_INDEPENDENT_GOLDENS_V4) {
      byPassport.set(fixture.catalogWorkId, [...(byPassport.get(fixture.catalogWorkId) ?? []), fixture.scenario]);
    }
    expect(byPassport.size).toBe(12);
    for (const scenarios of byPassport.values()) {
      expect(new Set(scenarios)).toEqual(new Set(["normal", "minimum", "large", "sensitivity", "invalid"]));
    }
  });

  test.each(MULTI_DOMAIN_INDEPENDENT_GOLDENS_V4)("$fixtureId", (fixture) => {
    if (fixture.expectedError) {
      expect(() => compileMultiDomainReferencePassportV4(fixture.catalogWorkId, fixture.inputs))
        .toThrow(fixture.expectedError);
      return;
    }
    const result = compileMultiDomainReferencePassportV4(fixture.catalogWorkId, fixture.inputs);
    for (const [formulaId, expected] of Object.entries(fixture.expected)) {
      expect(result.formulaValues[formulaId]).toBeCloseTo(expected, 6);
    }
    const rowIds = new Set(result.boq.map((row) => row.rowDefinitionId));
    expect(fixture.requiredRowIds.every((rowId) => rowIds.has(rowId))).toBe(true);
    expect(result.boq.some((row) => fixture.forbiddenRowNames.includes(row.professionalNameRu))).toBe(false);
  });

  test("fixture source cannot import or invoke the production compiler", () => {
    const source = readFileSync(path.resolve("tests/fixtures/multiDomainReferenceGoldensV4.ts"), "utf8");
    expect(source).not.toMatch(/multiDomainReferencePassportsV4|compileMultiDomain|formulaValues|production compiler\(/u);
    expect(source).not.toMatch(/from\s+["'][^"']*src\/lib\/estimate/u);
  });

  test("mutation guards bind coefficients, units, rows and semantic owners", () => {
    const source = readFileSync(path.resolve("src/lib/estimate/v4/multiDomainReferencePassportsV4.ts"), "utf8");
    expect(source).toContain("result *= formula.coefficient");
    expect(source).toContain("semanticOwner: professionalEstimatePassportId(owner)");
    expect(MULTI_DOMAIN_INDEPENDENT_GOLDENS_V4.every((fixture) =>
      fixture.expectedError || Object.keys(fixture.expected).length >= 3)).toBe(true);
    expect(MULTI_DOMAIN_INDEPENDENT_GOLDENS_V4.filter((fixture) => !fixture.expectedError)
      .every((fixture) => fixture.requiredRowIds.length > 0 && fixture.expectedUnit.length > 0)).toBe(true);
  });
});
