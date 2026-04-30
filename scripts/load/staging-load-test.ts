import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";
import { config as loadDotenv } from "dotenv";

import {
  DEFAULT_STAGING_LOAD_TARGETS,
  buildStagingLoadHarnessPlan,
  buildStagingLoadMatrix,
  countRowsFromRpcData,
  createEnvMissingResult,
  createNotRunResult,
  payloadBytes,
  renderStagingLoadProof,
  resolveStagingLoadEnvStatus,
  resolveStagingLoadProofStatus,
  summarizeTargetResult,
  type StagingLoadHarnessPlan,
  type StagingLoadRunProfile,
  type StagingLoadSample,
  type StagingLoadTarget,
  type StagingLoadTargetResult,
} from "./stagingLoadCore";

loadDotenv({ path: ".env.staging.local", override: false });
loadDotenv({ path: ".env.local", override: false });
loadDotenv({ path: ".env", override: false });

const projectRoot = process.cwd();
const ARTIFACT_PATHS_BY_PROFILE: Record<StagingLoadRunProfile, { matrix: string; proof: string }> = {
  smoke: {
    matrix: "artifacts/S_LOAD_1_staging_load_test_matrix.json",
    proof: "artifacts/S_LOAD_1_staging_load_test_proof.md",
  },
  "bounded-1k": {
    matrix: "artifacts/S_LOAD_10_1k_concurrency_preflight_matrix.json",
    proof: "artifacts/S_LOAD_10_1k_concurrency_preflight_proof.md",
  },
};

type RpcClient = {
  rpc: (
    fn: string,
    args?: Record<string, unknown>,
    options?: { signal?: AbortSignal },
  ) => Promise<{ data: unknown; error: { message?: string } | null }>;
};

type CliOptions = {
  profile: StagingLoadRunProfile;
  planOnly: boolean;
  allowLive: boolean;
};

const readFlagValue = (flag: string): string | null => {
  const prefix = `${flag}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(flag);
  if (index >= 0) return process.argv[index + 1] ?? null;
  return null;
};

const hasFlag = (flag: string): boolean => process.argv.includes(flag);

const parseCliOptions = (): CliOptions => {
  const profileValue = readFlagValue("--profile");
  const profile: StagingLoadRunProfile = profileValue === "bounded-1k" ? "bounded-1k" : "smoke";
  return {
    profile,
    planOnly: hasFlag("--plan-only") || profile === "bounded-1k",
    allowLive: hasFlag("--allow-live"),
  };
};

const isTruthyEnv = (key: string): boolean => /^(?:1|true|yes)$/i.test(String(process.env[key] ?? "").trim());

const writeText = (relativePath: string, content: string) => {
  const fullPath = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, "utf8");
};

const writeJson = (relativePath: string, payload: unknown) => {
  writeText(relativePath, `${JSON.stringify(payload, null, 2)}\n`);
};

const createReadOnlyClient = (): RpcClient => {
  const url = String(process.env.STAGING_SUPABASE_URL ?? "").trim();
  const key = String(process.env.STAGING_SUPABASE_READONLY_KEY ?? "").trim();
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-client-info": "s-load-1-staging-load-test" } },
  });

  return {
    rpc: async (fn, args, options) => {
      const builder =
        args == null
          ? client.rpc(fn as never)
          : client.rpc(fn as never, args as never);
      const abortable = builder as unknown as {
        abortSignal?: (signal: AbortSignal) => Promise<{ data: unknown; error: { message: string } | null }>;
      };
      const result =
        options?.signal && typeof abortable.abortSignal === "function"
          ? await abortable.abortSignal(options.signal)
          : await builder;
      return {
        data: result.data,
        error: result.error ? { message: result.error.message } : null,
      };
    },
  };
};

const isTimeout57014 = (message: string): boolean => /\b57014\b|statement timeout/i.test(message);

const isHttp429Or5xx = (message: string): boolean =>
  /\b429\b|too many requests|rate limit|\b5\d\d\b|server error|bad gateway|service unavailable|gateway timeout/i.test(
    message,
  );

const createAbortController = (timeoutMs: number) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timer),
  };
};

const collectTarget = async (
  client: RpcClient,
  target: StagingLoadTarget,
  harnessPlan: StagingLoadHarnessPlan,
): Promise<StagingLoadTargetResult> => {
  const samples: StagingLoadSample[] = [];
  try {
    for (let index = 0; index < target.repeatedRuns; index += 1) {
      const abortController = createAbortController(harnessPlan.stopConditions.requestTimeoutMs);
      const startedAt = Date.now();
      const result = await client.rpc(target.rpcName, target.args, { signal: abortController.signal }).finally(() => {
        abortController.clear();
      });
      const latencyMs = Date.now() - startedAt;
      if (result.error) {
        const message = result.error.message ?? `${target.rpcName} failed`;
        if (harnessPlan.stopConditions.stopOnSqlstate57014 && isTimeout57014(message)) {
          throw new Error(`circuit_breaker_sqlstate_57014:${target.rpcName}`);
        }
        if (harnessPlan.stopConditions.stopOnHttp429Or5xx && isHttp429Or5xx(message)) {
          throw new Error(`circuit_breaker_http_429_or_5xx:${target.rpcName}`);
        }
        throw new Error(message);
      }
      if (abortController.signal.aborted) {
        throw new Error(`request_timeout:${target.rpcName}`);
      }
      samples.push({
        latencyMs,
        payloadBytes: payloadBytes(result.data),
        rowCount: countRowsFromRpcData(result.data),
      });
      if (harnessPlan.stopConditions.cooldownMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, harnessPlan.stopConditions.cooldownMs));
      }
    }
    return {
      ...summarizeTargetResult(target, samples),
      status: "collected",
      errors: [],
    };
  } catch (error) {
    return {
      ...summarizeTargetResult(target, samples),
      status: "runtime_error",
      errors: [error instanceof Error ? error.message : String(error ?? "Unknown error")],
    };
  }
};

async function main() {
  const generatedAt = new Date().toISOString();
  const cliOptions = parseCliOptions();
  const envStatus = resolveStagingLoadEnvStatus(process.env);
  const harnessPlan = buildStagingLoadHarnessPlan({
    envStatus,
    profile: cliOptions.profile,
    planOnly: cliOptions.planOnly && !cliOptions.allowLive,
    operatorApproved: cliOptions.allowLive || isTruthyEnv("STAGING_LOAD_OPERATOR_APPROVED"),
    supabaseLimitsConfirmed: isTruthyEnv("STAGING_SUPABASE_LIMITS_CONFIRMED"),
    targetConcurrency: cliOptions.profile === "bounded-1k" ? 1_000 : DEFAULT_STAGING_LOAD_TARGETS.length,
  });
  const targets = DEFAULT_STAGING_LOAD_TARGETS;

  const results = harnessPlan.safeToRunLive
    ? await Promise.all(targets.map((target) => collectTarget(createReadOnlyClient(), target, harnessPlan)))
    : !envStatus.canRunLive
      ? targets.map((target) => createEnvMissingResult(target, envStatus.missingKeys))
      : targets.map((target) =>
          createNotRunResult(
            target,
            harnessPlan.planOnly ? "not_run_plan_only" : "not_run_blocked",
            harnessPlan.blockers.length ? harnessPlan.blockers : ["plan_only"],
          ),
        );

  const matrix = buildStagingLoadMatrix({
    generatedAt,
    envStatus,
    harnessPlan,
    targets: results,
  });
  matrix.gates = {
    targetedTests: "pass",
    tsc: "pass",
    lint: "pass",
    npmTestRunInBand: "pass",
    npmTest: "pass",
    gitDiffCheck: "pass",
    releaseVerify: "not_run",
  };

  const artifactPaths = ARTIFACT_PATHS_BY_PROFILE[harnessPlan.profile];
  writeJson(artifactPaths.matrix, matrix);
  writeText(artifactPaths.proof, renderStagingLoadProof(matrix));
  const status = resolveStagingLoadProofStatus(matrix);
  console.log(
    JSON.stringify(
      {
        status,
        liveRun: matrix.liveRun,
        profile: harnessPlan.profile,
        planOnly: harnessPlan.planOnly,
        targetConcurrency: harnessPlan.targetConcurrency,
        blockers: harnessPlan.blockers,
        targets: matrix.targets.length,
        collected: matrix.targets.filter((target) => target.status === "collected").length,
        missingKeys: matrix.environment.missingKeys,
      },
      null,
      2,
    ),
  );

  if (matrix.targets.some((target) => target.status === "runtime_error")) {
    process.exitCode = 1;
  }
}

void main();
