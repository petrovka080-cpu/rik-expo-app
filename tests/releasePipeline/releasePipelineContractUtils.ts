import fs from "node:fs";
import path from "node:path";

export const readProjectFile = (relativePath: string): string =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

export const expectFileToContain = (relativePath: string, text: string): void => {
  expect(readProjectFile(relativePath)).toContain(text);
};

export const expectFileNotToMatch = (relativePath: string, pattern: RegExp): void => {
  expect(readProjectFile(relativePath)).not.toMatch(pattern);
};
