import fs from "node:fs";
import path from "node:path";

const MOJIBAKE_MARKERS = ["Р ", "Рљ", "Рњ", "Р”", "СЃ", "вЂ", "В·", "�"];

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

describe("iOS Store build after build 48 config", () => {
  it("keeps the next Store build number above 48 and native permission text readable", () => {
    const app = JSON.parse(fs.readFileSync(path.join(process.cwd(), "app.json"), "utf8")) as JsonRecord;
    const expo = record(app.expo);
    const ios = record(expo.ios);
    const buildNumber = Number(ios.buildNumber);
    expect(Number.isInteger(buildNumber)).toBe(true);
    expect(buildNumber).toBeGreaterThan(48);

    const plugins = Array.isArray(expo.plugins) ? expo.plugins : [];
    const cameraPlugin = plugins.find((plugin) => Array.isArray(plugin) && plugin[0] === "expo-camera") as unknown[] | undefined;
    const imagePickerPlugin = plugins.find((plugin) => Array.isArray(plugin) && plugin[0] === "expo-image-picker") as unknown[] | undefined;
    const infoPlist = record(ios.infoPlist);
    const permissionText = [
      record(cameraPlugin?.[1]).cameraPermission,
      record(imagePickerPlugin?.[1]).photosPermission,
      record(imagePickerPlugin?.[1]).cameraPermission,
      infoPlist.NSCameraUsageDescription,
      infoPlist.NSPhotoLibraryUsageDescription,
      infoPlist.NSMicrophoneUsageDescription,
      infoPlist.NSLocationWhenInUseUsageDescription,
      infoPlist.NSLocationAlwaysAndWhenInUseUsageDescription,
    ].map(String);

    expect(permissionText.every((value) => /[А-Яа-яЁё]/u.test(value))).toBe(true);
    expect(permissionText.flatMap((value) => MOJIBAKE_MARKERS.filter((marker) => value.includes(marker)))).toEqual([]);
  });
});
