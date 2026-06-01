import fs from "node:fs";
import path from "node:path";

const UI_ROOTS = ["app", "src/screens", "src/features"] as const;
const FORBIDDEN_RUNTIME_TOKENS = [
  "concrete_pedestal_pour",
  "concreteWithWasteM3",
  "бетонных тумб 12 шт",
] as const;

function walkFiles(root: string): string[] {
  const absoluteRoot = path.join(process.cwd(), root);
  if (!fs.existsSync(absoluteRoot)) return [];
  const entries = fs.readdirSync(absoluteRoot, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(absoluteRoot, entry.name);
    if (entry.isDirectory()) return walkFiles(path.relative(process.cwd(), fullPath));
    if (!/\.(ts|tsx|js|jsx)$/.test(entry.name)) return [];
    return [fullPath];
  });
}

describe("concrete pedestal no screen-local calculation", () => {
  it("keeps pedestal routing and quantities out of UI screen files", () => {
    const uiFiles = UI_ROOTS.flatMap((root) => walkFiles(root));

    for (const filePath of uiFiles) {
      const content = fs.readFileSync(filePath, "utf8");
      for (const token of FORBIDDEN_RUNTIME_TOKENS) {
        expect(content).not.toContain(token);
      }
    }
  });
});
