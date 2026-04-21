import path from 'node:path';
import fs from 'fs-extra';
import { fileExists } from '../../../utils/file.js';
import { readPyprojectToml } from '../manifests.js';

const CONFIGS = [
  { tool: 'ESLint', patterns: [/^\.eslintrc(\..+)?$/, /^eslint\.config\.(js|ts|mjs|cjs)$/] },
  { tool: 'Prettier', patterns: [/^\.prettierrc(\..+)?$/, /^prettier\.config\.(js|ts|mjs|cjs)$/] },
  { tool: 'Biome', patterns: [/^biome\.jsonc?$/] },
  { tool: 'Stylelint', patterns: [/^\.stylelintrc(\..+)?$/] },
  { tool: 'RuboCop', patterns: [/^\.rubocop\.ya?ml$/] },
];

async function rootFiles(projectRoot) {
  try {
    const entries = await fs.readdir(projectRoot, { withFileTypes: true });
    return entries.filter((e) => e.isFile()).map((e) => e.name);
  } catch {
    return [];
  }
}

export default async function detectLinting(projectRoot) {
  const files = await rootFiles(projectRoot);
  const tools = new Set();
  const sources = [];

  for (const { tool, patterns } of CONFIGS) {
    const match = files.find((f) => patterns.some((p) => p.test(f)));
    if (match) {
      tools.add(tool);
      sources.push(match);
    }
  }

  if (await fileExists(path.join(projectRoot, 'ruff.toml'))) {
    tools.add('Ruff');
    sources.push('ruff.toml');
  } else {
    const pyproject = await readPyprojectToml(projectRoot);
    if (pyproject && pyproject.tool && pyproject.tool.ruff) {
      tools.add('Ruff');
      sources.push('pyproject.toml');
    }
  }

  if (tools.size === 0) return [];

  return [
    {
      field: 'linting',
      value: Array.from(tools),
      confidence: 'high',
      source: sources.join(', '),
      candidates: null,
    },
  ];
}
