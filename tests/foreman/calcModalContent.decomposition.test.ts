import * as fs from "fs";
import * as path from "path";

import {
  BOTTOM_BAR_HEIGHT,
  SHADOW_CARD,
  SHADOW_STICKY,
  cs,
} from "../../src/components/foreman/CalcModalContent.styles";

function readRepoFile(relativePath: string) {
  return fs.readFileSync(path.resolve(__dirname, "../..", relativePath), "utf8");
}

describe("CalcModalContent decomposition", () => {
  it("keeps static visual constants in the style boundary", () => {
    expect(BOTTOM_BAR_HEIGHT).toBe(72);
    expect(SHADOW_CARD).toBeTruthy();
    expect(SHADOW_STICKY).toBeTruthy();
    expect(cs.outerWrap).toBeTruthy();
    expect(cs.calcOverlay).toBeTruthy();
  });

  it("keeps CalcModalContent focused on render wiring instead of local StyleSheet ownership", () => {
    const contentSource = readRepoFile(
      "src/components/foreman/CalcModalContent.tsx",
    );
    const stylesSource = readRepoFile(
      "src/components/foreman/CalcModalContent.styles.ts",
    );

    expect(contentSource).toContain("CalcModalContent.styles");
    expect(contentSource).not.toContain("StyleSheet.create");
    expect(contentSource).not.toContain("const SHADOW_CARD");
    expect(contentSource).not.toContain("const BOTTOM_BAR_HEIGHT");
    expect(stylesSource).toContain("StyleSheet.create");
    expect(stylesSource).toContain("SHADOW_CARD");
    expect(stylesSource).toContain("BOTTOM_BAR_HEIGHT");
  });
});
