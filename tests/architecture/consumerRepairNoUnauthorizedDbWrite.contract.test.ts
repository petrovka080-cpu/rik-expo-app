import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";

const DB_PROVIDER_MODULE_RE = /(?:^|\/)(?:supabase|database|db-client|dbClient)(?:\/|$)/i;
const DB_OPERATION_NAMES = new Set(["from", "insert", "update", "delete", "upsert", "rpc"]);

function collectUnauthorizedDbOperations(source: string, fileName: string): string[] {
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const providerBindings = new Set<string>();
  const violations: string[] = [];

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    if (!DB_PROVIDER_MODULE_RE.test(statement.moduleSpecifier.text)) continue;

    violations.push(`provider-import:${statement.moduleSpecifier.text}`);
    const clause = statement.importClause;
    if (clause?.name) providerBindings.add(clause.name.text);
    if (clause?.namedBindings && ts.isNamespaceImport(clause.namedBindings)) {
      providerBindings.add(clause.namedBindings.name.text);
    }
    if (clause?.namedBindings && ts.isNamedImports(clause.namedBindings)) {
      clause.namedBindings.elements.forEach((element) => providerBindings.add(element.name.text));
    }
  }

  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      if (
        ts.isPropertyAccessExpression(callee) &&
        DB_OPERATION_NAMES.has(callee.name.text) &&
        ts.isIdentifier(callee.expression) &&
        providerBindings.has(callee.expression.text)
      ) {
        violations.push(`provider-call:${callee.expression.text}.${callee.name.text}`);
      }
      if (ts.isIdentifier(callee) && providerBindings.has(callee.text)) {
        violations.push(`provider-call:${callee.text}`);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  return violations;
}

describe("consumer repair no unauthorized DB write architecture contract", () => {
  it("does not import or call DB providers from screens outside the consumer request service boundary", () => {
    const featureDir = path.resolve(process.cwd(), "src/features/consumerRepair");
    const violations = fs.readdirSync(featureDir)
      .filter((file) => file.endsWith(".ts") || file.endsWith(".tsx"))
      .flatMap((file) => {
        const source = fs.readFileSync(path.join(featureDir, file), "utf8");
        return collectUnauthorizedDbOperations(source, file).map((violation) => `${file}:${violation}`);
      });

    expect(violations).toEqual([]);
  });
});
