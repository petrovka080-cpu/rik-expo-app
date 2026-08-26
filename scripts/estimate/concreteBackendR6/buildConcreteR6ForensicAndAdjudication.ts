import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { Client } from "pg";

import { REAL_PROFESSIONAL_ESTIMATES_R1_SPEC_SHA256 } from "./reinforcedConcreteStripFoundationR1";

type Json = Record<string, any>;
type LegacyClassification = "ALIAS" | "VARIANT" | "INDEPENDENT_WORK" | "GARBAGE";

const MASTER_SPEC_PATH = resolve("C:/Users/User/Downloads/MASTER_TZ_REAL_PROFESSIONAL_ESTIMATES_R1_RU.md");
const LEGACY_GENERATOR_PATH = resolve("scripts/estimate/concreteBackendR5/concreteR5Model.ts");
const CANDIDATE_RELEASE_ID = process.env.CANONICAL_ESTIMATE_TARGET_RELEASE_ID
  ?? "4c5affaf-5f63-5d04-b036-875c684f8c45";
const DATABASE_URL = process.env.MONOLITH_ESTIMATE_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/batch009_fire_r5_a";
const OUTPUT_ROOT = resolve(".release-runtime/real-professional-estimates-r1/evidence/02-concrete-forensic");

const FORBIDDEN_TITLE_PATTERN = [
  "контрол", "надзор", "журнал", "акт\\M", "реестр", "фото", "инструктаж", "обмер",
  "детализац", "испытан", "согласован", "мониторинг", "приемк", "приёмк", "сдач",
  "передач", "координац", "паспорт", "сертификат", "хранен", "сиз\\M",
].join("|");
const GENERIC_TITLE_PATTERN = [
  "поставка состава", "материал для выполнения", "работа механизма", "рабочая детализация",
  "учет технологических обрезков", "учёт технологических обрезков", "учет отходов соединения",
  "учёт отходов соединения", "учет упаковки", "учёт упаковки",
].join("|");
const CROSS_DOMAIN_PATTERN = [
  "асфальт", "гипсокартон", "ламинат", "обои", "кирпич", "газоблок", "кабель", "розет",
  "светильник", "черепиц", "воздуховод", "радиатор", "канализац", "водопровод",
].join("|");

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function sha256File(path: string): string {
  return sha256(readFileSync(path));
}

function git(args: readonly string[]): string {
  return execFileSync("git", [...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30_000,
  }).trim();
}

function numberValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sortedUnique(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function classifyLegacyDefinition(row: Json): {
  classification: LegacyClassification;
  quarantineReasons: string[];
  reviewStatus: "AUTOMATED_QUARANTINE" | "MANUAL_NORMATIVE_REVIEW_REQUIRED";
} {
  const reasons: string[] = [];
  if (numberValue(row.generic_title_rows) > 0) reasons.push("GENERIC_NAME_TEMPLATE");
  if (numberValue(row.constant_formula_count) >= 3) reasons.push("CONSTANT_QUANTITY_CLONE");
  if (numberValue(row.forbidden_non_billable_rows) > 0) reasons.push("NON_BILLABLE_CONTROL_ROW");
  if (numberValue(row.raw_labor_rows) > 0) reasons.push("RAW_INTERNAL_UOM");
  if (numberValue(row.cross_domain_rows) > 0) reasons.push("CROSS_DOMAIN_RESOURCE");
  if (numberValue(row.missing_formula_rows) > 0) reasons.push("MISSING_FORMULA");
  if (numberValue(row.unbound_source_rows) > 0) reasons.push("MISSING_NORM_SOURCE");
  if (numberValue(row.blank_semantic_owner_rows) > 0 || numberValue(row.duplicate_semantic_owner_rows) > 0) {
    reasons.push("DUPLICATE_SEMANTIC_OWNER");
  }

  const quarantineReasons = sortedUnique(reasons);
  if (quarantineReasons.length > 0) {
    return { classification: "GARBAGE", quarantineReasons, reviewStatus: "AUTOMATED_QUARANTINE" };
  }

  const passport = row.passport && typeof row.passport === "object" ? row.passport as Json : {};
  const adjudicationHint = String(passport.adjudicationClass ?? passport.adjudication_class ?? "").toUpperCase();
  if (adjudicationHint === "ALIAS") {
    return { classification: "ALIAS", quarantineReasons: ["ALIAS_PROMOTED_TO_BOQ"], reviewStatus: "MANUAL_NORMATIVE_REVIEW_REQUIRED" };
  }
  if (adjudicationHint === "VARIANT") {
    return { classification: "VARIANT", quarantineReasons: [], reviewStatus: "MANUAL_NORMATIVE_REVIEW_REQUIRED" };
  }
  return { classification: "INDEPENDENT_WORK", quarantineReasons: [], reviewStatus: "MANUAL_NORMATIVE_REVIEW_REQUIRED" };
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function main(): Promise<void> {
  invariant(sha256File(MASTER_SPEC_PATH) === REAL_PROFESSIONAL_ESTIMATES_R1_SPEC_SHA256,
    "REAL_PROFESSIONAL_ESTIMATES_R1_SPEC_DRIFT");

  const generatorText = readFileSync(LEGACY_GENERATOR_PATH, "utf8");
  const client = new Client({ connectionString: DATABASE_URL, application_name: "concrete-r6-forensic-read-only" });
  await client.connect();
  let release: Json;
  let definitions: Json[];
  try {
    await client.query("begin transaction read only");
    await client.query("set local statement_timeout='180s'");
    release = (await client.query(`
      select id::text,release_key,status,definition_count,resource_row_count,source_commit,source_tree,metadata
      from public.estimate_definition_release
      where id=$1
    `, [CANDIDATE_RELEASE_ID])).rows[0] as Json;
    invariant(release, `CONCRETE_R6_RELEASE_NOT_FOUND:${CANDIDATE_RELEASE_ID}`);

    definitions = (await client.query(`
      select
        m.catalog_id,m.definition_version_id::text,m.source_batch,m.publication_state,m.domain_id,
        m.baseline_ready,m.scenario_ready,w.title_ru,w.source_identity,w.work_key,
        d.definition_version,d.definition_sha256,d.passport,d.applicability,d.source_metadata,
        coalesce(resource_summary.resource_count,0)::integer resource_count,
        coalesce(resource_summary.forbidden_non_billable_rows,0)::integer forbidden_non_billable_rows,
        coalesce(resource_summary.generic_title_rows,0)::integer generic_title_rows,
        coalesce(resource_summary.raw_labor_rows,0)::integer raw_labor_rows,
        coalesce(resource_summary.cross_domain_rows,0)::integer cross_domain_rows,
        coalesce(resource_summary.missing_formula_rows,0)::integer missing_formula_rows,
        coalesce(resource_summary.unbound_source_rows,0)::integer unbound_source_rows,
        coalesce(resource_summary.blank_semantic_owner_rows,0)::integer blank_semantic_owner_rows,
        coalesce(resource_summary.duplicate_semantic_owner_rows,0)::integer duplicate_semantic_owner_rows,
        coalesce(resource_summary.forbidden_samples,'{}'::text[]) forbidden_samples,
        coalesce(resource_summary.generic_samples,'{}'::text[]) generic_samples,
        coalesce(resource_summary.cross_domain_samples,'{}'::text[]) cross_domain_samples,
        coalesce(formula_summary.formula_count,0)::integer formula_count,
        coalesce(formula_summary.constant_formula_count,0)::integer constant_formula_count,
        coalesce(formula_summary.constant_formula_samples,'{}'::text[]) constant_formula_samples,
        coalesce(parameter_summary.parameter_count,0)::integer parameter_count
      from public.estimate_cumulative_manifest_entry m
      join public.estimate_definition_version d on d.id=m.definition_version_id
      join public.estimate_work_identity w on w.catalog_id=m.catalog_id
      left join lateral (
        select
          count(*)::integer resource_count,
          count(*) filter (where lower(s.title_ru) ~ $2)::integer forbidden_non_billable_rows,
          count(*) filter (where lower(s.title_ru) ~ $3)::integer generic_title_rows,
          count(*) filter (where s.row_type='labor' or lower(s.unit_id)=any(array['worker_h','man_hour','чел.-ч','чел-ч']))::integer raw_labor_rows,
          count(*) filter (where lower(s.title_ru) ~ $4)::integer cross_domain_rows,
          count(*) filter (where f.formula_id is null)::integer missing_formula_rows,
          count(*) filter (where b.resource_spec_id is null and s.source_metadata='{}'::jsonb)::integer unbound_source_rows,
          count(*) filter (where nullif(btrim(s.semantic_owner),'') is null)::integer blank_semantic_owner_rows,
          greatest(count(*) filter (where nullif(btrim(s.semantic_owner),'') is not null)
            - count(distinct s.semantic_owner),0)::integer duplicate_semantic_owner_rows,
          (array_agg(distinct s.title_ru) filter (where lower(s.title_ru) ~ $2))[1:5] forbidden_samples,
          (array_agg(distinct s.title_ru) filter (where lower(s.title_ru) ~ $3))[1:5] generic_samples,
          (array_agg(distinct s.title_ru) filter (where lower(s.title_ru) ~ $4))[1:5] cross_domain_samples
        from public.estimate_resource_spec s
        left join public.estimate_formula_graph f
          on f.definition_version_id=s.definition_version_id and f.formula_id=s.formula_id
        left join (
          select distinct definition_version_id,resource_spec_id
          from public.estimate_work_normative_binding
        ) b on b.definition_version_id=s.definition_version_id and b.resource_spec_id=s.id
        where s.definition_version_id=m.definition_version_id
      ) resource_summary on true
      left join lateral (
        select count(*)::integer formula_count,
          count(*) filter (where btrim(expression_source) ~ '^[+-]?[0-9]+(?:\\.[0-9]+)?$')::integer constant_formula_count,
          (array_agg(distinct expression_source)
            filter (where btrim(expression_source) ~ '^[+-]?[0-9]+(?:\\.[0-9]+)?$'))[1:8] constant_formula_samples
        from public.estimate_formula_graph
        where definition_version_id=m.definition_version_id
      ) formula_summary on true
      left join lateral (
        select count(*)::integer parameter_count
        from public.estimate_parameter_definition
        where definition_version_id=m.definition_version_id
      ) parameter_summary on true
      where m.release_id=$1 and m.domain_id='concrete'
      order by m.catalog_id
    `, [CANDIDATE_RELEASE_ID, FORBIDDEN_TITLE_PATTERN, GENERIC_TITLE_PATTERN, CROSS_DOMAIN_PATTERN])).rows as Json[];

    await client.query("commit");
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }

  invariant(definitions.length === 1_220, `CONCRETE_R6_EXPECTED_1220_DEFINITIONS:${definitions.length}`);
  const totals = {
    definitions: definitions.length,
    parameters: definitions.reduce((sum, row) => sum + numberValue(row.parameter_count), 0),
    formulas: definitions.reduce((sum, row) => sum + numberValue(row.formula_count), 0),
    resources: definitions.reduce((sum, row) => sum + numberValue(row.resource_count), 0),
  };
  const ledgerEntries = definitions.map((row) => {
    const classification = classifyLegacyDefinition(row);
    return {
      catalogId: row.catalog_id,
      definitionVersionId: row.definition_version_id,
      definitionSha256: row.definition_sha256,
      titleRu: row.title_ru,
      sourceIdentity: row.source_identity,
      workKey: row.work_key,
      classification: classification.classification,
      disposition: "QUARANTINED",
      selectable: false,
      compileEligible: false,
      reviewStatus: classification.reviewStatus,
      quarantineReasons: classification.quarantineReasons,
      evidence: {
        parameterCount: numberValue(row.parameter_count),
        formulaCount: numberValue(row.formula_count),
        resourceCount: numberValue(row.resource_count),
        forbiddenNonBillableRows: numberValue(row.forbidden_non_billable_rows),
        genericTitleRows: numberValue(row.generic_title_rows),
        rawLaborRows: numberValue(row.raw_labor_rows),
        crossDomainRows: numberValue(row.cross_domain_rows),
        missingFormulaRows: numberValue(row.missing_formula_rows),
        unboundSourceRows: numberValue(row.unbound_source_rows),
        blankSemanticOwnerRows: numberValue(row.blank_semantic_owner_rows),
        duplicateSemanticOwnerRows: numberValue(row.duplicate_semantic_owner_rows),
        constantFormulaCount: numberValue(row.constant_formula_count),
        forbiddenSamples: row.forbidden_samples ?? [],
        genericSamples: row.generic_samples ?? [],
        crossDomainSamples: row.cross_domain_samples ?? [],
        constantFormulaSamples: row.constant_formula_samples ?? [],
      },
    };
  });

  const classificationCounts = ledgerEntries.reduce<Record<string, number>>((result, entry) => {
    result[entry.classification] = (result[entry.classification] ?? 0) + 1;
    return result;
  }, {});
  const reasonCounts = ledgerEntries.flatMap((entry) => entry.quarantineReasons)
    .reduce<Record<string, number>>((result, reason) => {
      result[reason] = (result[reason] ?? 0) + 1;
      return result;
    }, {});
  const generatorSignals = {
    levelFloors: [
      ["L1", 80, "L1: 80"],
      ["L2", 180, "L2: 180"],
      ["L3", 350, "L3: 350"],
      ["L4", 700, "L4: 700"],
      ["L5", 1_500, "L5: 1_500"],
    ].filter((entry) => generatorText.includes(String(entry[2]))).map((entry) => ({ level: entry[0], rows: entry[1] })),
    hasActivityExpansion: generatorText.includes("ACTIVITIES"),
    hasComponentPoolRotation: generatorText.includes("function componentPool")
      && generatorText.includes("const rotated = [...candidates.slice(offset), ...candidates.slice(0, offset)]"),
    containsWorkerHour: generatorText.includes("worker_h"),
    containsMachineHour: generatorText.includes("machine_h"),
    containsTestUnit: generatorText.includes('"test"'),
    containsDocumentUnit: generatorText.includes('"document"'),
  };
  invariant(generatorSignals.levelFloors.length === 5, "CONCRETE_R6_GENERATOR_FLOORS_NOT_PROVEN");
  invariant(generatorSignals.hasActivityExpansion && generatorSignals.hasComponentPoolRotation,
    "CONCRETE_R6_GENERATOR_EXPANSION_NOT_PROVEN");

  const provenance = {
    generatedAt: new Date().toISOString(),
    masterSpecPath: MASTER_SPEC_PATH,
    masterSpecSha256: REAL_PROFESSIONAL_ESTIMATES_R1_SPEC_SHA256,
    branch: git(["branch", "--show-current"]),
    head: git(["rev-parse", "HEAD"]),
    tree: git(["show", "-s", "--format=%T", "HEAD"]),
    workingTreeDirty: git(["status", "--porcelain=v1"]) !== "",
    candidateReleaseId: CANDIDATE_RELEASE_ID,
  };
  const report = {
    contract: "real-professional-estimates-r1.concrete-forensic.v1",
    provenance,
    release,
    generator: {
      path: LEGACY_GENERATOR_PATH,
      sha256: sha256File(LEGACY_GENERATOR_PATH),
      signals: generatorSignals,
    },
    observedInventory: totals,
    verdict: "LEGACY_GENERATED_CONCRETE_CONTENT_IS_NOT_ADMISSIBLE_FOR_NEW_REVISIONS",
    enforcement: {
      historicalRevisionMutation: false,
      historicalArtifactMutation: false,
      allLegacyDefinitionsSelectable: false,
      requiredSuccessorPath: "reviewed content passports only",
    },
    classificationCounts,
    quarantineReasonCounts: reasonCounts,
  };
  const ledger = {
    contract: "real-professional-estimates-r1.concrete-adjudication-ledger.v1",
    provenance,
    denominator: ledgerEntries.length,
    classificationCounts,
    quarantineReasonCounts: reasonCounts,
    defaultPolicy: "FAIL_CLOSED_NONSELECTABLE_UNTIL_REVIEWED",
    entries: ledgerEntries,
  };

  writeJson(resolve(OUTPUT_ROOT, "forensic-generator-report.json"), report);
  writeJson(resolve(OUTPUT_ROOT, "quarantine-ledger.json"), ledger);
  process.stdout.write(`${JSON.stringify({
    outputRoot: OUTPUT_ROOT,
    denominator: ledgerEntries.length,
    classificationCounts,
    quarantineReasonCounts: reasonCounts,
    generatorSignals,
  }, null, 2)}\n`);
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
