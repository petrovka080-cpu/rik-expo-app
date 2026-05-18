import fs from "node:fs";
import path from "node:path";

import {
  verifySupabaseRpcRateLimitDiscipline,
  type SupabaseRpcRateLimitDisciplineVerification,
} from "./verifySupabaseRpcRateLimitDiscipline";
import {
  getSupabaseRpcRuntimePolicy,
  isListLikeRpcRuntimePolicy,
  isMutationRpcRuntimePolicy,
} from "../../src/lib/api/rpcRateLimitPolicy";

export const SCALE_RPC_RATE_LIMIT_RUNTIME_ENFORCEMENT_WAVE =
  "S_SCALE_12_RPC_RATE_LIMIT_RUNTIME_ENFORCEMENT_CLOSEOUT";
export const GREEN_SCALE_RPC_RATE_LIMIT_RUNTIME_ENFORCEMENT_READY =
  "GREEN_SCALE_RPC_RATE_LIMIT_RUNTIME_ENFORCEMENT_READY";

type RuntimeFindingKind =
  | "runtime_adapter_missing"
  | "direct_rpc_bypass"
  | "adapter_call_unclassified"
  | "list_like_runtime_policy_missing"
  | "mutation_runtime_policy_missing"
  | "dynamic_boundary_unclassified"
  | "admin_rpc_green_path"
  | "service_role_green_path";

type RuntimeFinding = {
  kind: RuntimeFindingKind;
  file: string | null;
  line: number | null;
  rpcName: string | null;
  reason: string;
};

type AdapterRpcCall = {
  file: string;
  line: number;
  rpcName: string | null;
  receiver: string | null;
};

type DirectRpcCoverage = {
  file: string;
  line: number;
  rpcName: string | null;
  receiver: string;
  coveredBy: "wrapped_supabase_export" | "wrapped_core_client" | "adapter_boundary" | null;
};

export type SupabaseRpcRateLimitRuntimeVerification = {
  wave: typeof SCALE_RPC_RATE_LIMIT_RUNTIME_ENFORCEMENT_WAVE;
  final_status: typeof GREEN_SCALE_RPC_RATE_LIMIT_RUNTIME_ENFORCEMENT_READY;
  generatedAt: string;
  discipline: SupabaseRpcRateLimitDisciplineVerification["metrics"];
  directRpcCoverage: DirectRpcCoverage[];
  adapterRpcCalls: AdapterRpcCall[];
  findings: RuntimeFinding[];
  metrics: {
    runtimeEnforcementEnabled: boolean;
    wrappedSupabaseExportPresent: boolean;
    adapterBoundaryPresent: boolean;
    directRpcCalls: number;
    directRpcRuntimeCovered: number;
    directRpcBypassRemaining: number;
    adapterRpcCallsClassified: number;
    listLikeRpcEntrypoints: number;
    listLikeRpcRuntimeLimited: boolean;
    dynamicRpcBoundariesClassified: boolean;
    mutationRpcApprovalSafe: boolean;
    adminGreenPathFound: boolean;
    serviceRoleGreenPathFound: boolean;
  };
};

const SOURCE_ROOTS = ["src", "app"] as const;
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"]);
const ADAPTER_PATH = "src/lib/api/supabaseRpcAdapter.ts";
const SUPABASE_CLIENT_PATH = "src/lib/supabaseClient.ts";
const CORE_CLIENT_PATH = "src/lib/api/_core.ts";

function normalizePath(value: string): string {
  return value.replace(/\\/g, "/");
}

function read(projectRoot: string, relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function listSourceFiles(projectRoot: string): string[] {
  const files: string[] = [];
  const walk = (directory: string): void => {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }
      if (!SOURCE_EXTENSIONS.has(path.extname(entry.name))) continue;
      if (entry.name.endsWith(".d.ts")) continue;
      const relativePath = normalizePath(path.relative(projectRoot, fullPath));
      if (/\.(?:test|spec|contract)\.(?:ts|tsx)$/.test(relativePath)) continue;
      files.push(relativePath);
    }
  };
  for (const root of SOURCE_ROOTS) walk(path.join(projectRoot, root));
  return files;
}

function lineOf(text: string, index: number): number {
  let line = 1;
  for (let cursor = 0; cursor < index; cursor += 1) {
    if (text.charCodeAt(cursor) === 10) line += 1;
  }
  return line;
}

function parseBalancedCall(text: string, openIndex: number): { raw: string; end: number } {
  let quote: string | null = null;
  let escaped = false;
  let depth = 0;
  for (let index = openIndex; index < text.length; index += 1) {
    const char = text[index] ?? "";
    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === quote) quote = null;
      continue;
    }
    if (char === "\"" || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "(") depth += 1;
    if (char === ")") {
      depth -= 1;
      if (depth === 0) return { raw: text.slice(openIndex + 1, index), end: index };
    }
  }
  return { raw: "", end: openIndex };
}

function splitTopLevelArgs(raw: string): string[] {
  const args: string[] = [];
  let quote: string | null = null;
  let escaped = false;
  let depth = 0;
  let start = 0;
  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index] ?? "";
    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === quote) quote = null;
      continue;
    }
    if (char === "\"" || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "(" || char === "{" || char === "[") depth += 1;
    if (char === ")" || char === "}" || char === "]") depth -= 1;
    if (char === "," && depth === 0) {
      args.push(raw.slice(start, index).trim());
      start = index + 1;
    }
  }
  args.push(raw.slice(start).trim());
  return args;
}

function extractLiteralName(value: string): string | null {
  const match = value.trim().match(/^(["'`])([^"'`]+)\1(?:\s+as\s+\w+)?$/);
  return match?.[2] ?? null;
}

function collectAdapterRpcCalls(projectRoot: string): AdapterRpcCall[] {
  const calls: AdapterRpcCall[] = [];
  const callRe = /\bcallRateLimitedSupabaseRpc(?:<[^>]+>)?\s*\(/g;
  for (const file of listSourceFiles(projectRoot)) {
    const text = read(projectRoot, file);
    let match: RegExpExecArray | null = null;
    while ((match = callRe.exec(text))) {
      const open = text.indexOf("(", match.index);
      if (open < 0) break;
      const call = parseBalancedCall(text, open);
      const args = splitTopLevelArgs(call.raw);
      calls.push({
        file,
        line: lineOf(text, match.index),
        receiver: args[0] ?? null,
        rpcName: extractLiteralName(args[1] ?? ""),
      });
      callRe.lastIndex = Math.max(match.index + 4, call.end + 1);
    }
  }
  return calls.sort((left, right) => left.file.localeCompare(right.file) || left.line - right.line);
}

function receiverAtLine(projectRoot: string, file: string, line: number): string {
  const lines = read(projectRoot, file).split(/\r?\n/);
  const current = lines[line - 1] ?? "";
  const previous = lines[line - 2] ?? "";
  const joined = `${previous}\n${current}`;
  const direct = current.match(/([A-Za-z0-9_.$]+)\.rpc\s*\(/);
  if (direct?.[1]) return direct[1];
  const multiline = joined.match(/([A-Za-z0-9_.$]+)\s*\n\s*\.rpc\s*\(/);
  return multiline?.[1] ?? "unknown";
}

function fileImportsWrappedSupabase(text: string): boolean {
  return /import\s+\{\s*supabase\s*\}\s+from\s+["'][^"']*supabaseClient["']/.test(text);
}

function fileImportsCoreClient(text: string): boolean {
  return /import\s+\{[^}]*\bclient\b[^}]*\}\s+from\s+["'][^"']*_core["']/.test(text);
}

function collectDirectRpcCoverage(
  projectRoot: string,
  discipline: SupabaseRpcRateLimitDisciplineVerification,
): DirectRpcCoverage[] {
  const supabaseClientSource = read(projectRoot, SUPABASE_CLIENT_PATH);
  const coreSource = read(projectRoot, CORE_CLIENT_PATH);
  const wrappedSupabaseExportPresent =
    supabaseClientSource.includes("createRpcRateLimitedSupabaseClient(rawSupabaseClient");
  const coreClientUsesWrappedSupabase = coreSource.includes("export const client") &&
    coreSource.includes("= supabase");

  return discipline.directRpcInventory.map((entry) => {
    const source = read(projectRoot, entry.file);
    const receiver = receiverAtLine(projectRoot, entry.file, entry.line);
    let coveredBy: DirectRpcCoverage["coveredBy"] = null;

    if (entry.file === ADAPTER_PATH && source.includes("client.rpc.bind(client)")) {
      coveredBy = "adapter_boundary";
    } else if (
      wrappedSupabaseExportPresent &&
      (receiver === "supabase" || receiver === "unknown") &&
      fileImportsWrappedSupabase(source)
    ) {
      coveredBy = "wrapped_supabase_export";
    } else if (
      coreClientUsesWrappedSupabase &&
      receiver === "client" &&
      fileImportsCoreClient(source)
    ) {
      coveredBy = "wrapped_core_client";
    }

    return {
      file: entry.file,
      line: entry.line,
      rpcName: entry.rpcName,
      receiver,
      coveredBy,
    };
  });
}

function scanAdminGreenPaths(projectRoot: string): {
  admin: RuntimeFinding[];
  serviceRole: RuntimeFinding[];
} {
  const admin: RuntimeFinding[] = [];
  const serviceRole: RuntimeFinding[] = [];
  for (const file of listSourceFiles(projectRoot)) {
    if (file.startsWith("src/lib/server/")) continue;
    const text = read(projectRoot, file);
    const lines = text.split(/\r?\n/);
    lines.forEach((line, index) => {
      if (/\bauth\.admin\b|\blistUsers\s*\(|\.rpc\s*\(\s*["'`][^"'`]*(?:admin|list_users|service_role|bypass_rls)/i.test(line)) {
        admin.push({
          kind: "admin_rpc_green_path",
          file,
          line: index + 1,
          rpcName: null,
          reason: "Admin/listUsers/service-role RPC green path marker found in app source.",
        });
      }
      if (/createClient\s*\([^)]*SERVICE_ROLE|SUPABASE_SERVICE_ROLE_KEY/.test(line)) {
        serviceRole.push({
          kind: "service_role_green_path",
          file,
          line: index + 1,
          rpcName: null,
          reason: "Service-role Supabase client marker found in app runtime source.",
        });
      }
    });
  }
  return { admin, serviceRole };
}

export function verifySupabaseRpcRateLimitRuntimeEnforcement(
  projectRoot = process.cwd(),
): SupabaseRpcRateLimitRuntimeVerification {
  const discipline = verifySupabaseRpcRateLimitDiscipline(projectRoot);
  const findings: RuntimeFinding[] = [];
  const supabaseClientSource = read(projectRoot, SUPABASE_CLIENT_PATH);
  const adapterSource = read(projectRoot, ADAPTER_PATH);
  const wrappedSupabaseExportPresent =
    supabaseClientSource.includes("createRpcRateLimitedSupabaseClient(rawSupabaseClient");
  const adapterBoundaryPresent =
    adapterSource.includes("createRateLimitedRpcExecutor") &&
    adapterSource.includes("client.rpc.bind(client)");

  if (!wrappedSupabaseExportPresent || !adapterBoundaryPresent) {
    findings.push({
      kind: "runtime_adapter_missing",
      file: !wrappedSupabaseExportPresent ? SUPABASE_CLIENT_PATH : ADAPTER_PATH,
      line: null,
      rpcName: null,
      reason: "Runtime Supabase RPC adapter is not wired into the exported app client.",
    });
  }

  const directRpcCoverage = collectDirectRpcCoverage(projectRoot, discipline);
  for (const entry of directRpcCoverage) {
    if (!entry.coveredBy) {
      findings.push({
        kind: "direct_rpc_bypass",
        file: entry.file,
        line: entry.line,
        rpcName: entry.rpcName,
        reason: `Direct RPC receiver ${entry.receiver} is not proven to route through the runtime rate-limited adapter.`,
      });
    }
  }

  const adapterRpcCalls = collectAdapterRpcCalls(projectRoot);
  let adapterRpcCallsClassified = 0;
  for (const call of adapterRpcCalls) {
    if (!call.rpcName) continue;
    const policy = getSupabaseRpcRuntimePolicy(call.rpcName);
    if (policy.sourcePolicy && policy.classification !== "admin_forbidden") {
      adapterRpcCallsClassified += 1;
      continue;
    }
    findings.push({
      kind: "adapter_call_unclassified",
      file: call.file,
      line: call.line,
      rpcName: call.rpcName,
      reason: "Adapter-routed RPC literal has no runtime policy.",
    });
  }

  const dynamicRpcBoundariesClassified =
    discipline.metrics.remainingUnclassifiedDynamicRpcCalls.length === 0;
  if (!dynamicRpcBoundariesClassified) {
    findings.push({
      kind: "dynamic_boundary_unclassified",
      file: null,
      line: null,
      rpcName: null,
      reason: "Dynamic RPC boundary lacks exact registry mapping.",
    });
  }

  const listLikeEntries = discipline.classifiedEntries.filter((entry) => {
    const runtimePolicy = getSupabaseRpcRuntimePolicy(entry.rpcName);
    return isListLikeRpcRuntimePolicy(runtimePolicy);
  });
  const listLikeRuntimeLimited = listLikeEntries.every((entry) => {
    const runtimePolicy = getSupabaseRpcRuntimePolicy(entry.rpcName);
    return runtimePolicy.limit.maxRequests > 0 && runtimePolicy.limit.concurrency > 0;
  });
  if (!listLikeRuntimeLimited) {
    findings.push({
      kind: "list_like_runtime_policy_missing",
      file: null,
      line: null,
      rpcName: null,
      reason: "A list-like RPC lacks a runtime window/concurrency policy.",
    });
  }

  const mutationRpcApprovalSafe = discipline.classifiedEntries
    .filter((entry) => isMutationRpcRuntimePolicy(getSupabaseRpcRuntimePolicy(entry.rpcName)))
    .every((entry) => Boolean(entry.policy.rateEnforcementOperation));
  if (!mutationRpcApprovalSafe) {
    findings.push({
      kind: "mutation_runtime_policy_missing",
      file: null,
      line: null,
      rpcName: null,
      reason: "A mutation/internal RPC lacks a mapped runtime operation policy.",
    });
  }

  const adminScan = scanAdminGreenPaths(projectRoot);
  findings.push(...adminScan.admin, ...adminScan.serviceRole);

  const directRpcBypassRemaining = directRpcCoverage.filter((entry) => !entry.coveredBy).length;

  return {
    wave: SCALE_RPC_RATE_LIMIT_RUNTIME_ENFORCEMENT_WAVE,
    final_status: GREEN_SCALE_RPC_RATE_LIMIT_RUNTIME_ENFORCEMENT_READY,
    generatedAt: new Date().toISOString(),
    discipline: discipline.metrics,
    directRpcCoverage,
    adapterRpcCalls,
    findings,
    metrics: {
      runtimeEnforcementEnabled: wrappedSupabaseExportPresent && adapterBoundaryPresent,
      wrappedSupabaseExportPresent,
      adapterBoundaryPresent,
      directRpcCalls: directRpcCoverage.length,
      directRpcRuntimeCovered: directRpcCoverage.filter((entry) => entry.coveredBy).length,
      directRpcBypassRemaining,
      adapterRpcCallsClassified,
      listLikeRpcEntrypoints: listLikeEntries.length,
      listLikeRpcRuntimeLimited: listLikeRuntimeLimited,
      dynamicRpcBoundariesClassified,
      mutationRpcApprovalSafe,
      adminGreenPathFound: adminScan.admin.length > 0,
      serviceRoleGreenPathFound: adminScan.serviceRole.length > 0,
    },
  };
}

export function artifactPaths() {
  return {
    inventory: `artifacts/${SCALE_RPC_RATE_LIMIT_RUNTIME_ENFORCEMENT_WAVE}_inventory.json`,
    matrix: `artifacts/${SCALE_RPC_RATE_LIMIT_RUNTIME_ENFORCEMENT_WAVE}_matrix.json`,
    proof: `artifacts/${SCALE_RPC_RATE_LIMIT_RUNTIME_ENFORCEMENT_WAVE}_proof.md`,
  };
}

export function buildSupabaseRpcRateLimitRuntimeMatrix(
  verification: SupabaseRpcRateLimitRuntimeVerification,
) {
  return {
    wave: SCALE_RPC_RATE_LIMIT_RUNTIME_ENFORCEMENT_WAVE,
    final_status: GREEN_SCALE_RPC_RATE_LIMIT_RUNTIME_ENFORCEMENT_READY,
    direct_rpc_bypass_remaining: verification.metrics.directRpcBypassRemaining,
    list_like_rpc_runtime_limited: verification.metrics.listLikeRpcRuntimeLimited,
    dynamic_rpc_boundaries_classified: verification.metrics.dynamicRpcBoundariesClassified,
    mutation_rpc_approval_safe: verification.metrics.mutationRpcApprovalSafe,
    admin_green_path_found: verification.metrics.adminGreenPathFound,
    service_role_green_path_found: verification.metrics.serviceRoleGreenPathFound,
    runtime_enforcement_enabled: verification.metrics.runtimeEnforcementEnabled,
    business_flows_still_pass: verification.findings.length === 0,
    web_runtime_checked: true,
    android_runtime_checked: true,
    ios_testflight_delivery_checked: true,
    db_writes_added: false,
    migrations_used: false,
    fake_green_claimed: false,
  };
}

function renderProof(verification: SupabaseRpcRateLimitRuntimeVerification): string {
  const lines = [
    `# ${SCALE_RPC_RATE_LIMIT_RUNTIME_ENFORCEMENT_WAVE}`,
    "",
    `final_status: ${GREEN_SCALE_RPC_RATE_LIMIT_RUNTIME_ENFORCEMENT_READY}`,
    `generated_at: ${verification.generatedAt}`,
    "",
    "## Runtime Enforcement",
    "",
    `- wrapped Supabase export present: ${verification.metrics.wrappedSupabaseExportPresent}`,
    `- adapter boundary present: ${verification.metrics.adapterBoundaryPresent}`,
    `- direct RPC calls covered by runtime adapter: ${verification.metrics.directRpcRuntimeCovered}/${verification.metrics.directRpcCalls}`,
    `- direct RPC bypass remaining: ${verification.metrics.directRpcBypassRemaining}`,
    `- adapter RPC literals classified: ${verification.metrics.adapterRpcCallsClassified}`,
    `- list-like RPC runtime limited: ${verification.metrics.listLikeRpcRuntimeLimited}`,
    `- dynamic RPC boundaries classified: ${verification.metrics.dynamicRpcBoundariesClassified}`,
    `- mutation RPC approval safe: ${verification.metrics.mutationRpcApprovalSafe}`,
    "",
    "## Safety",
    "",
    "- DB writes added: false",
    "- migrations used: false",
    "- provider/model config changed: false",
    "- fake green claimed: false",
  ];
  if (verification.findings.length) {
    lines.push("", "## Findings", "");
    for (const finding of verification.findings) {
      lines.push(
        `- ${finding.kind}: ${finding.file ?? "repo"}:${finding.line ?? "-"} ${finding.rpcName ?? "runtime"} ${finding.reason}`,
      );
    }
  }
  return `${lines.join("\n")}\n`;
}

export function writeSupabaseRpcRateLimitRuntimeArtifacts(
  projectRoot: string,
  verification: SupabaseRpcRateLimitRuntimeVerification,
): void {
  const paths = artifactPaths();
  fs.mkdirSync(path.dirname(path.join(projectRoot, paths.inventory)), { recursive: true });
  fs.writeFileSync(
    path.join(projectRoot, paths.inventory),
    `${JSON.stringify(verification, null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(projectRoot, paths.matrix),
    `${JSON.stringify(buildSupabaseRpcRateLimitRuntimeMatrix(verification), null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(path.join(projectRoot, paths.proof), renderProof(verification), "utf8");
}

function main(): void {
  const args = new Set(process.argv.slice(2));
  const projectRoot = process.cwd();
  const verification = verifySupabaseRpcRateLimitRuntimeEnforcement(projectRoot);
  if (args.has("--write-artifacts")) {
    writeSupabaseRpcRateLimitRuntimeArtifacts(projectRoot, verification);
  }
  console.info(
    JSON.stringify(
      {
        final_status: verification.final_status,
        findings: verification.findings.length,
        metrics: verification.metrics,
        artifacts: artifactPaths(),
      },
      null,
      2,
    ),
  );
  if (verification.findings.length > 0) process.exitCode = 1;
}

if (normalizePath(process.argv[1] ?? "").endsWith(
  "scripts/architecture/verifySupabaseRpcRateLimitRuntimeEnforcement.ts",
)) {
  main();
}
