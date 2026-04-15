/**
 * OfficeHub helpers — mechanical extraction (C-REAL-1).
 *
 * Contains pre-component helpers, types, and the error boundary class
 * that were defined before the OfficeHubScreen component function.
 *
 * Extracted verbatim from OfficeHubScreen.tsx lines 127-204.
 * No logic was changed or added.
 */

import React from "react";
import type { OfficeAccessScreenData , CreateCompanyDraft } from "./officeAccess.types";

export const EMPTY_COMPANY_DRAFT: CreateCompanyDraft = {
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
};

export function buildOfficeBootstrapCompanyDraft(
  data: OfficeAccessScreenData,
): CreateCompanyDraft {
  return {
    ...EMPTY_COMPANY_DRAFT,
    phoneMain: data.profile.phone || "",
    email: data.profileEmail || "",
  };
}

export type OfficeHubScreenProps = {
  officeReturnReceipt?: Record<string, unknown> | null;
  routeScopeActive?: boolean;
};

export function isWarehouseOfficeReturnReceipt(
  receipt: Record<string, unknown> | null | undefined,
) {
  return (
    receipt?.sourceRoute === "/office/warehouse" &&
    receipt?.target === "/office"
  );
}

type OfficePostReturnSubtreeBoundaryProps = {
  children: React.ReactNode;
  onError: (error: Error, info: React.ErrorInfo) => void;
  onMount: () => void;
};

type OfficePostReturnSubtreeBoundaryState = {
  error: Error | null;
};

export class OfficePostReturnSubtreeBoundary extends React.Component<
  OfficePostReturnSubtreeBoundaryProps,
  OfficePostReturnSubtreeBoundaryState
> {
  state: OfficePostReturnSubtreeBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(
    error: Error,
  ): Partial<OfficePostReturnSubtreeBoundaryState> {
    return { error };
  }

  componentDidMount() {
    this.props.onMount();
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.props.onError(error, info);
  }

  render() {
    if (this.state.error) {
      throw this.state.error;
    }

    return this.props.children;
  }
}
