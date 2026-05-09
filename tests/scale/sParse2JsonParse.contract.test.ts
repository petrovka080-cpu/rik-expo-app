import fs from "fs";
import path from "path";

const readProjectFile = (path: string) => fs.readFileSync(path, "utf8");

const walkSourceFiles = (dir: string): string[] => {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "__tests__") return [];
      return walkSourceFiles(fullPath);
    }
    if (!/\.(ts|tsx)$/.test(entry.name)) return [];
    if (entry.name.includes(".test.") || entry.name.includes(".spec.")) return [];
    return [fullPath.replace(/\\/g, "/")];
  });
};

describe("S-PARSE-2 JSON parse hardening contracts", () => {
  const hardenedFiles = [
    "src/lib/api/proposalIntegrity.ts",
    "src/lib/ai/geminiGateway.ts",
    "src/lib/pdf/directorPdfPlatformContract.ts",
    "src/screens/contractor/contractor.utils.ts",
    "src/screens/foreman/foreman.ai.ts",
  ];

  it("routes externally sourced JSON parsing through safeJsonParse", () => {
    for (const file of hardenedFiles) {
      const source = readProjectFile(file);

      expect(source).toContain("safeJsonParse");
      expect(source).not.toContain("JSON.parse");
    }
  });

  it("leaves only the central helper as a direct JSON.parse owner", () => {
    const remaining = [...walkSourceFiles("src"), ...walkSourceFiles("app")].flatMap((file) => {
      const source = readProjectFile(file);
      return [...source.matchAll(/JSON\.parse/g)].map(() => file);
    });

    expect(remaining).toEqual(["src/lib/format.ts"]);
  });
});
