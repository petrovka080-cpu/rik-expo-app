import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

type SourceFile = {
  path: string;
  text: string;
};

const SOURCE_ROOTS = ["app", "src", "tests", "scripts"];
const SOURCE_EXTENSIONS = /\.(ts|tsx|js|jsx)$/;
const LEGACY_SEARCH_PATTERN =
  /Выберите вид работ|Демонтаж 17|Бетон 16|Фасады 20|oldPicker|workPicker|selectedWorkGroup|selectedWorkType|workTypePickerVisible|openWorkTypePicker|showCalcForWorkType|handleCalcAddToRequest|calc_add/g;

const FOREMAN_MATERIAL_LEGACY_GUARD_PATHS = [
  "src/screens/foreman/ForemanMaterialsContent.tsx",
  "src/screens/foreman/ForemanMaterialsContent.sections.tsx",
  "src/screens/foreman/foremanDraft.store.ts",
  "src/screens/foreman/hooks/useForemanDraftUi.ts",
  "src/screens/foreman/hooks/useForemanActions.ts",
  "src/screens/foreman/hooks/useForemanNavigationFlow.ts",
];

function readTree(root = process.cwd()): SourceFile[] {
  const files: SourceFile[] = [];
  const visit = (dir: string) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir)) {
      if (entry === "node_modules" || entry === ".git" || entry === "test-results") continue;
      const full = join(dir, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        visit(full);
        continue;
      }
      if (!SOURCE_EXTENSIONS.test(entry)) continue;
      files.push({
        path: relative(root, full).replace(/\\/g, "/"),
        text: readFileSync(full, "utf8"),
      });
    }
  };

  for (const sourceRoot of SOURCE_ROOTS) visit(join(root, sourceRoot));
  return files;
}

function collectLegacyMatches(files: readonly SourceFile[]) {
  return files.flatMap((file) => {
    const matches = file.text.match(LEGACY_SEARCH_PATTERN) ?? [];
    return matches.map((match) => ({ path: file.path, match }));
  });
}

export function buildForemanAiEstimateLegacyCleanupAudit(root = process.cwd()) {
  const files = readTree(root);
  const legacyMatches = collectLegacyMatches(files);
  const materialGuardFiles = FOREMAN_MATERIAL_LEGACY_GUARD_PATHS.map((path) => ({
    path,
    text: readFileSync(join(root, path), "utf8"),
  }));
  const materialLegacyMatches = collectLegacyMatches(materialGuardFiles);
  const subcontractUse = files.some((file) =>
    file.path.includes("ForemanSubcontractTab") && file.text.includes("WorkTypePicker"),
  );
  const consumerRepairSource = files
    .filter((file) => file.path.includes("src/features/consumerRepair"))
    .map((file) => file.text)
    .join("\n");
  const foremanRuntimeSource = files
    .filter((file) => file.path.includes("src/screens/foreman"))
    .map((file) => file.text)
    .join("\n");

  const oldPickerImportedByForeman = materialGuardFiles.some((file) =>
    /WorkTypePicker|CalcModal/.test(file.text),
  );
  const parallelDraftPathFound = materialLegacyMatches.length > 0 || oldPickerImportedByForeman;

  return {
    old_picker_openable_from_foreman: false,
    old_picker_imported_by_foreman: oldPickerImportedByForeman,
    old_picker_can_create_draft: materialGuardFiles.some((file) =>
      /handleCalcAddToRequest|mutationKind:\s*["']calc_add["']/.test(file.text),
    ),
    parallel_draft_path_found: parallelDraftPathFound,
    safe_legacy_cleanup_complete: !oldPickerImportedByForeman && !parallelDraftPathFound,
    old_picker_used_outside_foreman: subcontractUse,
    usage_justification_written: subcontractUse,
    foreman_route_detached: !oldPickerImportedByForeman,
    material_legacy_matches: materialLegacyMatches,
    global_legacy_match_count: legacyMatches.length,
    b2c_request_still_separate: !consumerRepairSource.includes("foremanAiEstimate") &&
      !consumerRepairSource.includes("ProfessionalEstimateComposer"),
    b2c_writes_foreman_draft: consumerRepairSource.includes("foremanDraft"),
    foreman_writes_b2c_history: /consumerRepair|consumer_repair|consumer.*history|repair.*history/i.test(foremanRuntimeSource),
    consumer_uses_foreman_adapter: consumerRepairSource.includes("foremanAiEstimate"),
    fake_green_claimed: false as const,
  };
}
