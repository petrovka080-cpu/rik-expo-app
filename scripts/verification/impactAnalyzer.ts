import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export type VerificationLevel = "local" | "affected" | "pr";

type GateDefinition = {
  name: string;
  level?: VerificationLevel[];
  levels?: VerificationLevel[];
  reason?: string;
  suites: string[];
  producers?: string[];
};

type DomainDefinition = Omit<GateDefinition, "name" | "level"> & { id: string; gate: string; patterns: string[] };

export type ImpactOwnershipMap = {
  schema: "verification-impact-ownership/v1";
  version: 1;
  alwaysRunGates: GateDefinition[];
  domains: DomainDefinition[];
};

export type GateSelection = {
  gate: string;
  selected: boolean;
  reason: string;
  domains: string[];
  matched_files: string[];
  suites: string[];
  producers: string[];
};

export type ChangedFileSource = {
  path: string;
  state: "present" | "deleted";
  kind: "file" | "symlink" | null;
  size_bytes: number | null;
  content_sha256: string | null;
  link_target_sha256: string | null;
};

export type VerificationPlan = {
  schema: "verification-plan/v1";
  version: 1;
  base_sha: string;
  head_sha: string;
  level: VerificationLevel;
  changed_files: string[];
  changed_file_sources: ChangedFileSource[];
  input_fingerprint: string;
  selections: GateSelection[];
  selected_gates: string[];
  selected_suites: string[];
  selected_producers: string[];
  unselected_gates: Array<{ gate: string; reason: string }>;
};

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function sha256Bytes(value: Buffer): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function normalize(file: string): string {
  return file.replace(/\\/g, "/").replace(/^\.\//, "");
}

function isGeneratedVerificationInput(file: string): boolean {
  if (
    /^\.tmp(?:[_./-]|$)/.test(file) ||
    /^android\/\.gradle(?:[/_-]|$)/.test(file) ||
    /^android\/(?:app\/)?build(?:[/_-]|$)/.test(file)
  ) {
    return true;
  }
  return [
    ".release-runtime/",
    "artifacts/",
    "coverage/",
    "dist/",
    "build/",
    "android/.gradle/",
    "android/app/build/",
  ].some((prefix) => file.startsWith(prefix));
}

function globRegex(glob: string): RegExp {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escaped.replace(/\*\*/g, "\0").replace(/\*/g, "[^/]*").replace(/\0/g, ".*")}$`);
}

function matches(file: string, patterns: readonly string[]): boolean {
  return patterns.some((pattern) => globRegex(pattern).test(file));
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b, "en"));
}

function resolveRepositoryFile(root: string, file: string): string {
  const resolvedRoot = path.resolve(root);
  const resolvedFile = path.resolve(resolvedRoot, file);
  const relative = path.relative(resolvedRoot, resolvedFile);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`verification_plan_changed_input_outside_root:${file}`);
  }
  return resolvedFile;
}

export function buildChangedFileSources(root: string, changedFiles: readonly string[]): ChangedFileSource[] {
  return changedFiles.map((file) => {
    const filePath = resolveRepositoryFile(root, file);
    let fileStat: fs.Stats;
    try {
      fileStat = fs.lstatSync(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return {
          path: file,
          state: "deleted",
          kind: null,
          size_bytes: null,
          content_sha256: null,
          link_target_sha256: null,
        };
      }
      throw error;
    }
    const kind = fileStat.isSymbolicLink() ? "symlink" : fileStat.isFile() ? "file" : null;
    if (kind == null) throw new Error(`verification_plan_changed_input_not_file:${file}`);
    const content = fs.readFileSync(filePath);
    const linkTarget = kind === "symlink" ? fs.readlinkSync(filePath, "buffer") : null;
    return {
      path: file,
      state: "present",
      kind,
      size_bytes: content.byteLength,
      content_sha256: sha256Bytes(content),
      link_target_sha256: linkTarget == null ? null : sha256Bytes(linkTarget),
    };
  });
}

export function readImpactOwnershipMap(
  filePath = path.join(process.cwd(), "verification", "v1", "impact-domain-ownership.map.json"),
): ImpactOwnershipMap {
  const value = JSON.parse(fs.readFileSync(filePath, "utf8")) as ImpactOwnershipMap;
  validateImpactOwnershipMap(value);
  return value;
}

function validateImpactOwnershipMap(value: ImpactOwnershipMap): void {
  if (value.schema !== "verification-impact-ownership/v1" || value.version !== 1) throw new Error("impact_map_schema_invalid");
  const gates = [...value.alwaysRunGates.map((gate) => gate.name), ...value.domains.map((domain) => domain.gate)];
  if (new Set(gates).size !== gates.length) throw new Error("impact_map_duplicate_gate");
}

export function buildVerificationPlan(params: {
  baseSha: string;
  headSha: string;
  changedFiles: readonly string[];
  level: VerificationLevel;
  map?: ImpactOwnershipMap;
  root?: string;
}): VerificationPlan {
  if (!/^[0-9a-f]{40}$/i.test(params.baseSha) || !/^[0-9a-f]{40}$/i.test(params.headSha)) throw new Error("verification_plan_exact_sha_required");
  const ownership = params.map ?? readImpactOwnershipMap();
  validateImpactOwnershipMap(ownership);
  const root = path.resolve(params.root ?? process.cwd());
  const changedFiles = unique(params.changedFiles
    .map(normalize)
    .filter((file) => Boolean(file) && !isGeneratedVerificationInput(file)));
  const changedFileSources = buildChangedFileSources(root, changedFiles);
  const selections: GateSelection[] = [];
  for (const gate of ownership.alwaysRunGates) {
    const enabled = (gate.level ?? []).includes(params.level);
    selections.push({ gate: gate.name, selected: enabled, reason: enabled ? gate.reason ?? "always-run critical control" : `not configured for ${params.level}`, domains: ["verification-critical"], matched_files: [], suites: gate.suites, producers: gate.producers ?? [] });
  }
  for (const domain of ownership.domains) {
    const matchedFiles = changedFiles.filter((file) => matches(file, domain.patterns));
    const enabledAtLevel = (domain.levels ?? []).includes(params.level);
    const selected = enabledAtLevel && matchedFiles.length > 0;
    const suites = domain.suites.flatMap((suite) => suite === "$CHANGED_TESTS"
      ? matchedFiles.filter((file) =>
        /(?:^|\/)(?:[^/]+\.)?(?:test|spec)\.[cm]?[jt]sx?$/.test(file) &&
        fs.existsSync(path.resolve(root, file)))
      : [suite]);
    selections.push({
      gate: domain.gate,
      selected,
      reason: selected ? `matched ${domain.id}: ${matchedFiles.join(", ")}` : !enabledAtLevel ? `not configured for ${params.level}` : `no changed file matched ${domain.patterns.join(", ")}`,
      domains: [domain.id],
      matched_files: matchedFiles,
      suites,
      producers: domain.producers ?? [],
    });
  }
  const selected = selections.filter((item) => item.selected);
  const fingerprintInput = {
    base_sha: params.baseSha,
    head_sha: params.headSha,
    level: params.level,
    changed_file_sources: changedFileSources,
    map: ownership,
  };
  return {
    schema: "verification-plan/v1",
    version: 1,
    base_sha: params.baseSha,
    head_sha: params.headSha,
    level: params.level,
    changed_files: changedFiles,
    changed_file_sources: changedFileSources,
    input_fingerprint: sha256(stable(fingerprintInput)),
    selections,
    selected_gates: unique(selected.map((item) => item.gate)),
    selected_suites: unique(selected.flatMap((item) => item.suites)),
    selected_producers: unique(selected.flatMap((item) => item.producers)),
    unselected_gates: selections.filter((item) => !item.selected).map((item) => ({ gate: item.gate, reason: item.reason })),
  };
}
