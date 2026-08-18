// Path helpers. Paths are derived with fileURLToPath (not URL.pathname, which
// yields "/C:/..." on Windows) and reported repo-relative with forward slashes
// so error text is identical on every platform.

import { isAbsolute, join, normalize, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = fileURLToPath(new URL("../../../", import.meta.url));

export function rel(path) {
  return relative(ROOT, path).split(sep).join("/");
}

// Config declares paths with forward slashes; join them the native way.
export function fromRoot(posixPath) {
  return join(ROOT, ...posixPath.split("/"));
}

// Reject absolute paths, ".." segments (checked against both separators, since
// normalize() only collapses the native one), and anything escaping the repo.
export function resolveSource(report, source, label) {
  if (isAbsolute(source) || /^[A-Za-z]:/.test(source)) {
    report.fail(`${label}: source must be a relative path (got "${source}")`);
    return null;
  }
  if (normalize(source).split(/[\\/]/).includes("..")) {
    report.fail(`${label}: source must not contain ".." (got "${source}")`);
    return null;
  }
  if (source.includes("\\")) {
    report.fail(`${label}: source must use forward slashes to stay portable (got "${source}")`);
    return null;
  }
  const dir = resolve(ROOT, source);
  const inside = relative(ROOT, dir);
  if (inside.startsWith("..") || isAbsolute(inside)) {
    report.fail(`${label}: source resolves outside the repository (got "${source}")`);
    return null;
  }
  return dir;
}
