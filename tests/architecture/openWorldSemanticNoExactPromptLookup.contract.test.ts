import fs from "node:fs";
import path from "node:path";

const productionRoots = [
  "src/lib/ai/builtInAi",
  "src/lib/ai/constructionInterpreter",
  "src/lib/ai/constructionFormulas",
  "src/lib/ai/professionalBoq",
  "src/lib/ai/globalEstimate",
  "src/lib/ai/estimatePresentation",
  "src/lib/ai/catalogBinding",
  "src/lib/estimatePdf",
];

const allowedFixtureOrCatalog = [
  "src/lib/ai/constructionInterpreter/fixtures/",
  "src/lib/ai/globalEstimate/globalConstructionWorkTypeCatalog150.ts",
  "src/lib/ai/globalEstimate/globalEstimateSeedData.ts",
  "src/lib/ai/globalEstimate/unfinishedAiEstimateCases.ts",
];

function walk(root: string): string[] {
  const absoluteRoot = path.join(process.cwd(), root);
  if (!fs.existsSync(absoluteRoot)) return [];
  return fs.readdirSync(absoluteRoot, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(absoluteRoot, entry.name);
    const relative = path.relative(process.cwd(), absolute).replace(/\\/g, "/");
    if (entry.isDirectory()) return walk(relative);
    return /\.(ts|tsx)$/.test(entry.name) ? [relative] : [];
  });
}

function isAllowed(relativePath: string): boolean {
  return allowedFixtureOrCatalog.some((allowed) => relativePath === allowed || relativePath.startsWith(allowed));
}

describe("open-world semantic architecture: no exact prompt lookup", () => {
  it("uses semantic primitives rather than exact live prompt strings", () => {
    const files = productionRoots.flatMap(walk).filter((file) => !isAllowed(file));
    const findings: string[] = [];
    const exactPromptPhrases = [
      "брусчатки на 587",
      "металлический навес на площади 647",
      "двухскатной крыши высота конька",
      "Хочу уложить линолеум на 100",
    ];
    for (const file of files) {
      const source = fs.readFileSync(path.join(process.cwd(), file), "utf8");
      const suspiciousPatterns = [
        /prompt\s*={2,3}/,
        /case\s+["'`][^"'`]*(?:смета|брусчат|навес|двухскат|линолеум|гидроизоляц)/i,
        /\.includes\(\s*["'`][^"'`]*(?:брусчатки на 587|металлический навес на площади 647|двухскатной крыши высота конька)/i,
      ];
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(source)) findings.push(`${file}:pattern:${pattern.source}`);
      }
      for (const phrase of exactPromptPhrases) {
        if (source.includes(phrase)) findings.push(`${file}:exact_phrase:${phrase}`);
      }
    }
    expect(findings).toEqual([]);
  });
});
