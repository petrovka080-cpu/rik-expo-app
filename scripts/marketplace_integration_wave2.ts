import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const projectRoot = process.cwd();
const sourceArtifactPath = path.join(projectRoot, "artifacts/marketplace.json");
const sourceSummaryPath = path.join(projectRoot, "artifacts/marketplace.summary.json");
const wave2ArtifactPath = path.join(projectRoot, "artifacts/marketplace-integration-wave2.json");
const wave2SummaryPath = path.join(projectRoot, "artifacts/marketplace-integration-wave2.summary.json");

const writeJson = (fullPath: string, payload: unknown) => {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`);
};

const runWave1 = () => {
  if (process.platform === "win32") {
    return spawnSync("cmd.exe", ["/d", "/s", "/c", "npx tsx scripts/marketplace_integration_wave1.ts"], {
      cwd: projectRoot,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
    });
  }

  return spawnSync("npx", ["tsx", "scripts/marketplace_integration_wave1.ts"], {
    cwd: projectRoot,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
};

const readJson = (fullPath: string) => JSON.parse(fs.readFileSync(fullPath, "utf8")) as Record<string, unknown>;

const result = runWave1();

if (!fs.existsSync(sourceArtifactPath) || !fs.existsSync(sourceSummaryPath)) {
  throw new Error(
    `marketplace wave1 artifacts are missing after runtime: ${sourceArtifactPath} / ${sourceSummaryPath}`,
  );
}

const artifact = readJson(sourceArtifactPath);
const summary = readJson(sourceSummaryPath);

const wave2Summary = {
  ...summary,
  gate: summary.gate ?? (summary.status === "passed" ? "GREEN" : "NOT_GREEN"),
  marketplaceIntegrated: summary.marketplaceIntegrated === true,
  addToRequestWorks: summary.addToRequestWorks === true,
  createProposalWorks: summary.createProposalWorks === true,
  paginationWorks: summary.paginationWorks === true,
  buyerSeesItems: summary.buyerSeesItems === true,
};

const wave2Artifact = {
  ...artifact,
  summary: wave2Summary,
  sourceScript: "scripts/marketplace_integration_wave1.ts",
  wrapperScript: "scripts/marketplace_integration_wave2.ts",
  spawned: {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  },
};

writeJson(wave2ArtifactPath, wave2Artifact);
writeJson(wave2SummaryPath, wave2Summary);

if (result.stdout) {
  process.stdout.write(result.stdout);
}
if (result.stderr) {
  process.stderr.write(result.stderr);
}

console.log(JSON.stringify(wave2Summary, null, 2));
if (result.status && result.status !== 0) {
  process.exitCode = result.status;
}
