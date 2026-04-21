import path from 'node:path';
import fs from 'fs-extra';
import { fileExists } from '../../../utils/file.js';
import { getAllDeps } from '../manifests.js';

async function findFile(projectRoot, patterns) {
  for (const p of patterns) {
    if (await fileExists(path.join(projectRoot, p))) return p;
  }
  return null;
}

async function findDrizzleConfig(projectRoot) {
  try {
    const entries = await fs.readdir(projectRoot, { withFileTypes: true });
    const match = entries.find(
      (e) => e.isFile() && /^drizzle\.config\.(js|ts|mjs|cjs)$/.test(e.name)
    );
    return match ? match.name : null;
  } catch {
    return null;
  }
}

const SIMPLE_ORMS = [
  { deps: ['sequelize', '@sequelize/core'], name: 'Sequelize', source: 'package.json', from: 'js' },
  { deps: ['typeorm'], name: 'TypeORM', source: 'package.json', from: 'js' },
  { deps: ['mongoose'], name: 'Mongoose', source: 'package.json', from: 'js' },
  { deps: ['sqlalchemy', 'SQLAlchemy'], name: 'SQLAlchemy', source: 'pyproject.toml', from: 'py' },
  { deps: ['tortoise-orm'], name: 'Tortoise ORM', source: 'pyproject.toml', from: 'py' },
];

function ormResult(name, schemaFile, source) {
  return {
    field: 'orm',
    value: { name, schemaFile: schemaFile ?? null },
    confidence: 'high',
    source,
    candidates: null,
  };
}

export default async function detectOrm(projectRoot) {
  const { js, py } = await getAllDeps(projectRoot);
  const results = [];

  if (js['prisma'] !== undefined || js['@prisma/client'] !== undefined) {
    const schemaFile = await findFile(projectRoot, ['prisma/schema.prisma']);
    results.push(ormResult('Prisma', schemaFile, schemaFile || 'package.json'));
  }

  if (js['drizzle-orm'] !== undefined) {
    const schemaFile = await findDrizzleConfig(projectRoot);
    results.push(ormResult('Drizzle', schemaFile, schemaFile || 'package.json'));
  }

  for (const { deps, name, source, from } of SIMPLE_ORMS) {
    const map = from === 'js' ? js : py;
    if (deps.some((d) => map[d] !== undefined)) {
      results.push(ormResult(name, null, source));
    }
  }

  const alembicIni = (await fileExists(path.join(projectRoot, 'alembic.ini')))
    ? 'alembic.ini'
    : null;
  if (py['alembic'] !== undefined || alembicIni) {
    results.push(ormResult('Alembic', alembicIni, alembicIni || 'pyproject.toml'));
  }

  return results;
}
