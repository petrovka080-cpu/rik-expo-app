import fs from "fs";
import path from "path";

export const documentEvidenceRoot = path.resolve(
  __dirname,
  "../../src/lib/documents/evidenceIntelligence",
);

export function readDocumentEvidenceSources(): string {
  const files: string[] = [];
  const visit = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        visit(full);
      } else if (/\.ts$/.test(entry.name)) {
        files.push(fs.readFileSync(full, "utf8"));
      }
    }
  };
  visit(documentEvidenceRoot);
  return files.join("\n");
}

export function listDocumentEvidenceFiles(): string[] {
  const files: string[] = [];
  const visit = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        visit(full);
      } else if (/\.ts$/.test(entry.name)) {
        files.push(path.relative(path.resolve(__dirname, "../.."), full).replace(/\\/g, "/"));
      }
    }
  };
  visit(documentEvidenceRoot);
  return files;
}
