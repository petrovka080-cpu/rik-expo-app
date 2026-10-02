import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, relative, resolve } from "node:path";

const ESTIMATE_AUDIT_SOURCE_ROOTS = [
  "src",
  "scripts/estimate",
  "data/estimate-catalog",
  "data/estimate-norms",
  "data/estimate-templates",
] as const;
const ESTIMATE_AUDIT_SOURCE_FILE = /\.(?:cjs|js|json|mjs|ts|tsx)$/u;

type ContentAddressedEnvelope<T> = Readonly<{
  schema: string;
  input_sha256: string;
  payload_sha256: string;
  payload: T;
}>;

function sourceFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = resolve(directory, entry.name);
    if (entry.isSymbolicLink()) return [];
    if (entry.isDirectory()) return sourceFiles(entryPath);
    return entry.isFile() && ESTIMATE_AUDIT_SOURCE_FILE.test(entry.name) ? [entryPath] : [];
  });
}

export function sha256EstimateAuditJson(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function estimateAuditSourceInputSha256(cacheIdentity: string): string {
  const hash = createHash("sha256");
  hash.update(`${cacheIdentity}\n`);
  const files = ESTIMATE_AUDIT_SOURCE_ROOTS.flatMap((sourceRoot) => {
    const absoluteRoot = resolve(sourceRoot);
    return sourceFiles(absoluteRoot).map((file) => ({ absoluteRoot, file, sourceRoot }));
  }).sort((left, right) => left.file.localeCompare(right.file, "en"));
  for (const { absoluteRoot, file, sourceRoot } of files) {
    hash.update(`${sourceRoot}/${relative(absoluteRoot, file).replace(/\\/gu, "/")}\0`);
    hash.update(readFileSync(file));
    hash.update("\n");
  }
  for (const rootFile of ["package.json", "package-lock.json"]) {
    const absolute = resolve(rootFile);
    if (!existsSync(absolute)) continue;
    hash.update(`${rootFile}\0`);
    hash.update(readFileSync(absolute));
    hash.update("\n");
  }
  return hash.digest("hex");
}

export function readContentAddressedEstimateAuditCache<T>(input: Readonly<{
  cachePath: string;
  inputSha256: string;
  schema: string;
  validate: (value: unknown) => value is T;
}>): T | null {
  if (!existsSync(input.cachePath)) return null;
  try {
    const cached = JSON.parse(readFileSync(input.cachePath, "utf8")) as Partial<ContentAddressedEnvelope<T>>;
    if (
      cached.schema !== input.schema ||
      cached.input_sha256 !== input.inputSha256 ||
      !input.validate(cached.payload) ||
      cached.payload_sha256 !== sha256EstimateAuditJson(cached.payload)
    ) return null;
    return cached.payload;
  } catch {
    return null;
  }
}

export function writeContentAddressedEstimateAuditCache<T>(input: Readonly<{
  cachePath: string;
  inputSha256: string;
  payload: T;
  schema: string;
  validate: (value: unknown) => value is T;
}>): void {
  if (!input.validate(input.payload)) throw new Error(`estimate_audit_cache_payload_invalid:${input.schema}`);
  mkdirSync(dirname(input.cachePath), { recursive: true });
  const temporaryPath = `${input.cachePath}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(temporaryPath, `${JSON.stringify({
    schema: input.schema,
    input_sha256: input.inputSha256,
    payload_sha256: sha256EstimateAuditJson(input.payload),
    payload: input.payload,
  } satisfies ContentAddressedEnvelope<T>)}\n`, "utf8");
  try {
    renameSync(temporaryPath, input.cachePath);
  } catch (error) {
    if (existsSync(temporaryPath)) unlinkSync(temporaryPath);
    const existing = readContentAddressedEstimateAuditCache(input);
    if (!existing) throw error;
  }
}
