import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { Alert, Keyboard } from "react-native";

import CalcModal from "../../src/components/foreman/CalcModal";

const mockUseCalcFields = jest.fn();
const mockRpc = jest.fn();

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    Ionicons: ({ name }: { name: string }) => React.createElement(Text, null, name),
  };
});

jest.mock("@/src/ui/FlashList", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    FlashList: ({
      data,
      renderItem,
    }: {
      data?: unknown[];
      renderItem?: (args: { item: unknown; index: number }) => React.ReactNode;
    }) =>
      React.createElement(
        View,
        { testID: "calc-results-list" },
        Array.isArray(data)
          ? data.map((item, index) =>
              React.createElement(View, { key: `row:${index}` }, renderItem ? renderItem({ item, index }) : null),
            )
          : null,
      ),
  };
});

jest.mock("../../src/ui/IconSquareButton", () => {
  const React = require("react");
  const { Pressable, View } = require("react-native");
  return function MockIconSquareButton(props: Record<string, unknown>) {
    return React.createElement(
      Pressable,
      {
        testID: props.testID ?? props.accessibilityLabel ?? "icon-square-button",
        onPress: props.onPress,
        disabled: props.disabled,
      },
      React.createElement(View, null, props.children),
    );
  };
});

jest.mock("../../src/ui/SendPrimaryButton", () => {
  const React = require("react");
  const { Pressable, Text } = require("react-native");
  return function MockSendPrimaryButton(props: Record<string, unknown>) {
    return React.createElement(
      Pressable,
      {
        testID: "send-primary-button",
        onPress: props.onPress,
        disabled: props.disabled,
      },
      React.createElement(Text, null, props.accessibilityLabel ?? "send"),
    );
  };
});

jest.mock("../../src/components/foreman/useCalcFields", () => ({
  useCalcFields: (...args: unknown[]) => mockUseCalcFields(...args),
}));

jest.mock("../../src/lib/supabaseClient", () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

describe("CalcModal", () => {
  let keyboardAddListenerSpy: jest.SpiedFunction<typeof Keyboard.addListener>;
  let keyboardDismissSpy: jest.SpiedFunction<typeof Keyboard.dismiss>;
  let alertSpy: jest.SpiedFunction<typeof Alert.alert>;

  beforeEach(() => {
    jest.useFakeTimers();
    mockUseCalcFields.mockReset();
    mockRpc.mockReset();

    keyboardAddListenerSpy = jest.spyOn(Keyboard, "addListener").mockImplementation(
      () =>
        ({
          remove: jest.fn(),
        }) as unknown as ReturnType<typeof Keyboard.addListener>,
    );
    keyboardDismissSpy = jest.spyOn(Keyboard, "dismiss").mockImplementation(() => undefined);
    alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);

    mockUseCalcFields.mockReturnValue({
      loading: false,
      error: null,
      fields: [
        {
          key: "area_m2",
          label: "Площадь",
          required: true,
          usedInNorms: true,
          uiPriority: "core",
        },
        {
          key: "multiplier",
          label: "Множитель",
          uiPriority: "secondary",
        },
      ],
    });
    mockRpc.mockResolvedValue({
      data: [
        {
          rik_code: "R-1",
          section: "main",
          qty: 2,
          suggested_qty: 3,
          uom_code: "шт",
          item_name_ru: "Позиция 1",
        },
      ],
      error: null,
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    keyboardAddListenerSpy.mockRestore();
    keyboardDismissSpy.mockRestore();
    alertSpy.mockRestore();
  });

  it("keeps full-success calculate and send semantics unchanged", async () => {
    const onAddToRequest = jest.fn();
    let renderer!: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(
        <CalcModal
          visible
          onClose={jest.fn()}
          workType={{ code: "WT-CONC", name: "Бетон" }}
          onAddToRequest={onAddToRequest}
        />,
      );
    });

    const areaInput = renderer.root.findByProps({ testID: "calc-field:area_m2" });
    await act(async () => {
      areaInput.props.onChangeText(" 2*3 ");
    });
    await act(async () => {
      areaInput.props.onBlur();
    });

    const calculateButton = renderer.root.findByProps({ testID: "calc-run-button" });
    await act(async () => {
      await calculateButton.props.onPress();
    });

    expect(mockRpc).toHaveBeenCalledWith("rpc_calc_work_kit", {
      p_work_type_code: "WT-CONC",
      p_inputs: {
        area_m2: 6,
        loss: 0,
      },
    });

    const sendButton = renderer.root.findByProps({ testID: "send-primary-button" });
    await act(async () => {
      await sendButton.props.onPress();
    });

    expect(onAddToRequest).toHaveBeenCalledWith([
      expect.objectContaining({
        rik_code: "R-1",
        section: "main",
        qty: 2,
        suggested_qty: 3,
      }),
    ]);
  });

  it("keeps invalid numeric input visible and blocks rpc submission", async () => {
    let renderer!: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(
        <CalcModal visible onClose={jest.fn()} workType={{ code: "WT-CONC", name: "Бетон" }} />,
      );
    });

    const areaInput = renderer.root.findByProps({ testID: "calc-field:area_m2" });
    await act(async () => {
      areaInput.props.onChangeText("bad");
    });
    await act(async () => {
      areaInput.props.onBlur();
    });

    expect(JSON.stringify(renderer.toJSON())).toContain("Некорректное значение");

    const calculateButton = renderer.root.findByProps({ testID: "calc-run-button" });
    await act(async () => {
      await calculateButton.props.onPress();
    });

    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("keeps back and cancel actions wired through the owner boundary", async () => {
    const onClose = jest.fn();
    const onBack = jest.fn();
    let renderer!: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(
        <CalcModal
          visible
          onClose={onClose}
          onBack={onBack}
          workType={{ code: "WT-CONC", name: "Бетон" }}
        />,
      );
    });

    const backButton = renderer.root.findByProps({ testID: "calc-back-button" });
    const cancelButton = renderer.root.findByProps({ testID: "calc-cancel-button" });

    await act(async () => {
      backButton.props.onPress();
      cancelButton.props.onPress();
    });

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(Keyboard.dismiss).toHaveBeenCalled();
  });
});
