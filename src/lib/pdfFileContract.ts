export function getUriScheme(uri?: string | null): string {
  const value = String(uri || "").trim();
  const match = value.match(/^([a-z0-9+.-]+):/i);
  return match?.[1]?.toLowerCase() || "";
}

export function isHttpUri(uri?: string | null): boolean {
  return /^https?:\/\//i.test(String(uri || "").trim());
}

export function hashString32(input: string): string {
  let h = 2166136261;
  const s = String(input || "");
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

export function normalizeLocalFileUri(uri?: string | null): string {
  const value = String(uri || "").trim();
  if (!value) {
    throw new Error("Local file URI is empty");
  }

  const scheme = getUriScheme(value);
  if (scheme === "file") return value;
  
  // If no scheme but looks like absolute path (starts with / on Unix/iOS or C:\ on Windows)
  if (value.startsWith("/") || /^[a-zA-Z]:\\/.test(value)) {
    return `file://${value}`;
  }

  // Handle common Expo FileSystem constants if they leaked as strings
  if (value.includes("FileSystem/")) {
    return `file://${value}`;
  }

  throw new Error(`Local file URI must be absolute path or file:// URI: ${value}`);
}
