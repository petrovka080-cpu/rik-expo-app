import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("bottom nav does not delete existing tabs", () => {
  it("keeps all five route tabs registered in the tabs layout", () => {
    const tabs = read("app/(tabs)/_layout.tsx");

    for (const routeName of [
      "office",
      "request/index",
      "market",
      "chat",
      "profile",
    ]) {
      expect(tabs).toContain(`name="${routeName}"`);
    }
  });

  it("keeps all five route tabs visible in the custom bottom nav", () => {
    const nav = read("app/(tabs)/_layout.tsx");

    for (const testID of [
      "bottom-tab-office",
      "bottom-tab-request",
      "bottom-tab-market",
      "bottom-tab-chat",
      "bottom-tab-profile",
    ]) {
      expect(nav).toContain(testID);
    }
  });
});
