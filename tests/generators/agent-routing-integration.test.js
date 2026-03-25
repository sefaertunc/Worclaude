import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { buildAgentRoutingSkill } from '../../src/generators/agent-routing.js';

describe('agent-routing integration', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-routing-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should write valid agent-routing.md to disk', async () => {
    const content = buildAgentRoutingSkill([], []);
    const filePath = path.join(tmpDir, '.claude', 'skills', 'agent-routing.md');

    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, content);

    const readBack = await fs.readFile(filePath, 'utf-8');
    expect(readBack).toBe(content);
    expect(readBack).toContain('# Agent Routing Guide');
  });

  it('should contain selected agents in the generated file', async () => {
    const content = buildAgentRoutingSkill(['api-designer', 'bug-fixer'], ['backend']);
    const filePath = path.join(tmpDir, 'agent-routing.md');

    await fs.writeFile(filePath, content);
    const readBack = await fs.readFile(filePath, 'utf-8');

    expect(readBack).toContain('### api-designer');
    expect(readBack).toContain('### bug-fixer');
    expect(readBack).not.toContain('### docker-helper');
  });

  it('should produce readable markdown file', async () => {
    const content = buildAgentRoutingSkill(['security-reviewer'], ['backend']);
    const filePath = path.join(tmpDir, 'agent-routing.md');

    await fs.writeFile(filePath, content);
    const readBack = await fs.readFile(filePath, 'utf-8');

    expect(readBack.trimStart()).toMatch(/^# /);
    expect(readBack).toContain('## How Agents Work');
    expect(readBack).toContain('## Decision Matrix');
    expect(readBack).toContain('## Rules');
  });
});
