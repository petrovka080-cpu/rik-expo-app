import * as fs from "fs";
import * as path from "path";

describe("consumer repair no unbounded history queries architecture", () => {
  it("keeps consumer history cursor-paginated and capped", () => {
    const repository = fs.readFileSync(path.join(process.cwd(), "src/lib/consumerRequests/consumerRequestRepository.ts"), "utf8");
    const service = fs.readFileSync(path.join(process.cwd(), "src/lib/consumerRequests/consumerRequestService.ts"), "utf8");

    expect(repository).toContain("cursorCreatedAt");
    expect(repository).toContain("Math.min(Math.max(options.limit ?? 20, 1), 20)");
    expect(repository).toContain(".slice(0, limit)");
    expect(service).toContain("limit: options.limit ?? 20");
    expect([repository, service].join("\n")).not.toMatch(/select\(["']\*["']\)|select\(\*\)/i);
  });
});
