import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const changedTracked = execFileSync("git", ["diff", "--name-only", "HEAD"], {
  cwd: process.cwd(),
  encoding: "utf8",
})
  .split(/\r?\n/)
  .filter(Boolean);
const untracked = execFileSync("git", ["ls-files", "--others", "--exclude-standard"], {
  cwd: process.cwd(),
  encoding: "utf8",
})
  .split(/\r?\n/)
  .filter(Boolean);
const changed = [...new Set([...changedTracked, ...untracked])]
  .map((file) => file.replace(/\\/g, "/"))
  .filter((file) => /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(file));

const hits: Array<{ file: string; match: string }> = [];
for (const file of changed) {
  const fullPath = path.join(process.cwd(), file);
  if (!fs.existsSync(fullPath)) continue;
  const content = fs.readFileSync(fullPath, "utf8");
  for (const match of content.matchAll(/\b(?:it|test|describe)\.(?:skip|only)\b|\.only\(/g)) {
    hits.push({ file: file.replace(/\\/g, "/"), match: match[0] });
  }
}

const payload = {
  changed_test_files_scanned: changed.length,
  test_weakening_found: hits.length > 0,
  hits,
  fake_green_claimed: false,
};

if (hits.length > 0) {
  console.error(JSON.stringify(payload, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(payload, null, 2));
}
