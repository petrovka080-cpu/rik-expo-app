import fs from "node:fs";
import path from "node:path";

const sourcePath = path.join(process.cwd(), "src", "screens", "director", "director.finance.panel.ts");

describe("director finance panel hook discipline", () => {
  it("does not suppress exhaustive-deps for finance PDF callbacks", () => {
    const source = fs.readFileSync(sourcePath, "utf8");

    expect(source).not.toContain("react-hooks/exhaustive-deps");
    expect(source).not.toContain("TODO(P1): review deps");
    expect(source).toMatch(/const pdfOpener = useMemo/);
    expect(source).toMatch(/pdfOpener,\s*router,\s*supabase/s);
  });
});
