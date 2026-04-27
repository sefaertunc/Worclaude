import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import {
  parseAgentFrontmatter,
  validateRoutingFields,
  readAgentFile,
  loadAgentsFromDir,
  AgentFrontmatterError,
} from '../../src/utils/agent-frontmatter.js';

let tmpDir;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-fm-'));
});

afterEach(async () => {
  await fs.remove(tmpDir);
});

const validBody = (extra = '') => `---
name: example-agent
description: "Example agent"
model: sonnet
isolation: none
category: quality
triggerType: manual
whenToUse: When something specific happens.
whatItDoes: Does something useful.
expectBack: A useful report.
situationLabel: When something specific
${extra}---

Body of the agent.
`;

describe('parseAgentFrontmatter', () => {
  it('parses a well-formed frontmatter block into an object', () => {
    const result = parseAgentFrontmatter(validBody());
    expect(result.name).toBe('example-agent');
    expect(result.triggerType).toBe('manual');
  });

  it('throws when no frontmatter delimiters are present', () => {
    expect(() => parseAgentFrontmatter('# Just a body, no frontmatter\n')).toThrow(
      AgentFrontmatterError
    );
  });

  it('throws when frontmatter is not valid YAML', () => {
    // Unclosed flow-mapping brace is unambiguously invalid.
    const bad = '---\n{ name: example\n---\n';
    expect(() => parseAgentFrontmatter(bad)).toThrow(AgentFrontmatterError);
  });

  it('throws when frontmatter parses to a non-mapping value', () => {
    const listFm = '---\n- one\n- two\n---\n';
    expect(() => parseAgentFrontmatter(listFm)).toThrow(AgentFrontmatterError);
  });
});

describe('validateRoutingFields', () => {
  it('passes for a complete routing block', () => {
    const fm = parseAgentFrontmatter(validBody());
    expect(() => validateRoutingFields(fm)).not.toThrow();
  });

  it('reports every missing required field', () => {
    const fm = { name: 'broken', model: 'sonnet' };
    try {
      validateRoutingFields(fm);
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(AgentFrontmatterError);
      expect(err.message).toContain('category');
      expect(err.message).toContain('triggerType');
      expect(err.message).toContain('whenToUse');
      expect(err.message).toContain('whatItDoes');
      expect(err.message).toContain('expectBack');
    }
  });

  it('rejects a triggerType outside the allowed set', () => {
    const fm = parseAgentFrontmatter(validBody());
    fm.triggerType = 'whenever';
    expect(() => validateRoutingFields(fm)).toThrow(/triggerType must be/);
  });
});

describe('readAgentFile / loadAgentsFromDir', () => {
  it('reads an agent file and returns its frontmatter', async () => {
    const fp = path.join(tmpDir, 'a.md');
    await fs.writeFile(fp, validBody());
    const fm = await readAgentFile(fp);
    expect(fm.name).toBe('example-agent');
  });

  it('walks subdirectories recursively and returns sorted-by-name agents', async () => {
    await fs.outputFile(path.join(tmpDir, 'top-agent.md'), validBody());
    await fs.outputFile(
      path.join(tmpDir, 'nested', 'beta-agent.md'),
      validBody().replace('example-agent', 'beta-agent')
    );
    await fs.outputFile(
      path.join(tmpDir, 'nested', 'alpha-agent.md'),
      validBody().replace('example-agent', 'alpha-agent')
    );
    const agents = await loadAgentsFromDir(tmpDir);
    expect(agents.map((a) => a.name)).toEqual(['alpha-agent', 'beta-agent', 'example-agent']);
  });

  it('returns empty array when the directory does not exist', async () => {
    const out = await loadAgentsFromDir(path.join(tmpDir, 'nope'));
    expect(out).toEqual([]);
  });

  it('skips non-markdown files in the directory', async () => {
    await fs.writeFile(path.join(tmpDir, 'README.txt'), 'not a skill');
    await fs.writeFile(path.join(tmpDir, 'a.md'), validBody());
    const agents = await loadAgentsFromDir(tmpDir);
    expect(agents).toHaveLength(1);
    expect(agents[0].name).toBe('example-agent');
  });

  it('throws AgentFrontmatterError when a file has no name field', async () => {
    const fp = path.join(tmpDir, 'no-name.md');
    await fs.writeFile(fp, '---\ndescription: "missing name"\nmodel: sonnet\n---\n\nBody.\n');
    await expect(loadAgentsFromDir(tmpDir)).rejects.toBeInstanceOf(AgentFrontmatterError);
  });
});
