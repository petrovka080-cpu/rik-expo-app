import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import { canonicalApprovedBaselineRuntimeParameters } from
  "../../../src/lib/estimate/backendPlatform/canonicalEstimateApprovedBaseline";
import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateFormulaDefinition,
  type CanonicalEstimateParameterDefinition,
  type CanonicalEstimateResourceDefinition,
} from "../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { estimateDeterministicHash } from
  "../../../src/lib/estimate/estimateDeterministicHash";
import { validateMasterFormulaGraphConsistency } from
  "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;
type AuditClass = "DIRECT_PROJECT_FACT" | "CONDITIONAL_APPLICABILITY"
  | "METHOD_RESOURCE_QUANTITY";
type PersistedParameterDefinition = CanonicalEstimateParameterDefinition & {
  title_ru: string;
};

const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const CATALOG_ID = "canonical-work:base:electrical_interior_vvg_cable_lay_standard";
const CURRENT_PATH = resolve(
  "data/estimate-benchmarks/r568-local-developer-canonical-release.json",
);
const OUTPUT_PATH = resolve(
  ".release-runtime/r568/s27-24/vvgng-ls-minimal-clarification-audit/acceptance.json",
);
const MINIMAL_INPUT = Object.freeze({
  length_m: "150",
  cable_mark: "ВВГнг(А)-LS",
  core_count: "5",
  conductor_area_mm2: "6",
});

const NEED_AUDIT: Readonly<Record<string, Readonly<{
  auditClass: AuditClass;
  requiredEvidence: string;
  reasonNotDerivable: string;
}>>> = Object.freeze({
  "rc09:fire_resistant_cable_marker": {
    auditClass: "DIRECT_PROJECT_FACT",
    requiredEvidence: "кабельный журнал и правило маркировки трассы",
    reasonNotDerivable: "150 м не определяют число концов, участков и точек маркировки",
  },
  "rc09:halogen_free_cable_clamp": {
    auditClass: "DIRECT_PROJECT_FACT",
    requiredEvidence: "раскладка трассы, основание и узел крепления",
    reasonNotDerivable: "шаг и тип крепления зависят от основания и способа прокладки",
  },
  "rc09:cable_gland_for_5x6": {
    auditClass: "DIRECT_PROJECT_FACT",
    requiredEvidence: "ведомость вводов и оконцеваний",
    reasonNotDerivable: "марка 5×6 не определяет число вводов, коробок и аппаратов",
  },
  "rc09:copper_lug_6mm2": {
    auditClass: "DIRECT_PROJECT_FACT",
    requiredEvidence: "схема оконцеваний и тип присоединяемых аппаратов",
    reasonNotDerivable: "число жил не доказывает число и тип наконечников на реальных концах",
  },
  "rc09:firestop_cable_penetration_compound": {
    auditClass: "DIRECT_PROJECT_FACT",
    requiredEvidence: "перечень проходок, их геометрия и паспорт огнезаделки",
    reasonNotDerivable: "длина трассы не определяет число, размеры и класс проходок",
  },
  "rc09:power_cable_insulation_continuity_test": {
    auditClass: "DIRECT_PROJECT_FACT",
    requiredEvidence: "программа электроизмерений и деление кабельной линии на объекты контроля",
    reasonNotDerivable: "одна длина не задаёт число протоколов и контрольных комплектов",
  },
  "rc09:cable_tray": {
    auditClass: "CONDITIONAL_APPLICABILITY",
    requiredEvidence: "план трассы и проектный способ прокладки",
    reasonNotDerivable: "кабель может идти по существующему лотку, новому лотку или без него",
  },
  "rc09:cable_protective_pipe": {
    auditClass: "CONDITIONAL_APPLICABILITY",
    requiredEvidence: "план трассы и защитные участки по проекту",
    reasonNotDerivable: "защищаемые участки не равны автоматически всей длине трассы",
  },
  "rc09:cable_pulling_lubricant": {
    auditClass: "CONDITIONAL_APPLICABILITY",
    requiredEvidence: "ППР, тип канала и допустимость смазки для выбранного кабеля",
    reasonNotDerivable: "необходимость и расход зависят от способа протяжки и продукта",
  },
  "vvgng:labor:installation": {
    auditClass: "METHOD_RESOURCE_QUANTITY",
    requiredEvidence: "применимая таблица нормы или ППР с составом операции",
    reasonNotDerivable: "длина без способа прокладки, основания и состава операций не даёт трудозатраты",
  },
  "vvgng:labor:testing": {
    auditClass: "METHOD_RESOURCE_QUANTITY",
    requiredEvidence: "программа измерений и применимая трудовая норма",
    reasonNotDerivable: "число и состав испытаний не следуют из длины кабеля",
  },
  "vvgng:equipment:reel-stand": {
    auditClass: "METHOD_RESOURCE_QUANTITY",
    requiredEvidence: "ППР, масса/тара барабана и схема размотки",
    reasonNotDerivable: "марка и длина не определяют поставочную тару и время размотки",
  },
  "vvgng:equipment:pulling-device": {
    auditClass: "METHOD_RESOURCE_QUANTITY",
    requiredEvidence: "ППР, конфигурация трассы и тяговый расчёт",
    reasonNotDerivable: "повороты, участки и допустимое тяговое усилие в минимальном вводе неизвестны",
  },
  "vvgng:equipment:crimp-tool": {
    auditClass: "METHOD_RESOURCE_QUANTITY",
    requiredEvidence: "ведомость оконцеваний и выбранная технология соединения",
    reasonNotDerivable: "5×6 мм² не доказывает количество опрессовок",
  },
  "vvgng:equipment:installation-tester": {
    auditClass: "METHOD_RESOURCE_QUANTITY",
    requiredEvidence: "программа измерений и продолжительность контрольных операций",
    reasonNotDerivable: "время прибора зависит от программы, а не от одной длины",
  },
  "vvgng:logistics:delivery": {
    auditClass: "METHOD_RESOURCE_QUANTITY",
    requiredEvidence: "план поставки, поставочная тара, грузоподъёмность и доступ на объект",
    reasonNotDerivable: "150 м не определяют барабан, массу партии и число рейсов",
  },
  "vvgng:logistics:waste-removal": {
    auditClass: "METHOD_RESOURCE_QUANTITY",
    requiredEvidence: "план обращения с упаковкой и фактическими обрезками",
    reasonNotDerivable: "нейтральный баланс без подтверждённых потерь не задаёт объём вывоза",
  },
});

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function sha256(value: unknown): string {
  return createHash("sha256").update(typeof value === "string"
    ? value
    : JSON.stringify(value)).digest("hex");
}

async function main(): Promise<void> {
  const current = JSON.parse(readFileSync(CURRENT_PATH, "utf8")) as Json;
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    const target = (await client.query(`select manifest.definition_version_id::text,
        manifest.approved_template_baseline_id::text,definition.definition_version,
        passport.parameter_count,passport.formula_count,passport.resource_count
      from public.estimate_cumulative_manifest_entry manifest
      join public.estimate_definition_version definition on definition.id=manifest.definition_version_id
      join public.estimate_content_passport_r3 passport on passport.definition_version_id=definition.id
      where manifest.release_id=$1 and manifest.catalog_id=$2`, [
      current.definitionReleaseId,
      CATALOG_ID,
    ])).rows[0] as Json | undefined;
    invariant(target != null, "STOP_S27_24_VVG_AUDIT_TARGET");
    invariant([target.parameter_count, target.formula_count, target.resource_count]
      .map(Number).join(":") === "36:25:25", "STOP_S27_24_VVG_AUDIT_SHAPE");

    const parameters = (await client.query(`select * from public.estimate_parameter_definition
      where definition_version_id=$1 order by ordinal`, [target.definition_version_id]))
      .rows as PersistedParameterDefinition[];
    const formulas = (await client.query(`select formula_id,output_unit_id,expression_source,
        ast,input_parameter_ids,ast_sha256 from public.estimate_formula_graph
      where definition_version_id=$1 order by formula_id`, [target.definition_version_id]))
      .rows as CanonicalEstimateFormulaDefinition[];
    const resources = (await client.query(`select * from public.estimate_resource_spec
      where definition_version_id=$1 order by ordinal`, [target.definition_version_id]))
      .rows as CanonicalEstimateResourceDefinition[];
    const baseline = (await client.query(`select input_values,input_classification,
        normative_source_ids from public.estimate_approved_template_baseline where id=$1`,
    [target.approved_template_baseline_id])).rows[0] as Json | undefined;
    invariant(baseline != null, "STOP_S27_24_VVG_AUDIT_BASELINE");
    invariant(validateMasterFormulaGraphConsistency(formulas).length === 0,
      "STOP_S27_24_VVG_AUDIT_FORMULA_DRIFT");

    const result = await compileCanonicalEstimateCore({
      operation: "compile",
      compilerVersion: "s27-24-vvg-minimal-clarification-independent-audit-v1",
      catalogId: CATALOG_ID,
      primaryMeasureParameterId: "length_m",
      parameterDefinitions: parameters,
      formulaDefinitions: formulas,
      resourceDefinitions: resources,
      submittedParameters: { ...MINIMAL_INPUT },
      confirmedParameters: canonicalApprovedBaselineRuntimeParameters(baseline),
      currencyCode: "KGS",
      priceItems: [],
      maximumResourceRows: 40,
      hashJson: async (value) => estimateDeterministicHash(value),
    });
    invariant(result.rows.length === 8 && result.preliminaryNeeds.length === 17,
      "STOP_S27_24_VVG_AUDIT_MINIMAL_COMPOSITION");
    invariant(result.rows.filter((row) => row.included_in_procurement).length === 1,
      "STOP_S27_24_VVG_AUDIT_AVAILABLE_PROCUREMENT");
    invariant(result.preliminaryNeeds.every((need) => NEED_AUDIT[need.row_id] != null),
      "STOP_S27_24_VVG_AUDIT_UNCLASSIFIED_NEED");
    invariant(Object.keys(NEED_AUDIT).every((rowId) =>
      result.preliminaryNeeds.some((need) => need.row_id === rowId)),
    "STOP_S27_24_VVG_AUDIT_ORPHAN_CLASSIFICATION");

    const parameterById = new Map(parameters.map((parameter) => [
      parameter.parameter_id,
      parameter,
    ]));
    const clarifications = result.preliminaryNeeds.map((need) => {
      const audit = NEED_AUDIT[need.row_id]!;
      const missingParameters = need.missing_parameter_ids.map((parameterId) => {
        const parameter = parameterById.get(parameterId);
        invariant(parameter != null, `STOP_S27_24_VVG_AUDIT_PARAMETER:${parameterId}`);
        const truth = parameter.truth_metadata as Json;
        invariant(truth.preliminary_compilation_allowed === true
          && truth.source_confirmation_required === true,
        `STOP_S27_24_VVG_AUDIT_PARAMETER_POLICY:${parameterId}`);
        return {
          parameterId,
          titleRu: parameter.title_ru,
          valueSourceRole: truth.value_source_role,
          sourceConfirmationRequired: truth.source_confirmation_required,
          preliminaryCompilationAllowed: truth.preliminary_compilation_allowed,
        };
      });
      return {
        rowId: need.row_id,
        titleRu: need.title_ru,
        unitId: need.unit_id,
        needState: need.need_state,
        auditClass: audit.auditClass,
        requiredEvidence: audit.requiredEvidence,
        reasonNotDerivable: audit.reasonNotDerivable,
        missingParameters,
        blocksFirstEstimate: false,
        fabricatedDefaultAssigned: false,
      };
    });
    const groupCounts = Object.fromEntries([
      "DIRECT_PROJECT_FACT",
      "CONDITIONAL_APPLICABILITY",
      "METHOD_RESOURCE_QUANTITY",
    ].map((auditClass) => [auditClass,
      clarifications.filter((item) => item.auditClass === auditClass).length]));
    invariant(JSON.stringify(groupCounts) === JSON.stringify({
      DIRECT_PROJECT_FACT: 6,
      CONDITIONAL_APPLICABILITY: 3,
      METHOD_RESOURCE_QUANTITY: 8,
    }), "STOP_S27_24_VVG_AUDIT_GROUP_COUNTS");

    const evidence: Json = {
      schemaVersion: "rik-expo-app.s27-24.vvg-minimal-clarification-audit.v1",
      capturedAt: new Date().toISOString(),
      status: "GREEN_S27_24_VVG_MINIMAL_17_CLARIFICATIONS_CLASSIFIED_NOT_UI_ACCEPTED",
      currentRelease: {
        definitionReleaseId: current.definitionReleaseId,
        searchReleaseId: current.searchReleaseId,
      },
      target: {
        catalogId: CATALOG_ID,
        definitionVersionId: target.definition_version_id,
        definitionVersion: Number(target.definition_version),
        definitionShape: [parameters.length, formulas.length, resources.length],
        formulaGraphExpressionConsistency: "25/25 GREEN",
      },
      minimalInput: MINIMAL_INPUT,
      immediateResult: {
        calculatedRows: result.rows.length,
        procurementRows: result.rows.filter((row) => row.included_in_procurement).length,
        clarificationRows: result.preliminaryNeeds.length,
        strictCompilationBlocked: false,
        mandatoryQuestionnaireBeforeEstimate: false,
        visibleRows: result.rows.map((row) => ({
          rowId: row.row_id,
          titleRu: row.title_ru,
          quantity: row.quantity,
          unitId: row.unit_id,
          procurement: row.included_in_procurement,
          estimate: row.included_in_estimate,
        })),
      },
      clarificationAudit: {
        groupCounts,
        derivableFromMinimalInput: 0,
        realLocalProjectFacts: 17,
        rows: clarifications,
      },
      verdict: {
        keepAcceptedSuccessorUnchanged: true,
        repeatApplyOrReadback: false,
        reason: "Each unresolved quantity needs a route, termination, method, QA or logistics fact not uniquely implied by 150 m and 5x6 mm2 cable identity.",
        nextAction: "Continue the remaining Q4 manifest; revisit this owner only when an applicable normative table or project package supplies one of the classified facts.",
      },
      uiAcceptance: false,
      productionAccessed: false,
      activationPerformed: false,
      deployPerformed: false,
    };
    evidence.receiptSha256 = sha256(evidence);
    mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
    const temporary = `${OUTPUT_PATH}.${process.pid}.tmp`;
    writeFileSync(temporary, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
    renameSync(temporary, OUTPUT_PATH);
    process.stdout.write(`${JSON.stringify({
      status: evidence.status,
      definitionVersionId: target.definition_version_id,
      immediateRows: result.rows.length,
      clarificationRows: result.preliminaryNeeds.length,
      groupCounts,
      receiptSha256: evidence.receiptSha256,
      outputPath: OUTPUT_PATH,
    }, null, 2)}\n`);
  } finally {
    await client.end();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
