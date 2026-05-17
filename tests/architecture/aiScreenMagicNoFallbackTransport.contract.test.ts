import fs from "node:fs";
import path from "node:path";

describe("AI screen magic no fallback transport", () => {
  it("uses audited workflow/action registries instead of command-center fallback routing", () => {
    const source = fs.readdirSync(path.join(process.cwd(), "src", "features", "ai", "screenMagic"))
      .filter((file) => file.endsWith(".ts"))
      .map((file) => fs.readFileSync(path.join(process.cwd(), "src", "features", "ai", "screenMagic", file), "utf8"))
      .join("\n");

    expect(source).toContain("screenWorkflows");
    expect(source).not.toMatch(/command_center fallback|generic chat fallback|prefix route matching|includes route matching/i);
  });
});
