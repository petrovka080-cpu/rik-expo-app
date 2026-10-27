import fs from "node:fs";
import path from "node:path";

import { getAiEnterpriseApprovedLayerRoots } from "./aiEnterpriseAllowedLayers";

export type AiEnterpriseScanFinding = {
  file: string;
  line: number;
  pattern: string;
  matchedText: string;
  reason: string;
};

export type AiEnterpriseScanResult = {
  scanner: string;
  passed: boolean;
  findings: AiEnterpriseScanFinding[];
};

export type AiEnterpriseSourceFile = {
  file: string;
  absolutePath: string;
  text: string;
};

export function normalizeAiEnterprisePath(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

function isReadableSourceFile(filePath: string): boolean {
  return /\.(ts|tsx|js|jsx)$/.test(filePath) && !/\.map$/.test(filePath);
}

function walkFiles(rootDir: string, absoluteDir: string, files: AiEnterpriseSourceFile[]): void {
  if (!fs.existsSync(absoluteDir)) return;
  if (fs.statSync(absoluteDir).isFile()) {
    if (!isReadableSourceFile(absoluteDir)) return;
    files.push({
      file: normalizeAiEnterprisePath(path.relative(rootDir, absoluteDir)),
      absolutePath: absoluteDir,
      text: fs.readFileSync(absoluteDir, "utf8"),
    });
    return;
  }
  for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "android" || entry.name === "ios") {
      continue;
    }
    const absolutePath = path.join(absoluteDir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(rootDir, absolutePath, files);
      continue;
    }
    if (!entry.isFile() || !isReadableSourceFile(absolutePath)) continue;
    files.push({
      file: normalizeAiEnterprisePath(path.relative(rootDir, absolutePath)),
      absolutePath,
      text: fs.readFileSync(absolutePath, "utf8"),
    });
  }
}

export function readAiEnterpriseSourceFiles(params: {
  rootDir?: string;
  includeRoots?: string[];
  exclude?: RegExp[];
} = {}): AiEnterpriseSourceFile[] {
  const rootDir = params.rootDir ?? process.cwd();
  const includeRoots = params.includeRoots ?? getAiEnterpriseApprovedLayerRoots();
  const exclude = params.exclude ?? [/\.test\./, /tests\//, /artifacts\//];
  const files: AiEnterpriseSourceFile[] = [];
  for (const includeRoot of includeRoots) {
    walkFiles(rootDir, path.join(rootDir, includeRoot), files);
  }
  return files.filter((file) => !exclude.some((pattern) => pattern.test(file.file)));
}

export function lineForIndex(text: string, index: number): number {
  return text.slice(0, index).split(/\r?\n/).length;
}

export function createScanResult(scanner: string, findings: AiEnterpriseScanFinding[]): AiEnterpriseScanResult {
  return {
    scanner,
    passed: findings.length === 0,
    findings,
  };
}

export function findRegexInFiles(params: {
  scanner: string;
  files: AiEnterpriseSourceFile[];
  pattern: RegExp;
  reason: string;
  ignore?: (finding: AiEnterpriseScanFinding, file: AiEnterpriseSourceFile) => boolean;
}): AiEnterpriseScanResult {
  const findings: AiEnterpriseScanFinding[] = [];
  for (const file of params.files) {
    const pattern = new RegExp(params.pattern.source, params.pattern.flags.includes("g") ? params.pattern.flags : `${params.pattern.flags}g`);
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(file.text)) !== null) {
      const finding: AiEnterpriseScanFinding = {
        file: file.file,
        line: lineForIndex(file.text, match.index),
        pattern: params.pattern.source,
        matchedText: match[0],
        reason: params.reason,
      };
      if (!params.ignore?.(finding, file)) findings.push(finding);
    }
  }
  return createScanResult(params.scanner, findings);
}
