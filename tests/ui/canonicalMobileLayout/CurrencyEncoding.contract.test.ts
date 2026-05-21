import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("canonical currency encoding", () => {
  it("does not render mojibake currency in buyer subcontract cards", () => {
    const source = read("src/screens/buyer/BuyerSubcontractTab.view.tsx");

    expect(source).toContain("\\u0441\\u043e\\u043c");
    expect(source).not.toContain("cГ");
    expect(source).not.toContain("СЃРѕРј");
    expect(source).not.toContain("РЎРѓ");
  });
});
