import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("market add screen console clean smoke contract", () => {
  it("fails the web and Android Chrome smoke on publish-path console warnings or errors", () => {
    const smoke = read("scripts/market_add_web_media_publish_smoke.ts");

    expect(smoke).toContain("pageErrorCount");
    expect(smoke).toContain("consoleErrorCount");
    expect(smoke).toContain("consoleWarnCount");
    expect(smoke).toContain("consoleWarnUnclassifiedMessages");
    expect(smoke).toContain("classifyKnownBootConsoleWarning");
    expect(smoke).toContain('message.type() === "error"');
    expect(smoke).toContain('message.type() === "warning"');
    expect(smoke).toContain("runtime.consoleErrorCount === 0");
    expect(smoke).toContain("runtime.consoleWarnUnclassifiedMessages.length === 0");
    expect(smoke).toContain("capture.unhandledRequests.length === 0");
  });
});
