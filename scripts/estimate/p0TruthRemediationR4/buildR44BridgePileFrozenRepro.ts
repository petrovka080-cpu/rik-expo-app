import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile, appendFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

import {
  EXPANDED_COMPLEX_TEMPLATES,
  EXPANDED_COMPLEX_WORK_FAMILIES,
  calculateExpandedComplexEstimate,
} from "../../../src/lib/ai/expandedComplexWorks";
import { buildProfessionalWorkPassport } from "../../../src/lib/estimate/buildProfessionalWorkPassport";

const QUERY = "Мосты, тоннели и инженерные сооружения: мост свайное фундамент 10 штук";
const WORK_KEY = "bridge_pile_foundations";
const TEMPLATE_ID = "bridge_pile_foundations_preliminary_boq_expanded_complex_v1";
const GENERIC_STAGE = /этап\s*[1-7]|^(?:Материалы|Работы|Трудозатраты|Сервис и контроль|Оборудование|Логистика) этапа/iu;
const SIBLING_SCOPE = /Опоры моста|Устои моста|Плита проезжей части|Пролётные балки|Гидроизоляция плиты|Асфальт на мосту|водоотвод|ограждения|освещение/iu;

function git(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function stable(value: unknown): string {
  if (value == null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stable(record[key])}`).join(",")}}`;
}

function sha256(value: unknown): string {
  return createHash("sha256").update(stable(value)).digest("hex");
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function main(): Promise<void> {
  const evidenceRoot = resolve(process.argv[2] ?? ".release-runtime/p0-estimate-truth-remediation-r4/evidence");
  const reproRoot = join(evidenceRoot, "02-repro");
  const timestamp = new Date().toISOString();
  const head = git(["rev-parse", "HEAD"]);
  const tree = git(["rev-parse", "HEAD^{tree}"]);
  const passport = buildProfessionalWorkPassport(TEMPLATE_ID);
  const estimate = calculateExpandedComplexEstimate({ prompt: QUERY, familyId: WORK_KEY });
  if (!passport || !estimate) throw new Error("BRIDGE_PILE_FOUNDATIONS_RECONSTRUCTION_UNAVAILABLE");

  const parameters = [...passport.parameterSchema.required, ...passport.parameterSchema.optional];
  const rows = passport.boqRecipe.allRows;
  const genericStageRows = rows.filter((row) => GENERIC_STAGE.test(row.titleRu));
  const siblingRows = rows.filter((row) => SIBLING_SCOPE.test(row.titleRu));
  const prefixes = {
    materials: rows.filter((row) => /^Материалы этапа/iu.test(row.titleRu)).length,
    works: rows.filter((row) => /^Работы этапа/iu.test(row.titleRu)).length,
    labor: rows.filter((row) => /^Трудозатраты этапа/iu.test(row.titleRu)).length,
    service: rows.filter((row) => /^Сервис и контроль этапа/iu.test(row.titleRu)).length,
    equipment: rows.filter((row) => /^Оборудование этапа/iu.test(row.titleRu)).length,
    logistics: rows.filter((row) => /^Логистика этапа/iu.test(row.titleRu)).length,
  };
  const reconstructedRows = rows.map((row, index) => ({
    ordinal: index + 1,
    rowId: row.rowId,
    rowType: row.rowType,
    titleRu: row.titleRu,
    sourceUnit: row.sourceUnit,
    canonicalUnit: row.canonicalUnit,
    quantityFormula: row.quantityFormula,
    formulaId: row.formulaId,
    normId: row.normId,
    includedInEstimate: row.includedInEstimate,
    includedInProcurement: row.includedInProcurement,
    priceStatus: row.priceStatus,
    calculationTraceTemplate: row.calculationTraceTemplate,
  }));

  const bridgeCalculatorFamilies = EXPANDED_COMPLEX_WORK_FAMILIES
    .filter((family) => family.calculatorId === "bridgeCalculator")
    .map((family) => family.work_family_id)
    .sort();
  const bridgeCalculatorTemplates = EXPANDED_COMPLEX_TEMPLATES
    .filter((template) => bridgeCalculatorFamilies.includes(template.work_family_id))
    .map((template) => template.template_id)
    .sort();
  const commonOwnerRows = EXPANDED_COMPLEX_TEMPLATES.map((template) => ({
    template_id: template.template_id,
    work_family_id: template.work_family_id,
    template_level: template.template_level,
    calculator_id: EXPANDED_COMPLEX_WORK_FAMILIES.find((family) => family.work_family_id === template.work_family_id)?.calculatorId ?? null,
    affected_by_expanded_family_scope_owner: true,
    affected_by_bridge_calculator_owner: bridgeCalculatorFamilies.includes(template.work_family_id),
    current_disposition: "RED_SHARED_GENERIC_OWNER_REQUIRES_PER_ID_REMEDIATION",
  }));

  const common = {
    schemaVersion: "p0-canonical-estimate-truth-remediation-r4.4.bridge-frozen-repro.v1",
    recordedAt: timestamp,
    sourceHead: head,
    sourceTree: tree,
    query: QUERY,
    workKey: WORK_KEY,
    templateId: TEMPLATE_ID,
    evidenceKind: "RECONSTRUCTED_SOURCE_REPRO_NOT_ORIGINAL_USER_PAYLOAD",
    originalSourceStatus: "SOURCE_EVIDENCE_MISSING",
  };
  const screenshotMissing = {
    ...common,
    requiredOriginal: "BRIDGE_PILE_FOUNDATIONS_BEFORE_SCREENSHOT.png",
    status: "SOURCE_EVIDENCE_MISSING",
    reasonRu: "Оригинальный файл screenshot с идентификатором из ТЗ не присутствует в workspace или Downloads; specification и реконструкция не выдаются за original before evidence.",
  };
  const parameterEvidence = {
    ...common,
    currentPassport: {
      localizedNameRu: passport.localizedNameRu,
      parameterCount: parameters.length,
      parameters,
    },
    reconstructedRuntime: {
      inputParameters: estimate.input_parameters,
      missingDesignInputs: estimate.missing_design_inputs,
      assumptions: estimate.assumptions,
      queryQuantitySpan: { text: "10 штук", value: 10, unit: "шт.", sourceKind: "EXACT_QUERY_SPAN" },
      queryQuantityBoundToParameter: Object.values(estimate.input_parameters).includes(10),
      pileCountParameterPresent: Object.hasOwn(estimate.input_parameters, "pile_count"),
      deckAreaM2: estimate.input_parameters.deck_area_m2,
      deckAreaSource: "HIDDEN_DEFAULT_DERIVATION_FROM_LENGTH_30_WIDTH_8_5",
    },
    verdict: "RED_CROSS_WORK_PARAMETER_AND_HIDDEN_DEFAULT_LEAK",
  };
  const boqEvidence = {
    ...common,
    rowCount: rows.length,
    reconstructedRows,
    reconstructedRowsSha256: sha256(reconstructedRows),
    siblingScopeRowCount: siblingRows.length,
    siblingScopeRows: siblingRows.map((row) => ({ rowId: row.rowId, rowType: row.rowType, titleRu: row.titleRu })),
    verdict: "RED_PARENT_SIBLING_AND_GENERIC_SCOPE_LEAK",
  };
  const fingerprint = {
    ...common,
    rowCount: rows.length,
    genericStageRowCount: genericStageRows.length,
    prefixes,
    prefixTotal: Object.values(prefixes).reduce((sum, value) => sum + value, 0),
    genericStageRowsSha256: sha256(genericStageRows.map((row) => ({ rowId: row.rowId, titleRu: row.titleRu, rowType: row.rowType }))),
    rootOwners: [
      "expandedComplexWorks.schemaFor(bridges_tunnels)",
      "expandedComplexWorks.bridgeCalculator",
      "expandedComplexWorks.ensureS2BProfessionalDepth",
      "buildProfessionalWorkPassport.withExpandedFamilyScopeRows",
      "buildProfessionalWorkPassport.withComplexityAdaptivePassportRows",
    ],
    bridgeCalculatorFamilyCount: bridgeCalculatorFamilies.length,
    bridgeCalculatorFamilies,
    bridgeCalculatorTemplateCount: bridgeCalculatorTemplates.length,
    expandedFamilyScopeTemplateCount: commonOwnerRows.length,
    verdict: genericStageRows.length === 136 && rows.length === 200
      ? "GREEN_BEFORE_FINGERPRINT_MATCH_R4_4_SPEC"
      : "RED_BEFORE_FINGERPRINT_MISMATCH",
  };

  await writeJson(join(reproRoot, "BRIDGE_PILE_FOUNDATIONS_BEFORE_SCREENSHOT.SOURCE_EVIDENCE_MISSING.json"), screenshotMissing);
  await writeJson(join(reproRoot, "BRIDGE_PILE_FOUNDATIONS_BEFORE_PARAMETERS.json"), parameterEvidence);
  await writeJson(join(reproRoot, "BRIDGE_PILE_FOUNDATIONS_BEFORE_BOQ_200.json"), boqEvidence);
  await writeJson(join(reproRoot, "BRIDGE_PILE_FOUNDATIONS_GENERIC_136_FINGERPRINT.json"), fingerprint);
  await writeFile(
    join(reproRoot, "BRIDGE_PILE_FOUNDATIONS_COMMON_OWNER_AFFECTED_SET.jsonl"),
    `${commonOwnerRows.map((row) => JSON.stringify(row)).join("\n")}\n`,
    "utf8",
  );

  const command = "npx tsx scripts/estimate/p0TruthRemediationR4/buildR44BridgePileFrozenRepro.ts";
  await appendFile(join(evidenceRoot, "JOURNAL_RU.jsonl"), `${JSON.stringify({
    timestamp,
    phase: "R4.4-PHASE-1-BRIDGE-REPRO",
    status: "RED",
    what_checked_ru: "Из текущего исходного кода детерминированно реконструирован bridge_pile_foundations для запроса с 10 сваями; отдельно отмечено отсутствие оригинального screenshot/PDF/backend payload.",
    why_ru: "Подтвердить общий generator defect и не подменять пользовательское BEFORE реконструкцией.",
    command_or_action: command,
    finding_ru: `Passport содержит ${rows.length} строк, из них ${genericStageRows.length} generic stage-padding; найдено ${siblingRows.length} строк чужого scope. Запросные 10 шт. не привязаны к pile_count, зато скрыто выведена deck_area_m2=${String(estimate.input_parameters.deck_area_m2)}. bridgeCalculator разделяют ${bridgeCalculatorFamilies.length} families/${bridgeCalculatorTemplates.length} templates; expanded-family owner затрагивает ${commonOwnerRows.length} templates.`,
    affected_ids: commonOwnerRows.length,
    affected_rows: rows.length,
    affected_files: [
      "src/lib/ai/expandedComplexWorks/index.ts",
      "src/lib/ai/expandedComplexWorks/s2b/registry.ts",
      "src/lib/estimate/buildProfessionalWorkPassport.ts",
    ],
    evidence: [
      "02-repro/BRIDGE_PILE_FOUNDATIONS_BEFORE_SCREENSHOT.SOURCE_EVIDENCE_MISSING.json",
      "02-repro/BRIDGE_PILE_FOUNDATIONS_BEFORE_PARAMETERS.json",
      "02-repro/BRIDGE_PILE_FOUNDATIONS_BEFORE_BOQ_200.json",
      "02-repro/BRIDGE_PILE_FOUNDATIONS_GENERIC_136_FINGERPRINT.json",
      "02-repro/BRIDGE_PILE_FOUNDATIONS_COMMON_OWNER_AFFECTED_SET.jsonl",
    ],
    completed_ru: "R4.4 frozen source reproduction и общий owner set материализованы.",
    not_completed_ru: "Оригинальный пользовательский payload отсутствует; runtime backend revision replay, AFTER и per-ID 4503/4503 ещё не выполнены.",
    next_action_ru: "Добавить fail-first focused contracts для pile-only scope, затем разделить calculator/schema и удалить общие padding owners системно.",
    stop_reason_ru: null,
    head,
    tree,
  })}\n`, "utf8");

  process.stdout.write(`${JSON.stringify({
    status: "RED_BRIDGE_PILE_FOUNDATIONS_BEFORE_CONFIRMED",
    rowCount: rows.length,
    genericStageRows: genericStageRows.length,
    siblingScopeRows: siblingRows.length,
    deckAreaM2: estimate.input_parameters.deck_area_m2,
    queryPileCountBound: Object.hasOwn(estimate.input_parameters, "pile_count"),
    bridgeCalculatorFamilies: bridgeCalculatorFamilies.length,
    bridgeCalculatorTemplates: bridgeCalculatorTemplates.length,
    expandedFamilyScopeTemplates: commonOwnerRows.length,
  }, null, 2)}\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
