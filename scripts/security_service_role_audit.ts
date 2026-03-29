import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const projectRoot = process.cwd();
const distDir = path.join(projectRoot, "dist");
const bundleAuditPath = path.join(projectRoot, "artifacts", "security-service-role-bundle-audit.txt");
const proofPath = path.join(projectRoot, "artifacts", "security-service-role-proof.json");
const envBoundaryPath = path.join(projectRoot, "artifacts", "env-boundary-map.json");

type AuditStatus = "GREEN" | "NOT_GREEN";
type SourceOccurrenceClass = "client_risk" | "server_only" | "server_utility" | "other";
type SourceOccurrence = {
  path: string;
  classification: SourceOccurrenceClass;
  lineCount: number;
};
type BundleHit = {
  path: string;
  type: "identifier" | "literal_secret" | "server_module_trace";
};

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}

function toPosix(relativePath: string) {
  return relativePath.replace(/\\/g, "/");
}

function listFiles(rootPath: string, options?: { includeBinary?: boolean }): string[] {
  if (!fs.existsSync(rootPath)) return [];
  const out: string[] = [];
  const queue = [rootPath];
  while (queue.length > 0) {
    const current = queue.pop();
    if (!current) continue;
    const stat = fs.statSync(current);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(current)) {
        const next = path.join(current, entry);
        const rel = toPosix(path.relative(projectRoot, next));
        if (
          rel.startsWith("node_modules/") ||
          rel.startsWith(".git/") ||
          rel.startsWith("dist-stale-1774772714/") ||
          rel.startsWith("artifacts/security-service-role-export/")
        ) {
          continue;
        }
        queue.push(next);
      }
      continue;
    }
    if (!options?.includeBinary) {
      const ext = path.extname(current).toLowerCase();
      if (![".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".env", ".txt"].includes(ext)) {
        continue;
      }
    }
    out.push(current);
  }
  return out.sort();
}

function parseEnvKeys(filePath: string): string[] {
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, "utf8");
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => line.slice(0, line.indexOf("=")).trim());
}

function classifySourcePath(relativePath: string): SourceOccurrenceClass {
  if (relativePath.startsWith("app/")) return "client_risk";
  if (relativePath.startsWith("src/lib/server/")) return "server_only";
  if (relativePath.startsWith("src/") && relativePath.includes(".server.")) return "server_only";
  if (relativePath.startsWith("src/")) return "client_risk";
  if (relativePath.startsWith("scripts/") || relativePath.startsWith("supabase/functions/")) {
    return "server_utility";
  }
  return "other";
}

function countOccurrences(source: string, term: string) {
  if (!term) return 0;
  return source.split(term).length - 1;
}

function scanSourceOccurrences(term: string): SourceOccurrence[] {
  const roots = ["src", "app", "scripts", "supabase/functions"];
  const files = roots.flatMap((relative) => listFiles(path.join(projectRoot, relative)));
  const seen = new Set<string>();
  const results: SourceOccurrence[] = [];

  for (const filePath of files) {
    const relativePath = toPosix(path.relative(projectRoot, filePath));
    if (seen.has(relativePath)) continue;
    seen.add(relativePath);
    const source = fs.readFileSync(filePath, "utf8");
    const lineCount = countOccurrences(source, term);
    if (lineCount <= 0) continue;
    results.push({
      path: relativePath,
      classification: classifySourcePath(relativePath),
      lineCount,
    });
  }

  return results.sort((left, right) => left.path.localeCompare(right.path));
}

function scanClientRiskImportsForServerModules(): string[] {
  const clientRiskRoots = ["src", "app"];
  const files = clientRiskRoots.flatMap((relative) => listFiles(path.join(projectRoot, relative)));
  const hits: string[] = [];
  const serverImportPattern = /(?:from\s+["'][^"']*\/server\/[^"']*["'])|(?:import\(\s*["'][^"']*\/server\/[^"']*["']\s*\))/;

  for (const filePath of files) {
    const relativePath = toPosix(path.relative(projectRoot, filePath));
    if (relativePath.startsWith("src/lib/server/")) continue;
    if (relativePath.includes(".server.")) continue;
    const source = fs.readFileSync(filePath, "utf8");
    if (serverImportPattern.test(source)) {
      hits.push(relativePath);
    }
  }

  return hits.sort();
}

function scanBufferForTerm(files: string[], term: string, type: BundleHit["type"]): BundleHit[] {
  if (!term) return [];
  const needle = Buffer.from(term);
  const hits: BundleHit[] = [];

  for (const filePath of files) {
    const buffer = fs.readFileSync(filePath);
    if (buffer.indexOf(needle) >= 0) {
      hits.push({
        path: toPosix(path.relative(projectRoot, filePath)),
        type,
      });
    }
  }

  return hits;
}

function writeJson(targetPath: string, payload: unknown) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, `${JSON.stringify(payload, null, 2)}\n`);
}

function writeText(targetPath: string, text: string) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, `${text.trimEnd()}\n`);
}

function runExpoExport() {
  const command = process.platform === "win32" ? process.env.ComSpec || "cmd.exe" : "npx";
  const args =
    process.platform === "win32"
      ? ["/d", "/s", "/c", "npx expo export --platform all --output-dir dist --clear"]
      : ["expo", "export", "--platform", "all", "--output-dir", "dist", "--clear"];
  return spawnSync(
    command,
    args,
    {
      cwd: projectRoot,
      env: process.env,
      encoding: "utf8",
      maxBuffer: 256 * 1024 * 1024,
    },
  );
}

async function main() {
  loadEnvFile(path.join(projectRoot, ".env.local"));
  loadEnvFile(path.join(projectRoot, ".env"));

  const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  const secretFingerprint = serviceRoleKey
    ? crypto.createHash("sha256").update(serviceRoleKey).digest("hex").slice(0, 12)
    : null;

  const exportResult = runExpoExport();
  const exportOk = exportResult.status === 0;

  const bundleFiles = listFiles(distDir, { includeBinary: true });
  const sourceOccurrences = scanSourceOccurrences("SUPABASE_SERVICE_ROLE_KEY");
  const clientRiskOccurrences = sourceOccurrences.filter((entry) => entry.classification === "client_risk");
  const serverImportLeaks = scanClientRiskImportsForServerModules();
  const publicEnvKeys = Array.from(
    new Set([
      ...parseEnvKeys(path.join(projectRoot, ".env.example")).filter((key) => key.startsWith("EXPO_PUBLIC_")),
      ...parseEnvKeys(path.join(projectRoot, ".env.local")).filter((key) => key.startsWith("EXPO_PUBLIC_")),
      ...parseEnvKeys(path.join(projectRoot, ".env")).filter((key) => key.startsWith("EXPO_PUBLIC_")),
    ]),
  ).sort();
  const serverEnvKeys = Array.from(
    new Set([
      ...parseEnvKeys(path.join(projectRoot, ".env.local")).filter((key) => !key.startsWith("EXPO_PUBLIC_")),
      ...parseEnvKeys(path.join(projectRoot, ".env")).filter((key) => !key.startsWith("EXPO_PUBLIC_")),
    ]),
  ).sort();

  const publicConfigFiles = [
    path.join(projectRoot, "app.json"),
    path.join(projectRoot, "eas.json"),
    path.join(projectRoot, ".env.example"),
  ].filter((filePath) => fs.existsSync(filePath));
  const publicConfigHits = publicConfigFiles
    .filter((filePath) => fs.readFileSync(filePath, "utf8").includes("SUPABASE_SERVICE_ROLE_KEY"))
    .map((filePath) => toPosix(path.relative(projectRoot, filePath)));

  const bundleIdentifierHits = scanBufferForTerm(bundleFiles, "SUPABASE_SERVICE_ROLE_KEY", "identifier");
  const bundleLiteralSecretHits = serviceRoleKey
    ? scanBufferForTerm(bundleFiles, serviceRoleKey, "literal_secret")
    : [];
  const bundleServerModuleHits = [
    ...scanBufferForTerm(bundleFiles, "serverSupabaseEnv", "server_module_trace"),
    ...scanBufferForTerm(bundleFiles, "serverSupabaseClient", "server_module_trace"),
  ];

  const clientSupabaseModule = await import("../src/lib/supabaseClient");
  const clientSessionResult = await clientSupabaseModule.supabase.auth.getSession();
  const clientFlowOk =
    clientSupabaseModule.SUPABASE_KEY_KIND === "anon" &&
    clientSupabaseModule.isSupabaseEnvValid === true &&
    clientSessionResult?.data != null;

  let serverFlowOk = false;
  let serverFlowError: string | null = null;
  let queueMetricsSample: Record<string, unknown> | null = null;
  try {
    const [{ getServerSupabaseClient, SERVER_SUPABASE_CLIENT_KIND }, { createJobQueueApi }] = await Promise.all([
      import("../src/lib/server/serverSupabaseClient"),
      import("../src/lib/infra/jobQueue"),
    ]);
    const serverSupabase = getServerSupabaseClient();
    const queueApi = createJobQueueApi(serverSupabase);
    const metrics = await queueApi.fetchSubmitJobMetrics();
    serverFlowOk = SERVER_SUPABASE_CLIENT_KIND === "service_role" && typeof metrics.pending === "number";
    queueMetricsSample = metrics;
  } catch (error) {
    serverFlowError = error instanceof Error ? error.message : String(error ?? "unknown");
  }

  const serviceRoleInClientSafeEnv = publicEnvKeys.some((key) => key.includes("SERVICE_ROLE"));
  const serviceRoleInPublicConfig = publicConfigHits.length > 0;
  const sharedImportLeakageClosed = clientRiskOccurrences.length === 0 && serverImportLeaks.length === 0;
  const bundleClean =
    exportOk &&
    bundleIdentifierHits.length === 0 &&
    bundleLiteralSecretHits.length === 0 &&
    bundleServerModuleHits.length === 0;

  const status: AuditStatus =
    !serviceRoleInClientSafeEnv &&
    !serviceRoleInPublicConfig &&
    sharedImportLeakageClosed &&
    bundleClean &&
    clientFlowOk &&
    serverFlowOk
      ? "GREEN"
      : "NOT_GREEN";

  const envBoundaryMap = {
    generatedAt: new Date().toISOString(),
    clientSafeEnvKeys: publicEnvKeys,
    serverOnlyEnvKeys: serverEnvKeys.filter((key) => key === "SUPABASE_SERVICE_ROLE_KEY"),
    boundaryModules: {
      clientEnv: "src/lib/env/clientSupabaseEnv.ts",
      clientSupabase: "src/lib/supabaseClient.ts",
      serverEnv: "src/lib/server/serverSupabaseEnv.ts",
      serverSupabase: "src/lib/server/serverSupabaseClient.ts",
    },
    serverOnlyConsumers: [
      "src/workers/queueWorker.server.ts",
      "scripts/run-queue-worker.ts",
      "scripts/warehouse_name_map_backfill.ts",
    ],
    sourceOccurrences,
    clientRiskImportLeaks: serverImportLeaks,
  };

  const proof = {
    generatedAt: new Date().toISOString(),
    status,
    auditCompleted: true,
    export: {
      ok: exportOk,
      exitCode: exportResult.status,
      error: exportResult.error?.message ?? null,
      command: "npx expo export --platform all --output-dir dist --clear",
    },
    envBoundary: {
      serviceRolePresentLocally: Boolean(serviceRoleKey),
      serviceRoleFingerprint: secretFingerprint,
      serviceRoleInClientSafeEnv,
      serviceRoleInPublicConfig,
      sharedImportLeakageClosed,
      clientRiskOccurrences,
      serverImportLeaks,
    },
    bundleScan: {
      scannedFileCount: bundleFiles.length,
      identifierHits: bundleIdentifierHits,
      literalSecretHits: bundleLiteralSecretHits,
      serverModuleHits: bundleServerModuleHits,
    },
    flows: {
      clientSafeSupabase: {
        ok: clientFlowOk,
        keyKind: clientSupabaseModule.SUPABASE_KEY_KIND,
        envValid: clientSupabaseModule.isSupabaseEnvValid,
      },
      serverOnlySupabase: {
        ok: serverFlowOk,
        error: serverFlowError,
        queueMetricsSample,
      },
    },
  };

  const bundleAuditLines = [
    `status=${status}`,
    `generatedAt=${proof.generatedAt}`,
    `export.ok=${String(exportOk)}`,
    `export.exitCode=${String(exportResult.status ?? "")}`,
    `export.error=${exportResult.error?.message ?? ""}`,
    `serviceRole.presentLocally=${String(Boolean(serviceRoleKey))}`,
    `serviceRole.fingerprint=${secretFingerprint ?? "missing"}`,
    `clientSafeEnvLeak=${String(serviceRoleInClientSafeEnv)}`,
    `publicConfigLeak=${String(serviceRoleInPublicConfig)}`,
    `clientRiskOccurrences=${String(clientRiskOccurrences.length)}`,
    `serverImportLeaks=${String(serverImportLeaks.length)}`,
    `bundleFilesScanned=${String(bundleFiles.length)}`,
    `bundleIdentifierHits=${String(bundleIdentifierHits.length)}`,
    `bundleLiteralSecretHits=${String(bundleLiteralSecretHits.length)}`,
    `bundleServerModuleHits=${String(bundleServerModuleHits.length)}`,
    `clientFlowOk=${String(clientFlowOk)}`,
    `serverFlowOk=${String(serverFlowOk)}`,
    "",
    "[export.stdout]",
    exportResult.stdout || "",
    "",
    "[export.stderr]",
    exportResult.stderr || "",
    "",
    "[clientRiskOccurrences]",
    ...clientRiskOccurrences.map((entry) => `${entry.path} (${entry.lineCount})`),
    "",
    "[serverImportLeaks]",
    ...serverImportLeaks,
    "",
    "[bundleIdentifierHits]",
    ...bundleIdentifierHits.map((entry) => entry.path),
    "",
    "[bundleLiteralSecretHits]",
    ...bundleLiteralSecretHits.map((entry) => entry.path),
    "",
    "[bundleServerModuleHits]",
    ...bundleServerModuleHits.map((entry) => entry.path),
  ];

  writeText(bundleAuditPath, bundleAuditLines.join("\n"));
  writeJson(proofPath, proof);
  writeJson(envBoundaryPath, envBoundaryMap);

  console.log(
    JSON.stringify(
      {
        status,
        exportOk,
        clientRiskOccurrences: clientRiskOccurrences.length,
        bundleIdentifierHits: bundleIdentifierHits.length,
        bundleLiteralSecretHits: bundleLiteralSecretHits.length,
        bundleServerModuleHits: bundleServerModuleHits.length,
        clientFlowOk,
        serverFlowOk,
      },
      null,
      2,
    ),
  );

  if (status !== "GREEN") {
    process.exitCode = 1;
  }
}

void main();
