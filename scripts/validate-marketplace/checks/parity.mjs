// Cross-harness agreement: the marketplace manifests must describe the same set
// of plugins in the same order with the same ownership, and every plugin
// directory on disk must be registered with every harness.

import { MARKETPLACE_PARITY_FIELDS } from "../config.mjs";
import { stableStringify } from "../lib/files.mjs";
import { valueAt } from "../lib/rules.mjs";

export function checkMarketplaceParity(report, harnessData) {
  const [base, ...rest] = [...harnessData.keys()];
  if (rest.length === 0) return;

  const baseData = harnessData.get(base);
  const baseOrder = baseData.entries.map((e) => e.name).join(",");
  for (const id of rest) {
    const data = harnessData.get(id);
    const order = data.entries.map((e) => e.name).join(",");
    if (order !== baseOrder) {
      report.fail(`marketplace parity: ${id} plugins[] order [${order}] differs from ${base} [${baseOrder}]`);
    }
    for (const field of MARKETPLACE_PARITY_FIELDS) {
      const value = valueAt(data.manifest, field);
      const baseValue = valueAt(baseData.manifest, field);
      if (stableStringify(value) === stableStringify(baseValue)) continue;
      const detail = typeof value === "object" ? "" : ` (${value} vs ${baseValue})`;
      report.fail(`marketplace parity: ${id} "${field}" differs from ${base}${detail}`);
    }
  }
}

export function checkRegistration(report, harnessData, onDisk) {
  for (const [id, data] of harnessData) {
    const registered = new Set(data.entries.map((e) => e.name));
    for (const name of onDisk) {
      if (!registered.has(name)) {
        report.fail(`${id} marketplace.json: plugin "${name}" exists on disk but is not registered`);
      }
    }
    for (const entry of data.entries) {
      if (!onDisk.includes(entry.name)) {
        report.fail(`${id} marketplace.json: entry "${entry.name}" points at a plugin that does not exist`);
      }
    }
  }
}
