import path from 'node:path';
import { fileExists } from '../../../utils/file.js';
import { getAllDeps, readPyprojectToml } from '../manifests.js';

const CONFIG_VARIANTS = {
  vitest: ['vitest.config.js', 'vitest.config.ts', 'vitest.config.mjs', 'vitest.config.mts'],
  jest: ['jest.config.js', 'jest.config.ts', 'jest.config.mjs', 'jest.config.cjs'],
  playwright: ['playwright.config.js', 'playwright.config.ts', 'playwright.config.mjs'],
  cypress: ['cypress.config.js', 'cypress.config.ts', 'cypress.config.mjs'],
  mocha: ['.mocharc.js', '.mocharc.json', '.mocharc.yml', '.mocharc.cjs'],
};

async function findConfig(projectRoot, variants) {
  for (const name of variants) {
    if (await fileExists(path.join(projectRoot, name))) return name;
  }
  return null;
}

async function hasPytestConfig(projectRoot) {
  if (await fileExists(path.join(projectRoot, 'pytest.ini'))) return 'pytest.ini';
  const pyproject = await readPyprojectToml(projectRoot);
  if (pyproject && pyproject.tool && pyproject.tool.pytest) {
    return 'pyproject.toml';
  }
  return null;
}

export default async function detectTesting(projectRoot) {
  const { js, py } = await getAllDeps(projectRoot);
  const results = [];

  const jsFrameworkOrder = ['vitest', 'jest', 'mocha'];
  for (const name of jsFrameworkOrder) {
    if (js[name] !== undefined) {
      const configFile = await findConfig(projectRoot, CONFIG_VARIANTS[name] || []);
      results.push({
        field: 'testing',
        value: {
          framework: name,
          configFile,
          browserTesting: false,
        },
        confidence: 'high',
        source: configFile || 'package.json',
        candidates: null,
      });
      break;
    }
  }

  if (js['playwright'] !== undefined || js['@playwright/test'] !== undefined) {
    const configFile = await findConfig(projectRoot, CONFIG_VARIANTS.playwright);
    results.push({
      field: 'testing',
      value: { framework: 'playwright', configFile, browserTesting: true },
      confidence: 'high',
      source: configFile || 'package.json',
      candidates: null,
    });
  }

  if (js['cypress'] !== undefined) {
    const configFile = await findConfig(projectRoot, CONFIG_VARIANTS.cypress);
    results.push({
      field: 'testing',
      value: { framework: 'cypress', configFile, browserTesting: true },
      confidence: 'high',
      source: configFile || 'package.json',
      candidates: null,
    });
  }

  const pytestPresent =
    py['pytest'] !== undefined || Object.keys(py).some((k) => k.startsWith('pytest-'));
  if (pytestPresent) {
    const configFile = await hasPytestConfig(projectRoot);
    results.push({
      field: 'testing',
      value: { framework: 'pytest', configFile, browserTesting: false },
      confidence: 'high',
      source: configFile || 'pyproject.toml',
      candidates: null,
    });
  }

  return results;
}
