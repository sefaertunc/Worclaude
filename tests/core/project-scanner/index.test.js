import { describe, it, expect } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { scanProject } from '../../../src/core/project-scanner/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.resolve(__dirname, '../../fixtures/scanner');

describe('scanProject', () => {
  describe('against real fixtures', () => {
    it('runs all 14 detectors against the nextjs-pnpm fixture', async () => {
      const report = await scanProject(path.join(FIXTURES, 'nextjs-pnpm'));

      expect(report.schemaVersion).toBe(1);
      expect(report.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(report.projectRoot).toBe(path.join(FIXTURES, 'nextjs-pnpm'));
      expect(report.errors).toEqual([]);

      const detectors = [...new Set(report.results.map((r) => r.detector))].sort();
      expect(detectors).toEqual(
        expect.arrayContaining([
          'ci',
          'deployment',
          'env-variables',
          'external-apis',
          'frameworks',
          'language',
          'linting',
          'orm',
          'package-manager',
          'readme',
          'scripts',
          'testing',
        ])
      );

      const pm = report.results.find((r) => r.field === 'packageManager');
      expect(pm.value).toBe('pnpm');
      expect(pm.confidence).toBe('high');

      const frameworks = report.results.find((r) => r.field === 'frameworks');
      expect(frameworks.value.map((v) => v.name)).toEqual(
        expect.arrayContaining(['Next.js', 'React'])
      );
    });

    it('produces an empty report for an empty project', async () => {
      const report = await scanProject(path.join(FIXTURES, 'empty'));
      expect(report.results).toEqual([]);
      expect(report.errors).toEqual([]);
    });

    it('returns medium confidence for mixed-lockfiles', async () => {
      const report = await scanProject(path.join(FIXTURES, 'mixed-lockfiles'));
      const pm = report.results.find((r) => r.field === 'packageManager');
      expect(pm.confidence).toBe('medium');
      expect(pm.candidates).toEqual(expect.arrayContaining(['yarn', 'npm']));
    });

    it('handles PEP 735 dependency-groups in pyproject.toml', async () => {
      const report = await scanProject(path.join(FIXTURES, 'fastapi-pep735'));
      const frameworks = report.results.find((r) => r.field === 'frameworks');
      expect(frameworks.value.map((v) => v.name)).toEqual(
        expect.arrayContaining(['FastAPI', 'Starlette'])
      );
    });

    it('detects monorepo from pnpm-workspace.yaml', async () => {
      const report = await scanProject(path.join(FIXTURES, 'monorepo-pnpm'));
      const mono = report.results.find((r) => r.field === 'monorepo');
      expect(mono.value.tool).toBe('pnpm');
      expect(mono.value.packagePaths).toEqual(
        expect.arrayContaining(['packages/app', 'packages/ui'])
      );
    });
  });

  describe('error handling', () => {
    it('throws when projectRoot is missing', async () => {
      await expect(scanProject()).rejects.toThrow(/requires a projectRoot/);
    });

    it('throws when projectRoot does not exist', async () => {
      await expect(scanProject('/nonexistent/path/never/exists')).rejects.toThrow(
        /projectRoot not found/
      );
    });

    it('continues when one detector throws', async () => {
      const goodDetector = () => [
        {
          field: 'testField',
          value: 'good',
          confidence: 'high',
          source: 'mock',
          candidates: null,
        },
      ];
      const throwingDetector = () => {
        throw new Error('boom');
      };
      Object.defineProperty(goodDetector, 'name', { value: 'good' });
      Object.defineProperty(throwingDetector, 'name', { value: 'throwing' });

      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'scanner-override-'));
      try {
        const report = await scanProject(tmpDir, {
          overrideDetectors: [goodDetector, throwingDetector],
        });
        expect(report.results).toHaveLength(1);
        expect(report.results[0].value).toBe('good');
        expect(report.errors).toHaveLength(1);
        expect(report.errors[0]).toEqual({
          detector: 'throwing',
          kind: 'exception',
          message: 'boom',
        });
      } finally {
        await fs.remove(tmpDir);
      }
    });

    it('records a timeout error when a detector does not resolve in time', async () => {
      const goodDetector = () => [
        {
          field: 'testField',
          value: 'good',
          confidence: 'high',
          source: 'mock',
          candidates: null,
        },
      ];
      const slowDetector = () => new Promise(() => {});
      Object.defineProperty(goodDetector, 'name', { value: 'good' });
      Object.defineProperty(slowDetector, 'name', { value: 'slow' });

      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'scanner-timeout-'));
      try {
        const report = await scanProject(tmpDir, {
          overrideDetectors: [goodDetector, slowDetector],
        });
        expect(report.results.map((r) => r.value)).toEqual(['good']);
        expect(report.errors).toHaveLength(1);
        expect(report.errors[0].kind).toBe('timeout');
        expect(report.errors[0].detector).toBe('slow');
      } finally {
        await fs.remove(tmpDir);
      }
    }, 10000);

    it('records an exception when a detector returns a non-array', async () => {
      const badDetector = () => 'not an array';
      Object.defineProperty(badDetector, 'name', { value: 'bad' });

      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'scanner-badshape-'));
      try {
        const report = await scanProject(tmpDir, { overrideDetectors: [badDetector] });
        expect(report.results).toEqual([]);
        expect(report.errors).toHaveLength(1);
        expect(report.errors[0].kind).toBe('exception');
      } finally {
        await fs.remove(tmpDir);
      }
    });
  });

  describe('report shape', () => {
    it('annotates each result with its detector name', async () => {
      const report = await scanProject(path.join(FIXTURES, 'rust-cli'));
      for (const r of report.results) {
        expect(r.detector).toBeDefined();
        expect(typeof r.detector).toBe('string');
      }
    });

    it('round-trips through JSON without loss', async () => {
      const report = await scanProject(path.join(FIXTURES, 'nextjs-pnpm'));
      const serialized = JSON.stringify(report);
      const parsed = JSON.parse(serialized);
      expect(parsed).toEqual(report);
    });
  });
});
