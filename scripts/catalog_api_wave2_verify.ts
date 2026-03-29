import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const projectRoot = process.cwd();
const artifactDir = path.join(projectRoot, "artifacts");
const summaryPath = path.join(artifactDir, "catalog-api-wave2-summary.json");
const splitPath = path.join(artifactDir, "catalog-api-module-split.json");
const contractPath = path.join(artifactDir, "catalog-api-export-contract.json");

const catalogApiPath = "src/lib/catalog_api.ts";
const requestServicePath = "src/lib/catalog/catalog.request.service.ts";
const proposalServicePath = "src/lib/catalog/catalog.proposalCreation.service.ts";
const compatSharedPath = "src/lib/catalog/catalog.compat.shared.ts";

const writeJson = (targetPath: string, payload: unknown) => {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, `${JSON.stringify(payload, null, 2)}\n`);
};

const countLines = (text: string) => text.split(/\r?\n/).length;

async function main() {
  const baselineSource = execSync(`git show HEAD:${catalogApiPath}`, {
    cwd: projectRoot,
    encoding: "utf8",
  });
  const currentSource = fs.readFileSync(path.join(projectRoot, catalogApiPath), "utf8");

  const catalogApi = await import("../src/lib/catalog_api");
  const catalogApiRecord = catalogApi as Record<string, unknown>;

  const smoke = {
    clearLocalDraftIdOk: (() => {
      catalogApi.clearLocalDraftId();
      return catalogApi.getLocalDraftId() === null;
    })(),
    fetchRequestDisplayNoEmptyOk: (await catalogApi.fetchRequestDisplayNo("")) === null,
    fetchRequestDetailsEmptyOk: (await catalogApi.fetchRequestDetails("")) === null,
    listRequestItemsEmptyOk: Array.isArray(await catalogApi.listRequestItems("")) && (await catalogApi.listRequestItems("")).length === 0,
    listForemanRequestsEmptyOk:
      Array.isArray(await catalogApi.listForemanRequests("", 50, null)) &&
      (await catalogApi.listForemanRequests("", 50, null)).length === 0,
    requestItemUpdateQtyGuardOk: await (async () => {
      try {
        await catalogApi.requestItemUpdateQty("", 1);
        return false;
      } catch {
        return true;
      }
    })(),
    requestItemCancelGuardOk: await (async () => {
      try {
        await catalogApi.requestItemCancel("");
        return false;
      } catch {
        return true;
      }
    })(),
    createProposalsExportOk: typeof catalogApi.createProposalsBySupplier === "function",
  };

  const contract = {
    requestExports: [
      "getLocalDraftId",
      "setLocalDraftId",
      "clearLocalDraftId",
      "getOrCreateDraftRequestId",
      "getRequestHeader",
      "fetchRequestDisplayNo",
      "fetchRequestDetails",
      "updateRequestMeta",
      "listRequestItems",
      "requestItemUpdateQty",
      "listForemanRequests",
      "requestItemCancel",
    ].every((key) => typeof catalogApiRecord[key] === "function"),
    proposalExports: ["createProposalsBySupplier"].every((key) => typeof catalogApiRecord[key] === "function"),
    requestTypesReexported:
      currentSource.includes('from "./catalog/catalog.request.service"') &&
      currentSource.includes("RequestMetaPatch"),
    proposalTypesReexported:
      currentSource.includes('from "./catalog/catalog.proposalCreation.service"') &&
      currentSource.includes("CreateProposalsResult"),
  };

  const split = {
    before: {
      lines: countLines(baselineSource),
      bytes: Buffer.byteLength(baselineSource, "utf8"),
    },
    after: {
      lines: countLines(currentSource),
      bytes: Buffer.byteLength(currentSource, "utf8"),
    },
    newFilesPresent: [requestServicePath, proposalServicePath, compatSharedPath].every((relativePath) =>
      fs.existsSync(path.join(projectRoot, relativePath)),
    ),
    requestBodiesRemoved: [
      "export async function getOrCreateDraftRequestId(",
      "export async function getRequestHeader(",
      "export async function fetchRequestDetails(",
      "export async function updateRequestMeta(",
      "export async function listRequestItems(",
      "export async function listForemanRequests(",
      "export async function requestItemCancel(",
    ].every((marker) => !currentSource.includes(marker)),
    proposalBodiesRemoved: [
      "export async function createProposalsBySupplier(",
      "type ProposalCreationPreconditionsResolved = {",
      "async function resolveProposalCreationPreconditions(",
    ].every((marker) => !currentSource.includes(marker)),
  };

  const summary = {
    status:
      split.after.bytes < split.before.bytes &&
      split.newFilesPresent &&
      split.requestBodiesRemoved &&
      split.proposalBodiesRemoved &&
      Object.values(contract).every(Boolean) &&
      Object.values(smoke).every(Boolean)
        ? "GREEN"
        : "NOT GREEN",
    split,
    contract,
    smoke,
  };

  writeJson(summaryPath, summary);
  writeJson(splitPath, split);
  writeJson(contractPath, contract);

  console.log(JSON.stringify(summary, null, 2));

  if (summary.status !== "GREEN") {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
