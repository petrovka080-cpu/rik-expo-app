import { useState } from "react";

import type { Company, CompanyFormState, UserProfile } from "../profile.types";

const EMPTY_COMPANY_FORM: CompanyFormState = {
  companyNameInput: "",
  companyCityInput: "",
  companyLegalFormInput: "",
  companyAddressInput: "",
  companyIndustryInput: "",
  companyAboutShortInput: "",
  companyPhoneMainInput: "",
  companyPhoneWhatsAppInput: "",
  companyEmailInput: "",
  companySiteInput: "",
  companyTelegramInput: "",
  companyWorkTimeInput: "",
  companyContactPersonInput: "",
  companyAboutFullInput: "",
  companyServicesInput: "",
  companyRegionsInput: "",
  companyClientsTypesInput: "",
  companyInnInput: "",
  companyBinInput: "",
  companyRegNumberInput: "",
  companyBankDetailsInput: "",
  companyLicensesInfoInput: "",
};

export function useCompanyForm() {
  const [companyForm, setCompanyForm] = useState<CompanyFormState>(EMPTY_COMPANY_FORM);

  const setCompanyNameInput = (value: string) => {
    setCompanyForm((prev) => ({ ...prev, companyNameInput: value }));
  };
  const setCompanyCityInput = (value: string) => {
    setCompanyForm((prev) => ({ ...prev, companyCityInput: value }));
  };
  const setCompanyLegalFormInput = (value: string) => {
    setCompanyForm((prev) => ({ ...prev, companyLegalFormInput: value }));
  };
  const setCompanyAddressInput = (value: string) => {
    setCompanyForm((prev) => ({ ...prev, companyAddressInput: value }));
  };
  const setCompanyIndustryInput = (value: string) => {
    setCompanyForm((prev) => ({ ...prev, companyIndustryInput: value }));
  };
  const setCompanyAboutShortInput = (value: string) => {
    setCompanyForm((prev) => ({ ...prev, companyAboutShortInput: value }));
  };
  const setCompanyPhoneMainInput = (value: string) => {
    setCompanyForm((prev) => ({ ...prev, companyPhoneMainInput: value }));
  };
  const setCompanyPhoneWhatsAppInput = (value: string) => {
    setCompanyForm((prev) => ({ ...prev, companyPhoneWhatsAppInput: value }));
  };
  const setCompanyEmailInput = (value: string) => {
    setCompanyForm((prev) => ({ ...prev, companyEmailInput: value }));
  };
  const setCompanySiteInput = (value: string) => {
    setCompanyForm((prev) => ({ ...prev, companySiteInput: value }));
  };
  const setCompanyTelegramInput = (value: string) => {
    setCompanyForm((prev) => ({ ...prev, companyTelegramInput: value }));
  };
  const setCompanyWorkTimeInput = (value: string) => {
    setCompanyForm((prev) => ({ ...prev, companyWorkTimeInput: value }));
  };
  const setCompanyContactPersonInput = (value: string) => {
    setCompanyForm((prev) => ({ ...prev, companyContactPersonInput: value }));
  };
  const setCompanyAboutFullInput = (value: string) => {
    setCompanyForm((prev) => ({ ...prev, companyAboutFullInput: value }));
  };
  const setCompanyServicesInput = (value: string) => {
    setCompanyForm((prev) => ({ ...prev, companyServicesInput: value }));
  };
  const setCompanyRegionsInput = (value: string) => {
    setCompanyForm((prev) => ({ ...prev, companyRegionsInput: value }));
  };
  const setCompanyClientsTypesInput = (value: string) => {
    setCompanyForm((prev) => ({ ...prev, companyClientsTypesInput: value }));
  };
  const setCompanyInnInput = (value: string) => {
    setCompanyForm((prev) => ({ ...prev, companyInnInput: value }));
  };
  const setCompanyBinInput = (value: string) => {
    setCompanyForm((prev) => ({ ...prev, companyBinInput: value }));
  };
  const setCompanyRegNumberInput = (value: string) => {
    setCompanyForm((prev) => ({ ...prev, companyRegNumberInput: value }));
  };
  const setCompanyBankDetailsInput = (value: string) => {
    setCompanyForm((prev) => ({ ...prev, companyBankDetailsInput: value }));
  };
  const setCompanyLicensesInfoInput = (value: string) => {
    setCompanyForm((prev) => ({ ...prev, companyLicensesInfoInput: value }));
  };

  const hydrateCompanyForm = (params: {
    company: Company | null;
    profile: UserProfile | null;
  }) => {
    const { company, profile } = params;
    setCompanyForm({
      companyNameInput: company?.name || "",
      companyCityInput: company?.city || profile?.city || "",
      companyLegalFormInput: company?.legal_form || "",
      companyAddressInput: company?.address || "",
      companyIndustryInput: company?.industry || "",
      companyAboutShortInput: company?.about_short || "",
      companyPhoneMainInput: company?.phone_main || profile?.phone || "",
      companyPhoneWhatsAppInput: company?.phone_whatsapp || "",
      companyEmailInput: company?.email || "",
      companySiteInput: company?.site || "",
      companyTelegramInput: company?.telegram || "",
      companyWorkTimeInput: company?.work_time || "",
      companyContactPersonInput: company?.contact_person || profile?.full_name || "",
      companyAboutFullInput: company?.about_full || "",
      companyServicesInput: company?.services || "",
      companyRegionsInput: company?.regions || "",
      companyClientsTypesInput: company?.clients_types || "",
      companyInnInput: company?.inn || "",
      companyBinInput: company?.bin || "",
      companyRegNumberInput: company?.reg_number || "",
      companyBankDetailsInput: company?.bank_details || "",
      companyLicensesInfoInput: company?.licenses_info || "",
    });
  };

  return {
    companyForm,
    hydrateCompanyForm,
    companyNameInput: companyForm.companyNameInput,
    setCompanyNameInput,
    companyCityInput: companyForm.companyCityInput,
    setCompanyCityInput,
    companyLegalFormInput: companyForm.companyLegalFormInput,
    setCompanyLegalFormInput,
    companyAddressInput: companyForm.companyAddressInput,
    setCompanyAddressInput,
    companyIndustryInput: companyForm.companyIndustryInput,
    setCompanyIndustryInput,
    companyAboutShortInput: companyForm.companyAboutShortInput,
    setCompanyAboutShortInput,
    companyPhoneMainInput: companyForm.companyPhoneMainInput,
    setCompanyPhoneMainInput,
    companyPhoneWhatsAppInput: companyForm.companyPhoneWhatsAppInput,
    setCompanyPhoneWhatsAppInput,
    companyEmailInput: companyForm.companyEmailInput,
    setCompanyEmailInput,
    companySiteInput: companyForm.companySiteInput,
    setCompanySiteInput,
    companyTelegramInput: companyForm.companyTelegramInput,
    setCompanyTelegramInput,
    companyWorkTimeInput: companyForm.companyWorkTimeInput,
    setCompanyWorkTimeInput,
    companyContactPersonInput: companyForm.companyContactPersonInput,
    setCompanyContactPersonInput,
    companyAboutFullInput: companyForm.companyAboutFullInput,
    setCompanyAboutFullInput,
    companyServicesInput: companyForm.companyServicesInput,
    setCompanyServicesInput,
    companyRegionsInput: companyForm.companyRegionsInput,
    setCompanyRegionsInput,
    companyClientsTypesInput: companyForm.companyClientsTypesInput,
    setCompanyClientsTypesInput,
    companyInnInput: companyForm.companyInnInput,
    setCompanyInnInput,
    companyBinInput: companyForm.companyBinInput,
    setCompanyBinInput,
    companyRegNumberInput: companyForm.companyRegNumberInput,
    setCompanyRegNumberInput,
    companyBankDetailsInput: companyForm.companyBankDetailsInput,
    setCompanyBankDetailsInput,
    companyLicensesInfoInput: companyForm.companyLicensesInfoInput,
    setCompanyLicensesInfoInput,
  };
}
