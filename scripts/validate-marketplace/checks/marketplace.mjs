// One root marketplace manifest per harness: its own fields, and the plugin
// entries it declares.

import { KEBAB, MARKETPLACE_RULES } from "../config.mjs";
import { existsCaseSensitive } from "../lib/files.mjs";
import { rel, resolveSource } from "../lib/paths.mjs";
import { checkRules } from "../lib/rules.mjs";

// Returns the entries whose source resolved, for the parity and plugin checks.
export function checkMarketplace(report, harness, manifest, path) {
  const label = rel(path);

  checkRules(report, MARKETPLACE_RULES, manifest, label);
  if (manifest.name && manifest.name !== harness.marketplaceName) {
    report.fail(`${label}: "name" must be "${harness.marketplaceName}" (got ${JSON.stringify(manifest.name)})`);
  }
  if (!Array.isArray(manifest.plugins)) return [];

  const entries = [];
  const seen = new Set();
  for (const entry of manifest.plugins) {
    const name = entry?.name ?? "<unnamed>";
    if (!entry?.name || !KEBAB.test(entry.name)) {
      report.fail(`${label}: plugin name ${JSON.stringify(entry?.name)} must be kebab-case`);
    }
    if (seen.has(name)) report.fail(`${label}: duplicate plugin name "${name}"`);
    seen.add(name);

    const source = typeof entry?.source === "object" ? entry.source?.path : entry?.source;
    if (!source) {
      report.fail(`${label}: plugin "${name}" is missing "source"`);
      continue;
    }
    const dir = resolveSource(report, source, `${label}: plugin "${name}"`);
    if (!dir) continue;
    if (!existsCaseSensitive(dir)) {
      report.fail(`${label}: plugin "${name}" source "${source}" does not exist (case-sensitive match)`);
      continue;
    }
    entries.push({ name, source, dir, description: entry.description });
  }
  return entries;
}
