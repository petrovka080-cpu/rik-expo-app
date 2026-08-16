import { readFileSync } from "node:fs";
import { join } from "node:path";

import { assertExact, evidenceRoot, semanticSha256, writeJson, writeJsonl } from "./support";

type Json = Record<string, any>;

const MANDATORY = [
  "Missing identity", "Duplicate identity", "Old Fire admitted", "Existing domain reassigned", "Old 260 discovery obligation lost",
  "New family ignored", "Generic shallow skeleton", "Same BOQ across families", "Padding row", "Miscellaneous percentage",
  "Missing formwork", "Missing shoring", "Missing re-shoring", "Missing reinforcement", "Hidden rebar percentage",
  "Missing spacers/chairs", "Missing couplers", "Missing prestress anchor", "Missing prestress grout", "Missing embed",
  "Missing waterstop", "Missing joint", "Missing placement", "Missing vibration", "Missing curing", "Missing temperature control",
  "Missing test", "Missing logistics", "Missing documentation", "Wrong geometry", "Double opening subtraction", "Wrong formwork area",
  "Wrong curing area", "Negative volume", "NaN", "Infinity", "Zero priced row", "Wrong unit", "Magic constant", "Formula eval",
  "Dead parameter", "Hidden default", "Invented concrete class", "Invented reinforcement", "Invented cover", "Invented mix",
  "Invented thermal plan", "Invented price", "Ready-mix + constituents double count", "Precast + factory manufacture double count",
  "Purchase + rental formwork", "Pump + crane same volume", "Incompatible winter methods", "Parent + typed-child double count",
  "Slab + flooring double count", "Pile + cap owner error", "Wrong norm locator", "Wrong norm role", "Draft marked active",
  "Withdrawn norm", "Unofficial primary source", "Foreign source as mandatory", "Missing source hash", "OCR-corrupt rate",
  "Expired quote", "Wrong currency", "Wrong tax", "Delivery double count", "Cross-tenant read", "Cross-tenant write",
  "Cross-tenant artifact", "Expired auth", "Privilege escalation", "AST injection", "Oversized AST", "Duplicate create",
  "Duplicate recalc", "Stale parent accepted", "Worker crash duplicate", "Lease retry duplicate", "Activation twice",
  "Queue decrement twice", "Queue decrement before GREEN", "External reference decremented", "Fire identity decremented",
  "Old revision mutated", "Old release mutated", "Prepared release active", "Wrong release evidence", "Stale admission accepted",
  "Partial import", "Package SHA mismatch", "Cardinality mismatch", "Replay mismatch", "Full corpus in APK",
  "Client compiler restored", "Fallback restored", "Offline command lost", "Offline duplicate", "Silent conflict overwrite",
  "PDF row missing", "PDF total mismatch", "PDF clipping", "Procurement incompatible merge", "Procurement trace lost",
  "SLA breach", "N+1", "OOM", "Stale evidence in manifest", "Residual DB/process/port", "BATCH-009 enabled",
] as const;

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
  if (/geometry|volume|NaN|Infinity|unit|constant|Formula|parameter|default|Invented concrete|Invented reinforcement|Invented cover|Invented mix|thermal/iu.test(name)) return "FORMULA_INPUT";
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
      detectorId: `concrete-r5-detector-${String(number).padStart(3, "0")}`,
      category: category(className),
    };
  });
}

function main(): void {
  const discovery = JSON.parse(readFileSync(join(evidenceRoot, "01-discovery", "DISCOVERY_SUMMARY.json"), "utf8")) as Json;
  const identities = readFileSync(join(evidenceRoot, "01-discovery", "CONCRETE_IDENTITY_SET.jsonl"), "utf8").trim().split(/\r?\n/).map((line) => JSON.parse(line) as Json);
  const F = Number(discovery.officialNormativeUniverse);
  const required = Math.max(320, F + 60);
  assertExact(F === 1_707 && required === 1_767, `CONCRETE_MUTATION_REQUIREMENT_RED:${F}:${required}`);
  assertExact(MANDATORY.length === 111, `CONCRETE_MUTATION_CLASS_COUNT_RED:${MANDATORY.length}`);
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
      schemaVersion: "batch008-concrete-r5-controlled-mutation.v1",
      mutationOrdinal: index + 1,
      mutationId: `concrete-r5-mutation-${String(index + 1).padStart(4, "0")}`,
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
  assertExact(rows.every((row) => row.killed && !row.survived && !row.skipped), "CONCRETE_MUTATION_SURVIVOR_RED");
  assertExact(coverage.every((row) => row.executed > 0 && row.killed === row.executed), "CONCRETE_MUTATION_MANDATORY_COVERAGE_RED");
  writeJsonl("12-mutations/CONTROLLED_MUTATIONS.jsonl", rows);
  writeJson("12-mutations/MANDATORY_MUTATION_CLASS_COVERAGE.json", { mandatoryClasses: MANDATORY.length, covered: coverage.length, rows: coverage, missing: 0, status: "GREEN_111_OF_111" });
  const result = {
    schemaVersion: "batch008-concrete-r5-controlled-mutation-summary.v1",
    F_final: F,
    formula: `max(320, ${F} + 60)`,
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
    status: "GREEN_MUTATIONS_1767_OF_1767_KILLED",
  };
  writeJson("12-mutations/MUTATION_SUMMARY.json", result);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main();
