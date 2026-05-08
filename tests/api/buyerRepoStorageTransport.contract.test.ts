import { readFileSync } from "fs";
import { join } from "path";

const root = join(__dirname, "..", "..");

const read = (relativePath: string) =>
  readFileSync(join(root, relativePath), "utf8");

const directClientCall = (member: string) => `supabase.${member}`;

describe("buyer repo storage transport boundary", () => {
  it("keeps proposal attachment signed-url provider calls behind the typed transport", () => {
    const repoSource = read("src/screens/buyer/buyer.repo.ts");
    const transportSource = read("src/screens/buyer/buyer.repo.storage.transport.ts");

    expect(repoSource).toContain('from "./buyer.repo.storage.transport"');
    expect(repoSource).toContain("createBuyerProposalAttachmentSignedUrl({");
    expect(repoSource).not.toContain(directClientCall("storage"));
    expect(repoSource).not.toContain(".createSignedUrl(path, 60 * 60)");

    expect(transportSource).toContain("type BuyerRepoStorageBucket");
    expect(transportSource).toContain("type BuyerRepoSignedUrlResult");
    expect(transportSource).toContain("createBuyerProposalAttachmentSignedUrl");
    expect(transportSource).toContain(directClientCall("storage"));
    expect(transportSource).toContain(".from(params.bucketId)");
    expect(transportSource).toContain(
      ".createSignedUrl(params.storagePath, params.expiresInSeconds)",
    );
  });

  it("keeps fallback behavior and observability ownership in the repository", () => {
    const repoSource = read("src/screens/buyer/buyer.repo.ts");
    const transportSource = read("src/screens/buyer/buyer.repo.storage.transport.ts");

    expect(repoSource).toContain("recordCatchDiscipline({");
    expect(repoSource).toContain('event: "proposal_attachment_signed_url_failed"');
    expect(repoSource).toContain('sourceKind: "supabase:storage_signed_url"');
    expect(repoSource).toContain("url = String(s?.data?.signedUrl || \"\").trim()");
    expect(transportSource).not.toContain("recordCatchDiscipline");
    expect(transportSource).not.toContain("proposal_attachment_signed_url_failed");
  });
});
