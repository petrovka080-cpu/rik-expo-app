import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const projectRoot = process.cwd();
const artifactDir = path.join(projectRoot, "artifacts");

const summaryPath = path.join(artifactDir, "director-reports-wave1-summary.json");
const waterfallPath = path.join(artifactDir, "director-reports-waterfall-before-after.json");
const nplus1Path = path.join(artifactDir, "director-reports-nplus1-check.json");
const smokePath = path.join(artifactDir, "director-reports-smoke.json");

const transportPath = "src/lib/api/director_reports.transport.ts";
const factsPath = "src/lib/api/director_reports.transport.facts.ts";
const disciplinePath = "src/lib/api/director_reports.transport.discipline.ts";
const legacyPath = "src/lib/api/director_reports.transport.legacy.ts";
const lookupsPath = "src/lib/api/director_reports.transport.lookups.ts";
const basePath = "src/lib/api/director_reports.transport.base.ts";
const productionPath = "src/lib/api/director_reports.transport.production.ts";
const namingPath = "src/lib/api/director_reports.naming.ts";
const serviceReportPath = "src/lib/api/director_reports.service.report.ts";
const migrationPath = "supabase/migrations/20260329060000_director_report_acc_issue_lines_batch_v1.sql";

const readText = (relativePath: string) =>
  fs.readFileSync(path.join(projectRoot, relativePath), "utf8").replace(/^\uFEFF/, "");
const readHeadText = (relativePath: string) => {
  try {
    return execSync(`git show HEAD:${relativePath}`, {
      cwd: projectRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).replace(/^\uFEFF/, "");
  } catch {
    return "";
  }
};
const countLines = (text: string) => text.split(/\r?\n/).length;
const writeJson = (targetPath: string, payload: unknown) => {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, `${JSON.stringify(payload, null, 2)}\n`);
};

const countMatches = (text: string, pattern: RegExp) => {
  const matches = text.match(pattern);
  return matches ? matches.length : 0;
};

async function main() {
  const baselineTransport = readHeadText(transportPath);
  const currentTransport = readText(transportPath);
  const factsSource = readText(factsPath);
  const disciplineSource = readText(disciplinePath);
  const legacySource = readText(legacyPath);
  const lookupsSource = readText(lookupsPath);
  const baseSource = readText(basePath);
  const productionSource = readText(productionPath);
  const namingSource = readText(namingPath);
  const serviceReportSource = readText(serviceReportPath);
  const migrationSource = readText(migrationPath);

  const beforeSequentialChunkLoops =
    countMatches(baselineTransport, /for\s*\(const\s+\w+\s+of\s+chunk\(/g) +
    countMatches(readHeadText(productionPath), /for\s*\(const\s+\w+\s+of\s+chunk\(/g) +
    countMatches(readHeadText(namingPath), /for\s*\(const\s+\w+\s+of\s+chunk\(/g);
  const afterSequentialChunkLoops =
    countMatches(currentTransport, /for\s*\(const\s+\w+\s+of\s+chunk\(/g) +
    countMatches(factsSource, /for\s*\(const\s+\w+\s+of\s+chunk\(/g) +
    countMatches(disciplineSource, /for\s*\(const\s+\w+\s+of\s+chunk\(/g) +
    countMatches(legacySource, /for\s*\(const\s+\w+\s+of\s+chunk\(/g) +
    countMatches(baseSource, /for\s*\(const\s+\w+\s+of\s+chunk\(/g) +
    countMatches(productionSource, /for\s*\(const\s+\w+\s+of\s+chunk\(/g) +
    countMatches(namingSource, /for\s*\(const\s+\w+\s+of\s+chunk\(/g);

  const beforeLookupWaterfall =
    (baselineTransport.includes("await fetchObjectsByIds(") ? 1 : 0) +
    (baselineTransport.includes("await fetchObjectTypeNamesByCode(") ? 1 : 0) +
    (baselineTransport.includes("await fetchSystemNamesByCode(") ? 1 : 0);
  const afterLookupWaterfall =
    (factsSource.includes("await fetchObjectsByIds(") ? 1 : 0) +
    (factsSource.includes("await fetchObjectTypeNamesByCode(") ? 1 : 0) +
    (factsSource.includes("await fetchSystemNamesByCode(") ? 1 : 0) +
    (disciplineSource.includes("await fetchObjectsByIds(") ? 1 : 0) +
    (disciplineSource.includes("await fetchObjectTypeNamesByCode(") ? 1 : 0) +
    (disciplineSource.includes("await fetchSystemNamesByCode(") ? 1 : 0);

  const transport = await import("../src/lib/api/director_reports.transport");
  const transportBase = await import("../src/lib/api/director_reports.transport.base");
  const transportLookups = await import("../src/lib/api/director_reports.transport.lookups");

  const smoke = {
    transportFacadeExportsFacts: typeof transport.fetchDirectorFactViaAccRpc === "function",
    transportFacadeExportsDiscipline: typeof transport.fetchFactRowsForDiscipline === "function",
    transportFacadeExportsLegacy: typeof transport.fetchViaLegacyRpc === "function",
    baseEmptyIssueLinesOk:
      Array.isArray(await transportBase.fetchIssueLinesViaAccRpc([])) &&
      (await transportBase.fetchIssueLinesViaAccRpc([])).length === 0,
    lookupHelperEmptyOk:
      (await transportLookups.loadDirectorRequestContextLookups({ requests: [] })).objectNameById instanceof Map,
  };

  const waterfall = {
    before: {
      transportLines: countLines(baselineTransport),
      sequentialChunkLoops: beforeSequentialChunkLoops,
      directLookupWaterfallSteps: beforeLookupWaterfall,
    },
    after: {
      transportLines: countLines(currentTransport),
      familyLines: {
        [factsPath]: countLines(factsSource),
        [disciplinePath]: countLines(disciplineSource),
        [legacyPath]: countLines(legacySource),
        [lookupsPath]: countLines(lookupsSource),
      },
      sequentialChunkLoops: afterSequentialChunkLoops,
      directLookupWaterfallSteps: afterLookupWaterfall,
      sharedLookupPromiseAll: lookupsSource.includes("Promise.all(["),
      factRequestChunkParallel: factsSource.includes("forEachChunkParallel(requestIds, 100, 4"),
      tablesLookupSharedLoader: disciplineSource.includes("loadDirectorRequestContextLookups({"),
    },
  };

  const nplus1 = {
    accIssueLinesBatchRpcEnabled: baseSource.includes("director_report_fetch_acc_issue_lines_v1"),
    accIssueLinesFallbackTraceable:
      baseSource.includes("issue_lines_acc_batch_rpc_failed") &&
      baseSource.includes('fallbackTarget: "acc_report_issue_lines"'),
    serviceFastRpcFallbackTraceable: !serviceReportSource.includes("} catch {"),
    productionChunkLoopsSequential: /for\s*\(const\s+\w+\s+of\s+chunk\(/.test(productionSource),
    namingChunkLoopsSequential: /for\s*\(const\s+\w+\s+of\s+chunk\(/.test(namingSource),
    migrationPresent: migrationSource.includes("director_report_fetch_acc_issue_lines_v1"),
    migrationWrapsLegacyRpc: migrationSource.includes("cross join lateral public.acc_report_issue_lines"),
  };

  const summary = {
    status:
      currentTransport.includes('from "./director_reports.transport.facts"') &&
      currentTransport.includes('from "./director_reports.transport.discipline"') &&
      currentTransport.includes('from "./director_reports.transport.legacy"') &&
      currentTransport.includes('from "./director_reports.transport.base"') &&
      currentTransport.includes('from "./director_reports.transport.production"') &&
      waterfall.after.sequentialChunkLoops < waterfall.before.sequentialChunkLoops &&
      waterfall.after.directLookupWaterfallSteps < waterfall.before.directLookupWaterfallSteps &&
      nplus1.accIssueLinesBatchRpcEnabled &&
      nplus1.accIssueLinesFallbackTraceable &&
      !nplus1.productionChunkLoopsSequential &&
      !nplus1.namingChunkLoopsSequential &&
      nplus1.migrationPresent &&
      nplus1.migrationWrapsLegacyRpc &&
      Object.values(smoke).every(Boolean)
        ? "GREEN"
        : "NOT GREEN",
    files: [
      transportPath,
      factsPath,
      disciplinePath,
      legacyPath,
      lookupsPath,
      basePath,
      productionPath,
      namingPath,
      serviceReportPath,
      migrationPath,
    ],
    checks: {
      transportFacadeSplit: currentTransport.includes('from "./director_reports.transport.facts"')
        && currentTransport.includes('from "./director_reports.transport.discipline"')
        && currentTransport.includes('from "./director_reports.transport.legacy"'),
      lookupWaterfallReduced: waterfall.after.directLookupWaterfallSteps < waterfall.before.directLookupWaterfallSteps,
      sequentialChunkLoopsReduced: waterfall.after.sequentialChunkLoops < waterfall.before.sequentialChunkLoops,
      batchRpcPresent: nplus1.accIssueLinesBatchRpcEnabled,
      fallbackTraceable: nplus1.accIssueLinesFallbackTraceable && nplus1.serviceFastRpcFallbackTraceable,
      noSequentialChunkLoopsInNamingOrProduction: !nplus1.productionChunkLoopsSequential && !nplus1.namingChunkLoopsSequential,
      migrationPresent: nplus1.migrationPresent,
    },
    smoke,
  };

  writeJson(summaryPath, summary);
  writeJson(waterfallPath, waterfall);
  writeJson(nplus1Path, {
    status: summary.status,
    ...nplus1,
  });
  writeJson(smokePath, smoke);

  console.log(JSON.stringify({
    status: summary.status,
    waterfall,
    nplus1,
    smoke,
  }, null, 2));

  if (summary.status !== "GREEN") {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
