/**
 * C-REAL-1 extraction tests — validates the mechanical extraction
 * of styles and helpers from OfficeHubScreen.tsx.
 *
 * Ensures:
 * 1. Styles object has all required keys
 * 2. Helpers export all required symbols
 * 3. No accidental property loss during extraction
 */

import { styles } from "../../src/screens/office/officeHub.styles";
import {
  EMPTY_COMPANY_DRAFT,
  buildOfficeBootstrapCompanyDraft,
  isWarehouseOfficeReturnReceipt,
  OfficePostReturnSubtreeBoundary,
} from "../../src/screens/office/officeHub.helpers";
import {
  DirectionCard,
  InviteCard,
  MemberCard,
  OfficeCompanyCreateSection,
} from "../../src/screens/office/officeHub.sections";

describe("officeHub.styles — extraction integrity", () => {
  const EXPECTED_STYLE_KEYS = [
    "screen", "fill", "content", "center",
    "summary", "summaryHeader", "eyebrow", "company",
    "editButton", "editButtonText", "summaryMeta",
    "summaryBadges", "summaryBadge", "summaryBadgeRole",
    "summaryBadgeSuccess", "summaryBadgeWarning",
    "summaryBadgeText", "summaryBadgeTextSuccess", "summaryBadgeTextWarning",
    "stats", "stat", "label",
    "pill", "pillSuccess", "pillWarning",
    "pillText", "pillTextSuccess", "pillTextWarning",
    "devPanel", "devRoleButton",
    "section", "sectionTitle", "helper",
    "grid", "card", "cardPrimary", "cardHead",
    "accent", "add", "addPrimary", "addText", "addTextPrimary",
    "pressed", "dim", "stack",
    "cardTitle", "cardTitlePrimary",
    "cardSubtitle", "cardSubtitlePrimary",
    "panel", "handoff", "handoffTitle", "handoffCodeBlock", "handoffCode",
    "notice", "noticeText", "noticeSoft", "noticeSoftText",
    "entity", "entityHeader", "entityHeaderMain",
    "entityTitle", "entityMeta",
    "memberStatusRow", "statusBadge", "statusActive", "statusPending",
    "statusText", "statusTextActive", "statusTextPending",
    "chips", "chip", "chipActive", "chipText", "chipTextActive",
    "row", "rowLast", "value",
    "input", "textArea", "inline",
    "link", "linkDanger", "phoneRow", "phoneInput",
    "primary", "primaryText", "secondary", "secondaryText",
    "actionGrid", "actionButton", "actionButtonText",
    "grow", "rule",
    "modalWrap", "backdrop", "sheet", "sheetTitle", "modalActions",
  ];

  it("has all expected style keys", () => {
    for (const key of EXPECTED_STYLE_KEYS) {
      expect(styles).toHaveProperty(key);
    }
  });

  it("style count matches expected", () => {
    expect(Object.keys(styles).length).toBe(EXPECTED_STYLE_KEYS.length);
  });

  it("no unexpected style keys", () => {
    const actualKeys = Object.keys(styles);
    const unexpected = actualKeys.filter(
      (key) => !EXPECTED_STYLE_KEYS.includes(key),
    );
    expect(unexpected).toEqual([]);
  });

  it("screen style has correct background", () => {
    expect(styles.screen).toMatchObject({
      flex: 1,
      backgroundColor: "#F8FAFC",
    });
  });

  it("primary style has teal background", () => {
    expect(styles.primary).toMatchObject({
      backgroundColor: "#0F766E",
    });
  });
});

describe("officeHub.sections - view boundary exports", () => {
  it("keeps OfficeHub section components behind one import surface", () => {
    expect(typeof DirectionCard).toBe("function");
    expect(typeof InviteCard).toBe("function");
    expect(typeof MemberCard).toBe("function");
    expect(typeof OfficeCompanyCreateSection).toBe("function");
  });
});

describe("officeHub.helpers — extraction integrity", () => {
  it("EMPTY_COMPANY_DRAFT has all required fields", () => {
    expect(EMPTY_COMPANY_DRAFT).toEqual({
      name: "",
      legalAddress: "",
      industry: "",
      inn: "",
      phoneMain: "",
      additionalPhones: [],
      email: "",
      constructionObjectName: "",
      siteAddress: "",
      website: "",
    });
  });

  it("buildOfficeBootstrapCompanyDraft merges phone and email", () => {
    const data = {
      currentUserId: "u1",
      profile: {
        id: "p1",
        user_id: "u1",
        full_name: "Test",
        phone: "+7-999-123-4567",
        city: null,
        usage_market: true,
        usage_build: false,
      },
      profileEmail: "test@example.com",
      profileRole: null,
      company: null,
      companyAccessRole: null,
      accessSourceSnapshot: {
        userId: "u1",
        authRole: null,
        resolvedRole: null,
        usageMarket: true,
        usageBuild: false,
        ownedCompanyId: null,
        companyMemberships: [],
        listingsCount: 0,
      },
      members: [],
      invites: [],
    };
    const draft = buildOfficeBootstrapCompanyDraft(data);
    expect(draft.phoneMain).toBe("+7-999-123-4567");
    expect(draft.email).toBe("test@example.com");
    expect(draft.name).toBe("");
  });

  it("isWarehouseOfficeReturnReceipt — positive", () => {
    expect(
      isWarehouseOfficeReturnReceipt({
        sourceRoute: "/office/warehouse",
        target: "/office",
      }),
    ).toBe(true);
  });

  it("isWarehouseOfficeReturnReceipt — negative", () => {
    expect(isWarehouseOfficeReturnReceipt(null)).toBeFalsy();
    expect(isWarehouseOfficeReturnReceipt({})).toBeFalsy();
    expect(
      isWarehouseOfficeReturnReceipt({
        sourceRoute: "/office/director",
        target: "/office",
      }),
    ).toBeFalsy();
  });

  it("OfficePostReturnSubtreeBoundary is a React component class", () => {
    expect(typeof OfficePostReturnSubtreeBoundary).toBe("function");
    expect(OfficePostReturnSubtreeBoundary.prototype).toBeDefined();
    expect(
      typeof OfficePostReturnSubtreeBoundary.prototype.render,
    ).toBe("function");
  });
});
