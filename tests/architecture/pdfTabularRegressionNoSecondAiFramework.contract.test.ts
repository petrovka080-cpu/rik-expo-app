import fs from "node:fs";
import path from "node:path";

function readTreeFiles(root: string): string {
  if (!fs.existsSync(root)) return "";
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) return [readTreeFiles(fullPath)];
    if (!/\.(ts|tsx|js|jsx)$/.test(entry.name)) return [];
    return [fs.readFileSync(fullPath, "utf8")];
  }).join("\n");
}

describe("PDF tabular regression no second AI framework", () => {
  it("does not introduce a second AI framework in the PDF regression repair", () => {
    const source = readTreeFiles(path.resolve(process.cwd(), "src/lib/aiEstimatePdf"));
    expect(source).not.toMatch(/langchain|llamaindex|semantic-kernel|autogen|crewai/i);
  });
});
