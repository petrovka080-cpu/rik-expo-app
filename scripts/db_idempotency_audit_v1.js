/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: path.resolve(process.cwd(), ".env.local") });

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function sampleColumns(table) {
  const { data, error } = await supabase.from(table).select("*").limit(1);
  if (error) return { error: error.message, columns: [] };
  const row = Array.isArray(data) && data.length ? data[0] : null;
  return { error: null, columns: row ? Object.keys(row) : [] };
}

async function hasColumn(table, col) {
  const { error } = await supabase.from(table).select(col).limit(1);
  return !error;
}

async function dupByField(table, field, limit = 50000) {
  const { data, error } = await supabase
    .from(table)
    .select(field)
    .not(field, "is", null)
    .limit(limit);
  if (error) return { error: error.message, total: 0, dupGroups: 0, top: [] };

  const arr = Array.isArray(data) ? data : [];
  const map = new Map();
  for (const r of arr) {
    const key = String(r?.[field] ?? "").trim();
    if (!key) continue;
    map.set(key, (map.get(key) || 0) + 1);
  }
  const dups = Array.from(map.entries())
    .filter(([, n]) => n > 1)
    .sort((a, b) => b[1] - a[1]);

  return {
    error: null,
    total: arr.length,
    dupGroups: dups.length,
    top: dups.slice(0, 25).map(([key, count]) => ({ key, count })),
  };
}

async function dupByPair(table, a, b, limit = 50000) {
  const { data, error } = await supabase
    .from(table)
    .select(`${a},${b}`)
    .not(a, "is", null)
    .not(b, "is", null)
    .limit(limit);
  if (error) return { error: error.message, total: 0, dupGroups: 0, top: [] };

  const arr = Array.isArray(data) ? data : [];
  const map = new Map();
  for (const r of arr) {
    const va = String(r?.[a] ?? "").trim();
    const vb = String(r?.[b] ?? "").trim();
    if (!va || !vb) continue;
    const key = `${va}::${vb}`;
    map.set(key, (map.get(key) || 0) + 1);
  }
  const dups = Array.from(map.entries())
    .filter(([, n]) => n > 1)
    .sort((x, y) => y[1] - x[1]);

  return {
    error: null,
    total: arr.length,
    dupGroups: dups.length,
    top: dups.slice(0, 25).map(([key, count]) => ({ key, count })),
  };
}

async function run() {
  const out = {
    generated_at: new Date().toISOString(),
    tables: {},
    column_probe: {},
    checks: {},
  };

  for (const table of ["purchases", "purchase_items", "wh_incoming", "wh_ledger", "proposal_items"]) {
    out.tables[table] = await sampleColumns(table);
  }

  out.column_probe.purchase_items = {
    proposal_item_id: await hasColumn("purchase_items", "proposal_item_id"),
    request_item_id: await hasColumn("purchase_items", "request_item_id"),
    purchase_id: await hasColumn("purchase_items", "purchase_id"),
  };
  out.column_probe.wh_ledger = {
    source_type: await hasColumn("wh_ledger", "source_type"),
    source_id: await hasColumn("wh_ledger", "source_id"),
    incoming_item_id: await hasColumn("wh_ledger", "incoming_item_id"),
    purchase_id: await hasColumn("wh_ledger", "purchase_id"),
    direction: await hasColumn("wh_ledger", "direction"),
  };

  out.checks.purchases_by_proposal_id = await dupByField("purchases", "proposal_id");
  out.checks.wh_incoming_by_purchase_id = await dupByField("wh_incoming", "purchase_id");

  if (out.column_probe.purchase_items.request_item_id) {
    out.checks.purchase_items_by_request_item_id = await dupByField("purchase_items", "request_item_id");
  }
  if (out.column_probe.purchase_items.purchase_id && out.column_probe.purchase_items.request_item_id) {
    out.checks.purchase_items_by_purchase_request_item = await dupByPair(
      "purchase_items",
      "purchase_id",
      "request_item_id",
    );
  }
  if (out.column_probe.purchase_items.proposal_item_id) {
    out.checks.purchase_items_by_proposal_item_id = await dupByField("purchase_items", "proposal_item_id");
  }

  if (out.column_probe.wh_ledger.source_type && out.column_probe.wh_ledger.source_id) {
    out.checks.wh_ledger_by_source = await dupByPair("wh_ledger", "source_type", "source_id");
  } else if (out.column_probe.wh_ledger.incoming_item_id && out.column_probe.wh_ledger.direction) {
    out.checks.wh_ledger_by_incoming_item_direction = await dupByPair(
      "wh_ledger",
      "incoming_item_id",
      "direction",
    );
  }

  const outPath = path.resolve(process.cwd(), "diagnostics/db_idempotency_runtime_audit.json");
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(`Wrote ${outPath}`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

