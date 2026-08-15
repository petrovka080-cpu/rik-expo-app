import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  a1NegativeFixtures,
  evaluateA1NegativeFixture,
  identityFacts,
  obligationsForIdentity,
} from "../../scripts/estimate/waterBackendR3/waterIndependentOracleA1";

const ROOT = resolve(__dirname, "../..");

describe("Water R5 Addendum A1 independent oracle", () => {
  test("kills every false-match fixture", () => {
    const fixtures = a1NegativeFixtures();
    expect(fixtures).toHaveLength(10);
    expect(fixtures.filter(evaluateA1NegativeFixture)).toHaveLength(fixtures.length);
    expect(fixtures.filter((fixture) => !fixture.expected)).toHaveLength(8);
    expect(fixtures.filter((fixture) => fixture.expected)).toHaveLength(2);
  });

  test.each(["PREPARE", "SEAL"])("does not invent equipment commissioning in %s", (operation) => {
    const identity = {
      catalog_id: `plumbing_interior_boiler_${operation.toLowerCase()}_standard`,
      source_domain_id: "plumbing",
      title_ru: `${operation} boiler`,
    };
    expect(identityFacts(identity).operation).toBe(operation);
    expect(obligationsForIdentity(identity).some((item) => item.id === "individual-equipment-test")).toBe(false);
  });

  test.each(["CONNECT", "ROUTE"])("requires the structured standalone individual test in %s", (operation) => {
    const identity = {
      catalog_id: `plumbing_interior_meter_${operation.toLowerCase()}_standard`,
      source_domain_id: "plumbing",
      title_ru: `${operation} meter`,
    };
    const expected = obligationsForIdentity(identity).find((item) => item.id === "individual-equipment-test");
    expect(expected?.expectedSemanticSignature).toBe("water:equipment_individual_test:test_service + category=testing + unit=test");
    expect(expected?.matches({
      semantic_owner: "water:equipment_individual_test:test_service",
      category: "testing",
      unit_id: "test",
      title_ru: "Выполнение: Индивидуальное испытание агрегата",
    })).toBe(true);
    expect(expected?.matches({
      semantic_owner: "water:equipment_integrated_test:test_service",
      category: "testing",
      unit_id: "test",
      title_ru: "Выполнение: Комплексное испытание",
    })).toBe(false);
  });

  test("recognizes a typed test protocol without accepting lookalike owners", () => {
    const identity = {
      catalog_id: "plumbing_interior_ppr_pipe_connect_standard",
      source_domain_id: "plumbing",
      title_ru: "подключение PPR",
    };
    const expected = obligationsForIdentity(identity).find((item) => item.id === "documentation");
    expect(expected?.matches({
      semantic_owner: "water:connection_integrity_test:test_protocol",
      category: "protocol",
      unit_id: "set",
      title_ru: "Протокол: Проверка герметичности",
    })).toBe(true);
    expect(expected?.matches({
      semantic_owner: "water:connection_integrity_test:test_protocol_template",
      category: "protocol",
      unit_id: "set",
      title_ru: "Протокол: шаблон",
    })).toBe(false);
  });

  test("has no forbidden production-oracle import", () => {
    const source = readFileSync(resolve(ROOT, "scripts/estimate/waterBackendR3/waterIndependentOracleA1.ts"), "utf8");
    expect(source).not.toMatch(/buildWaterBackendDefinitions|waterDomainModel|waterR5ProfessionalModel|ResourceGraph|FormulaGraph/);
    expect(source.match(/^import\s/mg) ?? []).toHaveLength(0);
  });
});
