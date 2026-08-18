#!/usr/bin/env node
// Validates every harness marketplace manifest, the plugin manifests they point
// at, the parity between them, and the skill frontmatter beneath them.
// Zero dependencies; run with: node scripts/validate-marketplace/index.mjs
//
// What each harness requires lives in config.mjs and nowhere else — this file
// only walks that config. Adding a harness, or moving one's manifest, is a
// config edit.

import { join } from "node:path";
import { HARNESSES, PLUGINS_DIR } from "./config.mjs";
import { checkMarketplace } from "./checks/marketplace.mjs";
import { checkPlugin } from "./checks/plugin.mjs";
import { checkMarketplaceParity, checkRegistration } from "./checks/parity.mjs";
import { checkPluginSkills } from "./checks/skills.mjs";
import { listDirectories, readJson } from "./lib/files.mjs";
import { fromRoot } from "./lib/paths.mjs";
import { createReport } from "./lib/report.mjs";

const report = createReport();

// --- Harness marketplace manifests -------------------------------------------

const harnessData = new Map();
for (const harness of HARNESSES) {
  const path = fromRoot(harness.marketplaceManifest);
  const manifest = readJson(report, path, `${harness.id} marketplace manifest`);
  if (!manifest) continue;
  harnessData.set(harness.id, {
    harness,
    manifest,
    path,
    entries: checkMarketplace(report, harness, manifest, path),
  });
}

// --- Cross-harness parity and registration -----------------------------------

checkMarketplaceParity(report, harnessData);

const pluginsDir = fromRoot(PLUGINS_DIR);
const onDisk = listDirectories(pluginsDir);
if (onDisk.length === 0) report.fail(`${PLUGINS_DIR}/: no plugin directories found`);

checkRegistration(report, harnessData, onDisk);

// --- Plugin manifests, versions, and skills -----------------------------------

for (const name of onDisk) {
  const pluginDir = join(pluginsDir, name);
  const manifests = checkPlugin(report, name, pluginDir, harnessData);
  checkPluginSkills(report, name, pluginDir, manifests);
}

// --- Result -------------------------------------------------------------------

if (report.errors.length > 0) {
  console.error(`Marketplace validation failed with ${report.errors.length} error(s):`);
  for (const err of report.errors) console.error(`  - ${err}`);
  process.exit(1);
}
console.log(
  `Marketplace validation passed (${onDisk.length} plugin(s) × ${HARNESSES.length} harness(es): ${HARNESSES.map((h) => h.id).join(", ")}).`,
);
