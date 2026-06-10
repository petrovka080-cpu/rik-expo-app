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
  if (!artifactPath) {
    throw new Error("--artifact is required.");
  }
  if (!expectedStatus) {
    throw new Error("--expect-status is required.");
  }
  if (expectedFakeGreenRaw !== "true" && expectedFakeGreenRaw !== "false") {
    throw new Error("--expect-fake-green must be true or false.");
  }

  return {
    artifactPath,
    expectedStatus,
    expectedFakeGreen: expectedFakeGreenRaw === "true",
    requiredPaths: values.get("--require-path") ?? [],
    sourceHeadField: values.get("--source-head-field")?.[0] ?? "source_code_head",
    expectedSourceHead: values.get("--expect-source-head")?.[0] ?? null,
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
  if (args.expectedSourceHead != null) {
    expectedSourceHead = args.expectedSourceHead === "current" ? readCurrentHead() : args.expectedSourceHead;
    actualSourceHead = readField(artifact, args.sourceHeadField);
    if (actualSourceHead !== expectedSourceHead) {
      failures.push(`${args.sourceHeadField} expected ${expectedSourceHead}, got ${String(actualSourceHead)}`);
    }
  }

  const result = {
    artifact: args.artifactPath,
    final_status: artifact.final_status,
    expected_status: args.expectedStatus,
    fake_green_claimed: artifact.fake_green_claimed,
    expected_fake_green_claimed: args.expectedFakeGreen,
    required_paths_checked: args.requiredPaths,
    lineage_checked: args.expectedSourceHead != null,
    source_head_field: args.expectedSourceHead == null ? null : args.sourceHeadField,
    expected_source_head: expectedSourceHead,
    actual_source_head: actualSourceHead,
    failures,
  };

  console.info(JSON.stringify(result, null, 2));
  if (failures.length > 0) {
    process.exit(1);
  }
}

main();
