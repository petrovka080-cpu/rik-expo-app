import fs from "node:fs";
import path from "node:path";

describe("AI estimate UI rewrite boundary", () => {
  it("does not patch estimate answers after render with useEffect rewrites", () => {
    const roots = ["app", "src/features"];
    const source = roots
      .filter((root) => fs.existsSync(path.join(process.cwd(), root)))
      .flatMap((root) => fs.readdirSync(path.join(process.cwd(), root), { recursive: true }).map(String).map((file) => path.join(root, file)))
      .filter((file) => /\.(ts|tsx)$/.test(file) && fs.statSync(path.join(process.cwd(), file)).isFile())
      .map((file) => fs.readFileSync(path.join(process.cwd(), file), "utf8"))
      .join("\n");
    expect(source).not.toMatch(/useEffect\([\s\S]{0,200}(rewrite|replace).*estimate/i);
  });
});
