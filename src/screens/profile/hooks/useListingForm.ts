import { useState } from "react";

import type {
  CatalogSearchItem,
  Company,
  ListingCartItem,
  ListingFormState,
  ProfileMode,
  UserProfile,
} from "../profile.types";

const EMPTY_LISTING_FORM: ListingFormState = {
  listingTitle: "",
  listingCity: "",
  listingPrice: "",
  listingUom: "",
  listingDescription: "",
  listingPhone: "",
  listingWhatsapp: "",
  listingEmail: "",
  listingKind: null,
  listingRikCode: null,
};

export function useListingForm() {
  const [listingForm, setListingForm] = useState<ListingFormState>(EMPTY_LISTING_FORM);
  const [listingCartItems, setListingCartItems] = useState<ListingCartItem[]>([]);
  const [editingItem, setEditingItem] = useState<ListingCartItem | null>(null);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogResults, setCatalogResults] = useState<CatalogSearchItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);

  const setListingTitle = (value: string) => {
    setListingForm((prev) => ({ ...prev, listingTitle: value }));
  };
  const setListingCity = (value: string) => {
    setListingForm((prev) => ({ ...prev, listingCity: value }));
  };
  const setListingPrice = (value: string) => {
    setListingForm((prev) => ({ ...prev, listingPrice: value }));
  };
  const setListingUom = (value: string) => {
    setListingForm((prev) => ({ ...prev, listingUom: value }));
  };
  const setListingDescription = (value: string) => {
    setListingForm((prev) => ({ ...prev, listingDescription: value }));
  };
  const setListingPhone = (value: string) => {
    setListingForm((prev) => ({ ...prev, listingPhone: value }));
  };
  const setListingWhatsapp = (value: string) => {
    setListingForm((prev) => ({ ...prev, listingWhatsapp: value }));
  };
  const setListingEmail = (value: string) => {
    setListingForm((prev) => ({ ...prev, listingEmail: value }));
  };
  const setListingKind = (value: ListingFormState["listingKind"]) => {
    setListingForm((prev) => ({ ...prev, listingKind: value }));
  };
  const setListingRikCode = (value: string | null) => {
    setListingForm((prev) => ({ ...prev, listingRikCode: value }));
  };

  const prepareListingForm = (params: {
    profile: UserProfile;
    company: Company | null;
    profileMode: ProfileMode;
  }) => {
    const baseCity =
      params.profileMode === "company"
        ? params.company?.city || params.profile.city || ""
        : params.profile.city || "";
    const basePhone =
      params.profileMode === "company"
        ? params.company?.phone_main || params.profile.phone || ""
        : params.profile.phone || "";

    setListingForm({
      listingTitle: "",
      listingCity: baseCity,
      listingPrice: "",
      listingUom: "",
      listingDescription: "",
      listingPhone: basePhone,
      listingWhatsapp: params.profile.whatsapp || basePhone,
      listingEmail: "",
      listingKind: null,
      listingRikCode: null,
    });
    setListingCartItems([]);
    setEditingItem(null);
    setCatalogSearch("");
    setCatalogResults([]);
    setCatalogLoading(false);
  };

  return {
    listingForm,
    listingCartItems,
    setListingCartItems,
    editingItem,
    setEditingItem,
    catalogSearch,
    setCatalogSearch,
    catalogResults,
    setCatalogResults,
    catalogLoading,
    setCatalogLoading,
    prepareListingForm,
    listingTitle: listingForm.listingTitle,
    setListingTitle,
    listingCity: listingForm.listingCity,
    setListingCity,
    listingPrice: listingForm.listingPrice,
    setListingPrice,
    listingUom: listingForm.listingUom,
    setListingUom,
    listingDescription: listingForm.listingDescription,
    setListingDescription,
    listingPhone: listingForm.listingPhone,
    setListingPhone,
    listingWhatsapp: listingForm.listingWhatsapp,
    setListingWhatsapp,
    listingEmail: listingForm.listingEmail,
    setListingEmail,
    listingKind: listingForm.listingKind,
    setListingKind,
    listingRikCode: listingForm.listingRikCode,
    setListingRikCode,
  };
}
