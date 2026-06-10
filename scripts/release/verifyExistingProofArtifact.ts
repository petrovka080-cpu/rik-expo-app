import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

type ParsedArgs = {
  artifactPath: string;
  expectedStatus: string;
  expectedFakeGreen: boolean;
  requiredPaths: string[];
  sourceHeadField: string;
  expectedSourceHead: string | null;
  requireLineage: boolean;
};

function parseArgs(argv: string[]): ParsedArgs {
  const values = new Map<string, string[]>();

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      throw new Error(`Unexpected argument "${token}".`);
    }

    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      throw new Error(`Missing value for argument "${token}".`);
    }

    const bucket = values.get(token) ?? [];
    bucket.push(next);
    values.set(token, bucket);
    index += 1;
  }

  const artifactPath = values.get("--artifact")?.[0];
  const expectedStatus = values.get("--expect-status")?.[0];
  const expectedFakeGreenRaw = values.get("--expect-fake-green")?.[0] ?? "false";
  const requireLineageRaw = values.get("--require-lineage")?.[0] ?? "false";
  if (!artifactPath) {
    throw new Error("--artifact is required.");
  }
  if (!expectedStatus) {
    throw new Error("--expect-status is required.");
  }
  if (expectedFakeGreenRaw !== "true" && expectedFakeGreenRaw !== "false") {
    throw new Error("--expect-fake-green must be true or false.");
  }
  if (requireLineageRaw !== "true" && requireLineageRaw !== "false") {
    throw new Error("--require-lineage must be true or false.");
  }

  return {
    artifactPath,
    expectedStatus,
    expectedFakeGreen: expectedFakeGreenRaw === "true",
    requiredPaths: values.get("--require-path") ?? [],
    sourceHeadField: values.get("--source-head-field")?.[0] ?? "source_code_head",
    expectedSourceHead: values.get("--expect-source-head")?.[0] ?? null,
    requireLineage: requireLineageRaw === "true",
  };
}

function resolveProjectPath(relativePath: string): string {
  return path.resolve(PROJECT_ROOT, relativePath);
}

function readCurrentHead(): string {
  return execSync("git rev-parse HEAD", {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function readJsonRecord(relativePath: string): Record<string, unknown> {
  const absolutePath = resolveProjectPath(relativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Artifact is missing: ${relativePath}`);
  }

  const parsed = JSON.parse(fs.readFileSync(absolutePath, "utf8")) as unknown;
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`Artifact is not a JSON object: ${relativePath}`);
  }

  return parsed as Record<string, unknown>;
}

function readField(record: Record<string, unknown>, fieldPath: string): unknown {
  return fieldPath.split(".").reduce<unknown>((value, key) => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return undefined;
    }
    return (value as Record<string, unknown>)[key];
  }, record);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const artifact = readJsonRecord(args.artifactPath);
  const failures: string[] = [];

  if (artifact.final_status !== args.expectedStatus) {
    failures.push(`final_status expected ${args.expectedStatus}, got ${String(artifact.final_status)}`);
  }

  if (artifact.fake_green_claimed !== args.expectedFakeGreen) {
    failures.push(`fake_green_claimed expected ${String(args.expectedFakeGreen)}, got ${String(artifact.fake_green_claimed)}`);
  }

  for (const requiredPath of args.requiredPaths) {
    if (!fs.existsSync(resolveProjectPath(requiredPath))) {
      failures.push(`required artifact is missing: ${requiredPath}`);
    }
  }

  let expectedSourceHead: string | null = null;
  let actualSourceHead: unknown = null;
  let lineageSourceHead: unknown = null;
  let lineageHeadSha: unknown = null;
  let lineageCurrentHeadAtWriteTime: unknown = null;
  let lineageGeneratedAt: unknown = null;
  if (args.expectedSourceHead != null) {
    expectedSourceHead = args.expectedSourceHead === "current" ? readCurrentHead() : args.expectedSourceHead;
    actualSourceHead = readField(artifact, args.sourceHeadField);
    if (actualSourceHead !== expectedSourceHead) {
      failures.push(`${args.sourceHeadField} expected ${expectedSourceHead}, got ${String(actualSourceHead)}`);
    }
  }

  if (args.requireLineage) {
    lineageSourceHead = readField(artifact, args.sourceHeadField);
    lineageHeadSha = readField(artifact, "head_sha");
    lineageCurrentHeadAtWriteTime = readField(artifact, "current_head_at_write_time");
    lineageGeneratedAt = readField(artifact, "generated_at");

    if (!isNonEmptyString(lineageSourceHead)) {
      failures.push(`${args.sourceHeadField} must be a non-empty string when --require-lineage true`);
    }
    if (lineageHeadSha !== lineageSourceHead) {
      failures.push(`head_sha expected to match ${args.sourceHeadField}, got ${String(lineageHeadSha)}`);
    }
    if (lineageCurrentHeadAtWriteTime !== lineageSourceHead) {
      failures.push(`current_head_at_write_time expected to match ${args.sourceHeadField}, got ${String(lineageCurrentHeadAtWriteTime)}`);
    }
    if (!isNonEmptyString(lineageGeneratedAt)) {
      failures.push("generated_at must be a non-empty string when --require-lineage true");
    }
    if (artifact.proof_valid_for_source_code_head !== true) {
      failures.push(`proof_valid_for_source_code_head expected true, got ${String(artifact.proof_valid_for_source_code_head)}`);
    }
    if (artifact.artifact_only_supersession_allowed !== true) {
      failures.push(`artifact_only_supersession_allowed expected true, got ${String(artifact.artifact_only_supersession_allowed)}`);
    }
  }

  const result = {
    artifact: args.artifactPath,
    final_status: artifact.final_status,
    expected_status: args.expectedStatus,
    fake_green_claimed: artifact.fake_green_claimed,
    expected_fake_green_claimed: args.expectedFakeGreen,
    required_paths_checked: args.requiredPaths,
    lineage_checked: args.expectedSourceHead != null || args.requireLineage,
    source_head_field: args.expectedSourceHead == null ? null : args.sourceHeadField,
    expected_source_head: expectedSourceHead,
    actual_source_head: actualSourceHead,
    required_lineage_checked: args.requireLineage,
    lineage_source_head: lineageSourceHead,
    lineage_head_sha: lineageHeadSha,
    lineage_current_head_at_write_time: lineageCurrentHeadAtWriteTime,
    lineage_generated_at: lineageGeneratedAt,
    failures,
  };

  console.info(JSON.stringify(result, null, 2));
  if (failures.length > 0) {
    process.exit(1);
  }
}

main();
