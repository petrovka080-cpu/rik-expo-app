const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config({ path: '.env.local' });

const supabaseUrl = String(process.env.EXPO_PUBLIC_SUPABASE_URL || '').trim();
const supabaseKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '').trim();

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE key in .env.local');
}

const supabase = createClient(supabaseUrl, supabaseKey);

const OUT_DIR = path.join(process.cwd(), 'docs', 'follow-up', 'f0-inventory');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function csvEscape(value) {
  const raw = value == null ? '' : String(value);
  if (/[",\n\r]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

function toCsv(rows, headers) {
  const lines = [headers.map(csvEscape).join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(','));
  }
  return lines.join('\n');
}

function normLabel(v) {
  return String(v || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function expectedUomTokens(basisKey) {
  const key = String(basisKey || '').toLowerCase();
  if (key.endsWith('_m2') || key.includes('area_m2')) return ['m2', 'квм', 'м2'];
  if (key.endsWith('_m3') || key.includes('vol_m3') || key.includes('volume_m3')) return ['m3', 'куб', 'м3'];
  if (key.endsWith('_m') || key.includes('length_m') || key.includes('height_m') || key.includes('width_m') || key.includes('depth_m')) return ['m', 'метр', 'м'];
  if (key.endsWith('_kg') || key.includes('weight_kg')) return ['kg', 'кг'];
  if (key.includes('weight_ton') || key.endsWith('_ton') || key.endsWith('_t')) return ['ton', 'т', 't'];
  if (key.includes('count') || key.includes('qty') || key.endsWith('_pcs') || key.endsWith('_pc') || key.includes('pieces')) return ['pcs', 'шт', 'ед'];
  if (key.includes('hours') || key.endsWith('_hr') || key.endsWith('_h')) return ['h', 'hr', 'час'];
  return [];
}

function classifyField(row) {
  const key = String(row.basis_key || '').toLowerCase();
  const fieldType = String(row.field_kind || '').toLowerCase();

  const derived = fieldType.includes('derived') || fieldType.includes('calc') || fieldType.includes('readonly');
  const service = key.startsWith('tmp_') || key.startsWith('debug_') || key.startsWith('internal_');

  if (service) return 'service';
  if (derived) return 'derived';
  if (row.required === true) return 'core';
  return 'secondary';
}

function uniqueSorted(values) {
  return [...new Set(values.filter((x) => x != null && String(x).trim() !== '').map((x) => String(x).trim()))].sort((a, b) => a.localeCompare(b));
}

function detectFlags(row, basisSummary) {
  const flags = [];
  if (basisSummary.labelSet.size > 1) flags.push('DUPLICATE_PATTERN');
  if (basisSummary.labelSet.size > 1) flags.push('LABEL_MISMATCH');
  if (basisSummary.uomSet.size > 1) flags.push('UOM_MISMATCH');

  const key = String(row.basis_key || '').toLowerCase();
  const label = normLabel(row.label_ru || '');
  const uom = String(row.uom_code || '').toLowerCase();

  const expected = expectedUomTokens(key);
  const isAsciiLikeUom = /^[a-z0-9_./-]+$/i.test(uom);
  if (expected.length && uom && isAsciiLikeUom) {
    const ok = expected.some((token) => uom.includes(token));
    if (!ok) flags.push('UOM_MISMATCH');
  }

  if (key.includes('weight') && (label.includes('площад') || label.includes('длин') || label.includes('объем'))) {
    flags.push('POSSIBLE_WRONG_FIELD');
  }
  if ((key.includes('area') || key.includes('_m2')) && (label.includes('длин') || label.includes('вес') || label.includes('масса'))) {
    flags.push('POSSIBLE_WRONG_FIELD');
  }
  if ((key.includes('length') || key.endsWith('_m')) && (label.includes('площад') || label.includes('вес') || label.includes('масса'))) {
    flags.push('POSSIBLE_WRONG_FIELD');
  }

  if (flags.length > 0) flags.push('NEEDS_REVIEW');

  return uniqueSorted(flags).join('|') || 'OK';
}

async function fetchAllWorkTypes() {
  const { data, error } = await supabase
    .from('v_work_types_picker')
    .select('code,work_name_ru,family_code,family_short_name_ru,family_sort')
    .order('family_sort', { ascending: true })
    .order('work_name_ru', { ascending: true });

  if (error) throw error;

  return (data || []).map((r) => ({
    work_type_code: String(r.code || '').trim(),
    work_type_name_ru: String(r.work_name_ru || '').trim(),
    family_code: String(r.family_code || '').trim(),
    family_name_ru: String(r.family_short_name_ru || '').trim(),
    family_sort: r.family_sort == null ? '' : Number(r.family_sort),
    is_active: 'N/A (not provided by v_work_types_picker)',
    ui_source: 'src/components/foreman/WorkTypePicker.tsx -> v_work_types_picker',
  })).filter((r) => r.work_type_code);
}

async function fetchFieldsForWorkType(workTypeCode) {
  const viewName = (workTypeCode.startsWith('WT-DEM-') || workTypeCode === 'WT-DEMO')
    ? 'v_reno_calc_fields_ui_clean'
    : 'v_reno_calc_fields_ui';

  const { data, error } = await supabase
    .from(viewName)
    .select('work_type_code,basis_key,label_ru,hint_ru,uom_code,is_required,required,sort_order,order_index,field_type,is_active,default_value,used_in_norms')
    .eq('work_type_code', workTypeCode)
    .order('sort_order', { ascending: true })
    .order('order_index', { ascending: true });

  if (error) throw error;

  const rows = (data || []).map((r, idx) => {
    const required = r.is_required == null ? !!r.required : !!r.is_required;
    return {
      work_type_code: String(r.work_type_code || workTypeCode),
      basis_key: String(r.basis_key || '').trim(),
      label_ru: String(r.label_ru || '').trim(),
      hint_ru: String(r.hint_ru || '').trim(),
      uom_code: String(r.uom_code || '').trim(),
      required,
      sort_order: r.sort_order == null ? (r.order_index == null ? idx + 1 : Number(r.order_index)) : Number(r.sort_order),
      field_kind: String(r.field_type || '').trim(),
      formula: '',
      expression: '',
      derived_flag: false,
      manual_flag: true,
      read_only_flag: false,
      status: r.is_active == null ? 'N/A' : (r.is_active ? 'active' : 'inactive'),
      source_config_id: '',
      source_view: viewName,
      ui_source: 'src/components/foreman/useCalcFields.ts',
      used_in_norms: r.used_in_norms == null ? '' : String(r.used_in_norms),
      default_value: r.default_value == null ? '' : String(r.default_value),
    };
  }).filter((r) => r.basis_key);

  return rows;
}

function buildStructuralGroups(workTypes, fieldsMatrix) {
  const byType = new Map();
  for (const wt of workTypes) byType.set(wt.work_type_code, []);

  for (const row of fieldsMatrix) {
    if (!byType.has(row.work_type_code)) byType.set(row.work_type_code, []);
    byType.get(row.work_type_code).push(row.basis_key);
  }

  const grouped = new Map();
  for (const [workTypeCode, keys] of byType.entries()) {
    const signature = [...new Set(keys)].sort((a, b) => a.localeCompare(b)).join('|');
    if (!grouped.has(signature)) grouped.set(signature, []);
    grouped.get(signature).push(workTypeCode);
  }

  const rows = [];
  let groupIndex = 1;
  for (const [signature, types] of grouped.entries()) {
    const basisKeys = signature ? signature.split('|') : [];
    rows.push({
      group_id: `G-${String(groupIndex).padStart(3, '0')}`,
      work_type_count: types.length,
      work_type_codes: types.sort((a, b) => a.localeCompare(b)).join(' | '),
      basis_key_count: basisKeys.length,
      basis_keys: basisKeys.join(' | '),
      group_status: types.length > 1 ? 'SHARED_TEMPLATE' : 'UNIQUE_TEMPLATE',
    });
    groupIndex += 1;
  }

  rows.sort((a, b) => b.work_type_count - a.work_type_count || a.group_id.localeCompare(b.group_id));
  return rows;
}

function buildCoreFieldsReport(workTypes, fieldsMatrix) {
  const byType = new Map();
  for (const wt of workTypes) byType.set(wt.work_type_code, []);
  for (const row of fieldsMatrix) {
    if (!byType.has(row.work_type_code)) byType.set(row.work_type_code, []);
    byType.get(row.work_type_code).push(row);
  }

  const rows = [];
  for (const wt of workTypes) {
    const fields = byType.get(wt.work_type_code) || [];
    const classified = fields.map((f) => ({ ...f, field_role: classifyField(f) }));
    const core = classified.filter((f) => f.field_role === 'core').map((f) => f.basis_key);
    const secondary = classified.filter((f) => f.field_role === 'secondary').map((f) => f.basis_key);
    const derived = classified.filter((f) => f.field_role === 'derived').map((f) => f.basis_key);
    const service = classified.filter((f) => f.field_role === 'service').map((f) => f.basis_key);

    rows.push({
      work_type_code: wt.work_type_code,
      work_type_name_ru: wt.work_type_name_ru,
      total_fields: fields.length,
      core_fields: uniqueSorted(core).join(' | '),
      secondary_fields: uniqueSorted(secondary).join(' | '),
      derived_fields: uniqueSorted(derived).join(' | ') || 'none-detected',
      service_fields: uniqueSorted(service).join(' | ') || 'none-detected',
      notes: fields.length === 0 ? 'NO_FIELDS_FOUND' : 'analytical split only (no logic changes)',
    });
  }

  return rows;
}

async function main() {
  ensureDir(OUT_DIR);

  const workTypes = await fetchAllWorkTypes();

  const fieldsMatrix = [];
  const noFieldsTypes = [];

  for (const wt of workTypes) {
    const rows = await fetchFieldsForWorkType(wt.work_type_code);
    if (rows.length === 0) noFieldsTypes.push(wt.work_type_code);
    fieldsMatrix.push(...rows);
  }

  const byBasis = new Map();
  for (const row of fieldsMatrix) {
    if (!byBasis.has(row.basis_key)) {
      byBasis.set(row.basis_key, {
        labelSet: new Set(),
        uomSet: new Set(),
        workTypes: new Set(),
      });
    }
    const item = byBasis.get(row.basis_key);
    item.labelSet.add(normLabel(row.label_ru));
    item.uomSet.add(String(row.uom_code || '').toLowerCase());
    item.workTypes.add(row.work_type_code);
  }

  const enrichedMatrix = fieldsMatrix.map((row) => {
    const summary = byBasis.get(row.basis_key);
    const status = detectFlags(row, summary);
    return {
      work_type_code: row.work_type_code,
      work_type_name_ru: workTypes.find((w) => w.work_type_code === row.work_type_code)?.work_type_name_ru || '',
      family_code: workTypes.find((w) => w.work_type_code === row.work_type_code)?.family_code || '',
      basis_key: row.basis_key,
      label_ru: row.label_ru,
      hint_ru: row.hint_ru,
      uom_code: row.uom_code,
      required: row.required,
      derived_flag: row.derived_flag,
      formula: row.formula,
      sort_order: row.sort_order,
      status,
      notes: row.source_view,
      field_kind: row.field_kind,
      expression: row.expression,
      read_only_flag: row.read_only_flag,
      manual_flag: row.manual_flag,
      source_config_id: row.source_config_id,
      ui_source: row.ui_source,
      default_value: row.default_value,
      used_in_norms: row.used_in_norms,
    };
  });

  const basisUsageRows = [];
  for (const [basisKey, summary] of byBasis.entries()) {
    const basisRows = enrichedMatrix.filter((r) => r.basis_key === basisKey);
    for (const r of basisRows) {
      basisUsageRows.push({
        basis_key: basisKey,
        work_type_code: r.work_type_code,
        work_type_name_ru: r.work_type_name_ru,
        family_code: r.family_code,
        label_ru: r.label_ru,
        hint_ru: r.hint_ru,
        uom_code: r.uom_code,
        required: r.required,
        sort_order: r.sort_order,
        status: r.status,
      });
    }
  }

  basisUsageRows.sort((a, b) =>
    a.basis_key.localeCompare(b.basis_key) ||
    a.work_type_code.localeCompare(b.work_type_code) ||
    a.sort_order - b.sort_order,
  );

  const mismatchRows = enrichedMatrix
    .filter((r) => r.status !== 'OK')
    .map((r) => ({
      work_type_code: r.work_type_code,
      work_type_name_ru: r.work_type_name_ru,
      family_code: r.family_code,
      basis_key: r.basis_key,
      label_ru: r.label_ru,
      uom_code: r.uom_code,
      status: r.status,
      notes: r.notes,
    }))
    .sort((a, b) => a.status.localeCompare(b.status) || a.work_type_code.localeCompare(b.work_type_code));

  const structureGroups = buildStructuralGroups(workTypes, fieldsMatrix);
  const coreFieldsReport = buildCoreFieldsReport(workTypes, fieldsMatrix);

  const workTypesPath = path.join(OUT_DIR, 'work-types.csv');
  const matrixPath = path.join(OUT_DIR, 'work-type-fields-matrix.csv');
  const basisPath = path.join(OUT_DIR, 'basis-key-usage-matrix.csv');
  const mismatchPath = path.join(OUT_DIR, 'preliminary-mismatch-report.csv');
  const groupingPath = path.join(OUT_DIR, 'work-type-structure-groups.csv');
  const corePath = path.join(OUT_DIR, 'core-secondary-derived-fields.csv');
  const jsonPath = path.join(OUT_DIR, 'inventory-package.json');
  const mdPath = path.join(OUT_DIR, 'README.md');

  const workTypeHeaders = ['work_type_code', 'work_type_name_ru', 'family_code', 'family_name_ru', 'family_sort', 'is_active', 'ui_source'];
  const matrixHeaders = [
    'work_type_code', 'work_type_name_ru', 'family_code',
    'basis_key', 'label_ru', 'hint_ru', 'uom_code', 'required', 'derived_flag',
    'formula', 'sort_order', 'status', 'notes', 'field_kind', 'expression',
    'read_only_flag', 'manual_flag', 'source_config_id', 'ui_source', 'default_value', 'used_in_norms',
  ];
  const basisHeaders = ['basis_key', 'work_type_code', 'work_type_name_ru', 'family_code', 'label_ru', 'hint_ru', 'uom_code', 'required', 'sort_order', 'status'];
  const mismatchHeaders = ['work_type_code', 'work_type_name_ru', 'family_code', 'basis_key', 'label_ru', 'uom_code', 'status', 'notes'];
  const groupingHeaders = ['group_id', 'work_type_count', 'work_type_codes', 'basis_key_count', 'basis_keys', 'group_status'];
  const coreHeaders = ['work_type_code', 'work_type_name_ru', 'total_fields', 'core_fields', 'secondary_fields', 'derived_fields', 'service_fields', 'notes'];

  fs.writeFileSync(workTypesPath, toCsv(workTypes, workTypeHeaders));
  fs.writeFileSync(matrixPath, toCsv(enrichedMatrix, matrixHeaders));
  fs.writeFileSync(basisPath, toCsv(basisUsageRows, basisHeaders));
  fs.writeFileSync(mismatchPath, toCsv(mismatchRows, mismatchHeaders));
  fs.writeFileSync(groupingPath, toCsv(structureGroups, groupingHeaders));
  fs.writeFileSync(corePath, toCsv(coreFieldsReport, coreHeaders));

  fs.writeFileSync(
    jsonPath,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        source_of_truth: {
          work_types_ui: 'src/components/foreman/WorkTypePicker.tsx -> v_work_types_picker',
          calc_fields_ui: 'src/components/foreman/useCalcFields.ts -> v_reno_calc_fields_ui / v_reno_calc_fields_ui_clean',
        },
        counts: {
          work_types: workTypes.length,
          total_fields: enrichedMatrix.length,
          basis_keys: byBasis.size,
          mismatches: mismatchRows.length,
          no_fields_types: noFieldsTypes.length,
        },
        no_fields_work_types: noFieldsTypes,
      },
      null,
      2,
    ),
  );

  const statusCounts = mismatchRows.reduce((acc, row) => {
    const parts = String(row.status || '').split('|').filter(Boolean);
    for (const p of parts) acc[p] = (acc[p] || 0) + 1;
    return acc;
  }, {});

  const md = [
    '# Phase F0 Inventory: Work Types & Estimate Fields',
    '',
    'This package is **audit-only**. No logic, formulas, basis keys, or UI behavior were changed.',
    '',
    '## Source of truth used',
    '- Work types in UI: `src/components/foreman/WorkTypePicker.tsx` -> `v_work_types_picker`',
    '- Calculator fields in UI: `src/components/foreman/useCalcFields.ts` -> `v_reno_calc_fields_ui` / `v_reno_calc_fields_ui_clean`',
    '',
    '## Inventory counts',
    `- Work types: **${workTypes.length}**`,
    `- Total field rows: **${enrichedMatrix.length}**`,
    `- Unique basis keys: **${byBasis.size}**`,
    `- Mismatch-marked rows: **${mismatchRows.length}**`,
    `- Work types with no fields in views: **${noFieldsTypes.length}**`,
    '',
    '## Deliverables',
    '- `work-types.csv` — full list of all work types',
    '- `work-type-fields-matrix.csv` — full matrix by work type and field',
    '- `basis-key-usage-matrix.csv` — grouped basis key usage slice',
    '- `preliminary-mismatch-report.csv` — suspicious rows only (no fixes)',
    '- `work-type-structure-groups.csv` — structural grouping by field signatures',
    '- `core-secondary-derived-fields.csv` — analytical split of field roles',
    '- `inventory-package.json` — metadata, counts, no-field work types',
    '',
    '## Preliminary mismatch flags used',
    '- `OK`',
    '- `DUPLICATE_PATTERN`',
    '- `LABEL_MISMATCH`',
    '- `UOM_MISMATCH`',
    '- `POSSIBLE_WRONG_FIELD`',
    '- `NEEDS_REVIEW`',
    '',
    '## Mismatch flag totals (row-level, additive)',
    ...Object.keys(statusCounts).sort((a, b) => a.localeCompare(b)).map((k) => `- ${k}: **${statusCounts[k]}**`),
    '',
    '## Notes and limits',
    '- `family_name_ru` is sourced from `family_short_name_ru` in `v_work_types_picker`.',
    '- Work type active status was not exposed by `v_work_types_picker` in this dataset.',
    '- Formula/expression/config IDs were not exposed by UI views and are left blank in matrix output.',
    '- This is a factual extraction baseline for Phase F1 normalization, not a normalization step.',
    '',
    '## Proposal for next phase (F1, after review)',
    '1. Freeze mapping of `basis_key -> engineering semantic role` per work family.',
    '2. Resolve `LABEL_MISMATCH` rows where same key has conflicting labels across families.',
    '3. Resolve `UOM_MISMATCH` rows where key and unit are semantically inconsistent.',
    '4. Review `POSSIBLE_WRONG_FIELD` rows manually with domain owner before any UI changes.',
    '5. Only after approved mapping, update labels/hints in config source and run regression audit.',
    '',
  ].join('\n');

  fs.writeFileSync(mdPath, md);

  console.log(JSON.stringify({
    out_dir: OUT_DIR,
    files: [workTypesPath, matrixPath, basisPath, mismatchPath, groupingPath, corePath, jsonPath, mdPath].map((p) => path.relative(process.cwd(), p)),
    counts: {
      work_types: workTypes.length,
      field_rows: enrichedMatrix.length,
      basis_keys: byBasis.size,
      mismatches: mismatchRows.length,
      no_fields_types: noFieldsTypes.length,
    },
  }, null, 2));
}

main().catch((e) => {
  console.error('[F0_INVENTORY_ERROR]', e?.message || e);
  process.exit(1);
});

