import fs from "fs";
import path from "path";
import { loadMapScreenCurrentAuthUser } from "../../src/components/map/MapScreen.auth.transport";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const read = (relativePath: string) =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

describe("MapScreen auth transport boundary", () => {
  it("keeps MapScreen auth reads behind the transport boundary", () => {
    const screenSource = read("src/components/map/MapScreen.tsx");
    const transportSource = read("src/components/map/MapScreen.auth.transport.ts");

    expect(screenSource).toContain("MapScreen.auth.transport");
    expect(screenSource).not.toContain("supabase.auth.getUser");
    expect(screenSource).not.toContain("auth.getUser");
    expect(transportSource).toContain("auth.getUser");
    expect(transportSource).toContain("loadMapScreenCurrentAuthUser");
  });

  it("returns the current auth user without transforming identity", async () => {
    const user = { id: "user-1" };
    const supabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user },
        }),
      },
    };

    await expect(loadMapScreenCurrentAuthUser({ supabase })).resolves.toBe(user);
  });
});
