import path from 'node:path';
import { fileExists, dirExists, readFile, listFiles, listSkillDirs } from '../utils/file.js';
import { workflowMetaExists } from './config.js';

export async function detectScenario(projectRoot) {
  if (await workflowMetaExists(projectRoot)) {
    return 'upgrade';
  }

  const hasClaudeDir = await dirExists(path.join(projectRoot, '.claude'));
  const hasClaudeMd = await fileExists(path.join(projectRoot, 'CLAUDE.md'));
  const hasMcpJson = await fileExists(path.join(projectRoot, '.mcp.json'));

  if (hasClaudeDir || hasClaudeMd || hasMcpJson) {
    return 'existing';
  }

  return 'fresh';
}

export async function scanExistingSetup(projectRoot) {
  const hasClaudeDir = await dirExists(path.join(projectRoot, '.claude'));
  const hasClaudeMd = await fileExists(path.join(projectRoot, 'CLAUDE.md'));

  let claudeMdLineCount = 0;
  if (hasClaudeMd) {
    const content = await readFile(path.join(projectRoot, 'CLAUDE.md'));
    claudeMdLineCount = content.split(/\r?\n/).length;
  }

  return {
    hasClaudeDir,
    hasClaudeMd,
    claudeMdLineCount,
    hasSettingsJson: await fileExists(path.join(projectRoot, '.claude', 'settings.json')),
    hasMcpJson: await fileExists(path.join(projectRoot, '.mcp.json')),
    existingSkills: await listFiles(path.join(projectRoot, '.claude', 'skills')),
    existingSkillDirs: await listSkillDirs(path.join(projectRoot, '.claude', 'skills')),
    existingAgents: await listFiles(path.join(projectRoot, '.claude', 'agents')),
    existingCommands: await listFiles(path.join(projectRoot, '.claude', 'commands')),
    hasProgressMd: await fileExists(path.join(projectRoot, 'docs', 'spec', 'PROGRESS.md')),
    hasSpecMd: await fileExists(path.join(projectRoot, 'docs', 'spec', 'SPEC.md')),
  };
}
