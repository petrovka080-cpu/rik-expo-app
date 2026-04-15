// Console audit script — find all raw console.* in non-test runtime code
const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "..", "src");
const CONSOLE_RE = /console\.(log|warn|error|info|debug)\s*\(/;
const DEV_RE = /__DEV__/;

function walk(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walk(full));
    } else if (
      (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) &&
      !entry.name.includes(".test.") &&
      !entry.name.includes(".spec.")
    ) {
      results.push(full);
    }
  }
  return results;
}

const files = walk(SRC);
const all = [];
const unconditional = [];
const boundary = ["logger.ts", "logError.ts", "catchDiscipline.ts", "platformObservability.ts", "swallowedError.ts", "platformGuardDiscipline.ts", "foreman.debug.ts"];

for (const f of files) {
  const lines = fs.readFileSync(f, "utf8").split("\n");
  const rel = path.relative(SRC, f).replace(/\\/g, "/");
  const isBoundary = boundary.some(b => rel.endsWith(b));
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (CONSOLE_RE.test(line)) {
      const hasDev = DEV_RE.test(line) || (i > 0 && DEV_RE.test(lines[i - 1]));
      all.push({ file: rel, line: i + 1, text: line.trim(), hasDev, isBoundary });
      if (!hasDev && !isBoundary) {
        unconditional.push({ file: rel, line: i + 1, text: line.trim() });
      }
    }
  }
}

console.log("=== SUMMARY ===");
console.log("Total non-test console calls:", all.length);
console.log("__DEV__ guarded:", all.filter(x => x.hasDev).length);
console.log("Boundary files:", all.filter(x => x.isBoundary).length);
console.log("UNCONDITIONAL (need migration):", unconditional.length);
console.log("");
console.log("=== UNCONDITIONAL CALLS (replace targets) ===");
const byFile = {};
for (const u of unconditional) {
  if (!byFile[u.file]) byFile[u.file] = [];
  byFile[u.file].push(u);
}
for (const [file, entries] of Object.entries(byFile)) {
  console.log(`\n--- ${file} (${entries.length}) ---`);
  for (const e of entries) {
    console.log(`  L${e.line}: ${e.text}`);
  }
}
console.log("\n=== __DEV__-GUARDED (keep as-is) ===");
const devGuarded = all.filter(x => x.hasDev && !x.isBoundary);
const devByFile = {};
for (const d of devGuarded) {
  if (!devByFile[d.file]) devByFile[d.file] = [];
  devByFile[d.file].push(d);
}
for (const [file, entries] of Object.entries(devByFile)) {
  console.log(`  ${file}: ${entries.length} calls`);
}

console.log("\n=== BOUNDARY FILES (approved) ===");
const bndry = all.filter(x => x.isBoundary);
for (const b of bndry) {
  console.log(`  ${b.file}:L${b.line}`);
}
