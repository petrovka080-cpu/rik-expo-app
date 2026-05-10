import { readFileSync } from "fs";
import { join } from "path";
import { MAP_SCREEN_UI } from "../../src/components/map/MapScreen.styles";

const MAP_SCREEN_PATH = join(__dirname, "..", "..", "src", "components", "map", "MapScreen.tsx");
const MAP_SCREEN_VIEW_PATH = join(__dirname, "..", "..", "src", "components", "map", "MapScreenView.tsx");
const MAP_SCREEN_STYLES_PATH = join(
  __dirname,
  "..",
  "..",
  "src",
  "components",
  "map",
  "MapScreen.styles.ts",
);

describe("MapScreen decomposition", () => {
  const mapScreenSource = readFileSync(MAP_SCREEN_PATH, "utf8");
  const mapScreenViewSource = readFileSync(MAP_SCREEN_VIEW_PATH, "utf8");
  const stylesSource = readFileSync(MAP_SCREEN_STYLES_PATH, "utf8");

  it("keeps static styles in the dedicated typed boundary", () => {
    expect(mapScreenSource).toContain("MapScreenContainer");
    expect(mapScreenViewSource).toContain('from "./MapScreen.styles"');
    expect(mapScreenSource).not.toContain("StyleSheet.create({");
    expect(mapScreenViewSource).not.toContain("StyleSheet.create({");
    expect(stylesSource).toContain("StyleSheet.create({");
  });

  it("preserves the modal color contract", () => {
    expect(MAP_SCREEN_UI.bg).toBe("#020617");
    expect(MAP_SCREEN_UI.text).toBe("#F9FAFB");
    expect(MAP_SCREEN_UI.sub).toBe("#9CA3AF");
    expect(MAP_SCREEN_UI.border).toBe("#1F2937");
    expect(MAP_SCREEN_UI.ok).toBe("#22C55E");
  });
});
