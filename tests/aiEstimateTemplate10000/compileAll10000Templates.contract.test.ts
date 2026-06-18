import { compileAllProductionTemplates10000 } from "../../src/lib/ai/estimateTemplate10000";

describe("compile all 10000 templates", () => {
  it("compiles every production expanded template successfully", () => {
    const audit = compileAllProductionTemplates10000();

    expect(audit.results).toHaveLength(10000);
    expect(audit.compiledTemplatesFailed).toBe(0);
    expect(audit.failures).toHaveLength(0);
    expect(audit.results.every((result) => result.passed && result.compiledHash)).toBe(true);
  });
});
