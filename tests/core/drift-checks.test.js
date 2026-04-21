import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import {
  hasClaudeMdMemoryGuidance,
  ensureLearningsDir,
  buildMemoryGuidanceSidecar,
  writeMemoryGuidanceSidecar,
  MEMORY_GUIDANCE_KEYWORDS,
} from '../../src/core/drift-checks.js';

describe('drift-checks', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cw-drift-'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  describe('hasClaudeMdMemoryGuidance', () => {
    it('returns true when content mentions memory architecture', () => {
      expect(hasClaudeMdMemoryGuidance('## Memory Architecture\n...')).toBe(true);
    });

    it('returns true when content mentions native memory', () => {
      expect(hasClaudeMdMemoryGuidance('we use native memory for this')).toBe(true);
    });

    it('returns true when content references .claude/learnings', () => {
      expect(hasClaudeMdMemoryGuidance('see .claude/learnings/ for captured notes')).toBe(true);
    });

    it('returns true when content contains [LEARN] marker', () => {
      expect(hasClaudeMdMemoryGuidance('use the [LEARN] marker')).toBe(true);
    });

    it('returns true when content mentions /learn', () => {
      expect(hasClaudeMdMemoryGuidance('run /learn to capture')).toBe(true);
    });

    it('is case-insensitive', () => {
      expect(hasClaudeMdMemoryGuidance('MEMORY ARCHITECTURE')).toBe(true);
    });

    it('returns false for empty or non-string input', () => {
      expect(hasClaudeMdMemoryGuidance('')).toBe(false);
      expect(hasClaudeMdMemoryGuidance(null)).toBe(false);
      expect(hasClaudeMdMemoryGuidance(undefined)).toBe(false);
    });

    it('returns false when no keywords are present', () => {
      expect(hasClaudeMdMemoryGuidance('# Project overview\n\nNothing about memory.')).toBe(false);
    });

    it('exports the keyword list for external reuse', () => {
      expect(MEMORY_GUIDANCE_KEYWORDS).toContain('memory architecture');
      expect(MEMORY_GUIDANCE_KEYWORDS).toContain('.claude/learnings');
      expect(MEMORY_GUIDANCE_KEYWORDS).toContain('[LEARN]');
    });
  });

  describe('ensureLearningsDir', () => {
    it('creates .claude/learnings/.gitkeep and returns true when missing', async () => {
      const created = await ensureLearningsDir(tmpDir);
      expect(created).toBe(true);
      expect(await fs.pathExists(path.join(tmpDir, '.claude', 'learnings', '.gitkeep'))).toBe(true);
    });

    it('returns false when learnings/.gitkeep already exists', async () => {
      await fs.ensureDir(path.join(tmpDir, '.claude', 'learnings'));
      await fs.writeFile(path.join(tmpDir, '.claude', 'learnings', '.gitkeep'), '');
      const created = await ensureLearningsDir(tmpDir);
      expect(created).toBe(false);
    });
  });

  describe('buildMemoryGuidanceSidecar', () => {
    it('returns a non-empty string with memory-architecture keywords', () => {
      const content = buildMemoryGuidanceSidecar();
      expect(content.length).toBeGreaterThan(0);
      expect(hasClaudeMdMemoryGuidance(content)).toBe(true);
    });
  });

  describe('writeMemoryGuidanceSidecar', () => {
    it('writes sidecar under .claude/workflow-ref/CLAUDE.md', async () => {
      const dest = await writeMemoryGuidanceSidecar(tmpDir);
      expect(dest).toBe(path.join(tmpDir, '.claude', 'workflow-ref', 'CLAUDE.md'));
      const content = await fs.readFile(dest, 'utf8');
      expect(hasClaudeMdMemoryGuidance(content)).toBe(true);
    });

    it('overwrites existing sidecar idempotently', async () => {
      const dest = path.join(tmpDir, '.claude', 'workflow-ref', 'CLAUDE.md');
      await fs.ensureDir(path.dirname(dest));
      await fs.writeFile(dest, 'stale');
      await writeMemoryGuidanceSidecar(tmpDir);
      const content = await fs.readFile(dest, 'utf8');
      expect(content).not.toBe('stale');
      expect(hasClaudeMdMemoryGuidance(content)).toBe(true);
    });
  });
});
