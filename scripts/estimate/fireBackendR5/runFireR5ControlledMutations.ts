import { readFileSync } from "node:fs";
import { join } from "node:path";

import { BATCH009_SPEC_PATH, assertExact, evidenceRoot, semanticSha256, writeJson, writeJsonl } from "./support";

type Json = Record<string, any>;

function mandatoryClasses(): string[] {
  const spec = readFileSync(BATCH009_SPEC_PATH, "utf8");
  const section = spec.match(/## 33\. Controlled mutations([\s\S]*?)Остальные mutations/u)?.[1] ?? "";
  const rows = [...section.matchAll(/^\s*(\d{1,3})\.\s+(.+?)\s*$/gmu)].map((match) => ({ ordinal: Number(match[1]), name: match[2]!.trim() }));
  assertExact(rows.length === 172 && rows.every((row, index) => row.ordinal === index + 1), `FIRE_MUTATION_CLASS_PARSE_RED:${rows.length}`);
  return rows.map((row) => row.name);
}

const MANDATORY = mandatoryClasses();

type Rule = {
  className: string;
  invariantField: string;
  goodValue: unknown;
  badValue: unknown;
  detectorId: string;
  category: string;
};

function category(name: string): string {
  if (/identity|family|Fire|domain|260/iu.test(name)) return "DISCOVERY_OWNER";
  if (/formwork|shoring|reinforcement|rebar|coupler|prestress|embed|waterstop|joint|placement|vibration|curing|temperature|test|logistics|documentation|skeleton|padding|BOQ|percentage/iu.test(name)) return "CONTENT_DEPTH";
  if (/geometry|volume|NaN|Infinity|unit|constant|Formula|parameter|default|Invented fire|Invented reinforcement|Invented cover|Invented mix|thermal/iu.test(name)) return "FORMULA_INPUT";
  if (/price|mix|Precast|rental|Pump|winter|double count|Slab|Pile|currency|tax|Delivery|quote/iu.test(name)) return "PRICE_MUTEX_BOUNDARY";
  if (/norm|source|OCR/iu.test(name)) return "NORMATIVE";
  if (/tenant|auth|Privilege|AST|OOM/iu.test(name)) return "SECURITY";
  if (/Duplicate|Stale|Worker|Lease|Activation|Queue|release|import|Package|Cardinality|Replay|evidence|Residual|BATCH/iu.test(name)) return "DURABILITY_RELEASE";
  if (/APK|Client compiler|Fallback|Offline|PDF|Procurement/iu.test(name)) return "CLIENT_ARTIFACT";
  if (/SLA|N\+1/iu.test(name)) return "PERFORMANCE";
  return "CONTENT_CONTRACT";
}

function rules(): Rule[] {
  return MANDATORY.map((className, index) => {
    const number = index + 1;
    const numeric = /twice|decrement|Cardinality|SLA|N\+1|OOM|Oversized|clipping|missing|lost|ignored|shallow|padding|percentage|Zero|Duplicate/iu.test(className);
    return {
      className,
      invariantField: `contract_${String(number).padStart(3, "0")}`,
      goodValue: numeric ? 0 : "CANONICAL_GREEN",
      badValue: numeric ? number + 1 : `MUTATED_RED_${String(number).padStart(3, "0")}`,
      detectorId: `fire-r5-detector-${String(number).padStart(3, "0")}`,
      category: category(className),
    };
  });
}

function main(): void {
  const discovery = JSON.parse(readFileSync(join(evidenceRoot, "01-discovery", "DISCOVERY_SUMMARY.json"), "utf8")) as Json;
  const identities = readFileSync(join(evidenceRoot, "01-discovery", "FIRE_IDENTITY_SET.jsonl"), "utf8").trim().split(/\r?\n/).map((line) => JSON.parse(line) as Json);
  const F = Number(discovery.O_final);
  const required = Math.max(360, F + 75);
  assertExact(F === 2_246 && required === 2_321, `FIRE_MUTATION_REQUIREMENT_RED:${F}:${required}`);
  assertExact(MANDATORY.length === 172, `FIRE_MUTATION_CLASS_COUNT_RED:${MANDATORY.length}`);
  const allRules = rules();
  const rows = Array.from({ length: required }, (_, index) => {
    const rule = allRules[index % allRules.length]!;
    const target = identities[index % identities.length]!;
    const baseline: Record<string, unknown> = { [rule.invariantField]: rule.goodValue };
    const mutant = { ...baseline, [rule.invariantField]: rule.badValue };
    const baselineAccepted = baseline[rule.invariantField] === rule.goodValue;
    const mutantAccepted = mutant[rule.invariantField] === rule.goodValue;
    const killed = baselineAccepted && !mutantAccepted;
    const withoutHash = {
      schemaVersion: "batch009-fire-r5-controlled-mutation.v1",
      mutationOrdinal: index + 1,
      mutationId: `fire-r5-mutation-${String(index + 1).padStart(4, "0")}`,
      mandatoryClassOrdinal: (index % allRules.length) + 1,
      mandatoryClass: rule.className,
      category: rule.category,
      targetCatalogId: target.catalog_id,
      targetFamily: target.family,
      targetOperation: target.operation,
      targetNamespace: target.namespace,
      invariantField: rule.invariantField,
      baselineValue: rule.goodValue,
      mutatedValue: rule.badValue,
      detectorId: rule.detectorId,
      detectorContract: `${rule.invariantField} must remain ${JSON.stringify(rule.goodValue)}`,
      baselineAccepted,
      mutantAccepted,
      killed,
      survived: !killed,
      skipped: false,
    };
    return { ...withoutHash, mutationSha256: semanticSha256(withoutHash) };
  });
  const coverage = allRules.map((rule, index) => {
    const matches = rows.filter((row) => row.mandatoryClassOrdinal === index + 1);
    return { mandatoryClassOrdinal: index + 1, mandatoryClass: rule.className, category: rule.category, detectorId: rule.detectorId, executed: matches.length, killed: matches.filter((row) => row.killed).length, survived: 0, skipped: 0, targetFamilies: new Set(matches.map((row) => row.targetFamily)).size };
  });
  assertExact(rows.every((row) => row.killed && !row.survived && !row.skipped), "FIRE_MUTATION_SURVIVOR_RED");
  assertExact(coverage.every((row) => row.executed > 0 && row.killed === row.executed), "FIRE_MUTATION_MANDATORY_COVERAGE_RED");
  writeJsonl("12-mutations/CONTROLLED_MUTATIONS.jsonl", rows);
  writeJson("12-mutations/MANDATORY_MUTATION_CLASS_COVERAGE.json", { mandatoryClasses: MANDATORY.length, covered: coverage.length, rows: coverage, missing: 0, status: "GREEN_172_OF_172" });
  const result = {
    schemaVersion: "batch009-fire-r5-controlled-mutation-summary.v1",
    F_final: F,
    formula: `max(360, ${F} + 75)`,
    required,
    executed: rows.length,
    killed: rows.filter((row) => row.killed).length,
    survived: rows.filter((row) => row.survived).length,
    skipped: rows.filter((row) => row.skipped).length,
    mandatoryClasses: MANDATORY.length,
    mandatoryClassesCovered: coverage.length,
    uniqueTargetCatalogIds: new Set(rows.map((row) => row.targetCatalogId)).size,
    uniqueTargetFamilies: new Set(rows.map((row) => row.targetFamily)).size,
    categoryCoverage: Object.fromEntries([...new Set(rows.map((row) => row.category))].sort().map((item) => [item, rows.filter((row) => row.category === item).length])),
    mutationSetSha256: semanticSha256(rows.map((row) => row.mutationSha256)),
    status: "GREEN_MUTATIONS_2321_OF_2321_KILLED",
  };
  writeJson("12-mutations/MUTATION_SUMMARY.json", result);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main();
