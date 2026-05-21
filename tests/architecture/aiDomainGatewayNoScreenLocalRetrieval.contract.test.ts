import fs from "fs";
import path from "path";
import { listFilesRecursive, repoRoot } from "./aiDomainGatewayArchitectureTestHelpers";

describe("AI Domain Gateway architecture - no screen-local retrieval", () => {
  it("is not imported directly by screens", () => {
    const screenFiles = listFilesRecursive(path.join(repoRoot, "src", "screens"), (file) => /\.(tsx?|jsx?)$/.test(file));
    const offenders = screenFiles.filter((file) =>
      fs.readFileSync(file, "utf8").includes("domainDataGateway"),
    );
    expect(offenders).toEqual([]);
  });
});
