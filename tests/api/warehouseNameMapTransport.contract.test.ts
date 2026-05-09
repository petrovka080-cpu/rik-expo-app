import fs from "fs";
import path from "path";
import {
  callWarehouseRefreshNameMapUiRpc,
  createWarehouseNameMapUiQuery,
} from "../../src/screens/warehouse/warehouse.nameMap.ui.transport";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const read = (relativePath: string) =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

describe("warehouse name-map transport boundary", () => {
  it("keeps the readonly warehouse_name_map_ui read behind the transport boundary", () => {
    const serviceSource = read("src/screens/warehouse/warehouse.nameMap.ui.ts");
    const transportSource = read("src/screens/warehouse/warehouse.nameMap.ui.transport.ts");

    expect(serviceSource).toContain("warehouse.nameMap.ui.transport");
    expect(serviceSource).toContain("createWarehouseNameMapUiQuery");
    expect(serviceSource).toContain("callWarehouseRefreshNameMapUiRpc");
    expect(serviceSource).not.toContain('supabase.from("warehouse_name_map_ui"');
    expect(serviceSource).not.toContain('supabase.rpc("warehouse_refresh_name_map_ui"');
    expect(transportSource).toContain('from("warehouse_name_map_ui" as never)');
    expect(transportSource).toContain('.select("code, display_name")');
    expect(transportSource).toContain('.order("code", { ascending: true })');
    expect(transportSource).toContain('supabase.rpc("warehouse_refresh_name_map_ui" as never');
    expect(transportSource).toContain("WarehouseRefreshNameMapUiRpcArgs");
  });

  it("preserves query-builder chaining semantics", async () => {
    const rangeResult = { data: [{ code: "A", display_name: "Alpha" }], error: null };
    const range = jest.fn(async () => rangeResult);
    const order = jest.fn(() => ({ range }));
    const query = {
      select: jest.fn(() => ({
        in: jest.fn(() => ({ order })),
      })),
    };
    const supabase = {
      from: jest.fn(() => query),
    };

    const pagedQuery = createWarehouseNameMapUiQuery(supabase as never, ["A", "B"]);

    await expect(pagedQuery.range(0, 99)).resolves.toEqual(rangeResult);
    expect(supabase.from).toHaveBeenCalledWith("warehouse_name_map_ui");
    expect(query.select).toHaveBeenCalledWith("code, display_name");
    expect(order).toHaveBeenCalledWith("code", { ascending: true });
    expect(range).toHaveBeenCalledWith(0, 99);
  });

  it("rejects malformed name-map rows before they reach the service layer", async () => {
    const range = jest.fn(async () => ({ data: [null], error: null }));
    const order = jest.fn(() => ({ range }));
    const query = {
      select: jest.fn(() => ({
        in: jest.fn(() => ({ order })),
      })),
    };
    const supabase = {
      from: jest.fn(() => query),
    };

    const result = await createWarehouseNameMapUiQuery(supabase as never, ["A"]).range(0, 99);

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(String(result.error)).toContain("warehouse.nameMapUi.warehouse_name_map_ui");
  });

  it("keeps the refresh RPC provider call typed and transport-owned", async () => {
    const result = { data: 4, error: null };
    const supabase = {
      rpc: jest.fn(async () => result),
    };
    const payload = {
      p_code_list: ["A", "B"],
      p_refresh_mode: "incremental" as const,
    };

    await expect(callWarehouseRefreshNameMapUiRpc(supabase as never, payload)).resolves.toBe(result);
    expect(supabase.rpc).toHaveBeenCalledWith("warehouse_refresh_name_map_ui", payload);
  });
});
