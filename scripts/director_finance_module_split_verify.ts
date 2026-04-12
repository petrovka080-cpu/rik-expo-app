import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = process.cwd();
const artifactsDir = path.join(repoRoot, "artifacts");
const targetPath = path.join(repoRoot, "src", "screens", "director", "director.finance.ts");
const typesPath = path.join(repoRoot, "src", "screens", "director", "director.finance.types.ts");
const sharedPath = path.join(repoRoot, "src", "screens", "director", "director.finance.shared.ts");
const computePath = path.join(repoRoot, "src", "screens", "director", "director.finance.compute.ts");
const rpcPath = path.join(repoRoot, "src", "screens", "director", "director.finance.rpc.ts");

mkdirSync(artifactsDir, { recursive: true });

const readText = (filePath: string) => readFileSync(filePath, "utf8");
const lineCount = (text: string) => text.split(/\r?\n/).length;

const currentText = readText(targetPath);
const currentBytes = Buffer.byteLength(currentText);
const currentLines = lineCount(currentText);

let previousText = "";
try {
  previousText = execFileSync("git", ["show", "HEAD:src/screens/director/director.finance.ts"], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
} catch {
  previousText = "";
}

const previousBytes = previousText ? Buffer.byteLength(previousText) : null;
const previousLines = previousText ? lineCount(previousText) : null;

async function main() {
  const financeModule = await import(pathToFileURL(targetPath).href);
  const requiredExports = [
    "financeText",
    "money",
    "mapToFinanceRow",
    "normalizeFinSpendRows",
    "normalizeFinSupplierInput",
    "fetchDirectorFinancePanelScopeV3ViaRpc",
    "fetchDirectorFinancePanelScopeV4ViaRpc",
    "fetchDirectorFinanceSummaryViaRpc",
    "fetchDirectorFinanceSupplierScopeV2ViaRpc",
  ];

  const exportContract = requiredExports.map((name) => ({
    name,
    present: typeof financeModule[name] === "function",
  }));

  const modulePresence = [typesPath, sharedPath, computePath, rpcPath].map((filePath) => ({
    path: path.relative(repoRoot, filePath).replace(/\\/g, "/"),
    bytes: Buffer.byteLength(readText(filePath)),
    lines: lineCount(readText(filePath)),
  }));

  const splitSummary = {
    gate: "director_finance_module_split_verify",
    status:
      exportContract.every((item) => item.present) &&
      currentLines < 120 &&
      modulePresence.length === 4
        ? "GREEN"
        : "NOT_GREEN",
    current: {
      bytes: currentBytes,
      lines: currentLines,
    },
    previous:
      previousBytes != null && previousLines != null
        ? {
            bytes: previousBytes,
            lines: previousLines,
          }
        : null,
    reduction:
      previousBytes != null && previousLines != null
        ? {
            bytes: previousBytes - currentBytes,
            lines: previousLines - currentLines,
          }
        : null,
    modules: modulePresence,
  };

  writeFileSync(
    path.join(artifactsDir, "director-finance-export-contract.json"),
    JSON.stringify(
      {
        gate: "director_finance_export_contract",
        exports: exportContract,
      },
      null,
      2,
    ) + "\n",
  );

  writeFileSync(
    path.join(artifactsDir, "director-finance-module-split.json"),
    JSON.stringify(splitSummary, null, 2) + "\n",
  );

  writeFileSync(
    path.join(artifactsDir, "director-finance-wave1-summary.json"),
    JSON.stringify(
      {
        gate: "director_finance_wave1",
        status: splitSummary.status,
        file: "src/screens/director/director.finance.ts",
        currentBytes,
        currentLines,
        previousBytes,
        previousLines,
      },
      null,
      2,
    ) + "\n",
  );

  if (splitSummary.status !== "GREEN") {
    process.exitCode = 1;
  }
}

void main();
