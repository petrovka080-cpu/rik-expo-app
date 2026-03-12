export function getUriScheme(uri?: string | null): string {
  const value = String(uri || "").trim();
  const match = value.match(/^([a-z0-9+.-]+):/i);
  return match?.[1]?.toLowerCase() || "";
}

export function isHttpUri(uri?: string | null): boolean {
  return /^https?:\/\//i.test(String(uri || "").trim());
}

export function normalizeLocalFileUri(uri?: string | null): string {
  const value = String(uri || "").trim();
  if (!value) {
    throw new Error("Local file URI is empty");
  }

  const scheme = getUriScheme(value);
  if (scheme === "file") return value;
  if (scheme) {
    throw new Error(`Unsupported local file URI scheme: ${scheme}`);
  }

  if (value.startsWith("/")) {
    return `file://${value}`;
  }

  throw new Error(`Local file URI must be absolute path or file:// URI: ${value}`);
}
