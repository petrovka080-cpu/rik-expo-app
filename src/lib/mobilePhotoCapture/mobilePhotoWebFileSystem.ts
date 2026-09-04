const WEB_PHOTO_CACHE_NAME = "rik-mobile-photo-v2";

export const MOBILE_PHOTO_WEB_DOCUMENT_DIR =
  "https://rik-mobile-photo.invalid/staging/";

function requireCacheStorage(): CacheStorage {
  const cacheStorage = globalThis.caches;
  if (!cacheStorage) throw new Error("MOBILE_PHOTO_WEB_CACHE_UNAVAILABLE");
  return cacheStorage;
}

async function responseForUri(uri: string): Promise<Response> {
  if (uri.startsWith(MOBILE_PHOTO_WEB_DOCUMENT_DIR)) {
    const cache = await requireCacheStorage().open(WEB_PHOTO_CACHE_NAME);
    const response = await cache.match(uri);
    if (!response) throw new Error("MOBILE_PHOTO_WEB_FILE_MISSING");
    return response;
  }
  const response = await fetch(uri);
  if (!response.ok && response.status !== 0) {
    throw new Error(`MOBILE_PHOTO_WEB_SOURCE_HTTP_${response.status}`);
  }
  return response;
}

async function bytesForUri(uri: string): Promise<Uint8Array> {
  const response = await responseForUri(uri);
  return new Uint8Array(await response.arrayBuffer());
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function responseBody(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

export async function readMobilePhotoWebUriAsBase64(uri: string): Promise<string> {
  return bytesToBase64(await bytesForUri(uri));
}

export async function createMobilePhotoWebPreviewUri(
  uri: string,
  mimeType: "image/jpeg" | "image/png",
): Promise<string> {
  const bytes = await bytesForUri(uri);
  return URL.createObjectURL(new Blob([responseBody(bytes)], { type: mimeType }));
}

export function createMobilePhotoWebFileSystem() {
  return {
    async makeDirectoryAsync(): Promise<void> {
      // Cache Storage is key-addressed and does not require directory creation.
    },
    async copyAsync({ from, to }: { from: string; to: string }): Promise<void> {
      const bytes = await bytesForUri(from);
      const cache = await requireCacheStorage().open(WEB_PHOTO_CACHE_NAME);
      await cache.put(to, new Response(responseBody(bytes)));
    },
    async moveAsync({ from, to }: { from: string; to: string }): Promise<void> {
      const bytes = await bytesForUri(from);
      const cache = await requireCacheStorage().open(WEB_PHOTO_CACHE_NAME);
      await cache.put(to, new Response(responseBody(bytes)));
      if (from.startsWith(MOBILE_PHOTO_WEB_DOCUMENT_DIR)) await cache.delete(from);
    },
    async deleteAsync(uri: string): Promise<void> {
      if (uri.startsWith(MOBILE_PHOTO_WEB_DOCUMENT_DIR)) {
        const cache = await requireCacheStorage().open(WEB_PHOTO_CACHE_NAME);
        await cache.delete(uri);
      } else if (uri.startsWith("blob:")) {
        URL.revokeObjectURL(uri);
      }
    },
    async getInfoAsync(uri: string): Promise<{ exists: boolean; size?: number }> {
      try {
        const bytes = await bytesForUri(uri);
        return { exists: true, size: bytes.byteLength };
      } catch {
        return { exists: false };
      }
    },
    async readAsStringAsync(uri: string): Promise<string> {
      return readMobilePhotoWebUriAsBase64(uri);
    },
  };
}
