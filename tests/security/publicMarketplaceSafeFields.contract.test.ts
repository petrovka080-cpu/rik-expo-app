import {
  PUBLIC_MARKETPLACE_CONTACT_FIELDS,
  PUBLIC_MARKETPLACE_PRIVATE_FIELD_DENYLIST,
  assertPublicMarketplaceSafeFields,
  sanitizePublicMarketplaceListing,
} from "../../src/lib/security/securityPrivacyHardening";
import {
  buildPublicMarketplaceSafeFieldsAudit,
  readMarketHomeSelectFields,
} from "../../scripts/audit/securityPrivacyHardening.shared";

describe("public marketplace privacy fields", () => {
  it("keeps public marketplace reads on an allowlist with contact fields only by rule", () => {
    const fields = readMarketHomeSelectFields();
    const result = assertPublicMarketplaceSafeFields(fields);
    const sanitized = sanitizePublicMarketplaceListing({
      id: "listing-1",
      title: "ГКЛ",
      contacts_phone: "+996 700 000 000",
      contacts_whatsapp: "+996 700 000 001",
      contacts_email: "seller@example.test",
      user_id: "private-user",
      company_id: "private-company",
      storageKey: "private-key",
      providerPayload: { raw: true },
    });
    const audit = buildPublicMarketplaceSafeFieldsAudit();

    expect(result.passed).toBe(true);
    expect(result.deniedFields).toEqual([]);
    expect(result.unknownFields).toEqual([]);
    for (const contactField of PUBLIC_MARKETPLACE_CONTACT_FIELDS) {
      expect(fields).toContain(contactField);
    }
    for (const deniedField of PUBLIC_MARKETPLACE_PRIVATE_FIELD_DENYLIST) {
      expect(fields).not.toContain(deniedField);
      expect(sanitized).not.toHaveProperty(deniedField);
    }
    expect(audit.public_marketplace_safe_fields_only).toBe(true);
  });
});
