import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import { hashContent } from '../../src/utils/hash.js';
import {
  semverLessThan,
  migrateSkillFormat,
  patchAgentDescriptions,
} from '../../src/core/migration.js';

describe('semverLessThan', () => {
  it('returns true when major is less', () => {
    expect(semverLessThan('1.0.0', '2.0.0')).toBe(true);
  });

  it('returns true when minor is less', () => {
    expect(semverLessThan('1.0.0', '1.1.0')).toBe(true);
  });

  it('returns true when patch is less', () => {
    expect(semverLessThan('1.0.0', '1.0.1')).toBe(true);
  });

  it('returns false when equal', () => {
    expect(semverLessThan('2.0.0', '2.0.0')).toBe(false);
  });

  it('returns false when greater', () => {
    expect(semverLessThan('2.0.1', '2.0.0')).toBe(false);
  });

  it('returns true for 1.9.0 < 2.0.0', () => {
    expect(semverLessThan('1.9.0', '2.0.0')).toBe(true);
  });

  it('returns false for 3.0.0 < 2.0.0', () => {
    expect(semverLessThan('3.0.0', '2.0.0')).toBe(false);
  });
});

describe('migrateSkillFormat', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cw-migration-skill-'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it('migrates flat .md files to directory format', async () => {
    const skillsDir = path.join(tmpDir, '.claude', 'skills');
    await fs.ensureDir(skillsDir);
    await fs.writeFile(path.join(skillsDir, 'testing.md'), '# Testing skill');
    await fs.writeFile(path.join(skillsDir, 'git-conventions.md'), '# Git conventions');

    const meta = {
      fileHashes: {
        'skills/testing.md': hashContent('# Testing skill'),
        'skills/git-conventions.md': hashContent('# Git conventions'),
      },
    };

    const report = await migrateSkillFormat(tmpDir, meta);

    expect(report.migrated).toBe(2);
    expect(report.names).toContain('testing');
    expect(report.names).toContain('git-conventions');

    // Flat files should be gone
    expect(await fs.pathExists(path.join(skillsDir, 'testing.md'))).toBe(false);
    expect(await fs.pathExists(path.join(skillsDir, 'git-conventions.md'))).toBe(false);

    // Directory format should exist
    expect(await fs.pathExists(path.join(skillsDir, 'testing', 'SKILL.md'))).toBe(true);
    expect(await fs.pathExists(path.join(skillsDir, 'git-conventions', 'SKILL.md'))).toBe(true);

    // Content preserved
    const content = await fs.readFile(path.join(skillsDir, 'testing', 'SKILL.md'), 'utf-8');
    expect(content).toBe('# Testing skill');
  });

  it('moves .workflow-ref.md files alongside SKILL.md', async () => {
    const skillsDir = path.join(tmpDir, '.claude', 'skills');
    await fs.ensureDir(skillsDir);
    await fs.writeFile(path.join(skillsDir, 'testing.md'), '# Testing');
    await fs.writeFile(path.join(skillsDir, 'testing.workflow-ref.md'), '# Ref content');

    const meta = { fileHashes: {} };
    const report = await migrateSkillFormat(tmpDir, meta);

    expect(report.migrated).toBe(1);
    expect(await fs.pathExists(path.join(skillsDir, 'testing', 'SKILL.md'))).toBe(true);
    expect(await fs.pathExists(path.join(skillsDir, 'testing', 'SKILL.workflow-ref.md'))).toBe(
      true
    );
    expect(await fs.pathExists(path.join(skillsDir, 'testing.workflow-ref.md'))).toBe(false);
  });

  it('updates meta.fileHashes keys', async () => {
    const skillsDir = path.join(tmpDir, '.claude', 'skills');
    await fs.ensureDir(skillsDir);
    await fs.writeFile(path.join(skillsDir, 'testing.md'), '# Testing');

    const meta = {
      fileHashes: {
        'skills/testing.md': 'abc123',
        'agents/plan-reviewer.md': 'unchanged',
      },
    };

    await migrateSkillFormat(tmpDir, meta);

    expect(meta.fileHashes['skills/testing.md']).toBeUndefined();
    expect(meta.fileHashes['skills/testing/SKILL.md']).toBe('abc123');
    expect(meta.fileHashes['agents/plan-reviewer.md']).toBe('unchanged');
  });

  it('skips when directory already exists', async () => {
    const skillsDir = path.join(tmpDir, '.claude', 'skills');
    await fs.ensureDir(path.join(skillsDir, 'testing'));
    await fs.writeFile(path.join(skillsDir, 'testing', 'SKILL.md'), '# Already migrated');
    await fs.writeFile(path.join(skillsDir, 'testing.md'), '# Old flat file');

    const meta = { fileHashes: {} };
    const report = await migrateSkillFormat(tmpDir, meta);

    expect(report.migrated).toBe(0);
    expect(report.skipped).toBe(1);

    // Flat file should still be there (not moved)
    expect(await fs.pathExists(path.join(skillsDir, 'testing.md'))).toBe(true);
    // Directory content unchanged
    const content = await fs.readFile(path.join(skillsDir, 'testing', 'SKILL.md'), 'utf-8');
    expect(content).toBe('# Already migrated');
  });

  it('handles mixed state (some flat, some directory)', async () => {
    const skillsDir = path.join(tmpDir, '.claude', 'skills');
    await fs.ensureDir(path.join(skillsDir, 'testing'));
    await fs.writeFile(path.join(skillsDir, 'testing', 'SKILL.md'), '# Already done');
    await fs.writeFile(path.join(skillsDir, 'testing.md'), '# Old flat');
    await fs.writeFile(path.join(skillsDir, 'verification.md'), '# Needs migration');

    const meta = { fileHashes: {} };
    const report = await migrateSkillFormat(tmpDir, meta);

    expect(report.migrated).toBe(1);
    expect(report.skipped).toBe(1);
    expect(report.names).toEqual(['verification']);
    expect(await fs.pathExists(path.join(skillsDir, 'verification', 'SKILL.md'))).toBe(true);
  });

  it('handles empty skills directory', async () => {
    const skillsDir = path.join(tmpDir, '.claude', 'skills');
    await fs.ensureDir(skillsDir);

    const meta = { fileHashes: {} };
    const report = await migrateSkillFormat(tmpDir, meta);

    expect(report.migrated).toBe(0);
    expect(report.skipped).toBe(0);
  });

  it('handles non-existent skills directory', async () => {
    const meta = { fileHashes: {} };
    const report = await migrateSkillFormat(tmpDir, meta);

    expect(report.migrated).toBe(0);
  });
});

describe('patchAgentDescriptions', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cw-migration-agent-'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it('auto-patches universal agents missing description', async () => {
    const agentsDir = path.join(tmpDir, '.claude', 'agents');
    await fs.ensureDir(agentsDir);

    const content = '---\nname: plan-reviewer\nmodel: opus\n---\n\n# Plan Reviewer';
    await fs.writeFile(path.join(agentsDir, 'plan-reviewer.md'), content);

    const meta = {
      fileHashes: {
        'agents/plan-reviewer.md': hashContent(content),
      },
    };

    const report = await patchAgentDescriptions(tmpDir, meta, null);

    expect(report.autoPatched).toBe(1);

    const updated = await fs.readFile(path.join(agentsDir, 'plan-reviewer.md'), 'utf-8');
    expect(updated).toContain(
      'description: "Reviews implementation plans for specificity, gaps, and executability"'
    );
    expect(updated).toContain('name: plan-reviewer');
    expect(updated).toContain('model: opus');
  });

  it('auto-patches catalog agents missing description', async () => {
    const agentsDir = path.join(tmpDir, '.claude', 'agents');
    await fs.ensureDir(agentsDir);

    const content = '---\nname: ui-reviewer\nmodel: sonnet\n---\n\n# UI Reviewer';
    await fs.writeFile(path.join(agentsDir, 'ui-reviewer.md'), content);

    const meta = {
      fileHashes: {
        'agents/ui-reviewer.md': hashContent(content),
      },
    };

    const report = await patchAgentDescriptions(tmpDir, meta, null);

    expect(report.autoPatched).toBe(1);

    const updated = await fs.readFile(path.join(agentsDir, 'ui-reviewer.md'), 'utf-8');
    expect(updated).toContain('description: "Reviews UI for consistency and accessibility"');
  });

  it('skips agents that already have description', async () => {
    const agentsDir = path.join(tmpDir, '.claude', 'agents');
    await fs.ensureDir(agentsDir);

    const content =
      '---\nname: plan-reviewer\ndescription: "My custom description"\nmodel: opus\n---\n\n# Plan';
    await fs.writeFile(path.join(agentsDir, 'plan-reviewer.md'), content);

    const meta = { fileHashes: {} };
    const report = await patchAgentDescriptions(tmpDir, meta, null);

    expect(report.autoPatched).toBe(0);
    expect(report.prompted).toBe(0);

    const updated = await fs.readFile(path.join(agentsDir, 'plan-reviewer.md'), 'utf-8');
    expect(updated).toContain('description: "My custom description"');
  });

  it('skips unknown/user-created agents', async () => {
    const agentsDir = path.join(tmpDir, '.claude', 'agents');
    await fs.ensureDir(agentsDir);

    const content = '---\nname: my-custom-agent\nmodel: opus\n---\n\n# Custom';
    await fs.writeFile(path.join(agentsDir, 'my-custom-agent.md'), content);

    const meta = { fileHashes: {} };
    const report = await patchAgentDescriptions(tmpDir, meta, null);

    expect(report.skipped).toEqual(['my-custom-agent']);
    expect(report.autoPatched).toBe(0);

    // File unchanged
    const updated = await fs.readFile(path.join(agentsDir, 'my-custom-agent.md'), 'utf-8');
    expect(updated).toBe(content);
  });

  it('prompts for modified agents and patches on confirmation', async () => {
    const agentsDir = path.join(tmpDir, '.claude', 'agents');
    await fs.ensureDir(agentsDir);

    const original = '---\nname: plan-reviewer\nmodel: opus\n---\n\n# Plan Reviewer';
    const modified = '---\nname: plan-reviewer\nmodel: opus\n---\n\n# Plan Reviewer\n\nCustomized!';
    await fs.writeFile(path.join(agentsDir, 'plan-reviewer.md'), modified);

    const meta = {
      fileHashes: {
        'agents/plan-reviewer.md': hashContent(original),
      },
    };

    const promptFn = vi.fn().mockResolvedValue(true);
    const report = await patchAgentDescriptions(tmpDir, meta, promptFn);

    expect(promptFn).toHaveBeenCalledWith('plan-reviewer');
    expect(report.prompted).toBe(1);
    expect(report.autoPatched).toBe(0);

    const updated = await fs.readFile(path.join(agentsDir, 'plan-reviewer.md'), 'utf-8');
    expect(updated).toContain('description:');
  });

  it('prompts for modified agents and skips on decline', async () => {
    const agentsDir = path.join(tmpDir, '.claude', 'agents');
    await fs.ensureDir(agentsDir);

    const original = '---\nname: plan-reviewer\nmodel: opus\n---\n\n# Original';
    const modified = '---\nname: plan-reviewer\nmodel: opus\n---\n\n# Modified';
    await fs.writeFile(path.join(agentsDir, 'plan-reviewer.md'), modified);

    const meta = {
      fileHashes: {
        'agents/plan-reviewer.md': hashContent(original),
      },
    };

    const promptFn = vi.fn().mockResolvedValue(false);
    const report = await patchAgentDescriptions(tmpDir, meta, promptFn);

    expect(report.declined).toBe(1);
    expect(report.prompted).toBe(0);

    const updated = await fs.readFile(path.join(agentsDir, 'plan-reviewer.md'), 'utf-8');
    expect(updated).not.toContain('description:');
  });

  it('preserves other frontmatter fields', async () => {
    const agentsDir = path.join(tmpDir, '.claude', 'agents');
    await fs.ensureDir(agentsDir);

    const content =
      '---\nname: build-validator\nmodel: sonnet\nisolation: worktree\nmaxTurns: 20\n---\n\n# Build';
    await fs.writeFile(path.join(agentsDir, 'build-validator.md'), content);

    const meta = {
      fileHashes: {
        'agents/build-validator.md': hashContent(content),
      },
    };

    await patchAgentDescriptions(tmpDir, meta, null);

    const updated = await fs.readFile(path.join(agentsDir, 'build-validator.md'), 'utf-8');
    expect(updated).toContain('name: build-validator');
    expect(updated).toContain(
      'description: "Validates that the project builds and all tests pass"'
    );
    expect(updated).toContain('model: sonnet');
    expect(updated).toContain('isolation: worktree');
    expect(updated).toContain('maxTurns: 20');
  });

  it('skips agents without frontmatter', async () => {
    const agentsDir = path.join(tmpDir, '.claude', 'agents');
    await fs.ensureDir(agentsDir);

    const content = '# No frontmatter agent\n\nJust content.';
    await fs.writeFile(path.join(agentsDir, 'plan-reviewer.md'), content);

    const meta = { fileHashes: {} };
    const report = await patchAgentDescriptions(tmpDir, meta, null);

    expect(report.autoPatched).toBe(0);
    expect(report.skipped).toEqual([]);
  });

  it('handles non-existent agents directory', async () => {
    const meta = { fileHashes: {} };
    const report = await patchAgentDescriptions(tmpDir, meta, null);

    expect(report.autoPatched).toBe(0);
    expect(report.skipped).toEqual([]);
  });
});
