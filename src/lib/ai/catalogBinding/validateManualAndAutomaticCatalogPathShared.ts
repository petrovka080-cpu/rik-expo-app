import fs from "node:fs";
import path from "node:path";

export function validateManualAndAutomaticCatalogPathShared(rootDir = process.cwd()): {
  passed: boolean;
  failures: string[];
} {
  const aiPath = path.join(rootDir, "src", "lib", "ai", "catalogBinding", "bindBoqRowsToCatalogItems.ts");
  const globalPath = path.join(rootDir, "src", "lib", "ai", "globalEstimate", "catalogBinding", "bindEstimateRowsToCatalogItems.ts");
  const failures: string[] = [];
  const aiSource = fs.existsSync(aiPath) ? fs.readFileSync(aiPath, "utf8") : "";
  const globalSource = fs.existsSync(globalPath) ? fs.readFileSync(globalPath, "utf8") : "";
  if (!aiSource.includes("bindEstimateRowsToCatalogItems")) failures.push("ai_path_not_using_shared_global_catalog_binding");
  if (!globalSource.includes("catalogItemsService")) failures.push("shared_catalog_service_missing");
  if (/fakeCatalog|mockCatalog|aiOnlyCatalog/i.test(aiSource)) failures.push("fake_ai_catalog_service_found");
  return { passed: failures.length === 0, failures };
}
