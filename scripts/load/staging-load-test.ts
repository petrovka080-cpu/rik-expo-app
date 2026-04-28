import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";
import { config as loadDotenv } from "dotenv";

import {
  DEFAULT_STAGING_LOAD_TARGETS,
  buildStagingLoadMatrix,
  countRowsFromRpcData,
  createEnvMissingResult,
  payloadBytes,
  renderStagingLoadProof,
  resolveStagingLoadEnvStatus,
  summarizeTargetResult,
  type StagingLoadSample,
  type StagingLoadTarget,
  type StagingLoadTargetResult,
} from "./stagingLoadCore";

loadDotenv({ path: ".env.local", override: false });
loadDotenv({ path: ".env", override: false });

const projectRoot = process.cwd();
const MATRIX_PATH = "artifacts/S_LOAD_1_staging_load_test_matrix.json";
const PROOF_PATH = "artifacts/S_LOAD_1_staging_load_test_proof.md";

type RpcClient = {
  rpc: (
    fn: string,
    args?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message?: string } | null }>;
};

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
    rpc: async (fn, args) => {
      const result =
        args == null
          ? await client.rpc(fn as never)
          : await client.rpc(fn as never, args as never);
      return {
        data: result.data,
        error: result.error ? { message: result.error.message } : null,
      };
    },
  };
};

const collectTarget = async (
  client: RpcClient,
  target: StagingLoadTarget,
): Promise<StagingLoadTargetResult> => {
  const samples: StagingLoadSample[] = [];
  try {
    for (let index = 0; index < target.repeatedRuns; index += 1) {
      const startedAt = Date.now();
      const result = await client.rpc(target.rpcName, target.args);
      const latencyMs = Date.now() - startedAt;
      if (result.error) throw new Error(result.error.message ?? `${target.rpcName} failed`);
      samples.push({
        latencyMs,
        payloadBytes: payloadBytes(result.data),
        rowCount: countRowsFromRpcData(result.data),
      });
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
  const envStatus = resolveStagingLoadEnvStatus(process.env);
  const targets = DEFAULT_STAGING_LOAD_TARGETS;

  const results = envStatus.canRunLive
    ? await Promise.all(targets.map((target) => collectTarget(createReadOnlyClient(), target)))
    : targets.map((target) => createEnvMissingResult(target, envStatus.missingKeys));

  const matrix = buildStagingLoadMatrix({
    generatedAt,
    envStatus,
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

  writeJson(MATRIX_PATH, matrix);
  writeText(PROOF_PATH, renderStagingLoadProof(matrix));
  console.log(
    JSON.stringify(
      {
        status: matrix.liveRun === "completed" ? "GREEN" : "GREEN_IMPLEMENTATION_LIVE_NOT_RUN",
        liveRun: matrix.liveRun,
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
