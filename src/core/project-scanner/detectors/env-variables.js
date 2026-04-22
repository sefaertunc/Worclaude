import path from 'node:path';
import { fileExists, readFile } from '../../../utils/file.js';
import { getAllDeps, depMatches } from '../manifests.js';

const ENV_FILES = ['.env.example', '.env.template', '.env.sample'];

const SDK_SERVICES = [
  { sdkPrefix: '@stripe/', service: 'Stripe', envPrefix: 'STRIPE_' },
  { sdkPrefix: 'stripe', service: 'Stripe', envPrefix: 'STRIPE_' },
  { sdkPrefix: '@aws-sdk/', service: 'AWS', envPrefix: 'AWS_' },
  { sdkPrefix: '@sendgrid/', service: 'SendGrid', envPrefix: 'SENDGRID_' },
  { sdkPrefix: 'twilio', service: 'Twilio', envPrefix: 'TWILIO_' },
  { sdkPrefix: 'openai', service: 'OpenAI', envPrefix: 'OPENAI_' },
  { sdkPrefix: '@anthropic-ai/', service: 'Anthropic', envPrefix: 'ANTHROPIC_' },
  { sdkPrefix: '@google-cloud/', service: 'Google Cloud', envPrefix: 'GOOGLE_' },
  { sdkPrefix: '@slack/', service: 'Slack', envPrefix: 'SLACK_' },
  { sdkPrefix: 'postmark', service: 'Postmark', envPrefix: 'POSTMARK_' },
  { sdkPrefix: 'resend', service: 'Resend', envPrefix: 'RESEND_' },
  { sdkPrefix: '@sentry/', service: 'Sentry', envPrefix: 'SENTRY_' },
];

function parseEnvNames(content) {
  const names = [];
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === '' || line.startsWith('#')) continue;
    const match = line.match(/^(?:export\s+)?([A-Z_][A-Z0-9_]*)\s*=/);
    if (match) names.push(match[1]);
  }
  return names;
}

export default async function detectEnvVariables(projectRoot) {
  let sourceFile = null;
  let content = null;
  for (const f of ENV_FILES) {
    const p = path.join(projectRoot, f);
    if (await fileExists(p)) {
      sourceFile = f;
      content = await readFile(p);
      break;
    }
  }
  if (!sourceFile) return [];

  const names = parseEnvNames(content);
  if (names.length === 0) {
    return [
      {
        field: 'envVariables',
        value: { names: [], inferredServices: [] },
        confidence: 'high',
        source: sourceFile,
        candidates: null,
      },
    ];
  }

  const { js, py } = await getAllDeps(projectRoot);
  const allDeps = { ...js, ...py };
  const inferredServices = new Set();
  for (const { sdkPrefix, service, envPrefix } of SDK_SERVICES) {
    const pattern = sdkPrefix.endsWith('/') ? `${sdkPrefix}*` : sdkPrefix;
    if (depMatches(allDeps, pattern) && names.some((n) => n.startsWith(envPrefix))) {
      inferredServices.add(service);
    }
  }

  return [
    {
      field: 'envVariables',
      value: { names, inferredServices: Array.from(inferredServices) },
      confidence: 'high',
      source: sourceFile,
      candidates: null,
    },
  ];
}
