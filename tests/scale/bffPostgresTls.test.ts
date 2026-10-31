import { Client } from "pg";
import { buildBffPostgresTlsConfig } from "../../scripts/server/stagingBffPostgresTls";

test.each(["", "?sslmode=require", "?sslmode=verify-ca", "?sslmode=verify-full", "?sslmode=no-verify", "?ssl=true&uselibpqcompat=true"])(
  "remote TLS %s remains verified after the actual pg URL parser", suffix => {
    const config = buildBffPostgresTlsConfig("postgres://test:test@db.example.invalid/test" + suffix);
    const client = new Client(config) as unknown as { connectionParameters: { ssl: { rejectUnauthorized: boolean } } };
    expect(client.connectionParameters.ssl.rejectUnauthorized).toBe(true);
  },
);
test.each(["?sslmode=disable", "?ssl=false", "?ssl=0"])("remote plaintext %s fails closed", suffix => {
  expect(() => buildBffPostgresTlsConfig("postgres://test:test@db.example.invalid/test" + suffix)).toThrow("REMOTE_TLS_REQUIRED");
});
test.each(["localhost", "127.0.0.1", "[::1]"])("explicit loopback plaintext %s remains supported", host => {
  expect(buildBffPostgresTlsConfig(`postgres://test:test@${host}/test?sslmode=disable`).ssl).toBe(false);
});
test("localhost in a password or query cannot authorize remote plaintext", () => {
  expect(() => buildBffPostgresTlsConfig("postgres://localhost:localhost@db.example.invalid/test?sslmode=disable&options=localhost")).toThrow("REMOTE_TLS_REQUIRED");
});
test("Supabase loads pinned official trust anchors and removes driver override flags", () => {
  const config = buildBffPostgresTlsConfig("postgres://test:test@db.test.supabase.co/test?sslmode=require");
  const ssl = config.ssl as { ca: Buffer; rejectUnauthorized: boolean; servername: string };
  expect(ssl.rejectUnauthorized).toBe(true);
  expect(ssl.servername).toBe("db.test.supabase.co");
  expect(ssl.ca.toString()).toContain("BEGIN CERTIFICATE");
  expect(new URL(config.connectionString!).searchParams.has("sslmode")).toBe(false);
});
