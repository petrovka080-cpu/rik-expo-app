import fs from "fs";
import path from "path";
import { createWarehouseNameMapUiQuery } from "../../src/screens/warehouse/warehouse.nameMap.ui.transport";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const read = (relativePath: string) =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

describe("warehouse name-map transport boundary", () => {
  it("keeps the readonly warehouse_name_map_ui read behind the transport boundary", () => {
    const serviceSource = read("src/screens/warehouse/warehouse.nameMap.ui.ts");
    const transportSource = read("src/screens/warehouse/warehouse.nameMap.ui.transport.ts");

    expect(serviceSource).toContain("warehouse.nameMap.ui.transport");
    expect(serviceSource).toContain("createWarehouseNameMapUiQuery");
    expect(serviceSource).not.toContain('supabase.from("warehouse_name_map_ui"');
    expect(serviceSource).toContain('supabase.rpc("warehouse_refresh_name_map_ui"');
    expect(transportSource).toContain('from("warehouse_name_map_ui" as never)');
    expect(transportSource).toContain('.select("code, display_name")');
    expect(transportSource).toContain('.order("code", { ascending: true })');
  });

  it("preserves query-builder chaining semantics", () => {
    const order = jest.fn(() => "query");
    const query = {
      select: jest.fn(() => ({
        in: jest.fn(() => ({ order })),
      })),
    };
    const supabase = {
      from: jest.fn(() => query),
    };

    expect(createWarehouseNameMapUiQuery(supabase as never, ["A", "B"])).toBe("query");
    expect(supabase.from).toHaveBeenCalledWith("warehouse_name_map_ui");
    expect(query.select).toHaveBeenCalledWith("code, display_name");
    expect(order).toHaveBeenCalledWith("code", { ascending: true });
  });
});
