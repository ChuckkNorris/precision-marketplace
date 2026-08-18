// Skill frontmatter. Skills are shared by every harness, so the roots the
// harness manifests declare are collected into one union and validated once —
// otherwise every skill error would be reported once per harness.

import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { DEFAULT_SKILLS_DIR, SKILL_FILE, SKILL_FRONTMATTER_MAX } from "../config.mjs";
import { isDirectory, listDirectories, readText } from "../lib/files.mjs";

function parseFrontmatter(report, content, label) {
  if (!content.startsWith("---\n")) {
    report.fail(`${label}: missing YAML frontmatter (must start with ---)`);
    return null;
  }
  const end = content.indexOf("\n---", 4);
  if (end === -1) {
    report.fail(`${label}: unterminated YAML frontmatter`);
    return null;
  }
  const block = content.slice(4, end);
  if (block.length > SKILL_FRONTMATTER_MAX) {
    report.fail(`${label}: frontmatter exceeds ${SKILL_FRONTMATTER_MAX} characters (${block.length})`);
  }
  // Minimal YAML subset: top-level scalar keys with optional indented continuations.
  const fields = {};
  let currentKey = null;
  for (const line of block.split("\n")) {
    const keyMatch = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (keyMatch) {
      currentKey = keyMatch[1];
      fields[currentKey] = keyMatch[2].replace(/^["']|["']$/g, "");
    } else if (currentKey && /^\s+\S/.test(line)) {
      fields[currentKey] = `${fields[currentKey]} ${line.trim()}`.trim();
    }
  }
  return fields;
}

function checkSkill(report, skillDir, skillName, pluginName) {
  const skillPath = join(skillDir, SKILL_FILE);
  const label = `plugin ${pluginName}, skill ${skillName}`;
  if (!existsSync(skillPath)) {
    report.fail(`${label}: missing ${SKILL_FILE}`);
    return;
  }
  const fields = parseFrontmatter(report, readText(skillPath), label);
  if (!fields) return;

  if (!fields.name) {
    report.fail(`${label}: frontmatter missing required "name"`);
  } else {
    if (!/^[a-z0-9-]+$/.test(fields.name)) {
      report.fail(`${label}: name "${fields.name}" must be lowercase letters, numbers, and hyphens`);
    }
    if (fields.name !== skillName) {
      report.fail(`${label}: frontmatter name "${fields.name}" must match folder name "${skillName}"`);
    }
  }
  if (!fields.description || fields.description.trim() === "") {
    report.fail(`${label}: frontmatter missing required "description"`);
  }
}

function skillRootsFor(pluginDir, manifests) {
  const roots = new Set();
  for (const manifest of manifests) {
    const field = manifest?.skills;
    if (typeof field === "string") roots.add(resolve(pluginDir, field));
    else if (Array.isArray(field)) for (const p of field) roots.add(resolve(pluginDir, p));
  }
  if (roots.size === 0) roots.add(resolve(pluginDir, DEFAULT_SKILLS_DIR));
  return [...roots];
}

export function checkPluginSkills(report, pluginName, pluginDir, manifests) {
  let found = 0;
  for (const root of skillRootsFor(pluginDir, manifests)) {
    if (!isDirectory(root)) continue;
    for (const entry of listDirectories(root)) {
      const dir = join(root, entry);
      if (!existsSync(join(dir, SKILL_FILE))) continue;
      found += 1;
      checkSkill(report, dir, entry, pluginName);
    }
  }
  if (found === 0 && existsSync(join(pluginDir, SKILL_FILE))) {
    // Single-skill plugin layout: SKILL.md at the plugin root.
    found += 1;
    checkSkill(report, pluginDir, pluginName, pluginName);
  }
  if (found === 0) {
    report.fail(`plugin ${pluginName}: no skills found (expected ${DEFAULT_SKILLS_DIR}/<name>/${SKILL_FILE})`);
  }
}
