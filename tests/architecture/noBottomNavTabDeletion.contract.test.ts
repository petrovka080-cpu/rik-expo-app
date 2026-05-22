import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("no bottom nav tab deletion architecture contract", () => {
  it("preserves every required bottom nav route and label", () => {
    const tabs = read("app/(tabs)/_layout.tsx");
    const nav = read("app/(tabs)/_layout.tsx");

    for (const [routeName, label] of [
      ["office", "Офис"],
      ["request/index", "Смета"],
      ["market", "Маркет"],
      ["chat", "Чат"],
      ["profile", "Профиль"],
    ]) {
      expect(tabs).toContain(`name="${routeName}"`);
      expect(nav).toContain(`label: "${label}"`);
    }
  });
});
