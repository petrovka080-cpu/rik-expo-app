import fs from "node:fs";
import path from "node:path";

const root = path.join(process.cwd(), "src", "features", "ai", "screenMagic");

function readSources(): string {
  return fs.readdirSync(root)
    .filter((file) => file.endsWith(".ts"))
    .map((file) => fs.readFileSync(path.join(root, file), "utf8"))
    .join("\n");
}

describe("AI screen magic no hooks/no kostyl architecture", () => {
  it("does not add hook-based orchestration or hidden shim language", () => {
    const source = readSources();

    expect(source).not.toMatch(/\buse[A-Z][A-Za-z0-9_]*\s*\(/);
    expect(source).not.toMatch(/temporary hook|testID-only shim|hidden shim|kostyl|костыл/i);
  });
});
