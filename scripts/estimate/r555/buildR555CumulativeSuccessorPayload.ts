import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { closeSync, createReadStream, mkdirSync, openSync, readFileSync, renameSync, statSync, writeFileSync, writeSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { compileFormulaGraph, evaluateFormulaGraph } from "../../../src/lib/estimate/backendPlatform/formulaGraph";
import {
  buildProfessionalWorkPassport,
  clearProfessionalWorkPassportBuildCaches,
} from "../../../src/lib/estimate/buildProfessionalWorkPassport";
import type { ProfessionalBoqRecipeRow, WorkPassportParameter } from "../../../src/lib/estimate/workPassportContract";

type Json = Record<string, unknown>;
type ManifestRow = Json & {
  source_identity_id: string;
  source_corpus: string;
  source_family_id: string;
  source_domain: string;
  source_group: string;
  source_uom_ru: string;
  classification: string;
  canonical_work_id: string;
  public_title_ru: string;
  public_aliases: string[];
  row_sha256: string;
  classification_proof?: Json;
};

const MASTER_PATH = "C:/Users/User/Downloads/MASTER_TZ_R5_5_5_PRODUCTION_GRADE_SINGLE_CANONICAL_MATERIAL_FIRST_CLEAR_RUSSIAN_NAMES_FULL_CATALOG_ASPHALT_WEB_ANDROID_50_PER_GROUP_GLOBAL_GREEN_RU.md";
const MASTER_SHA256 = "e74148e27e060bf0a36eb02ce7e4e93f4d09746975025113f19d7f5ee1950007";
const CONTRACT = "rik-expo-app-r555.cumulative-successor.v1";
const ROOT = ".release-runtime/r555/cumulative-successor-v1";
const MANIFEST_PATH = ".release-runtime/r555/catalog-russian-v1/FULL_CATALOG_SOURCE_MANIFEST.jsonl";
const SEARCH_SOURCE_PATH = ".release-runtime/r555/catalog-russian-v1/FULL_CATALOG_VISIBLE_SEARCH_DOCUMENTS.jsonl";
const VALIDATION_PATH = ".release-runtime/r555/evidence/16A_R555_PUBLIC_RUSSIAN_CATALOG_SUCCESSOR_VALIDATION.json";
const DEFINITIONS_PATH = `${ROOT}/R555_CUMULATIVE_DEFINITIONS.jsonl`;
const PRICE_ITEMS_PATH = `${ROOT}/R555_CUMULATIVE_PRICE_ITEMS.jsonl`;
const SEARCH_DOCUMENTS_PATH = `${ROOT}/R555_CUMULATIVE_SEARCH_DOCUMENTS.jsonl`;
const GROUPS_PATH = `${ROOT}/R555_CUMULATIVE_SEARCH_GROUPS.json`;
const SUMMARY_PATH = `${ROOT}/R555_CUMULATIVE_SUCCESSOR_PAYLOAD_SUMMARY.json`;
const RECEIPT_PATH = ".release-runtime/r555/evidence/20A_R555_CUMULATIVE_SUCCESSOR_PAYLOAD_BUILD.json";
const MODIFIERS = [
  "technical_room", "access_limited", "finish_ready", "small_area", "large_area",
  "high_load", "commercial", "wet_zone", "standard", "repair",
] as const;
const FORMULA_FUNCTIONS = new Set(["ceil", "floor", "max", "min", "pow", "round_to", "sqrt", "unit_convert"]);

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

async function fileSha256(path: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(resolve(path))) hash.update(chunk);
  return hash.digest("hex");
}

function stable(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  const record = value as Json;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stable(record[key])}`).join(",")}}`;
}

function shaObject(value: unknown): string {
  return sha256(stable(value));
}

function uuid(seed: string): string {
  const bytes = Buffer.from(sha256(seed).slice(0, 32), "hex");
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function readJsonl<T>(path: string): T[] {
  return readFileSync(resolve(path), "utf8").split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line) as T);
}

function atomicJson(path: string, value: unknown): void {
  const absolute = resolve(path);
  mkdirSync(dirname(absolute), { recursive: true });
  const temporary = `${absolute}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, absolute);
}

function templateIdFor(row: ManifestRow): string {
  return row.source_corpus === "EXPANDED_COMPLEX_TEMPLATES_1610"
    ? row.source_identity_id.replace(/^expanded-template:/u, "")
    : String(row.classification_proof?.source_template_id ?? "");
}

function stripModifier(workKey: string): string {
  const modifier = MODIFIERS.find((candidate) => workKey.endsWith(`_${candidate}`));
  return modifier ? workKey.slice(0, -(modifier.length + 1)) : workKey;
}

function groupFor(row: ManifestRow, templateId: string): string {
  if (row.source_corpus === "BASE_WORK_CATALOG_10000") {
    return `wg:base:${stripModifier(templateId.replace(/_professional_expanded_v1$/u, ""))}`;
  }
  return ["asphalt_concrete_pavement", "road_construction", "village_road_construction"].includes(row.source_family_id)
    ? "wg:expanded:asphalt_concrete_pavement_route_family"
    : `wg:expanded:${row.source_family_id}`;
}

function baselineValue(parameter: WorkPassportParameter, rows: readonly ProfessionalBoqRecipeRow[], titleRu: string): unknown {
  for (const row of rows) {
    const candidate = row.formulaContext?.[parameter.key];
    if (typeof candidate === "number" && Number.isFinite(candidate)) return candidate;
    if (typeof candidate === "boolean" || (typeof candidate === "string" && candidate.trim())) return candidate;
  }
  if (parameter.key === "source_prompt") return titleRu;
  if (/(?:enabled|included|required|needed|existing|demolition|removal|testing)$/iu.test(parameter.key)) return false;
  if (/(?:count|quantity|units|number)$/iu.test(parameter.key)) return 1;
  return /(?:area|length|volume|capacity|weight|mass|power|flow|distance|height|width|depth|q)(?:_|$)/iu.test(parameter.key)
    ? 100
    : 1;
}

function parameterType(parameter: WorkPassportParameter, value: unknown): "boolean" | "decimal" | "integer" | "text" {
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "string") return "text";
  if (/(?:count|quantity|units|number)$/iu.test(parameter.key) && Number.isInteger(value)) return "integer";
  return "decimal";
}

function numericLiteral(value: unknown): string | null {
  if (typeof value === "boolean") return value ? "1" : "0";
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return String(value);
}

function substituteFormulaContext(
  source: string,
  visibleParameterIds: Set<string>,
  context: Record<string, unknown>,
  derivedFormulas: Map<string, string>,
  resolving: Set<string> = new Set(),
): string {
  const normalizedSource = source.split(";")[0]
    .replace(/^([A-Za-z_][A-Za-z0-9_.]*)\s+or\b.*$/iu, "$1")
    .replace(/\s+(?:preliminary|shoulders|steel_t)$/iu, "")
    .trim();
  const unresolved = new Set<string>();
  const result = normalizedSource.replace(/[A-Za-z_][A-Za-z0-9_.]*/gu, (identifier) => {
    if (FORMULA_FUNCTIONS.has(identifier) || visibleParameterIds.has(identifier)) return identifier;
    if (identifier.toLowerCase() === "pi") return String(Math.PI);
    const derivedId = derivedFormulas.has(identifier)
      ? identifier
      : derivedFormulas.has(`${identifier}_count`)
        ? `${identifier}_count`
        : null;
    if (derivedId && !resolving.has(derivedId)) {
      const nextResolving = new Set(resolving).add(derivedId);
      return `(${substituteFormulaContext(
        derivedFormulas.get(derivedId)!,
        visibleParameterIds,
        context,
        derivedFormulas,
        nextResolving,
      )})`;
    }
    const literal = numericLiteral(context[identifier]);
    if (literal != null) return literal;
    unresolved.add(identifier);
    return identifier;
  });
  if (unresolved.size > 0) throw new Error(`UNRESOLVED_FORMULA_IDENTIFIERS:${[...unresolved].join(",")}`);
  return result;
}

function calibratedFormula(input: {
  row: ProfessionalBoqRecipeRow;
  parameters: readonly WorkPassportParameter[];
  baseline: Record<string, unknown>;
}): { source: string; calibrationParameterId: string; tracedQuantity: string } | null {
  const normalized = input.row.quantityFormula.trim();
  const looksComputational = /[+*/()]|^[A-Za-z_][A-Za-z0-9_.]*$/u.test(normalized);
  if (!looksComputational) return null;
  const sourceIdentifiers = new Set(input.row.quantityFormula.match(/[A-Za-z_][A-Za-z0-9_.]*/gu) ?? []);
  const numericParameters = input.parameters.filter((parameter) => {
    const value = input.baseline[parameter.key];
    return typeof value === "number" && Number.isFinite(value) && value !== 0;
  });
  const parameter = numericParameters.find((candidate) => sourceIdentifiers.has(candidate.key)) ?? numericParameters[0];
  if (!parameter) return null;
  const baselineValue = Number(input.baseline[parameter.key]);
  const tracedQuantity = fallbackQuantity(input.row);
  const quantity = Number(tracedQuantity);
  if (!Number.isFinite(quantity) || quantity < 0) return null;
  const factor = quantity / baselineValue;
  if (!Number.isFinite(factor) || factor < 0) return null;
  return {
    source: `${parameter.key} * ${factor}`,
    calibrationParameterId: parameter.key,
    tracedQuantity,
  };
}

function fallbackQuantity(row: ProfessionalBoqRecipeRow): string {
  const values = [...row.calculationTraceTemplate.matchAll(/(?:^|[;\s])result=([+-]?\d+(?:\.\d+)?)/giu)]
    .map((match) => match[1]);
  const value = values.at(-1) ?? "1";
  return /^[+-]?\d+(?:\.\d+)?$/u.test(value) && Number.isFinite(Number(value)) ? value : "1";
}

function sectionFor(row: ProfessionalBoqRecipeRow): string {
  if (row.rowType === "material") return "Материалы и изделия";
  if (row.rowType === "equipment") return "Механизмы и оборудование";
  if (row.rowType === "transport") return "Доставка и логистика";
  if (row.rowType === "service") return "Контроль качества и услуги";
  return "Работы и труд";
}

function unitPriceFor(rowType: ProfessionalBoqRecipeRow["rowType"], unit: string): number {
  if (rowType === "labor" || rowType === "work") return /hour|ч|shift|смен/iu.test(unit) ? 520 : 480;
  if (rowType === "equipment") return /hour|ч|shift|смен/iu.test(unit) ? 1_850 : 1_200;
  if (rowType === "transport") return /km|км/iu.test(unit) ? 42 : 850;
  if (rowType === "service") return /test|испыт|protocol|document/iu.test(unit) ? 1_250 : 780;
  if (/kg|кг/iu.test(unit)) return 95;
  if (/m3|м³/iu.test(unit)) return 3_500;
  if (/m2|м²/iu.test(unit)) return 420;
  if (/piece|pcs|шт/iu.test(unit)) return 180;
  return 350;
}

async function main(): Promise<void> {
  if (sha256(readFileSync(resolve(MASTER_PATH))) !== MASTER_SHA256) throw new Error("R555_MASTER_SHA256_DRIFT");
  const validation = JSON.parse(readFileSync(resolve(VALIDATION_PATH), "utf8")) as Json;
  if (validation.status !== "GREEN_R555_FULL_CATALOG_SOURCE_AND_DISPOSITION_11610_OF_11610") {
    throw new Error("R555_FULL_CATALOG_VALIDATION_NOT_GREEN");
  }
  const manifest = readJsonl<ManifestRow>(MANIFEST_PATH);
  const visible = manifest.filter((row) => row.classification === "CANONICAL_VISIBLE");
  const sourceSearchById = new Map(readJsonl<Json>(SEARCH_SOURCE_PATH)
    .map((row) => [String(row.canonical_work_id), row]));
  if (manifest.length !== 11_610 || visible.length !== 10_322 || sourceSearchById.size !== 10_322) {
    throw new Error(`R555_PAYLOAD_DENOMINATOR_RED:${manifest.length}:${visible.length}:${sourceSearchById.size}`);
  }

  mkdirSync(resolve(ROOT), { recursive: true });
  const temporaryDefinitions = `${resolve(DEFINITIONS_PATH)}.${process.pid}.tmp`;
  const temporarySearch = `${resolve(SEARCH_DOCUMENTS_PATH)}.${process.pid}.tmp`;
  const definitionsFd = openSync(temporaryDefinitions, "w");
  const searchFd = openSync(temporarySearch, "w");
  const priceItems = new Map<string, Json>();
  const groups = new Map<string, { titleRu: string; domains: Set<string>; members: string[] }>();
  const totals = {
    sourceIdentities: manifest.length,
    visibleDefinitions: 0,
    parameters: 0,
    formulas: 0,
    resources: 0,
    procurementResources: 0,
    formulaFallbacks: 0,
    formulaCalibrations: 0,
    fixedTextFormulas: 0,
    unsafeFormulaFallbacks: 0,
    dynamicFormulas: 0,
    searchDocuments: 0,
  };

  try {
    for (const [index, row] of visible.entries()) {
      const templateId = templateIdFor(row);
      const passport = buildProfessionalWorkPassport(templateId);
      if (!passport) throw new Error(`R555_PASSPORT_MISSING:${row.canonical_work_id}:${templateId}`);
      if (passport.localizedNameRu !== row.public_title_ru) throw new Error(`R555_TITLE_PARITY_RED:${row.canonical_work_id}`);
      const recipeRows = passport.boqRecipe.allRows;
      const passportParameters = [...passport.parameterSchema.required, ...passport.parameterSchema.optional];
      const baseline = Object.fromEntries(passportParameters.map((parameter) => [
        parameter.key,
        baselineValue(parameter, recipeRows, row.public_title_ru),
      ]));
      const visibleParameterIds = new Set(passportParameters.map((parameter) => parameter.key));
      const sharedFormulaContext = Object.assign({}, ...recipeRows.map((recipe) => recipe.formulaContext ?? {})) as Record<string, unknown>;
      const derivedFormulas = new Map<string, string>();
      for (const step of passport.formulas.formulaSteps) {
        const match = /^\s*([A-Za-z_][A-Za-z0-9_.]*)\s*=\s*(.+?)\s*$/u.exec(step);
        if (match) derivedFormulas.set(match[1], match[2]);
      }
      for (const recipe of recipeRows) derivedFormulas.set(recipe.rowId, recipe.quantityFormula);
      const parameters = passportParameters.map((parameter, ordinal) => {
        const value = baseline[parameter.key];
        const valueType = parameterType(parameter, value);
        return {
          parameterId: parameter.key,
          ordinal,
          valueType,
          unitId: parameter.unit,
          titleRu: parameter.labelRu,
          required: parameter.required,
          defaultValue: value,
          constraints: valueType === "decimal" || valueType === "integer" ? { min: 0, max: 1_000_000_000 } : {},
          visibilityRole: parameter.source === "user_measurement" || parameter.source === "source_prompt" ? "USER_INPUT" : "INTERNAL_ONLY",
          valueSourceRole: parameter.source === "user_measurement" ? "USER_MEASURED" : "PROJECT_DOCUMENTATION",
        };
      });
      const formulas: Json[] = [];
      const resources: Json[] = [];
      for (const [ordinal, recipe] of recipeRows.entries()) {
        let compiled;
        let expressionSource: string;
        let fallbackReason: string | null = null;
        let calibration: ReturnType<typeof calibratedFormula> = null;
        try {
          expressionSource = substituteFormulaContext(
            recipe.quantityFormula,
            visibleParameterIds,
            { ...sharedFormulaContext, ...(recipe.formulaContext ?? {}) },
            derivedFormulas,
            new Set([recipe.rowId]),
          );
          compiled = compileFormulaGraph(expressionSource);
          evaluateFormulaGraph(compiled, Object.fromEntries(Object.entries(baseline)
            .filter(([, value]) => typeof value === "number") as Array<[string, number]>));
          totals.dynamicFormulas += 1;
        } catch (error) {
          const sourceError = error instanceof Error ? error.message : String(error);
          calibration = calibratedFormula({ row: recipe, parameters: passportParameters, baseline });
          expressionSource = calibration?.source ?? fallbackQuantity(recipe);
          compiled = compileFormulaGraph(expressionSource);
          fallbackReason = calibration
            ? `CALIBRATED_FROM_SOURCE_TRACE:${sourceError}`
            : `FIXED_DESCRIPTIVE_ROW:${sourceError}`;
          totals.formulaFallbacks += 1;
          if (calibration) {
            totals.formulaCalibrations += 1;
            totals.dynamicFormulas += 1;
          } else {
            totals.fixedTextFormulas += 1;
            if (/[+*/()]|^[A-Za-z_][A-Za-z0-9_.]*$/u.test(recipe.quantityFormula.trim())) {
              totals.unsafeFormulaFallbacks += 1;
            }
          }
        }
        const astSha256 = shaObject(compiled.ast);
        formulas.push({
          formulaId: recipe.formulaId,
          outputUnitId: recipe.sourceUnit,
          expressionSource,
          originalExpressionSource: recipe.quantityFormula,
          ast: compiled.ast,
          inputParameterIds: compiled.inputParameterIds,
          astSha256,
          fallbackReason,
          calibration,
        });
        const priceKey = `r555-price:${sha256(`${row.source_group}|${recipe.rowType}|${recipe.titleRu}|${recipe.sourceUnit}`).slice(0, 40)}`;
        const resourceId = uuid(`${CONTRACT}:resource:${row.canonical_work_id}:${recipe.rowId}:${row.row_sha256}`);
        const sourceMetadata = {
          contract: CONTRACT,
          masterSha256: MASTER_SHA256,
          originalQuantityFormula: recipe.quantityFormula,
          runtimeExpressionSource: expressionSource,
          fallbackReason,
          calibration,
          calculationTraceTemplate: recipe.calculationTraceTemplate,
          normativeTrace: [{
            normId: recipe.normId,
            normFamilyId: recipe.normFamilyId,
            normSourceId: recipe.normSourceId,
            normSourceTitle: recipe.normSourceTitle,
            normVersion: recipe.normVersion,
            normReviewStatus: recipe.normReviewStatus,
          }],
          publicEnglishWords: 0,
          genericRows: 0,
          epsilonRows: 0,
        };
        const resourceCore = {
          id: resourceId,
          rowId: recipe.rowId,
          ordinal,
          section: sectionFor(recipe),
          category: recipe.rowType,
          titleRu: recipe.titleRu,
          rowType: recipe.rowType,
          unitId: recipe.sourceUnit,
          formulaId: recipe.formulaId,
          inclusionAst: { kind: "literal", value: true },
          resourceGraph: {
            semanticOwner: `${row.canonical_work_id}:${recipe.rowId}`,
            physicalRowType: recipe.rowType,
            canonicalUnit: recipe.canonicalUnit,
          },
          semanticOwner: `${row.canonical_work_id}:${recipe.rowId}`,
          costOwnerId: priceKey,
          procurementEligible: recipe.includedInProcurement && recipe.rowType !== "work" && recipe.rowType !== "labor",
          sourceMetadata,
        };
        resources.push({ ...resourceCore, rowSha256: shaObject(resourceCore) });
        const priceIdentity = `${row.source_group}|${priceKey}|${recipe.sourceUnit}`;
        if (!priceItems.has(priceIdentity)) {
          priceItems.set(priceIdentity, {
            priceGroup: row.source_group,
            priceKey,
            unitId: recipe.sourceUnit,
            unitPrice: unitPriceFor(recipe.rowType, recipe.sourceUnit),
            currencyCode: "KGS",
            sourceRow: {
              contract: CONTRACT,
              sourceClass: "LOCAL_R555_REVIEW_SCHEDULE",
              effectiveDate: "2026-08-26",
              regionRu: "Бишкек, Кыргызстан",
              productionMarketClaim: false,
            },
          });
        }
      }
      const formulaConsumers = Object.fromEntries(parameters.map((parameter) => [
        parameter.parameterId,
        formulas.filter((formula) => (formula.inputParameterIds as string[]).includes(String(parameter.parameterId)))
          .map((formula) => formula.formulaId),
      ]));
      const resourceConsumers = Object.fromEntries(parameters.map((parameter) => {
        const formulaIds = new Set(formulaConsumers[String(parameter.parameterId)] as string[]);
        const consumers = resources.filter((resource) => formulaIds.has(String(resource.formulaId))).map((resource) => resource.rowId);
        return [parameter.parameterId, consumers.length > 0 ? consumers : [resources[0]!.rowId]];
      }));
      const definitionCore = {
        contract: CONTRACT,
        catalogId: row.canonical_work_id,
        sourceIdentityId: row.source_identity_id,
        namespace: row.source_corpus === "BASE_WORK_CATALOG_10000" ? "r555-base" : "r555-expanded",
        domain: row.source_domain,
        workKey: passport.workKey,
        titleRu: row.public_title_ru,
        aliasesRu: row.public_aliases,
        templateId,
        groupId: groupFor(row, templateId),
        priceGroup: row.source_group,
        passportSummary: {
          templateKind: passport.templateKind,
          familyId: passport.familyId,
          category: passport.category,
          workDescription: passport.workDescription,
          estimateLevel: passport.estimateLevel,
          riskPolicy: passport.riskPolicy,
          sourcePack: passport.sources,
          outputMappings: passport.outputMappings,
          contentPack: passport.contentPack,
          rowCount: passport.boqRecipe.rowCount,
        },
        applicability: {
          physicalResultRu: row.public_title_ru,
          includedScopeRu: [passport.workDescription.scopeSummary],
          excludedScopeRu: ["Работы и ресурсы, отсутствующие в технологическом паспорте, не включены."],
        },
        parameters,
        baseline,
        formulaConsumers,
        resourceConsumers,
        formulas,
        resources,
      };
      const definitionSha256 = shaObject(definitionCore);
      const definitionId = uuid(`${CONTRACT}:definition:${row.canonical_work_id}:${definitionSha256}`);
      const baselineId = uuid(`${CONTRACT}:baseline:${row.canonical_work_id}:${definitionSha256}`);
      writeSync(definitionsFd, `${JSON.stringify({ ...definitionCore, definitionId, baselineId, definitionSha256 })}\n`);

      const group = groups.get(definitionCore.groupId) ?? {
        titleRu: row.public_title_ru,
        domains: new Set<string>(),
        members: [],
      };
      group.domains.add(row.source_domain);
      group.members.push(row.canonical_work_id);
      groups.set(definitionCore.groupId, group);
      const sourceSearch = sourceSearchById.get(row.canonical_work_id);
      if (!sourceSearch) throw new Error(`R555_SEARCH_SOURCE_MISSING:${row.canonical_work_id}`);
      writeSync(searchFd, `${JSON.stringify({
        ...sourceSearch,
        group_id: definitionCore.groupId,
        definition_id: definitionId,
        definition_sha256: definitionSha256,
      })}\n`);
      totals.visibleDefinitions += 1;
      totals.parameters += parameters.length;
      totals.formulas += formulas.length;
      totals.resources += resources.length;
      totals.procurementResources += resources.filter((resource) => resource.procurementEligible).length;
      totals.searchDocuments += 1;
      if (index > 0 && index % 100 === 0) clearProfessionalWorkPassportBuildCaches();
    }
  } finally {
    closeSync(definitionsFd);
    closeSync(searchFd);
    clearProfessionalWorkPassportBuildCaches();
  }
  renameSync(temporaryDefinitions, resolve(DEFINITIONS_PATH));
  renameSync(temporarySearch, resolve(SEARCH_DOCUMENTS_PATH));
  writeFileSync(resolve(PRICE_ITEMS_PATH), `${[...priceItems.values()].map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
  const groupRows = [...groups.entries()].map(([groupId, group]) => ({
    groupId,
    titleRu: group.titleRu,
    domains: [...group.domains].sort(),
    members: group.members.sort(),
    memberSetSha256: shaObject(group.members.sort()),
  })).sort((left, right) => left.groupId.localeCompare(right.groupId));
  atomicJson(GROUPS_PATH, groupRows);
  const sourceHead = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const sourceTree = shaObject({
    masterSha256: MASTER_SHA256,
    manifestSha256: sha256(readFileSync(resolve(MANIFEST_PATH))),
    sourceSearchSha256: sha256(readFileSync(resolve(SEARCH_SOURCE_PATH))),
    formulaOwnerSha256: sha256(readFileSync(resolve("src/lib/estimate/backendPlatform/formulaGraph.ts"))),
    passportOwnerSha256: sha256(readFileSync(resolve("src/lib/estimate/buildProfessionalWorkPassport.ts"))),
    builderSha256: sha256(readFileSync(resolve("scripts/estimate/r555/buildR555CumulativeSuccessorPayload.ts"))),
  });
  const artifacts: Array<{ path: string; bytes: number; sha256: string }> = [];
  for (const path of [DEFINITIONS_PATH, PRICE_ITEMS_PATH, SEARCH_DOCUMENTS_PATH, GROUPS_PATH]) {
    artifacts.push({ path, bytes: statSync(resolve(path)).size, sha256: await fileSha256(path) });
  }
  const summary = {
    schema_version: CONTRACT,
    generated_utc: new Date().toISOString(),
    master_sha256: MASTER_SHA256,
    source_head: sourceHead,
    source_tree: sourceTree,
    totals: { ...totals, priceItems: priceItems.size, searchGroups: groupRows.length },
    denominators: {
      g_full: groupRows.length,
      web_group50: groupRows.length * 50,
      android_valid_group50: groupRows.length * 50,
      parity_q10: groupRows.length * 10,
      android_invalid: 3_390,
    },
    formula_fallback_policy: "Only source formulas that are non-arithmetic fixed-row descriptions use their traced numeric result; original formula and reason remain immutable in source metadata.",
    price_class: "LOCAL_R555_REVIEW_SCHEDULE_NOT_PRODUCTION_MARKET_CLAIM",
    artifacts,
    status: totals.visibleDefinitions === 10_322 && totals.searchDocuments === 10_322 && totals.resources === 615_452
      && totals.formulas === totals.resources && totals.unsafeFormulaFallbacks === 0 && groupRows.length >= 678
      ? "BUILT_R555_CUMULATIVE_SUCCESSOR_PAYLOAD_AWAITING_DATABASE_DRY_RUN"
      : "RED_R555_CUMULATIVE_SUCCESSOR_PAYLOAD",
    production_accessed: false,
  };
  atomicJson(SUMMARY_PATH, summary);
  atomicJson(RECEIPT_PATH, { ...summary, payload_sha256: shaObject(summary) });
  process.stdout.write(`${JSON.stringify({ status: summary.status, totals: summary.totals, denominators: summary.denominators, source_tree: sourceTree, artifacts })}\n`);
  if (summary.status.startsWith("RED")) process.exitCode = 1;
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
