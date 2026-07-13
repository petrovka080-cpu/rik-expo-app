import { spawnSync } from "node:child_process";

export type OfficeMarketImpactRule = {
  pattern: RegExp;
  reason: string;
};

export type OfficeMarketImpactResult = {
  affected: boolean;
  required_command: "npm run ci:office-market" | null;
  matched_files: Array<{
    file: string;
    reason: string;
  }>;
};

export const OFFICE_MARKET_IMPACT_RULES: OfficeMarketImpactRule[] = [
  { pattern: /^src\/screens\/director\//, reason: "director office flow" },
  { pattern: /^src\/screens\/buyer\//, reason: "buyer procurement flow" },
  { pattern: /^src\/screens\/foreman\//, reason: "foreman estimate composer flow" },
  { pattern: /^src\/features\/consumerRepair\//, reason: "consumer repair request flow" },
  { pattern: /^src\/features\/market\//, reason: "market media and listing flow" },
  { pattern: /^src\/lib\/pdf\//, reason: "director PDF flow" },
  { pattern: /^src\/lib\/api\/buyer\.ts$/, reason: "buyer API boundary" },
  { pattern: /^src\/lib\/api\/requests\.status\.ts$/, reason: "request status transition boundary" },
];

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

function runGit(args: string[]): string[] {
  const result = spawnSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  if (result.status !== 0) return [];
  return (result.stdout ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(normalizePath);
}

export function getChangedFiles(): string[] {
  return [
    ...runGit(["diff", "--name-only", "HEAD"]),
    ...runGit(["ls-files", "--others", "--exclude-standard"]),
  ].filter((file, index, files) => files.indexOf(file) === index);
}

export function evaluateOfficeMarketImpact(files: readonly string[]): OfficeMarketImpactResult {
  const matchedFiles = files.flatMap((rawFile) => {
    const file = normalizePath(rawFile);
    const rule = OFFICE_MARKET_IMPACT_RULES.find((entry) => entry.pattern.test(file));
    return rule ? [{ file, reason: rule.reason }] : [];
  });

  return {
    affected: matchedFiles.length > 0,
    required_command: matchedFiles.length > 0 ? "npm run ci:office-market" : null,
    matched_files: matchedFiles,
  };
}

function main() {
  const result = evaluateOfficeMarketImpact(getChangedFiles());
  console.log("OFFICE_MARKET_IMPACT_MAP");
  console.log(`affected=${String(result.affected)}`);
  console.log(`required_command=${result.required_command ?? "none"}`);
  for (const match of result.matched_files) {
    console.log(`- ${match.file}: ${match.reason}`);
  }
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(result, null, 2));
  }
}

if (require.main === module) {
  main();
}
