import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "../..");
export const AI_LIVE_SCREEN_COPILOT_SRC = path.join(ROOT, "src", "lib", "ai", "liveScreenCopilot");

export function readAiLiveScreenCopilotSources(): { file: string; text: string }[] {
  return fs.readdirSync(AI_LIVE_SCREEN_COPILOT_SRC)
    .filter((file) => file.endsWith(".ts"))
    .map((file) => ({
      file,
      text: fs.readFileSync(path.join(AI_LIVE_SCREEN_COPILOT_SRC, file), "utf8"),
    }));
}

export function joinedAiLiveScreenCopilotSources(): string {
  return readAiLiveScreenCopilotSources().map((entry) => `// ${entry.file}\n${entry.text}`).join("\n");
}
