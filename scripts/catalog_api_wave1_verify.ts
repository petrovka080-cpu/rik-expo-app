import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

import { config as loadDotenv } from "dotenv";

type JsonRecord = Record<string, unknown>;

const projectRoot = process.cwd();
for (const file of [".env.local", ".env"]) {
  const full = path.join(projectRoot, file);
  if (fs.existsSync(full)) loadDotenv({ path: full, override: false });
}

const artifactDir = path.join(projectRoot, "artifacts");
const summaryPath = path.join(artifactDir, "catalog-api-wave1-summary.json");
const smokePath = path.join(artifactDir, "catalog-api-wave1-smoke.json");
const beforeAfterPath = path.join(artifactDir, "catalog-api-wave1-before-after.txt");

const catalogApiPath = "src/lib/catalog_api.ts";
const facadePath = "src/lib/catalog/catalog.facade.ts";
const familyFiles = [
  "src/lib/catalog/catalog.types.ts",
  "src/lib/catalog/catalog.observability.ts",
  "src/lib/catalog/catalog.parsers.ts",
  "src/lib/catalog/catalog.normalizers.ts",
  "src/lib/catalog/catalog.transport.ts",
  "src/lib/catalog/catalog.search.service.ts",
  "src/lib/catalog/catalog.lookup.service.ts",
  facadePath,
];

const readText = (relativePath: string) =>
  fs.readFileSync(path.join(projectRoot, relativePath), "utf8");

const countLines = (text: string) => text.split(/\r?\n/).length;
const writeJson = (targetPath: string, payload: unknown) => {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, `${JSON.stringify(payload, null, 2)}\n`);
};

const baselineSource = execSync(`git show HEAD:${catalogApiPath}`, {
  cwd: projectRoot,
  encoding: "utf8",
});
const currentSource = readText(catalogApiPath);
const facadeSource = readText(facadePath);

const removedBodies = [
  "export async function listUnifiedCounterparties(",
  "export async function searchCatalogItems(",
  "export async function listCatalogGroups(",
  "export async function listUoms(",
  "export async function listIncomingItems(",
  "export async function listSuppliers(",
  "export async function rikQuickSearch(",
];

async function main() {
  const catalogApi = await import("../src/lib/catalog_api");

  const {
    listCatalogGroups,
    listIncomingItems,
    listSuppliers,
    listUnifiedCounterparties,
    listUoms,
    rikQuickSearch,
    searchCatalogItems,
  } = catalogApi;

  const smoke = {
    searchCatalogItemsOk: Array.isArray(await searchCatalogItems("арматура", 5)),
    rikQuickSearchOk: Array.isArray(await rikQuickSearch("арматура", 5)),
    listCatalogGroupsOk: Array.isArray(await listCatalogGroups()),
    listUomsOk: Array.isArray(await listUoms()),
    listIncomingItemsEmptyGuardOk:
      Array.isArray(await listIncomingItems("")) && (await listIncomingItems("")).length === 0,
    listSuppliersOk: Array.isArray(await listSuppliers()),
    listUnifiedCounterpartiesOk: Array.isArray(await listUnifiedCounterparties("строй")),
  };

  const summary = {
    status:
      currentSource.includes('from "./catalog/catalog.facade"') &&
      removedBodies.every((marker) => !currentSource.includes(marker)) &&
      familyFiles.every((file) => fs.existsSync(path.join(projectRoot, file))) &&
      facadeSource.includes('from "./catalog.search.service"') &&
      facadeSource.includes('from "./catalog.lookup.service"') &&
      Object.values(smoke).every(Boolean)
        ? "GREEN"
        : "NOT GREEN",
    before: {
      catalogApiLines: countLines(baselineSource),
      catalogApiBytes: Buffer.byteLength(baselineSource, "utf8"),
    },
    after: {
      catalogApiLines: countLines(currentSource),
      catalogApiBytes: Buffer.byteLength(currentSource, "utf8"),
      familyFiles,
    },
    checks: {
      facadeBridgePresent: currentSource.includes('from "./catalog/catalog.facade"'),
      oldBodiesRemoved: removedBodies.every((marker) => !currentSource.includes(marker)),
      familyFilesPresent: familyFiles.every((file) => fs.existsSync(path.join(projectRoot, file))),
      facadeExportsSearch: facadeSource.includes('from "./catalog.search.service"'),
      facadeExportsLookup: facadeSource.includes('from "./catalog.lookup.service"'),
    },
    smoke,
  };

  const beforeAfter = [
    "Catalog API Wave 1",
    `before_lines=${summary.before.catalogApiLines}`,
    `after_lines=${summary.after.catalogApiLines}`,
    `before_bytes=${summary.before.catalogApiBytes}`,
    `after_bytes=${summary.after.catalogApiBytes}`,
    "",
    "moved:",
    "- catalog public types",
    "- search service",
    "- lookup service",
    "- transport, parsers, normalizers, observability",
    "",
    "catalog_api now keeps:",
    "- request/proposal/draft/business flows",
    "- compatibility facade re-exports for catalog family",
  ].join("\n");

  writeJson(summaryPath, summary);
  writeJson(smokePath, smoke);
  fs.mkdirSync(path.dirname(beforeAfterPath), { recursive: true });
  fs.writeFileSync(beforeAfterPath, `${beforeAfter}\n`);

  console.log(
    JSON.stringify(
      {
        status: summary.status,
        beforeLines: summary.before.catalogApiLines,
        afterLines: summary.after.catalogApiLines,
        smoke,
      },
      null,
      2,
    ),
  );

  if (summary.status !== "GREEN") {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
