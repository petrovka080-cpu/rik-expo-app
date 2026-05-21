import fs from "node:fs";

export function readReleaseCloseoutRunner(): string {
  return fs.readFileSync("scripts/release/runAiEnterpriseReleaseCloseoutChangeControl.ts", "utf8");
}
