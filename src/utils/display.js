import chalk from 'chalk';
import { AGENT_CATALOG } from '../data/agents.js';

// ── Color Palette ──────────────────────────────────────────────

// Brand colors
export const purple = chalk.hex('#c4b5fd');
// purpleDim covered by dimColor

// Semantic colors
export const green = chalk.hex('#6ee7b7');
export const yellow = chalk.hex('#fbbf24');
export const white = chalk.hex('#e2e0f0');
export const dimColor = chalk.hex('#6b6590');
export const blue = chalk.hex('#7dd3fc');
// teal and pink are used via badge styles below
export const red = chalk.hex('#fca5a5');

// ── Badge Styles ───────────────────────────────────────────────

export const badges = {
  // Models
  opus: chalk.bgHex('#2d2455').hex('#c4b5fd'),
  sonnet: chalk.bgHex('#1a2a3a').hex('#7dd3fc'),
  haiku: chalk.bgHex('#2a2520').hex('#fbbf24'),

  // Isolation
  worktree: chalk.bgHex('#1a3a2a').hex('#6ee7b7'),

  // Categories
  backend: chalk.bgHex('#2d2455').hex('#c4b5fd'),
  frontend: chalk.bgHex('#2a1a2a').hex('#f9a8d4'),
  devops: chalk.bgHex('#1a2a2a').hex('#5eead4'),
  quality: chalk.bgHex('#2a2520').hex('#fbbf24'),
  docs: chalk.bgHex('#1a2520').hex('#6ee7b7'),
  dataai: chalk.bgHex('#1a1a2a').hex('#818cf8'),

  // Tech stacks
  python: chalk.bgHex('#1a3a2a').hex('#6ee7b7'),
  node: chalk.bgHex('#1a3a2a').hex('#6ee7b7'),
  java: chalk.bgHex('#2a2520').hex('#fbbf24'),
  csharp: chalk.bgHex('#2d2455').hex('#c4b5fd'),
  cpp: chalk.bgHex('#1a2a3a').hex('#7dd3fc'),
  go: chalk.bgHex('#1a2a2a').hex('#5eead4'),
  rust: chalk.bgHex('#2a1a1a').hex('#fca5a5'),
  php: chalk.bgHex('#1a1a2a').hex('#818cf8'),
  docker: chalk.bgHex('#1a2a2a').hex('#5eead4'),

  // Project types
  backendApi: chalk.bgHex('#2d2455').hex('#c4b5fd'),
  frontendUi: chalk.bgHex('#2a1a2a').hex('#f9a8d4'),
  fullstack: chalk.bgHex('#1a2a3a').hex('#7dd3fc'),
  library: chalk.bgHex('#1a3a2a').hex('#6ee7b7'),
  cli: chalk.bgHex('#1a2a2a').hex('#5eead4'),
  dataml: chalk.bgHex('#2a2520').hex('#fbbf24'),
  devopsInfra: chalk.bgHex('#1a1a2a').hex('#818cf8'),
};

// ── Badge-to-Data Lookup Maps ──────────────────────────────────

export const MODEL_BADGES = {
  opus: badges.opus,
  sonnet: badges.sonnet,
  haiku: badges.haiku,
};

export const STACK_BADGES = {
  Python: badges.python,
  'Node.js / TypeScript': badges.node,
  Java: badges.java,
  'C# / .NET': badges.csharp,
  'C / C++': badges.cpp,
  Go: badges.go,
  Rust: badges.rust,
  PHP: badges.php,
  Docker: badges.docker,
};

export const TYPE_BADGES = {
  'Backend / API': badges.backendApi,
  'Frontend / UI': badges.frontendUi,
  'Full-stack web application': badges.fullstack,
  'Library / Package': badges.library,
  'CLI tool': badges.cli,
  'Data / ML / AI': badges.dataml,
  'DevOps / Infrastructure': badges.devopsInfra,
};

// ── Universal Agent Metadata ───────────────────────────────────

const UNIVERSAL_AGENT_META = {
  'plan-reviewer': { model: 'opus', isolation: 'none' },
  'code-simplifier': { model: 'sonnet', isolation: 'worktree' },
  'test-writer': { model: 'sonnet', isolation: 'worktree' },
  'build-validator': { model: 'haiku', isolation: 'none' },
  'verify-app': { model: 'sonnet', isolation: 'worktree' },
};

// ── Badge Rendering ────────────────────────────────────────────

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function badge(text, style) {
  return style(` ${text} `);
}

export function renderBadge(text, mapping) {
  const style = mapping[text];
  if (style) return badge(text, style);
  return text;
}

export function renderBadgeList(items, mapping) {
  return items.map((item) => renderBadge(item, mapping)).join(' ');
}

export function renderAgentWithBadges(name) {
  const meta = UNIVERSAL_AGENT_META[name] || AGENT_CATALOG[name];
  if (!meta) return name;

  let line = name.padEnd(20);
  line += badge(capitalize(meta.model), MODEL_BADGES[meta.model]);
  if (meta.isolation === 'worktree') {
    line += ' ' + badge('worktree', badges.worktree);
  }
  return line;
}

// ── Structural Elements ────────────────────────────────────────

export const bar = dimColor('│');

export function banner(version) {
  console.log();
  console.log(`  ${purple('▌')} ${white('WORCLAUDE')} ${dimColor(`v${version}`)}`);
  console.log();
}

export function sectionHeader(title) {
  console.log(`  ${purple('▌')} ${white(title)}`);
}

export function divider(label) {
  console.log(`  ${dimColor(`─── ${label} ───`)}`);
}

export function barLine(text) {
  console.log(`  ${bar} ${text}`);
}

// ── Display Functions (backward-compatible signatures) ─────────

export function success(text) {
  console.log(`  ${green('✓')} ${text}`);
}

export function error(text) {
  console.log(`  ${red('✗')} ${text}`);
}

export function info(text) {
  console.log(`  ${blue('ℹ')} ${text}`);
}

export function warn(text) {
  console.log(`  ${yellow('⚠')} ${text}`);
}

export function dim(text) {
  console.log(dimColor('    ' + text));
}

export function newline() {
  console.log();
}
