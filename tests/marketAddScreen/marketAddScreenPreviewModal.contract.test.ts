import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("market add screen preview modal contract", () => {
  it("keeps the media preview modal portal-safe with real actions", () => {
    const panel = read("src/features/ai/liveRouteWiring/LiveRouteMediaEntrypointPanel.tsx");
    const safeModal = read("src/ui/React19SafeModal.tsx");
    const webPortal = read("src/ui/createWebPortal.web.tsx");

    expect(panel).toContain("renderPreviewModal");
    expect(panel).toContain("React19SafeModal");
    expect(panel).toContain(".preview-modal.image");
    expect(panel).toContain(".preview-modal.video");
    expect(panel).toContain(".preview-modal.kind-badge");
    expect(panel).toContain(".preview-modal.replace");
    expect(panel).toContain(".preview-modal.remove");
    expect(panel).toContain(".preview-modal.close");
    expect(safeModal).toContain("createWebPortal");
    expect(webPortal).toContain("createPortal");
  });
});
