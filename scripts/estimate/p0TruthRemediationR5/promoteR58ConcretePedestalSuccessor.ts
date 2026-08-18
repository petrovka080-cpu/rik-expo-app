import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import {
  insertWork,
  type Json,
  type WorkSpec,
} from "./promoteR58MandatoryJourneysSuccessor";

const SPEC_PATH = resolve("C:/Users/User/Downloads/P0_ONE_MONOLITH_ESTIMATE_PLATFORM_R5_PRODUCTION_GRADE_TZ (10).md");
const SPEC_SHA256 = "4cf42813e8a94816867ec62e63909fe0624a12d6955f598599deb0a92338e318";
const BASE_COMMIT = "691acb78d55c38ef447a4d91c0bc798992e58dbc";
const EXPECTED_BRANCH = "codex/p0-one-monolith-r5";
const PREDECESSOR_RELEASE_ID = "0a9b5d0d-d57a-520d-b661-c3e564df3286";
const ACTIVE_RELEASE_ID = "da29dc2b-1384-5487-b8da-6ee93f4e514e";
const RELEASE_KEY = "p0-r58-cumulative-candidate-concrete-pedestal-4cf42813";
const CONTRACT = "p0-one-monolith-r58-mandatory-journeys.v1";
const DATABASE_URL = process.env.MONOLITH_ESTIMATE_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/batch009_fire_r5_a";
const OUTPUT = resolve(".release-runtime/p0-one-monolith-r58/evidence/12-representative/R58_CONCRETE_PEDESTAL_PROMOTION.json");
const APPLY = process.argv.includes("--apply");

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Json)
    .sort(([left], [right]) => left.localeCompare(right)).map(([key, child]) => [key, stable(child)]));
  return value;
}

function stableJson(value: unknown): string { return JSON.stringify(stable(value)); }
function sha256(value: string | Buffer): string { return createHash("sha256").update(value).digest("hex"); }
function shaObject(value: unknown): string { return sha256(stableJson(value)); }
function uuid(value: string): string {
  const bytes = Buffer.from(sha256(value).slice(0, 32), "hex");
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
function git(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 30_000 }).trim();
}
function writeJson(file: string, value: unknown): void {
  mkdirSync(dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, file);
}

const parameter = (id: string): Json => ({ kind: "parameter", id });
const literal = (value: number): Json => ({ kind: "literal", value: String(value) });
const multiply = (...parts: Json[]): Json => parts.reduce((left, right) => ({ kind: "binary", operator: "*", left, right }));
const add = (left: Json, right: Json): Json => ({ kind: "binary", operator: "+", left, right });
const divide = (left: Json, right: Json): Json => ({ kind: "binary", operator: "/", left, right });

const WORK: WorkSpec = {
  catalogId: "r58-real:reinforced-concrete-equipment-pedestal",
  domain: "concrete",
  title: "Устройство монолитных железобетонных тумб под оборудование и опоры",
  aliases: ["бетонные тумбы", "железобетонная тумба", "тумба под оборудование", "бетонный постамент"],
  included: [
    "разбивка положения тумб",
    "монтаж и демонтаж опалубки",
    "установка арматурных каркасов и закладных по проекту",
    "укладка, уплотнение и уход за бетоном",
  ],
  excluded: [
    "земляные работы и фундаментная плита",
    "металлоконструкции оборудования вне закладных деталей",
    "монтаж технологического оборудования",
    "анкерные группы без отдельной проектной ведомости",
  ],
  standard: "SP_63_13330_2018_AMENDMENT_1",
  standardTitle: "СП 63.13330.2018 «Бетонные и железобетонные конструкции»",
  standardUrl: "https://minstroyrf.gov.ru/docs/59618/",
  parameters: [
    { id: "pedestal_count", title: "Количество тумб", type: "integer", unit: "pcs", defaultValue: 10,
      constraints: { min: 1, max: 10000 }, guide: "Сосчитайте отдельные тумбы по плану расположения оборудования или опор",
      description: "Фактическое количество одинаковых тумб в расчётном захвате." },
    { id: "pedestal_length_m", title: "Длина одной тумбы", unit: "m", defaultValue: 0.6,
      constraints: { min: 0.1, max: 20 }, guide: "Введите проектный размер одной тумбы по длинной стороне, м",
      description: "Проектная длина монолитной тумбы." },
    { id: "pedestal_width_m", title: "Ширина одной тумбы", unit: "m", defaultValue: 0.6,
      constraints: { min: 0.1, max: 20 }, guide: "Введите проектный размер одной тумбы по короткой стороне, м",
      description: "Проектная ширина монолитной тумбы." },
    { id: "pedestal_height_m", title: "Высота одной тумбы", unit: "m", defaultValue: 0.8,
      constraints: { min: 0.1, max: 20 }, guide: "Измеряется от опорной поверхности до верха тумбы по рабочему чертежу",
      description: "Проектная высота монолитной тумбы." },
    { id: "rebar_kg_per_pedestal", title: "Арматура на одну тумбу", unit: "kg_per_pcs", defaultValue: 35,
      constraints: { min: 0, max: 5000 }, guide: "Замените предварительное значение массой по ведомости расхода стали",
      description: "Масса арматурного каркаса и закладных одной тумбы." },
    { id: "concrete_waste_percent", title: "Технологический запас бетона", unit: "percent", defaultValue: 2,
      constraints: { min: 0, max: 15 }, guide: "Уточните по способу подачи и точности опалубки; цена при этом не подставляется",
      description: "Раскрытый запас смеси на технологические потери." },
  ],
  formulas: [
    { id: "pedestal_pcs", unit: "pcs", expression: "pedestal_count", ast: parameter("pedestal_count"), inputs: ["pedestal_count"] },
    { id: "pedestal_clean_concrete_m3", unit: "m3", expression: "count*length*width*height",
      ast: multiply(parameter("pedestal_count"), parameter("pedestal_length_m"), parameter("pedestal_width_m"), parameter("pedestal_height_m")),
      inputs: ["pedestal_count", "pedestal_length_m", "pedestal_width_m", "pedestal_height_m"] },
    { id: "pedestal_concrete_m3", unit: "m3", expression: "clean_volume*(1+waste/100)",
      ast: multiply(parameter("pedestal_count"), parameter("pedestal_length_m"), parameter("pedestal_width_m"), parameter("pedestal_height_m"),
        add(literal(1), divide(parameter("concrete_waste_percent"), literal(100)))),
      inputs: ["pedestal_count", "pedestal_length_m", "pedestal_width_m", "pedestal_height_m", "concrete_waste_percent"] },
    { id: "pedestal_formwork_m2", unit: "m2", expression: "count*2*(length+width)*height",
      ast: multiply(parameter("pedestal_count"), literal(2), add(parameter("pedestal_length_m"), parameter("pedestal_width_m")), parameter("pedestal_height_m")),
      inputs: ["pedestal_count", "pedestal_length_m", "pedestal_width_m", "pedestal_height_m"] },
    { id: "pedestal_rebar_kg", unit: "kg", expression: "count*rebar_kg_per_pedestal",
      ast: multiply(parameter("pedestal_count"), parameter("rebar_kg_per_pedestal")), inputs: ["pedestal_count", "rebar_kg_per_pedestal"] },
  ],
  resources: [
    { id: "formwork", section: "Материалы", category: "materials", title: "Опалубочная система тумб", type: "material", unit: "m2", formula: "pedestal_formwork_m2", procurement: true },
    { id: "rebar", section: "Материалы", category: "materials", title: "Арматурные каркасы и закладные по ведомости", type: "material", unit: "kg", formula: "pedestal_rebar_kg", procurement: true },
    { id: "concrete", section: "Материалы", category: "materials", title: "Бетон проектного класса для тумб", type: "material", unit: "m3", formula: "pedestal_concrete_m3", procurement: true },
    { id: "set_out", section: "Работы", category: "labor", title: "Разбивка осей и отметок тумб", type: "labor", unit: "pcs", formula: "pedestal_pcs" },
    { id: "formwork_labor", section: "Работы", category: "labor", title: "Монтаж и демонтаж опалубки тумб", type: "labor", unit: "m2", formula: "pedestal_formwork_m2" },
    { id: "rebar_labor", section: "Работы", category: "labor", title: "Установка арматурных каркасов и закладных", type: "labor", unit: "kg", formula: "pedestal_rebar_kg" },
    { id: "concrete_labor", section: "Работы", category: "labor", title: "Укладка, уплотнение и уход за бетоном", type: "labor", unit: "m3", formula: "pedestal_clean_concrete_m3" },
  ],
};

async function main(): Promise<void> {
  invariant(sha256(readFileSync(SPEC_PATH)) === SPEC_SHA256, "R58_PEDESTAL_SPEC_DRIFT");
  const branch = git(["branch", "--show-current"]);
  const head = git(["rev-parse", "HEAD"]);
  const tree = git(["rev-parse", "HEAD^{tree}"]);
  invariant(branch === EXPECTED_BRANCH, `R58_PEDESTAL_BRANCH:${branch}`);
  invariant(git(["status", "--porcelain=v1"]) === "", "R58_PEDESTAL_DIRTY_WORKTREE");
  git(["merge-base", "--is-ancestor", BASE_COMMIT, head]);
  const releaseId = uuid(`${CONTRACT}:release:${RELEASE_KEY}`);
  const client = new Client({ connectionString: DATABASE_URL, application_name: APPLY ? "r58-pedestal-apply" : "r58-pedestal-dry-run" });
  await client.connect();
  let inserted: Json | undefined;
  let idempotent = false;
  try {
    await client.query("begin");
    await client.query("set local lock_timeout='5s'");
    await client.query("set local statement_timeout='120s'");
    const predecessor = (await client.query("select * from public.estimate_definition_release where id=$1", [PREDECESSOR_RELEASE_ID])).rows[0] as Json;
    const active = (await client.query("select * from public.estimate_definition_release where id=$1", [ACTIVE_RELEASE_ID])).rows[0] as Json;
    invariant(predecessor?.status === "prepared" && Number(predecessor.definition_count) === 4281, "R58_PEDESTAL_PREDECESSOR_DRIFT");
    invariant(active?.status === "active", "R58_PEDESTAL_ACTIVE_DRIFT");
    const existing = (await client.query("select * from public.estimate_definition_release where release_key=$1", [RELEASE_KEY])).rows[0] as Json | undefined;
    if (existing) {
      invariant(existing.id === releaseId && existing.status === "prepared" && existing.parent_release_id === PREDECESSOR_RELEASE_ID,
        "R58_PEDESTAL_EXISTING_RELEASE_DRIFT");
      idempotent = true;
      inserted = (await client.query(`select m.catalog_id "catalogId",m.definition_version_id::text "definitionId",
        m.approved_template_baseline_id::text "baselineId",
        (select count(*)::int from estimate_parameter_definition p where p.definition_version_id=m.definition_version_id) parameters,
        (select count(*)::int from estimate_formula_graph f where f.definition_version_id=m.definition_version_id) formulas,
        (select count(*)::int from estimate_resource_spec r where r.definition_version_id=m.definition_version_id) resources
        from estimate_cumulative_manifest_entry m where m.release_id=$1 and m.catalog_id=$2`, [releaseId, WORK.catalogId])).rows[0] as Json;
    } else {
      const collision = Number((await client.query("select count(*)::int n from public.estimate_work_identity where catalog_id=$1", [WORK.catalogId])).rows[0].n);
      invariant(collision === 0, `R58_PEDESTAL_IDENTITY_COLLISION:${collision}`);
      await client.query(`insert into public.estimate_definition_release(
        id,release_key,schema_version,status,source_commit,source_tree,source_manifest_sha256,definition_count,
        resource_row_count,metadata,parent_release_id,source_package_sha256,parameter_count,formula_count
      ) values($1,$2,6,'draft',$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12)`, [releaseId, RELEASE_KEY, head, tree,
        shaObject({ contract: CONTRACT, predecessor: PREDECESSOR_RELEASE_ID, workId: WORK.catalogId }),
        Number(predecessor.definition_count) + 1, Number(predecessor.resource_row_count) + WORK.resources.length,
        JSON.stringify({ authority: "P0_ONE_MONOLITH_ESTIMATE_PLATFORM_R5.8", specSha256: SPEC_SHA256, contract: CONTRACT,
          predecessorReleaseId: PREDECESSOR_RELEASE_ID, exactFrozenJourney: "Бетонные тумбы 10 шт", generatedTemplate: false,
          universalEstimator: false, artificialPrices: false, batch009Included: false, activeReleaseSwitched: false,
          runtime8081Switched: false, terminalGreenClaimed: false }), PREDECESSOR_RELEASE_ID,
        shaObject({ contract: CONTRACT, head, tree, work: WORK }), Number(predecessor.parameter_count) + WORK.parameters.length,
        Number(predecessor.formula_count) + WORK.formulas.length]);
      await client.query(`insert into public.estimate_cumulative_manifest_entry(
        release_id,catalog_id,definition_version_id,source_batch,source_release_id,domain_id,publication_state,
        approved_template_baseline_id,baseline_ready,scenario_ready,definition_hash,entry_sha256
      ) select $1,catalog_id,definition_version_id,source_batch,source_release_id,domain_id,publication_state,
        approved_template_baseline_id,baseline_ready,scenario_ready,definition_hash,
        encode(extensions.digest(convert_to($2||':'||catalog_id||':'||entry_sha256,'UTF8'),'sha256'),'hex')
        from public.estimate_cumulative_manifest_entry where release_id=$3`, [releaseId, CONTRACT, PREDECESSOR_RELEASE_ID]);
      inserted = await insertWork(client, WORK, releaseId);
      const counts = (await client.query(`select count(*)::int definitions,count(distinct catalog_id)::int unique_catalogs,
        count(*) filter(where baseline_ready and scenario_ready and approved_template_baseline_id is not null)::int ready,
        count(*) filter(where upper(source_batch) like 'BATCH009%')::int batch009
        from public.estimate_cumulative_manifest_entry where release_id=$1`, [releaseId])).rows[0] as Json;
      invariant(counts.definitions === 4282 && counts.unique_catalogs === 4282 && counts.ready === 4282 && counts.batch009 === 0,
        `R58_PEDESTAL_MANIFEST_COUNTS:${stableJson(counts)}`);
      await client.query("update public.estimate_definition_release set status='prepared',sealed_at=now(),metadata=metadata||$2::jsonb where id=$1 and status='draft'",
        [releaseId, JSON.stringify({ lifecycle: "PREPARED_FOR_PEDESTAL_BACKEND_AND_SEARCH_GATES_NOT_ACTIVE", manifestCounts: counts })]);
    }
    invariant(inserted?.catalogId === WORK.catalogId && inserted.parameters === 6 && inserted.formulas === 5 && inserted.resources === 7,
      `R58_PEDESTAL_INSERTED_COUNTS:${stableJson(inserted)}`);
    const proof = {
      schemaVersion: "p0-one-monolith-r58-concrete-pedestal-successor.v1",
      capturedAt: new Date().toISOString(), specSha256: SPEC_SHA256,
      source: { branch, head, tree, descendantOf691acb78: true },
      predecessorReleaseId: PREDECESSOR_RELEASE_ID, candidateReleaseId: releaseId, work: inserted,
      frozenJourney: "Бетонные тумбы 10 шт", baselineBeforeInput: true, inlineGuides: "6/6",
      generatedTemplate: false, universalEstimator: false, artificialPrices: false,
      activeReleaseSwitched: false, runtime8081Switched: false, batch009Included: false,
      idempotent, writesApplied: APPLY && !idempotent ? 1 : 0,
      status: APPLY ? "GREEN_R58_CONCRETE_PEDESTAL_SUCCESSOR_PREPARED_NOT_ACTIVE" : "GREEN_R58_CONCRETE_PEDESTAL_DRY_RUN_ROLLED_BACK",
    };
    if (APPLY) await client.query("commit"); else await client.query("rollback");
    writeJson(OUTPUT, proof);
    process.stdout.write(`${JSON.stringify(proof, null, 2)}\n`);
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
