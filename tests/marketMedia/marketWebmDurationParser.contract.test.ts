type MarketplaceMediaModule = typeof import("../../src/screens/profile/profile.marketplaceMedia");

const previousSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const previousSupabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
let readWebmDurationMsFromArrayBuffer: MarketplaceMediaModule["readWebmDurationMsFromArrayBuffer"];

beforeAll(() => {
  process.env.EXPO_PUBLIC_SUPABASE_URL = "https://nxrnjywzxxfdpqmzjorh.supabase.co";
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
  jest.isolateModules(() => {
    ({ readWebmDurationMsFromArrayBuffer } =
      require("../../src/screens/profile/profile.marketplaceMedia") as MarketplaceMediaModule);
  });
});

afterAll(() => {
  if (previousSupabaseUrl == null) {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
  } else {
    process.env.EXPO_PUBLIC_SUPABASE_URL = previousSupabaseUrl;
  }
  if (previousSupabaseAnonKey == null) {
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  } else {
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = previousSupabaseAnonKey;
  }
});

function concatBytes(...chunks: readonly Uint8Array[]): Uint8Array {
  const length = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  chunks.forEach((chunk) => {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  });
  return output;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

function encodeEbmlSize(value: number): Uint8Array {
  if (!Number.isInteger(value) || value < 0 || value > 126) {
    throw new Error(`Test EBML size ${value} requires a larger encoder`);
  }
  return new Uint8Array([0x80 | value]);
}

function ebmlElement(id: readonly number[], content: Uint8Array): Uint8Array {
  return concatBytes(new Uint8Array(id), encodeEbmlSize(content.byteLength), content);
}

function ebmlUIntElement(id: readonly number[], value: number): Uint8Array {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`Invalid test EBML uint ${value}`);
  }
  const bytes: number[] = [];
  let remaining = value;
  do {
    bytes.unshift(remaining & 0xff);
    remaining = Math.floor(remaining / 256);
  } while (remaining > 0);
  return ebmlElement(id, new Uint8Array(bytes));
}

function ebmlFloat64Element(id: readonly number[], value: number): Uint8Array {
  const bytes = new Uint8Array(8);
  new DataView(bytes.buffer).setFloat64(0, value, false);
  return ebmlElement(id, bytes);
}

function webmBuffer(infoChildren: readonly Uint8Array[]): ArrayBuffer {
  const ebmlHeader = ebmlElement([0x1a, 0x45, 0xdf, 0xa3], ebmlUIntElement([0x42, 0x86], 1));
  const info = ebmlElement([0x15, 0x49, 0xa9, 0x66], concatBytes(...infoChildren));
  const segment = ebmlElement([0x18, 0x53, 0x80, 0x67], info);
  return toArrayBuffer(concatBytes(ebmlHeader, segment));
}

describe("market WebM duration parser", () => {
  it("reads duration from WebM Info using the default TimecodeScale", () => {
    const buffer = webmBuffer([
      ebmlFloat64Element([0x44, 0x89], 1200),
    ]);

    expect(readWebmDurationMsFromArrayBuffer(buffer)).toBe(1200);
  });

  it("applies TimecodeScale when converting Duration to milliseconds", () => {
    const buffer = webmBuffer([
      ebmlUIntElement([0x2a, 0xd7, 0xb1], 500_000),
      ebmlFloat64Element([0x44, 0x89], 3000),
    ]);

    expect(readWebmDurationMsFromArrayBuffer(buffer)).toBe(1500);
  });

  it("rejects missing, invalid, and over-limit durations", () => {
    const missingDuration = webmBuffer([
      ebmlUIntElement([0x2a, 0xd7, 0xb1], 1_000_000),
    ]);
    const invalidDuration = webmBuffer([
      ebmlFloat64Element([0x44, 0x89], Number.NaN),
    ]);
    const overLimitDuration = webmBuffer([
      ebmlFloat64Element([0x44, 0x89], 15_001),
    ]);

    expect(readWebmDurationMsFromArrayBuffer(missingDuration)).toBeNull();
    expect(readWebmDurationMsFromArrayBuffer(invalidDuration)).toBeNull();
    expect(readWebmDurationMsFromArrayBuffer(overLimitDuration)).toBeNull();
    expect(readWebmDurationMsFromArrayBuffer(toArrayBuffer(new Uint8Array([0x00, 0x01, 0x02])))).toBeNull();
  });
});
