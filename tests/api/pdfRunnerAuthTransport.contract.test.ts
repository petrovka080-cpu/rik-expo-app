import fs from "fs";
import path from "path";

import { readPdfRunnerAuthSession } from "../../src/lib/pdfRunner.auth.transport";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const read = (relativePath: string) =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

describe("pdfRunner auth transport boundary", () => {
  it("keeps the PDF auth session read behind the transport boundary", () => {
    const serviceSource = read("src/lib/pdfRunner.ts");
    const transportSource = read("src/lib/pdfRunner.auth.transport.ts");

    expect(serviceSource).toContain("./pdfRunner.auth.transport");
    expect(serviceSource).toContain("readPdfRunnerAuthSession");
    expect(serviceSource).not.toContain("supabase.auth.getSession");
    expect(transportSource).toContain("PdfRunnerAuthSessionClient");
    expect(transportSource).toContain("supabase.auth.getSession");
  });

  it("delegates auth session reads without changing success semantics", async () => {
    const response = {
      data: {
        session: {
          access_token: "test-access-token",
        },
      },
      error: null,
    };
    const getSession = jest.fn().mockResolvedValue(response);
    const supabase = {
      auth: {
        getSession,
      },
    };

    await expect(readPdfRunnerAuthSession(supabase as never)).resolves.toBe(response);
    expect(getSession).toHaveBeenCalledTimes(1);
  });

  it("does not swallow auth errors so pdfRunner fallback remains the owner", async () => {
    const error = new Error("auth session unavailable");
    const getSession = jest.fn().mockRejectedValue(error);
    const supabase = {
      auth: {
        getSession,
      },
    };

    await expect(readPdfRunnerAuthSession(supabase as never)).rejects.toBe(error);
    expect(getSession).toHaveBeenCalledTimes(1);
  });
});
