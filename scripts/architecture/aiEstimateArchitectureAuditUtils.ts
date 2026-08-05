import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

export function walkTs(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = path.join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) return walkTs(fullPath);
    return stats.isFile() && /\.(ts|tsx)$/.test(entry) ? [fullPath.replace(/\\/g, "/")] : [];
  });
}

export function read(file: string): string {
  return readFileSync(file, "utf8");
}

export function countMatchingFiles(files: readonly string[], pattern: RegExp): number {
  return files.filter((file) => pattern.test(read(file))).length;
}

export function matchingFiles(files: readonly string[], pattern: RegExp): string[] {
  return files.filter((file) => pattern.test(read(file)));
}

export function requiredPathsPresent(paths: readonly string[]): boolean {
  return paths.every((targetPath) => existsSync(targetPath));
}

export function directCircularImportCount(files: readonly string[]): number {
  const byModule = new Map<string, string[]>();
  const candidates = new Set(files.map((file) => file.replace(/\.tsx?$/, "")));
  for (const file of files) {
    const text = read(file);
    const deps = [...text.matchAll(/from ["'](\.[^"']+)["']/g)]
      .map((match) => path.normalize(path.join(path.dirname(file), match[1])).replace(/\\/g, "/"))
      .map((dep) => dep.replace(/\.tsx?$/, ""))
      .filter((dep) => candidates.has(dep));
    byModule.set(file.replace(/\.tsx?$/, ""), deps);
  }
  let cycles = 0;
  for (const [file, deps] of byModule) {
    for (const dep of deps) {
      if (byModule.get(dep)?.includes(file)) cycles += 1;
    }
  }
  return cycles;
}

export function allAiEstimateUiFiles(): string[] {
  return [
    ...walkTs("src/features/requests"),
    ...walkTs("src/features/consumerRepair"),
    ...walkTs("src/features/foreman"),
    ...walkTs("src/features/estimates"),
  ].filter((file) => !/\.(?:test|spec)\.tsx?$/.test(file));
}

export function estimateFiles(): string[] {
  return walkTs("src/lib/estimate");
}

export function stableArchitectureChecks(blockers: readonly string[]) {
  return {
    ok: blockers.length === 0,
    blockingReasons: [...blockers],
  };
}
