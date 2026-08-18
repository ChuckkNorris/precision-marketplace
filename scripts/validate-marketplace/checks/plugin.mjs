// One plugin directory: its manifest per harness, the optional root manifest,
// and version agreement across all of them.

import { join } from "node:path";
import { HARNESSES, PLUGIN_ROOT_MANIFEST } from "../config.mjs";
import { existsCaseSensitive, readJson } from "../lib/files.mjs";
import { rel } from "../lib/paths.mjs";
import { checkRules } from "../lib/rules.mjs";

function checkPluginManifest(report, harness, pluginName, pluginDir, marketplaceDescription) {
  const path = join(pluginDir, ...harness.pluginManifest.split("/"));
  const label = `plugin "${pluginName}" (${harness.id})`;
  if (!existsCaseSensitive(path)) {
    report.fail(`${label}: missing ${rel(path)} — every plugin must support all ${HARNESSES.length} harnesses`);
    return null;
  }
  const manifest = readJson(report, path, label);
  if (!manifest) return null;

  checkRules(report, harness.pluginRules, manifest, label);
  if (manifest.name && manifest.name !== pluginName) {
    report.fail(`${label}: name "${manifest.name}" must match the folder and marketplace entry "${pluginName}"`);
  }
  if (manifest.description && marketplaceDescription && manifest.description !== marketplaceDescription) {
    report.fail(`${label}: description does not match the ${harness.id} marketplace entry`);
  }
  return manifest;
}

// Returns the harness manifests found, which the skill check needs for the
// `skills` roots they declare.
export function checkPlugin(report, pluginName, pluginDir, harnessData) {
  const manifests = [];
  const versions = new Map();

  for (const harness of HARNESSES) {
    const data = harnessData.get(harness.id);
    if (!data) continue;
    const entry = data.entries.find((e) => e.name === pluginName);
    const manifest = checkPluginManifest(report, harness, pluginName, pluginDir, entry?.description);
    if (!manifest) continue;
    manifests.push(manifest);
    if (manifest.version) versions.set(harness.id, manifest.version);
  }

  // The optional root plugin.json is the source of truth when present.
  const rootPath = join(pluginDir, PLUGIN_ROOT_MANIFEST);
  if (existsCaseSensitive(rootPath)) {
    const rootManifest = readJson(report, rootPath, `plugin "${pluginName}" ${PLUGIN_ROOT_MANIFEST}`);
    if (rootManifest) {
      if (rootManifest.name !== pluginName) {
        report.fail(
          `plugin "${pluginName}": ${PLUGIN_ROOT_MANIFEST} name "${rootManifest.name}" must match the folder name`,
        );
      }
      if (rootManifest.version) versions.set(PLUGIN_ROOT_MANIFEST, rootManifest.version);
    }
  }

  if (new Set(versions.values()).size > 1) {
    const detail = [...versions].map(([k, v]) => `${k}=${v}`).join(", ");
    report.fail(`plugin "${pluginName}": version differs across harness manifests (${detail})`);
  }

  return manifests;
}
