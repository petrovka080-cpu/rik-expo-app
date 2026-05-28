import fs from "node:fs";
import path from "node:path";

describe("primitive BOQ no second AI framework", () => {
  it("uses the existing world construction and built-in AI platform layers", () => {
    const aiRoot = path.join(process.cwd(), "src/lib/ai");
    const entries = fs.readdirSync(aiRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name);
    expect(entries).toEqual(expect.arrayContaining([
      "builtInAi",
      "constructionPrimitives",
      "worldConstructionInterpreter",
      "worldConstructionOntology",
      "professionalBoq",
    ]));
    expect(entries.filter((name) => /second|newAi|primitiveAiFramework|openWorldAi/i.test(name))).toEqual([]);
  });
});
