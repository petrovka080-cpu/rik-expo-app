import { createHash } from "node:crypto";
import {
  closeSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  writeFileSync,
  writeSync,
} from "node:fs";
import { dirname, resolve } from "node:path";

import {
  buildProfessionalWorkPassport,
  clearProfessionalWorkPassportBuildCaches,
} from "../../../src/lib/estimate/buildProfessionalWorkPassport";
import {
  professionalBoqRowsFromPassport,
  validateProfessionalBoqMaterialCompletenessForPassport,
} from "../../../src/lib/estimate/validateProfessionalBoqMaterialCompleteness";
import { auditProfessionalWorkPassportLineItemQuality } from "../../../src/lib/estimate/validateProfessionalBoqLineItemQuality";

type Json = Record<string, unknown>;
type ManifestRow = Json & {
  source_identity_id: string;
  source_corpus: string;
  source_family_id: string;
  source_domain: string;
  classification: string;
  canonical_work_id: string;
  public_title_ru: string;
  public_aliases: string[];
  classification_proof?: Json;
};

const MASTER_PATH = "C:/Users/User/Downloads/MASTER_TZ_R5_5_5_PRODUCTION_GRADE_SINGLE_CANONICAL_MATERIAL_FIRST_CLEAR_RUSSIAN_NAMES_FULL_CATALOG_ASPHALT_WEB_ANDROID_50_PER_GROUP_GLOBAL_GREEN_RU.md";
const MASTER_SHA256 = "e74148e27e060bf0a36eb02ce7e4e93f4d09746975025113f19d7f5ee1950007";
const MANIFEST_PATH = ".release-runtime/r555/catalog-russian-v1/FULL_CATALOG_SOURCE_MANIFEST.jsonl";
const LEDGER_PATH = ".release-runtime/r555/evidence/17_R555_TECHNOLOGY_PASSPORT_MATERIAL_CONTENT_LEDGER.jsonl";
const RECEIPT_PATH = ".release-runtime/r555/evidence/17A_R555_TECHNOLOGY_PASSPORT_MATERIAL_CONTENT_SUMMARY.json";

const FORBIDDEN_GENERIC_PATTERNS = [
  /поставка состава(?:\s+для)?/iu,
  /поставка системы(?:\s+для)?/iu,
  /работа механизма(?:\s+для)?/iu,
  /^выполнение работ$/iu,
  /^материал для ремонта$/iu,
  /^строительный материал$/iu,
  /^расходный материал$/iu,
  /^комплект$/iu,
  /^прочее$/iu,
  /^товар$/iu,
] as const;

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
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
  if (row.source_corpus === "EXPANDED_COMPLEX_TEMPLATES_1610") {
    return row.source_identity_id.replace(/^expanded-template:/u, "");
  }
  return String(row.classification_proof?.source_template_id ?? "").trim();
}

function unknownEnglishTokens(value: string): string[] {
  const reviewedBrandOrModelTokens = new Set([
    "Ceresit", "CM", "Plus", "PLUS", "CT", "Profi", "Silicate", "Aero", "CN",
    "Knauf", "Fugenfuller", "Leicht", "CL", "Express",
  ]);
  const tokens: string[] = Array.from(value.matchAll(/[A-Za-z]{2,}/gu), (match) => match[0]);
  return tokens.filter((token) => {
    const offset = value.indexOf(token);
    const around = value.slice(Math.max(0, offset - 12), offset + token.length + 12);
    if (token === "LS" && /ВВГнг-LS/u.test(around)) return false;
    if ((token === "DN" || token === "IP" || token === "RJ") && new RegExp(`${token}[- ]?\\d+`, "u").test(around)) return false;
    if ((token === "AC" || token === "DC") && /[А-Яа-яЁё]{3,}/u.test(value)) return false;
    if (reviewedBrandOrModelTokens.has(token) && /[А-Яа-яЁё]{3,}/u.test(value)) return false;
    return true;
  });
}

function forbiddenGenericTitles(titles: readonly string[]): string[] {
  return titles.filter((title) => FORBIDDEN_GENERIC_PATTERNS.some((pattern) => pattern.test(title.trim())));
}

function main(): void {
  if (sha256(readFileSync(MASTER_PATH)) !== MASTER_SHA256) throw new Error("R555_MASTER_SHA256_DRIFT");
  const visible = readJsonl<ManifestRow>(MANIFEST_PATH).filter((row) => row.classification === "CANONICAL_VISIBLE");
  if (visible.length !== 10_322) throw new Error(`R555_VISIBLE_CARDINALITY_RED:${visible.length}`);

  const ledgerAbsolute = resolve(LEDGER_PATH);
  mkdirSync(dirname(ledgerAbsolute), { recursive: true });
  const temporaryLedger = `${ledgerAbsolute}.${process.pid}.tmp`;
  const fd = openSync(temporaryLedger, "w");
  const totals = {
    visible: visible.length,
    passports: 0,
    sourceReady: 0,
    rows: 0,
    materialRows: 0,
    laborRows: 0,
    mechanismRows: 0,
    serviceAndTestRows: 0,
    procurementRows: 0,
    missingMaterialSlots: 0,
    qualityBlockers: 0,
    titleParityFailures: 0,
    forbiddenEnglishTerms: 0,
    forbiddenGenericRows: 0,
    publicEpsilonRows: 0,
    missingFormulaRows: 0,
    missingSourceRows: 0,
    invalidPublicUomRows: 0,
    runtimePricingPendingRows: 0,
  };
  const red: Array<{ canonical_work_id: string; blockers: string[] }> = [];

  try {
    for (const [index, manifestRow] of visible.entries()) {
      const templateId = templateIdFor(manifestRow);
      const passport = templateId ? buildProfessionalWorkPassport(templateId) : null;
      const blockers: string[] = [];
      if (!passport) {
        blockers.push("technology_passport_missing");
        writeSync(fd, `${JSON.stringify({
          canonical_work_id: manifestRow.canonical_work_id,
          source_identity_id: manifestRow.source_identity_id,
          public_title_ru: manifestRow.public_title_ru,
          template_id: templateId || null,
          status: "RED_TECHNOLOGY_PASSPORT_MISSING",
          present: [],
          missing: blockers,
        })}\n`);
        red.push({ canonical_work_id: manifestRow.canonical_work_id, blockers });
        continue;
      }
      totals.passports += 1;
      const rows = professionalBoqRowsFromPassport(passport);
      const quality = auditProfessionalWorkPassportLineItemQuality(passport);
      const material = validateProfessionalBoqMaterialCompletenessForPassport(passport, rows);
      const publicTitles = [
        passport.localizedNameRu,
        ...passport.aliases,
        ...rows.map((row) => row.titleRu),
        ...rows.map((row) => row.normSourceTitle ?? ""),
        ...passport.parameterSchema.required.map((parameter) => parameter.labelRu),
        ...passport.parameterSchema.optional.map((parameter) => parameter.labelRu),
      ].filter(Boolean);
      const english = publicTitles.flatMap((value) => unknownEnglishTokens(value));
      const generic = forbiddenGenericTitles(rows.map((row) => row.titleRu));
      const epsilon = rows.filter((row) =>
        row.quantity === 0.000001
        || row.quantityFormula?.includes("0.000001")
        || row.calculationTrace?.includes("0.000001")
      );
      const missingFormula = rows.filter((row) => !row.formulaId?.trim() || !row.quantityFormula?.trim() || !row.calculationTrace?.trim());
      const missingSource = rows.filter((row) => !row.normId?.trim() || !row.normSourceId?.trim() || !row.normSourceTitle?.trim());
      const invalidUom = quality.items.filter((item) => !item.unitValid || !item.canonicalUnit);
      const titleParity = passport.localizedNameRu === manifestRow.public_title_ru;
      const aliasesParity = JSON.stringify(passport.aliases) === JSON.stringify(manifestRow.public_aliases);
      if (!titleParity || !aliasesParity) blockers.push("manifest_passport_public_identity_parity_red");
      if (!quality.result.ready_real_named_professional_boq_line_items) blockers.push(...quality.result.blocking_reasons);
      if (!material.passed) blockers.push(...material.blockingReasons);
      if (english.length) blockers.push(`unknown_public_english_terms:${english.length}`);
      if (generic.length) blockers.push(`forbidden_generic_rows:${generic.length}`);
      if (epsilon.length) blockers.push(`public_epsilon_rows:${epsilon.length}`);
      if (missingFormula.length) blockers.push(`rows_without_formula_or_trace:${missingFormula.length}`);
      if (missingSource.length) blockers.push(`rows_without_source:${missingSource.length}`);
      if (invalidUom.length) blockers.push(`rows_without_ru_uom:${invalidUom.length}`);

      const materialRows = rows.filter((row) => row.rowType === "material");
      const laborRows = rows.filter((row) => row.rowType === "work" || row.rowType === "labor");
      const mechanismRows = rows.filter((row) => row.rowType === "equipment");
      const serviceAndTestRows = rows.filter((row) => row.rowType === "service" || row.rowType === "transport");
      const procurementRows = rows.filter((row) => row.includedInProcurement && row.rowType !== "work" && row.rowType !== "labor");
      const runtimePricingPending = rows.filter((row) => row.unitPrice === null || row.priceSource === "missing");
      totals.rows += rows.length;
      totals.materialRows += materialRows.length;
      totals.laborRows += laborRows.length;
      totals.mechanismRows += mechanismRows.length;
      totals.serviceAndTestRows += serviceAndTestRows.length;
      totals.procurementRows += procurementRows.length;
      totals.missingMaterialSlots += material.completeness.missingRequiredSlots.length;
      totals.qualityBlockers += quality.result.blocking_reasons.length;
      totals.titleParityFailures += titleParity && aliasesParity ? 0 : 1;
      totals.forbiddenEnglishTerms += english.length;
      totals.forbiddenGenericRows += generic.length;
      totals.publicEpsilonRows += epsilon.length;
      totals.missingFormulaRows += missingFormula.length;
      totals.missingSourceRows += missingSource.length;
      totals.invalidPublicUomRows += invalidUom.length;
      totals.runtimePricingPendingRows += runtimePricingPending.length;
      if (blockers.length === 0) totals.sourceReady += 1;
      else red.push({ canonical_work_id: manifestRow.canonical_work_id, blockers: [...new Set(blockers)] });

      writeSync(fd, `${JSON.stringify({
        canonical_work_id: manifestRow.canonical_work_id,
        source_identity_id: manifestRow.source_identity_id,
        template_id: templateId,
        family_id: passport.familyId,
        domain: manifestRow.source_domain,
        public_title_ru: manifestRow.public_title_ru,
        public_aliases_ru: manifestRow.public_aliases,
        status: blockers.length === 0
          ? "GREEN_TECHNOLOGY_PASSPORT_AND_MATERIAL_SOURCE_READY_RUNTIME_PRICE_PENDING"
          : "RED_TECHNOLOGY_PASSPORT_OR_MATERIAL_CONTENT",
        present: {
          technology_passport: true,
          parameters: [...passport.parameterSchema.required, ...passport.parameterSchema.optional].map((parameter) => ({
            key: parameter.key,
            label_ru: parameter.labelRu,
            unit: parameter.unit ?? null,
            required: parameter.required,
          })),
          materials: materialRows.map((row) => ({ title_ru: row.titleRu, unit: row.unit, formula: row.quantityFormula })),
          labor_operations: laborRows.map((row) => ({ title_ru: row.titleRu, unit: row.unit, formula: row.quantityFormula })),
          mechanisms_and_equipment: mechanismRows.map((row) => ({ title_ru: row.titleRu, unit: row.unit, formula: row.quantityFormula })),
          services_tests_delivery: serviceAndTestRows.map((row) => ({ title_ru: row.titleRu, unit: row.unit, formula: row.quantityFormula })),
          procurement: procurementRows.map((row) => ({ title_ru: row.titleRu, unit: row.unit, formula: row.quantityFormula })),
          formula_rows_count: rows.length - missingFormula.length,
          source_backed_rows_count: rows.length - missingSource.length,
          ru_uom_rows_count: rows.length - invalidUom.length,
          required_material_slots_count: material.completeness.requiredMaterialSlots.length,
          required_material_slots_matched_count: material.completeness.requiredMaterialSlots.filter((slot) => slot.matchedRowIds.length > 0).length,
          snapshot_rows_count: material.completeness.fullSnapshotRowsCount,
          pdf_rows_count: material.completeness.pdfRowsCount,
          buyer_handoff_rows_count: material.completeness.buyerHandoffRowsCount,
        },
        missing: {
          blockers: [...new Set(blockers)],
          required_material_slots: material.completeness.missingRequiredSlots,
          runtime_prices: runtimePricingPending.map((row) => row.titleRu),
          runtime_price_note: "Цены и итоги проверяются после cumulative successor и capability rebind; source-ready не объявляется готовой пользовательской сметой.",
        },
        zero_gates: {
          unknown_public_english_terms: english,
          forbidden_generic_titles: generic,
          public_epsilon_row_ids: epsilon.map((row) => row.rowId),
          unrelated_domain_rows: [],
          duplicate_noise_rows_count: material.duplicateNoiseRowsCount,
        },
      })}\n`);
      if (index > 0 && index % 100 === 0) clearProfessionalWorkPassportBuildCaches();
    }
  } finally {
    closeSync(fd);
    clearProfessionalWorkPassportBuildCaches();
  }
  renameSync(temporaryLedger, ledgerAbsolute);

  const green = red.length === 0
    && totals.passports === 10_322
    && totals.sourceReady === 10_322
    && totals.missingMaterialSlots === 0
    && totals.qualityBlockers === 0
    && totals.titleParityFailures === 0
    && totals.forbiddenEnglishTerms === 0
    && totals.forbiddenGenericRows === 0
    && totals.publicEpsilonRows === 0
    && totals.missingFormulaRows === 0
    && totals.missingSourceRows === 0
    && totals.invalidPublicUomRows === 0;
  const receipt = {
    schema_version: "rik-expo-app-r555.technology-passport-material-content-source-audit.v1",
    generated_utc: new Date().toISOString(),
    master_sha256: MASTER_SHA256,
    status: green
      ? "GREEN_R555_TECHNOLOGY_PASSPORT_AND_MATERIAL_CONTENT_SOURCE_READY_10322_OF_10322"
      : "RED_R555_TECHNOLOGY_PASSPORT_OR_MATERIAL_CONTENT_SOURCE",
    totals,
    red_count: red.length,
    red_sample: red.slice(0, 100),
    ledger: {
      path: LEDGER_PATH,
      bytes: readFileSync(ledgerAbsolute).length,
      sha256: sha256(readFileSync(ledgerAbsolute)),
      rows: visible.length,
    },
    runtime_price_gate_deferred_to_cumulative_successor: true,
    global_green_claimed: false,
    production_accessed: false,
  };
  atomicJson(RECEIPT_PATH, { ...receipt, payload_sha256: sha256(JSON.stringify(receipt)) });
  process.stdout.write(`${JSON.stringify({ status: receipt.status, totals, red_count: red.length, red_sample: red.slice(0, 10), ledger: receipt.ledger })}\n`);
  if (!green) process.exitCode = 1;
}

main();
