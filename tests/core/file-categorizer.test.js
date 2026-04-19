import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import {
  categorizeFiles,
  buildTemplateHashMap,
  isAlwaysScaffolded,
} from '../../src/core/file-categorizer.js';
import { hashContent } from '../../src/utils/hash.js';
import { readTemplate } from '../../src/core/scaffolder.js';

describe('file-categorizer', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cw-categorizer-'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  describe('buildTemplateHashMap', () => {
    it('returns a map with entries for all template files', async () => {
      const map = await buildTemplateHashMap();
      // Should have universal agents
      expect(map['agents/plan-reviewer.md']).toBeDefined();
      expect(map['agents/plan-reviewer.md'].type).toBe('universal-agent');
      // Should have optional agents
      expect(map['agents/api-designer.md']).toBeDefined();
      expect(map['agents/api-designer.md'].type).toBe('optional-agent');
      // Should have commands
      expect(map['commands/start.md']).toBeDefined();
      expect(map['commands/start.md'].type).toBe('command');
      // Should have universal skills
      expect(map['skills/testing/SKILL.md']).toBeDefined();
      expect(map['skills/testing/SKILL.md'].type).toBe('universal-skill');
      // Should have template skills
      expect(map['skills/backend-conventions/SKILL.md']).toBeDefined();
      expect(map['skills/backend-conventions/SKILL.md'].type).toBe('template-skill');
    });

    it('computes correct hashes from template content', async () => {
      const map = await buildTemplateHashMap();
      const templateContent = await readTemplate('agents/universal/plan-reviewer.md');
      const expectedHash = hashContent(templateContent);
      expect(map['agents/plan-reviewer.md'].hash).toBe(expectedHash);
    });

    it('includes hook scripts as hooks/<name> with type hook', async () => {
      const map = await buildTemplateHashMap();
      expect(map['hooks/learn-capture.cjs']).toBeDefined();
      expect(map['hooks/learn-capture.cjs'].type).toBe('hook');
      expect(map['hooks/learn-capture.cjs'].templatePath).toBe('hooks/learn-capture.cjs');
      expect(map['hooks/pre-compact-save.cjs'].type).toBe('hook');
      expect(map['hooks/correction-detect.cjs'].type).toBe('hook');
      expect(map['hooks/skill-hint.cjs'].type).toBe('hook');
    });

    it('includes root/AGENTS.md with type root-file pointing at core/agents-md.md', async () => {
      const map = await buildTemplateHashMap();
      expect(map['root/AGENTS.md']).toBeDefined();
      expect(map['root/AGENTS.md'].type).toBe('root-file');
      expect(map['root/AGENTS.md'].templatePath).toBe('core/agents-md.md');
    });

    it('annotates optional-agent entries with agentName', async () => {
      const map = await buildTemplateHashMap();
      expect(map['agents/api-designer.md'].agentName).toBe('api-designer');
    });
  });

  describe('isAlwaysScaffolded', () => {
    it('returns true for universal-agent, command, universal-skill, hook, root-file', () => {
      const meta = { optionalAgents: [] };
      expect(isAlwaysScaffolded({ type: 'universal-agent' }, meta)).toBe(true);
      expect(isAlwaysScaffolded({ type: 'command' }, meta)).toBe(true);
      expect(isAlwaysScaffolded({ type: 'universal-skill' }, meta)).toBe(true);
      expect(isAlwaysScaffolded({ type: 'hook' }, meta)).toBe(true);
      expect(isAlwaysScaffolded({ type: 'root-file' }, meta)).toBe(true);
    });

    it('returns true for optional-agent when name is in meta.optionalAgents', () => {
      const meta = { optionalAgents: ['api-designer'] };
      expect(isAlwaysScaffolded({ type: 'optional-agent', agentName: 'api-designer' }, meta)).toBe(
        true
      );
    });

    it('returns false for optional-agent when name is not in meta.optionalAgents', () => {
      const meta = { optionalAgents: [] };
      expect(isAlwaysScaffolded({ type: 'optional-agent', agentName: 'api-designer' }, meta)).toBe(
        false
      );
    });

    it('returns false for template-skill and undefined entries', () => {
      const meta = { optionalAgents: [] };
      expect(isAlwaysScaffolded({ type: 'template-skill' }, meta)).toBe(false);
      expect(isAlwaysScaffolded(undefined, meta)).toBe(false);
      expect(isAlwaysScaffolded(null, meta)).toBe(false);
    });
  });

  describe('categorizeFiles', () => {
    it('detects unchanged files', async () => {
      const content = 'unchanged content';
      const hash = hashContent(content);
      await fs.ensureDir(path.join(tmpDir, '.claude', 'skills'));
      await fs.writeFile(path.join(tmpDir, '.claude', 'skills', 'test-file.md'), content);

      const meta = {
        fileHashes: { 'skills/test-file.md': hash },
        optionalAgents: [],
      };
      const result = await categorizeFiles(tmpDir, meta);
      expect(result.unchanged).toContainEqual({ key: 'skills/test-file.md' });
    });

    it('detects modified files', async () => {
      const original = 'original content';
      const hash = hashContent(original);
      await fs.ensureDir(path.join(tmpDir, '.claude', 'skills'));
      await fs.writeFile(
        path.join(tmpDir, '.claude', 'skills', 'test-file.md'),
        'modified content'
      );

      const meta = {
        fileHashes: { 'skills/test-file.md': hash },
        optionalAgents: [],
      };
      const result = await categorizeFiles(tmpDir, meta);
      expect(result.modified).toContainEqual({ key: 'skills/test-file.md' });
    });

    it('classifies missing file absent from templateMap as missingUntracked', async () => {
      await fs.ensureDir(path.join(tmpDir, '.claude'));
      const meta = {
        fileHashes: { 'agents/deleted-agent.md': 'somehash' },
        optionalAgents: [],
      };
      const result = await categorizeFiles(tmpDir, meta);
      expect(result.missingUntracked).toContainEqual({ key: 'agents/deleted-agent.md' });
      expect(result.missingExpected.some((f) => f.key === 'agents/deleted-agent.md')).toBe(false);
    });

    it('classifies missing tracked universal-agent as missingExpected with templatePath', async () => {
      await fs.ensureDir(path.join(tmpDir, '.claude'));
      const meta = {
        fileHashes: { 'agents/plan-reviewer.md': 'somehash' },
        optionalAgents: [],
      };
      const result = await categorizeFiles(tmpDir, meta);
      const entry = result.missingExpected.find((f) => f.key === 'agents/plan-reviewer.md');
      expect(entry).toBeDefined();
      expect(entry.templatePath).toBe('agents/universal/plan-reviewer.md');
      expect(entry.type).toBe('universal-agent');
    });

    it('classifies missing tracked hook as missingExpected', async () => {
      await fs.ensureDir(path.join(tmpDir, '.claude'));
      const meta = {
        fileHashes: { 'hooks/learn-capture.cjs': 'somehash' },
        optionalAgents: [],
      };
      const result = await categorizeFiles(tmpDir, meta);
      const entry = result.missingExpected.find((f) => f.key === 'hooks/learn-capture.cjs');
      expect(entry).toBeDefined();
      expect(entry.type).toBe('hook');
    });

    it('classifies missing tracked root/AGENTS.md as missingExpected', async () => {
      await fs.ensureDir(path.join(tmpDir, '.claude'));
      const meta = {
        fileHashes: { 'root/AGENTS.md': 'somehash' },
        optionalAgents: [],
      };
      const result = await categorizeFiles(tmpDir, meta);
      const entry = result.missingExpected.find((f) => f.key === 'root/AGENTS.md');
      expect(entry).toBeDefined();
      expect(entry.type).toBe('root-file');
    });

    it('classifies missing tracked optional-agent as missingExpected when selected', async () => {
      await fs.ensureDir(path.join(tmpDir, '.claude'));
      const meta = {
        fileHashes: { 'agents/api-designer.md': 'somehash' },
        optionalAgents: ['api-designer'],
      };
      const result = await categorizeFiles(tmpDir, meta);
      expect(result.missingExpected.some((f) => f.key === 'agents/api-designer.md')).toBe(true);
    });

    it('classifies missing tracked optional-agent as missingUntracked when not selected', async () => {
      await fs.ensureDir(path.join(tmpDir, '.claude'));
      const meta = {
        fileHashes: { 'agents/api-designer.md': 'somehash' },
        optionalAgents: [],
      };
      const result = await categorizeFiles(tmpDir, meta);
      expect(result.missingUntracked.some((f) => f.key === 'agents/api-designer.md')).toBe(true);
    });

    it('resolves root/ keys against projectRoot (not .claude/) for existence check', async () => {
      // AGENTS.md exists at projectRoot; its hash entry is stale (wrong), so the
      // existence check should find it and route to modified, NOT missingExpected.
      await fs.ensureDir(path.join(tmpDir, '.claude'));
      await fs.writeFile(path.join(tmpDir, 'AGENTS.md'), 'custom content');
      const meta = {
        fileHashes: { 'root/AGENTS.md': 'stale-hash-that-does-not-match' },
        optionalAgents: [],
      };
      const result = await categorizeFiles(tmpDir, meta);
      expect(result.missingExpected.some((f) => f.key === 'root/AGENTS.md')).toBe(false);
      expect(result.missingUntracked.some((f) => f.key === 'root/AGENTS.md')).toBe(false);
    });

    it('places hook not in fileHashes into newFiles (pre-v2.4.6 migration path)', async () => {
      await fs.ensureDir(path.join(tmpDir, '.claude'));
      const meta = { fileHashes: {}, optionalAgents: [] };
      const result = await categorizeFiles(tmpDir, meta);
      expect(result.newFiles.some((f) => f.key === 'hooks/learn-capture.cjs')).toBe(true);
    });

    it('places root/AGENTS.md not in fileHashes into newFiles', async () => {
      await fs.ensureDir(path.join(tmpDir, '.claude'));
      const meta = { fileHashes: {}, optionalAgents: [] };
      const result = await categorizeFiles(tmpDir, meta);
      expect(result.newFiles.some((f) => f.key === 'root/AGENTS.md')).toBe(true);
    });

    it('detects user-added files', async () => {
      await fs.ensureDir(path.join(tmpDir, '.claude', 'skills'));
      await fs.writeFile(path.join(tmpDir, '.claude', 'skills', 'my-custom-skill.md'), '# Custom');

      const meta = { fileHashes: {}, optionalAgents: [] };
      const result = await categorizeFiles(tmpDir, meta);
      expect(result.userAdded.some((f) => f.key === 'skills/my-custom-skill.md')).toBe(true);
    });

    it('detects auto-update when template changed but user did not modify', async () => {
      // Install a file with a hash that differs from the current template
      const fakeOldContent = 'old template v0.9 content';
      const storedHash = hashContent(fakeOldContent);
      // Write the same old content on disk (user didn't modify)
      await fs.ensureDir(path.join(tmpDir, '.claude', 'agents'));
      await fs.writeFile(
        path.join(tmpDir, '.claude', 'agents', 'plan-reviewer.md'),
        fakeOldContent
      );

      const meta = {
        fileHashes: { 'agents/plan-reviewer.md': storedHash },
        optionalAgents: [],
      };
      const result = await categorizeFiles(tmpDir, meta);
      // Template hash differs from stored (old), user hasn't modified → autoUpdate
      expect(result.autoUpdate.some((f) => f.key === 'agents/plan-reviewer.md')).toBe(true);
    });

    it('detects conflict when template changed and user also modified', async () => {
      const fakeOldContent = 'old template v0.9 content';
      const storedHash = hashContent(fakeOldContent);
      // User modified the file (different from stored hash)
      await fs.ensureDir(path.join(tmpDir, '.claude', 'agents'));
      await fs.writeFile(
        path.join(tmpDir, '.claude', 'agents', 'plan-reviewer.md'),
        'user customized content'
      );

      const meta = {
        fileHashes: { 'agents/plan-reviewer.md': storedHash },
        optionalAgents: [],
      };
      const result = await categorizeFiles(tmpDir, meta);
      expect(result.conflict.some((f) => f.key === 'agents/plan-reviewer.md')).toBe(true);
    });

    it('skips unselected optional agents from newFiles', async () => {
      await fs.ensureDir(path.join(tmpDir, '.claude'));
      const meta = { fileHashes: {}, optionalAgents: [] };
      const result = await categorizeFiles(tmpDir, meta);
      // api-designer is an optional agent not in meta.optionalAgents
      expect(result.newFiles.some((f) => f.key === 'agents/api-designer.md')).toBe(false);
    });

    it('includes selected optional agents missing from stored hashes as newFiles', async () => {
      await fs.ensureDir(path.join(tmpDir, '.claude'));
      const meta = { fileHashes: {}, optionalAgents: ['api-designer'] };
      const result = await categorizeFiles(tmpDir, meta);
      expect(result.newFiles.some((f) => f.key === 'agents/api-designer.md')).toBe(true);
    });

    it('excludes workflow-meta.json and settings.json from user-added', async () => {
      await fs.ensureDir(path.join(tmpDir, '.claude'));
      await fs.writeFile(path.join(tmpDir, '.claude', 'workflow-meta.json'), '{}');
      await fs.writeFile(path.join(tmpDir, '.claude', 'settings.json'), '{}');

      const meta = { fileHashes: {}, optionalAgents: [] };
      const result = await categorizeFiles(tmpDir, meta);
      expect(result.userAdded.some((f) => f.key === 'workflow-meta.json')).toBe(false);
      expect(result.userAdded.some((f) => f.key === 'settings.json')).toBe(false);
    });
  });
});
