import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  buildProfessionalWorkPassport,
  clearProfessionalWorkPassportBuildCaches,
  listProfessionalWorkPassportTemplateIds,
} from "../../../src/lib/estimate/buildProfessionalWorkPassport";

const SPEC_SHA256 = "b86e460d194c98f56546bdcc50704a38fba6fc74c4de3d661d2e1221d6d2e76e";
const EXPECTED_CATALOG_TOTAL = 11_610;
const PHASE = process.env.R57_AUDIT_PHASE === "after" ? "after" : "before";
const EVIDENCE_ROOT = path.resolve(
  `.release-runtime/p0-one-monolith-r57/evidence/${PHASE === "before" ? "02-data-before" : "06-global-corpus"}/professional-completeness`,
);

type CensusRow = {
  catalog_id: string;
  work_key: string | null;
  family_id: string | null;
  category: string | null;
  template_kind: string | null;
  passport_present: boolean;
  total_boq_rows: number;
  discovered_applicable_rows_without_forbidden_fillers: number;
  forbidden_quota_filler_rows: number;
  synthetic_scope_driver_rows: number;
  row_types_without_forbidden_fillers: string[];
  visible_mojibake_tokens: number;
  demolition_partition_foreign_gkl_installation_rows: string[];
  forbidden_row_sample: string[];
  blockers: string[];
};

function git(...args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function writeJson(name: string, value: unknown): string {
  mkdirSync(EVIDENCE_ROOT, { recursive: true });
  const target = path.join(EVIDENCE_ROOT, name);
  writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return target;
}

function writeJsonl(name: string, rows: readonly unknown[]): string {
  mkdirSync(EVIDENCE_ROOT, { recursive: true });
  const target = path.join(EVIDENCE_ROOT, name);
  writeFileSync(target, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
  return target;
}

function isQuotaFiller(row: { rowId: string; formulaId: string; calculationTraceTemplate: string }): boolean {
  return row.rowId.includes("_complexity_wbs_") ||
    row.formulaId.includes(":complexity_wbs:") ||
    /scope_driver=.*:(?:обследование|обмеры|организация|подготовка|основные материалы|вспомогательные материалы|узлы примыканий|крепления|основная операция|операционная сборка|проверка геометрии|промежуточный контроль|испытания|оборудование|мобилизация|логистика|отходы|фиксация|сдача|резерв)/i.test(
      row.calculationTraceTemplate,
    );
}

function isSyntheticScopeDriver(row: { rowId: string; formulaId: string; calculationTraceTemplate: string }): boolean {
  return row.rowId.includes("_scope_driver_") ||
    row.formulaId.includes(":scope_driver_") ||
    /(?:^|;)scopeDriver=/.test(row.calculationTraceTemplate);
}

function isVisibleMojibake(value: string): boolean {
  return /(?:Р[ЂЃ‚ѓ„…†‡€‰Љ‹ЊЌЋЏђ‘’“”•–—™љ›њќћџЎўЈ¤Ґ¦§Ё©Є«¬®Ї°±Ііґµ¶·ё№є»јЅѕї]|С[ЂЃ‚ѓ„…†‡€‰Љ‹ЊЌЋЏђ‘’“”•–—™љ›њќћџЎўЈ¤Ґ¦§Ё©Є«¬®Ї°±Ііґµ¶·ё№є»јЅѕї]|Ð|Ñ|Â|Ã)/.test(value);
}

function main(): void {
  const head = git("rev-parse", "HEAD");
  const tree = git("rev-parse", "HEAD^{tree}");
  execFileSync("git", ["merge-base", "--is-ancestor", "691acb78", head]);
  const templateIds = listProfessionalWorkPassportTemplateIds();
  if (templateIds.length !== EXPECTED_CATALOG_TOTAL) {
    throw new Error(`R57_CATALOG_DENOMINATOR_DRIFT:${templateIds.length}/${EXPECTED_CATALOG_TOTAL}`);
  }
  if (new Set(templateIds).size !== EXPECTED_CATALOG_TOTAL) {
    throw new Error("R57_CATALOG_TEMPLATE_ID_DUPLICATE");
  }

  const startedAt = Date.now();
  const rows: CensusRow[] = templateIds.map((templateId, index): CensusRow => {
    const passport = buildProfessionalWorkPassport(templateId);
    if (!passport) {
      return {
        catalog_id: templateId,
        work_key: null,
        family_id: null,
        category: null,
        template_kind: null,
        passport_present: false,
        total_boq_rows: 0,
        discovered_applicable_rows_without_forbidden_fillers: 0,
        forbidden_quota_filler_rows: 0,
        synthetic_scope_driver_rows: 0,
        row_types_without_forbidden_fillers: [],
        visible_mojibake_tokens: 0,
        demolition_partition_foreign_gkl_installation_rows: [],
        forbidden_row_sample: [],
        blockers: ["professional_passport_missing"],
      };
    }
    const recipeRows = passport.boqRecipe.allRows;
    const quotaRows = recipeRows.filter(isQuotaFiller);
    const scopeRows = recipeRows.filter(isSyntheticScopeDriver);
    const forbiddenIds = new Set([...quotaRows, ...scopeRows].map((row) => row.rowId));
    const applicableRows = recipeRows.filter((row) => !forbiddenIds.has(row.rowId));
    const rowTypes = [...new Set(applicableRows.map((row) => row.rowType))].sort();
    const visibleText = [
      passport.localizedNameRu,
      ...passport.aliases,
      ...recipeRows.map((row) => row.titleRu),
    ];
    const demolitionPartition = passport.workKey === "demolition_interior_partition_remove_standard";
    const foreignGklInstallationRows = demolitionPartition
      ? applicableRows.filter((row) =>
        /(?:гкл|гипсокартон|drywall|gypsum)/i.test(`${row.titleRu} ${row.quantityFormula}`) &&
        /(?:монтаж|установ|обшив|каркас|install|mount|cladding|frame)/i.test(`${row.titleRu} ${row.quantityFormula}`)
      )
      : [];
    const blockers = [
      quotaRows.length > 0 ? `forbidden_quota_filler_rows:${quotaRows.length}` : "",
      scopeRows.length > 0 ? `synthetic_scope_driver_rows:${scopeRows.length}` : "",
      applicableRows.length === 0 ? "applicable_boq_empty" : "",
      new Set(recipeRows.map((row) => row.rowId)).size !== recipeRows.length ? "duplicate_row_id" : "",
      foreignGklInstallationRows.length > 0
        ? `demolition_partition_foreign_gkl_installation:${foreignGklInstallationRows.length}`
        : "",
    ].filter(Boolean);
    const result = {
      catalog_id: templateId,
      work_key: passport.workKey,
      family_id: passport.familyId,
      category: passport.category,
      template_kind: passport.templateKind,
      passport_present: true,
      total_boq_rows: recipeRows.length,
      discovered_applicable_rows_without_forbidden_fillers: applicableRows.length,
      forbidden_quota_filler_rows: quotaRows.length,
      synthetic_scope_driver_rows: scopeRows.length,
      row_types_without_forbidden_fillers: rowTypes,
      visible_mojibake_tokens: visibleText.filter(isVisibleMojibake).length,
      demolition_partition_foreign_gkl_installation_rows: foreignGklInstallationRows.map((row) => row.rowId),
      forbidden_row_sample: [...forbiddenIds].slice(0, 12),
      blockers,
    };
    if (index > 0 && index % 100 === 0) clearProfessionalWorkPassportBuildCaches();
    return result;
  });
  clearProfessionalWorkPassportBuildCaches();

  const numericRows = rows.filter((row) => row.passport_present);
  const totals = numericRows.reduce((acc, row) => ({
    boqRows: acc.boqRows + row.total_boq_rows,
    applicableRowsWithoutForbiddenFillers:
      acc.applicableRowsWithoutForbiddenFillers + row.discovered_applicable_rows_without_forbidden_fillers,
    forbiddenQuotaFillerRows: acc.forbiddenQuotaFillerRows + row.forbidden_quota_filler_rows,
    syntheticScopeDriverRows: acc.syntheticScopeDriverRows + row.synthetic_scope_driver_rows,
    visibleMojibakeTokens: acc.visibleMojibakeTokens + row.visible_mojibake_tokens,
    demolitionPartitionForeignGklInstallationRows:
      acc.demolitionPartitionForeignGklInstallationRows + row.demolition_partition_foreign_gkl_installation_rows.length,
  }), {
    boqRows: 0,
    applicableRowsWithoutForbiddenFillers: 0,
    forbiddenQuotaFillerRows: 0,
    syntheticScopeDriverRows: 0,
    visibleMojibakeTokens: 0,
    demolitionPartitionForeignGklInstallationRows: 0,
  });
  const blockedWorks = rows.filter((row) => row.blockers.length > 0);
  const ledgerCanonical = rows.map((row) => JSON.stringify(row)).join("\n");
  const summary = {
    schema_version: "p0-one-monolith-r57-forbidden-quota-scope-filler-census.v1",
    phase: PHASE,
    captured_at: new Date().toISOString(),
    elapsed_ms: Date.now() - startedAt,
    spec_sha256: SPEC_SHA256,
    head,
    tree,
    catalog_total: templateIds.length,
    passport_present: numericRows.length,
    blocked_works: blockedWorks.length,
    totals,
    row_count_quota_rule_enabled: totals.forbiddenQuotaFillerRows > 0,
    stage_resource_cartesian_filler_present: totals.forbiddenQuotaFillerRows > 0,
    synthetic_scope_factor_rows_present: totals.syntheticScopeDriverRows > 0,
    demolition_partition_gkl_scope_gate:
      totals.demolitionPartitionForeignGklInstallationRows === 0 ? "GREEN" : "RED",
    ledger_sha256: sha256(ledgerCanonical),
    status: blockedWorks.length === 0
      ? "GREEN_R57_NO_QUOTA_OR_SYNTHETIC_SCOPE_FILLER"
      : "RED_R57_FORBIDDEN_QUOTA_OR_SYNTHETIC_SCOPE_FILLER",
  };
  const ledgerPath = writeJsonl(
    `R57_${PHASE.toUpperCase()}_PROFESSIONAL_COMPLETENESS_CENSUS_11610.jsonl`,
    rows,
  );
  const summaryPath = writeJson(
    `R57_${PHASE.toUpperCase()}_FORBIDDEN_QUOTA_SCOPE_FILLER_SUMMARY.json`,
    summary,
  );
  process.stdout.write(`${JSON.stringify({ ...summary, ledger_path: ledgerPath, summary_path: summaryPath }, null, 2)}\n`);
}

main();
