/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: path.join(process.cwd(), ".env.local") });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, serviceKey);

async function existsView(name) {
  const { data, error } = await supabase.from(name).select("*").limit(1);
  if (error) return { ok: false, error: error.message || String(error) };
  return { ok: true, sample: Array.isArray(data) ? data[0] ?? null : null };
}

async function smokeRpc(fn, args) {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) return { ok: false, error: error.message || String(error) };
  const payload = Array.isArray(data) ? data[0] : data;
  return { ok: true, kind: typeof payload, payload };
}

async function main() {
  const out = {
    generated_at: new Date().toISOString(),
    readiness: {},
    smoke: {},
  };

  out.readiness = {
    has_v_director_report_fact_daily_v1: await existsView("v_director_report_fact_daily_v1"),
    has_v_director_report_issue_item_facts_v1: await existsView("v_director_report_issue_item_facts_v1"),
  };

  out.smoke.materials = await smokeRpc("director_report_fetch_materials_v1", {
    p_from: "2026-01-01",
    p_to: "2026-12-31",
    p_object_name: null,
  });
  out.smoke.works = await smokeRpc("director_report_fetch_works_v1", {
    p_from: "2026-01-01",
    p_to: "2026-12-31",
    p_object_name: null,
    p_include_costs: false,
  });
  out.smoke.summary = await smokeRpc("director_report_fetch_summary_v1", {
    p_from: "2026-01-01",
    p_to: "2026-12-31",
    p_object_name: null,
    p_mode: null,
  });

  const outPath = path.join(process.cwd(), "diagnostics", "director_rpc_deploy_smoke_v1.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");
  console.log(`saved ${outPath}`);
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

