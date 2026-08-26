import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { Client } from "pg";

import { buildStripFoundationContentPassportR3 } from "./buildStripFoundationContentPassportR3";
import {
  REAL_PROFESSIONAL_ESTIMATES_R2_SPEC_SHA256,
  REINFORCED_CONCRETE_STRIP_FOUNDATION_PASSPORT,
  STRIP_FOUNDATION_FORMULAS,
  STRIP_FOUNDATION_GOLD_INPUT,
  STRIP_FOUNDATION_INPUTS,
  STRIP_FOUNDATION_ROWS,
  compileStripFoundationEstimate,
} from "./reinforcedConcreteStripFoundationR1";
import { auditRealProfessionalRowsR1 } from "./realProfessionalEstimateContentGateR1";

type Json = Record<string, any>;

const EXPECTED_BRANCH = "codex/p0-one-monolith-r5";
const PREDECESSOR_RELEASE_ID = process.env.CANONICAL_ESTIMATE_TARGET_RELEASE_ID
  ?? "4c5affaf-5f63-5d04-b036-875c684f8c45";
const ACTIVE_RELEASE_ID = "da29dc2b-1384-5487-b8da-6ee93f4e514e";
const TARGET_CATALOG_ID = "concrete_foundation_interior_strip_foundation_form_standard";
const MASTER_SPEC_PATH = resolve("C:/Users/User/Downloads/MASTER_TZ_REAL_PROFESSIONAL_ESTIMATES_R1_RU (1).md");
const CONTRACT = "real-professional-estimates-r2.concrete-strip-foundation-successor.v1";
const RELEASE_KEY = `real-professional-estimates-r2-concrete-strip-${REAL_PROFESSIONAL_ESTIMATES_R2_SPEC_SHA256.slice(0, 8)}`;
const DATABASE_URL = process.env.MONOLITH_ESTIMATE_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/batch009_fire_r5_a";
const APPLY = process.argv.includes("--apply");
const OUTPUT = resolve(
  `.release-runtime/real-professional-estimates-r2/evidence/03-successor/${APPLY
    ? "CONCRETE_STRIP_SUCCESSOR_APPLY.json"
    : "CONCRETE_STRIP_SUCCESSOR_DRY_RUN.json"}`,
);

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Json)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, stable(child)]));
  }
  return value;
}

function sha256(value: unknown): string {
  return createHash("sha256")
    .update(typeof value === "string" || Buffer.isBuffer(value) ? value : JSON.stringify(stable(value)))
    .digest("hex");
}

function deterministicUuid(seed: string): string {
  const bytes = Buffer.from(sha256(seed).slice(0, 32), "hex");
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function git(args: readonly string[]): string {
  return execFileSync("git", [...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30_000,
  }).trim();
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

async function insertBatches(
  client: Client,
  table: string,
  columns: readonly string[],
  rows: readonly unknown[][],
): Promise<void> {
  for (let offset = 0; offset < rows.length; offset += 100) {
    const batch = rows.slice(offset, offset + 100);
    const values: unknown[] = [];
    const tuples = batch.map((row) => {
      invariant(row.length === columns.length, `CONCRETE_R6_INSERT_COLUMN_MISMATCH:${table}`);
      return `(${row.map((value) => {
        values.push(value);
        return `$${values.length}`;
      }).join(",")})`;
    });
    if (tuples.length > 0) {
      await client.query(`insert into public.${table}(${columns.join(",")}) values ${tuples.join(",")}`, values);
    }
  }
}

async function main(): Promise<void> {
  invariant(existsSync(MASTER_SPEC_PATH), "CONCRETE_R6_R2_MASTER_SPEC_MISSING");
  invariant(sha256(readFileSync(MASTER_SPEC_PATH)) === REAL_PROFESSIONAL_ESTIMATES_R2_SPEC_SHA256,
    "CONCRETE_R6_R2_MASTER_SPEC_SHA256_DRIFT");
  const branch = git(["branch", "--show-current"]);
  const head = git(["rev-parse", "HEAD"]);
  const tree = git(["show", "-s", "--format=%T", "HEAD"]);
  const worktreeStatus = git(["status", "--porcelain=v1"]);
  invariant(branch === EXPECTED_BRANCH, `CONCRETE_R6_BRANCH_DRIFT:${branch}`);
  if (APPLY) {
    const allowedDirtyPaths = [
      "scripts/estimate/batch001008R2/",
      "scripts/estimate/concreteBackendR6/",
      "tests/estimateBackend/concreteR6Professional.contract.test.ts",
    ];
    const unexpectedDirtyPaths = worktreeStatus.split(/\r?\n/u).filter(Boolean)
      .map((line) => line.slice(3).replaceAll("\\", "/"))
      .filter((path) => !allowedDirtyPaths.some((prefix) => path.startsWith(prefix)));
    invariant(unexpectedDirtyPaths.length === 0,
      `CONCRETE_R6_APPLY_UNEXPECTED_DIRTY_PATHS:${unexpectedDirtyPaths.join(",")}`);
  }

  const compiledGold = compileStripFoundationEstimate(STRIP_FOUNDATION_GOLD_INPUT);
  invariant(auditRealProfessionalRowsR1(compiledGold).length === 0, "CONCRETE_R6_GOLD_CONTENT_GATE_RED");
  invariant(new Set(compiledGold.map((row) => row.category)).size === 4, "CONCRETE_R6_GOLD_FOUR_CATEGORIES_RED");

  const releaseId = deterministicUuid(`${CONTRACT}:release:${RELEASE_KEY}`);
  const definitionId = deterministicUuid(`${CONTRACT}:definition:${TARGET_CATALOG_ID}`);
  const baselineId = deterministicUuid(`${CONTRACT}:baseline:${TARGET_CATALOG_ID}`);
  const {
    formulaConsumers,
    resourceConsumers,
    decision: contentPassportDecision,
  } = buildStripFoundationContentPassportR3();
  const goldInputValues = Object.fromEntries(Object.entries(STRIP_FOUNDATION_GOLD_INPUT)
    .filter(([parameterId]) => (resourceConsumers[parameterId]?.length ?? 0) > 0));
  invariant(Object.keys(goldInputValues).length === Object.keys(STRIP_FOUNDATION_GOLD_INPUT).length,
    "CONCRETE_R6_GOLD_INPUT_WITHOUT_CONSUMER");
  invariant(contentPassportDecision.allowed,
    `CONCRETE_R6_R3_CONTENT_PASSPORT_RED:${contentPassportDecision.errors.join("|")}`);

  const parameterSchemaSha256 = sha256(STRIP_FOUNDATION_INPUTS.map((parameter) => [
    parameter.parameterId,
    parameter.valueType,
    parameter.unitId,
    parameter.required,
    parameter.requiredWhen ?? null,
    parameter.choices ?? [],
    parameter.visibilityRole,
  ]));
  const acceptanceEvidenceSha256 = sha256({
    contract: CONTRACT,
    specSha256: REAL_PROFESSIONAL_ESTIMATES_R2_SPEC_SHA256,
    parameterSchemaSha256,
    goldInputValues,
    goldRows: compiledGold.map((row) => [row.rowId, row.category, row.evaluatedQuantity, row.normalizedUom]),
    formulaConsumers,
    resourceConsumers,
    contentPassportDecision,
  });
  const definitionSha256 = sha256({
    contract: CONTRACT,
    passport: REINFORCED_CONCRETE_STRIP_FOUNDATION_PASSPORT,
    parameterSchemaSha256,
    formulas: STRIP_FOUNDATION_FORMULAS.map((formula) => [formula.formulaId, sha256(formula.ast)]),
    rows: STRIP_FOUNDATION_ROWS,
  });

  const client = new Client({
    connectionString: DATABASE_URL,
    application_name: APPLY ? "concrete-r6-strip-successor-apply" : "concrete-r6-strip-successor-dry-run",
  });
  await client.connect();
  let proof: Json;
  try {
    await client.query("begin");
    await client.query("set local lock_timeout='5s'");
    await client.query("set local statement_timeout='180s'");
    const predecessor = (await client.query(
      "select * from public.estimate_definition_release where id=$1",
      [PREDECESSOR_RELEASE_ID],
    )).rows[0] as Json | undefined;
    const active = (await client.query(
      "select id::text,status from public.estimate_definition_release where id=$1",
      [ACTIVE_RELEASE_ID],
    )).rows[0] as Json | undefined;
    invariant(predecessor?.status === "prepared" && Number(predecessor.definition_count) === 4_282,
      "CONCRETE_R6_PREDECESSOR_DRIFT");
    invariant(active?.status === "active", "CONCRETE_R6_ACTIVE_RELEASE_DRIFT");

    const existing = (await client.query(
      "select * from public.estimate_definition_release where release_key=$1",
      [RELEASE_KEY],
    )).rows[0] as Json | undefined;
    if (existing) {
      invariant(existing.id === releaseId && existing.status === "prepared"
        && existing.parent_release_id === PREDECESSOR_RELEASE_ID, "CONCRETE_R6_EXISTING_SUCCESSOR_DRIFT");
      const existingCounts = (await client.query(`select
        count(*)::int definitions,
        count(*) filter(where domain_id='concrete')::int concrete_total,
        count(*) filter(where domain_id='concrete' and baseline_ready and scenario_ready)::int concrete_ready,
        count(*) filter(where domain_id='concrete' and not baseline_ready and not scenario_ready)::int concrete_quarantined
        from public.estimate_cumulative_manifest_entry where release_id=$1`, [releaseId])).rows[0] as Json;
      await client.query("rollback");
      proof = {
        schemaVersion: CONTRACT,
        capturedAt: new Date().toISOString(),
        specSha256: REAL_PROFESSIONAL_ESTIMATES_R2_SPEC_SHA256,
        source: { branch, head, tree, clean: worktreeStatus === "" },
        predecessorReleaseId: PREDECESSOR_RELEASE_ID,
        candidateReleaseId: releaseId,
        targetCatalogId: TARGET_CATALOG_ID,
        successorDefinitionId: definitionId,
        successorBaselineId: baselineId,
        manifestCounts: existingCounts,
        idempotent: true,
        activeReleaseSwitched: false,
        runtime8081Switched: false,
        status: "GREEN_CONCRETE_R6_STRIP_SUCCESSOR_IDEMPOTENT_PREPARED_NOT_ACTIVE",
      };
      writeJson(OUTPUT, proof);
      process.stdout.write(`${JSON.stringify(proof, null, 2)}\n`);
      return;
    }

    const predecessorManifest = (await client.query(`
      select m.*,d.definition_version,d.definition_sha256,d.passport,d.applicability,d.source_metadata,
        (select count(*)::int from public.estimate_parameter_definition p where p.definition_version_id=m.definition_version_id) parameter_count,
        (select count(*)::int from public.estimate_formula_graph f where f.definition_version_id=m.definition_version_id) formula_count,
        (select count(*)::int from public.estimate_resource_spec s where s.definition_version_id=m.definition_version_id) resource_count
      from public.estimate_cumulative_manifest_entry m
      join public.estimate_definition_version d on d.id=m.definition_version_id
      where m.release_id=$1 and m.catalog_id=$2
    `, [PREDECESSOR_RELEASE_ID, TARGET_CATALOG_ID])).rows[0] as Json | undefined;
    invariant(predecessorManifest, "CONCRETE_R6_TARGET_PREDECESSOR_MISSING");
    const predecessorDefinitionId = String(predecessorManifest.definition_version_id);
    const predecessorBaselineId = predecessorManifest.approved_template_baseline_id == null
      ? null
      : String(predecessorManifest.approved_template_baseline_id);
    const nextDefinitionVersion = Number((await client.query(
      "select coalesce(max(definition_version),0)::int+1 value from public.estimate_definition_version where catalog_id=$1",
      [TARGET_CATALOG_ID],
    )).rows[0].value);
    const normativeSource = (await client.query(`
      select id::text,source_key,title_ru,authority,official_url,artifact_sha256,effective_from,metadata
      from public.estimate_normative_source
      where source_key='krer_06_2015'
    `)).rows[0] as Json | undefined;
    invariant(normativeSource, "CONCRETE_R6_KRER_SOURCE_MISSING");
    invariant(normativeSource.official_url === "https://minstroy.gov.kg/ru/kyzmat/422/show"
      && normativeSource.artifact_sha256 === "45c065fb0e35586948fdb06cd21fe331358e2c454c25a4dc83d4a686bf9f3e4b",
    "CONCRETE_R6_KRER_SNAPSHOT_DRIFT");
    const normativeLocatorPayload = {
      sourceId: "krer_06_2015",
      documentCode: "КРЕР 81-02-06-2015",
      edition: "2015",
      tableCode: "06-01-001",
      rateCode: "06-01-001-09",
      meter: "100 м³ железобетона в деле",
      pdfPage: 18,
      exactLocator: "КРЕР №6:PDF_PAGE_18:TABLE_06-01-001:RATE_06-01-001-09",
      applicabilityRu: "Железобетонные фундаменты общего назначения объёмом более 25 м³",
      officialPageUrl: "https://minstroy.gov.kg/ru/kyzmat/422/show",
      officialPdfSha256: "45c065fb0e35586948fdb06cd21fe331358e2c454c25a4dc83d4a686bf9f3e4b",
    };
    const normativeLocatorKey = sha256(normativeLocatorPayload);
    const normativeLocatorId = deterministicUuid(`${CONTRACT}:normative-locator:${normativeLocatorKey}`);
    await client.query(`insert into public.estimate_normative_locator(
      id,source_id,locator_key,locator,excerpt_sha256
    ) values($1,$2,$3,$4::jsonb,null) on conflict(source_id,locator_key) do nothing`, [
      normativeLocatorId,
      normativeSource.id,
      normativeLocatorKey,
      JSON.stringify(normativeLocatorPayload),
    ]);
    const normativeLocator = (await client.query(`
      select locator.id::text,locator.locator_key,locator.locator,source.source_key,source.artifact_sha256
      from public.estimate_normative_locator locator
      join public.estimate_normative_source source on source.id=locator.source_id
      where locator.source_id=$1 and locator.locator_key=$2
    `, [normativeSource.id, normativeLocatorKey])).rows[0] as Json | undefined;
    invariant(normativeLocator
      && normativeLocator.id === normativeLocatorId
      && normativeLocator.source_key === "krer_06_2015"
      && normativeLocator.artifact_sha256 === normativeLocatorPayload.officialPdfSha256
      && JSON.stringify(stable(normativeLocator.locator)) === JSON.stringify(stable(normativeLocatorPayload)),
    "CONCRETE_R6_KRER_LOCATOR_DRIFT");

    const parameters = STRIP_FOUNDATION_INPUTS.map((parameter, ordinal) => ({
      definition_version_id: definitionId,
      parameter_id: parameter.parameterId,
      ordinal,
      value_type: parameter.valueType,
      unit_id: parameter.unitId,
      title_ru: parameter.titleRu,
      required: parameter.required,
      default_value: null,
      constraints_json: {
        ...(parameter.choices == null ? {} : { choices: parameter.choices }),
        ...(parameter.requiredWhen == null ? {} : { requiredWhen: parameter.requiredWhen }),
      },
      truth_metadata: {
        semantic_parameter_key: `${TARGET_CATALOG_ID}:${parameter.parameterId}`,
        visibility_role: parameter.visibilityRole,
        value_source_role: parameter.visibilityRole === "INTERNAL_ONLY"
          ? parameter.sourceRole
          : "PROJECT_SPECIFIC_INPUT",
        ...(parameter.visibilityRole === "INTERNAL_ONLY"
          ? {}
          : {
            guide: {
              guide_kind: parameter.valueType === "enum" || parameter.valueType === "boolean"
                ? "ENUM_DECISION_RULE"
                : "MEASUREMENT_RULE",
              guide_short_ru: parameter.guideRu,
              source_role: parameter.sourceRole,
              guide_version: CONTRACT,
              source_snapshot_hash: sha256({
                contract: CONTRACT,
                parameterId: parameter.parameterId,
                sourceRole: parameter.sourceRole,
                guideRu: parameter.guideRu,
              }),
              applicability: REINFORCED_CONCRETE_STRIP_FOUNDATION_PASSPORT.canonicalRuName,
              verified_at: "2026-08-18",
            },
          }),
        validation_rules: ["declared_type", "work_specific_applicability", "no_hidden_geometry_default"],
        normative_links: [parameter.sourceRole],
        formula_consumers: formulaConsumers[parameter.parameterId],
        resource_branch_consumers: resourceConsumers[parameter.parameterId],
        provenance: {
          baselineOwner: "approved-template-baseline:r54",
          sourceCatalogId: TARGET_CATALOG_ID,
          sourceReleaseId: releaseId,
          sourceDefinitionVersionId: definitionId,
          sourceParameterSchemaId: parameterSchemaSha256,
          approvedTemplateBaselineId: baselineId,
          acceptanceEvidenceSha256,
          approvedTemplateBinding: {
            contract: CONTRACT,
            businessSemanticsChanged: true,
          },
        },
        contract: CONTRACT,
        spec_sha256: REAL_PROFESSIONAL_ESTIMATES_R2_SPEC_SHA256,
      },
      approved_template_baseline_id: baselineId,
    }));
    const formulas = STRIP_FOUNDATION_FORMULAS.map((formula) => ({
      definition_version_id: definitionId,
      formula_id: formula.formulaId,
      output_unit_id: formula.outputUnitId,
      expression_source: formula.source,
      ast: formula.ast,
      input_parameter_ids: formula.inputParameterIds,
      ast_sha256: sha256(formula.ast),
    }));
    const sectionByCategory = {
      material: "Конкретные материалы",
      construction_work: "Конкретные строительные работы",
      machine_equipment: "Конкретные машины и оборудование",
      delivery: "Конкретная доставка",
    } as const;
    const physicalTypeByCategory = {
      material: "material",
      construction_work: "work",
      machine_equipment: "equipment",
      delivery: "transport",
    } as const;
    const resourceIdByRowId = new Map<string, string>();
    const resources = STRIP_FOUNDATION_ROWS.map((row, ordinal) => {
      const id = deterministicUuid(`${CONTRACT}:resource:${TARGET_CATALOG_ID}:${row.rowId}`);
      resourceIdByRowId.set(row.rowId, id);
      const sourceMetadata = {
        truth_contract_version: "REAL_PROFESSIONAL_ESTIMATES_R2",
        contract: CONTRACT,
        specSha256: REAL_PROFESSIONAL_ESTIMATES_R2_SPEC_SHA256,
        category: row.category,
        visibility: row.visibility,
        procurementMode: row.procurementMode,
        includedInParentRate: row.includedInParentRate,
        normSource: row.normSource,
        ...(row.cargo ? { cargo: row.cargo } : {}),
      };
      const resourceGraph = {
        semanticOwnerId: row.semanticOwnerId,
        formulaId: row.formulaId,
        category: row.category,
        normalizedUom: row.normalizedUom,
        costOwner: row.costOwner,
        ...(row.cargo ? { cargo: row.cargo } : {}),
      };
      return {
        id,
        definition_version_id: definitionId,
        row_id: row.rowId,
        ordinal,
        section: sectionByCategory[row.category],
        category: row.category,
        title_ru: row.canonicalRuName,
        row_type: physicalTypeByCategory[row.category],
        unit_id: row.normalizedUom,
        formula_id: row.formulaId,
        inclusion_ast: row.applicabilityExpression,
        resource_graph: resourceGraph,
        semantic_owner: row.semanticOwnerId,
        cost_owner_id: row.costOwner === "rate_item" ? `rate-item:${row.rateItemId}` : row.semanticOwnerId,
        procurement_eligible: row.category !== "construction_work" && !row.includedInParentRate,
        source_metadata: sourceMetadata,
        row_sha256: sha256({ contract: CONTRACT, row, sourceMetadata, resourceGraph }),
      };
    });
    invariant(new Set(resources.map((row) => row.semantic_owner)).size === resources.length,
      "CONCRETE_R6_RESOURCE_SEMANTIC_OWNER_COLLISION");

    const baseline = {
      id: baselineId,
      baseline_key: `real-professional-r2:${TARGET_CATALOG_ID}:${REAL_PROFESSIONAL_ESTIMATES_R2_SPEC_SHA256.slice(0, 8)}`,
      catalog_id: TARGET_CATALOG_ID,
      definition_version_id: definitionId,
      source_definition_version_id: predecessorDefinitionId,
      parameter_schema_sha256: parameterSchemaSha256,
      input_values: goldInputValues,
      input_classification: Object.fromEntries(Object.keys(goldInputValues).map((id) => [id, "ASSUMPTION"])),
      uom_by_parameter: Object.fromEntries(Object.keys(goldInputValues).map((id) => [
        id,
        STRIP_FOUNDATION_INPUTS.find((parameter) => parameter.parameterId === id)?.unitId ?? null,
      ])),
      formula_consumer_ids: Object.fromEntries(Object.keys(goldInputValues).map((id) => [id, formulaConsumers[id]])),
      resource_consumer_row_ids: Object.fromEntries(Object.keys(goldInputValues).map((id) => [id, resourceConsumers[id]])),
      normative_source_ids: Object.fromEntries(Object.keys(goldInputValues).map((id) => [
        id,
        [STRIP_FOUNDATION_INPUTS.find((parameter) => parameter.parameterId === id)?.sourceRole ?? "PROJECT_DOCUMENTATION"],
      ])),
      guide_provenance_ru: Object.fromEntries(Object.keys(goldInputValues).map((id) => [
        id,
        STRIP_FOUNDATION_INPUTS.find((parameter) => parameter.parameterId === id)?.guideRu ?? "Параметр эталонного сценария.",
      ])),
      proposal_source_refs: [{
        contract: CONTRACT,
        specSha256: REAL_PROFESSIONAL_ESTIMATES_R2_SPEC_SHA256,
        sourceCommit: head,
        sourceTree: tree,
      }],
      validation_scenario_refs: [{
        scenario: "STRIP_FOUNDATION_40X0_5X1_5_GOLD",
        acceptanceEvidenceSha256,
        expected: { concreteNetM3: 30, concreteOrderM3: 30.6, preparationM3: 2, formworkM2: 120, curingM2: 20 },
      }],
      acceptance_evidence_sha256: acceptanceEvidenceSha256,
      accepted_release_id: releaseId,
      accepted_at: new Date(),
      supersedes_baseline_id: predecessorBaselineId,
      contract_version: "APPROVED_TEMPLATE_BASELINE_R54_V1",
    };
    const nextCounts = {
      definitionCount: Number(predecessor.definition_count),
      parameterCount: Number(predecessor.parameter_count) - Number(predecessorManifest.parameter_count) + parameters.length,
      formulaCount: Number(predecessor.formula_count) - Number(predecessorManifest.formula_count) + formulas.length,
      resourceCount: Number(predecessor.resource_row_count) - Number(predecessorManifest.resource_count) + resources.length,
    };

    await client.query(`insert into public.estimate_definition_release(
      id,release_key,schema_version,status,source_commit,source_tree,source_manifest_sha256,
      definition_count,resource_row_count,metadata,parent_release_id,source_package_sha256,parameter_count,formula_count
    ) values($1,$2,$3,'draft',$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12,$13)`, [
      releaseId,
      RELEASE_KEY,
      predecessor.schema_version,
      head,
      tree,
      sha256({ contract: CONTRACT, predecessorReleaseId: PREDECESSOR_RELEASE_ID, definitionSha256 }),
      nextCounts.definitionCount,
      nextCounts.resourceCount,
      JSON.stringify({
        realProfessionalEstimatesR2: {
          contract: CONTRACT,
          specSha256: REAL_PROFESSIONAL_ESTIMATES_R2_SPEC_SHA256,
          predecessorReleaseId: PREDECESSOR_RELEASE_ID,
          reviewedDefinitionCount: 1,
          quarantinedLegacyConcreteCount: 1_219,
          activeReleaseSwitched: false,
          searchCutover: false,
          runtime8081Switched: false,
          terminalGreenClaimed: false,
        },
      }),
      PREDECESSOR_RELEASE_ID,
      sha256({ contract: CONTRACT, head, tree, definitionSha256, acceptanceEvidenceSha256 }),
      nextCounts.parameterCount,
      nextCounts.formulaCount,
    ]);
    await client.query(`insert into public.estimate_cumulative_manifest_entry(
      release_id,catalog_id,definition_version_id,source_batch,source_release_id,domain_id,publication_state,
      approved_template_baseline_id,baseline_ready,scenario_ready,definition_hash,entry_sha256
    ) select $1,catalog_id,definition_version_id,source_batch,source_release_id,domain_id,publication_state,
      case when domain_id='concrete' then null else approved_template_baseline_id end,
      case when domain_id='concrete' then false else baseline_ready end,
      case when domain_id='concrete' then false else scenario_ready end,
      definition_hash,encode(extensions.digest(convert_to($2||':'||catalog_id||':'||entry_sha256,'UTF8'),'sha256'),'hex')
      from public.estimate_cumulative_manifest_entry where release_id=$3`, [releaseId, CONTRACT, PREDECESSOR_RELEASE_ID]);
    await client.query(`insert into public.estimate_definition_version(
      id,release_id,catalog_id,definition_version,passport,applicability,definition_sha256,source_metadata
    ) values($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8::jsonb)`, [
      definitionId,
      releaseId,
      TARGET_CATALOG_ID,
      nextDefinitionVersion,
      JSON.stringify(REINFORCED_CONCRETE_STRIP_FOUNDATION_PASSPORT),
      JSON.stringify({
        allowedScopes: REINFORCED_CONCRETE_STRIP_FOUNDATION_PASSPORT.allowedScopes,
        technologyChoices: REINFORCED_CONCRETE_STRIP_FOUNDATION_PASSPORT.technologyChoices,
        failClosed: true,
      }),
      definitionSha256,
      JSON.stringify({
        contract: CONTRACT,
        specSha256: REAL_PROFESSIONAL_ESTIMATES_R2_SPEC_SHA256,
        predecessorDefinitionId,
        predecessorDefinitionSha256: predecessorManifest.definition_sha256,
        parameterSchemaSha256,
        acceptanceEvidenceSha256,
        contentStatus: "reviewed",
      }),
    ]);
    await client.query(`insert into public.estimate_approved_template_baseline(
      id,baseline_key,catalog_id,definition_version_id,source_definition_version_id,parameter_schema_sha256,
      input_values,input_classification,uom_by_parameter,formula_consumer_ids,resource_consumer_row_ids,
      normative_source_ids,guide_provenance_ru,proposal_source_refs,validation_scenario_refs,
      acceptance_evidence_sha256,accepted_release_id,accepted_at,supersedes_baseline_id,contract_version
    ) values($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,$10::jsonb,$11::jsonb,$12::jsonb,$13::jsonb,
      $14::jsonb,$15::jsonb,$16,$17,$18,$19,$20)`, [
      baseline.id,
      baseline.baseline_key,
      baseline.catalog_id,
      baseline.definition_version_id,
      baseline.source_definition_version_id,
      baseline.parameter_schema_sha256,
      JSON.stringify(baseline.input_values),
      JSON.stringify(baseline.input_classification),
      JSON.stringify(baseline.uom_by_parameter),
      JSON.stringify(baseline.formula_consumer_ids),
      JSON.stringify(baseline.resource_consumer_row_ids),
      JSON.stringify(baseline.normative_source_ids),
      JSON.stringify(baseline.guide_provenance_ru),
      JSON.stringify(baseline.proposal_source_refs),
      JSON.stringify(baseline.validation_scenario_refs),
      baseline.acceptance_evidence_sha256,
      baseline.accepted_release_id,
      baseline.accepted_at,
      baseline.supersedes_baseline_id,
      baseline.contract_version,
    ]);
    await insertBatches(client, "estimate_parameter_definition", [
      "definition_version_id", "parameter_id", "ordinal", "value_type", "unit_id", "title_ru", "required",
      "default_value", "constraints_json", "truth_metadata", "approved_template_baseline_id",
    ], parameters.map((parameter) => [
      parameter.definition_version_id,
      parameter.parameter_id,
      parameter.ordinal,
      parameter.value_type,
      parameter.unit_id,
      parameter.title_ru,
      parameter.required,
      parameter.default_value,
      parameter.constraints_json,
      parameter.truth_metadata,
      parameter.approved_template_baseline_id,
    ]));
    await insertBatches(client, "estimate_formula_graph", [
      "definition_version_id", "formula_id", "output_unit_id", "expression_source", "ast",
      "input_parameter_ids", "ast_sha256",
    ], formulas.map((formula) => [
      formula.definition_version_id,
      formula.formula_id,
      formula.output_unit_id,
      formula.expression_source,
      formula.ast,
      formula.input_parameter_ids,
      formula.ast_sha256,
    ]));
    await insertBatches(client, "estimate_resource_spec", [
      "id", "definition_version_id", "row_id", "ordinal", "section", "category", "title_ru", "row_type",
      "unit_id", "formula_id", "inclusion_ast", "resource_graph", "semantic_owner", "cost_owner_id",
      "procurement_eligible", "source_metadata", "row_sha256",
    ], resources.map((resource) => [
      resource.id,
      resource.definition_version_id,
      resource.row_id,
      resource.ordinal,
      resource.section,
      resource.category,
      resource.title_ru,
      resource.row_type,
      resource.unit_id,
      resource.formula_id,
      resource.inclusion_ast,
      resource.resource_graph,
      resource.semantic_owner,
      resource.cost_owner_id,
      resource.procurement_eligible,
      resource.source_metadata,
      resource.row_sha256,
    ]));
    const normativeRows = STRIP_FOUNDATION_ROWS.filter((row) => row.normSource.sourceKey === "krer_06_2015");
    await insertBatches(client, "estimate_work_normative_binding", [
      "definition_version_id", "resource_spec_id", "locator_id", "applicability",
    ], normativeRows.map((row) => [
      definitionId,
      resourceIdByRowId.get(row.rowId),
      normativeLocator.id,
      { rateCode: row.normSource.rateCode, tableCode: row.normSource.tableCode, pdfPage: row.normSource.pdfPage },
    ]));
    await client.query(`update public.estimate_cumulative_manifest_entry set
      definition_version_id=$3,source_batch='REAL_PROFESSIONAL_ESTIMATES_R2',source_release_id=$1,
      publication_state='CANONICAL_SUCCESSOR',approved_template_baseline_id=$4,
      baseline_ready=true,scenario_ready=true,definition_hash=$5,entry_sha256=$6
      where release_id=$1 and catalog_id=$2`, [
      releaseId,
      TARGET_CATALOG_ID,
      definitionId,
      baselineId,
      definitionSha256,
      sha256({ contract: CONTRACT, releaseId, catalogId: TARGET_CATALOG_ID, definitionId, baselineId, definitionSha256 }),
    ]);
    const counts = (await client.query(`select
      count(*)::int definitions,
      count(distinct catalog_id)::int unique_catalogs,
      count(*) filter(where domain_id='concrete')::int concrete_total,
      count(*) filter(where domain_id='concrete' and baseline_ready and scenario_ready)::int concrete_ready,
      count(*) filter(where domain_id='concrete' and not baseline_ready and not scenario_ready)::int concrete_quarantined,
      count(*) filter(where catalog_id=$2 and definition_version_id=$3 and approved_template_baseline_id=$4)::int repaired
      from public.estimate_cumulative_manifest_entry where release_id=$1`, [releaseId, TARGET_CATALOG_ID, definitionId, baselineId])).rows[0] as Json;
    invariant(counts.definitions === 4_282 && counts.unique_catalogs === 4_282
      && counts.concrete_total === 1_220 && counts.concrete_ready === 1
      && counts.concrete_quarantined === 1_219 && counts.repaired === 1,
    `CONCRETE_R6_MANIFEST_COUNTS:${JSON.stringify(counts)}`);
    await client.query(`update public.estimate_definition_release set status='prepared',sealed_at=now(),
      metadata=metadata||$2::jsonb where id=$1 and status='draft' and sealed_at is null`, [
      releaseId,
      JSON.stringify({ lifecycle: "PREPARED_CONCRETE_R6_STRIP_SUCCESSOR_NOT_ACTIVE", manifestCounts: counts }),
    ]);

    proof = {
      schemaVersion: CONTRACT,
      capturedAt: new Date().toISOString(),
      specSha256: REAL_PROFESSIONAL_ESTIMATES_R2_SPEC_SHA256,
      source: { branch, head, tree, clean: worktreeStatus === "" },
      predecessorReleaseId: PREDECESSOR_RELEASE_ID,
      activeReleaseId: ACTIVE_RELEASE_ID,
      candidateReleaseId: releaseId,
      targetCatalogId: TARGET_CATALOG_ID,
      predecessorDefinitionId,
      successorDefinitionId: definitionId,
      predecessorBaselineId,
      successorBaselineId: baselineId,
      nextCounts,
      manifestCounts: counts,
      parameterCount: parameters.length,
      formulaCount: formulas.length,
      resourceCount: resources.length,
      goldCompiledRowCount: compiledGold.length,
      goldCategoryCounts: Object.fromEntries([...new Set(compiledGold.map((row) => row.category))]
        .map((category) => [category, compiledGold.filter((row) => row.category === category).length])),
      normativeLocator,
      parameterSchemaSha256,
      definitionSha256,
      acceptanceEvidenceSha256,
      activeReleaseSwitched: false,
      searchCutover: false,
      runtime8081Switched: false,
      writesApplied: APPLY ? 1 : 0,
      status: APPLY
        ? "GREEN_CONCRETE_R6_STRIP_SUCCESSOR_PREPARED_NOT_ACTIVE"
        : "GREEN_CONCRETE_R6_STRIP_SUCCESSOR_DRY_RUN_ROLLED_BACK",
    };
    if (APPLY) await client.query("commit"); else await client.query("rollback");
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }

  writeJson(OUTPUT, proof!);
  process.stdout.write(`${JSON.stringify(proof!, null, 2)}\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
