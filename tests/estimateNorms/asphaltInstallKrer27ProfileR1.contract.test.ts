import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { validateIndependentCompletenessMapReferences } from
  "../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1";
import {
  ASPHALT_INSTALL_KRER27_ACCEPTANCE_INPUT,
  ASPHALT_INSTALL_KRER27_CATALOG_ID,
  ASPHALT_INSTALL_KRER27_FORMULAS,
  ASPHALT_INSTALL_KRER27_INDEPENDENT_COMPLETENESS_MAP,
  ASPHALT_INSTALL_KRER27_PARAMETERS,
  ASPHALT_INSTALL_KRER27_RESOURCES,
  ASPHALT_INSTALL_KRER27_SHORT_INPUT,
  ASPHALT_INSTALL_KRER27_SOURCE_PACK_SHA256,
  ASPHALT_INSTALL_KRER27_RUNTIME_INPUT,
  compileAsphaltInstallKrer27ProfileR1,
} from "../../src/lib/estimate/v4/asphaltInstallKrer27ProfileR1";
import { compileCanonicalEstimateCore } from "../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { canonicalEstimateRevisionRowFromStorage } from "../../src/lib/estimate/backendPlatform/canonicalEstimateRevisionReadMapper";
import { buildCanonicalProcurementProjection, selectCanonicalArtifactRows } from "../../src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract";
import { estimateDeterministicHash } from "../../src/lib/estimate/estimateDeterministicHash";

type Json = Record<string, any>;

const SOURCE_PACK_PATH = resolve(
  "data/estimate-benchmarks/source-packs/asphalt-install-large-area-krer27-profile-r1.json",
);

function row(result: Awaited<ReturnType<typeof compileAsphaltInstallKrer27ProfileR1>>, rowId: string) {
  const found = result.rows.find((candidate) => candidate.row_id === rowId);
  if (!found) throw new Error(`compiled row missing: ${rowId}`);
  return found;
}

describe("S27.19 hot-asphalt installation from KRER 27-06-020-01 and 27-06-021-01", () => {
  test("guards all three auxiliary supply orders on persisted reopen without changing physical asphalt work", async () => {
    const ids = ["asphalt:material:road-bitumen", "asphalt:material:technical-kerosene", "asphalt:material:hardwood-side-stop-bars"];
    const run = (quantities?: string[]) => compileCanonicalEstimateCore({ operation: quantities ? "recalculate" : "compile",
      compilerVersion: "auxiliary-asphalt-order-contract", catalogId: ASPHALT_INSTALL_KRER27_CATALOG_ID, primaryMeasureParameterId: "area_m2",
      parameterDefinitions: [...ASPHALT_INSTALL_KRER27_PARAMETERS], formulaDefinitions: [...ASPHALT_INSTALL_KRER27_FORMULAS],
      resourceDefinitions: [...ASPHALT_INSTALL_KRER27_RESOURCES], submittedParameters: { area_m2: 5000, layer_thickness_mm: 50 },
      confirmedParameters: ASPHALT_INSTALL_KRER27_RUNTIME_INPUT, currencyCode: "KGS", priceItems: [],
      rowOverrides: quantities ? Object.fromEntries(ids.map((id, index) => [id, { quantity: quantities[index], includedInProcurement: true,
        provenance: { kind: "manual", reason: "VALIDATION_FIXTURE auxiliary supplies; no stock or engineering claim" } }])) : {},
      maximumResourceRows: ASPHALT_INSTALL_KRER27_RESOURCES.length, hashJson: async value => estimateDeterministicHash(value) });
    const baseline = await run();
    for (const [quantities, gaps, excess] of [
      [["0", "0", "0"], ["0.068", "0.026", "0.75"], ["0", "0", "0"]],
      [["0.05", "0.01", "0.5"], ["0.018", "0.016", "0.25"], ["0", "0", "0"]],
      [["0.1", "0.04", "1"], ["0", "0", "0"], ["0.032", "0.014", "0.25"]],
    ]) {
      const result = await run(quantities);
      expect(result.preliminaryNeeds).toEqual([]);
      const stored = (JSON.parse(JSON.stringify(result.rows)) as typeof result.rows).map(value => { delete value.procurement_readiness; return value; });
      const reopened = stored.map(value => canonicalEstimateRevisionRowFromStorage(value, null));
      for (const [index, id] of ids.entries()) {
        expect(reopened.find(value => value.rowId === id)).toMatchObject({ quantity: quantities[index], includedInProcurement: gaps[index] === "0",
          calculationTrace: { manualQuantityOverride: true, calculatedQuantityBeforeOverride: ["0.068", "0.026", "0.75"][index],
            purchaseBalance: { quantityMode: "canonical_decimal", quantum: null, consumed: ["0.068", "0.026", "0.75"][index],
              consumptionShortage: gaps[index], excessOrderAboveRequiredConsumption: excess[index], procurementReady: gaps[index] === "0" } } });
        const policy = ASPHALT_INSTALL_KRER27_RESOURCES.find(value => value.row_id === id)!.resource_graph.purchaseBalanceV1;
        expect(policy).not.toHaveProperty("plannedConsumptionExpression");
        expect(policy).not.toHaveProperty("orderQuantumExpression");
      }
      for (const before of baseline.rows.filter(value => !ids.includes(value.row_id)))
        expect(result.rows.find(value => value.row_id === before.row_id)?.quantity).toBe(before.quantity);
      const selection = selectCanonicalArtifactRows(stored);
      const build = () => buildCanonicalProcurementProjection({ revision: { id: "TEST", release_id: "TEST", catalog_id: ASPHALT_INSTALL_KRER27_CATALOG_ID,
        checksum_sha256: "TEST", row_count: stored.length }, sourceRows: selection.sourceRows, procurementRows: selection.procurementRows });
      if (gaps.some(value => value !== "0")) {
        let failure: unknown; try { build(); } catch (error) { failure = error; }
        expect(failure).toMatchObject({ code: "PROCUREMENT_MATERIAL_SHORTAGE", shortages: ids.map((id, index) => expect.objectContaining({ rowId: id, consumptionShortage: gaps[index] })) });
      } else expect(build).not.toThrow();
    }
  });
  test("binds the independently authored technology/BOM source pack by exact bytes", () => {
    const bytes = readFileSync(SOURCE_PACK_PATH);
    const sourcePack = JSON.parse(bytes.toString("utf8")) as Json;
    expect(createHash("sha256").update(bytes).digest("hex"))
      .toBe(ASPHALT_INSTALL_KRER27_SOURCE_PACK_SHA256);
    expect(sourcePack).toMatchObject({
      schemaVersion: "rik-expo-app.s27-19.asphalt-install-large-area-krer27-hot-profile.v2",
      authoredIndependentlyFromDefinitionRows: true,
      masterSpecification: {
        edition: "S27.19",
        sha256: "8a3e6f8b2d56278f738245f1cd38e0f2b48552211740e85c21ace66511bbd2a7",
      },
    });
    expect(sourcePack.independentRequiredComponents.length).toBeGreaterThan(0);
    expect(new Set(sourcePack.independentRequiredComponents.map((entry: Json) => entry.semanticKey)).size)
      .toBe(sourcePack.independentRequiredComponents.length);
    expect(ASPHALT_INSTALL_KRER27_INDEPENDENT_COMPLETENESS_MAP.entries)
      .toHaveLength(sourcePack.independentRequiredComponents.length);
  });

  test("covers every independently required component and fails when any mapped row is removed", () => {
    expect(validateIndependentCompletenessMapReferences({
      completenessMap: ASPHALT_INSTALL_KRER27_INDEPENDENT_COMPLETENESS_MAP,
      formulaDefinitions: ASPHALT_INSTALL_KRER27_FORMULAS as readonly Json[],
      resourceDefinitions: ASPHALT_INSTALL_KRER27_RESOURCES as readonly Json[],
    })).toEqual([]);

    for (const removed of ASPHALT_INSTALL_KRER27_RESOURCES) {
      const errors = validateIndependentCompletenessMapReferences({
        completenessMap: ASPHALT_INSTALL_KRER27_INDEPENDENT_COMPLETENESS_MAP,
        formulaDefinitions: ASPHALT_INSTALL_KRER27_FORMULAS as readonly Json[],
        resourceDefinitions: ASPHALT_INSTALL_KRER27_RESOURCES.filter(
          (candidate) => candidate.row_id !== removed.row_id,
        ) as readonly Json[],
      });
      expect({ removed: removed.row_id, errors }).toEqual({
        removed: removed.row_id,
        errors: expect.arrayContaining([
          expect.stringMatching(/_(?:ROW|PARENT_ROW)_REFERENCE$/u),
        ]),
      });
    }
  });

  test("does not let a generic catch-all row hide several deleted materials", () => {
    const retained = ASPHALT_INSTALL_KRER27_RESOURCES.filter(
      (candidate) => !candidate.row_id.startsWith("asphalt:material:"),
    );
    const genericOther = {
      ...ASPHALT_INSTALL_KRER27_RESOURCES.find(
        (candidate) => candidate.row_id === "asphalt:material:hot-dense-fine-mix",
      )!,
      row_id: "asphalt:material:other",
      title_ru: "Прочие материалы",
    };
    const errors = validateIndependentCompletenessMapReferences({
      completenessMap: ASPHALT_INSTALL_KRER27_INDEPENDENT_COMPLETENESS_MAP,
      formulaDefinitions: ASPHALT_INSTALL_KRER27_FORMULAS as readonly Json[],
      resourceDefinitions: [...retained, genericOther] as readonly Json[],
    });
    expect(errors.filter((error) => error.endsWith("_ROW_REFERENCE"))).toHaveLength(4);
  });

  test("calculates the complete accepted-base single-course composition from 5000 m2 before refinement", async () => {
    const result = await compileAsphaltInstallKrer27ProfileR1({
      ...ASPHALT_INSTALL_KRER27_SHORT_INPUT,
    });
    expect(ASPHALT_INSTALL_KRER27_CATALOG_ID)
      .toBe("canonical-work:base:paving_roads_landscape_interior_asphalt_install_standard");
    expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows).toHaveLength(ASPHALT_INSTALL_KRER27_RESOURCES.length);
    expect(result.rows.every((item) => Number(item.quantity) > 0)).toBe(true);
    expect(result.rows.map((item) => item.row_id))
      .toEqual(ASPHALT_INSTALL_KRER27_RESOURCES.map((item) => item.row_id));

    expect(row(result, "asphalt:material:hot-dense-fine-mix")).toMatchObject({
      quantity: "604",
      unit_id: "t",
      title_ru: "Горячая асфальтобетонная смесь, тип и марка по проекту",
    });
    expect(row(result, "asphalt:material:road-bitumen")).toMatchObject({
      quantity: "0.068",
      unit_id: "t",
    });
    expect(row(result, "asphalt:material:technical-kerosene")).toMatchObject({
      quantity: "0.026",
      unit_id: "t",
    });
    expect(row(result, "asphalt:material:hardwood-side-stop-bars")).toMatchObject({
      quantity: "0.75",
      unit_id: "m3",
    });
    expect(row(result, "asphalt:labor:road-workers")).toMatchObject({
      quantity: "192.4",
      unit_id: "man_hour",
    });
    expect(row(result, "asphalt:equipment:smooth-roller-8t")).toMatchObject({
      quantity: "19.8",
      unit_id: "machine_hour",
    });
    expect(row(result, "asphalt:equipment:asphalt-paver")).toMatchObject({
      quantity: "15.95",
      unit_id: "machine_hour",
    });
    expect(row(result, "asphalt:delivery:truck-trips")).toMatchObject({
      quantity: "31",
      unit_id: "trip",
      included_in_estimate: false,
    });
    expect(row(result, "asphalt:delivery:ton-km")).toMatchObject({
      quantity: "12080",
      unit_id: "t_km",
      included_in_estimate: false,
    });
    expect(row(result, "asphalt:delivery:truck-machine-hours")).toMatchObject({
      quantity: "46.5",
      unit_id: "machine_hour",
      included_in_estimate: true,
    });
    expect(result.totals).toMatchObject({
      pricedRowCount: 0,
      unpricedRowCount: 26,
    });
  });

  test("keeps included machine components visible without charging them twice", async () => {
    const result = await compileAsphaltInstallKrer27ProfileR1({
      ...ASPHALT_INSTALL_KRER27_SHORT_INPUT,
    });
    const includedComponents = result.rows.filter((item) =>
      String((item.calculation_trace as Json).resourceGraph?.costTreatment)
        === "INCLUDED_IN_RESOURCE_ROWS");
    expect(includedComponents.length).toBeGreaterThan(0);
    expect(includedComponents.every((item) => item.included_in_estimate === false)).toBe(true);
    expect(includedComponents.every((item) => item.unit_price == null && item.amount == null)).toBe(true);
    expect(row(result, "asphalt:included:roller-water-scrapers")).toMatchObject({
      quantity: "19.8",
      included_in_estimate: false,
    });
    expect(row(result, "asphalt:equipment:smooth-roller-8t")).toMatchObject({
      quantity: "19.8",
      included_in_estimate: true,
    });
  });

  test("recalculates all dependent quantities for a 55 mm refinement", async () => {
    const result = await compileAsphaltInstallKrer27ProfileR1({
      ...ASPHALT_INSTALL_KRER27_SHORT_INPUT,
      layer_thickness_mm: 55,
    });
    expect(result.preliminaryNeeds).toEqual([]);
    expect(row(result, "asphalt:material:hot-dense-fine-mix").quantity).toBe("664.5");
    expect(row(result, "asphalt:labor:road-workers").quantity).toBe("192.85");
    expect(row(result, "asphalt:equipment:surface-grinder").quantity).toBe("57.55");
  });

  test("rejects off-step thickness and adjacent work identities", async () => {
    await expect(compileAsphaltInstallKrer27ProfileR1({
      ...ASPHALT_INSTALL_KRER27_SHORT_INPUT,
      layer_thickness_mm: 52,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileAsphaltInstallKrer27ProfileR1(
      ASPHALT_INSTALL_KRER27_ACCEPTANCE_INPUT,
      { catalogId: `${ASPHALT_INSTALL_KRER27_CATALOG_ID}:compaction-only` },
    )).rejects.toThrow("ASPHALT_INSTALL_KRER27_CATALOG_UNSUPPORTED");
  });

  test("does not invent adjacent base, drainage, kerb, marking or milling scopes", () => {
    const rowIds = ASPHALT_INSTALL_KRER27_RESOURCES.map((item) => item.row_id).join("\n");
    expect(rowIds).not.toMatch(/(?:subbase|drainage|kerb|marking|milling|demolition)/iu);
    expect(ASPHALT_INSTALL_KRER27_PARAMETERS).toHaveLength(31);
    expect(ASPHALT_INSTALL_KRER27_FORMULAS).toHaveLength(22);
    expect(JSON.stringify({
      resources: ASPHALT_INSTALL_KRER27_RESOURCES,
      formulas: ASPHALT_INSTALL_KRER27_FORMULAS,
    })).not.toMatch(/27-06-019-02|холодн/iu);
  });
});


test("the physical paving method rejects the retired area catalog", async () => {
  await expect(compileAsphaltInstallKrer27ProfileR1(
    { ...ASPHALT_INSTALL_KRER27_ACCEPTANCE_INPUT },
    { catalogId: "canonical-work:base:paving_roads_landscape_interior_asphalt_install_large_area" },
  )).rejects.toThrow("ASPHALT_INSTALL_KRER27_CATALOG_UNSUPPORTED");
});
