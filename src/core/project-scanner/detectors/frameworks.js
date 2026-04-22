import { getAllDeps } from '../manifests.js';

const FRAMEWORKS = [
  { dep: 'next', name: 'Next.js' },
  { dep: 'nuxt', name: 'Nuxt' },
  { dep: 'astro', name: 'Astro' },
  { dep: 'remix', name: 'Remix' },
  { dep: 'sveltekit', name: 'SvelteKit' },
  { dep: '@sveltejs/kit', name: 'SvelteKit' },
  { dep: 'react', name: 'React' },
  { dep: 'vue', name: 'Vue' },
  { dep: 'svelte', name: 'Svelte' },
  { dep: 'solid-js', name: 'SolidJS' },
  { dep: 'express', name: 'Express' },
  { dep: 'fastify', name: 'Fastify' },
  { dep: 'hono', name: 'Hono' },
  { dep: 'koa', name: 'Koa' },
  { dep: '@nestjs/core', name: 'NestJS' },
  { dep: 'fastapi', name: 'FastAPI' },
  { dep: 'starlette', name: 'Starlette' },
  { dep: 'django', name: 'Django' },
  { dep: 'flask', name: 'Flask' },
];

export default async function detectFrameworks(projectRoot) {
  const { js, py, hasPackageJson, hasPyproject } = await getAllDeps(projectRoot);
  if (!hasPackageJson && !hasPyproject) return [];

  const detected = [];
  const sources = new Set();
  const seen = new Set();
  for (const { dep, name } of FRAMEWORKS) {
    if (seen.has(name)) continue;
    if (js[dep] !== undefined) {
      detected.push({ name, version: typeof js[dep] === 'string' ? js[dep] : '' });
      sources.add('package.json');
      seen.add(name);
    } else if (py[dep] !== undefined) {
      detected.push({ name, version: typeof py[dep] === 'string' ? py[dep] : '' });
      sources.add('pyproject.toml');
      seen.add(name);
    }
  }

  if (detected.length === 0) return [];

  return [
    {
      field: 'frameworks',
      value: detected,
      confidence: 'high',
      source: Array.from(sources).join(', '),
      candidates: null,
    },
  ];
}
