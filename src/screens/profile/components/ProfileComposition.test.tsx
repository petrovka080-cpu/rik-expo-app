import React from "react";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";

import { ProfileMainSections } from "./ProfileMainSections";
import { ProfileModalStack } from "./ProfileModalStack";

const baseProfile = {
  id: "profile-1",
  user_id: "user-1",
  full_name: "Айбек",
  phone: "+996700000000",
  city: "Бишкек",
  usage_market: true,
  usage_build: true,
};

const baseCompany = {
  id: "company-1",
  owner_user_id: "user-1",
  name: "ACME Build",
  city: "Бишкек",
  industry: "Строительство",
  phone_main: "+996555000000",
  site: "https://acme.kg",
  inn: "123456789",
  address: "Токтогула 1",
  bank_details: "DemirBank",
};

const baseMainProps = () => ({
  profileMode: "person" as const,
  profileAvatarUrl: null,
  avatarLetter: "А",
  profileName: "Айбек",
  roleLabel: "Директор",
  roleColor: "#22c55e",
  accountSubtitle: "Личный кабинет",
  profile: baseProfile,
  company: baseCompany,
  profileEmail: "aybek@example.com",
  lastInviteCode: "INV-2026",
  requisitesVisible: true,
  listingsSummary: "2 активных объявления",
  companyCardTitle: "Кабинет компании",
  companyCardSubtitle: "Откройте кабинет компании",
  profileCompletionItems: [
    { key: "name", label: "Имя", done: true },
    { key: "phone", label: "Телефон", done: true },
  ],
  profileCompletionDone: 2,
  profileCompletionPercent: 100,
  companyCompletionItems: [
    { key: "name", label: "Компания", done: true },
    { key: "phone", label: "Телефон", done: false },
  ],
  companyCompletionPercent: 50,
  justCreatedCompany: true,
  modeMarket: true,
  modeBuild: true,
  savingUsage: false,
  onOpenEditProfile: jest.fn(),
  onSelectPersonMode: jest.fn(),
  onSelectCompanyMode: jest.fn(),
  onOpenPersonCompanyCard: jest.fn(),
  onOpenMarket: jest.fn(),
  onOpenListingModal: jest.fn(),
  onOpenSupplierMap: jest.fn(),
  onOpenMarketAuctions: jest.fn(),
  onOpenProfileAssistant: jest.fn(),
  onPressBuildCard: jest.fn(),
  onOpenEditCompany: jest.fn(),
  onSignOut: jest.fn(),
  onToggleMarket: jest.fn(),
  onOpenCompanyCabinet: jest.fn(),
  onOpenCompanyCabinetFromBanner: jest.fn(),
  onOpenInviteModal: jest.fn(),
  onOpenSupplierShowcase: jest.fn(),
});

const baseProfileForm = {
  profileNameInput: "Айбек",
  profilePhoneInput: "+996700000000",
  profileCityInput: "Бишкек",
  profileBioInput: "bio",
  profileTelegramInput: "@aybek",
  profileWhatsappInput: "+996700000111",
  profilePositionInput: "Снабженец",
};

const baseCompanyForm = {
  companyNameInput: "ACME Build",
  companyCityInput: "Бишкек",
  companyLegalFormInput: "ОсОО",
  companyAddressInput: "Токтогула 1",
  companyIndustryInput: "Строительство",
  companyAboutShortInput: "short",
  companyPhoneMainInput: "+996555000000",
  companyPhoneWhatsAppInput: "+996555000111",
  companyEmailInput: "info@acme.kg",
  companySiteInput: "https://acme.kg",
  companyTelegramInput: "@acme",
  companyWorkTimeInput: "Пн-Сб 09:00-18:00",
  companyContactPersonInput: "Айбек",
  companyAboutFullInput: "full",
  companyServicesInput: "Монолит",
  companyRegionsInput: "Бишкек",
  companyClientsTypesInput: "B2B",
  companyInnInput: "123456789",
  companyBinInput: "987654321",
  companyRegNumberInput: "REG-1",
  companyBankDetailsInput: "Demir",
  companyLicensesInfoInput: "license",
};

const baseListingForm = {
  listingTitle: "Газоблок",
  listingCity: "Бишкек",
  listingPrice: "",
  listingUom: "шт",
  listingDescription: "desc",
  listingPhone: "+996700000000",
  listingWhatsapp: "+996700000111",
  listingEmail: "user@example.com",
  listingKind: "material" as const,
  listingRikCode: "R-1",
};

const baseModalProps = () => ({
  listingModalOpen: true,
  catalogModalOpen: false,
  itemModalOpen: false,
  listingForm: baseListingForm,
  listingCartItems: [],
  editingItem: null,
  catalogSearch: "",
  catalogResults: [],
  savingListing: false,
  catalogLoading: false,
  onCloseListingModal: jest.fn(),
  onPublishListing: jest.fn(),
  onChangeListingKind: jest.fn(),
  onChangeListingTitle: jest.fn(),
  onChangeListingDescription: jest.fn(),
  onChangeListingPhone: jest.fn(),
  onChangeListingWhatsapp: jest.fn(),
  onChangeListingEmail: jest.fn(),
  onInlineCatalogPick: jest.fn(),
  onChangeCatalogSearch: jest.fn(),
  onLoadCatalog: jest.fn(),
  onCloseCatalogModal: jest.fn(),
  onCatalogModalPick: jest.fn(),
  onCloseItemModal: jest.fn(),
  onChangeEditingItemCity: jest.fn(),
  onChangeEditingItemUom: jest.fn(),
  onChangeEditingItemQty: jest.fn(),
  onChangeEditingItemPrice: jest.fn(),
  onConfirmEditingItem: jest.fn(),
  businessOnboardingOpen: true,
  businessStep: 2 as const,
  savingCompany: false,
  companyForm: baseCompanyForm,
  onCloseBusinessWizard: jest.fn(),
  onPrevBusinessStep: jest.fn(),
  onNextBusinessStep: jest.fn(),
  onSubmitBusinessWizard: jest.fn(),
  onChangeCompanyName: jest.fn(),
  onChangeCompanyCity: jest.fn(),
  onChangeCompanyLegalForm: jest.fn(),
  onChangeCompanyAddress: jest.fn(),
  onChangeCompanyIndustry: jest.fn(),
  onChangeCompanyAboutShort: jest.fn(),
  onChangeCompanyPhoneMain: jest.fn(),
  onChangeCompanyPhoneWhatsapp: jest.fn(),
  onChangeCompanyEmail: jest.fn(),
  onChangeCompanySite: jest.fn(),
  onChangeCompanyTelegram: jest.fn(),
  onChangeCompanyWorkTime: jest.fn(),
  onChangeCompanyContactPerson: jest.fn(),
  onChangeCompanyAboutFull: jest.fn(),
  onChangeCompanyServices: jest.fn(),
  onChangeCompanyRegions: jest.fn(),
  onChangeCompanyClientsTypes: jest.fn(),
  onChangeCompanyInn: jest.fn(),
  onChangeCompanyBin: jest.fn(),
  onChangeCompanyRegNumber: jest.fn(),
  onChangeCompanyBankDetails: jest.fn(),
  onChangeCompanyLicensesInfo: jest.fn(),
  editProfileOpen: true,
  avatarLetter: "А",
  profileAvatarDraft: null,
  profileForm: baseProfileForm,
  savingProfile: false,
  onCloseEditProfile: jest.fn(),
  onPickProfileAvatar: jest.fn(),
  onSaveProfile: jest.fn(),
  onChangeProfileName: jest.fn(),
  onChangeProfilePhone: jest.fn(),
  onChangeProfileCity: jest.fn(),
  onChangeProfileBio: jest.fn(),
  onChangeProfilePosition: jest.fn(),
  onChangeProfileTelegram: jest.fn(),
  onChangeProfileWhatsapp: jest.fn(),
  inviteModalOpen: true,
  savingInvite: false,
  inviteRole: "foreman",
  inviteName: "Азиз",
  invitePhone: "+996700000222",
  inviteEmail: "worker@example.com",
  inviteComment: "comment",
  lastInviteCode: null,
  onCloseInviteModal: jest.fn(),
  onChangeInviteRole: jest.fn(),
  onChangeInviteName: jest.fn(),
  onChangeInvitePhone: jest.fn(),
  onChangeInviteEmail: jest.fn(),
  onChangeInviteComment: jest.fn(),
  onSubmitInvite: jest.fn(),
  onInviteAnother: jest.fn(),
  onCopyInviteCode: jest.fn(),
  onShareInviteWhatsApp: jest.fn(),
  onShareInviteTelegram: jest.fn(),
  editCompanyOpen: true,
  companyTab: "main" as const,
  onCloseEditCompany: jest.fn(),
  onSaveCompany: jest.fn(),
  onSelectCompanyTab: jest.fn(),
});

describe("Profile composition boundaries", () => {
  it("renders person-mode main sections and forwards key actions", () => {
    const props = baseMainProps();
    let renderer: ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(<ProfileMainSections {...props} />);
    });

    renderer!.root.findByProps({ testID: "profile-edit-open" }).props.onPress();
    renderer!.root.findByProps({ testID: "profile-company-card" }).props.onPress();
    renderer!.root.findByProps({ testID: "profile-listing-open" }).props.onPress();
    renderer!.root.findByProps({ testID: "profile-mode-company" }).props.onPress();

    expect(props.onOpenEditProfile).toHaveBeenCalledTimes(1);
    expect(props.onOpenPersonCompanyCard).toHaveBeenCalledTimes(1);
    expect(props.onOpenListingModal).toHaveBeenCalledTimes(1);
    expect(props.onSelectCompanyMode).toHaveBeenCalledTimes(1);
  });

  it("renders company-mode main sections and keeps company action wiring unchanged", () => {
    const props = {
      ...baseMainProps(),
      profileMode: "company" as const,
    };
    let renderer: ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(<ProfileMainSections {...props} />);
    });

    renderer!.root.findByProps({ testID: "profile-company-completion-action" }).props.onPress();
    renderer!.root.findByProps({ testID: "profile-company-open-cabinet" }).props.onPress();
    renderer!.root.findByProps({ testID: "profile-company-invite-open" }).props.onPress();
    renderer!.root.findByProps({ testID: "profile-supplier-showcase-open" }).props.onPress();
    renderer!.root.findByProps({ testID: "profile-mode-person" }).props.onPress();

    expect(props.onOpenEditCompany).toHaveBeenCalledTimes(1);
    expect(props.onOpenCompanyCabinetFromBanner).toHaveBeenCalledTimes(1);
    expect(props.onOpenInviteModal).toHaveBeenCalledTimes(1);
    expect(props.onOpenSupplierShowcase).toHaveBeenCalledTimes(1);
    expect(props.onSelectPersonMode).toHaveBeenCalledTimes(1);
  });

  it("renders grouped modal stack and preserves modal action routing", () => {
    const props = baseModalProps();
    let renderer: ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(<ProfileModalStack {...props} />);
    });

    renderer!.root.findByProps({ testID: "profile-listing-modal-publish" }).props.onPress();
    renderer!.root.findByProps({ testID: "profile-business-modal-next" }).props.onPress();
    renderer!.root.findByProps({ testID: "profile-edit-modal-save" }).props.onPress();
    renderer!.root.findByProps({ testID: "profile-invite-modal-submit" }).props.onPress();
    renderer!.root.findByProps({ testID: "profile-company-modal-save" }).props.onPress();

    expect(props.onPublishListing).toHaveBeenCalledTimes(1);
    expect(props.onNextBusinessStep).toHaveBeenCalledTimes(1);
    expect(props.onSaveProfile).toHaveBeenCalledTimes(1);
    expect(props.onSubmitInvite).toHaveBeenCalledTimes(1);
    expect(props.onSaveCompany).toHaveBeenCalledTimes(1);
  });
});
