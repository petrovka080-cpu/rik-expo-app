import { useCallback, useState } from "react";

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

  const setCompanyNameInput = useCallback((value: string) => {
    setCompanyForm((prev) => ({ ...prev, companyNameInput: value }));
  }, []);
  const setCompanyCityInput = useCallback((value: string) => {
    setCompanyForm((prev) => ({ ...prev, companyCityInput: value }));
  }, []);
  const setCompanyLegalFormInput = useCallback((value: string) => {
    setCompanyForm((prev) => ({ ...prev, companyLegalFormInput: value }));
  }, []);
  const setCompanyAddressInput = useCallback((value: string) => {
    setCompanyForm((prev) => ({ ...prev, companyAddressInput: value }));
  }, []);
  const setCompanyIndustryInput = useCallback((value: string) => {
    setCompanyForm((prev) => ({ ...prev, companyIndustryInput: value }));
  }, []);
  const setCompanyAboutShortInput = useCallback((value: string) => {
    setCompanyForm((prev) => ({ ...prev, companyAboutShortInput: value }));
  }, []);
  const setCompanyPhoneMainInput = useCallback((value: string) => {
    setCompanyForm((prev) => ({ ...prev, companyPhoneMainInput: value }));
  }, []);
  const setCompanyPhoneWhatsAppInput = useCallback((value: string) => {
    setCompanyForm((prev) => ({ ...prev, companyPhoneWhatsAppInput: value }));
  }, []);
  const setCompanyEmailInput = useCallback((value: string) => {
    setCompanyForm((prev) => ({ ...prev, companyEmailInput: value }));
  }, []);
  const setCompanySiteInput = useCallback((value: string) => {
    setCompanyForm((prev) => ({ ...prev, companySiteInput: value }));
  }, []);
  const setCompanyTelegramInput = useCallback((value: string) => {
    setCompanyForm((prev) => ({ ...prev, companyTelegramInput: value }));
  }, []);
  const setCompanyWorkTimeInput = useCallback((value: string) => {
    setCompanyForm((prev) => ({ ...prev, companyWorkTimeInput: value }));
  }, []);
  const setCompanyContactPersonInput = useCallback((value: string) => {
    setCompanyForm((prev) => ({ ...prev, companyContactPersonInput: value }));
  }, []);
  const setCompanyAboutFullInput = useCallback((value: string) => {
    setCompanyForm((prev) => ({ ...prev, companyAboutFullInput: value }));
  }, []);
  const setCompanyServicesInput = useCallback((value: string) => {
    setCompanyForm((prev) => ({ ...prev, companyServicesInput: value }));
  }, []);
  const setCompanyRegionsInput = useCallback((value: string) => {
    setCompanyForm((prev) => ({ ...prev, companyRegionsInput: value }));
  }, []);
  const setCompanyClientsTypesInput = useCallback((value: string) => {
    setCompanyForm((prev) => ({ ...prev, companyClientsTypesInput: value }));
  }, []);
  const setCompanyInnInput = useCallback((value: string) => {
    setCompanyForm((prev) => ({ ...prev, companyInnInput: value }));
  }, []);
  const setCompanyBinInput = useCallback((value: string) => {
    setCompanyForm((prev) => ({ ...prev, companyBinInput: value }));
  }, []);
  const setCompanyRegNumberInput = useCallback((value: string) => {
    setCompanyForm((prev) => ({ ...prev, companyRegNumberInput: value }));
  }, []);
  const setCompanyBankDetailsInput = useCallback((value: string) => {
    setCompanyForm((prev) => ({ ...prev, companyBankDetailsInput: value }));
  }, []);
  const setCompanyLicensesInfoInput = useCallback((value: string) => {
    setCompanyForm((prev) => ({ ...prev, companyLicensesInfoInput: value }));
  }, []);

  const hydrateCompanyForm = useCallback((params: {
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
  }, []);

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
