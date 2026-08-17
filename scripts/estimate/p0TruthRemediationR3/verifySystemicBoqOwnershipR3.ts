import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { buildAllHvacPassports } from "../hvacBackendR4/hvacR4Model";
import {
  INTERIOR_FINISHES_DOMAIN_INVENTORY,
  buildDrywallArchitecturalElementProfessionalPackagePartsV4,
  buildDrywallCeilingBulkheadProfessionalPackagePartsV3,
  buildDrywallDomainCompletionProfessionalPackagePartsV7,
  buildDrywallFlatCeilingProfessionalPackagePartsV6,
} from "../../../src/lib/estimate/v4/domains/interiorFinishesComplete";

type DrywallRow = {
  row_id: string;
  semantic_owner: string;
  cost_owner_id: string;
};

function assertR3(condition: unknown, code: string): asserts condition {
  if (!condition) throw new Error(code);
}

async function main(): Promise<void> {
  const outputDir = resolve(process.argv[2] ?? join(process.cwd(), "artifacts", "p0-estimate-truth-remediation-r3", "systemic-boq-ownership"));
  await mkdir(outputDir, { recursive: true });

  let drywallCatalogs = 0;
  let drywallRows = 0;
  let drywallCatalogsUsingBaseFactory = 0;
  for (const inventory of INTERIOR_FINISHES_DOMAIN_INVENTORY) {
    const parts = buildDrywallDomainCompletionProfessionalPackagePartsV7(inventory)
      ?? buildDrywallArchitecturalElementProfessionalPackagePartsV4(inventory)
      ?? buildDrywallFlatCeilingProfessionalPackagePartsV6(inventory)
      ?? buildDrywallCeilingBulkheadProfessionalPackagePartsV3(inventory);
    if (!parts) {
      drywallCatalogsUsingBaseFactory += 1;
      continue;
    }
    const rows = parts.child_assemblies.flatMap((child) => child.rows) as DrywallRow[];
    const rowIds = new Set(rows.map((row) => row.row_id));
    const semanticOwners = new Set(rows.map((row) => row.semantic_owner));
    const costOwners = new Set(rows.map((row) => row.cost_owner_id));
    assertR3(rowIds.size === rows.length, `R3_DRYWALL_ROW_ID_DUPLICATE:${inventory.catalog_id}`);
    assertR3(semanticOwners.size === rows.length, `R3_DRYWALL_SEMANTIC_OWNER_DUPLICATE:${inventory.catalog_id}`);
    assertR3(costOwners.size === rows.length, `R3_DRYWALL_COST_OWNER_DUPLICATE:${inventory.catalog_id}`);
    drywallCatalogs += 1;
    drywallRows += rows.length;
  }
  assertR3(drywallCatalogs + drywallCatalogsUsingBaseFactory === INTERIOR_FINISHES_DOMAIN_INVENTORY.length, "R3_DRYWALL_INVENTORY_DISPOSITION_MISMATCH");

  const hvac = buildAllHvacPassports();
  let hvacRows = 0;
  let hvacInterfaceComponents = 0;
  let hvacInterfaceRows = 0;
  for (const passport of hvac) {
    assertR3(
      new Set(passport.resources.map((row) => row.semanticOwner)).size === passport.resources.length,
      `R3_HVAC_SEMANTIC_OWNER_DUPLICATE:${passport.catalogId}`,
    );
    for (const component of passport.components.filter((candidate) => candidate.kind === "INTERFACE")) {
      const rows = passport.resources.filter((row) => row.resourceGraph.componentKey === component.key);
      assertR3(rows.length === 1, `R3_HVAC_TYPED_CHILD_NOT_SINGLE_ROW:${passport.catalogId}:${component.key}:${rows.length}`);
      assertR3(rows[0]?.costOwnerId === null, `R3_HVAC_TYPED_CHILD_COST_OWNER_PRESENT:${passport.catalogId}:${component.key}`);
      assertR3(rows[0]?.procurementEligible === false, `R3_HVAC_TYPED_CHILD_PROCUREMENT_ROW:${passport.catalogId}:${component.key}`);
      hvacInterfaceComponents += 1;
      hvacInterfaceRows += rows.length;
    }
    hvacRows += passport.resources.length;
  }

  const result = {
    schemaVersion: "p0-estimate-truth-remediation-r3-systemic-boq-ownership.v1",
    generatedAt: new Date().toISOString(),
    status: "GREEN_FOCUSED_SOURCE_INVARIANTS",
    exactCounts: {
      drywallCatalogs,
      drywallCatalogsUsingBaseFactory,
      drywallInventoryCatalogs: INTERIOR_FINISHES_DOMAIN_INVENTORY.length,
      drywallRows,
      drywallSemanticOwnerDuplicates: 0,
      drywallCostOwnerDuplicates: 0,
      hvacCatalogs: hvac.length,
      hvacRows,
      hvacInterfaceComponents,
      hvacInterfaceRows,
      hvacInterfaceRowsWithCostOwner: 0,
      hvacSemanticOwnerDuplicates: 0,
    },
    conclusionRu: "Системные дубли владельцев Drywall устранены; каждая HVAC typed-child граница представлена одной информационной строкой без собственной стоимости.",
  };
  await writeFile(join(outputDir, "RESULT.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
  await writeFile(join(outputDir, "JOURNAL_RU.jsonl"), `${JSON.stringify({
    timestamp: result.generatedAt,
    status: result.status,
    actionRu: "Проверены уникальные semantic/cost owners Drywall и единичные typed-child границы HVAC.",
    exactCounts: result.exactCounts,
  })}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
