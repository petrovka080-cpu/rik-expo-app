import fs from "node:fs";
import path from "node:path";

describe("work type resolver UI anti-regression", () => {
  it("does not repair resolver output with useEffect answer/message rewrites", () => {
    const roots = ["app", "src/features", "src/screens"].map((dir) => path.join(process.cwd(), dir));
    const files: string[] = [];

    function visit(root: string): void {
      if (!fs.existsSync(root)) return;
      for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
        const fullPath = path.join(root, entry.name);
        if (entry.isDirectory()) visit(fullPath);
        if (entry.isFile() && [".ts", ".tsx"].includes(path.extname(entry.name))) files.push(fullPath);
      }
    }

    roots.forEach(visit);

    const source = files.map((filePath) => fs.readFileSync(filePath, "utf8")).join("\n");

    expect(source).not.toMatch(/useEffect\s*\(\s*\(\)\s*=>\s*setAnswer/);
    expect(source).not.toMatch(/setMessages\s*\(\s*\(?prev\)?\s*=>\s*rewrite/);
    expect(source).not.toMatch(/setMessages\s*\(\s*\(?prev\)?\s*=>[\s\S]{0,120}(roof_waterproofing|bathroom_waterproofing)/);
  });
});
