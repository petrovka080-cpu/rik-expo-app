import fs from "node:fs";
import path from "node:path";

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

describe("global estimate no live web blocking", () => {
  it("does not call public web/network APIs in the request path", () => {
    const files = walk(path.join(process.cwd(), "src", "lib", "ai", "globalEstimate")).filter((file) => file.endsWith(".ts"));
    const offenders = files.filter((file) => /\bfetch\s*\(|XMLHttpRequest|axios|https?:\/\//.test(fs.readFileSync(file, "utf8")));
    expect(offenders).toEqual([]);
  });
});
