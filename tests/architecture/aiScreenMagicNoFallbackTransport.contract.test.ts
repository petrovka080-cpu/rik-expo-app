import fs from "node:fs";
import path from "node:path";

describe("AI screen magic no fallback transport", () => {
  it("uses audited workflow/action registries instead of command-center fallback routing", () => {
    const roots = [
      path.join(process.cwd(), "src", "features", "ai", "screenMagic"),
      path.join(process.cwd(), "src", "features", "ai", "screenWorkflows"),
    ];
    const source = roots.flatMap((root) =>
      fs.readdirSync(root)
        .filter((file) => file.endsWith(".ts"))
        .map((file) => fs.readFileSync(path.join(root, file), "utf8")),
    )
      .join("\n");

    expect(source).toContain("screenWorkflows");
    expect(source).not.toMatch(/command_center fallback|generic chat fallback|prefix route matching|includes route matching/i);
    expect(source).not.toMatch(/fallbackBlueprint|needle\.includes/);
    expect(source).not.toMatch(/\?\?\s*getAiScreenWorkflowRegistryEntry\s*\(\s*resolveDefaultAiScreenWorkflowScreenId/);
    expect(source).toContain("BLOCKED_AI_SCREEN_WORKFLOW_EXACT_SCREEN_NOT_REGISTERED");
  });
});
