import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("UI canonical layout currency no mojibake", () => {
  it("blocks known mojibake currency fragments in buyer visible cards", () => {
    const source = read("src/screens/buyer/BuyerSubcontractTab.view.tsx");

    expect(source).not.toMatch(/cГ|СЃРѕРј|РЎРѓ/);
  });
});
