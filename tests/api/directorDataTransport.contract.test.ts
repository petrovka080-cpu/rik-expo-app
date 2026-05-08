import fs from "fs";
import path from "path";
import { fetchDirectorRequestDisplayProbeRows } from "../../src/screens/director/director.data.transport";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const read = (relativePath: string) =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

describe("director data transport boundary", () => {
  it("keeps request display capability probing behind the transport boundary", () => {
    const serviceSource = read("src/screens/director/director.data.ts");
    const transportSource = read("src/screens/director/director.data.transport.ts");

    expect(serviceSource).toContain("director.data.transport");
    expect(serviceSource).toContain("fetchDirectorRequestDisplayProbeRows");
    expect(serviceSource).not.toContain('supabase.from("requests").select("*").limit(1)');
    expect(transportSource).toContain('supabase.from("requests").select("*").limit(1)');
  });

  it("preserves data and error probe result semantics", async () => {
    const expectedRows = [{ request_no: "REQ-1", display_no: "D-1" }];
    const successClient = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          limit: jest.fn(async () => ({ data: expectedRows, error: null })),
        })),
      })),
    };
    const failure = new Error("requests probe failed");
    const failureClient = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          limit: jest.fn(async () => ({ data: null, error: failure })),
        })),
      })),
    };

    await expect(fetchDirectorRequestDisplayProbeRows(successClient as never)).resolves.toEqual({
      data: expectedRows,
      error: null,
    });
    await expect(fetchDirectorRequestDisplayProbeRows(failureClient as never)).resolves.toEqual({
      data: null,
      error: failure,
    });
    expect(successClient.from).toHaveBeenCalledWith("requests");
    expect(failureClient.from).toHaveBeenCalledWith("requests");
  });
});
