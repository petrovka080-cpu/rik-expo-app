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
import {
  buildPublicBoqProcurementNamingProjection,
  normalizePublicBoqNameRu,
} from "../../../src/lib/estimate/publicBoqNaming";
import { bindCanonicalFormulaSource } from "../../../src/lib/estimate/backendPlatform/canonicalFormulaSourceBinding";

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

const MASTER_PATH = "C:/Users/User/Downloads/MASTER_TZ_R5_6_1_PRODUCTION_GRADE_SIMPLE_PRICE_LIST_NAMES_FOUNDATION_CONCRETE_TRUTH_SINGLE_CANONICAL_MODULAR_MONOLITH_WEB_ANDROID_GROUP50_GLOBAL_GREEN_RU.md";
const MASTER_SHA256 = "e4e960e07e644ff235abec3d9b86a8408921391cd19ebcfcba3ef427423fb7e6";
const CONTRACT = "rik-expo-app-r561.cumulative-successor.v1";
const ROOT = ".release-runtime/r561/cumulative-successor-v1";
const MANIFEST_PATH = ".release-runtime/r555/catalog-russian-v1/FULL_CATALOG_SOURCE_MANIFEST.jsonl";
const SEARCH_SOURCE_PATH = ".release-runtime/r555/catalog-russian-v1/FULL_CATALOG_VISIBLE_SEARCH_DOCUMENTS.jsonl";
const VALIDATION_PATH = ".release-runtime/r555/evidence/16A_R555_PUBLIC_RUSSIAN_CATALOG_SUCCESSOR_VALIDATION.json";
const DEFINITIONS_PATH = `${ROOT}/R561_CUMULATIVE_DEFINITIONS.jsonl`;
const PRICE_ITEMS_PATH = `${ROOT}/R561_CUMULATIVE_PRICE_ITEMS.jsonl`;
const SEARCH_DOCUMENTS_PATH = `${ROOT}/R561_CUMULATIVE_SEARCH_DOCUMENTS.jsonl`;
const GROUPS_PATH = `${ROOT}/R561_CUMULATIVE_SEARCH_GROUPS.json`;
const SUMMARY_PATH = `${ROOT}/R561_CUMULATIVE_SUCCESSOR_PAYLOAD_SUMMARY.json`;
const RECEIPT_PATH = ".release-runtime/r561/evidence/08_R561_CUMULATIVE_SUCCESSOR_PAYLOAD_BUILD.json";
const MODIFIERS = [
  "technical_room", "access_limited", "finish_ready", "small_area", "large_area",
  "high_load", "commercial", "wet_zone", "standard", "repair",
] as const;
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
  if (/^(?:project_location|drawings_or_specification|equipment_specification|material_specification|geology_profile|loads|site_access|work_complexity)$/u.test(parameter.key)) return "";
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

function sectionFor(row: ProfessionalBoqRecipeRow): string {
  if (row.rowType === "material") return "Материалы и изделия";
  if (row.rowType === "equipment") return "Механизмы и оборудование";
  if (row.rowType === "transport") return "Доставка и логистика";
  if (row.rowType === "service") return "Контроль качества и услуги";
  return "Работы и труд";
}

function procurementPackagingFor(row: ProfessionalBoqRecipeRow): {
  packagingRu: string;
  packageSize: number | null;
  packageUnitRu: string;
  purchaseQuantityFormula: string;
  roundingRuleRu: string;
} | null {
  if (row.rowType !== "material" || !row.includedInProcurement) return null;
  const title = row.titleRu.toLocaleLowerCase("ru-RU");
  if (/бетон|раствор/iu.test(title) && row.sourceUnit === "m3") {
    return {
      packagingRu: "Партия автобетоносмесителя до 7 м³; объём заказа не округляется как штучная упаковка",
      packageSize: null,
      packageUnitRu: "м³",
      purchaseQuantityFormula: "расчётная потребность в м³",
      roundingRuleRu: "без закупочного округления",
    };
  }
  if (/кабел|провод/iu.test(title) && row.sourceUnit === "m") {
    return {
      packagingRu: "Кабельный барабан 500 м; фактическая строительная длина подтверждается поставщиком",
      packageSize: 500,
      packageUnitRu: "барабан",
      purchaseQuantityFormula: "ceil(расчётная потребность / 500) * 500",
      roundingRuleRu: "вверх до полного барабана после подтверждения строительной длины",
    };
  }
  if (/труб|воздуховод|лоток|профил/iu.test(title) && row.sourceUnit === "m") {
    return {
      packagingRu: "Транспортная длина 6 м; точная длина изделия подтверждается спецификацией",
      packageSize: 6,
      packageUnitRu: "отрезок",
      purchaseQuantityFormula: "ceil(расчётная потребность / 6) * 6",
      roundingRuleRu: "вверх до целого транспортного отрезка",
    };
  }
  if (/мембран|геотекст|изоляц|рулон/iu.test(title) && row.sourceUnit === "m2") {
    return {
      packagingRu: "Рулон 50 м²; фактическая площадь рулона подтверждается паспортом материала",
      packageSize: 50,
      packageUnitRu: "рулон",
      purchaseQuantityFormula: "ceil(расчётная потребность / 50) * 50",
      roundingRuleRu: "вверх до полного рулона",
    };
  }
  if (row.sourceUnit === "kg") {
    return {
      packagingRu: "Поставка по массе; транспортная пачка 1000 кг уточняется по виду материала",
      packageSize: 1_000,
      packageUnitRu: "пачка",
      purchaseQuantityFormula: "ceil(расчётная потребность / 1000) * 1000",
      roundingRuleRu: "вверх до транспортной пачки после подтверждения поставщика",
    };
  }
  if (row.sourceUnit === "l") {
    return {
      packagingRu: "Канистра 10 л",
      packageSize: 10,
      packageUnitRu: "канистра",
      purchaseQuantityFormula: "ceil(расчётная потребность / 10) * 10",
      roundingRuleRu: "вверх до полной канистры",
    };
  }
  if (row.sourceUnit === "m3" || row.sourceUnit === "t") {
    return {
      packagingRu: "Навальная или наливная поставка по фактической массе или объёму",
      packageSize: null,
      packageUnitRu: row.sourceUnit === "m3" ? "м³" : "т",
      purchaseQuantityFormula: "расчётная потребность без штучного округления",
      roundingRuleRu: "без закупочного округления",
    };
  }
  if (row.sourceUnit === "pcs" || row.sourceUnit === "set") {
    return {
      packagingRu: "Заводская единица поставки; одна штука или один комплект",
      packageSize: 1,
      packageUnitRu: row.sourceUnit === "pcs" ? "шт." : "компл.",
      purchaseQuantityFormula: "ceil(расчётная потребность)",
      roundingRuleRu: "вверх до целой заводской единицы",
    };
  }
  return {
    packagingRu: `Поставочная единица «${row.sourceUnit}»; размер партии подтверждается предложением поставщика`,
    packageSize: null,
    packageUnitRu: row.sourceUnit,
    purchaseQuantityFormula: "расчётная потребность до подтверждения поставочной единицы",
    roundingRuleRu: "округление не применяется без подтверждённой упаковки",
  };
}

function materialFirstTrace(row: ProfessionalBoqRecipeRow): Record<string, unknown> {
  const packaging = procurementPackagingFor(row);
  const wastePercent = Number(row.formulaContext?.materialWastePercent ?? 0);
  const sourceGroup = String(row.formulaContext?.sourceGroup ?? "");
  const isDelivery = row.rowType === "transport" || sourceGroup === "logistics" || /достав|перевоз/iu.test(row.titleRu);
  const isWaste = sourceGroup === "waste" || /отход|утилиз|обрез/iu.test(row.titleRu);
  return {
    ...(packaging ?? {}),
    ...(wastePercent > 0 ? {
      wasteRu: `Технологический запас ${wastePercent}% применён один раз в формуле количества этой позиции`,
      wastePercent,
      wasteAppliedOnce: true,
    } : isWaste ? { wasteRu: "Отдельный рассчитанный поток отходов выбранной технологии" } : {}),
    ...(isDelivery ? { deliveryRu: row.titleRu } : row.rowType === "material" ? {
      deliveryRu: "Груз включён в единственный рассчитанный логистический поток паспорта работы",
    } : {}),
  };
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
      if (!passport) throw new Error(`R561_PASSPORT_MISSING:${row.canonical_work_id}:${templateId}`);
      const recipeRows = passport.boqRecipe.allRows;
      const passportParameters = [...passport.parameterSchema.required, ...passport.parameterSchema.optional];
      const baseline = Object.fromEntries(passportParameters.map((parameter) => [
        parameter.key,
        baselineValue(parameter, recipeRows, passport.localizedNameRu),
      ]));
      const visibleParameterIds = new Set(passportParameters.map((parameter) => parameter.key));
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
        const fallbackReason: null = null;
        const calibration: null = null;
        try {
          expressionSource = bindCanonicalFormulaSource({
            source: recipe.quantityFormula,
            parameterIds: visibleParameterIds,
            derivedFormulas,
            resolving: new Set([recipe.rowId]),
          });
          compiled = compileFormulaGraph(expressionSource);
          evaluateFormulaGraph(compiled, Object.fromEntries(Object.entries(baseline)
            .filter(([, value]) => typeof value === "number") as Array<[string, number]>));
          totals.dynamicFormulas += 1;
        } catch (error) {
          const sourceError = error instanceof Error ? error.message : String(error);
          throw new Error(`R561_FORMULA_SOURCE_NOT_BOUND:${row.canonical_work_id}:${recipe.rowId}:${sourceError}`);
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
        const priceKey = `r561-price:${sha256(`${row.source_group}|${recipe.rowType}|${recipe.titleRu}|${recipe.sourceUnit}`).slice(0, 40)}`;
        const resourceId = uuid(`${CONTRACT}:resource:${row.canonical_work_id}:${recipe.rowId}:${row.row_sha256}`);
        const procurementEligible = recipe.includedInProcurement && recipe.rowType !== "work" && recipe.rowType !== "labor";
        const naming = procurementEligible
          ? buildPublicBoqProcurementNamingProjection({
              sourceNameRu: recipe.titleRu,
              workNameRu: passport.localizedNameRu,
              unit: recipe.sourceUnit,
              catalogOrPriceListReference: priceKey,
            })
          : null;
        const publicNameRu = naming?.publicNameRu ?? normalizePublicBoqNameRu({
          sourceNameRu: recipe.titleRu,
          workNameRu: passport.localizedNameRu,
        });
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
          titleRu: publicNameRu,
          rowType: recipe.rowType,
          unitId: recipe.sourceUnit,
          formulaId: recipe.formulaId,
          inclusionAst: { kind: "literal", value: true },
          resourceGraph: {
            semanticOwner: `${row.canonical_work_id}:${recipe.rowId}`,
            physicalRowType: recipe.rowType,
            canonicalUnit: recipe.canonicalUnit,
            source_name_ru: recipe.titleRu,
            ...(naming ? {
              public_name_ru: naming.publicNameRu,
              specification_ru: naming.specificationRu,
              procurement_search_name_ru: naming.procurementSearchNameRu,
              catalog_or_price_list_reference: naming.catalogOrPriceListReference,
              can_be_procured_by_name: naming.canBeProcuredByName,
            } : {}),
            ...materialFirstTrace(recipe),
          },
          semanticOwner: `${row.canonical_work_id}:${recipe.rowId}`,
          costOwnerId: priceKey,
          procurementEligible,
          sourceMetadata,
        };
        resources.push({ ...resourceCore, rowSha256: shaObject(resourceCore) });
        const priceIdentity = `${row.source_group}|${priceKey}|${recipe.sourceUnit}`;
        if (!priceItems.has(priceIdentity)) {
          priceItems.set(priceIdentity, {
            priceGroup: row.source_group,
            priceKey,
            unitId: recipe.sourceUnit,
            unitPrice: null,
            currencyCode: "KGS",
            priceStatus: "PRICE_PENDING",
            sourceRow: {
              contract: CONTRACT,
              sourceClass: "PRICE_SOURCE_REQUIRED",
              requiredRegionRu: "Кыргызстан",
              requiredCurrency: "KGS",
              requiredPriceUom: recipe.sourceUnit,
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
        titleRu: passport.localizedNameRu,
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
          physicalResultRu: passport.localizedNameRu,
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
        titleRu: passport.localizedNameRu,
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
    s2bRegistrySha256: sha256(readFileSync(resolve("src/lib/ai/expandedComplexWorks/s2b/registry.ts"))),
    formulaBindingOwnerSha256: sha256(readFileSync(resolve("src/lib/estimate/backendPlatform/canonicalFormulaSourceBinding.ts"))),
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
      android_invalid: groupRows.length * 5,
    },
    formula_fallback_policy: "FORBIDDEN: every computational identifier must bind to a declared parameter; only a numeric quantity explicitly stated by a fixed descriptive source row is literal.",
    price_class: "PRICE_PENDING_REAL_KGS_SOURCE_REQUIRED",
    artifacts,
    status: totals.visibleDefinitions === 10_322 && totals.searchDocuments === 10_322 && totals.resources > 0
      && totals.formulas === totals.resources && totals.unsafeFormulaFallbacks === 0 && groupRows.length >= 678
      ? "BUILT_R561_CUMULATIVE_SUCCESSOR_PAYLOAD_AWAITING_REAL_PRICE_SOURCES_AND_DATABASE_DRY_RUN"
      : "RED_R561_CUMULATIVE_SUCCESSOR_PAYLOAD",
    production_accessed: false,
  };
  atomicJson(SUMMARY_PATH, summary);
  atomicJson(RECEIPT_PATH, { ...summary, payload_sha256: shaObject(summary) });
  process.stdout.write(`${JSON.stringify({ status: summary.status, totals: summary.totals, denominators: summary.denominators, source_tree: sourceTree, artifacts })}\n`);
  if (summary.status.startsWith("RED")) process.exitCode = 1;
}

if (require.main === module) {
void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});

}


import type{MasterSingleDefinitionSuccessorConfig}from'../r4a13/prepareMasterSingleDefinitionSuccessorR1';
import{assembleMasterSingleDefinitionManagedRegistryCandidateR1}from'../r4a13/prepareMasterSingleDefinitionSuccessorR1';
import{resolveMasterScopedNormativeRegistryOptInR1}from'../r4a13/masterScopedNormativeRegistryPreimageR1';
import{INTERCOM_EXISTING_DOMAIN_WHOLE_SOURCE_R1,intercomExistingDomainWholeDefinitionR1}from'../../../src/lib/estimate/buildProfessionalWorkPassport';
import{compileCanonicalEstimateCore as intercomCoreR1}from'../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import{estimateDeterministicHash as intercomHashR1}from'../../../src/lib/estimate/estimateDeterministicHash';
export type ExistingIntercomWholeContextR1=Readonly<{sourceRoot:string;expectedBranch:string;masterPath:string;masterSha256:string;parentReleaseId:string;parentSearchReleaseId:string;currentReleasePath:string;selectedCurrentReleasePath:string;outputRoot:string;capturedParentPath:string;capturedParentByteSha256:string;referencePointerMode:'PREPARED_NOT_ACTIVE_COPY';verifyTargetPrecondition:NonNullable<MasterSingleDefinitionSuccessorConfig['verifyTargetPrecondition']>;capturedScopedNormativeRegistry?:MasterSingleDefinitionSuccessorConfig['capturedScopedNormativeRegistry']}>;
function intercomRequireR1(ok:unknown,code:string):asserts ok{if(!ok)throw Error('STOP_INTERCOM_WHOLE_R1_'+code);}
function intercomProducerRecordR1(v:unknown):Record<string,unknown>{if(v===null||typeof v!=='object'||Array.isArray(v))throw Error('INTERCOM_R1_RECORD_REQUIRED');return Object.fromEntries(Object.entries(v));}
export function intercomWholeSourceFixtureR1():Record<string,unknown>{
 const q=INTERCOM_EXISTING_DOMAIN_WHOLE_SOURCE_R1,r:Record<string,unknown>={q:2,intercom_actual_installed_complete_systems_r1:2,intercom_actual_received_complete_kits_r1:3,intercom_actual_bus_B_m_r1:40,intercom_actual_bus_C_m_r1:60,intercom_actual_relay_D_m_r1:10,intercom_actual_qa_events_r1:12};
 for(const f of q.actualRecords)r[f.id]='TEST_ONLY reviewed source-contract record '+f.id+'; not real object/approval';
 for(const g of q.geometryFacts)r[g.id]=g.id.includes('_A_')?50:g.id.includes('_B_')?20:g.id.includes('_C_')?30:5;
 for(const x of q.resources)if(x.quantityUnknown&&typeof x.quantityParameterId==='string')r[x.quantityParameterId]=x.unitId==='man_hour'?'0.1':1;
 r[q.scopeDecisionId]=q.supportedDecision;return r;
}
export function compileExistingIntercomWholeR1(input:Record<string,unknown>=intercomWholeSourceFixtureR1(),rowOverrides:Parameters<typeof intercomCoreR1>[0]['rowOverrides']={}){
 const q=INTERCOM_EXISTING_DOMAIN_WHOLE_SOURCE_R1,m=intercomExistingDomainWholeDefinitionR1(q.profileId);
 return intercomCoreR1({operation:Object.keys(rowOverrides??{}).length?'recalculate':'compile',compilerVersion:q.contract,catalogId:q.catalogId,primaryMeasureParameterId:q.primaryMeasureParameterId,parameterDefinitions:[...m.parameters],formulaDefinitions:[...m.formulas],resourceDefinitions:[...m.resources],submittedParameters:Object.fromEntries(m.ordinaryParameterIds.filter(id=>input[id]!==undefined).map(id=>[id,input[id]])),confirmedParameters:input,rowOverrides,priceItems:[],currencyCode:'KGS',maximumResourceRows:q.maximumResourceRows,hashJson:intercomHashR1});
}
/** Pure config appended to the established catalogue producer. Existing Master
 * owns source registry capture, both authority phases, publication and audit. */
export function prepareExistingIntercomWholeConfigR1(ctx:ExistingIntercomWholeContextR1):MasterSingleDefinitionSuccessorConfig{
 const q=INTERCOM_EXISTING_DOMAIN_WHOLE_SOURCE_R1;
 intercomRequireR1(ctx.referencePointerMode==='PREPARED_NOT_ACTIVE_COPY'&&resolve(ctx.currentReleasePath).toLowerCase()!==resolve(ctx.selectedCurrentReleasePath).toLowerCase(),'PREPARED_POINTER_MUST_DIFFER');
 intercomRequireR1(ctx.capturedParentByteSha256===q.freshParent.proof.sha256&&sha256(readFileSync(ctx.capturedParentPath))===q.freshParent.proof.sha256,'EXACT_R1074_PARENT_REQUIRED');
 const p=intercomProducerRecordR1(JSON.parse(readFileSync(ctx.capturedParentPath,'utf8')));intercomRequireR1(p.transactionRolledBack===true&&p.connectionClosed===true&&p.referenceReleaseId===ctx.parentReleaseId,'ACTUAL_REFERENCE_READONLY_RECEIPT');
 intercomRequireR1(Array.isArray(p.results),'RESULTS');const t=p.results.map(intercomProducerRecordR1).find(r=>intercomProducerRecordR1(r.target).catalogId===q.catalogId);intercomRequireR1(t,'TARGET');
 for(const side of['current','reference']){const observed=intercomProducerRecordR1(t[side]),body=intercomProducerRecordR1(t[side+'Body']);intercomRequireR1(intercomHashR1(observed.header)===intercomHashR1(q.freshParent.actualHeader)&&(['parameters','formulas','resources']as const).every(k=>intercomHashR1(body[k])===intercomHashR1(q.freshParent.nativeParentModel[k])),'EXACT_CURRENT_REFERENCE_BODY');}
 intercomRequireR1(typeof ctx.verifyTargetPrecondition==='function','NORMAL_LOCKED_AUTHORITY_GUARD_REQUIRED');
 intercomRequireR1(ctx.capturedScopedNormativeRegistry!==undefined,'FORMAL_SCOPED_CAPTURE_REQUIRED_EMPTY_LOOKUP_NOT_CANDIDATE_ABSENCE');
 const verifyBytes=()=>{intercomRequireR1(sha256(readFileSync(resolve(ctx.sourceRoot,q.projectMethod.logicalPath)))===q.projectMethod.sha256,'METHOD_BYTES');for(const s of q.primarySources)intercomRequireR1(sha256(readFileSync(s.path))===s.sha256,'OEM_BYTES:'+s.path);};verifyBytes();
 const m=intercomExistingDomainWholeDefinitionR1(q.profileId),fixture=intercomWholeSourceFixtureR1();
 const config:MasterSingleDefinitionSuccessorConfig={contract:q.contract,stopCode:'INTERCOM_WHOLE_R1',applicationName:'existing-intercom-domain-whole-source',expectedBranch:ctx.expectedBranch,masterPath:ctx.masterPath,masterSha256:ctx.masterSha256,parentReleaseId:ctx.parentReleaseId,parentSearchReleaseId:ctx.parentSearchReleaseId,currentReleasePath:ctx.currentReleasePath,outputRoot:ctx.outputRoot,catalogId:q.catalogId,sourceId:q.candidateSourceId,normId:'PROJECT_SYSTEM:EXACT_2WIRE_INTERCOM_WHOLE_METHOD_R1',
  capturedScopedNormativeRegistry:ctx.capturedScopedNormativeRegistry,
  sourceMetadata:{source_title:q.titleRu,source_authority:'PROJECT_SYSTEM exact OEM method plus separately mandatory project/legacy63/owner records; no payment norm or object safety design',source_kind:'PROJECT_SYSTEM',artifact_sha256:q.projectMethod.sha256,official_url:null,exact_locator:q.locatorKey,use_restriction:'Only exact source method; legacy63 classes/quantity/normative/price/source holds remain; no whole-building acceptance.'},
  sourcePaths:['src/lib/estimate/buildProfessionalWorkPassport.ts','scripts/estimate/r555/buildR555CumulativeSuccessorPayload.ts','tests/estimateNorms/intercomExistingDomainWholeR1.contract.test.ts','data/estimate-benchmarks/source-packs/intercom-existing-domain-whole-r1.json',q.projectMethod.logicalPath],
  parameterDefinitions:m.parameters,formulaDefinitions:m.formulas,resourceDefinitions:m.resources,shortInput:fixture,acceptanceInput:fixture,runtimeProfileInput:{},runtimeProfileClassification:{},runtimeProfileSourceIds:{},expectedParentShape:[1,63,63],benchmarkOrdinal:0,validationScenario:'EXISTING_INTERCOM_WHOLE_SOURCE_NOT_OBJECT_OR_PRICE_APPROVAL',
  verifyTargetPrecondition:async(client,phase)=>{verifyBytes();await ctx.verifyTargetPrecondition(client,phase);},verifyCore:async()=>{const r=await compileExistingIntercomWholeR1(fixture);intercomRequireR1(r.rows.length+r.preliminaryNeeds.length<=q.maximumResourceRows,'BOUNDED_CORE');return{status:'TEST_ONLY_SOURCE_NOT_NATIVE_OR_WHOLE_BUILDING',physicalClosures:0,sourceAdmission:false,FULL:false};},
  passport:{canonicalRuName:'Монтаж домофонной системы',workKey:'electrical_interior_intercom_install_standard',physicalResultRu:'Совместимая домофонная линия смонтирована и предъявлена к полной принятой программе; фактическое выполнение/результаты и объектные условия не следуют из расчёта.',includedScopeRu:q.operationRoster.map(o=>o.operationTitleRu),excludedScopeRu:['IP/PoE/cloud/второй абонент и произвольные системы не подставляются.','Shared ACS lock/power/escape, upstream electrical feed/UPS и общие FAS/CAT6 владельцы не оплачиваются второй раз.'],independentCompletenessMap:q.independentComposition,unresolvedApplicableResourceRowIds:q.resourceDeclarations.filter(r=>r.rowKind==='RESOURCE').map(r=>r.rowId)},
  applicability:{primaryMeasureParameterId:q.primaryMeasureParameterId,primaryMeasureUnitId:'pcs',legacyPrimaryMeasureHistoryOnly:'q',automaticPrimaryMeasureMigrationAllowed:false,internalProfileId:q.profileId,actualParent:q.freshParent.actualHeader,sourceAdmission:false,activationAllowed:false,productionEligible:false,automaticMigrationAllowed:false,fullTechnicalAcceptance:false},
  binding:{rowId:m.resources[0]!.row_id,additionalRowIds:m.resources.slice(1).map(r=>r.row_id),ordinaryCompositeSourceV1:{contract:'master-ordinary-composite-source/v1',capturedSourcePreimage:{sourceKey:q.candidateSourceId,expected:null}},applicability:{internalProfileId:q.profileId,sourceAdmission:false},applicabilityByRowId:Object.fromEntries(q.resourceDeclarations.map(r=>[r.rowId,{formulaId:r.formulaId,operationIds:r.operationIds,legacySourceResolutionRequired:true}]))},
  locator:{key:q.locatorKey,payload:{contract:q.contract,sourceOrigin:{source_document_version:q.contract,definition_hash:q.projectMethod.sha256},actualParent:q.freshParent.actualHeader,independentCompletenessMap:q.independentComposition,sourceOwnedResourceDeclarations:q.resourceDeclarations,primaryPins:q.primarySources,sourceAdmission:false}},
  search:{primaryUom:'pcs',canonicalNameRu:'Монтаж домофонной системы',aliases:['монтаж домофона','монтаж видеодомофона'],shortScopeRu:'Полный совместимый цикл линии домофона: монтаж, питание, соединения, конфигурация, вызов/аудио/видео и проверка принятого дверного интерфейса.',keyDistinguishingParameters:['q','intercom_actual_installed_complete_systems_r1'],clarificationFields:q.scopeFactIds,includedBoundaries:q.operationRoster.map(o=>o.operationTitleRu),excludedBoundaries:['Неподтверждённая архитектура/дверной режим/источники/legacy63 не допускаются по одному названию.'],extraSearchTermsRu:'видеодомофон вызывная панель внутренний блок двухпроводная линия реле настройка проверка',sourceProvenance:{sourceId:q.candidateSourceId,artifactSha256:q.projectMethod.sha256,sourceAdmission:false}},
  forbiddenAdjacentMatchers:[/\b(?:nurse|CAT6A|PoE|CCTV)\b|полная\s+пожарная\s+сертификация/iu],owner:'EXISTING_INTERCOM_WHOLE_SOURCE_R1',receiptFileStem:'EXISTING_INTERCOM_WHOLE_R1'};
 const managed=assembleMasterSingleDefinitionManagedRegistryCandidateR1(config,{projectSourcePackage:null,projectSourcePackageSet:null}).retentionCandidate;
 intercomRequireR1(resolveMasterScopedNormativeRegistryOptInR1(managed)!==null,'EXISTING_MASTER_FORMAL_REGISTRY_PREDICATE');return config;
}
