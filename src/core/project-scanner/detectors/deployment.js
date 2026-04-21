import path from 'node:path';
import { fileExists } from '../../../utils/file.js';

const DEPLOYMENTS = [
  { file: 'vercel.json', target: 'Vercel' },
  { file: 'netlify.toml', target: 'Netlify' },
  { file: 'Dockerfile', target: 'Docker' },
  { file: 'fly.toml', target: 'Fly.io' },
  { file: 'railway.toml', target: 'Railway' },
  { file: 'app.yaml', target: 'Google App Engine' },
  { file: 'serverless.yml', target: 'Serverless Framework' },
  { file: 'render.yaml', target: 'Render' },
  { file: '.platform.app.yaml', target: 'Platform.sh' },
  { file: 'wrangler.toml', target: 'Cloudflare Workers' },
  { file: 'amplify.yml', target: 'AWS Amplify' },
];

export default async function detectDeployment(projectRoot) {
  const results = [];
  for (const { file, target } of DEPLOYMENTS) {
    if (await fileExists(path.join(projectRoot, file))) {
      results.push({
        field: 'deployment',
        value: target,
        confidence: 'high',
        source: file,
        candidates: null,
      });
    }
  }
  return results;
}
