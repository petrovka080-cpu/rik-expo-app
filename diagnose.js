const fs = require('fs');
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("=== DIAGNOSTICS: SMETA (RULES) vs CATALOG_ITEMS (Paginated) ===");

    const { data: workTypes, error: wtError } = await supabase.from('v_work_types_picker').select('code, work_name_ru');
    if (wtError) {
        console.error("Failed to load work types:", wtError);
        return;
    }
    console.log(`Loaded ${workTypes.length} work types.`);

    const smetaCodes = new Map();
    let successCount = 0;

    for (let i = 0; i < workTypes.length; i++) {
        const wt = workTypes[i];
        const wtCode = wt.code;
        const viewName = (wtCode.startsWith("WT-DEM-") || wtCode === "WT-DEMO")
            ? "v_reno_calc_fields_ui_clean"
            : "v_reno_calc_fields_ui";

        if (i % 30 === 0) console.log(`Processing rules: ${i}/${workTypes.length}`);

        const { data: fields, error: fError } = await supabase
            .from(viewName)
            .select('basis_key, default_value, is_required')
            .eq('work_type_code', wtCode);

        if (fError) continue;

        const payload = {};
        for (const f of (fields || [])) {
            payload[f.basis_key] = typeof f.default_value === 'number' ? f.default_value : 10;
        }

        const { data: rows, error: rError } = await supabase.rpc("rpc_calc_work_kit", {
            p_work_type_code: wtCode,
            p_inputs: payload,
        });

        if (rError) continue;

        successCount++;
        if (Array.isArray(rows)) {
            for (const r of rows) {
                if (!r.rik_code) continue;
                const code = String(r.rik_code).trim().toUpperCase();
                if (!smetaCodes.has(code)) {
                    smetaCodes.set(code, {
                        name_ru: r.item_name_ru,
                        sections: new Set(),
                        workTypes: new Set()
                    });
                }
                const entry = smetaCodes.get(code);
                if (r.section) entry.sections.add(r.section);
                entry.workTypes.add(wtCode);
            }
        }
    }

    console.log(`Successfully calculated rules for ${successCount} work types.`);
    console.log(`Gathered ${smetaCodes.size} unique rik_codes from all Smeta rules.`);

    // Paginate catalog_items
    let allCatalog = [];
    let from = 0;
    let batchSize = 1000;
    let keepFetching = true;

    while (keepFetching) {
        const { data, error } = await supabase
            .from('catalog_items')
            .select('rik_code, name_human')
            .range(from, from + batchSize - 1);

        if (error) {
            console.error("Failed to load catalog_items batch:", error.message);
            break;
        }

        if (data && data.length > 0) {
            allCatalog = allCatalog.concat(data);
            from += batchSize;
        } else {
            keepFetching = false;
        }
    }

    const catalogCodes = new Map();
    for (const c of allCatalog) {
        if (!c.rik_code) continue;
        catalogCodes.set(String(c.rik_code).trim().toUpperCase(), c.name_human || "");
    }

    console.log(`Loaded ${catalogCodes.size} items from catalog_items.`);

    const missingInCatalog = [];
    const nameMismatch = [];

    for (const [code, smetaInfo] of smetaCodes.entries()) {
        if (!catalogCodes.has(code)) {
            missingInCatalog.push({ code, smetaName: smetaInfo.name_ru, usedIn: Array.from(smetaInfo.workTypes) });
        } else {
            const catName = catalogCodes.get(code) || "";
            const sName = smetaInfo.name_ru || "";
            // Strip exact trailing spaces or slightly differ cases if needed, but strictly:
            if (sName && catName && sName.trim() !== catName.trim()) {
                nameMismatch.push({ code, smetaName: sName, catalogName: catName });
            }
        }
    }

    // Generate markdown report
    let md = `# Аудит справочников: Смета (Правила) vs Каталог (catalog_items)\n\n`;
    md += `**Итоги сканирования:**\n`;
    md += `- Всего видов работ с правилами: ${successCount}\n`;
    md += `- Всего уникальных кодов (\`rik_code\`) в правилах сметы: ${smetaCodes.size}\n`;
    md += `- Всего элементов в базе \`catalog_items\`: ${catalogCodes.size}\n`;
    md += `- Уникальных кодов в смете, **отсутствующих** в каталоге: ${missingInCatalog.length}\n`;
    md += `- Разночтений в названиях (код есть, названия разные): ${nameMismatch.length}\n\n`;

    md += `## 1. Отсутствуют в Каталоге (${missingInCatalog.length})\n\n`;
    if (missingInCatalog.length === 0) {
        md += `Все коды из правил найдены в \`catalog_items\`.\n`;
    } else {
        md += `| Код (rik_code) | Название в Смете (Правилах) | Используется в ВР |\n`;
        md += `| --- | --- | --- |\n`;
        for (const m of missingInCatalog.sort((a, b) => a.code.localeCompare(b.code))) {
            md += `| \`${m.code}\` | ${m.smetaName} | ${m.usedIn.join(', ')} |\n`;
        }
    }

    md += `\n## 2. Разночтения в названиях (${nameMismatch.length})\n\n`;
    if (nameMismatch.length === 0) {
        md += `Все названия полностью совпадают.\n`;
    } else {
        md += `| Код (rik_code) | Название в Смете (Правилах) | Название в Каталоге |\n`;
        md += `| --- | --- | --- |\n`;
        for (const m of nameMismatch.sort((a, b) => a.code.localeCompare(b.code))) {
            md += `| \`${m.code}\` | ${m.smetaName} | ${m.catalogName} |\n`;
        }
    }

    fs.writeFileSync('diagnostic_smeta_report.md', md);
    console.log(`\nDiagnostic complete. Report saved to diagnostic_smeta_report.md`);
}

run().catch(console.error).finally(() => process.exit(0));
