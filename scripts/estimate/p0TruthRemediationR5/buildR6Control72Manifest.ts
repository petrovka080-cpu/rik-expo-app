import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

type Json = Record<string, any>;
type ControlGroup = "A" | "I" | "E" | "W" | "C" | "H" | "O";

const SPEC_PATH = resolve("C:/Users/User/Downloads/ONE_CANONICAL_ESTIMATE_PRODUCTION_TZ_R6.md");
const SPEC_SHA256 = "4ffc00413c14458730823a90950b80d5191073e26f3bea4201f665953ed1eefa";
const EXPECTED_BRANCH = "codex/p0-one-monolith-r5";
const DEFINITION_RELEASE_ID = process.env.CANONICAL_ESTIMATE_TARGET_RELEASE_ID
  ?? "4c5affaf-5f63-5d04-b036-875c684f8c45";
const SEARCH_RELEASE_ID = process.env.CANONICAL_ESTIMATE_TARGET_SEARCH_RELEASE_ID
  ?? "367c2439-df83-5f27-bedd-89247b50caae";
const SEARCH_DEFINITION_RELEASE_ID = "94443669-8f5b-5cc7-b364-2f8e9f9e3506";
const DATABASE_URL = process.env.MONOLITH_ESTIMATE_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/batch009_fire_r5_a";
const SEMANTIC_LEDGER = resolve(
  ".release-runtime/p0-one-monolith-r58/evidence/13-r583/R583_PARAMETER_SEMANTIC_DEFECT_LEDGER.json",
);
const OUTPUT = resolve(
  ".release-runtime/one-canonical-estimate-r6/evidence/09-control-72/CONTROL_72_MANIFEST.json",
);

const ASPHALT = "built-in-ai-1000:0702";
const INTERIOR_SENSITIVITY = "drywall_ceiling_interior_moisture_partition_align_large_area";
const LAMINATE = "flooring_interior_laminate_install_large_area";
const WATER_MANDATORY = "expanded-template:village_water_supply_preliminary_boq_expanded_complex_v1";
const HVAC_MANDATORY = "expanded-template:HVAC_plant_room_preliminary_boq_expanded_complex_v1";
const CONCRETE_MANDATORY = [
  "r58-real:monolithic-reinforced-concrete",
  "r58-real:reinforced-concrete-equipment-pedestal",
] as const;
const OTHER_MANDATORY = [
  "r58-real:bridge-bored-pile-installation",
  "r58-real:gabion-wall-construction",
  "r58-real:masonry-wall-openings-lintels",
  "r58-real:roofing-membrane-system",
  "r58-real:wall-plaster-application",
  "r58-real:finish-coating-application",
] as const;
const DISTRIBUTION: Record<ControlGroup, number> = { A: 16, I: 12, E: 10, W: 10, C: 10, H: 8, O: 6 };

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function stable(value: unknown): string {
  if (value == null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  const object = value as Json;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stable(object[key])}`).join(",")}}`;
}

function sha256(value: unknown): string {
  return createHash("sha256").update(Buffer.isBuffer(value) ? value : stable(value)).digest("hex");
}

function git(args: readonly string[]): string {
  return execFileSync("git", [...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30_000,
  }).trim();
}

function writeJson(file: string, value: unknown): void {
  mkdirSync(dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, file);
}

function naturalUnit(unit: string): string {
  const units: Record<string, string> = {
    m2: "м²",
    m3: "м³",
    m: "м",
    pcs: "шт",
    kg: "кг",
    t: "т",
    point: "точек",
    project_defined_uom: "комплекс",
  };
  return units[unit] ?? unit;
}

function preferredAlias(row: Json): string {
  const aliases = (row.aliases as string[] | null) ?? [];
  return aliases
    .filter((value) => /[А-Яа-яЁё]/u.test(value) && value.toLowerCase() !== String(row.nameRu).toLowerCase())
    .sort((left, right) => left.length - right.length || left.localeCompare(right))[0]
    ?? String(row.nameRu);
}

function ranked(rows: readonly Json[], seed: string): Json[] {
  return [...rows].sort((left, right) => sha256(`${SPEC_SHA256}:${seed}:${left.catalogId}`)
    .localeCompare(sha256(`${SPEC_SHA256}:${seed}:${right.catalogId}`)));
}

function pickDiverse(rows: readonly Json[], count: number, used: Set<string>, seed: string): Json[] {
  const available = ranked(rows.filter((row) => !used.has(String(row.catalogId))), seed);
  const selected: Json[] = [];
  const groups = new Set<string>();
  for (const row of available) {
    if (groups.has(String(row.groupId))) continue;
    selected.push(row);
    used.add(String(row.catalogId));
    groups.add(String(row.groupId));
    if (selected.length === count) return selected;
  }
  for (const row of available) {
    if (used.has(String(row.catalogId))) continue;
    selected.push(row);
    used.add(String(row.catalogId));
    if (selected.length === count) return selected;
  }
  throw new Error(`R6_CONTROL72_CANDIDATES_EXHAUSTED:${seed}:${selected.length}/${count}`);
}

function casePrompt(row: Json, ordinal: number): string {
  const quantity = 25 + ordinal * 7;
  return `${String(row.nameRu)} ${quantity} ${naturalUnit(String(row.primaryUom))}`;
}

async function main(): Promise<void> {
  invariant(sha256(readFileSync(SPEC_PATH)) === SPEC_SHA256, "R6_CONTROL72_SPEC_DRIFT");
  const branch = git(["branch", "--show-current"]);
  const head = git(["rev-parse", "HEAD"]);
  const tree = git(["show", "-s", "--format=%T", "HEAD"]);
  invariant(branch === EXPECTED_BRANCH && git(["status", "--porcelain=v1"]) === "", "R6_CONTROL72_SOURCE_RED");

  const semanticEvidence = JSON.parse(readFileSync(SEMANTIC_LEDGER, "utf8")) as Json;
  const professionalCatalogs = new Set((semanticEvidence.entries as Json[])
    .filter((row) => row.status === "PROFESSIONAL_READY")
    .map((row) => String(row.catalogId)));
  invariant(professionalCatalogs.size === 3_193, `R6_CONTROL72_PROFESSIONAL_DENOMINATOR:${professionalCatalogs.size}`);

  const client = new Client({ connectionString: DATABASE_URL, application_name: "r6-control-72-manifest-read-only" });
  await client.connect();
  try {
    await client.query("begin transaction read only");
    const release = (await client.query(`select id::text,status,definition_count from public.estimate_definition_release where id=$1`,
      [DEFINITION_RELEASE_ID])).rows[0] as Json | undefined;
    const searchRelease = (await client.query(`select id::text,status,snapshot_sha256 from public.estimate_search_index_release where id=$1`,
      [SEARCH_RELEASE_ID])).rows[0] as Json | undefined;
    invariant(release?.status === "prepared" && Number(release.definition_count) === 4_282,
      "R6_CONTROL72_DEFINITION_RELEASE_RED");
    invariant(searchRelease && ["draft", "prepared"].includes(String(searchRelease.status)),
      "R6_CONTROL72_SEARCH_RELEASE_RED");

    const documents = (await client.query(`
      select document.catalog_id "catalogId",document.canonical_name_ru "nameRu",document.domain_id "domainId",
        document.group_id "groupId",document.operation_kind "operationKind",document.primary_uom "primaryUom",
        document.required_inputs_count "requiredInputsCount",document.aliases,document.short_scope_ru "shortScopeRu",
        document.included_boundaries "includedBoundaries",document.excluded_boundaries "excludedBoundaries",
        document.definition_version_id::text "searchDefinitionId",manifest.definition_version_id::text "definitionId",
        manifest.source_batch "sourceBatch",manifest.publication_state "publicationState"
      from public.estimate_search_document document
      join public.estimate_cumulative_manifest_entry manifest on manifest.release_id=$1
        and manifest.catalog_id=document.catalog_id
      where document.search_release_id=$2 and document.definition_release_id=$3
        and document.selectable and document.adjudication_class='EFFECTIVE_WORK'
      order by document.domain_id,document.catalog_id
    `, [DEFINITION_RELEASE_ID, SEARCH_RELEASE_ID, SEARCH_DEFINITION_RELEASE_ID])).rows as Json[];
    const eligible = documents.filter((row) => professionalCatalogs.has(String(row.catalogId)));
    const byId = new Map(eligible.map((row) => [String(row.catalogId), row]));
    const requiredIds = [ASPHALT, INTERIOR_SENSITIVITY, LAMINATE, WATER_MANDATORY, HVAC_MANDATORY,
      ...CONCRETE_MANDATORY, ...OTHER_MANDATORY];
    invariant(requiredIds.every((catalogId) => byId.has(catalogId)), "R6_CONTROL72_MANDATORY_CROSSWALK_RED");

    const used = new Set<string>();
    const selected: { group: ControlGroup; row: Json; variant: string; prompt?: string; inputOverrides?: Json }[] = [];
    const add = (group: ControlGroup, row: Json, variant: string, prompt?: string, inputOverrides?: Json): void => {
      selected.push({ group, row, variant, prompt, inputOverrides });
    };
    const asphalt = byId.get(ASPHALT)!;
    used.add(ASPHALT);
    add("A", asphalt, "ASPHALT_PARKING_50", "Асфальтирование парковки 50 м²", { area_m2: 50 });
    add("A", asphalt, "ASPHALT_PARKING_500", "Асфальтирование парковки 500 м²", { area_m2: 500 });
    add("A", asphalt, "ASPHALT_PARKING_879", "Асфальтирование парковки 879 м²", { area_m2: 879 });
    add("A", asphalt, "ASPHALT_MINIMAL_SCOPE", "Асфальтирование парковки 500 м², только покрытие без освещения, знаков и водоотвода",
      { area_m2: 500, estimate_scope_mode: "MINIMAL_EXPLICIT_SCOPE" });
    add("A", asphalt, "ASPHALT_FULL_SCOPE", "Асфальтирование парковки 500 м², полный комплекс с водоотводом, разметкой, знаками и освещением",
      { area_m2: 500, estimate_scope_mode: "FULL_APPLICABLE_SCOPE" });
    for (const row of pickDiverse(eligible.filter((item) => item.domainId === "asphalt"), 11, used, "A")) add("A", row, "DOMAIN_DIVERSITY");

    const interior = byId.get(INTERIOR_SENSITIVITY)!;
    used.add(INTERIOR_SENSITIVITY);
    add("I", interior, "DRYWALL_LEVELING_150", "Выравнивание перегородки ГКЛ 150 м²", { area_m2: 150 });
    add("I", interior, "DRYWALL_LEVELING_300", "Выравнивание перегородки ГКЛ 300 м²", { area_m2: 300 });
    const laminate = byId.get(LAMINATE)!;
    used.add(LAMINATE);
    add("I", laminate, "LAMINATE_MANDATORY", "Монтаж ламината 80 м²", { area_m2: 80 });
    for (const row of pickDiverse(eligible.filter((item) => item.domainId === "drywall"), 9, used, "I")) add("I", row, "DOMAIN_DIVERSITY");

    for (const row of pickDiverse(eligible.filter((item) => item.domainId === "electrical"), 10, used, "E")) add("E", row, "DOMAIN_DIVERSITY");
    const water = byId.get(WATER_MANDATORY)!;
    used.add(WATER_MANDATORY);
    add("W", water, "VILLAGE_WATER_MANDATORY", "Наружный водопровод для села 5000 м");
    for (const row of pickDiverse(eligible.filter((item) => item.domainId === "water_supply_sewerage"), 9, used, "W")) add("W", row, "DOMAIN_DIVERSITY");
    for (const catalogId of CONCRETE_MANDATORY) {
      used.add(catalogId);
      add("C", byId.get(catalogId)!, "CONCRETE_MANDATORY");
    }
    for (const row of pickDiverse(eligible.filter((item) => item.domainId === "concrete"), 8, used, "C")) add("C", row, "DOMAIN_DIVERSITY");
    const hvac = byId.get(HVAC_MANDATORY)!;
    used.add(HVAC_MANDATORY);
    add("H", hvac, "HVAC_PLANT_MANDATORY", "Система вентиляции и отопления технического помещения 1 комплекс");
    for (const row of pickDiverse(eligible.filter((item) => item.domainId === "hvac_heat_supply"), 7, used, "H")) add("H", row, "DOMAIN_DIVERSITY");
    for (const catalogId of OTHER_MANDATORY) {
      used.add(catalogId);
      add("O", byId.get(catalogId)!, "OTHER_ACCEPTED_MANDATORY");
    }

    invariant(selected.length === 72, `R6_CONTROL72_SELECTED_DENOMINATOR:${selected.length}`);
    for (const [group, count] of Object.entries(DISTRIBUTION)) {
      invariant(selected.filter((item) => item.group === group).length === count,
        `R6_CONTROL72_GROUP_${group}:${selected.filter((item) => item.group === group).length}/${count}`);
    }
    const uniqueDefinitionIds = new Set(selected.map((item) => String(item.row.definitionId)));
    invariant(uniqueDefinitionIds.size >= 60, `R6_CONTROL72_UNIQUE_DEFINITIONS:${uniqueDefinitionIds.size}`);

    const definitionIds = [...uniqueDefinitionIds];
    const parameterRows = (await client.query(`
      select definition_version_id::text "definitionId",parameter_id "parameterId",ordinal,value_type "valueType",
        unit_id "unitId",title_ru "titleRu",required,default_value "defaultValue",constraints_json "constraints"
      from public.estimate_parameter_definition where definition_version_id=any($1::uuid[])
      order by definition_version_id,ordinal
    `, [definitionIds])).rows as Json[];
    const formulaRows = (await client.query(`
      select definition_version_id::text "definitionId",formula_id "formulaId",output_unit_id "outputUnitId",
        input_parameter_ids "inputParameterIds",ast_sha256 "astSha256"
      from public.estimate_formula_graph where definition_version_id=any($1::uuid[])
      order by definition_version_id,formula_id
    `, [definitionIds])).rows as Json[];
    const resourceCounts = (await client.query(`
      select definition_version_id::text "definitionId",count(*)::int "rowCount",
        count(*) filter(where procurement_eligible)::int "procurementCount"
      from public.estimate_resource_spec where definition_version_id=any($1::uuid[])
      group by definition_version_id
    `, [definitionIds])).rows as Json[];
    await client.query("commit");

    const parametersByDefinition = new Map(definitionIds.map((definitionId) => [definitionId,
      parameterRows.filter((row) => row.definitionId === definitionId)]));
    const formulasByDefinition = new Map(definitionIds.map((definitionId) => [definitionId,
      formulaRows.filter((row) => row.definitionId === definitionId)]));
    const resourcesByDefinition = new Map(resourceCounts.map((row) => [String(row.definitionId), row]));
    const groupOrdinals: Record<ControlGroup, number> = { A: 0, I: 0, E: 0, W: 0, C: 0, H: 0, O: 0 };
    const cases = selected.map((item, index) => {
      groupOrdinals[item.group] += 1;
      const row = item.row;
      const definitionId = String(row.definitionId);
      const parameters = parametersByDefinition.get(definitionId) ?? [];
      const formulas = formulasByDefinition.get(definitionId) ?? [];
      const resources = resourcesByDefinition.get(definitionId);
      invariant(parameters.length > 0, `R6_CONTROL72_EMPTY_PARAMETERS:${row.catalogId}`);
      invariant(formulas.length > 0, `R6_CONTROL72_EMPTY_FORMULAS:${row.catalogId}`);
      invariant(Number(resources?.rowCount ?? 0) > 0, `R6_CONTROL72_EMPTY_BOQ:${row.catalogId}`);
      const caseId = `${item.group}${String(groupOrdinals[item.group]).padStart(2, "0")}`;
      return {
        caseId,
        ordinal: index + 1,
        allocationGroup: item.group,
        variant: item.variant,
        catalogId: row.catalogId,
        definitionId,
        searchDefinitionId: row.searchDefinitionId,
        groupId: row.groupId,
        domainId: row.domainId,
        sourceBatch: row.sourceBatch,
        prompt: item.prompt ?? casePrompt(row, index + 1),
        searchQuery: row.nameRu,
        synonymQuery: preferredAlias(row),
        expectedParameters: parameters,
        inputOverrides: item.inputOverrides ?? {},
        scope: {
          summaryRu: row.shortScopeRu,
          included: row.includedBoundaries ?? [],
          excluded: row.excludedBoundaries ?? [],
        },
        formulaDependencies: formulas,
        expectedBoqRowMinimum: 1,
        expectedProcurementRowMinimum: Number(resources?.procurementCount ?? 0) > 0 ? 1 : 0,
        expectedInvariants: [
          "EXACT_CATALOG_SELECTION",
          "NO_GENERIC_FALLBACK",
          "NON_EMPTY_PERSISTED_REVISION",
          "PARAMETERS_OPEN_INLINE_WITHOUT_FOREMAN_ROUTE",
          "CHILD_REVISION_IMMUTABLE_PARENT",
          "PDF_EXACT_REVISION_PARITY",
          "HISTORY_COLD_REOPEN",
          "MATERIAL_PHOTO_NOTE_CATALOG_PROCUREMENT_ACTIONS_REACHABLE",
        ],
      };
    });
    const manifestCore = {
      definitionReleaseId: DEFINITION_RELEASE_ID,
      searchReleaseId: SEARCH_RELEASE_ID,
      distribution: DISTRIBUTION,
      cases,
    };
    const manifest = {
      schemaVersion: "one-canonical-estimate-r6-control-72-manifest.v1",
      capturedAt: new Date().toISOString(),
      specSha256: SPEC_SHA256,
      source: { branch, head, tree, clean: true },
      ...manifestCore,
      denominator: "72/72",
      uniqueCatalogIds: new Set(cases.map((row) => row.catalogId)).size,
      uniqueDefinitionIds: uniqueDefinitionIds.size,
      acceptedOnly: true,
      genericFallbacks: 0,
      manifestSha256: sha256(manifestCore),
      activeReleaseSwitched: false,
      runtime8081Switched: false,
      status: "GREEN_R6_CONTROL_72_MANIFEST_FROZEN_NOT_EXECUTED",
    };
    writeJson(OUTPUT, manifest);
    process.stdout.write(`${JSON.stringify({ ...manifest, cases: `omitted:${cases.length}` }, null, 2)}\n`);
  } catch (error) {
    try { await client.query("rollback"); } catch { /* already closed */ }
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
