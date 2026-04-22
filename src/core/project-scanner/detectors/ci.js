import path from 'node:path';
import fs from 'fs-extra';
import { fileExists, dirExists } from '../../../utils/file.js';

export default async function detectCi(projectRoot) {
  const results = [];

  const workflowsDir = path.join(projectRoot, '.github', 'workflows');
  if (await dirExists(workflowsDir)) {
    try {
      const entries = await fs.readdir(workflowsDir, { withFileTypes: true });
      const workflows = entries
        .filter((e) => e.isFile() && /\.ya?ml$/.test(e.name))
        .map((e) => e.name)
        .sort();
      if (workflows.length > 0) {
        results.push({
          field: 'ci',
          value: { provider: 'GitHub Actions', workflows },
          confidence: 'high',
          source: '.github/workflows/',
          candidates: null,
        });
      }
    } catch {
      /* missing or unreadable — non-fatal */
    }
  }

  const other = [
    { file: '.gitlab-ci.yml', provider: 'GitLab CI' },
    { file: '.circleci/config.yml', provider: 'CircleCI' },
    { file: 'azure-pipelines.yml', provider: 'Azure Pipelines' },
    { file: 'Jenkinsfile', provider: 'Jenkins' },
    { file: '.drone.yml', provider: 'Drone' },
    { file: 'bitbucket-pipelines.yml', provider: 'Bitbucket Pipelines' },
  ];
  for (const { file, provider } of other) {
    if (await fileExists(path.join(projectRoot, file))) {
      results.push({
        field: 'ci',
        value: { provider, workflows: [path.basename(file)] },
        confidence: 'high',
        source: file,
        candidates: null,
      });
    }
  }

  return results;
}
