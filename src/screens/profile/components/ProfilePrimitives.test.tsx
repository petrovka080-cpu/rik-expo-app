import React from "react";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";

import { LabeledInput, MenuActionRow, RowItem } from "./ProfilePrimitives";

jest.mock("@expo/vector-icons", () => ({
  Ionicons: (props: { name: string }) => {
    const React = require("react");
    const { Text } = require("react-native");
    return React.createElement(Text, null, props.name);
  },
}));

describe("ProfilePrimitives", () => {
  it("renders menu row and row item without crashing", () => {
    const onPress = jest.fn();
    let renderer: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <>
          <MenuActionRow
            testID="profile-menu-row"
            icon="person-outline"
            title="Профиль"
            subtitle="Открыть профиль"
            onPress={onPress}
          />
          <RowItem label="Email" value="user@example.com" />
        </>,
      );
    });

    const menuRow = renderer!.root.findByProps({ testID: "profile-menu-row" });
    expect(menuRow).toBeTruthy();
    menuRow.props.onPress();
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("renders labeled input with provided value", () => {
    const onChangeText = jest.fn();
    let renderer: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <LabeledInput
          testID="profile-labeled-input"
          label="Имя"
          value="Айбек"
          onChangeText={onChangeText}
        />,
      );
    });

    const input = renderer!.root.findByProps({
      testID: "profile-labeled-input",
    });
    expect(input.props.value).toBe("Айбек");
  });
});
