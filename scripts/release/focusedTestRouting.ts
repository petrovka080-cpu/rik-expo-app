import { createHash } from "node:crypto";
import path from "node:path";
import ts from "typescript";

export type FocusedTestPlan = {
  jestFiles: string[];
  nodeFiles: string[];
  nonTestContractFiles: string[];
  removedTestFiles: string[];
};

// This runtime module is imported by durable-store adapters and their separate
// real .contract.test.ts suite. A role pin is deliberately source-exact: any
// change requires explicit review; an unknown .contract module stays runnable.
const productionContractSourcePins: Readonly<Record<string, string>> = {
  "src/lib/platform/estimateRevisionDurableStore.contract.ts": "51a954e5b04525c9e4acd818bb2c8b8e507fe953db09c4d45b81a17006610876",
};

function declaredProductionContract(file: string, source: string): boolean {
  const expected = productionContractSourcePins[file];
  if (!expected) return false;
  const actual = createHash("sha256").update(source.replace(/\r\n/g, "\n"), "utf8").digest("hex");
  if (actual !== expected) throw new Error(`PRODUCTION_CONTRACT_ROLE_SOURCE_DRIFT:${file}`);
  return true;
}
// A .contract.ts can also be an executable suite. Only an inert declaration
// module may be classed as production data; unknown evaluation stays runnable.
function inertInitializer(node: ts.Expression): boolean {
  if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)
    || ts.isSatisfiesExpression(node) || ts.isNonNullExpression(node)) return inertInitializer(node.expression);
  if (ts.isStringLiteralLike(node) || ts.isNumericLiteral(node) || ts.isBigIntLiteral(node)
    || [ts.SyntaxKind.TrueKeyword, ts.SyntaxKind.FalseKeyword, ts.SyntaxKind.NullKeyword,
      ts.SyntaxKind.RegularExpressionLiteral].includes(node.kind)) return true;
  if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) return true;
  if (ts.isPrefixUnaryExpression(node)) return inertInitializer(node.operand);
  if (ts.isArrayLiteralExpression(node)) return node.elements.every(item => ts.isExpression(item) && inertInitializer(item));
  if (ts.isObjectLiteralExpression(node)) return node.properties.every(item =>
    ts.isPropertyAssignment(item) && !ts.isComputedPropertyName(item.name) && inertInitializer(item.initializer));
  return ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
    && ts.isIdentifier(node.expression.expression) && node.expression.expression.text === "Object"
    && node.expression.name.text === "freeze" && node.arguments.length === 1
    && inertInitializer(node.arguments[0]!);
}

function frameworkSource(file: string, source: string) {
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : file.endsWith(".jsx") ? ts.ScriptKind.JSX
      : /\.(?:js|mjs|cjs)$/.test(file) ? ts.ScriptKind.JS : ts.ScriptKind.TS);
  let nodeTest = false;
  let jestImport = false;
  let registration = false;
  let topLevelExpression = false;
  let moduleEvaluationUnknown = false;
  const root = (expression: ts.Expression): string | undefined => {
    if (ts.isIdentifier(expression)) return expression.text;
    if (ts.isPropertyAccessExpression(expression) || ts.isElementAccessExpression(expression)
      || ts.isCallExpression(expression)) return root(expression.expression);
    return undefined;
  };
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const clause = node.importClause;
      const bindings = clause?.namedBindings;
      const valueImport = !clause?.isTypeOnly && (!clause || Boolean(clause.name)
        || Boolean(bindings && (ts.isNamespaceImport(bindings)
          || (ts.isNamedImports(bindings) && bindings.elements.some(item => !item.isTypeOnly)))));
      if (valueImport) moduleEvaluationUnknown = true;
      if (valueImport && node.moduleSpecifier.text === "node:test") nodeTest = true;
      if (valueImport && node.moduleSpecifier.text === "@jest/globals") jestImport = true;
    }
    if (ts.isImportEqualsDeclaration(node) && !node.isTypeOnly
      && ts.isExternalModuleReference(node.moduleReference)
      && node.moduleReference.expression && ts.isStringLiteral(node.moduleReference.expression)
      && node.moduleReference.expression.text === "node:test") nodeTest = true;
    if (ts.isCallExpression(node)) {
      const first = node.arguments[0];
      const loader = node.expression.kind === ts.SyntaxKind.ImportKeyword
        || (ts.isIdentifier(node.expression) && node.expression.text === "require");
      if (loader && first && ts.isStringLiteral(first)) {
        if (first.text === "node:test") nodeTest = true;
        if (first.text === "@jest/globals") jestImport = true;
      }
      if (["test", "it", "describe", "suite"].includes(root(node.expression) ?? "")) registration = true;
    }
    ts.forEachChild(node, visit);
  };
  for (const statement of tree.statements) {
    if (ts.isExpressionStatement(statement)) topLevelExpression = true;
    if (ts.isVariableStatement(statement)) {
      if (statement.declarationList.declarations.some(item => !item.initializer || !inertInitializer(item.initializer)))
        moduleEvaluationUnknown = true;
    } else if (!ts.isTypeAliasDeclaration(statement) && !ts.isInterfaceDeclaration(statement)
      && !ts.isFunctionDeclaration(statement) && !ts.isImportDeclaration(statement)
      && !ts.isEmptyStatement(statement)) moduleEvaluationUnknown = true;
    visit(statement);
  }
  if (nodeTest && jestImport) throw new Error(`MIXED_TEST_FRAMEWORKS:${file}`);
  return { nodeTest, jestImport, registration, topLevelExpression, moduleEvaluationUnknown };
}

export function planFocusedTests(
  stagedFiles: readonly string[],
  readSource: (file: string) => string | undefined,
  deletedFiles: readonly string[],
): FocusedTestPlan {
  const plan: FocusedTestPlan = { jestFiles: [], nodeFiles: [], nonTestContractFiles: [], removedTestFiles: [] };
  const deleted = new Set(deletedFiles);
  for (const file of [...new Set(stagedFiles)].filter(file => /\.(test|contract)\.(?:tsx?|jsx?|mjs|cjs)$/.test(file)).sort()) {
    const source = readSource(file);
    if (source === undefined) {
      if (!deleted.has(file)) throw new Error(`STAGED_TEST_SOURCE_MISSING:${file}`);
      plan.removedTestFiles.push(file);
      continue;
    }
    const framework = frameworkSource(file, source);
    if (declaredProductionContract(file, source)) plan.nonTestContractFiles.push(file);
    else if (framework.nodeTest) plan.nodeFiles.push(file);
    else if (/\.contract\.(?:tsx?|jsx?|mjs|cjs)$/.test(file) && !framework.jestImport
      && !framework.registration && !framework.topLevelExpression
      && !framework.moduleEvaluationUnknown) plan.nonTestContractFiles.push(file);
    else plan.jestFiles.push(file);
  }
  return plan;
}

const canonical = (root: string, file: string): string => {
  const resolved = path.resolve(root, file).replace(/\\/g, "/");
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
};

export function assertExactFocusedJestResults(root: string, expectedFiles: readonly string[], result: unknown): void {
  if (!result || typeof result !== "object") throw new Error("FOCUSED_JEST_RESULT_REQUIRED");
  const report = result as { success?: boolean; numTotalTestSuites?: number; testResults?: Array<{ name?: string; status?: string }> };
  if (!Array.isArray(report.testResults)) throw new Error("FOCUSED_JEST_SUITE_RESULTS_REQUIRED");
  const expected = new Set(expectedFiles.map(file => canonical(root, file)));
  const actual = report.testResults.map(suite => typeof suite.name === "string" ? canonical(root, suite.name) : "");
  const observed = new Set(actual);
  const missing = [...expected].filter(file => !observed.has(file));
  const extra = [...observed].filter(file => !expected.has(file));
  if (actual.length !== observed.size || report.numTotalTestSuites !== expected.size || missing.length || extra.length)
    throw new Error(`FOCUSED_JEST_SUITE_COVERAGE:${JSON.stringify({ missing, extra, expected: expected.size, actual: actual.length })}`);
  // Preserve existing legal pending cases. This proves selection coverage only;
  // the ordinary Jest exit status remains authoritative for test success.
  if (report.success !== true) throw new Error("FOCUSED_JEST_RUN_NOT_SUCCESSFUL");
}
