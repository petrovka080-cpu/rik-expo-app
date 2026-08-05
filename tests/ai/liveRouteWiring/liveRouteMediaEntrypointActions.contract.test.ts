import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("AI live route media entrypoint actions", () => {
  it("keeps marketplace photo suggestion actions wired to real replace and remove handlers", () => {
    const mediaPanel = read("src/features/ai/liveRouteWiring/LiveRouteMediaEntrypointPanel.tsx");

    expect(mediaPanel).toContain("private readonly replaceMedia = async (mediaAssetId?: string)");
    expect(mediaPanel).toContain("private readonly removeMedia = ()");
    expect(mediaPanel).toContain("mediaAssetIds: uploadedItems.map((item) => item.mediaAssetId)");
    expect(mediaPanel).toContain("mediaPublicUrls: uploadedItems.flatMap");
    expect(mediaPanel).toContain("mediaAssetIds: []");
    expect(mediaPanel).toContain("mediaPublicUrls: []");
    expect(mediaPanel).toContain('testID={`${copy.testID}.suggestion.change`}');
    expect(mediaPanel).toContain("void this.replaceMedia();");
    expect(mediaPanel).toContain('testID={`${copy.testID}.suggestion.remove`}');
    expect(mediaPanel).toContain("onPress={this.removeMedia}");
  });
});
