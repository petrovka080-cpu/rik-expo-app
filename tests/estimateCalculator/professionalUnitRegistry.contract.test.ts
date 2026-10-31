import { formatEstimateUnitLabel } from "../../src/lib/ai/globalEstimate";
import {
  convertProfessionalUnitQuantity,
  getProfessionalUnitDefinition,
  normalizeProfessionalPricedUnitForLocale,
  resolveProfessionalUnitDefinition,
} from "../../src/lib/estimate/professionalUnitRegistry";
import { normalizeCanonicalProfessionalBoqUnit } from "../../src/lib/estimate/canonicalUnits";
import { resolveEngineeringUnitV4 } from "../../src/lib/estimate/v4/engineeringUnitRegistryV4";

describe("shared professional unit registry", () => {
  it("preserves semantic count units through validation, V4, UI, and PDF labels", () => {
    for (const [unit, label] of [["circuit", "контур"], ["zone", "зона"]] as const) {
      expect(resolveProfessionalUnitDefinition(unit)).toMatchObject({
        code: unit,
        dimension: "count",
        canonicalSiUnit: "pcs",
        precision: 0,
        discrete: true,
      });
      expect(resolveEngineeringUnitV4(unit)).toMatchObject({
        unit_id: unit,
        dimension: "count",
        precision: 0,
      });
      expect(formatEstimateUnitLabel(unit)).toBe(label);
    }
  });

  it("localizes every backend time alias used by the 678-group canonical corpus", () => {
    expect(resolveProfessionalUnitDefinition("worker_h")).toMatchObject({
      code: "man_hour",
      dimension: "labor_time",
      displayRu: "чел.-ч",
    });
    expect(resolveProfessionalUnitDefinition("machine_h")).toMatchObject({
      code: "machine_hour",
      dimension: "machine_time",
      displayRu: "маш.-ч",
    });
    expect(formatEstimateUnitLabel("worker_h")).toBe("чел.-ч");
    expect(formatEstimateUnitLabel("machine_h")).toBe("маш.-ч");
    expect(formatEstimateUnitLabel("system")).toBe("система");
    expect(formatEstimateUnitLabel("vehicle_km")).toBe("авт.-км");
  });

  it("owns exact imperial factors and rejects cross-dimensional conversion", () => {
    expect(getProfessionalUnitDefinition("lbs")).toMatchObject({
      canonicalSiUnit: "kg",
      conversionFactorToSi: 0.45359237,
      dimension: "mass",
    });
    expect(getProfessionalUnitDefinition("sq_ft")).toMatchObject({
      canonicalSiUnit: "m2",
      conversionFactorToSi: 0.09290304,
      dimension: "area",
    });
    expect(normalizeProfessionalPricedUnitForLocale({
      quantity: 10,
      unitPrice: 2,
      unit: "lbs",
      jurisdiction: "KG",
      unitSystem: "metric",
      priorProvenance: {
        registryVersion: "professional-unit-registry:2026-07.v1",
        sourceUnit: "sq_ft",
        sourceQuantity: 10,
        sourceUnitPrice: 2,
        targetUnit: "m2",
        quantityFactor: 0.09290304,
        jurisdiction: "US",
        unitSystem: "imperial",
        converted: true,
      },
    })).toBeNull();
  });
});

  it("registers pair and energy aliases without inventing a consumption rate", () => {
    for (const alias of ["pairs", "пара"]) {
      expect(resolveProfessionalUnitDefinition(alias)).toMatchObject({ code: "pair", dimension: "paired_count", canonicalSiUnit: "pair", discrete: true });
      expect(normalizeCanonicalProfessionalBoqUnit(alias)).toBe("pair");
      expect(formatEstimateUnitLabel(alias)).toBe("пара");
    }
    for (const alias of ["kWh", "кВт·ч"]) {
      expect(resolveProfessionalUnitDefinition(alias)).toMatchObject({ code: "kwh", dimension: "energy", canonicalSiUnit: "J", conversionFactorToSi: 3_600_000 });
      expect(normalizeCanonicalProfessionalBoqUnit(alias)).toBe("kwh");
      expect(formatEstimateUnitLabel(alias)).toBe("кВт·ч");
    }
    expect(resolveEngineeringUnitV4("kWh")).toMatchObject({ dimension: "energy", conversion_factor_to_si: 3_600_000 });
  });

  it("does not convert pairs into pieces or sets, or energy into power", () => {
    for (const [from, to] of [["pair", "pcs"], ["pcs", "pair"], ["pair", "set"], ["set", "pair"], ["kwh", "kW"], ["kW", "kwh"]]) {
      expect(convertProfessionalUnitQuantity(2, from, to)).toBeNull();
    }
    expect(convertProfessionalUnitQuantity(2, "pairs", "пара")).toBe(2);
    expect(convertProfessionalUnitQuantity(2, "kWh", "кВт·ч")).toBe(2);
    expect(convertProfessionalUnitQuantity(2, "kW", "W")).toBe(2000);
  });

  it("preserves authored pair and energy quantities and prices in every locale route", () => {
    for (const unit of ["pair", "kwh"]) {
      for (const unitSystem of ["metric", "imperial", "mixed"] as const) {
        expect(normalizeProfessionalPricedUnitForLocale({ quantity: 3, unitPrice: 17, unit, jurisdiction: "KG", unitSystem })).toMatchObject({
          quantity: 3, unitPrice: 17, unit, total: 51,
          provenance: { sourceUnit: unit, targetUnit: unit, quantityFactor: 1, converted: false },
        });
      }
    }
  });


it('synchronizes the existing canonical backend item count with pcs without collapsing semantic count bases',()=>{
  const definition=resolveProfessionalUnitDefinition('item');
  expect(definition).toBe(resolveProfessionalUnitDefinition('pcs'));
  expect(definition).toMatchObject({code:'pcs',dimension:'count',canonicalSiUnit:'pcs',conversionFactorToSi:1,discrete:true});
  expect(normalizeCanonicalProfessionalBoqUnit('item')).toBe('pcs');expect(formatEstimateUnitLabel('item')).toBe('шт.');
  expect(definition?.code).not.toBe(resolveProfessionalUnitDefinition('set')?.code);
  expect(definition?.code).not.toBe(resolveProfessionalUnitDefinition('pair')?.code);
  for(const unknown of ['unknown_item','item_pack','item_pair'])expect(resolveProfessionalUnitDefinition(unknown)).toBeNull();
});