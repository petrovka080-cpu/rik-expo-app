import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("market scope RPC image and video urls contract", () => {
  it("returns canonical image_urls and video_urls from page and detail RPCs", () => {
    const migration = read("supabase/migrations/20260630190000_marketplace_scope_feed_detail_fast_gallery_v2.sql");
    const repo = read("src/features/market/market.repository.ts");
    const transport = read("src/features/market/market.repository.transport.ts");
    const types = read("src/features/market/marketHome.types.ts");

    expect(migration).toContain("create or replace function public.marketplace_items_scope_page_v1");
    expect(migration).toContain("create or replace function public.marketplace_item_scope_detail_v1");
    expect(migration).toContain("image_url text");
    expect(migration).toContain("image_urls jsonb");
    expect(migration).toContain("video_url text");
    expect(migration).toContain("video_urls jsonb");
    expect(migration).toContain("public.marketplace_listing_public_image_urls_v1(pl.id, 5)");
    expect(migration).toContain("public.marketplace_listing_public_video_urls_v1(pl.id, 1)");
    expect(migration).toContain("public.marketplace_listing_public_image_urls_v1(tl.id, 5)");
    expect(migration).toContain("public.marketplace_listing_public_video_urls_v1(tl.id, 1)");
    expect(repo).toContain("marketplaceImageUrlsFromScope");
    expect(repo).toContain("marketplaceVideoUrlsFromScope");
    expect(repo).toContain('rpcName: "marketplace_items_scope_page_v1"');
    expect(repo).toContain('rpcName: "marketplace_item_scope_detail_v1"');
    expect(transport).toContain('supabase.rpc("marketplace_items_scope_page_v1"');
    expect(transport).toContain('rpc("marketplace_item_scope_detail_v1"');
    expect(types).toContain("image_urls?: unknown");
    expect(types).toContain("video_urls?: unknown");
  });
});
