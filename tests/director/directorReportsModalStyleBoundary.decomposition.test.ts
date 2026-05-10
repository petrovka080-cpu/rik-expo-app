import fs from "fs";
import path from "path";

const read = (relativePath: string): string =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("DirectorReportsModal style boundary", () => {
  it("keeps report modal styles behind a permanent style module", () => {
    const modalSource = read("src/screens/director/DirectorReportsModal.tsx");
    const stylesSource = read("src/screens/director/DirectorReportsModal.styles.ts");

    expect(modalSource).toContain('import { styles } from "./DirectorReportsModal.styles";');
    expect(modalSource).not.toContain("StyleSheet.create");
    expect(stylesSource).toContain("export const styles = StyleSheet.create");
    expect(stylesSource).toContain('import { UI } from "./director.styles";');
  });

  it("preserves critical reports modal test ids and actions", () => {
    const modalSource = read("src/screens/director/DirectorReportsModal.tsx");

    expect(modalSource).toContain('modalTestID="director-reports-modal"');
    expect(modalSource).toContain('testIdPrefix="director-reports"');
    expect(modalSource).toContain("director-reports-tab-${tab}");
    expect(modalSource).toContain("onPdf={() => void onExportProductionPdf?.()}");
    expect(modalSource).toContain("onPdfSecondary={() => void onExportSubcontractPdf?.()}");
  });

  it("keeps the modal source below the post-split size budget", () => {
    const modalSource = read("src/screens/director/DirectorReportsModal.tsx");
    const hookCalls =
      modalSource.match(/\buse[A-Z][A-Za-z0-9_]*\s*\(|React\.use[A-Z][A-Za-z0-9_]*\s*\(/g) ?? [];

    expect(modalSource.split("\n").length).toBeLessThanOrEqual(570);
    expect(hookCalls.length).toBeLessThanOrEqual(20);
  });
});
