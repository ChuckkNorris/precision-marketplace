// File reads and directory listings, normalized so a manifest that resolves on
// Windows/macOS also resolves on Linux CI.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { rel } from "./paths.mjs";

export function isDirectory(path) {
  const stats = statSync(path, { throwIfNoEntry: false });
  return stats ? stats.isDirectory() : false;
}

// Strip the UTF-8 BOM and normalize CRLF so files authored on Windows parse the
// same as ones authored on Linux/macOS.
export function readText(path) {
  return readFileSync(path, "utf8")
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n");
}

export function readJson(report, path, label) {
  if (!existsSync(path)) {
    report.fail(`${label}: file not found at ${rel(path)}`);
    return null;
  }
  try {
    return JSON.parse(readText(path));
  } catch (err) {
    report.fail(`${label}: invalid JSON (${err.message})`);
    return null;
  }
}

// Windows and macOS resolve paths case-insensitively; Linux CI does not. Confirm
// the on-disk name matches the referenced name byte for byte.
export function existsCaseSensitive(path) {
  if (!existsSync(path)) return false;
  const parent = dirname(path);
  const name = basename(path);
  if (parent === path) return true;
  try {
    return readdirSync(parent).includes(name);
  } catch {
    return false;
  }
}

// Sorted, dot-free subdirectory names — the plugin list, and the skill list.
export function listDirectories(path) {
  if (!isDirectory(path)) return [];
  return readdirSync(path)
    .sort()
    .filter((name) => !name.startsWith(".") && isDirectory(join(path, name)));
}

// Key-order-independent serialization, for comparing values across manifests.
export function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.keys(value)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`)
    .join(",")}}`;
}
