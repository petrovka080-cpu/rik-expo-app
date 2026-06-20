import fs from "node:fs";
import path from "node:path";

function read(filePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), filePath), "utf8");
}

describe("Android harness text input contracts", () => {
  it("types email values as one adb input payload instead of splitting at @", () => {
    const source = read("scripts/_shared/androidHarness.ts");

    expect(source).toContain('adb(["shell", "input", "text", escapeAndroidInputText(text)])');
    expect(source).not.toContain('chunk === "@"');
    expect(source).not.toContain("pressAndroidKey(77)");
    expect(source).not.toContain('.replace(/@/g, "\\\\@")');
  });

  it("opens protected route before login fill when the first surface is not the login screen", () => {
    const source = read("scripts/_shared/androidHarness.ts");

    expect(source).toContain('artifactBase: `${params.artifactBase}-initial-protected-route`');
    expect(source).toContain("predicate: (xml) => params.successPredicate(xml) || isLoginScreen(xml)");
    expect(source.indexOf("initial-protected-route")).toBeLessThan(source.indexOf("ensureExactLoginFieldText"));
  });
});
