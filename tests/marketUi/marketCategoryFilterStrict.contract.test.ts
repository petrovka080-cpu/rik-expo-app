import { filterMarketHomeListings, getCategoryKind } from "../../src/features/market/marketHome.data";
import type {
  MarketHomeCategoryKey,
  MarketHomeListingCard,
  MarketKind,
} from "../../src/features/market/marketHome.types";

const listing = (
  id: string,
  presentationCategory: MarketHomeCategoryKey,
  kind: MarketKind,
): MarketHomeListingCard => ({
  id,
  title: id,
  sellerUserId: "seller",
  sellerCompanyId: null,
  supplierId: null,
  sellerDisplayName: "Supplier",
  subtitle: "",
  city: "Bishkek",
  price: 100,
  priceKnown: true,
  kind,
  kindLabel: kind,
  side: "offer",
  sideLabel: "Offer",
  description: null,
  phone: null,
  whatsapp: null,
  email: null,
  uom: null,
  unit: null,
  status: "active",
  created_at: null,
  statusLabel: "Active",
  presentationCategory,
  imageSource: 1,
  imageUrl: null,
  imageUrls: [],
  videoUrl: null,
  videoUrls: [],
  items: [],
  erpItems: [],
  itemsPreview: [],
  searchText: id,
  isDemand: false,
  inStock: false,
  stockLabel: null,
  stockQtyAvailable: null,
  stockUom: null,
  totalAvailableCount: null,
  primaryRikCode: null,
  source: "marketplace",
});

describe("market category filter contract", () => {
  it("does not let same-kind listings leak into a selected category", () => {
    const rows = [
      listing("material-hit", "materials", "material"),
      listing("material-kind-wrong-category", "services", "material"),
    ];

    const filtered = filterMarketHomeListings(rows, {
      category: "materials",
      kind: "material",
      query: "",
      side: "all",
    });

    expect(filtered.map((row) => row.id)).toEqual(["material-hit"]);
  });

  it("maps the rent category to rent so rentals stay visible", () => {
    const rows = [
      listing("tool-rent", "tools", "rent"),
      listing("material-not-tool", "materials", "material"),
    ];

    const filtered = filterMarketHomeListings(rows, {
      category: "tools",
      kind: getCategoryKind("tools"),
      query: "",
      side: "all",
    });

    expect(getCategoryKind("tools")).toBe("rent");
    expect(filtered.map((row) => row.id)).toEqual(["tool-rent"]);
  });

  it("maps delivery to a real delivery kind instead of leaking service rows", () => {
    const rows = [
      listing("delivery-hit", "delivery", "delivery"),
      listing("service-not-delivery", "services", "service"),
    ];

    const filtered = filterMarketHomeListings(rows, {
      category: "delivery",
      kind: getCategoryKind("delivery"),
      query: "",
      side: "all",
    });

    expect(getCategoryKind("delivery")).toBe("delivery");
    expect(filtered.map((row) => row.id)).toEqual(["delivery-hit"]);
  });
});
