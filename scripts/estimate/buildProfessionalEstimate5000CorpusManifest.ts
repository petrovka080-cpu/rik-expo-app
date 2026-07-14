import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  PROFESSIONAL_ESTIMATE_5000_CORPUS_MANIFEST_HASH,
  PROFESSIONAL_ESTIMATE_5000_CORPUS_SOURCE,
  buildProfessionalEstimate5000CorpusManifestSummary,
  type ProfessionalEstimate5000CorpusSource,
} from "../../src/lib/estimate/professionalEstimate5000CorpusContract";

const FIXTURE_DIR = path.join(process.cwd(), "tests", "fixtures", "aiPromptPacks");
const RUNTIME_ROOT = path.join(
  ".release-runtime",
  "ai-estimate-11610-risk-audit-5000-remediation",
  "5000-corpus",
);
const GENERATED_AT = "2026-07-14T00:00:00.000Z";

export type ProfessionalEstimate5000Prompt = {
  id: string;
  domain: string;
  prompt: string;
};

type SourceMetadata = {
  raw_attachment_sha256?: string;
  repaired_json_sha256?: string;
  total_prompts?: number;
  unique_ids?: number;
  unique_prompts?: number;
  duplicate_prompt_count?: number;
  domains_total?: number;
  first_id?: string;
  last_id?: string;
};

export type ProfessionalEstimate5000DomainDistribution = {
  domain: string;
  count: number;
  first_case_id: string;
  last_case_id: string;
};

export type ProfessionalEstimate5000CorpusManifest = {
  schema: "professional-estimate-5000-real-corpus-manifest-v1";
  generated_at: string;
  valid: boolean;
  failures: readonly string[];
  manifest_hash: string;
  expected_manifest_hash: string;
  fixture_path: string;
  source_path: string;
  fixture_sha256_matches_source: boolean;
  source_matches_contract: boolean;
  total_cases: number;
  domains_total: number;
  cases_per_domain_min: number;
  cases_per_domain_max: number;
  duplicate_id_count: number;
  duplicate_prompt_count: number;
  first_id: string | null;
  last_id: string | null;
  route_distribution: {
    request: number;
    ai_foreman: number;
    ai_request: number;
  };
  domain_distribution: readonly ProfessionalEstimate5000DomainDistribution[];
  case_samples: readonly ProfessionalEstimate5000Prompt[];
  summary: ReturnType<typeof buildProfessionalEstimate5000CorpusManifestSummary>;
};

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function sha256File(filePath: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function duplicates(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicated = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicated.add(value);
    seen.add(value);
  }
  return [...duplicated].sort();
}

function routeFor(index: number): "request" | "ai_foreman" | "ai_request" {
  if (index % 3 === 1) return "ai_foreman";
  if (index % 3 === 2) return "ai_request";
  return "request";
}

function domainDistribution(
  prompts: readonly ProfessionalEstimate5000Prompt[],
): ProfessionalEstimate5000DomainDistribution[] {
  const byDomain = new Map<string, ProfessionalEstimate5000Prompt[]>();
  for (const prompt of prompts) {
    const current = byDomain.get(prompt.domain) ?? [];
    current.push(prompt);
    byDomain.set(prompt.domain, current);
  }
  return [...byDomain.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([domain, items]) => ({
    domain,
    count: items.length,
    first_case_id: items[0]?.id ?? "",
    last_case_id: items[items.length - 1]?.id ?? "",
  }));
}

function sourceFromActuals(input: {
  prompts: readonly ProfessionalEstimate5000Prompt[];
  source: SourceMetadata;
  fixtureSha256: string;
  distribution: readonly ProfessionalEstimate5000DomainDistribution[];
}): ProfessionalEstimate5000CorpusSource {
  const counts = input.distribution.map((entry) => entry.count);
  return Object.freeze({
    fixture_file_name: PROFESSIONAL_ESTIMATE_5000_CORPUS_SOURCE.fixture_file_name,
    source_file_name: PROFESSIONAL_ESTIMATE_5000_CORPUS_SOURCE.source_file_name,
    fixture_sha256: input.fixtureSha256,
    raw_attachment_sha256: input.source.raw_attachment_sha256 ?? "",
    total_cases: input.prompts.length,
    unique_ids: new Set(input.prompts.map((prompt) => prompt.id)).size,
    unique_prompts: new Set(input.prompts.map((prompt) => prompt.prompt)).size,
    duplicate_prompt_count: duplicates(input.prompts.map((prompt) => prompt.prompt)).length,
    domains_total: input.distribution.length,
    cases_per_domain: counts.length > 0 && Math.min(...counts) === Math.max(...counts) ? counts[0] : 0,
    first_id: input.prompts[0]?.id ?? "",
    last_id: input.prompts[input.prompts.length - 1]?.id ?? "",
  });
}

export function buildProfessionalEstimate5000CorpusManifest(): ProfessionalEstimate5000CorpusManifest {
  const fixturePath = path.join(FIXTURE_DIR, PROFESSIONAL_ESTIMATE_5000_CORPUS_SOURCE.fixture_file_name);
  const sourcePath = path.join(FIXTURE_DIR, PROFESSIONAL_ESTIMATE_5000_CORPUS_SOURCE.source_file_name);
  const prompts = readJson<ProfessionalEstimate5000Prompt[]>(fixturePath);
  const source = readJson<SourceMetadata>(sourcePath);
  const fixtureSha256 = sha256File(fixturePath);
  const distribution = domainDistribution(prompts);
  const counts = distribution.map((entry) => entry.count);
  const actualSource = sourceFromActuals({ prompts, source, fixtureSha256, distribution });
  const summary = buildProfessionalEstimate5000CorpusManifestSummary(actualSource);
  const duplicateIds = duplicates(prompts.map((prompt) => prompt.id));
  const duplicatePrompts = duplicates(prompts.map((prompt) => prompt.prompt));
  const routeCounts = prompts.reduce(
    (accumulator, _prompt, index) => {
      accumulator[routeFor(index)] += 1;
      return accumulator;
    },
    { request: 0, ai_foreman: 0, ai_request: 0 },
  );
  const failures = [
    prompts.length === PROFESSIONAL_ESTIMATE_5000_CORPUS_SOURCE.total_cases
      ? ""
      : `total_cases:${prompts.length}`,
    distribution.length === PROFESSIONAL_ESTIMATE_5000_CORPUS_SOURCE.domains_total
      ? ""
      : `domains_total:${distribution.length}`,
    counts.length > 0 && Math.min(...counts) === PROFESSIONAL_ESTIMATE_5000_CORPUS_SOURCE.cases_per_domain
      ? ""
      : `cases_per_domain_min:${counts.length > 0 ? Math.min(...counts) : 0}`,
    counts.length > 0 && Math.max(...counts) === PROFESSIONAL_ESTIMATE_5000_CORPUS_SOURCE.cases_per_domain
      ? ""
      : `cases_per_domain_max:${counts.length > 0 ? Math.max(...counts) : 0}`,
    duplicateIds.length === 0 ? "" : `duplicate_ids:${duplicateIds.length}`,
    duplicatePrompts.length === 0 ? "" : `duplicate_prompts:${duplicatePrompts.length}`,
    fixtureSha256 === source.repaired_json_sha256 ? "" : "fixture_sha256_source_mismatch",
    source.repaired_json_sha256 === PROFESSIONAL_ESTIMATE_5000_CORPUS_SOURCE.fixture_sha256
      ? ""
      : "source_fixture_sha256_contract_mismatch",
    source.raw_attachment_sha256 === PROFESSIONAL_ESTIMATE_5000_CORPUS_SOURCE.raw_attachment_sha256
      ? ""
      : "raw_attachment_sha256_contract_mismatch",
    summary.manifest_hash === PROFESSIONAL_ESTIMATE_5000_CORPUS_MANIFEST_HASH
      ? ""
      : "manifest_hash_contract_mismatch",
    prompts[0]?.id === PROFESSIONAL_ESTIMATE_5000_CORPUS_SOURCE.first_id ? "" : "first_id_mismatch",
    prompts[prompts.length - 1]?.id === PROFESSIONAL_ESTIMATE_5000_CORPUS_SOURCE.last_id ? "" : "last_id_mismatch",
  ].filter(Boolean);

  return Object.freeze({
    schema: summary.schema,
    generated_at: GENERATED_AT,
    valid: failures.length === 0,
    failures,
    manifest_hash: summary.manifest_hash,
    expected_manifest_hash: PROFESSIONAL_ESTIMATE_5000_CORPUS_MANIFEST_HASH,
    fixture_path: path.relative(process.cwd(), fixturePath).replace(/\\/g, "/"),
    source_path: path.relative(process.cwd(), sourcePath).replace(/\\/g, "/"),
    fixture_sha256_matches_source: fixtureSha256 === source.repaired_json_sha256,
    source_matches_contract: summary.manifest_hash === PROFESSIONAL_ESTIMATE_5000_CORPUS_MANIFEST_HASH,
    total_cases: prompts.length,
    domains_total: distribution.length,
    cases_per_domain_min: counts.length > 0 ? Math.min(...counts) : 0,
    cases_per_domain_max: counts.length > 0 ? Math.max(...counts) : 0,
    duplicate_id_count: duplicateIds.length,
    duplicate_prompt_count: duplicatePrompts.length,
    first_id: prompts[0]?.id ?? null,
    last_id: prompts[prompts.length - 1]?.id ?? null,
    route_distribution: routeCounts,
    domain_distribution: distribution,
    case_samples: Object.freeze([
      ...prompts.slice(0, 3),
      prompts[Math.floor(prompts.length / 2)],
      ...prompts.slice(-3),
    ].filter(Boolean)),
    summary,
  });
}

export function writeProfessionalEstimate5000CorpusManifest(): {
  manifest: ProfessionalEstimate5000CorpusManifest;
  manifest_path: string;
} {
  const manifest = buildProfessionalEstimate5000CorpusManifest();
  const outDir = path.join(RUNTIME_ROOT, timestamp());
  const manifestPath = path.join(outDir, "professional-estimate-5000-corpus-manifest.json");
  writeJson(manifestPath, manifest);
  return {
    manifest,
    manifest_path: manifestPath,
  };
}

export function runProfessionalEstimate5000CorpusManifestCli(argv = process.argv.slice(2)): void {
  const args = new Set(argv);
  const writeSummary = args.has("--write-summary");
  const result = writeSummary
    ? writeProfessionalEstimate5000CorpusManifest()
    : { manifest: buildProfessionalEstimate5000CorpusManifest(), manifest_path: null };
  const output = {
    manifest_path: result.manifest_path,
    valid: result.manifest.valid,
    failures: result.manifest.failures,
    manifest_hash: result.manifest.manifest_hash,
    total_cases: result.manifest.total_cases,
    domains_total: result.manifest.domains_total,
    cases_per_domain_min: result.manifest.cases_per_domain_min,
    cases_per_domain_max: result.manifest.cases_per_domain_max,
    duplicate_id_count: result.manifest.duplicate_id_count,
    duplicate_prompt_count: result.manifest.duplicate_prompt_count,
    runtime_status: result.manifest.summary.runtime_status,
    web_replay_passed: result.manifest.summary.web_replay_passed,
    android_replay_passed: result.manifest.summary.android_replay_passed,
    pdf_replay_passed: result.manifest.summary.pdf_replay_passed,
    fake_green_claimed: result.manifest.summary.fake_green_claimed,
  };
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  if (args.has("--fail-on-invalid") && !result.manifest.valid) {
    process.exitCode = 1;
  }
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/buildProfessionalEstimate5000CorpusManifest.ts")) {
  runProfessionalEstimate5000CorpusManifestCli();
}
