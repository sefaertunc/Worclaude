import { expect } from 'vitest';

export const VALID_INQUIRER_TYPES = new Set([
  'input',
  'select',
  'number',
  'confirm',
  'rawlist',
  'expand',
  'checkbox',
  'password',
  'editor',
  'search',
]);

export function collectInquirerSpecs(inquirerMock) {
  return inquirerMock.prompt.mock.calls.flatMap((call) => {
    const arg = call[0];
    return Array.isArray(arg) ? arg : [arg];
  });
}

export function expectAllValidPromptTypes(inquirerMock, label) {
  const specs = collectInquirerSpecs(inquirerMock);
  expect(specs.length, `${label}: expected at least one captured prompt`).toBeGreaterThan(0);
  for (const spec of specs) {
    expect(
      VALID_INQUIRER_TYPES.has(spec.type),
      `${label}: prompt "${spec.name}" uses type "${spec.type}" which is not a v13 built-in`
    ).toBe(true);
  }
}
