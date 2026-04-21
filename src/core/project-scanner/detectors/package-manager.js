import path from 'node:path';
import { fileExists } from '../../../utils/file.js';

const LOCKFILES = [
  { file: 'pnpm-lock.yaml', manager: 'pnpm', group: 'js' },
  { file: 'yarn.lock', manager: 'yarn', group: 'js' },
  { file: 'package-lock.json', manager: 'npm', group: 'js' },
  { file: 'bun.lock', manager: 'bun', group: 'js' },
  { file: 'bun.lockb', manager: 'bun', group: 'js' },
  { file: 'poetry.lock', manager: 'poetry', group: 'python' },
  { file: 'uv.lock', manager: 'uv', group: 'python' },
  { file: 'Pipfile.lock', manager: 'pipenv', group: 'python' },
  { file: 'Cargo.lock', manager: 'cargo', group: 'rust' },
  { file: 'Gemfile.lock', manager: 'bundler', group: 'ruby' },
  { file: 'go.sum', manager: 'go', group: 'go' },
];

export default async function detectPackageManager(projectRoot) {
  const present = [];
  for (const entry of LOCKFILES) {
    if (await fileExists(path.join(projectRoot, entry.file))) {
      present.push(entry);
    }
  }
  if (present.length === 0) return [];

  const byGroup = new Map();
  for (const entry of present) {
    if (!byGroup.has(entry.group)) byGroup.set(entry.group, []);
    byGroup.get(entry.group).push(entry);
  }

  const results = [];
  for (const group of byGroup.values()) {
    if (group.length === 1) {
      const { file, manager } = group[0];
      results.push({
        field: 'packageManager',
        value: manager,
        confidence: 'high',
        source: file,
        candidates: null,
      });
    } else {
      const managers = group.map((g) => g.manager);
      const sources = group.map((g) => g.file);
      results.push({
        field: 'packageManager',
        value: group[0].manager,
        confidence: 'medium',
        source: sources.join(', '),
        candidates: managers,
      });
    }
  }
  return results;
}
