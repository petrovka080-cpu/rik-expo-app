const fs = require("fs");
const path = require("path");

function exists(p) { try { fs.accessSync(p); return true; } catch { return false; } }
function readText(p) { return fs.readFileSync(p, "utf8"); }

function parseEnvFile(text) {
  const out = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const k = line.slice(0, eq).trim();
    let v = line.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[k] = v;
  }
  return out;
}

function loadLocalEnv() {
  const root = process.cwd();
  const candidates = [".env.local", ".env", ".env.production", ".env.production.local"];
  const merged = {};
  for (const f of candidates) {
    const p = path.join(root, f);
    if (exists(p)) {
      try { Object.assign(merged, parseEnvFile(readText(p))); } catch {}
    }
  }
  return merged;
}

function fail(msg) { console.error("\n❌ Preflight FAILED:\n" + msg); process.exit(1); }
function ok(msg) { console.log("✅ " + msg); }

(function main() {
  const fileEnv = loadLocalEnv();
  const get = (k) => process.env[k] || fileEnv[k] || "";

  const required = ["EXPO_PUBLIC_SUPABASE_URL", "EXPO_PUBLIC_SUPABASE_ANON_KEY"];
  const missing = required.filter((k) => !String(get(k)).trim());
  if (missing.length) {
    fail("Не найдены переменные окружения:\n" + missing.map((k) => " - " + k).join("\n"));
  }
  ok("ENV: обязательные переменные найдены");

  const url = String(get("EXPO_PUBLIC_SUPABASE_URL")).trim();
  if (!/^https?:\/\/.+/i.test(url)) fail("EXPO_PUBLIC_SUPABASE_URL выглядит странно: " + url);
  ok("SUPABASE_URL: формат ок");

  const key = String(get("EXPO_PUBLIC_SUPABASE_ANON_KEY")).trim();
  if (key.length < 30) fail("EXPO_PUBLIC_SUPABASE_ANON_KEY слишком короткий — похоже на неверный ключ");
  ok("SUPABASE_ANON_KEY: длина ок");

  ok("Preflight OK");
  process.exit(0);
})();
