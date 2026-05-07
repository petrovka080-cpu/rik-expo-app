import fs from "fs";
import path from "path";
import * as ts from "typescript";

const root = path.resolve(__dirname, "../..");
const targetPath = path.join(root, "src/lib/api/pdf_director.data.ts");

function readTarget() {
  return fs.readFileSync(targetPath, "utf8");
}

function collectActiveAnyKeywordLines(source: string) {
  const sourceFile = ts.createSourceFile(
    targetPath,
    source,
    ts.ScriptTarget.Latest,
    true,
  );
  const lines: number[] = [];

  const visit = (node: ts.Node) => {
    if (node.kind === ts.SyntaxKind.AnyKeyword) {
      lines.push(sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1);
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return lines;
}

describe("S-TYPE-SAFETY-PDF-DIRECTOR-ANY-REDUCTION-1", () => {
  it("keeps pdf_director.data.ts free of active TypeScript any keywords", () => {
    expect(collectActiveAnyKeywordLines(readTarget())).toEqual([]);
  });

  it("keeps explicit any text out of pdf_director.data.ts governance scans", () => {
    expect(readTarget()).not.toMatch(/\bany\b|as\s+any|:\s*any|<\s*any\b/);
  });
});
