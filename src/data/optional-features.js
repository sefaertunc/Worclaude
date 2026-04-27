import path from 'node:path';
import fs from 'fs-extra';
import { scaffoldPluginJson, scaffoldMemoryDocs } from '../core/scaffolder.js';

export const OPTIONAL_FEATURES = [
  {
    id: 'plugin-json',
    label: 'Generate .claude-plugin/plugin.json for marketplace compatibility?',
    extrasLabel: 'plugin.json',
    successPath: '.claude-plugin/plugin.json',
    async detect(projectRoot) {
      return fs.pathExists(path.join(projectRoot, '.claude-plugin', 'plugin.json'));
    },
    async scaffold(projectRoot, selections) {
      await scaffoldPluginJson(projectRoot, selections);
    },
  },
  {
    id: 'gtd-memory',
    label: 'Scaffold structured memory files (decisions.md, preferences.md)?',
    extrasLabel: 'memory docs',
    successPath: 'docs/memory/',
    successDetail: 'decisions.md, preferences.md',
    async detect(projectRoot) {
      return fs.pathExists(path.join(projectRoot, 'docs', 'memory', 'decisions.md'));
    },
    async scaffold(projectRoot) {
      await scaffoldMemoryDocs(projectRoot);
    },
  },
];

export function getOptionalFeature(id) {
  return OPTIONAL_FEATURES.find((feature) => feature.id === id) || null;
}

export async function availableOptionalFeatures(projectRoot, meta) {
  const optedOut = new Set(meta?.optedOutFeatures || []);
  const result = [];
  for (const feature of OPTIONAL_FEATURES) {
    if (optedOut.has(feature.id)) continue;
    if (await feature.detect(projectRoot)) continue;
    result.push(feature);
  }
  return result;
}
