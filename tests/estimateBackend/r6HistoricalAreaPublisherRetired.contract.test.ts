import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as ts from "typescript";
import { assertCanonicalNewWorkCatalogIdV1 } from "../../src/lib/estimate/backendPlatform/canonicalPublicCatalogVisibilityV1";

test("the immutable R6 historical publisher rejects replay before any database access", () => {
  const file = resolve("scripts/estimate/r6/prepareR6AsphaltAndGabionSuccessor.ts");
  const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
  const main = source.statements.find((statement): statement is ts.FunctionDeclaration =>
    ts.isFunctionDeclaration(statement) && statement.name?.text === "main");
  const first = main?.body?.statements[0];
  expect(first && ts.isExpressionStatement(first)).toBe(true);
  if (!first || !ts.isExpressionStatement(first) || !ts.isCallExpression(first.expression)) {
    throw new Error("R6_PUBLICATION_ENTRY_GUARD_MISSING");
  }
  expect(first.expression.expression.getText(source)).toBe("assertCanonicalNewWorkCatalogIdV1");
  const argument = first.expression.arguments[0];
  expect(argument && ts.isTemplateExpression(argument)).toBe(true);
  if (!argument || !ts.isTemplateExpression(argument)) {
    throw new Error("R6_HISTORICAL_SELECTOR_GUARD_MISSING");
  }
  expect(argument.head.text).toBe("canonical-work:base:");
  expect(argument.templateSpans[0]?.expression.getText(source))
    .toBe("PRESERVED_DRAINAGE_TECHNOLOGY_ID");
  const preserved = source.statements.flatMap((statement) =>
    ts.isVariableStatement(statement) ? [...statement.declarationList.declarations] : [])
    .find((declaration) => declaration.name.getText(source) === "PRESERVED_DRAINAGE_TECHNOLOGY_ID");
  expect(preserved?.initializer && ts.isStringLiteral(preserved.initializer)).toBe(true);
  if (!preserved?.initializer || !ts.isStringLiteral(preserved.initializer)) {
    throw new Error("R6_IMMUTABLE_HISTORICAL_SELECTOR_MISSING");
  }
  const preservedTechnologyId = preserved.initializer.text;
  expect(preservedTechnologyId).toBe("paving_roads_landscape_interior_asphalt_drain_large_area");
  expect(() => assertCanonicalNewWorkCatalogIdV1(`canonical-work:base:${preservedTechnologyId}`))
    .toThrow("CANONICAL_AREA_CATALOG_VARIANT_RETIRED");
});
