import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";

const PARALLEL_AI_MODULE_RE = /(?:^|\/)(?:openai|axios|langchain|anthropic)(?:\/|$)/i;
const PARALLEL_AI_CALLS = new Set(["fetch", "createChat", "OpenAI"]);

function collectParallelAiExecutables(source: string): string[] {
  const sourceFile = ts.createSourceFile(
    "consumerRepairAiAdapter.ts",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const violations: string[] = [];

  const visit = (node: ts.Node): void => {
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      PARALLEL_AI_MODULE_RE.test(node.moduleSpecifier.text)
    ) {
      violations.push(`provider-import:${node.moduleSpecifier.text}`);
    }
    if (
      (ts.isCallExpression(node) || ts.isNewExpression(node)) &&
      ts.isIdentifier(node.expression) &&
      PARALLEL_AI_CALLS.has(node.expression.text)
    ) {
      violations.push(`provider-executable:${node.expression.text}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return violations;
}

describe("consumer repair no second AI framework architecture contract", () => {
  it("uses the existing consumer adapter and domain gateway instead of a parallel AI framework", () => {
    const adapter = fs.readFileSync(path.resolve(process.cwd(), "src/features/consumerRepair/consumerRepairAiAdapter.ts"), "utf8");
    const provider = fs.readFileSync(path.resolve(process.cwd(), "src/lib/ai/domainDataGateway/providers/consumerRepairDomainProvider.ts"), "utf8");

    expect(collectParallelAiExecutables(adapter)).toEqual([]);
    expect(provider).toContain("AiDomainProvider");
    expect(provider).toContain("consumer_repair");
  });

  it("fails closed for an executable parallel provider fixture", () => {
    const violationFixture = [
      'import OpenAI from "openai";',
      "const client = new OpenAI();",
      'fetch("https://parallel-ai.invalid/chat");',
      'createChat({ owner: "parallel" });',
    ].join("\n");

    expect(collectParallelAiExecutables(violationFixture)).toEqual([
      "provider-import:openai",
      "provider-executable:OpenAI",
      "provider-executable:fetch",
      "provider-executable:createChat",
    ]);
  });
});
