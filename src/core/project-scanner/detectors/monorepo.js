import path from 'node:path';
import YAML from 'yaml';
import fs from 'fs-extra';
import { fileExists, readFile } from '../../../utils/file.js';
import { readPackageJson } from '../manifests.js';

async function readYamlWorkspacePackages(projectRoot) {
  const filePath = path.join(projectRoot, 'pnpm-workspace.yaml');
  if (!(await fileExists(filePath))) return null;
  try {
    const raw = await readFile(filePath);
    const parsed = YAML.parse(raw);
    if (parsed && Array.isArray(parsed.packages)) return parsed.packages;
  } catch {
    /* missing or unreadable — non-fatal */
  }
  return null;
}

async function expandPackagePaths(projectRoot, patterns) {
  const paths = [];
  for (const pattern of patterns) {
    if (pattern.endsWith('/*')) {
      const parent = pattern.slice(0, -2);
      const parentPath = path.join(projectRoot, parent);
      try {
        const entries = await fs.readdir(parentPath, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) paths.push(path.posix.join(parent, entry.name));
        }
      } catch {
        // directory missing — pnpm-workspace.yaml lists a path the user hasn't created
      }
    } else {
      paths.push(pattern);
    }
  }
  return paths;
}

export default async function detectMonorepo(projectRoot) {
  const results = [];
  const sources = [];
  let packagePaths = [];
  let tool = null;

  const pnpmPackages = await readYamlWorkspacePackages(projectRoot);
  if (pnpmPackages) {
    tool = 'pnpm';
    sources.push('pnpm-workspace.yaml');
    packagePaths = await expandPackagePaths(projectRoot, pnpmPackages);
  }

  if (!tool) {
    const pkg = await readPackageJson(projectRoot);
    if (pkg && pkg.workspaces) {
      const patterns = Array.isArray(pkg.workspaces)
        ? pkg.workspaces
        : Array.isArray(pkg.workspaces.packages)
          ? pkg.workspaces.packages
          : [];
      if (patterns.length > 0) {
        tool = 'npm-or-yarn';
        sources.push('package.json');
        packagePaths = await expandPackagePaths(projectRoot, patterns);
      }
    }
  }

  const markers = [
    { file: 'lerna.json', tool: 'lerna' },
    { file: 'nx.json', tool: 'nx' },
    { file: 'turbo.json', tool: 'turbo' },
    { file: 'rush.json', tool: 'rush' },
  ];
  for (const { file, tool: markerTool } of markers) {
    if (await fileExists(path.join(projectRoot, file))) {
      if (!tool) tool = markerTool;
      sources.push(file);
    }
  }

  if (!tool) return [];

  results.push({
    field: 'monorepo',
    value: { isMonorepo: true, tool, packagePaths },
    confidence: 'high',
    source: sources.join(', '),
    candidates: null,
  });
  return results;
}
