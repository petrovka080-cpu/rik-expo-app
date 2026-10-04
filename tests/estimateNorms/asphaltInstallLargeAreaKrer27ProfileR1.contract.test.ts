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
  compileAsphaltInstallLargeAreaKrer27ProfileR1,
} from "../../src/lib/estimate/v4/asphaltInstallLargeAreaKrer27ProfileR1";

type Json = Record<string, any>;

const SOURCE_PACK_PATH = resolve(
  "data/estimate-benchmarks/source-packs/asphalt-install-large-area-krer27-profile-r1.json",
);

function row(result: Awaited<ReturnType<typeof compileAsphaltInstallLargeAreaKrer27ProfileR1>>, rowId: string) {
  const found = result.rows.find((candidate) => candidate.row_id === rowId);
  if (!found) throw new Error(`compiled row missing: ${rowId}`);
  return found;
}

describe("S27.19 hot-asphalt installation from KRER 27-06-020-01 and 27-06-021-01", () => {
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
    const result = await compileAsphaltInstallLargeAreaKrer27ProfileR1({
      ...ASPHALT_INSTALL_KRER27_SHORT_INPUT,
    });
    expect(ASPHALT_INSTALL_KRER27_CATALOG_ID)
      .toBe("canonical-work:base:paving_roads_landscape_interior_asphalt_install_large_area");
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
    const result = await compileAsphaltInstallLargeAreaKrer27ProfileR1({
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
    const result = await compileAsphaltInstallLargeAreaKrer27ProfileR1({
      ...ASPHALT_INSTALL_KRER27_SHORT_INPUT,
      layer_thickness_mm: 55,
    });
    expect(result.preliminaryNeeds).toEqual([]);
    expect(row(result, "asphalt:material:hot-dense-fine-mix").quantity).toBe("664.5");
    expect(row(result, "asphalt:labor:road-workers").quantity).toBe("192.85");
    expect(row(result, "asphalt:equipment:surface-grinder").quantity).toBe("57.55");
  });

  test("rejects off-step thickness and adjacent work identities", async () => {
    await expect(compileAsphaltInstallLargeAreaKrer27ProfileR1({
      ...ASPHALT_INSTALL_KRER27_SHORT_INPUT,
      layer_thickness_mm: 52,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileAsphaltInstallLargeAreaKrer27ProfileR1(
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
