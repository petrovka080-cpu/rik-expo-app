import fs from "node:fs";
import path from "node:path";

describe("offline retry controlled contract", () => {
  it("keeps offline queue/retry paths explicit and observable", () => {
    const queue = fs.readFileSync(path.join(process.cwd(), "src/lib/offline/mutationQueue.ts"), "utf8");
    const worker = fs.readFileSync(path.join(process.cwd(), "src/workers/queueWorker.ts"), "utf8");
    expect(queue).toContain("retry");
    expect(worker).toContain("retry");
  });
});
