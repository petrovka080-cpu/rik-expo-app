import { createOfficeCompany } from "./officeAccess.services";
import { createOfficeCompanyAtomically } from "./officeAccess.transport";
import { loadCurrentAuthUser } from "../profile/profile.services";
import { supabase } from "../../lib/supabaseClient";
import type { UserProfile } from "../profile/profile.types";
import type { CreateCompanyDraft } from "./officeAccess.types";

jest.mock("./officeAccess.transport", () => ({ createOfficeCompanyAtomically: jest.fn() }));
jest.mock("../profile/profile.services", () => ({ loadCurrentAuthUser: jest.fn(), loadProfileScreenData: jest.fn() }));
jest.mock("../../lib/developerOverride", () => ({ loadDeveloperOverrideContext: jest.fn() }));
jest.mock("../../lib/supabaseClient", () => ({ supabase: { from: jest.fn() } }));
jest.mock("../../lib/api/_core", () => ({ normalizePage: jest.fn() }));

const userId = "11223344-1111-4111-8111-112233445566";
const companyId = "22334455-2222-4222-8222-223344556677";
const profile: UserProfile = {
  id: "33445566-3333-4333-8333-334455667788", user_id: userId,
  full_name: "Test Owner", phone: null, city: "Test City", usage_market: true,
  usage_build: false, bio: null, telegram: null, whatsapp: null, position: null,
};
const draft: CreateCompanyDraft = {
  name: " Test Company ", legalAddress: "Test Legal", industry: "Test",
  inn: "TEST-INN", phoneMain: "TEST-PHONE", additionalPhones: [], email: "",
  constructionObjectName: "Test Object", siteAddress: "Test Site", website: "",
};
const rpc = jest.mocked(createOfficeCompanyAtomically);

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(loadCurrentAuthUser).mockResolvedValue({ id: userId } as Awaited<ReturnType<typeof loadCurrentAuthUser>>);
  rpc.mockResolvedValue({ data: companyId, error: null });
  jest.mocked(supabase.from).mockImplementation(() => { throw new Error("Legacy multi-write is forbidden"); });
});

test("one server operation owns company, membership and profiles; no caller identity or role fields", async () => {
  await createOfficeCompany({ profile, profileEmail: "test@example.invalid", draft });
  expect(rpc).toHaveBeenCalledTimes(1);
  const payload = rpc.mock.calls[0][0];
  expect(payload.company).toMatchObject({ name: "Test Company", email: "test@example.invalid", address: "Test Legal", about_full: "Test Site" });
  for (const part of [payload.company, payload.profile]) {
    for (const key of ["id", "user_id", "owner_user_id", "role", "company_id"]) expect(part).not.toHaveProperty(key);
  }
  expect(supabase.from).not.toHaveBeenCalled();
});

test("empty company name causes no mutation", async () => {
  await expect(createOfficeCompany({ profile, profileEmail: null, draft: { ...draft, name: "  " } })).rejects.toThrow("Укажите наименование");
  expect(rpc).not.toHaveBeenCalled();
  expect(supabase.from).not.toHaveBeenCalled();
});

test("profile from another login is rejected before mutation", async () => {
  await expect(createOfficeCompany({ profile: { ...profile, user_id: companyId }, profileEmail: null, draft })).rejects.toThrow("другой сессии");
  expect(rpc).not.toHaveBeenCalled();
});

test("server failure is preserved and never falls back to partial direct writes", async () => {
  const error = { code: "42501", message: "Denied by server" };
  rpc.mockResolvedValue({ data: null, error });
  await expect(createOfficeCompany({ profile, profileEmail: null, draft })).rejects.toBe(error);
  expect(rpc).toHaveBeenCalledTimes(1);
  expect(supabase.from).not.toHaveBeenCalled();
});

test.each([null, {}, [], "", "not-a-company-id"])("unconfirmed response %p does not report success", async data => {
  rpc.mockResolvedValue({ data, error: null });
  await expect(createOfficeCompany({ profile, profileEmail: null, draft })).rejects.toThrow("подтвердить создание");
  expect(supabase.from).not.toHaveBeenCalled();
});
