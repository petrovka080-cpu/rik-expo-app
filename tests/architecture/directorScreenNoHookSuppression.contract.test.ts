import fs from "node:fs";
import path from "node:path";

const sourcePath = path.join(process.cwd(), "src", "screens", "director", "DirectorScreen.tsx");

describe("director screen hook discipline", () => {
  it("does not suppress exhaustive-deps for director report PDF callbacks", () => {
    const source = fs.readFileSync(sourcePath, "utf8");

    expect(source).not.toContain("react-hooks/exhaustive-deps");
    expect(source).not.toContain("TODO(P1): review deps");
    expect(source).toContain("const reportsPdfOpener = React.useMemo");
    expect(source).toMatch(/busy,\s*reportsPdfOpener,\s*router/s);
  });
});
