export type MobilePhotoPickerAsset = {
  uri: string;
  width?: number | null;
  height?: number | null;
};

export type MobilePhotoRecoveryService = {
  launchSystemCamera: () => Promise<MobilePhotoPickerAsset | null>;
  pickFromLibrary: () => Promise<MobilePhotoPickerAsset | null>;
  pickManyFromLibrary: (selectionLimit?: number) => Promise<MobilePhotoPickerAsset[]>;
  restorePendingSystemResult: () => Promise<MobilePhotoPickerAsset | null>;
};

type ImagePickerResult = {
  canceled?: boolean;
  cancelled?: boolean;
  assets?: {
    uri?: string | null;
    width?: number | null;
    height?: number | null;
  }[];
};

type ExpoImagePickerModule = {
  launchCameraAsync?: (options?: Record<string, unknown>) => Promise<ImagePickerResult>;
  launchImageLibraryAsync?: (options?: Record<string, unknown>) => Promise<ImagePickerResult>;
  getPendingResultAsync?: () => Promise<ImagePickerResult | ImagePickerResult[] | null>;
  MediaTypeOptions?: {
    Images?: string;
  };
};

function loadImagePicker(): ExpoImagePickerModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("expo-image-picker") as ExpoImagePickerModule;
  } catch {
    return null;
  }
}

function firstAsset(result: ImagePickerResult | null | undefined): MobilePhotoPickerAsset | null {
  if (!result || result.canceled === true || result.cancelled === true) return null;
  const asset = result.assets?.[0];
  const uri = String(asset?.uri ?? "").trim();
  if (!uri) return null;
  return {
    uri,
    width: asset?.width ?? null,
    height: asset?.height ?? null,
  };
}

function assetsFromResult(result: ImagePickerResult | null | undefined, selectionLimit?: number): MobilePhotoPickerAsset[] {
  if (!result || result.canceled === true || result.cancelled === true) return [];
  const limit = Number.isFinite(selectionLimit) && Number(selectionLimit) > 0
    ? Math.floor(Number(selectionLimit))
    : 1;
  const assets: MobilePhotoPickerAsset[] = [];
  for (const asset of (result.assets ?? []).slice(0, limit)) {
    const uri = String(asset?.uri ?? "").trim();
    if (!uri) continue;
    assets.push({
      uri,
      width: asset?.width ?? null,
      height: asset?.height ?? null,
    });
  }
  return assets;
}

function firstPendingResult(result: ImagePickerResult | ImagePickerResult[] | null): MobilePhotoPickerAsset | null {
  if (Array.isArray(result)) {
    for (const item of result) {
      const asset = firstAsset(item);
      if (asset) return asset;
    }
    return null;
  }
  return firstAsset(result);
}

const pickerOptions = (module: ExpoImagePickerModule | null) => ({
  mediaTypes: module?.MediaTypeOptions?.Images ?? "Images",
  allowsEditing: false,
  quality: 1,
  exif: false,
  base64: false,
});

const multiPickerOptions = (module: ExpoImagePickerModule | null, selectionLimit?: number) => ({
  ...pickerOptions(module),
  allowsMultipleSelection: true,
  selectionLimit: Number.isFinite(selectionLimit) && Number(selectionLimit) > 0
    ? Math.floor(Number(selectionLimit))
    : 1,
});

export function createMobilePhotoRecoveryService(
  loadModule: () => ExpoImagePickerModule | null = loadImagePicker,
): MobilePhotoRecoveryService {
  return {
    async launchSystemCamera() {
      const module = loadModule();
      if (!module?.launchCameraAsync) return null;
      return firstAsset(await module.launchCameraAsync(pickerOptions(module)));
    },
    async pickFromLibrary() {
      const module = loadModule();
      if (!module?.launchImageLibraryAsync) return null;
      return firstAsset(await module.launchImageLibraryAsync(pickerOptions(module)));
    },
    async pickManyFromLibrary(selectionLimit) {
      const module = loadModule();
      if (!module?.launchImageLibraryAsync) return [];
      const limit = Number.isFinite(selectionLimit) && Number(selectionLimit) > 0
        ? Math.floor(Number(selectionLimit))
        : 1;
      const result = await module.launchImageLibraryAsync(
        limit > 1 ? multiPickerOptions(module, limit) : pickerOptions(module),
      );
      return assetsFromResult(result, limit);
    },
    async restorePendingSystemResult() {
      const module = loadModule();
      if (!module?.getPendingResultAsync) return null;
      return firstPendingResult(await module.getPendingResultAsync());
    },
  };
}
