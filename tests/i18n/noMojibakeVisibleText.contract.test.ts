import { readdirSync, readFileSync, statSync } from "fs";
import path from "path";

const repoRoot = path.join(__dirname, "..", "..");

const sourceRoots = [
  "app/(tabs)/office",
  "app/(tabs)/request",
  "src/features/chat",
  "src/features/consumerRepair",
  "src/features/reports",
  "src/screens/accountant",
  "src/screens/buyer",
  "src/screens/contractor",
  "src/screens/director",
  "src/screens/foreman",
  "src/screens/security",
  "src/screens/subcontracts",
  "src/components/foreman",
  "src/components/map",
  "src/shared/i18n",
  "src/shared/ui",
];

const mojibakeMarkers = [
  /[\u0420\u0421][\u0080-\u00bf\u00d7\u2010-\u202f\u0400-\u040f\u0450-\u045f\u0490-\u0491]/u,
  /[\u00d0\u00d1][\u0080-\u00bf\u0400-\u045f]/u,
  /\ufffd|\u043f\u0457\u0405/u,
  /\u0413[\u0450-\u045f\u2010-\u202f]/u,
  /\u0432\u0402[\u201c\u201d\u00a6]/u,
];

const internalVisibleMarkers = [
  /E2E Supplier/u,
  /\bSYS-[A-Z0-9_-]+\b/u,
  /\bdirector_reports\b/u,
  /\bsummary_buckets\b/u,
  /\brequest_timeout_discipline\b/u,
];

function collectSourceFiles(root: string): string[] {
  const absoluteRoot = path.join(repoRoot, root);
  const out: string[] = [];
  const visit = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const absolute = path.join(dir, entry);
      const stat = statSync(absolute);
      if (stat.isDirectory()) {
        visit(absolute);
        continue;
      }
      if (!/\.[tj]sx?$/.test(entry)) continue;
      if (/\.(test|spec)\.[tj]sx?$/.test(entry)) continue;
      out.push(absolute);
    }
  };
  visit(absoluteRoot);
  return out;
}

function relativePath(absolute: string): string {
  return path.relative(repoRoot, absolute).replace(/\\/g, "/");
}

function isUserVisibleSource(relative: string): boolean {
  return (
    relative.endsWith(".tsx") ||
    relative.includes("/officeRussianDisplay.") ||
    relative.includes("/requestEstimateScreenActions.") ||
    relative.includes("/accountant.status.") ||
    relative.includes("/subcontracts.shared.") ||
    relative.includes("/buyer.list.ui.")
  );
}

describe("office and request visible Russian text integrity", () => {
  const files = sourceRoots.flatMap(collectSourceFiles);

  it("keeps selected user-visible source free of mojibake markers", () => {
    const violations: string[] = [];

    for (const file of files) {
      const source = readFileSync(file, "utf8");
      const relative = relativePath(file);
      source.split(/\r?\n/).forEach((line, index) => {
        if (mojibakeMarkers.some((marker) => marker.test(line))) {
          violations.push(`${relative}:${index + 1}:${line.trim()}`);
        }
      });
    }

    expect(violations).toEqual([]);
  });

  it("does not expose internal/test identifiers through visible UI source", () => {
    const violations: string[] = [];

    for (const file of files) {
      const relative = relativePath(file);
      if (!isUserVisibleSource(relative)) continue;
      const source = readFileSync(file, "utf8");
      source.split(/\r?\n/).forEach((line, index) => {
        if (internalVisibleMarkers.some((marker) => marker.test(line))) {
          violations.push(`${relative}:${index + 1}:${line.trim()}`);
        }
      });
    }

    expect(violations).toEqual([]);
  });
});
