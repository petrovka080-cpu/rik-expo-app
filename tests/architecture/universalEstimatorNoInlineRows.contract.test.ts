import fs from "node:fs";
import path from "node:path";

describe("universal estimator no inline rows in screens", () => {
  it("does not put BOQ row literals into screen files", () => {
    const appSource = fs.readdirSync(path.join(process.cwd(), "app"), { recursive: true })
      .filter((file): file is string => typeof file === "string" && /\.(ts|tsx)$/.test(file))
      .map((file) => fs.readFileSync(path.join(process.cwd(), "app", file), "utf8"))
      .join("\n");
    expect(appSource).not.toMatch(/пассажирская кабина|дренажные лотки|вязка арматуры/);
  });
});
