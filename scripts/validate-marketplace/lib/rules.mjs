// Declarative field checks. A rule names a dotted path into a manifest plus the
// constraints on the value there, so config.mjs describes what each harness
// requires and this module is the only place that knows how to enforce it.
//
//   { path, required, type, pattern, patternLabel, maxLength, gate }
//
// `gate: true` means nested rules are pointless when this one is missing — the
// whole block is absent, so report that once and skip `path.*`.

export function required(path, extra = {}) {
  return { path, required: true, ...extra };
}

export function valueAt(target, path) {
  return path.split(".").reduce((acc, key) => (acc == null ? undefined : acc[key]), target);
}

function isEmpty(value) {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function typeOf(value) {
  if (Array.isArray(value)) return "array";
  return typeof value;
}

export function checkRules(report, rules, target, label) {
  const skipped = [];
  for (const rule of rules) {
    if (skipped.some((prefix) => rule.path.startsWith(prefix))) continue;

    const value = valueAt(target, rule.path);
    if (isEmpty(value)) {
      if (rule.required) report.fail(`${label}: missing required "${rule.path}"`);
      if (rule.gate) skipped.push(`${rule.path}.`);
      continue;
    }
    if (rule.type && typeOf(value) !== rule.type) {
      report.fail(`${label}: "${rule.path}" must be ${rule.type === "array" ? "an array" : `a ${rule.type}`}`);
      if (rule.gate) skipped.push(`${rule.path}.`);
      continue;
    }
    if (rule.pattern && !rule.pattern.test(String(value))) {
      report.fail(`${label}: "${rule.path}" must be ${rule.patternLabel} (got ${JSON.stringify(value)})`);
    }
    if (rule.maxLength && String(value).length > rule.maxLength) {
      report.fail(
        `${label}: "${rule.path}" exceeds ${rule.maxLength} characters (${String(value).length})`,
      );
    }
  }
}
