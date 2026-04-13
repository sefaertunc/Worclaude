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
  const [
    hasClaudeDir,
    hasClaudeMd,
    hasSettingsJson,
    hasMcpJson,
    existingSkills,
    existingSkillDirs,
    existingAgents,
    existingCommands,
    hasAgentsMd,
    hasProgressMd,
    hasSpecMd,
  ] = await Promise.all([
    dirExists(path.join(projectRoot, '.claude')),
    fileExists(path.join(projectRoot, 'CLAUDE.md')),
    fileExists(path.join(projectRoot, '.claude', 'settings.json')),
    fileExists(path.join(projectRoot, '.mcp.json')),
    listFiles(path.join(projectRoot, '.claude', 'skills')),
    listSkillDirs(path.join(projectRoot, '.claude', 'skills')),
    listFiles(path.join(projectRoot, '.claude', 'agents')),
    listFiles(path.join(projectRoot, '.claude', 'commands')),
    fileExists(path.join(projectRoot, 'AGENTS.md')),
    fileExists(path.join(projectRoot, 'docs', 'spec', 'PROGRESS.md')),
    fileExists(path.join(projectRoot, 'docs', 'spec', 'SPEC.md')),
  ]);

  let claudeMdLineCount = 0;
  if (hasClaudeMd) {
    const content = await readFile(path.join(projectRoot, 'CLAUDE.md'));
    claudeMdLineCount = content.split(/\r?\n/).length;
  }

  return {
    hasClaudeDir,
    hasClaudeMd,
    claudeMdLineCount,
    hasSettingsJson,
    hasMcpJson,
    existingSkills,
    existingSkillDirs,
    existingAgents,
    existingCommands,
    hasAgentsMd,
    hasProgressMd,
    hasSpecMd,
  };
}
