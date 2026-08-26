import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";

import iconv from "iconv-lite";

type Json = Record<string, any>;

const CONTRACT = "real-useful-estimates-batch001-008-r1.before-readable-and-corpus-audit.v1";
const MASTER_SHA256 = "1781cb869ae7996c5b7bbbddbeb76cca5de29b521d86d20d22c2e5ecf32d7510";
const SUPPLEMENT_SHA256 = "75a562c007e5e2eba1d21c3615ee3673deb16a1bbf8db8a12964006bef2c3258";
const ROOT = resolve(".release-runtime/real-useful-estimates-batch001-008-r1/evidence");
const BEFORE = resolve(ROOT, "before");
const SELECTION = resolve(BEFORE, "BEFORE_50_SELECTION_MANIFEST.json");
const BINDINGS = resolve(BEFORE, "BEFORE_50_REVISION_BINDING_MANIFEST.json");
const DENOMINATOR = resolve(BEFORE, "BEFORE_DENOMINATOR_RECONCILIATION.json");
const RUNTIME_ROOT = resolve(BEFORE, "runtime-snapshots");
const BRIDGE_ROOT = resolve(BEFORE, "accepted-composition-bridge");
const SOURCE_FACTS = resolve(".release-runtime/real-professional-estimates-r2/evidence/02-static-audit/batch001_008_content_audit_facts.jsonl");
const SOURCE_AUDIT = resolve(".release-runtime/real-professional-estimates-r3/evidence/02-authoritative-audit/batch001_008_content_audit.jsonl");
const STATE = resolve(ROOT, "00_EXECUTION_STATE.json");
const OUTPUT_02 = resolve(ROOT, "02_BEFORE_50_REAL_COMPOSITIONS.md");
const OUTPUT_03 = resolve(ROOT, "03_BEFORE_50_REAL_COMPOSITIONS.json");
const OUTPUT_04 = resolve(ROOT, "04_CORPUS_CONTENT_AUDIT_BEFORE.json");
const OUTPUT_05 = resolve(ROOT, "05_ROOT_CAUSE_MATRIX.md");
const OUTPUT_06 = resolve(ROOT, "06_TECHNOLOGY_PASSPORT_COVERAGE.json");

const GENERIC_TITLE = /(?:\bсовместим|\bедин(?:ая|ый|ое|ые)\b|\bподтвержд[её]нн|по проектному ппр|для выполнения|оборудование доступа|работа механизма|комплект материалов|прочие материалы|локальн\w* конструкц|профиль усиления|^core_|_review$|_control$|_support$)/iu;
const INTERNAL_PUBLIC_TERM = /(?:\bbackend\b|\brevision\b|\brelease\b|\bbatch[-_ ]?\d*\b|\bcanonical\b|\bartifact\b|semantic owner|cost owner|formula graph|^[a-z0-9_:-]+$)/iu;
const MATERIAL = /material/iu;
const EQUIPMENT = /machine|equipment|механизм|техник/iu;
const DELIVERY = /delivery|transport|haul|logistic|достав|вывоз|перевоз/iu;
const WORK = /construction_work|labor|work|монтаж|работ/iu;

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function hashFile(path: string): string {
  return sha256(readFileSync(path));
}

function readJson(path: string): Json {
  return JSON.parse(readFileSync(path, "utf8")) as Json;
}

function atomicText(path: string, value: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, value, "utf8");
  renameSync(temporary, path);
}

function atomicJson(path: string, value: unknown): void {
  atomicText(path, `${JSON.stringify(value, null, 2)}\n`);
}

function mojibakeScore(value: string): number {
  return (value.match(/[РС][\u0400-\u04ff]/gu) ?? []).length
    + (value.match(/(?:вЂ|в„|В©|РЃ|СЃ)/gu) ?? []).length * 2;
}

function readableText(value: unknown): string {
  const source = String(value ?? "");
  if (mojibakeScore(source) < 2) return source;
  const repaired = iconv.decode(iconv.encode(source, "windows-1251"), "utf8");
  return repaired.includes("�") || mojibakeScore(repaired) >= mojibakeScore(source) ? source : repaired;
}

function deepReadable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(deepReadable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Json).map(([key, child]) => [key, deepReadable(child)]));
  }
  return typeof value === "string" ? readableText(value) : value;
}

function compact(value: unknown): string {
  return readableText(typeof value === "string" ? value : JSON.stringify(deepReadable(value ?? null)));
}

function cell(value: unknown, maximum = 360): string {
  const text = compact(value).replaceAll("|", "\\|").replace(/\s+/gu, " ").trim();
  return text.length <= maximum ? text : `${text.slice(0, maximum - 1)}…`;
}

function categoryOf(row: Json, spec: Json | undefined): string {
  return `${row.category ?? ""} ${row.physical_row_type ?? row.row_type ?? spec?.category ?? ""} ${spec?.row_type ?? ""}`.trim();
}

function sourceCaseFiles(): Map<string, string> {
  const result = new Map<string, string>();
  for (const root of [RUNTIME_ROOT, BRIDGE_ROOT]) {
    for (const name of readdirSync(root)) {
      if (!name.endsWith(".json") || name.startsWith("BEFORE_")) continue;
      const path = resolve(root, name);
      const parsed = readJson(path);
      const catalogId = String(parsed.selection?.catalog_id ?? "");
      if (!catalogId) continue;
      invariant(!result.has(catalogId), `BEFORE_READABLE_DUPLICATE_CASE_SOURCE:${catalogId}`);
      result.set(catalogId, path);
    }
  }
  return result;
}

function normalizeArtifacts(source: Json, mode: string): Json {
  if (mode === "EXACT_ACCEPTED_EVIDENCE_JOIN") {
    const artifacts: Json[] = Object.entries(source.artifacts ?? {}).map(([kind, metadata]) => ({
      kind,
      ...deepReadable(metadata) as Json,
      payload_retained: false,
    }));
    return {
      items: artifacts,
      pdf_ready: artifacts.some((item) => /pdf/iu.test(String(item.kind)) && item.status === "ready"),
      procurement_ready: artifacts.some((item) => item.kind === "procurement" && item.status === "ready"),
      retention: deepReadable(source.artifact_retention),
    };
  }
  const root = (source.artifacts ?? []).map((artifact: Json) => ({
    revision_role: "ROOT_PARENT",
    ...deepReadable(artifact) as Json,
  }));
  const children = (source.child_revision_artifacts ?? []).flatMap((entry: Json) =>
    (entry.artifacts ?? []).map((artifact: Json) => ({
      revision_role: "CHILD_EXCLUDED_FROM_BEFORE_COMPOSITION",
      revision_number: entry.revision_number,
      ...deepReadable(artifact) as Json,
    })));
  const items = [...root, ...children];
  return {
    items,
    pdf_ready: items.some((item) => /pdf/iu.test(String(item.artifact_kind)) && item.status === "ready"),
    procurement_ready: items.some((item) => item.artifact_kind === "procurement" && item.status === "ready"),
    retention: {
      metadata_and_sha256_retained_in_immutable_dump: true,
      payload_file_retention_not_inferred_from_database_metadata: true,
    },
  };
}

function normalizeCase(source: Json, binding: Json, path: string): Json {
  const bridge = source.schema_version === "real-useful-estimates-batch001-008-r1.accepted-composition-bridge.v1";
  const isolated = Number(source.selection?.ordinal) === 36;
  const mode = bridge
    ? "EXACT_ACCEPTED_EVIDENCE_JOIN"
    : isolated ? "ISOLATED_PREPARED_READ_ONLY_DATABASE" : "RESTORED_IMMUTABLE_DATABASE_DUMP";
  const sourceKind = bridge
    ? "ACCEPTED_COMPOSITION_BRIDGE"
    : isolated ? "RECONSTRUCTED_ISOLATED_RUNTIME" : "HISTORICAL_EXACT_RUNTIME";
  const sourceLimitations = bridge
    ? [
      "ACCEPTED_EVIDENCE_JOIN_NOT_RESTORED_AS_A_BACKEND_DATABASE_REVISION_IN_THIS_AUDIT",
      "PHYSICAL_ARTIFACT_PAYLOAD_NOT_CLAIMED_WHEN_ONLY_METADATA_AND_SHA256_ARE_RETAINED",
    ]
    : isolated
      ? [
        "FRESH_ISOLATED_PREPARED_RUNTIME_NOT_THE_HISTORICAL_REVISION_IDENTITY",
        "HISTORICAL_AND_RECONSTRUCTED_CHECKSUMS_REMAIN_SEPARATE",
      ]
      : [
        "EXACT_REVISION_AND_RUNTIME_ROWS_RESTORED_FROM_IMMUTABLE_DATABASE_DUMP",
        "PHYSICAL_ARTIFACT_PAYLOAD_NOT_INFERRED_FROM_DATABASE_METADATA",
      ];
  const composition = bridge ? source.composition : source;
  const rows = (composition.runtime_rows ?? []) as Json[];
  const specs = (composition.resource_specs ?? []) as Json[];
  const specsById = new Map<string, Json>();
  for (const spec of specs) {
    specsById.set(String(spec.id ?? spec.row_id), spec);
    specsById.set(String(spec.row_id), spec);
  }
  const formulas = (composition.formulas ?? []) as Json[];
  const formulaById = new Map(formulas.map((formula) => [String(formula.formula_id), formula]));
  const normalizedRows = rows.map((row) => {
    const spec = specsById.get(String(row.resource_spec_id ?? row.row_id));
    const formulaId = String(row.formula_id ?? row.calculation_trace?.formulaId ?? spec?.formula_id ?? "");
    const formula = formulaById.get(formulaId);
    return {
      ordinal: row.ordinal,
      row_id: row.row_id,
      section: readableText(row.section),
      category: readableText(row.category),
      physical_row_type: row.physical_row_type ?? row.row_type ?? spec?.row_type ?? null,
      title_ru: readableText(row.title_ru),
      quantity: row.quantity,
      unit_id: row.unit_id,
      unit_price: row.unit_price ?? null,
      amount: row.amount ?? null,
      currency_code: row.currency_code ?? null,
      procurement_eligible: row.procurement_eligible === true,
      included_in_estimate: row.included_in_estimate ?? true,
      included_in_procurement: row.included_in_procurement ?? row.procurement_eligible === true,
      formula_id: formulaId || null,
      formula_expression: readableText(formula?.expression_source ?? spec?.formula_expression ?? ""),
      formula_inputs: deepReadable(formula?.input_parameter_ids ?? formula?.input_values ?? spec?.formula_inputs ?? row.calculation_trace?.inputParameterIds ?? []),
      normative_trace: deepReadable(row.normative_trace ?? row.normative_source ?? spec?.normativeTrace ?? spec?.normative_source ?? []),
      semantic_owner: row.semantic_owner ?? spec?.semantic_owner ?? spec?.resource_owner ?? null,
      cost_owner_id: spec?.cost_owner_id ?? null,
      resource_graph: deepReadable(spec?.resource_graph ?? row.calculation_trace?.resourceGraph ?? null),
      source_metadata: deepReadable(spec?.source_metadata ?? spec ?? null),
      row_sha256: row.row_sha256 ?? null,
    };
  });
  const categoryCounters = {
    materials: normalizedRows.filter((row) => MATERIAL.test(categoryOf(row, undefined))).length,
    works: normalizedRows.filter((row) => WORK.test(categoryOf(row, undefined)) && !MATERIAL.test(categoryOf(row, undefined))).length,
    equipment: normalizedRows.filter((row) => EQUIPMENT.test(categoryOf(row, undefined))).length,
    delivery: normalizedRows.filter((row) => DELIVERY.test(categoryOf(row, undefined))).length,
  };
  const genericRows = normalizedRows.filter((row) => GENERIC_TITLE.test(String(row.title_ru)));
  const internalRows = normalizedRows.filter((row) => INTERNAL_PUBLIC_TERM.test(String(row.title_ru)));
  const blockers = [
    "INDEPENDENT_TECHNOLOGY_PASSPORT_R1_MISSING",
    "ANDROID_RENDERED_FULL_ROW_SET_NOT_CAPTURED_AS_MACHINE_READABLE_BEFORE_EVIDENCE",
    ...(categoryCounters.materials === 0 ? ["NO_MATERIAL_ROWS_IN_ACTUAL_BEFORE"] : []),
    ...(categoryCounters.works === 0 ? ["NO_CONSTRUCTION_WORK_ROWS_IN_ACTUAL_BEFORE"] : []),
    ...genericRows.map((row) => `GENERIC_PUBLIC_TITLE:${row.row_id}`),
    ...internalRows.map((row) => `INTERNAL_OR_NON_RUSSIAN_PUBLIC_TITLE:${row.row_id}`),
    ...((source.content_audit?.blocker_codes ?? []) as string[]),
  ];
  const uniqueBlockers = [...new Set(blockers)];
  const artifacts = normalizeArtifacts(source, mode);
  invariant(rows.length > 0, `BEFORE_READABLE_EMPTY_COMPOSITION:${source.selection?.catalog_id}`);
  invariant(binding.canonical_parent_parent_revision_id == null
    && Number(binding.canonical_parent_revision_number) === 1,
  `BEFORE_READABLE_NOT_ROOT_PARENT:${source.selection?.catalog_id}`);
  invariant(artifacts.pdf_ready && artifacts.procurement_ready,
    `BEFORE_READABLE_ARTIFACT_METADATA_MISSING:${source.selection?.catalog_id}`);
  const parameters = bridge
    ? composition.parameters
    : (composition.parameters ?? []).map((parameter: Json) => ({
      ...parameter,
      value: composition.revision?.input_parameters?.[parameter.parameter_id] ?? parameter.default_value ?? null,
    }));
  return {
    case_number: source.selection.ordinal,
    batch_id: source.selection.batch_id,
    catalog_id: source.selection.catalog_id,
    domain_id: source.selection.domain_id,
    public_title_ru: readableText(
      composition.revision?.canonical_work_title_ru
      ?? composition.definition?.passport?.professionalNameRu
      ?? composition.definition?.title_ru
      ?? source.selection.canonical_title_ru,
    ),
    source_kind: sourceKind,
    source_limitations: sourceLimitations,
    evidence_mode: mode,
    source_case: { path: path.replaceAll("\\", "/"), sha256: hashFile(path), payload_sha256: source.payload_sha256 },
    exact_identity: {
      release_id: binding.release_id,
      source_release_id: binding.source_release_id ?? source.selection.source_release_id,
      authoritative_definition_version_id: binding.authoritative_audit_definition_version_id,
      runtime_definition_version_id: binding.runtime_definition_version_id,
      definition_sha256: binding.authoritative_audit_definition_sha256,
      canonical_root_parent_revision_id: binding.canonical_parent_revision_id,
      canonical_root_parent_revision_number: binding.canonical_parent_revision_number,
      canonical_root_parent_parent_revision_id: binding.canonical_parent_parent_revision_id,
      root_selection_reason: binding.selection_reason,
      child_revisions: deepReadable(binding.child_revisions),
    },
    user_request: readableText(composition.revision?.source_request_text ?? "NOT_RETAINED_IN_ACCEPTED_BRIDGE"),
    technology_variant: deepReadable(composition.definition?.applicability ?? composition.definition?.source_metadata ?? null),
    input_values: deepReadable(composition.revision?.input_parameters ?? composition.input_values ?? {}),
    parameters: deepReadable(parameters),
    formulas: deepReadable(formulas),
    rows: normalizedRows,
    row_counts: { total: normalizedRows.length, ...categoryCounters },
    artifacts,
    android_rendered_rows: {
      status: "NOT_CAPTURED_AS_FULL_MACHINE_READABLE_ROWS_IN_BEFORE_SOURCE",
      functional_android_baseline_must_not_be_reinterpreted_as_content_green: true,
    },
    expected_required_materials: {
      status: "UNKNOWN_UNTIL_INDEPENDENT_TECHNOLOGY_PASSPORT_R1",
      values_invented: false,
    },
    defects: {
      blocker_codes: uniqueBlockers,
      generic_rows: genericRows.map((row) => row.row_id),
      internal_or_non_russian_rows: internalRows.map((row) => row.row_id),
    },
    verdicts: {
      ordinary_user: "RED",
      estimator: "RED",
      engineer: "RED",
      overall: "RED",
    },
  };
}

function parseCorpusFacts(): Json[] {
  const auditByCatalog = new Map(readFileSync(SOURCE_AUDIT, "utf8").split(/\r?\n/gu).filter(Boolean)
    .map((line) => JSON.parse(line) as Json)
    .map((audit) => [String(audit.catalogId), audit]));
  const lines = readFileSync(SOURCE_FACTS, "utf8").split(/\r?\n/gu).filter(Boolean);
  const entries: Json[] = [];
  for (const line of lines) {
    const fact = JSON.parse(line) as Json;
    const audit = auditByCatalog.get(String(fact.catalog_id));
    invariant(audit, `BEFORE_CORPUS_AUDIT_JOIN_MISSING:${fact.catalog_id}`);
    const batchId = String(audit.batchId);
    if (!/^BATCH-00[1-8]$/u.test(batchId)) continue;
    const technologyPassportPresent = fact.source_metadata?.technologyPassportR1?.contractVersion
      === "TechnologyPassportR1";
    const unknownFields = [
      "required_material_families_total",
      "required_material_families_present",
      "required_material_families_missing",
      "conditional_families_total",
      "conditional_rules_proven",
      "generic_material_names",
      "quantity_missing",
      "incompatible_variant_rows",
      "procurement_mapping_missing",
    ];
    entries.push({
      batch_id: batchId,
      catalog_id: fact.catalog_id,
      domain_id: fact.domain_id,
      definition_version_id: fact.definition_version_id,
      definition_sha256: fact.definition_sha256,
      technology_passport_present: technologyPassportPresent,
      required_material_families_total: null,
      required_material_families_present: null,
      required_material_families_missing: null,
      conditional_families_total: null,
      conditional_rules_proven: null,
      exact_material_names: Number(fact.valid_material_rows ?? 0),
      generic_material_names: null,
      exact_equipment_names: Number(fact.valid_machine_rows ?? 0),
      generic_equipment_names: Math.max(0, Number(fact.total_machine_rows ?? 0) - Number(fact.valid_machine_rows ?? 0)),
      formula_missing: Number(fact.missing_formula_rows ?? 0),
      norm_source_missing: Number(fact.missing_source_rows ?? 0),
      quantity_missing: null,
      unit_mismatch: Number(fact.raw_uom_rows ?? 0),
      duplicate_semantic_owner: (fact.duplicate_owners ?? []).length,
      duplicate_cost_owner: null,
      cross_domain_rows: (fact.cross_domain_rows ?? []).length,
      incompatible_variant_rows: null,
      procurement_mapping_missing: null,
      public_language_violations: Number(fact.generic_title_rows ?? 0) + Number(fact.english_only_rows ?? 0)
        + Number(fact.raw_uom_rows ?? 0),
      existing_runtime_metrics: {
        total_rows: Number(fact.total_rows ?? 0),
        valid_physical_rows: Number(fact.valid_physical_rows ?? 0),
        noise_rows: Number(fact.noise_rows ?? 0),
        invalid_category_rows: Number(fact.invalid_category_rows ?? 0),
        delivery_without_cargo_rows: Number(fact.delivery_without_cargo_rows ?? 0),
        delivery_without_distance_rows: Number(fact.delivery_without_distance_rows ?? 0),
        delivery_without_vehicle_rows: Number(fact.delivery_without_vehicle_rows ?? 0),
        visible_parameter_count: Number(fact.visible_parameter_count ?? 0),
        visible_unused_count: Number(fact.visible_unused_count ?? 0),
        required_default_missing_count: Number(fact.required_default_missing_count ?? 0),
      },
      audit_unknown_fields: unknownFields,
      values_invented: false,
      verdict: technologyPassportPresent ? "RED_UNRESOLVED_AUDIT_FIELDS" : "RED_TECHNOLOGY_PASSPORT_R1_MISSING",
    });
  }
  return entries.sort((left, right) => left.batch_id.localeCompare(right.batch_id)
    || left.catalog_id.localeCompare(right.catalog_id));
}

function sum(entries: readonly Json[], selector: (entry: Json) => number): number {
  return entries.reduce((total, entry) => total + selector(entry), 0);
}

function count(entries: readonly Json[], predicate: (entry: Json) => boolean): number {
  return entries.filter(predicate).length;
}

function markdownForCases(cases: readonly Json[], parents: Json): string {
  const sourceKindCounts = Object.fromEntries([...cases.reduce<Map<string, number>>((counts, item) => {
    const key = String(item.source_kind);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    return counts;
  }, new Map<string, number>())].sort(([left], [right]) => left.localeCompare(right)));
  const lines: string[] = [
    "# BEFORE: 50 реальных canonical составов с явным source_kind",
    "",
    `Контракт: \`${CONTRACT}\`  `,
    `Master SHA-256: \`${MASTER_SHA256}\`  `,
    `Selection SHA-256: \`${parents.selection_sha256}\`  `,
    `Revision bindings SHA-256: \`${parents.bindings_sha256}\`  `,
    "",
    "Это содержательный BEFORE, а не GREEN. Во всех 50 случаях выбран только root parent (`parent_revision_id = null`, revision 1); child‑ревизии и их PDF/procurement сохранены отдельно. Неизвестные обязательные material families не додумывались: без независимого TechnologyPassportR1 они помечены как UNKNOWN.",
    "",
    "## Типы источников",
    "",
    `- \`HISTORICAL_EXACT_RUNTIME\`: ${sourceKindCounts.HISTORICAL_EXACT_RUNTIME ?? 0}; exact revision и runtime rows восстановлены из immutable DB dump.`,
    `- \`ACCEPTED_COMPOSITION_BRIDGE\`: ${sourceKindCounts.ACCEPTED_COMPOSITION_BRIDGE ?? 0}; accepted evidence join, не называется восстановленной backend revision.`,
    `- \`RECONSTRUCTED_ISOLATED_RUNTIME\`: ${sourceKindCounts.RECONSTRUCTED_ISOLATED_RUNTIME ?? 0}; свежий isolated prepared runtime, не историческая revision identity.`,
    "",
    "## Сводка",
    "",
    "| Case | Batch | Работа | Строк | Материалы | Работы | Оборудование | Доставка | PDF | Закупка | Итог |",
    "|---:|---|---|---:|---:|---:|---:|---:|---|---|---|",
    ...cases.map((item) => `| ${String(item.case_number).padStart(2, "0")} | ${item.batch_id} | ${cell(item.public_title_ru, 120)} | ${item.row_counts.total} | ${item.row_counts.materials} | ${item.row_counts.works} | ${item.row_counts.equipment} | ${item.row_counts.delivery} | ${item.artifacts.pdf_ready ? "ready" : "RED"} | ${item.artifacts.procurement_ready ? "ready" : "RED"} | RED |`),
    "",
  ];
  for (const item of cases) {
    lines.push(
      `## CASE ${String(item.case_number).padStart(2, "0")}/50`,
      "",
      `Работа: ${item.public_title_ru || item.catalog_id}  `,
      `Catalog ID: \`${item.catalog_id}\`  `,
      `Batch / domain: ${item.batch_id} / ${item.domain_id}  `,
      `Source kind: \`${item.source_kind}\`  `,
      `Ограничения источника: ${cell(item.source_limitations, 600)}  `,
      `Evidence mode: \`${item.evidence_mode}\`  `,
      `Root revision: \`${item.exact_identity.canonical_root_parent_revision_id}\` (revision 1, parent null)  `,
      `Definition: \`${item.exact_identity.runtime_definition_version_id}\`  `,
      `Release: \`${item.exact_identity.release_id}\`  `,
      `Запрос пользователя: ${cell(item.user_request, 1000)}`,
      "",
      "### Параметры и допущения",
      "",
      "| Параметр | Значение | Единица | Название / guide |",
      "|---|---:|---|---|",
      ...(item.parameters as Json[]).map((parameter) => `| \`${cell(parameter.parameter_id, 120)}\` | ${cell(parameter.value, 100)} | ${cell(parameter.unit_id, 50)} | ${cell(parameter.title_ru ?? parameter.truth_metadata?.guide?.guide_short_ru ?? "", 260)} |`),
      "",
      "### Формулы",
      "",
      "| Formula ID | Выражение | Входы | Единица |",
      "|---|---|---|---|",
      ...(item.formulas as Json[]).map((formula) => `| \`${cell(formula.formula_id, 160)}\` | ${cell(formula.expression_source, 360)} | ${cell(formula.input_parameter_ids ?? formula.input_values, 260)} | ${cell(formula.output_unit_id, 60)} |`),
      "",
      "### Фактический полный состав root revision",
      "",
      "| № | Тип | Наименование | Количество | Ед. | Формула | Норма / источник | Закупка |",
      "|---:|---|---|---:|---|---|---|---|",
      ...(item.rows as Json[]).map((row) => `| ${row.ordinal} | ${cell(`${row.category}/${row.physical_row_type}`, 90)} | ${cell(row.title_ru, 260)} | ${cell(row.quantity, 80)} | ${cell(row.unit_id, 50)} | ${cell(`${row.formula_id ?? ""}: ${row.formula_expression ?? ""}`, 320)} | ${cell(row.normative_trace, 420)} | ${row.procurement_eligible ? "да" : "нет"} |`),
      "",
      "### Ожидаемые обязательные материалы",
      "",
      "UNKNOWN: независимый TechnologyPassportR1 отсутствует; инженерные значения не выдумывались.",
      "",
      "### PDF и закупка",
      "",
      ...item.artifacts.items.map((artifact: Json) => `- ${artifact.kind ?? artifact.artifact_kind}: ${artifact.status}; revision \`${artifact.revisionId ?? artifact.revision_id}\`; SHA-256 \`${artifact.sha256}\`; bytes ${artifact.byteSize ?? artifact.byte_size ?? "n/a"}; role ${artifact.revision_role ?? "ACCEPTED_CHILD"}.`),
      "",
      "### Пропущено / лишнее / абстрактное",
      "",
      ...item.defects.blocker_codes.map((code: string) => `- ${code}`),
      "",
      "Вердикт пользователя: RED  ",
      "Вердикт сметчика: RED  ",
      "Вердикт инженера: RED  ",
      "Итог: RED",
      "",
    );
  }
  lines.push(
    "## Ограничения BEFORE",
    "",
    "- Полные Android-rendered row sets не сохранены машинно-читаемо для всех 50; старый functional Android GREEN не переименован в content evidence.",
    "- Для 28 исторических R58 cases сохранены exact artifact metadata/SHA, но payload files были удалены штатным accepted cleanup; регенерация не заявлена.",
    "- Case 36 восполнен отдельной frozen read-only audit-БД и содержит физически сохранённые PDF/procurement payloads.",
    "- Release/deploy/OTA/merge/push/BATCH-009 не выполнялись.",
    "",
  );
  return `${lines.join("\n")}\n`;
}

function rootCauseMarkdown(cases: readonly Json[], corpus: readonly Json[], parents: Json): string {
  const rows: Array<[string, string, number, number, string]> = [
    ["RC-01", "Независимый TechnologyPassportR1 отсутствует", corpus.length, corpus.length, "Создать независимые per-work passports; не выводить expected состав из текущих rows"],
    ["RC-02", "Обязательные material families не определены независимым источником", corpus.length, corpus.length, "Заполнить required/conditional families из технологии, проекта, TDS и норм"],
    ["RC-03", "Non-billable/noise rows в canonical составе", count(corpus, (x) => x.existing_runtime_metrics.noise_rows > 0), sum(corpus, (x) => x.existing_runtime_metrics.noise_rows), "Удалить генераторный шум в manifests/providers/shared core"],
    ["RC-04", "Raw/internal units", count(corpus, (x) => x.unit_mismatch > 0), sum(corpus, (x) => x.unit_mismatch), "Разделить внутреннюю трудоёмкость и публичные физические единицы"],
    ["RC-05", "Invalid/noncanonical row categories", count(corpus, (x) => x.existing_runtime_metrics.invalid_category_rows > 0), sum(corpus, (x) => x.existing_runtime_metrics.invalid_category_rows), "Нормализовать material/work/equipment/delivery/service projection"],
    ["RC-06", "Generic или English-only public titles", count(corpus, (x) => x.public_language_violations > 0), sum(corpus, (x) => x.public_language_violations), "Fail-closed title/specification gate и plain-Russian projection"],
    ["RC-07", "Formula source отсутствует", count(corpus, (x) => x.formula_missing > 0), sum(corpus, (x) => x.formula_missing), "Назначить точный formula owner каждой физической строке"],
    ["RC-08", "Norm/source trace отсутствует", count(corpus, (x) => x.norm_source_missing > 0), sum(corpus, (x) => x.norm_source_missing), "Привязать норму/TDS/проектный источник с applicability"],
    ["RC-09", "Delivery без груза", count(corpus, (x) => x.existing_runtime_metrics.delivery_without_cargo_rows > 0), sum(corpus, (x) => x.existing_runtime_metrics.delivery_without_cargo_rows), "Моделировать exact cargo flow"],
    ["RC-10", "Delivery без расстояния", count(corpus, (x) => x.existing_runtime_metrics.delivery_without_distance_rows > 0), sum(corpus, (x) => x.existing_runtime_metrics.delivery_without_distance_rows), "Сделать reachable distance input/formula"],
    ["RC-11", "Delivery без vehicle identity", count(corpus, (x) => x.existing_runtime_metrics.delivery_without_vehicle_rows > 0), sum(corpus, (x) => x.existing_runtime_metrics.delivery_without_vehicle_rows), "Указать тип и грузоподъёмность транспорта"],
    ["RC-12", "Cross-domain rows", count(corpus, (x) => x.cross_domain_rows > 0), sum(corpus, (x) => x.cross_domain_rows), "Исправить domain ownership и запретить универсальную подмешанную детализацию"],
    ["RC-13", "Duplicate semantic owners", count(corpus, (x) => x.duplicate_semantic_owner > 0), sum(corpus, (x) => x.duplicate_semantic_owner), "Сделать физический semantic owner уникальным"],
    ["RC-14", "Visible parameters не влияют на результат", count(corpus, (x) => x.existing_runtime_metrics.visible_unused_count > 0), sum(corpus, (x) => x.existing_runtime_metrics.visible_unused_count), "Удалить ложные inputs или связать с formula/resource branches"],
    ["RC-15", "Required inputs без доказанного baseline/default", count(corpus, (x) => x.existing_runtime_metrics.required_default_missing_count > 0), sum(corpus, (x) => x.existing_runtime_metrics.required_default_missing_count), "Явный ввод либо accepted baseline с provenance"],
    ["RC-16", "Android full-row BEFORE projection отсутствует", cases.length, cases.length, "Сохранить как evidence gap; не запускать бессмысленный Android rerun до content fixes/freeze"],
    ["RC-17", "R58 artifact payload cleanup оставил только metadata/SHA", count(cases, (x) => x.evidence_mode === "EXACT_ACCEPTED_EVIDENCE_JOIN"), count(cases, (x) => x.evidence_mode === "EXACT_ACCEPTED_EVIDENCE_JOIN") * 2, "Не регенерировать исторические payloads; AFTER создать новые exact artifacts"],
    ["RC-18", "Action panel overlap / footer placement", 1, 1, "Перенести action panel в конец формы и проверить intersection/truncation gates"],
  ];
  return `# Root cause matrix BEFORE\n\n`
    + `Master SHA-256: \`${MASTER_SHA256}\`  \n`
    + `50-case report SHA-256: \`${parents.output_03_sha256}\`  \n`
    + `Corpus audit SHA-256: \`${parents.output_04_sha256}\`\n\n`
    + `| ID | Root cause | Затронуто definitions/cases | Строк/сигналов | Исправление в canonical source |\n`
    + `|---|---|---:|---:|---|\n`
    + rows.map(([id, title, affected, signals, repair]) => `| ${id} | ${title} | ${affected} | ${signals} | ${repair} |`).join("\n")
    + `\n\nМатрица не является AFTER или GREEN. Root causes должны исправляться в manifests/providers/shared core, а не 50 UI-костылями.\n`;
}

function main(): void {
  const selection = readJson(SELECTION);
  const bindings = readJson(BINDINGS);
  const denominator = readJson(DENOMINATOR);
  invariant(selection.master_contract?.sha256 === MASTER_SHA256, "BEFORE_READABLE_MASTER_DRIFT");
  invariant(bindings.expected_cases === 50 && bindings.bound_cases === 50
    && bindings.missing_catalog_ids.length === 0, "BEFORE_READABLE_BINDING_DENOMINATOR_RED");
  invariant(denominator.status === "GREEN_DENOMINATOR_RECONCILIATION_ONLY_CONTENT_RED_NO_RELEASE",
    "BEFORE_READABLE_CORPUS_DENOMINATOR_RED");
  const bindingByCatalog = new Map((bindings.bindings as Json[]).map((binding) => [String(binding.catalog_id), binding]));
  const files = sourceCaseFiles();
  invariant(files.size === 50, `BEFORE_READABLE_CASE_FILES:${files.size}`);
  const cases: Json[] = [];
  for (const selected of selection.selections as Json[]) {
    const path = files.get(String(selected.catalog_id));
    const binding = bindingByCatalog.get(String(selected.catalog_id));
    invariant(path && binding, `BEFORE_READABLE_CASE_BINDING_MISSING:${selected.catalog_id}`);
    const normalized = normalizeCase(readJson(path), binding, path);
    invariant(normalized.case_number === selected.ordinal, `BEFORE_READABLE_ORDINAL_DRIFT:${selected.catalog_id}`);
    cases.push(normalized);
  }
  cases.sort((left, right) => Number(left.case_number) - Number(right.case_number));
  invariant(cases.length === 50 && new Set(cases.map((item) => item.catalog_id)).size === 50,
    "BEFORE_READABLE_50_DISTINCT_RED");
  invariant(cases.every((item) => item.verdicts.overall === "RED"
    && item.exact_identity.canonical_root_parent_parent_revision_id == null
    && Number(item.exact_identity.canonical_root_parent_revision_number) === 1
    && item.artifacts.pdf_ready && item.artifacts.procurement_ready),
  "BEFORE_READABLE_CASE_INTEGRITY_RED");

  const parentEvidence = {
    selection_path: SELECTION.replaceAll("\\", "/"),
    selection_sha256: hashFile(SELECTION),
    bindings_path: BINDINGS.replaceAll("\\", "/"),
    bindings_sha256: hashFile(BINDINGS),
    denominator_path: DENOMINATOR.replaceAll("\\", "/"),
    denominator_sha256: hashFile(DENOMINATOR),
  };
  const reportPayload = {
    schema_version: CONTRACT,
    generated_at: new Date().toISOString(),
    master_sha256: MASTER_SHA256,
    supplement_sha256: SUPPLEMENT_SHA256,
    parent_evidence: parentEvidence,
    expected_cases: 50,
    actual_cases: cases.length,
    distinct_catalog_ids: new Set(cases.map((item) => item.catalog_id)).size,
    root_parent_cases: count(cases, (item) => item.exact_identity.canonical_root_parent_parent_revision_id == null
      && Number(item.exact_identity.canonical_root_parent_revision_number) === 1),
    child_revisions_preserved_separately: cases.every((item) => Array.isArray(item.exact_identity.child_revisions)),
    artifact_metadata: {
      pdf_ready_cases: count(cases, (item) => item.artifacts.pdf_ready),
      procurement_ready_cases: count(cases, (item) => item.artifacts.procurement_ready),
      accepted_cleanup_payload_missing_cases: count(cases, (item) => item.evidence_mode === "EXACT_ACCEPTED_EVIDENCE_JOIN"),
    },
    row_totals: {
      total: sum(cases, (item) => item.row_counts.total),
      materials: sum(cases, (item) => item.row_counts.materials),
      works: sum(cases, (item) => item.row_counts.works),
      equipment: sum(cases, (item) => item.row_counts.equipment),
      delivery: sum(cases, (item) => item.row_counts.delivery),
    },
    verdicts: { ordinary_user_red: 50, estimator_red: 50, engineer_red: 50, overall_red: 50 },
    cases,
    content_green_claimed: false,
    release_performed: false,
    deploy_performed: false,
    ota_performed: false,
    merge_performed: false,
    push_performed: false,
    batch009_performed: false,
    status: "GREEN_BEFORE_50_EVIDENCE_COMPLETENESS_CONTENT_RED_NO_RELEASE",
  };
  const report = { ...reportPayload, payload_sha256: sha256(JSON.stringify(reportPayload)) };
  atomicJson(OUTPUT_03, report);
  atomicText(OUTPUT_02, markdownForCases(cases, parentEvidence));

  const corpus = parseCorpusFacts();
  const expectedBatchCounts = selection.corpus.exact_batch_counts as Json;
  const actualBatchCounts = Object.fromEntries([...new Set(corpus.map((entry) => entry.batch_id))]
    .sort().map((batchId) => [batchId, count(corpus, (entry) => entry.batch_id === batchId)]));
  invariant(corpus.length === 4211 && JSON.stringify(actualBatchCounts) === JSON.stringify(expectedBatchCounts),
    `BEFORE_CORPUS_4211_DENOMINATOR_RED:${JSON.stringify(actualBatchCounts)}`);
  const corpusPayload = {
    schema_version: "real-useful-estimates-batch001-008-r1.corpus-content-audit-before.v1",
    generated_at: new Date().toISOString(),
    master_sha256: MASTER_SHA256,
    source_facts: { path: SOURCE_FACTS.replaceAll("\\", "/"), sha256: hashFile(SOURCE_FACTS) },
    source_authoritative_audit: { path: SOURCE_AUDIT.replaceAll("\\", "/"), sha256: hashFile(SOURCE_AUDIT) },
    denominator_evidence: parentEvidence,
    denominator: { expected: 4211, actual: corpus.length, unclassified: 0, batch_counts: actualBatchCounts },
    audit_policy: {
      technology_passport_contract: "TechnologyPassportR1_INDEPENDENT_EXPECTATION",
      legacy_or_generated_passports_do_not_count: true,
      unknown_expected_material_families_are_null_not_invented: true,
      existing_metrics_are_direct_from_frozen_authoritative_facts: true,
    },
    aggregates: {
      technology_passport_present: count(corpus, (entry) => entry.technology_passport_present),
      technology_passport_missing: count(corpus, (entry) => !entry.technology_passport_present),
      audit_unknown_required_family_cases: count(corpus, (entry) => entry.required_material_families_total == null),
      total_runtime_rows: sum(corpus, (entry) => entry.existing_runtime_metrics.total_rows),
      total_noise_rows: sum(corpus, (entry) => entry.existing_runtime_metrics.noise_rows),
      total_formula_missing: sum(corpus, (entry) => entry.formula_missing),
      total_norm_source_missing: sum(corpus, (entry) => entry.norm_source_missing),
      total_unit_mismatch: sum(corpus, (entry) => entry.unit_mismatch),
      total_public_language_violations: sum(corpus, (entry) => entry.public_language_violations),
      red_definitions: count(corpus, (entry) => String(entry.verdict).startsWith("RED")),
    },
    definitions: corpus,
    content_green_claimed: false,
    values_invented: false,
    status: "GREEN_CORPUS_AUDIT_COVERAGE_4211_OF_4211_CONTENT_RED_NO_RELEASE",
  };
  const corpusReport = { ...corpusPayload, payload_sha256: sha256(JSON.stringify(corpusPayload)) };
  atomicJson(OUTPUT_04, corpusReport);

  const passportPayload = {
    schema_version: "real-useful-estimates-batch001-008-r1.technology-passport-coverage-before.v1",
    generated_at: new Date().toISOString(),
    master_sha256: MASTER_SHA256,
    corpus_audit_path: OUTPUT_04.replaceAll("\\", "/"),
    corpus_audit_sha256: hashFile(OUTPUT_04),
    expected_definitions: 4211,
    audited_definitions: corpus.length,
    independent_technology_passport_present: 0,
    independent_technology_passport_missing: corpus.length,
    coverage_percent: 0,
    gaps: corpus.map((entry) => ({
      batch_id: entry.batch_id,
      catalog_id: entry.catalog_id,
      definition_version_id: entry.definition_version_id,
      definition_sha256: entry.definition_sha256,
      required_contract: "TechnologyPassportR1_INDEPENDENT_EXPECTATION",
      status: "MISSING",
    })),
    legacy_r3_functional_passport_counts_as_independent_content_proof: false,
    content_green_claimed: false,
    status: "GREEN_COVERAGE_MEASUREMENT_0_OF_4211_CONTENT_RED_NO_RELEASE",
  };
  const passportReport = { ...passportPayload, payload_sha256: sha256(JSON.stringify(passportPayload)) };
  atomicJson(OUTPUT_06, passportReport);

  atomicText(OUTPUT_05, rootCauseMarkdown(cases, corpus, {
    output_03_sha256: hashFile(OUTPUT_03),
    output_04_sha256: hashFile(OUTPUT_04),
  }));

  const state = readJson(STATE);
  state.generated_at = new Date().toISOString();
  state.current_phase = "CORPUS_WIDE_CONTENT_AUDIT_AND_TECHNOLOGY_PASSPORT_GAPS_COMPLETE";
  state.current_gate = "GROUP_ROOT_CAUSES_AND_REPAIR_CANONICAL_SOURCE_WITHOUT_POINT_UI_PATCHES";
  state.gate_status = "GREEN_EVIDENCE_COMPLETENESS_CONTENT_RED";
  state.before_50 = {
    cases: 50,
    distinct_catalog_ids: 50,
    root_parent_bindings: 50,
    child_revisions_preserved_separately: true,
    rows: report.row_totals.total,
    ordinary_user_red: 50,
    estimator_red: 50,
    engineer_red: 50,
    artifact_metadata_pdf_ready: 50,
    artifact_metadata_procurement_ready: 50,
    android_full_row_machine_readable_gap: 50,
    status: report.status,
  };
  state.corpus_content_audit_before = {
    definitions: 4211,
    unclassified: 0,
    batch_counts: actualBatchCounts,
    technology_passport_present: 0,
    technology_passport_missing: 4211,
    status: corpusReport.status,
  };
  state.required_before_outputs = [
    "01_SOURCE_IDENTITY.json",
    "02_BEFORE_50_REAL_COMPOSITIONS.md",
    "03_BEFORE_50_REAL_COMPOSITIONS.json",
    "04_CORPUS_CONTENT_AUDIT_BEFORE.json",
    "05_ROOT_CAUSE_MATRIX.md",
    "06_TECHNOLOGY_PASSPORT_COVERAGE.json",
  ].map((name) => ({
    path: resolve(ROOT, name).replaceAll("\\", "/"),
    sha256: hashFile(resolve(ROOT, name)),
  }));
  state.exact_next_action = "Repair root causes in canonical manifests/providers/shared core, beginning with independent TechnologyPassportR1 contracts and material-family truth; preserve the same 50 case identities for AFTER.";
  state.release_performed = false;
  state.deploy_performed = false;
  state.ota_performed = false;
  state.merge_performed = false;
  state.push_performed = false;
  state.batch009_performed = false;
  atomicJson(STATE, state);

  process.stdout.write(`${JSON.stringify({
    status: report.status,
    cases: cases.length,
    rows: report.row_totals,
    corpus_status: corpusReport.status,
    corpus_definitions: corpus.length,
    passport_coverage: "0/4211",
    outputs: [OUTPUT_02, OUTPUT_03, OUTPUT_04, OUTPUT_05, OUTPUT_06, STATE]
      .map((path) => ({ path: path.replaceAll("\\", "/"), bytes: readFileSync(path).length, sha256: hashFile(path) })),
  }, null, 2)}\n`);
}

main();
