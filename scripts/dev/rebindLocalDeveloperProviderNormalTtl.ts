import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type Inspect = {
  Config: { Image: string; Env: string[]; Cmd: string[] | null };
  HostConfig: { RestartPolicy?: { Name?: string }; PortBindings?: Record<string, unknown> };
  Mounts: unknown[];
  NetworkSettings: { Networks: Record<string, unknown> };
};

const CONTAINER = "supabase_auth_rik-r52-a7-provider-20260824";
const NORMAL_TTL_SECONDS = 3_600;
const SHORT_TTL_SECONDS = 15;
const OUTPUT = resolve(".release-runtime/r553/evidence/09_R553_LOCAL_PROVIDER_NORMAL_TTL.json");
const MASTER_SHA256 = "5a9e373f94441c8e39d6f0feff7a2ba8e7773a95d0807aff6c89f6535bde11ee";

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function docker(args: string[]): string {
  return execFileSync("docker", args, {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function inspect(): Inspect {
  const rows = JSON.parse(docker(["inspect", CONTAINER])) as Inspect[];
  invariant(rows.length === 1, "R553_LOCAL_AUTH_CONTAINER_IDENTITY_RED");
  return rows[0];
}

function ttlOf(env: readonly string[]): number {
  const raw = env.find((value) => value.startsWith("GOTRUE_JWT_EXP="))?.split("=").slice(1).join("=") ?? "";
  return Number(raw);
}

function replacedEnvironment(env: readonly string[], ttl: number): string[] {
  let replaced = false;
  const result = env.map((value) => {
    if (!value.startsWith("GOTRUE_JWT_EXP=")) return value;
    replaced = true;
    return `GOTRUE_JWT_EXP=${ttl}`;
  });
  invariant(replaced, "R553_LOCAL_AUTH_TTL_SETTING_MISSING");
  return result;
}

function runContainer(original: Inspect, env: readonly string[]): void {
  const networks = Object.keys(original.NetworkSettings.Networks);
  invariant(networks.length === 1, "R553_LOCAL_AUTH_NETWORK_RED");
  const args = ["run", "-d", "--name", CONTAINER, "--network", networks[0]];
  const restart = original.HostConfig.RestartPolicy?.Name;
  if (restart && restart !== "no") args.push("--restart", restart);
  for (const value of env) args.push("--env", value);
  args.push(original.Config.Image, ...(original.Config.Cmd ?? []));
  docker(args);
}

async function waitForHealth(): Promise<void> {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch("http://127.0.0.1:54321/auth/v1/health", {
        signal: AbortSignal.timeout(1_000),
      });
      if (response.ok) return;
    } catch {
      // The replacement container has not joined the provider network yet.
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
  }
  throw new Error("R553_LOCAL_AUTH_NORMAL_TTL_HEALTH_TIMEOUT");
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

async function main(): Promise<void> {
  const original = inspect();
  invariant(original.Config.Image === "public.ecr.aws/supabase/gotrue:v2.189.0", "R553_LOCAL_AUTH_IMAGE_RED");
  invariant(original.Mounts.length === 0, "R553_LOCAL_AUTH_UNEXPECTED_MOUNTS");
  invariant(Object.keys(original.HostConfig.PortBindings ?? {}).length === 0, "R553_LOCAL_AUTH_UNEXPECTED_PORTS");
  const beforeTtl = ttlOf(original.Config.Env);
  invariant([SHORT_TTL_SECONDS, NORMAL_TTL_SECONDS].includes(beforeTtl), `R553_LOCAL_AUTH_TTL_BASELINE_RED:${beforeTtl}`);
  const environmentFingerprintBefore = sha256([...original.Config.Env].sort().join("\n"));
  let recreated = false;
  if (beforeTtl !== NORMAL_TTL_SECONDS) {
    const normalEnv = replacedEnvironment(original.Config.Env, NORMAL_TTL_SECONDS);
    docker(["stop", CONTAINER]);
    docker(["rm", CONTAINER]);
    try {
      runContainer(original, normalEnv);
      recreated = true;
    } catch (error) {
      try {
        runContainer(original, original.Config.Env);
      } catch {
        // Preserve the first exact failure; the caller receives a hard local-infrastructure RED.
      }
      throw error;
    }
  }
  await waitForHealth();
  const current = inspect();
  const afterTtl = ttlOf(current.Config.Env);
  invariant(afterTtl === NORMAL_TTL_SECONDS, `R553_LOCAL_AUTH_NORMAL_TTL_RED:${afterTtl}`);
  const receiptBase = {
    schema_version: "rik-expo-app-r553.local-provider-normal-ttl.v1",
    generated_utc: new Date().toISOString(),
    master_sha256: MASTER_SHA256,
    status: "GREEN_R553_LOCAL_DEVELOPER_NORMAL_TTL_PROFILE",
    container: CONTAINER,
    image: current.Config.Image,
    before_ttl_seconds: beforeTtl,
    normal_ttl_seconds: afterTtl,
    short_ttl_proof_seconds: SHORT_TTL_SECONDS,
    short_ttl_profile_shared_with_normal_runtime: false,
    recreated,
    environment_fingerprint_before: environmentFingerprintBefore,
    environment_fingerprint_after: sha256([...current.Config.Env].sort().join("\n")),
    secret_values_persisted_in_receipt: false,
    provider_data_volume_mutated: false,
    production_accessed: false,
    deployed: false,
    merged: false,
    released: false,
    ota: false,
  };
  atomicJson(OUTPUT, { ...receiptBase, payload_sha256: sha256(JSON.stringify(receiptBase)) });
  process.stdout.write(`${JSON.stringify({ status: receiptBase.status, before_ttl_seconds: beforeTtl, normal_ttl_seconds: afterTtl, recreated })}\n`);
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
