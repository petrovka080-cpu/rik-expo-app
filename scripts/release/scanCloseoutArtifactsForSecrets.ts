import fs from "node:fs";
import path from "node:path";

const targetDir = path.resolve(process.argv[2] ?? "");
if (!targetDir || !fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) {
  throw new Error(`Artifact directory not found: ${process.argv[2] ?? "<missing>"}`);
}

const forbidden = [
  /(?:redis|rediss|postgres|postgresql):\/\//i,
  /\b(?:DATABASE_URL|REDIS_URL|SUPABASE_SERVICE_ROLE_KEY|ANTHROPIC_API_KEY|SENTRY_AUTH_TOKEN)\b\s*[:=]\s*["']?[^\s"',}]{8,}/i,
  /\bSERVICE_ROLE\b\s*[:=]\s*["']?[^\s"',}]{8,}/i,
  /BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/i,
  /\bsk-[A-Za-z0-9_-]{20,}\b/,
  /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/,
];

function listFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(fullPath) : [fullPath];
  });
}

const files = listFiles(targetDir).filter((file) => /\.(json|md|txt|xml|log)$/i.test(file));
const hits: Array<{ file: string; pattern: string }> = [];

for (const file of files) {
  const content = fs.readFileSync(file, "utf8");
  for (const pattern of forbidden) {
    if (pattern.test(content)) {
      hits.push({ file: path.relative(process.cwd(), file).replace(/\\/g, "/"), pattern: String(pattern) });
    }
  }
}

const outputPath = path.join(targetDir, "secret_scan.json");
const payload = {
  scanned_files: files.length,
  forbidden_hits: hits,
  secrets_written_to_artifacts: hits.length > 0,
  fake_green_claimed: false,
};
fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

if (hits.length > 0) {
  console.error(JSON.stringify(payload, null, 2));
  process.exitCode = 1;
}
