import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import type { ClientConfig } from "pg";

let officialCa: Buffer | undefined;
const loadOfficialCa = (): Buffer => {
  if (officialCa) return officialCa;
  const candidate = fs.readFileSync(path.join(__dirname, "certificates/supabase-official-ca.pem"));
  if (createHash("sha256").update(candidate).digest("hex") !==
      "6ecd239038a7db063a6619b71742372ecfe06c0b0ec12a9993fee4445bf0d4d6") {
    throw new Error("BFF_POSTGRES_TRUST_ANCHOR_MISMATCH");
  }
  officialCa = candidate;
  return officialCa;
};

/** Keep TLS URL flags from overriding the verified options in node-postgres. */
export function buildBffPostgresTlsConfig(connectionString: string): Pick<ClientConfig, "connectionString" | "ssl"> {
  const url = new URL(connectionString);
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const loopback = ["localhost", "127.0.0.1", "::1"].includes(host);
  const disabled = url.searchParams.get("sslmode") === "disable" ||
    ["false", "0"].includes(url.searchParams.get("ssl") ?? "");
  if (disabled && !loopback) throw new Error("BFF_POSTGRES_REMOTE_TLS_REQUIRED");

  const material = (key: string): Buffer | undefined => {
    const filename = url.searchParams.get(key);
    return filename ? fs.readFileSync(filename) : undefined;
  };
  const ssl: Exclude<ClientConfig["ssl"], boolean | undefined> = {
    rejectUnauthorized: true,
    servername: host,
  };
  if (!disabled) {
    const ca = material("sslrootcert");
    if (ca) ssl.ca = ca;
    else if (host.endsWith(".supabase.co") || host.endsWith(".supabase.com")) {
      ssl.ca = loadOfficialCa();
    }
    const cert = material("sslcert"), key = material("sslkey");
    if (cert) ssl.cert = cert;
    if (key) ssl.key = key;
  }
  for (const key of ["sslmode", "ssl", "sslrootcert", "sslcert", "sslkey", "uselibpqcompat"])
    url.searchParams.delete(key);
  return { connectionString: url.toString(), ssl: disabled ? false : ssl };
}
