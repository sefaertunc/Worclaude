import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import detect from '../../../../src/core/project-scanner/detectors/testing.js';

describe('testing detector', () => {
  let dir;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'testing-detector-'));
  });

  afterEach(async () => {
    await fs.remove(dir);
  });

  it('detects Vitest with config file', async () => {
    await fs.writeJson(path.join(dir, 'package.json'), {
      devDependencies: { vitest: '1.4.0' },
    });
    await fs.writeFile(path.join(dir, 'vitest.config.ts'), 'export default {}\n');
    const results = await detect(dir);
    const vitest = results.find((r) => r.value.framework === 'vitest');
    expect(vitest).toBeDefined();
    expect(vitest.value.configFile).toBe('vitest.config.ts');
    expect(vitest.value.browserTesting).toBe(false);
  });

  it('detects Playwright as browser testing', async () => {
    await fs.writeJson(path.join(dir, 'package.json'), {
      devDependencies: { '@playwright/test': '1.42.0' },
    });
    const results = await detect(dir);
    const pw = results.find((r) => r.value.framework === 'playwright');
    expect(pw).toBeDefined();
    expect(pw.value.browserTesting).toBe(true);
  });

  it('detects pytest from [tool.poetry.group.dev.dependencies]', async () => {
    await fs.writeFile(
      path.join(dir, 'pyproject.toml'),
      `[tool.poetry]\nname="x"\nversion="0.1.0"\n[tool.poetry.group.dev.dependencies]\npytest="^8.0"\n`
    );
    const results = await detect(dir);
    expect(results.find((r) => r.value.framework === 'pytest')).toBeDefined();
  });

  it('detects pytest config via [tool.pytest.ini_options]', async () => {
    await fs.writeFile(
      path.join(dir, 'pyproject.toml'),
      `[project]\nname="x"\ndependencies=["pytest"]\n[tool.pytest.ini_options]\nminversion="8.0"\n`
    );
    const results = await detect(dir);
    const pytest = results.find((r) => r.value.framework === 'pytest');
    expect(pytest.value.configFile).toBe('pyproject.toml');
  });

  it('picks vitest over jest when both are present', async () => {
    await fs.writeJson(path.join(dir, 'package.json'), {
      devDependencies: { vitest: '1.0', jest: '29.0' },
    });
    const results = await detect(dir);
    const frameworks = results.map((r) => r.value.framework);
    expect(frameworks).toContain('vitest');
    expect(frameworks).not.toContain('jest');
  });

  it('returns empty array when no test framework is present', async () => {
    await fs.writeJson(path.join(dir, 'package.json'), { dependencies: {} });
    const results = await detect(dir);
    expect(results).toEqual([]);
  });
});
