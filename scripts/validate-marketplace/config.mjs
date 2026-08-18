// The single description of what this marketplace supports. Every check in
// ./checks traverses this config; nothing else hard-codes a harness name or a
// manifest path. Supporting a new harness means adding one HARNESSES entry.

import { required } from "./lib/rules.mjs";

export const KEBAB = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;

// Repo layout, repo-relative with forward slashes.
export const PLUGINS_DIR = "plugins";
export const PLUGIN_ROOT_MANIFEST = "plugin.json";
export const DEFAULT_SKILLS_DIR = "skills";
export const SKILL_FILE = "SKILL.md";
export const SKILL_FRONTMATTER_MAX = 1024;

// Rules every root marketplace manifest must satisfy, whatever the harness.
export const MARKETPLACE_RULES = [
  required("name", { pattern: KEBAB, patternLabel: "kebab-case" }),
  required("owner.name"),
  required("plugins", { type: "array" }),
];

// Values that must be identical across all harness marketplace manifests. The
// first harness present is the baseline; `plugins[]` order is compared too.
export const MARKETPLACE_PARITY_FIELDS = ["owner", "metadata.version"];

// Rules every plugin manifest must satisfy, whatever the harness.
const COMMON_PLUGIN_RULES = [
  required("name", { pattern: KEBAB, patternLabel: "kebab-case" }),
  required("version"),
  required("description"),
  required("author.name"),
];

// Harness-specific plugin manifest rules, per the plugin-harness-parity skill.
const CURSOR_RULES = [required("displayName"), required("category"), required("skills")];

const CODEX_RULES = [
  required("skills"),
  required("interface", { type: "object", gate: true }),
  required("interface.displayName"),
  required("interface.shortDescription", { maxLength: 80 }),
  required("interface.longDescription"),
  required("interface.developerName"),
  required("interface.category"),
  required("interface.capabilities", { type: "array" }),
  required("interface.defaultPrompt", { type: "array" }),
];

export const HARNESSES = [
  {
    id: "cursor",
    marketplaceManifest: ".cursor-plugin/marketplace.json",
    marketplaceName: "precision-cursor-plugin-marketplace",
    pluginManifest: ".cursor-plugin/plugin.json",
    pluginRules: [...COMMON_PLUGIN_RULES, ...CURSOR_RULES],
  },
  {
    id: "claude",
    marketplaceManifest: ".claude-plugin/marketplace.json",
    marketplaceName: "precision-claude-plugin-marketplace",
    pluginManifest: ".claude-plugin/plugin.json",
    pluginRules: COMMON_PLUGIN_RULES,
  },
  {
    id: "codex",
    // Codex reads .agents/ by default, so its marketplace lives there rather
    // than in a harness-specific dot-directory.
    marketplaceManifest: ".agents/plugins/marketplace.json",
    marketplaceName: "precision-codex-plugin-marketplace",
    pluginManifest: ".codex-plugin/plugin.json",
    pluginRules: [...COMMON_PLUGIN_RULES, ...CODEX_RULES],
  },
];
