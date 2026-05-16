import fs from "fs";
import path from "path";

describe("AI screen-native assistants do not fake business data", () => {
  it("keeps fake data disabled and avoids hardcoded business facts", () => {
    const dir = path.join(process.cwd(), "src/features/ai/screenNative");
    const source = fs.readdirSync(dir)
      .filter((file) => file.endsWith(".ts"))
      .map((file) => fs.readFileSync(path.join(dir, file), "utf8"))
      .join("\n");

    expect(source).toContain("fakeDataUsed: false");
    expect(source).not.toMatch(/Supplier A|Supplier B|1 200 000 ₸|4 850 000 ₸/);
  });
});
