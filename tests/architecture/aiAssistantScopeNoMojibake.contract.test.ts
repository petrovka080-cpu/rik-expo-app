import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("AI assistant scoped facts encoding", () => {
  it("does not ship mojibake Russian text in assistant scope summaries", () => {
    const source = read("src/features/ai/assistantScopeContext.ts");

    expect(source).toContain("Снабжение");
    expect(source).toContain("Финансы");
    expect(source).toContain("Поставщиков");
    expect(source).not.toMatch(/РЎР|РџР|РћР|Р¤Р|РўР|Р‘Р|РґР|РµР/);
  });
});
