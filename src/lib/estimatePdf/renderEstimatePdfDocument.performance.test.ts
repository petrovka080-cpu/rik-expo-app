import { bytesToBase64 } from "./renderEstimatePdfDocument";

describe("bytesToBase64", () => {
  test("preserves RFC 4648 output across chunk boundaries", () => {
    expect(bytesToBase64(new Uint8Array([]))).toBe("");
    expect(bytesToBase64(new Uint8Array([0x66]))).toBe("Zg==");
    expect(bytesToBase64(new Uint8Array([0x66, 0x6f]))).toBe("Zm8=");
    expect(bytesToBase64(new Uint8Array([0x66, 0x6f, 0x6f]))).toBe("Zm9v");

    const bytes = new Uint8Array(12_291);
    for (let index = 0; index < bytes.length; index += 1) bytes[index] = index % 251;
    const expected = Buffer.from(bytes).toString("base64");
    expect(bytesToBase64(bytes)).toBe(expected);
  });

  test("encodes a production-sized PDF payload without quadratic latency", () => {
    const bytes = new Uint8Array(2_500_000);
    for (let index = 0; index < bytes.length; index += 1) bytes[index] = index % 251;

    const startedAt = Date.now();
    const encoded = bytesToBase64(bytes);

    expect(encoded).toBe(Buffer.from(bytes).toString("base64"));
    expect(Date.now() - startedAt).toBeLessThan(5_000);
  });
});
