import fs from "fs";
import path from "path";

const sourcePath = path.join(process.cwd(), "src/screens/director/director.request.ts");
const source = fs.readFileSync(sourcePath, "utf8");

describe("director request PDF fallback contract", () => {
  it("uses the opened request-card rows as the primary director PDF source", () => {
    expect(source).toContain("buildDirectorRequestSnapshotPdfDescriptor");
    expect(source).toContain(
      "await buildDirectorRequestSnapshotPdfDescriptor(g, title, rid, fileName)",
    );
    expect(source).toContain("prepareAndPreviewFromDescriptorFactory");
  });

  it("does not fall through to canonical lookup when the opened card already has rows", () => {
    expect(source).toContain("const hasSnapshotRows");
    expect(source).toContain("if (hasSnapshotRows) throw snapshotError");
    expect(source).toContain("generateRequestPdfDocument(rid)");
    expect(source).toContain("catch (snapshotError)");
    expect(source).toContain(
      'exportRequestPdfFromModel(model, "director_request_sheet_snapshot")',
    );
  });

  it("does not leak technical source labels or app codes into the director snapshot PDF", () => {
    expect(source).not.toContain('"Источник"');
    expect(source).not.toContain('"Карточка директора"');
    expect(source).not.toContain("row.app_code, row.note");
    expect(source).toContain("officeHumanLabel");
    expect(source).toContain("officeUomLabel");
  });
});
