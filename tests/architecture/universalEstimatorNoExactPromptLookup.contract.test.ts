import fs from "node:fs";
import path from "node:path";

function sources(root: string): string {
  const absolute = path.join(process.cwd(), root);
  if (!fs.existsSync(absolute)) return "";
  return fs.readdirSync(absolute, { withFileTypes: true }).map((entry) => {
    const relative = path.join(root, entry.name).replace(/\\/g, "/");
    if (entry.isDirectory()) return sources(relative);
    if (!entry.name.endsWith(".ts") || relative.includes("/fixtures/")) return "";
    return fs.readFileSync(path.join(process.cwd(), relative), "utf8");
  }).join("\n");
}

describe("universal estimator architecture no exact prompt lookup", () => {
  it("uses semantic tokens and quantities instead of full prompt equality", () => {
    const source = [sources("src/lib/ai/estimatorKernel"), sources("src/lib/ai/professionalBoq")].join("\n");
    expect(source).not.toMatch(/prompt\s*={2,3}\s*["'`]/);
    expect(source).not.toContain("смета на установку лифта пассажирского на 14 этажей");
    expect(source).not.toContain("смета на дренажные каналы 120 метров");
  });
});
