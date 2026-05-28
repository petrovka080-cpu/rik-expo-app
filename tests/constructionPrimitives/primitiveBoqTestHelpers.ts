import fs from "node:fs";
import path from "node:path";
import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";
import {
  buildConstructionPrimitiveGraph,
  validateConstructionPrimitiveGraph,
} from "../../src/lib/ai/constructionPrimitives";
import { OPEN_WORLD_PRIMITIVE_STRESS_PACK } from "../../src/lib/ai/constructionPrimitives/fixtures/openWorldPrimitiveStressPack";
import {
  compileParametricBoqRecipe,
  compileProfessionalBoqFromPrimitives,
  findWeakGenericRecipeRows,
  validateNoGenericFallbackForKnownWork,
  validateParametricBoqRecipe,
} from "../../src/lib/ai/professionalBoq";
import { classifyConstructionWorkOutcome } from "../../src/lib/ai/worldConstructionInterpreter";

export const primitiveGraph = buildConstructionPrimitiveGraph();
export const primitiveGraphValidation = validateConstructionPrimitiveGraph(primitiveGraph);

export function classifyPrimitive(prompt: string) {
  return classifyConstructionWorkOutcome({
    text: prompt,
    countryCode: "KG",
    city: "Bishkek",
    currency: "KGS",
  }).primitive;
}

export function recipeFor(prompt: string) {
  const primitive = classifyPrimitive(prompt);
  const recipe = compileParametricBoqRecipe(primitive);
  const validation = validateParametricBoqRecipe(recipe);
  return { primitive, recipe, validation };
}

export function professionalBoqFor(prompt: string) {
  const primitive = classifyPrimitive(prompt);
  return compileProfessionalBoqFromPrimitives(primitive);
}

export function answerFor(route: "/request" | "/ai?context=foreman", prompt: string) {
  return answerBuiltInAi({
    text: prompt,
    route,
    screenContext: route === "/request" ? "request" : "foreman",
    role: route === "/request" ? "consumer" : "foreman",
    countryCode: "KG",
    cityOrRegion: "Bishkek",
  });
}

export function sourceFilesUnder(relativeRoot: string): string[] {
  const root = path.join(process.cwd(), relativeRoot);
  if (!fs.existsSync(root)) return [];
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const absolute = path.join(dir, entry.name);
      const relative = path.relative(process.cwd(), absolute).replace(/\\/g, "/");
      if (entry.isDirectory()) walk(absolute);
      else if (/\.(ts|tsx)$/.test(entry.name)) files.push(relative);
    }
  };
  walk(root);
  return files;
}

export function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

export function assertRecipeGreen(prompt: string) {
  const result = recipeFor(prompt);
  expect(result.validation).toEqual(expect.objectContaining({ passed: true }));
  expect(findWeakGenericRecipeRows(result.recipe)).toEqual([]);
  expect(validateNoGenericFallbackForKnownWork(result)).toEqual(expect.objectContaining({ passed: true }));
  return result;
}

export { OPEN_WORLD_PRIMITIVE_STRESS_PACK };
