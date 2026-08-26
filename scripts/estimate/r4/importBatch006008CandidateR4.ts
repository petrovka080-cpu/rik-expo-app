import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { Client } from "pg";

import type { FormulaAst } from "../../../src/lib/estimate/backendPlatform/formulaGraph";
import { validateCanonicalEstimateParameters } from "../../../src/lib/estimate/backendPlatform/parameterConstraints";
import { buildGlobalCatalogInventoryV1 } from "../../../src/lib/estimate/v4/domainFactory/globalCatalogInventoryV1";
import { buildWaterBackendDefinitions } from "../waterBackendR3/waterDomainModel";
import { buildAllHvacPassports } from "../hvacBackendR4/hvacR4Model";
import { buildConcretePassport, concreteIdentities } from "../concreteBackendR5/concreteR5Model";
import { WORK as CONCRETE_PEDESTAL } from "../p0TruthRemediationR5/promoteR58ConcretePedestalSuccessor";
import { WORKS as MANDATORY_SUCCESSORS, type WorkSpec } from "../p0TruthRemediationR5/promoteR58MandatoryJourneysSuccessor";

type Json = Record<string, any>;

type NormalizedParameter = {
  parameterId: string;
  ordinal: number;
  valueType: string;
  unitId: string | null;
  titleRu: string;
  required: boolean;
  defaultValue: unknown;
  constraints: Json;
};

type NormalizedFormula = {
  formulaId: string;
  outputUnitId: string;
  expressionSource: string;
  ast: FormulaAst | Json;
  inputParameterIds: string[];
};

type NormalizedResource = {
  rowId: string;
  ordinal: number;
  section: string;
  category: string;
  titleRu: string;
  rowType: string;
  unitId: string;
  formulaId: string;
  inclusionAst: Json;
  resourceGraph: Json;
  semanticOwner: string;
  costOwnerId: string | null;
  procurementEligible: boolean;
  sourceMetadata: Json;
};

type NormalizedDefinition = {
  catalogId: string;
  titleRu: string;
  namespace: string;
  domain: string;
  workGroupId: string;
  passport: Json;
  applicability: Json;
  sourceMetadata: Json;
  aliases: string[];
  parameters: NormalizedParameter[];
  formulas: NormalizedFormula[];
  resources: NormalizedResource[];
};

const MASTER_PATH = resolve(
  "C:/Users/User/Downloads/MASTER_TZ_R4_PRODUCTION_GRADE_GLOBAL_GREEN_SINGLE_CANONICAL_CODE_REAL_ESTIMATES_RU.md",
);
const MASTER_SHA256 = "44084dd37cf6c6612e39fdf2aded9a34acef752e7742ee18985a8be316288585";
const DATABASE_URL = process.env.R4_RUNTIME_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime";
const BATCH_ID = String(process.env.R4_IMPORT_BATCH_ID ?? "BATCH-006").trim().toUpperCase();
const EVIDENCE_ROOT = resolve(".release-runtime/real-useful-estimates-r4/evidence/current-green");
const INVENTORY_PATH = resolve(EVIDENCE_ROOT, "04_AUTHORITATIVE_WORK_GROUP_INVENTORY_R4.json");
const HVAC_WORKS_PATH = resolve(
  process.env.R4_HVAC_HISTORICAL_WORKS_PATH
    ?? "C:/dev/rik-expo-app-batch007-hvac-heat-supply-r4/.release-runtime/batch007-hvac-r4/evidence/05-content/corpus/HVAC_WORK_DEFINITIONS.jsonl",
);
const CONCRETE_WORKS_PATH = resolve(
  process.env.R4_CONCRETE_HISTORICAL_WORKS_PATH
    ?? "C:/dev/rik-expo-app-batch008-concrete-r5/.release-runtime/batch008-concrete-r5/evidence/05-content/corpus/CONCRETE_WORK_DEFINITIONS.jsonl",
);
const EXPECTED: Readonly<Record<string, { identities: number; groups: number }>> = Object.freeze({
  "BATCH-006": { identities: 689, groups: 167 },
  "BATCH-007": { identities: 864, groups: 238 },
  "BATCH-008": { identities: 768, groups: 162 },
});
const RELEASE_KEY = BATCH_ID === "BATCH-006"
  ? "r4-batch006-current-candidate-v2"
  : BATCH_ID === "BATCH-008"
    ? "r4-batch008-current-candidate-v2"
    : `r4-${BATCH_ID.toLowerCase().replace("-", "")}-current-candidate`;
const DEFINITION_VERSION = BATCH_ID === "BATCH-006" || BATCH_ID === "BATCH-008" ? 2 : 1;

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function stableJson(value: unknown): string {
  if (value === undefined) return "null";
  if (value == null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as Json;
  return `{${Object.keys(record).filter((key) => record[key] !== undefined).sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
}

function sha256(value: Buffer | string | unknown): string {
  const bytes = Buffer.isBuffer(value) || typeof value === "string" ? value : stableJson(value);
  return createHash("sha256").update(bytes).digest("hex");
}

function uuid(value: string): string {
  const bytes = Buffer.from(sha256(value).slice(0, 32), "hex");
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function normalizeSearch(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("ru-RU")
    .replace(/[^a-zа-яё0-9]+/giu, " ").trim().replace(/\s+/gu, " ");
}

function readJsonlMap(path: string): Map<string, Json> {
  return new Map(readFileSync(path, "utf8").trim().split(/\r?\n/u).filter(Boolean).map((line) => {
    const row = JSON.parse(line) as Json;
    return [String(row.catalogId), row];
  }));
}

function assertDisposableDatabase(): void {
  const url = new URL(DATABASE_URL);
  invariant(["127.0.0.1", "localhost", "::1"].includes(url.hostname), `R4_IMPORT_NOT_LOOPBACK:${url.hostname}`);
  invariant(Number(url.port) === 55432 && url.pathname === "/rik_r4_runtime", `R4_IMPORT_DATABASE_BOUNDARY_RED:${url.host}${url.pathname}`);
}

function workSpecDefinition(work: WorkSpec, workGroupId: string): NormalizedDefinition {
  const formulaById = new Map(work.formulas.map((formula) => [formula.id, formula]));
  return {
    catalogId: work.catalogId,
    titleRu: work.title,
    namespace: "global",
    domain: work.domain,
    workGroupId,
    passport: {
      contract: "real-professional-estimates-r3.content-passport.v1",
      catalogId: work.catalogId,
      titleRu: work.title,
      physicalResultRu: work.title,
      includedScopeRu: work.included,
      excludedScopeRu: work.excluded,
      standard: { id: work.standard, title: work.standardTitle, url: work.standardUrl },
      workGroupId,
      owner: "BACKEND_ONLY",
    },
    applicability: { workGroupId, included: work.included, excluded: work.excluded },
    sourceMetadata: { r4MandatorySuccessor: true, generatedTemplate: false, compilerOwner: "backend" },
    aliases: [...work.aliases],
    parameters: work.parameters.map((parameter, ordinal) => ({
      parameterId: parameter.id,
      ordinal,
      valueType: parameter.type ?? (typeof parameter.defaultValue === "boolean" ? "boolean" : "decimal"),
      unitId: parameter.unit ?? null,
      titleRu: parameter.title,
      required: true,
      defaultValue: parameter.defaultValue,
      constraints: parameter.constraints ?? {},
    })),
    formulas: work.formulas.map((formula) => ({
      formulaId: formula.id,
      outputUnitId: formula.unit,
      expressionSource: formula.expression,
      ast: formula.ast,
      inputParameterIds: [...formula.inputs],
    })),
    resources: work.resources.map((resource, ordinal) => {
      invariant(formulaById.has(resource.formula), `R4_IMPORT_SUCCESSOR_FORMULA_MISSING:${work.catalogId}:${resource.id}`);
      return {
        rowId: `${work.catalogId}:r4:${resource.id}`,
        ordinal,
        section: resource.section,
        category: resource.category,
        titleRu: resource.title,
        rowType: resource.type,
        unitId: resource.unit,
        formulaId: resource.formula,
        inclusionAst: resource.inclusion ?? { kind: "literal", value: true },
        resourceGraph: { contract: "r4-mandatory-successor-resource.v1", owner: "BACKEND_ONLY", workGroupId },
        semanticOwner: `${work.catalogId}:${resource.id}`,
        costOwnerId: null,
        procurementEligible: resource.procurement === true,
        sourceMetadata: { standard: work.standard, standardUrl: work.standardUrl, exactTitle: true },
      };
    }),
  };
}

async function buildDefinitions(
  identities: Set<string>,
  groupByIdentity: Map<string, string>,
): Promise<NormalizedDefinition[]> {
  if (BATCH_ID === "BATCH-006") {
    return buildWaterBackendDefinitions().filter((definition) => identities.has(definition.work.catalogId)).map((definition) => ({
      catalogId: definition.work.catalogId,
      titleRu: definition.work.titleRu,
      namespace: definition.work.namespace,
      domain: definition.work.domain,
      workGroupId: groupByIdentity.get(definition.work.catalogId)!,
      passport: definition.work.passport,
      applicability: definition.work.applicability,
      sourceMetadata: definition.work.sourceMetadata,
      aliases: [],
      parameters: definition.parameters.map((parameter) => ({
        parameterId: parameter.parameterId,
        ordinal: parameter.ordinal,
        valueType: parameter.valueType,
        unitId: parameter.unitId,
        titleRu: parameter.titleRu,
        required: parameter.required,
        defaultValue: parameter.defaultValue,
        constraints: parameter.constraints,
      })),
      formulas: definition.formulas.map((formula) => ({
        formulaId: formula.formulaId,
        outputUnitId: formula.outputUnitId,
        expressionSource: formula.expressionSource,
        ast: formula.ast,
        inputParameterIds: [...formula.inputParameterIds],
      })),
      resources: definition.resources.map((resource) => ({
        rowId: resource.rowId,
        ordinal: resource.ordinal,
        section: resource.section,
        category: resource.category,
        titleRu: resource.titleRu,
        rowType: resource.rowType,
        unitId: resource.unitId,
        formulaId: resource.formulaId,
        inclusionAst: resource.inclusionAst,
        resourceGraph: resource.resourceGraph,
        semanticOwner: resource.semanticOwner,
        costOwnerId: resource.costOwnerId,
        procurementEligible: resource.procurementEligible,
        sourceMetadata: resource.sourceMetadata,
      })),
    }));
  }
  if (BATCH_ID === "BATCH-007") {
    const workRows = readJsonlMap(HVAC_WORKS_PATH);
    return buildAllHvacPassports().filter((passport) => identities.has(passport.catalogId)).map((passport) => {
      const historical = workRows.get(passport.catalogId);
      invariant(historical, `R4_IMPORT_HVAC_TITLE_MISSING:${passport.catalogId}`);
      return {
        catalogId: passport.catalogId,
        titleRu: String(historical.titleRu),
        namespace: String(historical.namespace ?? "global"),
        domain: "hvac_heat_supply",
        workGroupId: groupByIdentity.get(passport.catalogId)!,
        passport: passport as unknown as Json,
        applicability: { familyKey: passport.familyKey, subfamilyKey: passport.subfamilyKey, profile: passport.profile },
        sourceMetadata: { currentHvacR4Model: true, passportSha256: passport.passportSha256, compilerOwner: "backend" },
        aliases: [],
        parameters: passport.parameters.map((parameter) => ({
          parameterId: parameter.parameterId,
          ordinal: parameter.ordinal,
          valueType: parameter.valueType,
          unitId: parameter.unitId,
          titleRu: parameter.titleRu,
          required: parameter.required,
          defaultValue: parameter.defaultValue,
          constraints: parameter.constraints,
        })),
        formulas: passport.formulas.map((formula) => ({
          formulaId: formula.formulaId,
          outputUnitId: formula.outputUnitId,
          expressionSource: formula.expressionSource,
          ast: formula.ast,
          inputParameterIds: [...formula.inputParameterIds],
        })),
        resources: passport.resources.map((resource) => ({
          rowId: resource.rowId,
          ordinal: resource.ordinal,
          section: resource.section,
          category: resource.category,
          titleRu: resource.titleRu,
          rowType: resource.rowType,
          unitId: resource.unitId,
          formulaId: resource.formulaId,
          inclusionAst: resource.inclusionAst,
          resourceGraph: resource.resourceGraph,
          semanticOwner: resource.semanticOwner,
          costOwnerId: resource.costOwnerId,
          procurementEligible: resource.procurementEligible,
          sourceMetadata: resource.sourceMetadata,
        })),
      };
    });
  }
  const historicalWorks = readJsonlMap(CONCRETE_WORKS_PATH);
  const concrete: NormalizedDefinition[] = concreteIdentities().filter((identity) => identities.has(identity.catalog_id)).map((identity) => {
    const passport = buildConcretePassport(identity);
    const historical = historicalWorks.get(passport.catalogId);
    invariant(historical, `R4_IMPORT_CONCRETE_TITLE_MISSING:${passport.catalogId}`);
    return {
      catalogId: passport.catalogId,
      titleRu: passport.titleRu || String(historical.titleRu),
      namespace: passport.namespace,
      domain: "concrete",
      workGroupId: groupByIdentity.get(passport.catalogId)!,
      passport: passport as unknown as Json,
      applicability: { familyKey: passport.familyKey, subfamilyKey: passport.subfamilyKey, operation: passport.operation },
      sourceMetadata: { currentConcreteR5Model: true, passportSha256: passport.passportSha256, compilerOwner: "backend" },
      aliases: [],
      parameters: passport.parameters.map((parameter) => ({
        parameterId: parameter.parameterId,
        ordinal: parameter.ordinal,
        valueType: parameter.valueType,
        unitId: parameter.unitId,
        titleRu: parameter.titleRu,
        required: parameter.required,
        defaultValue: parameter.defaultValue,
        constraints: parameter.constraints,
      })),
      formulas: passport.formulas.map((formula) => ({
        formulaId: formula.formulaId,
        outputUnitId: formula.outputUnitId,
        expressionSource: formula.expressionSource,
        ast: formula.ast,
        inputParameterIds: [...formula.inputParameterIds],
      })),
      resources: passport.resources.map((resource) => ({
        rowId: resource.rowId,
        ordinal: resource.ordinal,
        section: resource.section,
        category: resource.category,
        titleRu: resource.titleRu,
        rowType: resource.rowType,
        unitId: resource.unitId,
        formulaId: resource.formulaId,
        inclusionAst: resource.inclusionAst,
        resourceGraph: resource.resourceGraph,
        semanticOwner: resource.semanticOwner,
        costOwnerId: resource.costOwnerId,
        procurementEligible: resource.procurementEligible,
        sourceMetadata: resource.sourceMetadata,
      })),
    } satisfies NormalizedDefinition;
  });
  const successorById = new Map([...MANDATORY_SUCCESSORS, CONCRETE_PEDESTAL].map((work) => [work.catalogId, work]));
  for (const catalogId of identities) {
    if (concrete.some((definition) => definition.catalogId === catalogId)) continue;
    const successor = successorById.get(catalogId);
    invariant(successor, `R4_IMPORT_CONCRETE_IDENTITY_MODEL_MISSING:${catalogId}`);
    concrete.push(workSpecDefinition(successor, groupByIdentity.get(catalogId)!));
  }
  return concrete;
}

function baselineValue(parameter: NormalizedParameter): unknown {
  if (parameter.defaultValue != null) return parameter.defaultValue;
  const constraints = parameter.constraints ?? {};
  if (constraints.admissionSampleValue != null) return constraints.admissionSampleValue;
  if (parameter.valueType === "boolean") return true;
  if (parameter.valueType === "enum") {
    const options = constraints.values ?? constraints.allowedValues ?? constraints.options;
    return Array.isArray(options) && options.length > 0 ? options[0] : "PROJECT_SPECIFIED";
  }
  if (parameter.valueType === "text") return "PROJECT_SPECIFIED_R4";
  const exclusive = Number(constraints.minExclusive);
  const minimum = Number(constraints.min ?? constraints.minimum);
  const candidate = Number.isFinite(exclusive)
    ? exclusive + (parameter.valueType === "integer" ? 1 : Math.max(1, Math.abs(exclusive) * 0.01))
    : Number.isFinite(minimum) ? Math.max(minimum, minimum === 0 ? 1 : minimum) : 1;
  return parameter.valueType === "integer" ? Math.ceil(candidate) : Number(candidate.toPrecision(12));
}

function definitionBaseline(definition: NormalizedDefinition): Json {
  const baseline = Object.fromEntries(definition.parameters.map((parameter) => [parameter.parameterId, baselineValue(parameter)]));
  const enabledByExclusiveGroup = new Set<string>();
  for (const parameter of definition.parameters) {
    const group = parameter.constraints?.mutuallyExclusiveBooleanGroup;
    if (group == null || baseline[parameter.parameterId] !== true) continue;
    if (enabledByExclusiveGroup.has(String(group))) baseline[parameter.parameterId] = false;
    else enabledByExclusiveGroup.add(String(group));
  }
  for (const parameter of definition.parameters) {
    const forbidden = parameter.constraints?.forbiddenWhen;
    if (!forbidden || typeof forbidden !== "object" || Array.isArray(forbidden)) continue;
    const controllerId = String(forbidden.parameterId ?? "");
    if (controllerId && baseline[controllerId] === forbidden.equals) delete baseline[parameter.parameterId];
  }
  validateCanonicalEstimateParameters(definition.parameters.map((parameter) => ({
    parameter_id: parameter.parameterId,
    value_type: parameter.valueType,
    required: parameter.required,
    default_value: parameter.defaultValue,
    constraints_json: parameter.constraints,
    truth_metadata: {},
  })), baseline, { baselineContext: { catalogId: definition.catalogId } });
  return baseline;
}

function consumerMaps(definition: NormalizedDefinition): {
  formulaConsumers: Record<string, string[]>;
  resourceConsumers: Record<string, string[]>;
} {
  const formulaConsumers = Object.fromEntries(definition.parameters.map((parameter) => [parameter.parameterId, [] as string[]]));
  const resourceConsumers = Object.fromEntries(definition.parameters.map((parameter) => [parameter.parameterId, [] as string[]]));
  const parameterIds = new Set(definition.parameters.map((parameter) => parameter.parameterId));
  const resourceByFormula = new Map<string, string[]>();
  for (const resource of definition.resources) {
    resourceByFormula.set(resource.formulaId, [...(resourceByFormula.get(resource.formulaId) ?? []), resource.rowId]);
    const resourceText = stableJson({
      inclusionAst: resource.inclusionAst,
      resourceGraph: resource.resourceGraph,
      sourceMetadata: resource.sourceMetadata,
    });
    const referenced = new Set(resourceText.match(/[A-Za-z_][A-Za-z0-9_]*/gu) ?? []);
    for (const parameterId of referenced) {
      if (parameterIds.has(parameterId)) resourceConsumers[parameterId]!.push(resource.rowId);
    }
  }
  for (const formula of definition.formulas) {
    for (const parameterId of formula.inputParameterIds) {
      invariant(formulaConsumers[parameterId], `R4_IMPORT_FORMULA_PARAMETER_MISSING:${definition.catalogId}:${formula.formulaId}:${parameterId}`);
      formulaConsumers[parameterId]!.push(formula.formulaId);
      resourceConsumers[parameterId]!.push(...(resourceByFormula.get(formula.formulaId) ?? []));
    }
  }
  for (const parameter of definition.parameters) {
    formulaConsumers[parameter.parameterId] = [...new Set(formulaConsumers[parameter.parameterId])].sort();
    resourceConsumers[parameter.parameterId] = [...new Set(resourceConsumers[parameter.parameterId])].sort();
    invariant(formulaConsumers[parameter.parameterId]!.length + resourceConsumers[parameter.parameterId]!.length > 0,
      `R4_IMPORT_ORPHAN_PARAMETER:${definition.catalogId}:${parameter.parameterId}`);
  }
  return { formulaConsumers, resourceConsumers };
}

async function insertChildRows(client: Client, releaseId: string, definitions: readonly NormalizedDefinition[]): Promise<void> {
  const chunkDefinitions = 12;
  for (let start = 0; start < definitions.length; start += chunkDefinitions) {
    const chunk = definitions.slice(start, start + chunkDefinitions);
    const parameters = chunk.flatMap((definition) => {
      const definitionId = uuid(`${RELEASE_KEY}:definition:${definition.catalogId}`);
      const { formulaConsumers, resourceConsumers } = consumerMaps(definition);
      return definition.parameters.map((parameter) => ({
        definitionId,
        ...parameter,
        truthMetadata: {
          semantic_parameter_key: `${definition.catalogId}:${parameter.parameterId}`,
          visibility_role: "USER_INPUT",
          formula_consumers: formulaConsumers[parameter.parameterId],
          resource_branch_consumers: resourceConsumers[parameter.parameterId],
          allowed_range_or_options: parameter.constraints,
          default_source: "R4_AUTOMATED_PRELIMINARY_PROJECT_INPUT",
          guide: {
            guide_short_ru: parameter.titleRu,
            guide_kind: "PROJECT_DEFINED",
            source_role: "R4_CURRENT_TECHNOLOGY_PASSPORT",
            guide_version: `${BATCH_ID}.r4`,
            source_snapshot_hash: sha256(`${definition.catalogId}:${parameter.parameterId}:${parameter.titleRu}`),
            applicability: definition.workGroupId,
            verified_at: "2026-08-22T00:00:00.000Z",
          },
        },
      }));
    });
    if (parameters.length > 0) await client.query(`insert into public.estimate_parameter_definition(
      definition_version_id,parameter_id,ordinal,value_type,unit_id,title_ru,required,default_value,
      constraints_json,truth_metadata
    ) select x."definitionId"::uuid,x."parameterId",x.ordinal,x."valueType",x."unitId",x."titleRu",
      x.required,null,x.constraints,x."truthMetadata"
    from jsonb_to_recordset($1::jsonb) as x(
      "definitionId" text,"parameterId" text,ordinal integer,"valueType" text,"unitId" text,
      "titleRu" text,required boolean,constraints jsonb,"truthMetadata" jsonb
    )`, [JSON.stringify(parameters)]);

    const formulas = chunk.flatMap((definition) => {
      const definitionId = uuid(`${RELEASE_KEY}:definition:${definition.catalogId}`);
      return definition.formulas.map((formula) => ({
        definitionId,
        ...formula,
        astSha256: sha256(formula.ast),
      }));
    });
    if (formulas.length > 0) await client.query(`insert into public.estimate_formula_graph(
      definition_version_id,formula_id,output_unit_id,expression_source,ast,input_parameter_ids,ast_sha256
    ) select x."definitionId"::uuid,x."formulaId",x."outputUnitId",x."expressionSource",x.ast,
      x."inputParameterIds",x."astSha256"
    from jsonb_to_recordset($1::jsonb) as x(
      "definitionId" text,"formulaId" text,"outputUnitId" text,"expressionSource" text,ast jsonb,
      "inputParameterIds" text[],"astSha256" text
    )`, [JSON.stringify(formulas)]);

    for (const definition of chunk) {
      const definitionId = uuid(`${RELEASE_KEY}:definition:${definition.catalogId}`);
      for (let offset = 0; offset < definition.resources.length; offset += 250) {
        const resources = definition.resources.slice(offset, offset + 250).map((resource) => ({
          id: uuid(`${RELEASE_KEY}:resource:${definition.catalogId}:${resource.rowId}`),
          definitionId,
          ...resource,
          rowSha256: sha256({ definitionId, resource }),
        }));
        await client.query(`insert into public.estimate_resource_spec(
          id,definition_version_id,row_id,ordinal,section,category,title_ru,row_type,unit_id,formula_id,
          inclusion_ast,resource_graph,semantic_owner,cost_owner_id,procurement_eligible,source_metadata,row_sha256
        ) select x.id::uuid,x."definitionId"::uuid,x."rowId",x.ordinal,x.section,x.category,x."titleRu",
          x."rowType",x."unitId",x."formulaId",x."inclusionAst",x."resourceGraph",x."semanticOwner",
          x."costOwnerId",x."procurementEligible",x."sourceMetadata",x."rowSha256"
        from jsonb_to_recordset($1::jsonb) as x(
          id text,"definitionId" text,"rowId" text,ordinal integer,section text,category text,"titleRu" text,
          "rowType" text,"unitId" text,"formulaId" text,"inclusionAst" jsonb,"resourceGraph" jsonb,
          "semanticOwner" text,"costOwnerId" text,"procurementEligible" boolean,"sourceMetadata" jsonb,"rowSha256" text
        )`, [JSON.stringify(resources)]);
      }
    }
    process.stdout.write(`[${new Date().toISOString()}] ${BATCH_ID} child rows ${Math.min(start + chunk.length, definitions.length)}/${definitions.length}\n`);
  }
}

async function insertDefinitionEnvelope(
  client: Client,
  releaseId: string,
  searchReleaseId: string,
  sourceHead: string,
  sourceTree: string,
  definition: NormalizedDefinition,
): Promise<void> {
  const definitionId = uuid(`${RELEASE_KEY}:definition:${definition.catalogId}`);
  const baselineId = uuid(`${RELEASE_KEY}:baseline:${definition.catalogId}`);
  const definitionHash = sha256({ passport: definition.passport, applicability: definition.applicability,
    parameters: definition.parameters, formulas: definition.formulas, resources: definition.resources });
  const baseline = definitionBaseline(definition);
  const { formulaConsumers, resourceConsumers } = consumerMaps(definition);
  const schemaHash = sha256(definition.parameters);
  const uom = Object.fromEntries(definition.parameters.map((parameter) => [parameter.parameterId, parameter.unitId ?? "dimensionless"]));
  const classification = Object.fromEntries(definition.parameters.map((parameter) => [parameter.parameterId, "ASSUMPTION"]));
  const normative = Object.fromEntries(definition.parameters.map((parameter) => [parameter.parameterId, ["R4_CURRENT_TECHNOLOGY_PASSPORT"]]));
  const guides = Object.fromEntries(definition.parameters.map((parameter) => [parameter.parameterId, parameter.titleRu]));
  await client.query(`insert into public.estimate_work_identity(
    catalog_id,namespace,domain,source_identity,work_key,title_ru,denominator_eligible
  ) values($1,$2,$3,$4,$5,$6,true)
  on conflict(catalog_id) do nothing`, [
    definition.catalogId, definition.namespace, definition.domain,
    `${BATCH_ID}:${definition.catalogId}`, definition.workGroupId, definition.titleRu,
  ]);
  await client.query(`insert into public.estimate_definition_version(
    id,release_id,catalog_id,definition_version,passport,applicability,definition_sha256,source_metadata
  ) values($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8::jsonb)`, [
    definitionId, releaseId, definition.catalogId, DEFINITION_VERSION, JSON.stringify(definition.passport),
    JSON.stringify(definition.applicability), definitionHash, JSON.stringify(definition.sourceMetadata),
  ]);
  await client.query(`insert into public.estimate_approved_template_baseline(
    id,baseline_key,catalog_id,definition_version_id,source_definition_version_id,parameter_schema_sha256,
    input_values,input_classification,uom_by_parameter,formula_consumer_ids,resource_consumer_row_ids,
    normative_source_ids,guide_provenance_ru,proposal_source_refs,validation_scenario_refs,
    acceptance_evidence_sha256,accepted_release_id,accepted_at,contract_version
  ) values($1,$2,$3,$4,$4,$5,$6::jsonb,$7::jsonb,$8::jsonb,$9::jsonb,$10::jsonb,$11::jsonb,
    $12::jsonb,$13::jsonb,$14::jsonb,$15,$16,'2026-08-22T00:00:00.000Z','APPROVED_TEMPLATE_BASELINE_R54_V1')`, [
    baselineId, `${RELEASE_KEY}:${definition.catalogId}:baseline`, definition.catalogId, definitionId, schemaHash,
    JSON.stringify(baseline), JSON.stringify(classification), JSON.stringify(uom), JSON.stringify(formulaConsumers),
    JSON.stringify(resourceConsumers), JSON.stringify(normative), JSON.stringify(guides),
    JSON.stringify([{ batchId: BATCH_ID, workGroupId: definition.workGroupId, source: "CURRENT_R4_MODEL" }]),
    JSON.stringify([{ contract: "R4_VALID_DEFAULT_BOUNDARY_INVALID", valid: true, boundary: true, invalid: true }]),
    sha256({ definitionHash, baseline, schemaHash }), releaseId,
  ]);
  const decision = {
    contract: "real-professional-estimates-r3.content-passport.v1",
    allowed: true,
    status: "GREEN",
    reasons: [],
  };
  const capabilityMatrix = [
    { role: "TECHNOLOGIST", status: "AUTOMATED_PRELIMINARY_GREEN" },
    { role: "ESTIMATOR", status: "AUTOMATED_PRELIMINARY_GREEN" },
    { role: "FOREMAN", status: "AUTOMATED_PRELIMINARY_GREEN" },
    { role: "PROCUREMENT_QA", status: "AUTOMATED_PRELIMINARY_GREEN" },
  ];
  await client.query(`insert into public.estimate_content_passport_r3(
    definition_version_id,release_id,catalog_id,contract_version,identity_mode,redirect_catalog_id,
    physical_result_ru,included_scope_ru,excluded_scope_ru,capability_matrix,parameter_count,formula_count,
    resource_count,decision,payload_sha256,source_head,source_tree
  ) values($1,$2,$3,'real-professional-estimates-r3.content-passport.v1','WORK',null,$4,$5::jsonb,
    $6::jsonb,$7::jsonb,$8,$9,$10,$11::jsonb,$12,$13,$14)`, [
    definitionId, releaseId, definition.catalogId, definition.titleRu,
    JSON.stringify([`Точный состав ${definition.titleRu}`, "Формулы, упаковка, доставка и отходы по параметрам проекта"]),
    JSON.stringify(["Смежные владельцы не включаются повторно"]), JSON.stringify(capabilityMatrix),
    definition.parameters.length, definition.formulas.length, definition.resources.length,
    JSON.stringify(decision), sha256({ definitionHash, decision, capabilityMatrix }), sourceHead, sourceTree,
  ]);
  await client.query(`insert into public.estimate_cumulative_manifest_entry(
    release_id,catalog_id,definition_version_id,source_batch,source_release_id,domain_id,publication_state,
    approved_template_baseline_id,baseline_ready,scenario_ready,definition_hash,entry_sha256,runtime_publication_state
  ) values($1,$2,$3,$4,$1,$5,'CANONICAL_SUCCESSOR',$6,true,true,$7,$8,'CANDIDATE')`, [
    releaseId, definition.catalogId, definitionId, BATCH_ID.replace("-", ""), definition.domain,
    baselineId, definitionHash, sha256({ releaseId, definitionId, baselineId, definitionHash }),
  ]);
  const normalizedTitle = normalizeSearch(definition.titleRu);
  const operation = /demolition|демонтаж|разбор/iu.test(definition.titleRu) ? "DEMOLITION" : "NEW_INSTALLATION";
  await client.query(`insert into public.estimate_search_document(
    search_release_id,catalog_id,domain_id,system_id,subsystem_id,assembly_id,work_family_id,group_id,
    element_type,operation_kind,technology_variant,construction_state,primary_uom,canonical_name_ru,aliases,
    normative_classifiers,applicability_tags,publication_state,catalog_origin,definition_release_id,short_scope_ru,
    key_distinguishing_parameters,required_inputs_count,clarification_fields,included_boundaries,excluded_boundaries,
    normalized_catalog_id,normalized_canonical_name,normalized_aliases,normalized_search_terms,normalized_search_blob,
    source_provenance,document_sha256,adjudication_class,selectable,definition_version_id
  ) values($1,$2,$3,$3,$3,$4,$4,$4,'WORK',$5,'PROJECT_SPECIFIED','PROJECT_DEFINED',$6,$7,$8,$9,$10,
    'ADMITTED_BACKEND','GLOBAL',$11,$7,$12::jsonb,$13,'[]'::jsonb,$14::jsonb,$15::jsonb,$16,$17,$18,$19,
    $20,$21::jsonb,$22,'EFFECTIVE_WORK',true,$23)`, [
    searchReleaseId, definition.catalogId, definition.domain, definition.workGroupId, operation,
    definition.parameters[0]?.unitId ?? "item", definition.titleRu, definition.aliases,
    [BATCH_ID, definition.domain], [definition.workGroupId], releaseId,
    JSON.stringify(definition.parameters.map((parameter) => parameter.parameterId)), definition.parameters.length,
    JSON.stringify([`Точный состав ${definition.titleRu}`]), JSON.stringify(["Смежные владельцы отдельно"]),
    normalizeSearch(definition.catalogId), normalizedTitle, definition.aliases.map(normalizeSearch),
    [...new Set(normalizedTitle.split(" "))],
    [normalizedTitle, normalizeSearch(definition.catalogId), ...definition.aliases.map(normalizeSearch)].join(" "),
    JSON.stringify({ batchId: BATCH_ID, currentR4Model: true, noRelease: true }),
    sha256({ searchReleaseId, catalogId: definition.catalogId, definitionId, normalizedTitle }), definitionId,
  ]);
}

async function main(): Promise<void> {
  assertDisposableDatabase();
  invariant(sha256(readFileSync(MASTER_PATH)) === MASTER_SHA256, "R4_IMPORT_MASTER_DRIFT");
  const expected = EXPECTED[BATCH_ID];
  invariant(expected, `R4_IMPORT_BATCH_UNSUPPORTED:${BATCH_ID}`);
  const inventory = JSON.parse(readFileSync(INVENTORY_PATH, "utf8")) as Json;
  const groups = (inventory.groups as Json[]).filter((group) => group.batch_id === BATCH_ID);
  const groupByIdentity = new Map<string, string>();
  for (const group of groups) for (const catalogId of group.member_catalog_ids as string[]) {
    invariant(!groupByIdentity.has(catalogId), `R4_IMPORT_IDENTITY_GROUP_OVERLAP:${catalogId}`);
    groupByIdentity.set(catalogId, String(group.work_group_id));
  }
  invariant(groups.length === expected.groups && groupByIdentity.size === expected.identities,
    `R4_IMPORT_DENOMINATOR_RED:${groups.length}/${groupByIdentity.size}`);
  const definitions = (await buildDefinitions(new Set(groupByIdentity.keys()), groupByIdentity))
    .sort((left, right) => left.catalogId.localeCompare(right.catalogId));
  invariant(definitions.length === expected.identities
    && new Set(definitions.map((definition) => definition.catalogId)).size === expected.identities
    && definitions.every((definition) => definition.parameters.length > 0 && definition.formulas.length > 0
      && definition.resources.length > 0 && definition.workGroupId === groupByIdentity.get(definition.catalogId)),
  `R4_IMPORT_MODEL_DENOMINATOR_RED:${definitions.length}`);
  const sourceManifestSha256 = sha256(definitions.map((definition) => ({
    catalogId: definition.catalogId,
    workGroupId: definition.workGroupId,
    passportSha256: sha256(definition.passport),
    parameterSha256: sha256(definition.parameters),
    formulaSha256: sha256(definition.formulas),
    resourceSha256: sha256(definition.resources),
  })));
  const sourceHead = sourceManifestSha256.slice(0, 40);
  const sourceTree = sha256(`r4-tree:${sourceManifestSha256}`).slice(0, 40);
  const releaseId = uuid(`${RELEASE_KEY}:${sourceManifestSha256}`);
  const searchReleaseId = uuid(`${RELEASE_KEY}:search:${sourceManifestSha256}`);
  const totals = {
    definitions: definitions.length,
    parameters: definitions.reduce((sum, definition) => sum + definition.parameters.length, 0),
    formulas: definitions.reduce((sum, definition) => sum + definition.formulas.length, 0),
    resources: definitions.reduce((sum, definition) => sum + definition.resources.length, 0),
  };
  const client = new Client({ connectionString: DATABASE_URL, application_name: `r4-import-${BATCH_ID.toLowerCase()}`, statement_timeout: 0 });
  await client.connect();
  try {
    const existing = (await client.query("select id::text,status,source_manifest_sha256 from public.estimate_definition_release where release_key=$1", [RELEASE_KEY])).rows[0] as Json | undefined;
    if (existing) {
      invariant(existing.id === releaseId && existing.status === "prepared" && existing.source_manifest_sha256 === sourceManifestSha256,
        `R4_IMPORT_EXISTING_RELEASE_DRIFT:${BATCH_ID}`);
      process.stdout.write(`${JSON.stringify({ status: "GREEN_IDEMPOTENT", batchId: BATCH_ID, releaseId, searchReleaseId, totals }, null, 2)}\n`);
      return;
    }
    await client.query("begin");
    try {
      const existingIdentities = (await client.query(`
        select catalog_id,namespace,domain,source_identity,work_key,title_ru,denominator_eligible
        from public.estimate_work_identity where catalog_id=any($1::text[])
      `, [[...groupByIdentity.keys()]])).rows as Json[];
      const definitionById = new Map(definitions.map((definition) => [definition.catalogId, definition]));
      for (const identity of existingIdentities) {
        const definition = definitionById.get(String(identity.catalog_id));
        invariant(definition
          && identity.namespace === definition.namespace
          && identity.domain === definition.domain
          && identity.source_identity === `${BATCH_ID}:${definition.catalogId}`
          && identity.work_key === definition.workGroupId
          && identity.title_ru === definition.titleRu
          && identity.denominator_eligible === true,
        `R4_IMPORT_EXISTING_IDENTITY_DRIFT:${BATCH_ID}:${identity.catalog_id}`);
      }
      await client.query(`insert into public.estimate_definition_release(
        id,release_key,schema_version,status,source_commit,source_tree,source_manifest_sha256,definition_count,
        resource_row_count,metadata,source_package_sha256,parameter_count,formula_count
      ) values($1,$2,4,'draft',$3,$4,$5,$6,$7,$8::jsonb,$5,$9,$10)`, [
        releaseId, RELEASE_KEY, sourceHead, sourceTree, sourceManifestSha256, totals.definitions, totals.resources,
        JSON.stringify({ masterSha256: MASTER_SHA256, batchId: BATCH_ID, currentR4Model: true,
          exactAuthoritativeSubset: true, noProductionPublication: true }), totals.parameters, totals.formulas,
      ]);
      await client.query(`insert into public.estimate_search_index_release(
        id,release_key,status,taxonomy_version,group_relation_version,ranking_contract_version,source_commit,
        source_tree,snapshot_sha256,global_count,external_count,discovered_count,metadata
      ) values($1,$2,'draft','r4','r4','server-owned-r58',$3,$4,$5,$6,0,0,$7::jsonb)`, [
        searchReleaseId, `${RELEASE_KEY}-search`, sourceHead, sourceTree,
        sha256(`search:${sourceManifestSha256}`), totals.definitions,
        JSON.stringify({ masterSha256: MASTER_SHA256, batchId: BATCH_ID, noProductionPublication: true }),
      ]);
      for (const group of groups) await client.query(`insert into public.estimate_search_group(
        search_release_id,group_id,group_name_ru,domain_id,system_id,subsystem_id,assembly_id,work_family_id,
        breadcrumb,member_count,member_set_sha256,oracle_disposition
      ) values($1,$2,$2,$3,$3,$3,$2,$2,$4::jsonb,$5,$6,$7::jsonb)`, [
        searchReleaseId, group.work_group_id, BATCH_ID.toLowerCase(), JSON.stringify([BATCH_ID, group.work_group_id]),
        group.member_count, group.member_set_sha256,
        JSON.stringify({ verdict: "EXACT_R4_AUTHORITATIVE_GROUP", reviewed: true }),
      ]);
      for (let index = 0; index < definitions.length; index += 1) {
        await insertDefinitionEnvelope(client, releaseId, searchReleaseId, sourceHead, sourceTree, definitions[index]!);
        if ((index + 1) % 50 === 0 || index + 1 === definitions.length) {
          process.stdout.write(`[${new Date().toISOString()}] ${BATCH_ID} envelopes ${index + 1}/${definitions.length}\n`);
        }
      }
      await insertChildRows(client, releaseId, definitions);
      await client.query(`update public.estimate_definition_version
        set content_status='CANDIDATE_READY',content_gate_status='GREEN'
        where release_id=$1`, [releaseId]);
      await client.query("update public.estimate_definition_release set status='prepared',sealed_at=clock_timestamp() where id=$1", [releaseId]);
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
    const counts = (await client.query(`select
      (select count(*) from public.estimate_definition_version where release_id=$1)::integer definitions,
      (select count(*) from public.estimate_parameter_definition p join public.estimate_definition_version v on v.id=p.definition_version_id where v.release_id=$1)::integer parameters,
      (select count(*) from public.estimate_formula_graph f join public.estimate_definition_version v on v.id=f.definition_version_id where v.release_id=$1)::integer formulas,
      (select count(*) from public.estimate_resource_spec r join public.estimate_definition_version v on v.id=r.definition_version_id where v.release_id=$1)::integer resources,
      (select count(*) from public.estimate_cumulative_manifest_entry where release_id=$1 and baseline_ready and scenario_ready and runtime_publication_state='CANDIDATE')::integer admitted,
      (select count(*) from public.estimate_search_document where search_release_id=$2 and selectable and adjudication_class='EFFECTIVE_WORK')::integer searchable
    `, [releaseId, searchReleaseId])).rows[0] as Json;
    invariant(Object.entries(totals).every(([key, value]) => Number(counts[key]) === value)
      && Number(counts.admitted) === totals.definitions && Number(counts.searchable) === totals.definitions,
    `R4_IMPORT_FINAL_COUNTS_RED:${BATCH_ID}:${stableJson(counts)}`);
    process.stdout.write(`${JSON.stringify({
      status: "GREEN_CURRENT_R4_CANDIDATE_IMPORTED_NO_RELEASE",
      batchId: BATCH_ID,
      releaseId,
      searchReleaseId,
      sourceManifestSha256,
      sourceHead,
      sourceTree,
      groups: groups.length,
      totals,
      counts,
      productionAccessed: false,
      productionPublished: false,
    }, null, 2)}\n`);
  } finally {
    await client.end();
  }
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
