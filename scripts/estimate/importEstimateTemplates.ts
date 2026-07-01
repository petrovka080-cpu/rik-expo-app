import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  auditProfessionalEstimateTemplateCatalogReadiness,
} from "../../src/lib/ai/professionalEstimateCalculator";
import {
  buildProductionTemplate10000CategoryDistribution,
  buildProductionTemplate10000Manifest,
} from "../../src/lib/ai/estimateTemplate10000";

async function main() {
  const readiness = auditProfessionalEstimateTemplateCatalogReadiness();
  const manifest = buildProductionTemplate10000Manifest();
  const distribution = buildProductionTemplate10000CategoryDistribution();
  const outDir = path.join(process.cwd(), ".release-runtime", "professional-ai-estimate-template-calculator", "template-import-preview");
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, "readiness.json"), `${JSON.stringify(readiness, null, 2)}\n`, "utf8");
  await writeFile(path.join(outDir, "category-distribution.json"), `${JSON.stringify(distribution, null, 2)}\n`, "utf8");
  await writeFile(path.join(outDir, "manifest-sample.json"), `${JSON.stringify(manifest.slice(0, 50), null, 2)}\n`, "utf8");
  console.info(JSON.stringify({
    imported: false,
    mode: "filesystem_preview_no_db_mutation",
    templatesTotal: readiness.templatesTotal,
    blockers: readiness.blockers,
    artifactDir: outDir,
    prodDbMutated: false,
    destructiveSqlExecuted: false,
  }, null, 2));
  if (readiness.blockers.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
