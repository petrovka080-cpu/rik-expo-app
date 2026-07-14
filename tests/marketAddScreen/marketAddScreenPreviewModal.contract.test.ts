import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("market add screen preview modal contract", () => {
  it("keeps marketplace media preview inline without portal modal fallback", () => {
    const panel = read("src/features/ai/liveRouteWiring/LiveRouteMediaEntrypointPanel.tsx");
    const safeModal = read("src/ui/React19SafeModal.tsx");
    const webPortal = read("src/ui/createWebPortal.web.tsx");

    expect(panel).toContain(".preview-image.");
    expect(panel).toContain(".thumbnail.replace.");
    expect(panel).toContain(".thumbnail.remove.");
    expect(panel).not.toContain("renderPreviewModal");
    expect(panel).not.toContain("React19SafeModal");
    expect(panel).not.toContain(".preview-modal");
    expect(safeModal).toContain("createWebPortal");
    expect(webPortal).toContain("createPortal");
  });
});
