import { Alert, Platform } from "react-native";

type ImagePickerModule = typeof import("expo-image-picker");

function loadImagePicker(): ImagePickerModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("expo-image-picker") as ImagePickerModule;
  } catch {
    return null;
  }
}

export async function pickProfileAvatarDraftUri(): Promise<string | null | undefined> {
  const ImagePicker = loadImagePicker();
  if (!ImagePicker) {
    Alert.alert("Профиль", "Выбор изображения недоступен в этой сборке.");
    return undefined;
  }

  if (Platform.OS !== "web") {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Профиль", "Разрешите доступ к фото, чтобы загрузить аватар.");
      return undefined;
    }
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  });

  return result.canceled ? undefined : result.assets[0]?.uri ?? null;
}
