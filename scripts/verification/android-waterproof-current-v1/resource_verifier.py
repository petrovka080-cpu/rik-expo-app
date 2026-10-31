"""Private, read-only verifier proposal. Written but NOT executed by Astra.

Import verify_resources() from the parent verifier; this module runs no commands
and writes no files. The caller owns signing, AndroidManifest, source-identity,
and current-aapt2 provenance checks. Obtain the dump from the SAME immutable APK
and pass its captured SHA; never manufacture that association from a stale dump.
An Expo manifest collision is returned as OPEN even if every physical payload
matches. This helper never reports Android/UI acceptance.
"""
from collections import defaultdict
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import re
import zipfile


class VerificationError(RuntimeError):
    pass


def require(condition, message):
    if not condition:
        raise VerificationError(message)


def stream_hash(stream, algorithm="sha256"):
    h = hashlib.new(algorithm)
    while chunk := stream.read(1024 * 1024):
        h.update(chunk)
    return h.hexdigest()


def file_hash(path, algorithm="sha256"):
    with Path(path).open("rb") as stream:
        return stream_hash(stream, algorithm)


def relative_path(value):
    require(isinstance(value, str) and "\\" not in value, "NON_POSIX_RECEIPT_PATH")
    p = PurePosixPath(value)
    require(not p.is_absolute() and value == p.as_posix(), "NON_CANONICAL_RECEIPT_PATH")
    require(all(part not in ("", ".", "..") for part in p.parts), "UNSAFE_RECEIPT_PATH")
    return p


def physical_path(root, value):
    p = root.joinpath(*relative_path(value).parts).resolve(strict=True)
    require(p.is_relative_to(root), "SOURCE_ESCAPES_ROOT:" + value)
    require(p.is_file(), "SOURCE_NOT_FILE:" + value)
    return p


def indexed_files(items):
    result = {}
    for item in items:
        key = relative_path(item["path"]).as_posix()
        require(key not in result, "DUPLICATE_RECEIPT_PATH:" + key)
        require(isinstance(item["bytes"], int) and item["bytes"] >= 0, "BAD_FILE_SIZE:" + key)
        require(re.fullmatch(r"[0-9a-f]{64}", item["sha256"]), "BAD_FILE_SHA:" + key)
        result[key] = {"bytes": item["bytes"], "sha256": item["sha256"]}
    return result


ASSETS = "android/app/build/generated/assets/createBundleWaterProofJsAndAssets/"
RES = "android/app/build/generated/res/createBundleWaterProofJsAndAssets/"
UPDATES = "android/app/build/generated/assets/createWaterProofUpdatesResources/"
BUNDLE = ASSETS + "index.android.bundle"
DENSITIES = {0.75: "ldpi", 1: "mdpi", 1.5: "hdpi", 2: "xhdpi", 3: "xxhdpi", 4: "xxxhdpi"}


def resource_key(relative_resource_path, package):
    parts = relative_path(relative_resource_path).parts
    require(len(parts) == 2, "UNSUPPORTED_RESOURCE_PATH:" + relative_resource_path)
    folder, filename = parts
    require(not filename.endswith(".9.png"), "NINE_PATCH_REQUIRES_SEPARATE_SEMANTIC_CHECK")
    name, dot, extension = filename.rpartition(".")
    require(dot and re.fullmatch(r"[a-z0-9_]+", name), "UNSUPPORTED_RESOURCE_NAME:" + filename)
    if folder == "raw":
        kind, config = "raw", ""
    else:
        require(folder.startswith("drawable-"), "UNSUPPORTED_RESOURCE_FOLDER:" + folder)
        kind, config = "drawable", folder.removeprefix("drawable-")
        require(config in DENSITIES.values(), "UNSUPPORTED_DENSITY_CONFIG:" + config)
    return (package, kind, name, config), extension


def parse_resource_dump(text, expected_keys, package):
    """Strict parser for the OBSERVED build-tools 36 aapt2 text format.

    Configuration strings are exact; do not strip -vNN/night/locale qualifiers.
    Unknown/alias/complex values for an expected resource fail closed. AAPT path
    shortening and several keys pointing to one ZIP entry are both permitted.
    """
    package_re = re.compile(r"^Package name=(\S+) id=([0-9a-fA-F]{2})\s*$")
    type_re = re.compile(r"^  type ([A-Za-z0-9_]+) id=([0-9a-fA-F]{2}) entryCount=\d+\s*$")
    resource_re = re.compile(r"^    resource (0x[0-9a-fA-F]{8}) ([A-Za-z0-9_]+)/([A-Za-z0-9_.$]+)(?:\s+.*)?$")
    value_re = re.compile(r"^      \(([^)]*)\) \(file\) (res/[^\s]+)(?: type=([A-Za-z0-9_]+))?\s*$")
    expected_names = {key[:3] for key in expected_keys}
    found = {}
    ids = {}
    current_package = current_type = current_name = None
    package_id = type_id = None
    expected_package_seen = False
    for line_number, line in enumerate(text.splitlines(), 1):
        m = package_re.fullmatch(line)
        if m:
            current_package, package_id = m.group(1), int(m.group(2), 16)
            current_type = current_name = None
            if current_package == package:
                require(not expected_package_seen, "DUPLICATE_EXPECTED_PACKAGE")
                expected_package_seen = True
            continue
        m = type_re.fullmatch(line)
        if m:
            current_type, type_id = m.group(1), int(m.group(2), 16)
            current_name = None
            continue
        m = resource_re.fullmatch(line)
        if m:
            resource_id = int(m.group(1), 16)
            name_key = (current_package, m.group(2), m.group(3))
            current_name = name_key if name_key in expected_names else None
            if current_name:
                require(current_type == m.group(2), "RESOURCE_TYPE_HEADER_MISMATCH")
                require((resource_id >> 24) == package_id and ((resource_id >> 16) & 255) == type_id,
                        "RESOURCE_ID_HEADER_MISMATCH")
                require(current_name not in ids, "DUPLICATE_RESOURCE_HEADER:" + repr(current_name))
                ids[current_name] = m.group(1)
            continue
        if line.lstrip().startswith(("Package ", "type ", "resource ")):
            raise VerificationError("UNSUPPORTED_AAPT_HEADER:" + str(line_number))
        if current_name and line.strip():
            m = value_re.fullmatch(line)
            require(m is not None, "UNSUPPORTED_EXPECTED_RESOURCE_VALUE:" + str(line_number))
            key = current_name + (m.group(1),)
            require(key in expected_keys, "UNEXPECTED_RESOURCE_CONFIGURATION:" + repr(key))
            require(key not in found, "DUPLICATE_RESOURCE_CONFIGURATION:" + repr(key))
            entry = relative_path(m.group(2)).as_posix()
            require(entry.startswith("res/"), "RESOURCE_FILE_OUTSIDE_RES")
            found[key] = {"resourceId": ids[current_name], "apkEntry": entry,
                          "aaptFileType": m.group(3), "dumpLine": line_number}
    require(expected_package_seen, "EXPECTED_PACKAGE_NOT_FOUND")
    require(set(found) == set(expected_keys), "MISSING_RESOURCE_KEYS:" + repr(set(expected_keys) - set(found)))
    return found


def compare_png_pixels(source, packed_bytes):
    """Only called after exact-source SHA and explicit actual-crunch admission."""
    from PIL import Image
    require(packed_bytes.startswith(b"\x89PNG\r\n\x1a\n"), "CRUNCHED_OUTPUT_NOT_PNG")
    with Image.open(source) as a, Image.open(io.BytesIO(packed_bytes)) as b:
        require(a.format == b.format == "PNG", "PIXEL_FALLBACK_NOT_PNG")
        require(getattr(a, "n_frames", 1) == getattr(b, "n_frames", 1) == 1, "ANIMATED_PNG_NOT_SUPPORTED")
        require(a.size == b.size, "PNG_DIMENSIONS_CHANGED")
        for key in ("icc_profile", "gamma", "srgb", "chromaticity"):
            require(a.info.get(key) == b.info.get(key), "PNG_COLOR_SEMANTICS_CHANGED:" + key)
        ap, bp = a.convert("RGBA").tobytes(), b.convert("RGBA").tobytes()
        require(ap == bp, "PNG_PIXELS_CHANGED")
        return {"width": a.width, "height": a.height,
                "decodedRgbaSha256": hashlib.sha256(ap).hexdigest()}


def verify_resources(*, root, apk_path, dump_text, dump_source_apk_sha256,
                     js, hermes, updates, precomputed,
                     package="com.azisbek_dzhantaev.rikexpoapp",
                     allow_actual_aapt_png_crunch=False):
    root, apk_path = Path(root).resolve(strict=True), Path(apk_path).resolve(strict=True)
    require(file_hash(apk_path) == dump_source_apk_sha256, "DUMP_APK_IDENTITY_MISMATCH")
    require(js["status"] == "PASS_OFFICIAL_EMBEDDED_JS_EXPORT_ONLY", "JS_EXPORT_NOT_ACCEPTED")
    require(hermes["status"] == "PASS_HERMES_COMPILE_ONLY", "HERMES_NOT_ACCEPTED")
    require(updates["status"] == "PASS_OFFICIAL_EXPO_UPDATES_RESOURCES_ONLY", "UPDATES_NOT_ACCEPTED")
    for field in ("sourceHead", "sourceTree", "jsBundleFingerprint", "capabilityId", "definitionReleaseId", "searchReleaseId"):
        require(js["inputs"][field] == hermes["inputs"][field] == updates["inputs"][field],
                "PHASE_IDENTITY_MISMATCH:" + field)
    require(precomputed["sourceHead"] == js["inputs"]["sourceHead"], "PRECOMPUTED_HEAD_MISMATCH")
    js_files, update_files = indexed_files(js["artifact"]["files"]), indexed_files(updates["artifact"]["files"])
    require(BUNDLE in js_files, "JS_BUNDLE_RECEIPT_MISSING")
    require(js_files[BUNDLE]["sha256"] == hermes["artifact"]["sourceJsSha256"], "HERMES_INPUT_SHA_MISMATCH")
    require(js_files[BUNDLE]["bytes"] == hermes["artifact"]["sourceJsBytes"], "HERMES_INPUT_SIZE_MISMATCH")
    require(not set(js_files).intersection(update_files), "PHASE_PATH_COLLISION")
    expected = {**js_files, **update_files}
    expected[BUNDLE] = {"bytes": hermes["artifact"]["bytecodeBytes"], "sha256": hermes["artifact"]["bytecodeSha256"]}
    require(indexed_files(precomputed["files"]) == expected, "PRECOMPUTED_RECEIPT_NOT_EXACT_PHASE_UNION")
    require(set(update_files) == {UPDATES + "app.manifest", UPDATES + "fingerprint"}, "UNEXPECTED_EXPO_OUTPUT_SET")
    actual_paths = set()
    for prefix in (ASSETS, RES, UPDATES):
        directory = root.joinpath(*PurePosixPath(prefix).parts).resolve(strict=True)
        require(directory.is_relative_to(root), "GENERATED_DIRECTORY_ESCAPES_ROOT")
        for file in directory.rglob("*"):
            require(not file.is_symlink(), "UNEXPECTED_GENERATED_SYMLINK:" + str(file))
            if file.is_file():
                actual_paths.add(file.relative_to(root).as_posix())
    require(actual_paths == set(expected), "GENERATED_FILE_SET_DIFF:" + repr({
        "missing": sorted(set(expected) - actual_paths), "extra": sorted(actual_paths - set(expected))}))
    source_files = {}
    resource_sources = {}
    for path, item in expected.items():
        require(path.startswith((ASSETS, RES, UPDATES)), "UNEXPECTED_PHASE_PREFIX:" + path)
        source = physical_path(root, path)
        require(source.stat().st_size == item["bytes"] and file_hash(source) == item["sha256"], "PHASE_SOURCE_CHANGED:" + path)
        source_files[path] = source
        if path.startswith(RES):
            key, extension = resource_key(path.removeprefix(RES), package)
            require(key not in resource_sources, "SOURCE_RESOURCE_KEY_COLLISION:" + repr(key))
            resource_sources[key] = {"sourcePath": path, "extension": extension, "sourceMd5": file_hash(source, "md5")}
    table = parse_resource_dump(dump_text, set(resource_sources), package)
    rows = []
    with zipfile.ZipFile(apk_path) as z:
        names = z.namelist()
        require(len(names) == len(set(names)), "DUPLICATE_ZIP_ENTRY")
        for path, item in expected.items():
            resource = None
            if path.startswith(RES):
                key, extension = resource_key(path.removeprefix(RES), package)
                resource = table[key]
                entry = resource["apkEntry"]
            else:
                prefix = ASSETS if path.startswith(ASSETS) else UPDATES
                entry = "assets/" + path.removeprefix(prefix)
            require(entry in names, "MISSING_PACKAGED_ENTRY:" + entry)
            with z.open(entry) as f:
                packed_sha = stream_hash(f)
            row = {"source": path, "apkEntry": entry, "sourceSha256": item["sha256"],
                   "packagedSha256": packed_sha, "method": "exact-sha256"}
            if resource:
                row.update(resource)
                row["key"] = list(key)
            if packed_sha != item["sha256"]:
                require(resource is not None and extension == "png" and resource["aaptFileType"] == "PNG",
                        "PACKAGED_BYTES_CHANGED:" + path)
                require(allow_actual_aapt_png_crunch, "PNG_CRUNCH_NOT_PROVEN:" + path)
                packed_png = z.read(entry)
                relative = path.removeprefix(RES)
                flat = root / 'android/app/build/intermediates/merged_res/waterProof/mergeWaterProofResources' / (relative.replace('/', '_') + '.flat')
                require(flat.is_file(), 'AAPT_COMPILED_RESOURCE_MISSING:' + str(flat))
                flat_bytes = flat.read_bytes()
                require(packed_png in flat_bytes, 'PACKAGED_PNG_NOT_IN_AAPT_COMPILED_OUTPUT:' + path)
                row['aaptCompileEvidence'] = {'path': str(flat.relative_to(root)), 'sha256': file_hash(flat), 'packagedPngOffset': flat_bytes.index(packed_png)}
                row["pixels"] = compare_png_pixels(source_files[path], packed_png)
                row["method"] = "same-decoded-pixels-after-verified-aapt-crunch"
            rows.append(row)

        manifest = json.loads(z.read("assets/app.manifest").decode("utf-8"))
        groups = defaultdict(list)
        mismatches = []
        for index, record in enumerate(manifest["assets"]):
            kind = record["resourcesFolder"]
            require(kind in ("drawable", "raw"), "UNSUPPORTED_MANIFEST_RESOURCE_KIND")
            scale = record["scale"]
            if kind == "drawable":
                require(scale in DENSITIES, "UNSUPPORTED_MANIFEST_SCALE")
                config = DENSITIES[scale]
            else:
                require(scale == 1, "RAW_SCALE_NOT_ONE")
                config = ""
            key = (package, kind, record["resourcesFilename"], config)
            require(key in resource_sources, "MANIFEST_RESOURCE_NOT_EXPORTED:" + repr(key))
            source = resource_sources[key]
            require(record["type"] == source["extension"], "MANIFEST_RESOURCE_EXTENSION_MISMATCH")
            require(re.fullmatch(r"[0-9a-f]{32}", record["packagerHash"]), "BAD_MANIFEST_PACKAGER_HASH")
            evidence = {"manifestIndex": index, "key": list(key), "packagerHash": record["packagerHash"],
                        "exportedSourceMd5": source["sourceMd5"], "source": source["sourcePath"]}
            groups[key].append(evidence)
            if record["packagerHash"] != source["sourceMd5"]:
                mismatches.append(evidence)
        runtime_keys = set(resource_sources) - {(package, "raw", "keep", "")}
        require(set(groups) == runtime_keys, "MANIFEST_PHYSICAL_RESOURCE_KEY_SET_DIFF")
        collisions = [{"key": list(key), "records": records} for key, records in groups.items()
                      if len({item["packagerHash"] for item in records}) > 1]
    require(file_hash(apk_path) == dump_source_apk_sha256, "APK_CHANGED_DURING_VERIFICATION")
    semantics_ok = not collisions and not mismatches
    return {
        "status": "PASS_RESOURCE_PACKAGING_ONLY" if semantics_ok else "OPEN_ASSET_SEMANTIC_PARITY",
        "physicalPayloadParity": "PASS", "manifestAssetSemantics": "PASS" if semantics_ok else "OPEN",
        "apkSha256": dump_source_apk_sha256, "dumpSha256": hashlib.sha256(dump_text.encode("utf-8")).hexdigest(),
        "generatedDirectoryFileSetExact": True, "precomputedReceiptPhaseUnionExact": True,
        "physicalRuntimeResourcesVerified": len(runtime_keys), "resourceFilesIncludingKeep": len(resource_sources),
        "packagedPhaseFilesVerified": len(rows), "updatesResourceFilesVerified": len(update_files),
        "manifestAssetRecords": len(manifest["assets"]), "manifestUniqueResourceKeys": len(groups),
        "manifestCollisions": collisions, "manifestHashMismatches": mismatches,
        "checks": rows, "androidUiAccepted": False,
    }
