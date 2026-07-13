import { CONSTRUCTION_WORK_ONTOLOGY_BY_KEY } from "../../src/lib/ai/workOntology/constructionWorkOntologyCatalog";
import {
  WORK_ONTOLOGY_1000_RECIPE_BINDING_CASES,
} from "./realWorkOntology10000Cases";
import {
  assertNoFailures,
  failIf,
  GENERIC_WORK_KEY_PATTERN,
  GREEN_WORK_ONTOLOGY_RECIPE_1000,
  PAID_CONTROL_ROW_PATTERN,
  SECTION_TITLE_AS_MATERIAL_PATTERN,
  writeIosProtocolReadiness,
  writeWaveJson,
} from "./workOntology10000.shared";

export function runWorkOntology1000RecipeBindingProof() {
  const failures: unknown[] = [];
  const rows = [];
  let explicitBindings = 0;
  let missingRecipe = 0;
  let missingMaterialRecipe = 0;
  let missingPricebookScope = 0;
  let genericRecipe = 0;
  let sectionTitleAsMaterial = 0;
  let paidControlRows = 0;
  let missingCatalogEntry = 0;

  for (const testCase of WORK_ONTOLOGY_1000_RECIPE_BINDING_CASES) {
    const entry = CONSTRUCTION_WORK_ONTOLOGY_BY_KEY.get(testCase.canonical_work_key);
    const recipeMissing = !testCase.recipe_scope;
    const materialMissing = !testCase.material_recipe_scope;
    const pricebookMissing = !testCase.pricebook_scope;
    const generic =
      GENERIC_WORK_KEY_PATTERN.test(testCase.recipe_scope) ||
      GENERIC_WORK_KEY_PATTERN.test(testCase.material_recipe_scope) ||
      GENERIC_WORK_KEY_PATTERN.test(testCase.pricebook_scope);
    const sectionTitle =
      SECTION_TITLE_AS_MATERIAL_PATTERN.test(testCase.visible_work_name_ru) ||
      SECTION_TITLE_AS_MATERIAL_PATTERN.test(testCase.material_recipe_scope);
    const paidControl =
      PAID_CONTROL_ROW_PATTERN.test(testCase.visible_work_name_ru) ||
      PAID_CONTROL_ROW_PATTERN.test(testCase.recipe_scope) ||
      PAID_CONTROL_ROW_PATTERN.test(testCase.material_recipe_scope);

    if (!entry) missingCatalogEntry += 1;
    if (recipeMissing) missingRecipe += 1;
    if (materialMissing) missingMaterialRecipe += 1;
    if (pricebookMissing) missingPricebookScope += 1;
    if (generic) genericRecipe += 1;
    if (sectionTitle) sectionTitleAsMaterial += 1;
    if (paidControl) paidControlRows += 1;
    if (!recipeMissing && !materialMissing && !pricebookMissing && !generic && !sectionTitle && !paidControl && entry) {
      explicitBindings += 1;
    }

    rows.push({
      ...testCase,
      catalog_entry_exists: Boolean(entry),
      explicit_recipe_binding: !recipeMissing,
      explicit_material_recipe_binding: !materialMissing,
      explicit_pricebook_scope: !pricebookMissing,
      generic_recipe: generic,
      section_title_as_material: sectionTitle,
      paid_control_row: paidControl,
    });
  }

  failIf(WORK_ONTOLOGY_1000_RECIPE_BINDING_CASES.length !== 1000, `RECIPE_CASE_COUNT:${WORK_ONTOLOGY_1000_RECIPE_BINDING_CASES.length}`, failures);
  failIf(explicitBindings !== 1000, `EXPLICIT_BINDINGS:${explicitBindings}`, failures);
  failIf(missingCatalogEntry !== 0, `MISSING_CATALOG_ENTRY:${missingCatalogEntry}`, failures);
  failIf(missingRecipe !== 0, `MISSING_RECIPE:${missingRecipe}`, failures);
  failIf(missingMaterialRecipe !== 0, `MISSING_MATERIAL_RECIPE:${missingMaterialRecipe}`, failures);
  failIf(missingPricebookScope !== 0, `MISSING_PRICEBOOK_SCOPE:${missingPricebookScope}`, failures);
  failIf(genericRecipe !== 0, `GENERIC_RECIPE:${genericRecipe}`, failures);
  failIf(sectionTitleAsMaterial !== 0, `SECTION_TITLE_AS_MATERIAL:${sectionTitleAsMaterial}`, failures);
  failIf(paidControlRows !== 0, `PAID_CONTROL_ROWS:${paidControlRows}`, failures);

  const summary = {
    final_status: failures.length === 0 ? GREEN_WORK_ONTOLOGY_RECIPE_1000 : "BLOCKED_WORK_ONTOLOGY_1000_RECIPE_BINDINGS",
    recipe_binding_cases: WORK_ONTOLOGY_1000_RECIPE_BINDING_CASES.length,
    explicit_bindings: explicitBindings,
    missing_catalog_entry: missingCatalogEntry,
    missing_recipe: missingRecipe,
    missing_material_recipe: missingMaterialRecipe,
    missing_pricebook_scope: missingPricebookScope,
    generic_recipe: genericRecipe,
    section_title_as_material: sectionTitleAsMaterial,
    paid_control_rows: paidControlRows,
    rows,
    failures,
  };

  writeWaveJson("recipe_binding_1000_results.json", summary);
  writeIosProtocolReadiness();
  console.log(JSON.stringify({ ...summary, rows: `${rows.length} rows written` }, null, 2));
  assertNoFailures(failures);
  return summary;
}

if (require.main === module) {
  runWorkOntology1000RecipeBindingProof();
}
