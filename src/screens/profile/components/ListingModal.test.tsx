import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import { ListingModal } from "./ListingModal";

jest.mock("../../../ui/React19SafeModal", () => {
  const React = require("react");
  const { View } = require("react-native");
  return function MockReact19SafeModal(props: Record<string, unknown>) {
    if (!props.isVisible) return null;
    return React.createElement(
      View,
      {
        testID: "safe-modal",
        modalProps: props,
      },
      props.children,
    );
  };
});

jest.mock("./ProfilePrimitives", () => {
  const React = require("react");
  const { View, TextInput } = require("react-native");
  return {
    LabeledInput: React.forwardRef((props: Record<string, unknown>, ref: unknown) =>
      React.createElement(
        View,
        { testID: `labeled-input:${String(props.label || "")}` },
        React.createElement(TextInput, {
          ref,
          value: props.value,
          onChangeText: props.onChangeText,
          returnKeyType: props.returnKeyType,
          onSubmitEditing: props.onSubmitEditing,
        }),
      )),
  };
});

const createProps = () => ({
  visible: true,
  itemModalOpen: false,
  listingForm: {
    listingKind: "service" as const,
    listingTitle: "газ",
    listingDescription: "",
    listingPhone: "",
    listingWhatsapp: "",
    listingEmail: "",
    listingCity: "",
    listingPrice: "",
    listingUom: "",
    listingRikCode: "",
  },
  listingCartItems: [],
  editingItem: null,
  catalogResults: [],
  savingListing: false,
  catalogLoading: false,
  onRequestClose: jest.fn(),
  onPublish: jest.fn(),
  onChangeListingKind: jest.fn(),
  onChangeListingTitle: jest.fn(),
  onChangeListingDescription: jest.fn(),
  onChangeListingPhone: jest.fn(),
  onChangeListingWhatsapp: jest.fn(),
  onChangeListingEmail: jest.fn(),
  onInlineCatalogPick: jest.fn(),
  onItemModalClose: jest.fn(),
  onChangeEditingItemCity: jest.fn(),
  onChangeEditingItemUom: jest.fn(),
  onChangeEditingItemQty: jest.fn(),
  onChangeEditingItemPrice: jest.fn(),
  onConfirmEditingItem: jest.fn(),
});

describe("ListingModal", () => {
  it("keeps close action outside the scroll body and wired on the safe modal host", () => {
    const props = createProps();
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<ListingModal {...props} />);
    });

    const modal = renderer.root.findByProps({ testID: "safe-modal" });
    const closeButton = renderer.root.findByProps({ testID: "add-listing-flow-close" });
    const backButton = renderer.root.findByProps({ testID: "add-listing-header-back" });
    const scroll = renderer.root.findByType(require("react-native").ScrollView);

    expect(scroll.props.keyboardShouldPersistTaps).toBe("handled");

    act(() => {
      modal.props.modalProps.onBackdropPress();
    });

    act(() => {
      backButton.props.onPress();
    });

    act(() => {
      closeButton.props.onPress();
    });

    expect(props.onRequestClose).toHaveBeenCalledTimes(3);
  });

  it("keeps publish action wired while the footer stays interactive", () => {
    const props = createProps();
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<ListingModal {...props} />);
    });

    const publishButton = renderer.root.findByProps({ testID: "add-listing-flow-publish" });

    act(() => {
      publishButton.props.onPress();
    });

    expect(props.onPublish).toHaveBeenCalledTimes(1);
  });

  it("shows fullscreen shell and busy submit feedback without extra contact fields", () => {
    const props = createProps();
    props.savingListing = true;
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<ListingModal {...props} />);
    });

    expect(renderer.root.findByProps({ testID: "add-listing-owner-shell" })).toBeTruthy();
    expect(renderer.root.findAllByProps({ testID: "labeled-input:WhatsApp" })).toHaveLength(0);
    expect(renderer.root.findAllByProps({ testID: "labeled-input:Email" })).toHaveLength(0);
    expect(renderer.root.findAllByType(require("react-native").ActivityIndicator)).toHaveLength(1);

    const modal = renderer.root.findByProps({ testID: "safe-modal" });
    const closeButton = renderer.root.findByProps({ testID: "add-listing-flow-close" });
    const backButton = renderer.root.findByProps({ testID: "add-listing-header-back" });

    act(() => {
      modal.props.modalProps.onBackdropPress();
      backButton.props.onPress();
      closeButton.props.onPress();
    });

    expect(props.onRequestClose).not.toHaveBeenCalled();
  });
});
