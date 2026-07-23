import { readFileSync } from "node:fs";
import path from "node:path";
import { compileMultiDomainReferencePassportV4 } from "../../src/lib/estimate/v4/multiDomainReferencePassportsV4";
import { MULTI_DOMAIN_ATOMIC_MATERIAL_RESOURCES_V4 } from "../../src/lib/estimate/v4/multiDomainMaterialResourceDefinitionsV4";
import {
  MULTI_DOMAIN_INDEPENDENT_DEPTH_EXPECTATIONS_V4,
  MULTI_DOMAIN_INDEPENDENT_GOLDENS_V4,
  MULTI_DOMAIN_INDEPENDENT_MATERIAL_EXPECTATIONS_V4,
} from "../fixtures/multiDomainReferenceGoldensV4";

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

  test.each(MULTI_DOMAIN_INDEPENDENT_DEPTH_EXPECTATIONS_V4)(
    "%s validates the expanded professional composition",
    (fixtureId, expected) => {
      const fixture = MULTI_DOMAIN_INDEPENDENT_GOLDENS_V4.find((item) => item.fixtureId === fixtureId)!;
      const result = compileMultiDomainReferencePassportV4(fixture.catalogWorkId, fixture.inputs);
      const prefix = fixture.catalogWorkId;
      const formulaIds = [
        `${prefix}_preparation_quantity`,
        `${prefix}_transport_mass`,
        `${prefix}_labor_hours`,
        `${prefix}_equipment_hours`,
        `${prefix}_transport_work`,
        `${prefix}_transport_trips`,
        `${prefix}_service_quantity`,
        `${prefix}_document_count`,
      ];
      formulaIds.forEach((formulaId, index) => {
        expect(result.formulaValues[formulaId]).toBeCloseTo(expected[index], 6);
      });
      const categories = new Set(result.boq.map((row) => row.category));
      expect(["preparation", "materials", "labor", "equipment", "quality_control", "documentation"]
        .every((category) => categories.has(category as never))).toBe(true);
      expect(result.boq.every((row) => Number.isFinite(row.quantity) && row.quantity > 0)).toBe(true);
    });

  test("promotes all 60 scenarios without production-generated expectations", () => {
    const depthFixtureIds = new Set(MULTI_DOMAIN_INDEPENDENT_DEPTH_EXPECTATIONS_V4.map(([fixtureId]) => fixtureId));
    const invalidFixtureIds = MULTI_DOMAIN_INDEPENDENT_GOLDENS_V4
      .filter((fixture) => fixture.scenario === "invalid" && fixture.expectedError)
      .map((fixture) => fixture.fixtureId);
    expect(depthFixtureIds.size).toBe(48);
    expect(invalidFixtureIds).toHaveLength(12);
    expect(depthFixtureIds.size + invalidFixtureIds.length).toBe(60);
  });

  test.each(MULTI_DOMAIN_INDEPENDENT_MATERIAL_EXPECTATIONS_V4)(
    "%s validates atomic net, waste, package and purchase quantities",
    (fixtureId, expectedNetQuantities) => {
      const fixture = MULTI_DOMAIN_INDEPENDENT_GOLDENS_V4.find((item) => item.fixtureId === fixtureId)!;
      const result = compileMultiDomainReferencePassportV4(fixture.catalogWorkId, fixture.inputs);
      const resources = MULTI_DOMAIN_ATOMIC_MATERIAL_RESOURCES_V4
        .filter((resource) => resource.passportId.endsWith(`:${fixture.catalogWorkId}`));
      expect(resources).toHaveLength(4);
      const packageSizeByUnit: Readonly<Record<string, number>> = {
        l: 10, pcs: 1, m2: 10, kg: 25, m: 50, m3: 1, t: 1,
      };
      resources.forEach((resource, index) => {
        const prefix = resource.materialResourceId.replace(":", "_");
        const net = expectedNetQuantities[index];
        const waste = Math.round(net * 0.05 * 1_000_000) / 1_000_000;
        const gross = Math.round((net + waste) * 1_000_000) / 1_000_000;
        const packageSize = packageSizeByUnit[resource.unit];
        const packageCount = Math.ceil(gross / packageSize);
        const purchase = packageCount * packageSize;
        expect(result.formulaValues[`${prefix}_net_quantity`]).toBeCloseTo(net, 6);
        expect(result.formulaValues[`${prefix}_waste_quantity`]).toBeCloseTo(waste, 6);
        expect(result.formulaValues[`${prefix}_gross_quantity`]).toBeCloseTo(gross, 6);
        expect(result.formulaValues[`${prefix}_package_count`]).toBe(packageCount);
        expect(result.formulaValues[`${prefix}_purchase_quantity`]).toBeCloseTo(purchase, 6);
        const row = result.boq.find((item) => item.formulaNodeId === `${prefix}_purchase_quantity`);
        expect(row?.quantity).toBeCloseTo(purchase, 6);
        expect(row?.category).toBe("materials");
        expect(row?.priceState).toBe("PRICE_REQUIRED");
      });
      expect(result.boq.some((row) => /_auxiliary_materials$/u.test(row.rowDefinitionId))).toBe(false);
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
