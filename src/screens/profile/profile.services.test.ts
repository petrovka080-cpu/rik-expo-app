import { buildCompanyPayload, buildProfileModeFromCompany } from "./profile.services";

describe("profile.services", () => {
  it("buildCompanyPayload trims values and falls back to company name", () => {
    const payload = buildCompanyPayload({
      ownerUserId: "user-1",
      fallbackCompanyName: "Fallback LLC",
      form: {
        companyNameInput: "  ",
        companyCityInput: " Бишкек ",
        companyLegalFormInput: " ОсОО ",
        companyAddressInput: " ул. Токтогула ",
        companyIndustryInput: " Стройка ",
        companyAboutShortInput: " коротко ",
        companyPhoneMainInput: " +996700000000 ",
        companyPhoneWhatsAppInput: " +996700000001 ",
        companyEmailInput: " info@example.com ",
        companySiteInput: " https://example.com ",
        companyTelegramInput: " @example ",
        companyWorkTimeInput: " 9-18 ",
        companyContactPersonInput: " Айбек ",
        companyAboutFullInput: " Полное описание ",
        companyServicesInput: " Монолит ",
        companyRegionsInput: " Чуй ",
        companyClientsTypesInput: " B2B ",
        companyInnInput: " 123 ",
        companyBinInput: " 456 ",
        companyRegNumberInput: " reg-1 ",
        companyBankDetailsInput: " bank ",
        companyLicensesInfoInput: " license ",
      },
    });

    expect(payload).toEqual({
      owner_user_id: "user-1",
      name: "Fallback LLC",
      city: "Бишкек",
      legal_form: "ОсОО",
      address: "ул. Токтогула",
      industry: "Стройка",
      about_short: "коротко",
      phone_main: "+996700000000",
      phone_whatsapp: "+996700000001",
      email: "info@example.com",
      site: "https://example.com",
      telegram: "@example",
      work_time: "9-18",
      contact_person: "Айбек",
      about_full: "Полное описание",
      services: "Монолит",
      regions: "Чуй",
      clients_types: "B2B",
      inn: "123",
      bin: "456",
      reg_number: "reg-1",
      bank_details: "bank",
      licenses_info: "license",
    });
  });

  it("buildProfileModeFromCompany preserves person/company semantics", () => {
    expect(buildProfileModeFromCompany(null)).toBe("person");
    expect(
      buildProfileModeFromCompany({
        id: "company-1",
        owner_user_id: "user-1",
        name: "ACME",
        city: null,
      }),
    ).toBe("company");
  });
});
