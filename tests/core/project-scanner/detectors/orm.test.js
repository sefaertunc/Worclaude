import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import detect from '../../../../src/core/project-scanner/detectors/orm.js';

describe('orm detector', () => {
  let dir;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'orm-detector-'));
  });

  afterEach(async () => {
    await fs.remove(dir);
  });

  it('detects Prisma with schema file', async () => {
    await fs.writeJson(path.join(dir, 'package.json'), {
      dependencies: { prisma: '5.0.0' },
    });
    await fs.ensureDir(path.join(dir, 'prisma'));
    await fs.writeFile(path.join(dir, 'prisma', 'schema.prisma'), 'model User {}\n');
    const results = await detect(dir);
    const prisma = results.find((r) => r.value.name === 'Prisma');
    expect(prisma).toBeDefined();
    expect(prisma.value.schemaFile).toBe('prisma/schema.prisma');
  });

  it('detects Drizzle with config file', async () => {
    await fs.writeJson(path.join(dir, 'package.json'), {
      dependencies: { 'drizzle-orm': '0.30.0' },
    });
    await fs.writeFile(path.join(dir, 'drizzle.config.ts'), 'export default {}\n');
    const results = await detect(dir);
    const drizzle = results.find((r) => r.value.name === 'Drizzle');
    expect(drizzle.value.schemaFile).toBe('drizzle.config.ts');
  });

  it('detects SQLAlchemy from pyproject.toml', async () => {
    await fs.writeFile(
      path.join(dir, 'pyproject.toml'),
      `[project]\nname="x"\ndependencies=["sqlalchemy>=2.0"]\n`
    );
    const results = await detect(dir);
    expect(results.find((r) => r.value.name === 'SQLAlchemy')).toBeDefined();
  });

  it('detects Alembic from alembic.ini even without dependency', async () => {
    await fs.writeFile(path.join(dir, 'alembic.ini'), '[alembic]\n');
    const results = await detect(dir);
    const alembic = results.find((r) => r.value.name === 'Alembic');
    expect(alembic).toBeDefined();
    expect(alembic.value.schemaFile).toBe('alembic.ini');
  });

  it('detects Mongoose from package.json', async () => {
    await fs.writeJson(path.join(dir, 'package.json'), {
      dependencies: { mongoose: '8.0.0' },
    });
    const results = await detect(dir);
    expect(results.find((r) => r.value.name === 'Mongoose')).toBeDefined();
  });

  it('returns empty array when no ORM is present', async () => {
    await fs.writeJson(path.join(dir, 'package.json'), { dependencies: {} });
    const results = await detect(dir);
    expect(results).toEqual([]);
  });
});
