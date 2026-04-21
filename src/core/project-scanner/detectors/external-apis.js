import { getAllDeps, depMatches } from '../manifests.js';

const SDK_MAP = [
  { match: 'stripe', service: 'Stripe' },
  { match: '@sendgrid/', service: 'SendGrid' },
  { match: '@aws-sdk/', service: 'AWS' },
  { match: 'twilio', service: 'Twilio' },
  { match: 'openai', service: 'OpenAI' },
  { match: '@anthropic-ai/sdk', service: 'Anthropic' },
  { match: '@google-cloud/', service: 'Google Cloud' },
  { match: '@slack/', service: 'Slack' },
  { match: 'postmark', service: 'Postmark' },
  { match: 'resend', service: 'Resend' },
  { match: 'algoliasearch', service: 'Algolia' },
  { match: 'pusher', service: 'Pusher' },
  { match: 'posthog-js', service: 'PostHog' },
  { match: 'posthog-node', service: 'PostHog' },
  { match: '@sentry/', service: 'Sentry' },
  { match: 'mixpanel', service: 'Mixpanel' },
  { match: 'mixpanel-browser', service: 'Mixpanel' },
];

export default async function detectExternalApis(projectRoot) {
  const { js, py, hasPackageJson, hasPyproject } = await getAllDeps(projectRoot);
  if (!hasPackageJson && !hasPyproject) return [];

  const allDeps = { ...js, ...py };
  const services = new Set();
  for (const { match, service } of SDK_MAP) {
    const pattern = match.endsWith('/') ? `${match}*` : match;
    if (depMatches(allDeps, pattern)) services.add(service);
  }

  if (services.size === 0) return [];

  return [
    {
      field: 'externalApis',
      value: Array.from(services),
      confidence: 'high',
      source: hasPackageJson ? 'package.json' : 'pyproject.toml',
      candidates: null,
    },
  ];
}
