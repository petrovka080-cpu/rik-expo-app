import type { OfflineStorageAdapter } from "../../src/lib/offline/offlineStorage";
import {
  createMobilePhotoLocalRepository,
  type MobilePhotoLocalFileSystem,
  type MobilePhotoStageInput,
} from "../../src/lib/mobilePhotoCapture/mobilePhotoLocalRepository";
import {
  mobilePhotoSha256Hex,
} from "../../src/lib/mobilePhotoCapture/mobilePhotoNormalizationService";

const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
const JPEG_BYTES_2 = new Uint8Array([0xff, 0xd8, 0xff, 0x01, 0xd9]);

function memoryStorage(initial: Record<string, string> = {}): OfflineStorageAdapter & { values: Map<string, string> } {
  const values = new Map(Object.entries(initial));
  return {
    values,
    async getItem(key) { return values.get(key) ?? null; },
    async setItem(key, value) { values.set(key, value); },
    async removeItem(key) { values.delete(key); },
  };
}

function memoryFileSystem(initial: Record<string, Uint8Array> = {}): MobilePhotoLocalFileSystem & {
  files: Map<string, Uint8Array>;
  operations: string[];
  failCopy: boolean;
} {
  const files = new Map(Object.entries(initial).map(([uri, bytes]) => [uri, new Uint8Array(bytes)]));
  const operations: string[] = [];
  return {
    files,
    operations,
    failCopy: false,
    async makeDirectoryAsync(uri) { operations.push(`mkdir:${uri}`); },
    async copyAsync({ from, to }) {
      operations.push(`copy:${from}->${to}`);
      if (this.failCopy) throw new Error("disk full");
      const bytes = files.get(from);
      if (!bytes) throw new Error("source missing");
      files.set(to, new Uint8Array(bytes));
    },
    async moveAsync({ from, to }) {
      operations.push(`move:${from}->${to}`);
      const bytes = files.get(from);
      if (!bytes) throw new Error("partial missing");
      if (files.has(to)) throw new Error("destination exists");
      files.set(to, bytes);
      files.delete(from);
    },
    async deleteAsync(uri) {
      operations.push(`delete:${uri}`);
      files.delete(uri);
    },
    async getInfoAsync(uri) {
      const bytes = files.get(uri);
      return bytes ? { exists: true, size: bytes.length } : { exists: false };
    },
    async readAsStringAsync(uri) {
      const bytes = files.get(uri);
      if (!bytes) throw new Error("unreadable");
      return Buffer.from(bytes).toString("base64");
    },
  };
}

function stageInput(overrides: Partial<MobilePhotoStageInput> = {}): MobilePhotoStageInput {
  return {
    captureId: "capture:raw/../🏗️",
    scanId: "scan:raw/../🏗️",
    source: "IN_APP_CAMERA",
    kind: "OTHER",
    normalizedUri: "file:///cache/normalized.jpg",
    mimeType: "image/jpeg",
    width: 10,
    height: 10,
    byteSize: JPEG_BYTES.length,
    contentSha256: mobilePhotoSha256Hex(JPEG_BYTES),
    orientationNormalized: true,
    metadataStripped: true,
    createdAt: "2026-08-19T15:00:00.000Z",
    storageIdentity: {
      tenantId: "tenant:one/🏗️",
      requestId: "request:one/../",
      revisionId: "revision:one\\two",
      rowId: "row:one/CON",
    },
    ...overrides,
  };
}

describe("R5.5 atomic local photo repository", () => {
  it("verifies source and partial bytes before atomic rename and is idempotent on retry", async () => {
    const storage = memoryStorage();
    const fileSystem = memoryFileSystem({ "file:///cache/normalized.jpg": JPEG_BYTES });
    const repository = createMobilePhotoLocalRepository(storage, fileSystem, "file:///documents/");

    const first = await repository.stage(stageInput());
    const second = await repository.stage(stageInput());

    expect(second.localUri).toBe(first.localUri);
    expect(first.localUri).toMatch(/^file:\/\/\/documents\/mobile-photo-staging\/v2\/[a-f0-9]{2}\/[a-f0-9]{64}\.jpg$/u);
    expect(first.localUri).not.toContain("capture:raw");
    expect(fileSystem.operations.some((operation) => operation.startsWith("move:"))).toBe(true);
    expect([...fileSystem.files.keys()].filter((uri) => uri.includes(".partial-")).length).toBe(0);
    expect(fileSystem.files.has("file:///cache/normalized.jpg")).toBe(false);
    expect((await repository.listRecords())).toHaveLength(1);
  });

  it("cleans partial state and creates no record when copy is interrupted", async () => {
    const storage = memoryStorage();
    const fileSystem = memoryFileSystem({ "file:///cache/normalized.jpg": JPEG_BYTES });
    fileSystem.failCopy = true;
    const repository = createMobilePhotoLocalRepository(storage, fileSystem, "file:///documents/");

    await expect(repository.stage(stageInput())).rejects.toMatchObject({ code: "PHOTO_LOCAL_COPY_FAILED" });
    expect([...fileSystem.files.keys()].filter((uri) => uri.includes(".partial-")).length).toBe(0);
    expect(await repository.listRecords()).toEqual([]);
  });

  it("fails closed for missing source before creating a directory or record", async () => {
    const storage = memoryStorage();
    const fileSystem = memoryFileSystem();
    const repository = createMobilePhotoLocalRepository(storage, fileSystem, "file:///documents/");

    await expect(repository.stage(stageInput())).rejects.toMatchObject({ code: "PHOTO_LOCAL_FILE_MISSING" });
    expect(fileSystem.operations.some((operation) => operation.startsWith("mkdir:"))).toBe(false);
    expect(await repository.listRecords()).toEqual([]);
  });

  it("does not overwrite an existing identity when retry bytes differ", async () => {
    const storage = memoryStorage();
    const fileSystem = memoryFileSystem({ "file:///cache/normalized.jpg": JPEG_BYTES });
    const repository = createMobilePhotoLocalRepository(storage, fileSystem, "file:///documents/");
    const original = await repository.stage(stageInput());
    fileSystem.files.set("file:///cache/normalized-2.jpg", JPEG_BYTES_2);

    await expect(repository.stage(stageInput({
      normalizedUri: "file:///cache/normalized-2.jpg",
      byteSize: JPEG_BYTES_2.length,
      contentSha256: mobilePhotoSha256Hex(JPEG_BYTES_2),
    }))).rejects.toMatchObject({ code: "PHOTO_LOCAL_COLLISION" });
    expect(fileSystem.files.get(original.localUri)).toEqual(JPEG_BYTES);
  });

  it("migrates a readable legacy raw-ID path into bounded v2 storage", async () => {
    const legacyUri = "file:///documents/mobile-photo-staging/estimate-line-photo:revision:row/capture:one.jpg";
    const legacyRecord = {
      captureId: "capture:one",
      scanId: "estimate-line-photo:revision:row",
      source: "IN_APP_CAMERA",
      kind: "OTHER",
      localUri: legacyUri,
      mimeType: "image/jpeg",
      width: 10,
      height: 10,
      byteSize: JPEG_BYTES.length,
      contentSha256: mobilePhotoSha256Hex(JPEG_BYTES),
      orientationNormalized: true,
      metadataStripped: true,
      createdAt: "2026-08-19T15:00:00.000Z",
      attachedToScan: true,
      uploaded: false,
      deleted: false,
    };
    const storage = memoryStorage({
      "mobile_photo_capture:records:v1": JSON.stringify([legacyRecord]),
    });
    const fileSystem = memoryFileSystem({ [legacyUri]: JPEG_BYTES });
    const repository = createMobilePhotoLocalRepository(storage, fileSystem, "file:///documents/");

    const [migrated] = await repository.listRecords();
    expect(migrated.storageVersion).toBe("v2");
    expect(migrated.localUri).toMatch(/\/mobile-photo-staging\/v2\/legacy\/[a-f0-9]{64}\.jpg$/u);
    expect(migrated.localUri).not.toContain("capture:one");
    expect(fileSystem.files.get(migrated.localUri)).toEqual(JPEG_BYTES);
  });
});
